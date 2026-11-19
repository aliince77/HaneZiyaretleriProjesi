"use server";

import { revalidatePath } from "next/cache";
import {
  createPersonnel,
  deletePersonnel,
  updatePersonnel,
} from "@/lib/api";

export type PersonnelActionState = {
  error?: string;
  success?: string;
};

export async function createPersonnelAction(
  _previousState: PersonnelActionState,
  formData: FormData,
): Promise<PersonnelActionState> {
  const ad_soyad = String(formData.get("ad_soyad") ?? "").trim();
  const unvan = String(formData.get("unvan") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim();

  if (!ad_soyad) {
    return { error: "Personel Ad Soyad alanı zorunludur." };
  }

  try {
    await createPersonnel({
      ad_soyad,
      unvan,
      telefon,
      aktif: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Personel kaydedilemedi." };
  }

  revalidatePath("/personnel");
  revalidatePath("/households/new");
  return { success: `${ad_soyad} personel listesine eklendi.` };
}

export async function togglePersonnelActiveAction(
  personnelId: number,
  nextActive: boolean,
) {
  await updatePersonnel(personnelId, { aktif: nextActive });
  revalidatePath("/personnel");
  revalidatePath("/households/new");
}

export async function deletePersonnelAction(personnelId: number) {
  await deletePersonnel(personnelId);
  revalidatePath("/personnel");
  revalidatePath("/households/new");
}
