from django.contrib import admin
from .models import (
    Household,
    HouseholdPhoto,
    Personnel,
    RegisteredHousehold,
)


@admin.register(Personnel)
class PersonnelAdmin(admin.ModelAdmin):
    list_display = (
        "ad_soyad",
        "unvan",
        "telefon",
        "aktif",
        "created_at",
    )
    list_filter = ("aktif",)
    search_fields = ("ad_soyad", "unvan", "telefon")


@admin.register(RegisteredHousehold)
class RegisteredHouseholdAdmin(admin.ModelAdmin):
    list_display = (
        "tc_no",
        "ad_soyad",
        "dosya_no",
        "referans_no",
        "telefon",
        "updated_at",
    )
    search_fields = (
        "tc_no",
        "ad_soyad",
        "dosya_no",
        "referans_no",
    )


class HouseholdPhotoInline(
    admin.TabularInline
):
    model = HouseholdPhoto
    extra = 1


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):

    list_display = (
        "ad_soyad",
        "tc_no",
        "dosya_no",
        "referans_no",
        "telefon",
        "ziyareti_yapan_personel",
        "katilan_personel",
        "created_at",
    )

    search_fields = (
        "ad_soyad",
        "tc_no",
        "dosya_no",
        "referans_no",
    )

    inlines = [
        HouseholdPhotoInline
    ]
