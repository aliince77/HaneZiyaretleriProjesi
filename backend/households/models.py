from django.db import models


class Personnel(models.Model):
    ad_soyad = models.CharField(max_length=150, verbose_name="Ad Soyad")
    unvan = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Ünvan / Görev")
    telefon = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Telefon")
    aktif = models.BooleanField(default=True, verbose_name="Aktif")
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Oluşturulma Tarihi")

    class Meta:
        verbose_name = "Personel"
        verbose_name_plural = "Personeller"
        ordering = ["ad_soyad"]

    def __str__(self):
        return f"{self.ad_soyad} ({self.unvan})" if self.unvan else self.ad_soyad


class RegisteredHousehold(models.Model):
    tc_no = models.CharField(
        max_length=11,
        unique=True,
        db_index=True,
        verbose_name="TC Kimlik No",
    )
    ad = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Ad")
    soyad = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Soyad")
    ad_soyad = models.CharField(max_length=200, verbose_name="Ad Soyad")
    dosya_no = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Dosya No")
    referans_no = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Referans No")
    telefon = models.CharField(
        max_length=30, blank=True, default="", verbose_name="Telefon")
    adres = models.TextField(blank=True, default="", verbose_name="Adres")
    updated_at = models.DateTimeField(
        auto_now=True, verbose_name="Güncellenme Tarihi")

    class Meta:
        verbose_name = "Kayıtlı Aktif Hane"
        verbose_name_plural = "Kayıtlı Aktif Haneler"
        ordering = ["ad_soyad"]

    def __str__(self):
        return f"{self.ad_soyad} ({self.tc_no})"


class Household(models.Model):

    tc_no = models.CharField(
        max_length=11, db_index=True, verbose_name="TC Kimlik No")
    ad_soyad = models.CharField(max_length=200, verbose_name="Ad Soyad")
    dosya_no = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Dosya No")
    referans_no = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Referans No")
    telefon = models.CharField(
        max_length=20, blank=True, verbose_name="Telefon")
    adres = models.TextField(verbose_name="Adres")
    notlar = models.TextField(blank=True, verbose_name="Notlar")

    APPLICATION_TYPES = [
        ("gss", "GSS"),
        ("nakdi", "Nakdi Yardım"),
        ("komur", "Kömür Yardımı"),
        ("vefa", "VEFA"),
        ("diger", "Diğer"),
    ]
    basvuru_turu = models.CharField(
        max_length=20, choices=APPLICATION_TYPES, default="diger", verbose_name="Başvuru Türü")

    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Oluşturulma Tarihi")

    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True)

    ziyareti_yapan_personel = models.ForeignKey(
        Personnel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="yaptigi_ziyaretler",
        verbose_name="Hane Ziyaretini Yapan Personel",
    )
    katilan_personel = models.ForeignKey(
        Personnel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="katildigi_ziyaretler",
        verbose_name="Hane Ziyaretine Katılan Personel",
    )

    def __str__(self):
        return self.ad_soyad


class HouseholdPhoto(models.Model):
    PHOTO_TYPES = [
        ("dis", "Dış Cephe"),
        ("salon", "Salon"),
        ("oturma_odasi", "Oturma Odası"),
        ("mutfak", "Mutfak"),
        ("oda", "Oda"),
        ("banyo", "Banyo"),
        ("diger", "Diğer"),
    ]

    household = models.ForeignKey(
        Household, on_delete=models.CASCADE, related_name="photos")
    photo = models.ImageField(upload_to="households/")

    photo_type = models.CharField(
        max_length=20, choices=PHOTO_TYPES, default="diger")

    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Oluşturulma Tarihi")

    def __str__(self):
        return f"{self.household.ad_soyad}"
