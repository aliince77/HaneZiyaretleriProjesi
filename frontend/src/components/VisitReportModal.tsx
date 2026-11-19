"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { Household } from "@/lib/api";

export type ReportFilterSummary = {
  title: string;
  dateInfo: string;
  personnelInfo?: string;
  addressInfo?: string;
  householdInfo?: string;
};

export function exportVisitsToCsv(
  visits: Household[],
  filenamePrefix = "sydv-ziyaret-raporu",
) {
  const headers = [
    "Sıra No",
    "Ziyaret Tarihi",
    "TC Kimlik No",
    "Ad Soyad",
    "Dosya No",
    "Referans No",
    "Telefon",
    "Adres",
    "Ziyaret Notları",
    "Ziyareti Yapan Personel",
    "Ziyarete Katılan Personel",
    "Fotoğraf Sayısı",
    "Konum",
  ];

  const rows: string[][] = [
    headers,
    ...visits.map((visit, index) => {
      const locationText =
        visit.latitude !== null && visit.longitude !== null
          ? `${visit.latitude}, ${visit.longitude}`
          : "";
      return [
        String(index + 1),
        formatReportDateTime(visit.created_at),
        visit.tc_no || "",
        visit.ad_soyad || "",
        visit.dosya_no || "",
        visit.referans_no || "",
        visit.telefon || "",
        visit.adres || "",
        visit.notlar || "",
        visit.ziyareti_yapan_personel_adi || "",
        visit.katilan_personel_adi || "",
        String(visit.photos.length),
        locationText,
      ];
    }),
  ];

  const xlsxBlob = buildXlsxBlob(rows);
  const url = URL.createObjectURL(xlsxBlob);
  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}-${today}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toColumnLetter(colIndex: number): string {
  let n = colIndex + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildXlsxBlob(rows: string[][]): Blob {
  const colWidths = [8, 18, 15, 24, 14, 15, 16, 36, 36, 22, 22, 14, 22];
  const colsXml = colWidths
    .map(
      (w, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`,
    )
    .join("");

  const sheetRowsXml = rows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const styleAttr = rIdx === 0 ? ' s="1"' : "";
      const cellsXml = row
        .map((cellValue, cIdx) => {
          const ref = `${toColumnLetter(cIdx)}${rowNum}`;
          return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(cellValue)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const files: { name: string; content: string }[] = [
    {
      name: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Hane Ziyaretleri" sheetId="1" r:id="rId1"/></sheets>' +
        "</workbook>",
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/styles.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2">' +
        '<font><sz val="10"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="10"/><name val="Calibri"/></font>' +
        "</fonts>" +
        '<fills count="3">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>' +
        "</fills>" +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
        "</cellXfs>" +
        "</styleSheet>",
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<cols>${colsXml}</cols>` +
        `<sheetData>${sheetRowsXml}</sheetData>` +
        "</worksheet>",
    },
  ];

  return createStoredZipBlob(
    files,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createStoredZipBlob(
  entries: { name: string; content: string }[],
  mimeType: string,
): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(new ArrayBuffer(30 + nameBytes.length));
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const dataCopy = new Uint8Array(new ArrayBuffer(dataBytes.length));
    dataCopy.set(dataBytes);

    localParts.push(localHeader, dataCopy);

    const centralHeader = new Uint8Array(
      new ArrayBuffer(46 + nameBytes.length),
    );
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);
  const endRecord = new Uint8Array(new ArrayBuffer(22));
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, endRecord], {
    type: mimeType,
  });
}

