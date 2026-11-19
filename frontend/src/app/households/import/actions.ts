"use server";

import { revalidatePath } from "next/cache";
import {
  importRegisteredHouseholdsExcel,
  type ExcelImportResult,
} from "@/lib/api";

export type ExcelImportActionState = {
  error?: string;
  result?: ExcelImportResult;
};

export async function importExcelAction(
  _previousState: ExcelImportActionState,
  formData: FormData,
): Promise<ExcelImportActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Lütfen yüklenecek Excel (.xlsx) veya CSV dosyasını seçin.",
    };
  }

  try {
    const result = await importRegisteredHouseholdsExcel(file);
    revalidatePath("/households/import");
    return { result };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Excel dosyası aktarılırken bir hata oluştu." };
  }
}
