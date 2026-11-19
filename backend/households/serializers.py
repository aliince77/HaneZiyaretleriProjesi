from rest_framework import serializers
from .models import Household, HouseholdPhoto, Personnel, RegisteredHousehold


class PersonnelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personnel
        fields = (
            "id",
            "ad_soyad",
            "unvan",
            "telefon",
            "aktif",
            "created_at",
        )


class RegisteredHouseholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegisteredHousehold
        fields = (
            "id",
            "tc_no",
            "ad",
            "soyad",
            "ad_soyad",
            "dosya_no",
            "referans_no",
            "telefon",
            "adres",
            "updated_at",
        )


class HouseholdPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseholdPhoto
        fields = ("id", "household", "photo", "photo_type", "created_at")


class HouseholdSerializer(serializers.ModelSerializer):
    photos = HouseholdPhotoSerializer(many=True, read_only=True)
    ziyareti_yapan_personel_adi = serializers.CharField(
        source="ziyareti_yapan_personel.ad_soyad",
        read_only=True,
        default=None,
    )
    katilan_personel_adi = serializers.CharField(
        source="katilan_personel.ad_soyad",
        read_only=True,
        default=None,
    )

    class Meta:
        model = Household
        fields = (
            "id",
            "tc_no",
            "ad_soyad",
            "dosya_no",
            "referans_no",
            "telefon",
            "adres",
            "notlar",
            "created_at",
            "latitude",
            "longitude",
            "ziyareti_yapan_personel",
            "ziyareti_yapan_personel_adi",
            "katilan_personel",
            "katilan_personel_adi",
            "photos"
        )

    def validate(self, attrs):
        yapan = attrs.get(
            "ziyareti_yapan_personel",
            getattr(self.instance, "ziyareti_yapan_personel", None),
        )
        katilan = attrs.get(
            "katilan_personel",
            getattr(self.instance, "katilan_personel", None),
        )
        if yapan is not None and katilan is not None and yapan.id == katilan.id:
            raise serializers.ValidationError(
                "Hane ziyaretini yapan personel ile ziyarete katılan personel aynı kişi olamaz."
            )
        return attrs
