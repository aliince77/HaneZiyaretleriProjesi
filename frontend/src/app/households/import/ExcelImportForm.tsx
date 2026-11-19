"use client";

import { useActionState, useState } from "react";
import {
  importExcelAction,
  type ExcelImportActionState,
} from "./actions";

const initialState: ExcelImportActionState = {};

export default function ExcelImportForm({
  initialTotalCount,
}: {
  initialTotalCount: number;
}) {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [state, formAction, isPending] = useActionState(
    importExcelAction,
    initialState,
  );

  const currentTotal =
    state.result?.total_registered_households ?? initialTotalCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Sistemde Kayıtlı Aktif Hane Rehberi
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {currentTotal.toLocaleString("tr-TR")} hane
          </p>
        </div>
        <span className="rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm">
          Ziyaret sırasında TC ile otomatik sorgulanır
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          Excel Dosyasında Beklenen Sütun Başlıkları:
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {[
            "DOSYA NO",
            "REFERANS NO",
            "AD",
            "SOYAD",
            "TCKN",
            "TELEFON",
            "ADRES",
          ].map((col) => (
            <span
              key={col}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-blue-700"
            >
              {col}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-slate-500">
          Sütunların sırası önemli değildir. Daha önce yüklenmiş TC Kimlik
          numaraları tekrar yüklenirse kopya oluşturulmaz, mevcut bilgileri
          güncellenir.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="excel-file"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Excel (.xlsx) veya CSV Dosyası Seçin
          </label>
          <input
            id="excel-file"
            name="file"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            required
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setSelectedFile(
                file ? { name: file.name, size: file.size } : null,
              );
            }}
            className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm text-slate-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <p className="mt-2 text-xs font-medium text-blue-700">
              Seçilen dosya: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !selectedFile}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Aktarılıyor, lütfen bekleyin..." : "Aktif Haneleri Veritabanına Yükle"}
          </button>
        </div>
      </form>

      {state.error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">Aktarım Hatası</p>
          <p className="mt-1">{state.error}</p>
        </div>
      )}

      {state.result && (
        <div
          role="status"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-800"
        >
          <p className="text-base font-bold text-blue-700">
            Excel Aktarımı Başarıyla Tamamlandı!
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <dt className="text-xs text-slate-500">İşlenen Hane</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">
                {state.result.imported_count.toLocaleString("tr-TR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <dt className="text-xs text-slate-500">Yeni Eklenen</dt>
              <dd className="mt-1 text-lg font-bold text-blue-700">
                {state.result.created_count.toLocaleString("tr-TR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <dt className="text-xs text-slate-500">Güncellenen</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">
                {state.result.updated_count.toLocaleString("tr-TR")}
              </dd>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <dt className="text-xs text-slate-500">Atlanan Satır</dt>
              <dd className="mt-1 text-lg font-bold text-slate-600">
                {state.result.skipped_count.toLocaleString("tr-TR")}
              </dd>
            </div>
          </dl>

          {state.result.skipped_reasons.length > 0 && (
            <div className="mt-4 rounded-xl bg-white p-3.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">
                Atlanan Satır Örnekleri:
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-1">
                {state.result.skipped_reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
