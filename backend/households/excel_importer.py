import csv
import io
import re
import xml.etree.ElementTree as ET
import zipfile
from decimal import Decimal, InvalidOperation
from typing import BinaryIO

from django.db import transaction
from django.utils import timezone

from .models import RegisteredHousehold

TURKISH_CHAR_MAP = str.maketrans({
    "İ": "I",
    "I": "I",
    "ı": "I",
    "i": "I",
    "Ş": "S",
    "ş": "S",
    "Ğ": "G",
    "ğ": "G",
    "Ü": "U",
    "ü": "U",
    "Ö": "O",
    "ö": "O",
    "Ç": "C",
    "ç": "C",
})

HEADER_ALIASES = {
    "tc_no": {
        "TCKN",
        "TC",
        "TC NO",
        "TC KIMLIK NO",
        "TC KIMLIK",
        "TCKIMLIKNO",
        "TC KIMLIK NUMARASI",
        "KIMLIK NO",
    },
    "dosya_no": {
        "DOSYA NO",
        "DOSYANO",
        "DOSYA NUMARASI",
        "DOSYA",
    },
    "referans_no": {
        "REFERANS NO",
        "REFERANSNO",
        "REFERANS NUMARASI",
        "REFERANS",
        "REF NO",
        "REFNO",
    },
    "ad": {
        "AD",
        "ADI",
        "ISIM",
    },
    "soyad": {
        "SOYAD",
        "SOYADI",
    },
    "ad_soyad": {
        "AD SOYAD",
        "ADSOYAD",
        "ADI SOYADI",
        "AD VE SOYAD",
    },
    "telefon": {
        "TELEFON",
        "TEL",
        "TELEFON NO",
        "TELEFON NUMARASI",
        "CEP TELEFONU",
        "GSM",
    },
    "adres": {
        "ADRES",
        "ACIK ADRES",
        "IKAMETGAH ADRESI",
        "EV ADRESI",
    },
}

CELL_REF_RE = re.compile(r"^([A-Za-z]+)")


def normalize_header(value: str) -> str:
    cleaned = str(value or "").translate(TURKISH_CHAR_MAP).upper()
    cleaned = re.sub(r"[^A-Z0-9]+", " ", cleaned)
    return " ".join(cleaned.split())


def col_letters_to_index(cell_ref: str) -> int | None:
    match = CELL_REF_RE.match(cell_ref or "")
    if not match:
        return None
    letters = match.group(1).upper()
    index = 0
    for char in letters:
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1


def clean_numeric_string(raw: str) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    if text.endswith(".0") and text[:-2].lstrip("-").isdigit():
        return text[:-2]
    if "E+" in text.upper() or "E-" in text.upper():
        try:
            dec = Decimal(text)
            if dec == dec.to_integral_value():
                return str(dec.to_integral_value())
        except InvalidOperation:
            pass
    return text


def clean_tc_no(raw: str) -> str:
    cleaned = clean_numeric_string(raw)
    digits = re.sub(r"\D", "", cleaned)
    return digits


def read_xlsx_rows(file_bytes: bytes) -> list[list[str]]:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        namelist = set(archive.namelist())
        shared_strings: list[str] = []

        if "xl/sharedStrings.xml" in namelist:
            with archive.open("xl/sharedStrings.xml") as ss_file:
                for event, elem in ET.iterparse(ss_file, events=("end",)):
                    if elem.tag.endswith("}si") or elem.tag == "si":
                        parts = [
                            node.text or ""
                            for node in elem.iter()
                            if node.tag.endswith("}t") or node.tag == "t"
                        ]
                        shared_strings.append("".join(parts))
                        elem.clear()

        sheet_path = "xl/worksheets/sheet1.xml"
        if sheet_path not in namelist:
            sheet_candidates = sorted(
                name
                for name in namelist
                if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
            )
            if not sheet_candidates:
                raise ValueError("Excel dosyasında çalışma sayfası (worksheet) bulunamadı.")
            sheet_path = sheet_candidates[0]

        rows: list[list[str]] = []
        with archive.open(sheet_path) as sheet_file:
            for event, elem in ET.iterparse(sheet_file, events=("end",)):
                if not (elem.tag.endswith("}row") or elem.tag == "row"):
                    continue

                row_cells: dict[int, str] = {}
                max_col = -1
                next_col = 0

                for cell in elem:
                    if not (cell.tag.endswith("}c") or cell.tag == "c"):
                        continue

                    cell_ref = cell.attrib.get("r", "")
                    col_idx = col_letters_to_index(cell_ref)
                    if col_idx is None:
                        col_idx = next_col
                    next_col = col_idx + 1
                    if col_idx > max_col:
                        max_col = col_idx

                    cell_type = cell.attrib.get("t", "")
                    cell_value = ""

                    if cell_type == "inlineStr":
                        parts = [
                            node.text or ""
                            for node in cell.iter()
                            if node.tag.endswith("}t") or node.tag == "t"
                        ]
                        cell_value = "".join(parts)
                    else:
                        v_elem = None
                        for child in cell:
                            if child.tag.endswith("}v") or child.tag == "v":
                                v_elem = child
                                break
                        raw_val = (v_elem.text or "") if v_elem is not None else ""
                        if cell_type == "s":
                            try:
                                ss_idx = int(raw_val)
                                cell_value = (
                                    shared_strings[ss_idx]
                                    if 0 <= ss_idx < len(shared_strings)
                                    else ""
                                )
                            except ValueError:
                                cell_value = raw_val
                        else:
                            cell_value = raw_val

                    row_cells[col_idx] = cell_value

                if max_col >= 0:
                    row_list = [row_cells.get(i, "") for i in range(max_col + 1)]
                    if any(val.strip() for val in row_list):
                        rows.append(row_list)

                elem.clear()

        return rows


