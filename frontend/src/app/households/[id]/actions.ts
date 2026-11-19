"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  autoClassifyHouseholdPhotos,
  deleteHouseholdPhoto,
  updateHousehold,
  updateHouseholdPhotoType,
  uploadHouseholdPhoto,
  type HouseholdInput,
} from "@/lib/api";

export type HouseholdActionState = {
  error?: string;
};

export type PhotoUploadActionState = {
  error?: string;
  uploadedPhotoCount?: number;
};

export async function updateHouseholdAction(
  householdId: number,
  _previousState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
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
    return { error: "Konum bilgisi geçerli değil." };
  }

  try {
    await updateHousehold(householdId, household);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath("/");
  revalidatePath(`/households/${householdId}`);
  redirect(`/households/${householdId}`);
}

export async function uploadHouseholdPhotosAction(
  householdId: number,
  _previousState: PhotoUploadActionState,
  formData: FormData,
): Promise<PhotoUploadActionState> {
  const photos = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const uploadedPhotoCount = Number(
    formData.get("uploaded_photo_count") ?? 0,
  );

  if (photos.length === 0) {
    return { error: "Lütfen yüklenecek fotoğrafları seçin." };
  }
  if (photos.reduce((total, photo) => total + photo.size, 0) > 20 * 1024 * 1024) {
    return {
      error: "Fotoğrafların toplam boyutu en fazla 20 MB olabilir.",
      uploadedPhotoCount: Number.isSafeInteger(uploadedPhotoCount)
        ? uploadedPhotoCount
        : 0,
    };
  }
  if (
    !Number.isSafeInteger(uploadedPhotoCount) ||
    uploadedPhotoCount < 0 ||
    uploadedPhotoCount > photos.length
  ) {
    return {
      error: "Aynı fotoğrafları aynı sırayla tekrar seçip yeniden deneyin.",
      uploadedPhotoCount: 0,
    };
  }

  for (let index = uploadedPhotoCount; index < photos.length; index += 1) {
    try {
      await uploadHouseholdPhoto(householdId, photos[index]);
    } catch (error) {
      if (error instanceof Error) {
        return {
          error: `Bazı fotoğraflar yüklenemedi. Daha önce yüklenenleri tekrarlamamak için aynı fotoğrafları aynı sırayla tekrar seçin. ${error.message}`,
          uploadedPhotoCount: index,
        };
      }

      throw error;
    }
  }

  revalidatePath(`/households/${householdId}`);
  redirect(`/households/${householdId}`);
}

export async function deleteHouseholdPhotoAction(
  householdId: number,
  photoId: number,
  _previousState: HouseholdActionState,
  _formData: FormData,
): Promise<HouseholdActionState> {
  void _previousState;
  void _formData;

  try {
    await deleteHouseholdPhoto(photoId);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    throw error;
  }

  revalidatePath(`/households/${householdId}`);
  redirect(`/households/${householdId}`);
}

export async function updatePhotoTypeAction(
  householdId: number,
  photoId: number,
  photoType: string,
): Promise<{ error?: string }> {
  try {
    await updateHouseholdPhotoType(photoId, photoType);
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Fotoğraf etiketi güncellenemedi." };
  }

  revalidatePath(`/households/${householdId}`);
  return {};
}

export async function autoClassifyPhotosAction(
  householdId: number,
): Promise<{ updatedCount?: number; totalChecked?: number; error?: string }> {
  try {
    const res = await autoClassifyHouseholdPhotos(householdId);
    revalidatePath(`/households/${householdId}`);
    return {
      updatedCount: res.updated_count,
      totalChecked: res.total_checked,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Yapay zeka etiketlemesi sırasında bir hata oluştu." };
  }
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
