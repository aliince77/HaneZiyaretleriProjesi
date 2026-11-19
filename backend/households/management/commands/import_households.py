from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from households.excel_importer import import_registered_households_from_file


class Command(BaseCommand):
    help = (
        "Excel (.xlsx) veya CSV dosyasından kayıtlı aktif haneleri "
        "(DOSYA NO, REFERANS NO, AD, SOYAD, TCKN, TELEFON, ADRES) veritabanına aktarır."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "file_path",
            type=str,
            help="Aktarılacak .xlsx veya .csv dosyasının yolu",
        )

    def handle(self, *args, **options):
        path = Path(options["file_path"])
        if not path.exists() or not path.is_file():
            raise CommandError(f"Dosya bulunamadı: {path}")

        self.stdout.write(f"Dosya okunuyor: {path} ...")
        try:
            with path.open("rb") as f:
                result = import_registered_households_from_file(
                    f, filename=path.name
                )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Aktarım tamamlandı!\n"
                f"  - İşlenen Hane Sayısı : {result['imported_count']}\n"
                f"  - Yeni Eklenen        : {result['created_count']}\n"
                f"  - Güncellenen         : {result['updated_count']}\n"
                f"  - Atlanan Satır       : {result['skipped_count']}\n"
                f"  - Toplam Aktif Hane   : {result['total_registered_households']}"
            )
        )
        if result["skipped_reasons"]:
            self.stdout.write(
                self.style.WARNING("Atlanan satır örnekleri:")
            )
            for reason in result["skipped_reasons"]:
                self.stdout.write(f"    * {reason}")