export default function VisitReportModal({
  visits,
  summary,
  onClose,
}: {
  visits: Household[];
  summary: ReportFilterSummary;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const uniqueHouseholdCount = new Set(visits.map((v) => v.tc_no)).size;
  const totalPhotoCount = visits.reduce((sum, v) => sum + v.photos.length, 0);
  const generatedAt = formatReportDateTime(new Date().toISOString());

  return (
    <div
      className="print-modal-root fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Hane Ziyareti Rapor Önizleme"
    >
      <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 text-white sm:px-6">
        <div>
          <h2 className="text-sm font-semibold sm:text-base">
            Rapor Önizleme · {summary.title}
          </h2>
          <p className="text-xs text-slate-400">
            {visits.length} ziyaret kaydı ({uniqueHouseholdCount} tekil hane) listeleniyor
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportVisitsToCsv(visits)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            <DownloadIcon className="size-4" />
            Excel İndir (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <PrinterIcon className="size-4" />
            Yazdır / PDF Kaydet
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Kapat
          </button>
        </div>
      </header>

      <div className="print-scroll-area flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="print-report-sheet mx-auto max-w-5xl rounded-2xl bg-white p-6 text-slate-900 shadow-2xl sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div className="flex items-center gap-4">
              <Image
                src="/sydv-logo.png"
                alt="Menteşe SYDV Logosu"
                width={64}
                height={64}
                unoptimized
                className="size-16 shrink-0 object-contain"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  T.C. MENTEŞE KAYMAKAMLIĞI
                </p>
                <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 sm:text-lg">
                  SOSYAL YARDIMLAŞMA VE DAYANIŞMA VAKFI BAŞKANLIĞI
                </h1>
                <p className="mt-0.5 text-sm font-semibold text-blue-800">
                  {summary.title}
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Rapor Tarihi:</span>{" "}
                {generatedAt}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-800">Toplam Ziyaret:</span>{" "}
                {visits.length} kayıt
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl border border-slate-300 bg-slate-100/70 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="block font-semibold text-slate-600">
                Tarih / Dönem Kapsamı
              </span>
              <span className="mt-0.5 block font-bold text-slate-900">
                {summary.dateInfo}
              </span>
            </div>
            {summary.householdInfo && (
              <div>
                <span className="block font-semibold text-slate-600">
                  Hane / Arama Filtresi
                </span>
                <span className="mt-0.5 block font-bold text-slate-900">
                  {summary.householdInfo}
                </span>
              </div>
            )}
            {summary.personnelInfo && (
              <div>
                <span className="block font-semibold text-slate-600">
                  Görevli Personel Filtresi
                </span>
                <span className="mt-0.5 block font-bold text-slate-900">
                  {summary.personnelInfo}
                </span>
              </div>
            )}
            {summary.addressInfo && (
              <div>
                <span className="block font-semibold text-slate-600">
                  Mahalle / Adres Filtresi
                </span>
                <span className="mt-0.5 block font-bold text-slate-900">
                  {summary.addressInfo}
                </span>
              </div>
            )}
            <div>
              <span className="block font-semibold text-slate-600">
                Özet İstatistik
              </span>
              <span className="mt-0.5 block font-bold text-slate-900">
                {visits.length} Ziyaret · {uniqueHouseholdCount} Hane ·{" "}
                {totalPhotoCount} Fotoğraf
              </span>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-left text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-900">
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    #
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    Ziyaret Tarihi
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    TC Kimlik No / Ad Soyad
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    Dosya / Ref No
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    Telefon & Adres
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    Ziyaret Notları
                  </th>
                  <th className="border border-slate-300 px-2.5 py-2 font-bold">
                    Ziyaret Görevlileri
                  </th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit, index) => (
                  <tr
                    key={visit.id}
                    className="break-inside-avoid border-b border-slate-300 align-top"
                  >
                    <td className="border border-slate-300 px-2.5 py-2 font-semibold">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap border border-slate-300 px-2.5 py-2">
                      {formatReportDateTime(visit.created_at)}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      <p className="font-bold text-slate-900">
                        {visit.ad_soyad}
                      </p>
                      <p className="font-mono text-[11px] text-slate-700">
                        {visit.tc_no}
                      </p>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      {visit.dosya_no ? (
                        <p>
                          <span className="text-slate-600">Dosya:</span>{" "}
                          {visit.dosya_no}
                        </p>
                      ) : null}
                      {visit.referans_no ? (
                        <p>
                          <span className="text-slate-600">Ref:</span>{" "}
                          {visit.referans_no}
                        </p>
                      ) : null}
                      {!visit.dosya_no && !visit.referans_no && "-"}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      {visit.telefon && (
                        <p className="font-medium text-slate-800">
                          Tel: {visit.telefon}
                        </p>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap text-slate-700">
                        {visit.adres}
                      </p>
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      <p className="whitespace-pre-wrap text-slate-800">
                        {visit.notlar || "-"}
                      </p>
                      {visit.photos.length > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-slate-600">
                          ({visit.photos.length} fotoğraf eklendi)
                        </p>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2">
                      {visit.ziyareti_yapan_personel_adi ? (
                        <p>
                          <span className="font-semibold">Yapan:</span>{" "}
                          {visit.ziyareti_yapan_personel_adi}
                        </p>
                      ) : (
                        <p className="text-slate-500">Belirtilmedi</p>
                      )}
                      {visit.katilan_personel_adi && (
                        <p className="mt-0.5">
                          <span className="font-semibold">Katılan:</span>{" "}
                          {visit.katilan_personel_adi}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 pt-4 text-center text-xs text-slate-800">
            <div>
              <p className="font-bold">Raporu Düzenleyen / İnceleme Görevlisi</p>
              <p className="mt-8 text-slate-500">İmza</p>
            </div>
            <div>
              <p className="font-bold">Vakıf Müdürü / Onay</p>
              <p className="mt-8 text-slate-500">İmza</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatReportDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
