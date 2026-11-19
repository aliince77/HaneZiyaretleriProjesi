import io
import json
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.utils import override_settings
from PIL import Image
from .models import Household, HouseholdPhoto, Personnel, RegisteredHousehold


def build_sample_xlsx(rows: list[list[str]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        sheet_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>',
        ]
        for r_idx, row in enumerate(rows, start=1):
            sheet_lines.append(f'<row r="{r_idx}">')
            for c_idx, val in enumerate(row):
                col_letter = chr(ord("A") + c_idx)
                sheet_lines.append(
                    f'<c r="{col_letter}{r_idx}" t="inlineStr"><is><t>{val}</t></is></c>'
                )
            sheet_lines.append("</row>")
        sheet_lines.append("</sheetData></worksheet>")
        zf.writestr("xl/worksheets/sheet1.xml", "".join(sheet_lines))
    return buf.getvalue()


class HouseholdPhotoDeleteTests(TestCase):
    def test_delete_removes_photo_record_and_media_file(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                household = Household.objects.create(
                    tc_no="12345678901",
                    ad_soyad="Test Kullanıcı",
                    adres="Test adres",
                )
                photo = HouseholdPhoto.objects.create(
                    household=household,
                    photo=SimpleUploadedFile("test.jpg", b"test image"),
                )
                file_path = photo.photo.path

                response = self.client.delete(f"/api/photos/{photo.pk}/")

                self.assertEqual(response.status_code, 204)
                self.assertFalse(HouseholdPhoto.objects.filter(pk=photo.pk).exists())
                self.assertFalse(Path(file_path).exists())


class HouseholdIdentifierTests(TestCase):
    def test_api_preserves_identifier_formatting(self):
        response = self.client.post(
            "/api/households/",
            data=json.dumps(
                {
                    "tc_no": "12345678901",
                    "ad_soyad": "Test Kullanıcı",
                    "dosya_no": "000123",
                    "referans_no": "REF/2026-01",
                    "adres": "Test adres",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["dosya_no"], "000123")
        self.assertEqual(response.json()["referans_no"], "REF/2026-01")


class RegisteredHouseholdImportAndLookupTests(TestCase):
    def test_xlsx_import_and_tc_lookup_with_previous_visits(self):
        xlsx_bytes = build_sample_xlsx(
            [
                ["DOSYA NO", "REFERANS NO", "AD", "SOYAD", "TCKN", "TELEFON", "ADRES"],
                ["1042", "REF-9001", "Ahmet", "Yılmaz", "11122233344", "05321112233", "Cumhuriyet Mah. No:5"],
                ["1043", "REF-9002", "Ayşe", "Demir", "55566677788", "05442223344", "Fatih Mah. No:12"],
            ]
        )
        uploaded = SimpleUploadedFile(
            "aktif_haneler.xlsx",
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        import_resp = self.client.post(
            "/api/registered-households/import/",
            {"file": uploaded},
        )
        self.assertEqual(import_resp.status_code, 200)
        data = import_resp.json()
        self.assertEqual(data["imported_count"], 2)
        self.assertEqual(data["created_count"], 2)
        self.assertEqual(RegisteredHousehold.objects.count(), 2)

        # Create a previous visit for Ahmet Yılmaz
        Household.objects.create(
            tc_no="11122233344",
            ad_soyad="Ahmet Yılmaz",
            dosya_no="1042",
            referans_no="REF-9001",
            telefon="05321112233",
            adres="Cumhuriyet Mah. No:5",
            notlar="2025 yılı hane ziyareti yapıldı.",
        )

        lookup_resp = self.client.get("/api/households/lookup/?tc_no=11122233344")
        self.assertEqual(lookup_resp.status_code, 200)
        lookup_json = lookup_resp.json()
        self.assertTrue(lookup_json["found_in_registered"])
        self.assertEqual(lookup_json["registered_household"]["ad_soyad"], "Ahmet Yılmaz")
        self.assertEqual(lookup_json["registered_household"]["dosya_no"], "1042")
        self.assertEqual(lookup_json["registered_household"]["referans_no"], "REF-9001")
        self.assertEqual(len(lookup_json["previous_visits"]), 1)
        self.assertEqual(
            lookup_json["previous_visits"][0]["notlar"],
            "2025 yılı hane ziyareti yapıldı.",
        )


class PersonnelAssignmentTests(TestCase):
    def test_visit_with_personnel_and_same_personnel_validation(self):
        p1 = Personnel.objects.create(ad_soyad="Mehmet Kaya", unvan="İnceleme Görevlisi")
        p2 = Personnel.objects.create(ad_soyad="Zeynep Çelik", unvan="Büro Görevlisi")

        resp = self.client.post(
            "/api/households/",
            data=json.dumps(
                {
                    "tc_no": "12345678901",
                    "ad_soyad": "Test Hane",
                    "adres": "Test Mah.",
                    "ziyareti_yapan_personel": p1.id,
                    "katilan_personel": p2.id,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["ziyareti_yapan_personel"], p1.id)
        self.assertEqual(body["ziyareti_yapan_personel_adi"], "Mehmet Kaya")
        self.assertEqual(body["katilan_personel"], p2.id)
        self.assertEqual(body["katilan_personel_adi"], "Zeynep Çelik")

        # Same personnel for both fields must be rejected
        bad_resp = self.client.post(
            "/api/households/",
            data=json.dumps(
                {
                    "tc_no": "12345678901",
                    "ad_soyad": "Test Hane",
                    "adres": "Test Mah.",
                    "ziyareti_yapan_personel": p1.id,
                    "katilan_personel": p1.id,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(bad_resp.status_code, 400)


class PhotoAutoClassificationTests(TestCase):
    def test_upload_auto_classifies_photo_and_allows_manual_update(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                household = Household.objects.create(
                    tc_no="12345678901",
                    ad_soyad="Test Kullanıcı",
                    adres="Test adres",
                )
                # Build an image with blue sky at top and green foliage below (exterior / dis)
                img = Image.new("RGB", (120, 120), (140, 140, 140))
                for y in range(45):
                    for x in range(120):
                        img.putpixel((x, y), (90, 160, 240))
                for y in range(45, 120):
                    for x in range(120):
                        img.putpixel((x, y), (50, 150, 60))
                buf = io.BytesIO()
                img.save(buf, format="JPEG")

                upload = SimpleUploadedFile(
                    "camera_capture.jpg",
                    buf.getvalue(),
                    content_type="image/jpeg",
                )
                resp = self.client.post(
                    "/api/photos/",
                    {
                        "household": household.id,
                        "photo": upload,
                        "photo_type": "diger",
                        "auto_classify": "true",
                    },
                )
                self.assertEqual(resp.status_code, 201)
                photo_data = resp.json()
                self.assertEqual(photo_data["photo_type"], "dis")

                # Manual label override via PATCH
                patch_resp = self.client.patch(
                    f"/api/photos/{photo_data['id']}/",
                    data=json.dumps({"photo_type": "oturma_odasi"}),
                    content_type="application/json",
                )
                self.assertEqual(patch_resp.status_code, 200)
                self.assertEqual(patch_resp.json()["photo_type"], "oturma_odasi")