def read_csv_rows(file_bytes: bytes) -> list[list[str]]:
    text = None
    for encoding in ("utf-8-sig", "utf-8", "cp1254", "iso-8859-9", "latin1"):
        try:
            text = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text is None:
        raise ValueError("Dosya karakter kodlaması okunamadı.")

    sample = text[:4096]
    delimiter = ";" if sample.count(";") >= sample.count(",") else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    return [row for row in reader if any(str(cell).strip() for cell in row)]


def detect_header_mapping(rows: list[list[str]]) -> tuple[int, dict[str, int]]:
    for row_index in range(min(15, len(rows))):
        row = rows[row_index]
        mapping: dict[str, int] = {}
        for col_index, raw_header in enumerate(row):
            norm = normalize_header(raw_header)
            if not norm:
                continue
            for field_name, aliases in HEADER_ALIASES.items():
                if norm in aliases and field_name not in mapping:
                    mapping[field_name] = col_index

        if "tc_no" in mapping and (
            "ad" in mapping or "ad_soyad" in mapping
        ):
            return row_index, mapping

    raise ValueError(
        "Excel başlık satırı bulunamadı. Lütfen dosyada 'TCKN' ve 'AD' / 'SOYAD' "
        "(veya 'AD SOYAD') sütun başlıklarının bulunduğundan emin olun."
    )


def import_registered_households_from_file(
    file_obj: BinaryIO | bytes,
    filename: str = "import.xlsx",
) -> dict:
    file_bytes = (
        file_obj if isinstance(file_obj, bytes) else file_obj.read()
    )
    if not file_bytes:
        raise ValueError("Yüklenen dosya boş.")

    lower_name = (filename or "").lower()
    if lower_name.endswith(".csv"):
        rows = read_csv_rows(file_bytes)
    else:
        try:
            rows = read_xlsx_rows(file_bytes)
        except zipfile.BadZipFile as exc:
            raise ValueError(
                "Geçerli bir .xlsx Excel dosyası okunamadı. Lütfen dosyanın .xlsx "
                "(veya .csv) formatında kaydedildiğinden emin olun."
            ) from exc

    if not rows:
        raise ValueError("Dosyada aktarılacak satır bulunamadı.")

    header_row_idx, col_map = detect_header_mapping(rows)
    data_rows = rows[header_row_idx + 1 :]

    def get_cell(row: list[str], field: str) -> str:
        idx = col_map.get(field)
        if idx is None or idx >= len(row):
            return ""
        return str(row[idx] or "").strip()

    parsed_by_tc: dict[str, RegisteredHousehold] = {}
    skipped_count = 0
    skipped_reasons: list[str] = []
    now = timezone.now()

    for offset, row in enumerate(data_rows, start=header_row_idx + 2):
        if not any(str(cell).strip() for cell in row):
            continue

        tc_no = clean_tc_no(get_cell(row, "tc_no"))
        if len(tc_no) != 11:
            skipped_count += 1
            if len(skipped_reasons) < 10:
                raw_tc = clean_numeric_string(get_cell(row, "tc_no"))
                skipped_reasons.append(
                    f"Satır {offset}: Geçersiz TCKN ('{raw_tc or 'boş'}')"
                )
            continue

        ad = get_cell(row, "ad")
        soyad = get_cell(row, "soyad")
        ad_soyad = get_cell(row, "ad_soyad")
        if not ad_soyad:
            ad_soyad = f"{ad} {soyad}".strip()

        if not ad_soyad:
            skipped_count += 1
            if len(skipped_reasons) < 10:
                skipped_reasons.append(
                    f"Satır {offset} (TCKN: {tc_no}): Ad / Soyad bilgisi boş"
                )
            continue

        dosya_no = clean_numeric_string(get_cell(row, "dosya_no"))[:100]
        referans_no = clean_numeric_string(get_cell(row, "referans_no"))[:100]
        telefon = clean_numeric_string(get_cell(row, "telefon"))[:30]
        adres = get_cell(row, "adres")

        parsed_by_tc[tc_no] = RegisteredHousehold(
            tc_no=tc_no,
            ad=ad[:100],
            soyad=soyad[:100],
            ad_soyad=ad_soyad[:200],
            dosya_no=dosya_no,
            referans_no=referans_no,
            telefon=telefon,
            adres=adres,
            updated_at=now,
        )

    records = list(parsed_by_tc.values())
    if not records:
        raise ValueError(
            "Dosyada geçerli 11 haneli TCKN ve Ad/Soyad içeren hiçbir kayıt bulunamadı."
        )

    tc_list = list(parsed_by_tc.keys())
    existing_tcs: set[str] = set()
    chunk_size = 900
    for i in range(0, len(tc_list), chunk_size):
        chunk = tc_list[i : i + chunk_size]
        existing_tcs.update(
            RegisteredHousehold.objects.filter(tc_no__in=chunk).values_list(
                "tc_no", flat=True
            )
        )

    updated_count = len(existing_tcs)
    created_count = len(records) - updated_count

    with transaction.atomic():
        RegisteredHousehold.objects.bulk_create(
            records,
            batch_size=1000,
            update_conflicts=True,
            unique_fields=["tc_no"],
            update_fields=[
                "ad",
                "soyad",
                "ad_soyad",
                "dosya_no",
                "referans_no",
                "telefon",
                "adres",
                "updated_at",
            ],
        )

    total_registered = RegisteredHousehold.objects.count()

    return {
        "imported_count": len(records),
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "skipped_reasons": skipped_reasons,
        "total_registered_households": total_registered,
        "detected_columns": list(col_map.keys()),
    }
