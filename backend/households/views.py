from django.db.models import Max
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .excel_importer import import_registered_households_from_file
from .models import Household, HouseholdPhoto, Personnel, RegisteredHousehold
from .photo_classifier import VALID_PHOTO_TYPES, classify_household_photo
from .serializers import (
    HouseholdPhotoSerializer,
    HouseholdSerializer,
    PersonnelSerializer,
    RegisteredHouseholdSerializer,
)


class PersonnelViewSet(viewsets.ModelViewSet):
    queryset = Personnel.objects.all().order_by("-aktif", "ad_soyad")
    serializer_class = PersonnelSerializer


class HouseholdViewSet(viewsets.ModelViewSet):
    queryset = (
        Household.objects.select_related(
            "ziyareti_yapan_personel", "katilan_personel"
        )
        .prefetch_related("photos")
        .all()
        .order_by("-created_at")
    )
    serializer_class = HouseholdSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        self._sync_registered_household(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_registered_household(instance)

    def _sync_registered_household(self, instance: Household):
        tc_no = (instance.tc_no or "").strip()
        if len(tc_no) != 11 or not tc_no.isdigit():
            return
        existing = RegisteredHousehold.objects.filter(tc_no=tc_no).first()
        if existing is None:
            parts = (instance.ad_soyad or "").strip().split()
            soyad = parts[-1] if len(parts) > 1 else ""
            ad = (
                " ".join(parts[:-1])
                if len(parts) > 1
                else (instance.ad_soyad or "").strip()
            )
            RegisteredHousehold.objects.create(
                tc_no=tc_no,
                ad=ad[:100],
                soyad=soyad[:100],
                ad_soyad=(instance.ad_soyad or "").strip()[:200],
                dosya_no=(instance.dosya_no or "").strip()[:100],
                referans_no=(instance.referans_no or "").strip()[:100],
                telefon=(instance.telefon or "").strip()[:30],
                adres=(instance.adres or "").strip(),
            )
        else:
            updated = False
            if instance.telefon and existing.telefon != instance.telefon:
                existing.telefon = instance.telefon[:30]
                updated = True
            if instance.adres and existing.adres != instance.adres:
                existing.adres = instance.adres
                updated = True
            if instance.dosya_no and not existing.dosya_no:
                existing.dosya_no = instance.dosya_no[:100]
                updated = True
            if instance.referans_no and not existing.referans_no:
                existing.referans_no = instance.referans_no[:100]
                updated = True
            if updated:
                existing.save()

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        tc_no = (request.query_params.get("tc_no") or "").strip()
        if len(tc_no) != 11 or not tc_no.isdigit():
            return Response(
                {"error": "Geçerli bir 11 haneli TC Kimlik No giriniz."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registered = RegisteredHousehold.objects.filter(tc_no=tc_no).first()
        previous_visits = (
            Household.objects.filter(tc_no=tc_no)
            .select_related("ziyareti_yapan_personel", "katilan_personel")
            .prefetch_related("photos")
            .order_by("-created_at")
        )

        registered_data = (
            RegisteredHouseholdSerializer(registered).data
            if registered is not None
            else None
        )
        visits_data = HouseholdSerializer(
            previous_visits, many=True, context={"request": request}
        ).data

        return Response(
            {
                "tc_no": tc_no,
                "found_in_registered": registered is not None,
                "registered_household": registered_data,
                "previous_visits": visits_data,
            }
        )


class RegisteredHouseholdViewSet(viewsets.ModelViewSet):
    queryset = RegisteredHousehold.objects.all().order_by("ad_soyad")
    serializer_class = RegisteredHouseholdSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        total = RegisteredHousehold.objects.count()
        latest = RegisteredHousehold.objects.aggregate(
            last_updated_at=Max("updated_at")
        )["last_updated_at"]
        return Response(
            {
                "total_registered_households": total,
                "last_updated_at": latest,
            }
        )

    @action(detail=False, methods=["post"], url_path="import")
    def import_excel(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response(
                {"error": "Lütfen yüklenecek Excel (.xlsx) veya CSV dosyasını seçin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = import_registered_households_from_file(
                uploaded_file, filename=uploaded_file.name
            )
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"error": f"Dosya aktarılırken beklenmeyen bir hata oluştu: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class HouseholdPhotoViewSet(viewsets.ModelViewSet):
    queryset = HouseholdPhoto.objects.all().order_by("-created_at")
    serializer_class = HouseholdPhotoSerializer

    def perform_create(self, serializer):
        uploaded_photo = self.request.FILES.get("photo")
        requested_type = (self.request.data.get("photo_type") or "").strip()
        auto_classify = (
            str(self.request.data.get("auto_classify", "true")).lower()
            != "false"
        )

        if uploaded_photo and (
            auto_classify or not requested_type or requested_type == "diger"
        ):
            detected_type = classify_household_photo(
                uploaded_photo,
                filename=getattr(uploaded_photo, "name", ""),
            )
            if detected_type in VALID_PHOTO_TYPES:
                serializer.save(photo_type=detected_type)
                return

        serializer.save()

    @action(detail=False, methods=["post"], url_path="auto-classify")
    def auto_classify_household_photos(self, request):
        household_id = request.data.get("household_id")
        queryset = HouseholdPhoto.objects.all()
        if household_id:
            queryset = queryset.filter(household_id=household_id)

        updated_count = 0
        for photo_obj in queryset:
            if not photo_obj.photo:
                continue
            try:
                detected_type = classify_household_photo(
                    photo_obj.photo.path,
                    filename=photo_obj.photo.name,
                )
            except Exception:
                continue
            if (
                detected_type in VALID_PHOTO_TYPES
                and photo_obj.photo_type != detected_type
            ):
                photo_obj.photo_type = detected_type
                photo_obj.save(update_fields=["photo_type"])
                updated_count += 1

        return Response(
            {
                "updated_count": updated_count,
                "total_checked": queryset.count(),
            }
        )

    def perform_destroy(self, instance):
        photo = instance.photo
        instance.delete()
        if photo and photo.name:
            photo.delete(save=False)
