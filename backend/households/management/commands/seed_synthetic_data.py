from django.core.management.base import BaseCommand

from households.models import Household, Personnel, RegisteredHousehold


class Command(BaseCommand):
    help = "Creates synthetic household and personnel records for saha testing."

    def handle(self, *args, **options):
        test_households = [
            {
                "tc_no": "11111111111",
                "ad": "TEST",
                "soyad": "HANE A",
                "ad_soyad": "TEST HANE A",
                "dosya_no": "TEST-DOSYA-001",
                "referans_no": "TEST-REF-001",
                "telefon": "05000000001",
                "adres": "SENTETIK TEST ADRESI 1, MENTESE/MUGLA",
            },
            {
                "tc_no": "22222222222",
                "ad": "TEST",
                "soyad": "HANE B",
                "ad_soyad": "TEST HANE B",
                "dosya_no": "TEST-DOSYA-002",
                "referans_no": "TEST-REF-002",
                "telefon": "05000000002",
                "adres": "SENTETIK TEST ADRESI 2, MENTESE/MUGLA",
            },
            {
                "tc_no": "33333333333",
                "ad": "TEST",
                "soyad": "HANE C",
                "ad_soyad": "TEST HANE C",
                "dosya_no": "TEST-DOSYA-003",
                "referans_no": "TEST-REF-003",
                "telefon": "05000000003",
                "adres": "SENTETIK TEST ADRESI 3, MENTESE/MUGLA",
            },
        ]

        for household_data in test_households:
            tc_no = household_data["tc_no"]
            RegisteredHousehold.objects.update_or_create(
                tc_no=tc_no,
                defaults=household_data,
            )

        Personnel.objects.get_or_create(
            ad_soyad="TEST PERSONEL",
            defaults={"unvan": "Saha Testi", "telefon": "05000000000"},
        )

        if not Household.objects.filter(tc_no="11111111111").exists():
            Household.objects.create(
                tc_no="11111111111",
                ad_soyad="TEST HANE A",
                dosya_no="TEST-DOSYA-001",
                referans_no="TEST-REF-001",
                telefon="05000000001",
                adres="SENTETIK TEST ADRESI 1, MENTESE/MUGLA",
                notlar="Sentetik saha test kaydi.",
            )

        self.stdout.write(self.style.SUCCESS("Sentetik saha test verileri hazir."))
