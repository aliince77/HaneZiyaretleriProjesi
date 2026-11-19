"use server";

import { redirect } from "next/navigation";
import {
  createHousehold,
  lookupHouseholdByTc,
  uploadHouseholdPhoto,
  type HouseholdInput,
  type HouseholdLookupResult,
} from "@/lib/api";

export async function lookupHouseholdByTcAction(
  tcNo: string,
): Promise<{ data?: HouseholdLookupResult; error?: string }> {
  const cleaned = tcNo.trim();
  if (!/^[0-9]{11}$/.test(cleaned)) {
    return { error: "TC Kimlik No 11 haneli rakam olmalıdır." };
  }

  try {
    const data = await lookupHouseholdByTc(cleaned);
    return { data };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Sorgulama sırasında bir hata oluştu." };
  }
}

export type CreateHouseholdState = {
  error?: string;
  householdId?: number;
  uploadedPhotoCount?: number;
};

export async function createHouseholdAction(
  _previousState: CreateHouseholdState,
  formData: FormData,
): Promise<CreateHouseholdState> {
  const submittedHouseholdId = String(formData.get("household_id") ?? "");
  let householdId: number | undefined;

  if (submittedHouseholdId) {
    householdId = Number(submittedHouseholdId);
    if (!Number.isSafeInteger(householdId) || householdId <= 0) {
      return { error: "Hane kaydı geçersiz. Lütfen formu yeniden doldurun." };
    }
  }

  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const totalPhotoSize = photos.reduce((total, photo) => total + photo.size, 0);
  const uploadedPhotoCount = Number(
    formData.get("uploaded_photo_count") ?? 0,
  );

  if (totalPhotoSize > 20 * 1024 * 1024) {
    return {
      error: "Fotoğrafların toplam boyutu en fazla 20 MB olabilir.",
      householdId,
      uploadedPhotoCount: 0,
    };
  }

  if (
    !Number.isSafeInteger(uploadedPhotoCount) ||
    uploadedPhotoCount < 0 ||
    uploadedPhotoCount > photos.length
  ) {
    return {
      error: "Fotoğrafları tekrar seçip aynı sırayla yeniden deneyin.",
      householdId,
      uploadedPhotoCount: 0,
    };
  }

  if (householdId === undefined) {
    const yapanPersonelId = parseOptionalId(
      formData.get("ziyareti_yapan_personel"),
    );
    const katilanPersonelId = parseOptionalId(
      formData.get("katilan_personel"),
    );

    if (
      yapanPersonelId !== null &&
      katilanPersonelId !== null &&
      yapanPersonelId === katilanPersonelId
    ) {
      return {
        error:
          "Hane ziyaretini yapan personel ile ziyarete katılan personel aynı kişi olamaz.",
      };
    }

    const household: HouseholdInput = {
      tc_no: String(formData.get("tc_no") ?? "").trim(),
      ad_soyad: String(formData.get("ad_soyad") ?? "").trim(),
      dosya_no: String(formData.get("dosya_no") ?? "").trim(),
      referans_no: String(formData.get("referans_no") ?? "").trim(),
      telefon: String(formData.get("telefon") ?? "").trim(),
      adres: String(formData.get("adres") ?? "").trim(),
      notlar: String(formData.get("notlar") ?? "").trim(),
      latitude: parseCoordinate(formData.get("latitude")),
      longitude: parseCoordinate(formData.get("longitude")),
      ziyareti_yapan_personel: yapanPersonelId,
      katilan_personel: katilanPersonelId,
    };

    if (!/^[0-9]{11}$/.test(household.tc_no)) {
      return { error: "TC Kimlik No 11 rakamdan oluşmalıdır." };
    }

    if (!household.ad_soyad || !household.adres) {
      return { error: "Ad Soyad ve Adres alanları zorunludur." };
    }

    if (
      (household.latitude === null) !== (household.longitude === null) ||
      (household.latitude !== null &&
        (!Number.isFinite(household.latitude) ||
          household.latitude < -90 ||
          household.latitude > 90)) ||
      (household.longitude !== null &&
        (!Number.isFinite(household.longitude) ||
          household.longitude < -180 ||
          household.longitude > 180))
    ) {
      return { error: "Konum bilgisi geçerli değil. Lütfen konumu tekrar alın." };
    }

    try {
      const createdHousehold = await createHousehold(household);
      householdId = createdHousehold.id;
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }

      throw error;
    }
  }

  const createdHouseholdId = householdId;
  if (createdHouseholdId === undefined) {
    throw new Error("Hane kaydı oluşturulamadı.");
  }

  for (let index = uploadedPhotoCount; index < photos.length; index += 1) {
    try {
      await uploadHouseholdPhoto(createdHouseholdId, photos[index]);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: `Hane kaydedildi ancak fotoğraflar yüklenemedi. Aynı fotoğrafları aynı sırayla tekrar seçip yeniden deneyin. ${error.message}`,
          householdId: createdHouseholdId,
          uploadedPhotoCount: index,
        };
      }

      throw error;
    }
  }

  redirect("/");
}

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  const coordinate = String(value ?? "").trim();
  if (!coordinate) {
    return null;
  }

  const parsedCoordinate = Number(coordinate);
  return Number.isFinite(parsedCoordinate) ? parsedCoordinate : NaN;
}

function parseOptionalId(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
