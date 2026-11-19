"use client";

import { useActionState, useTransition } from "react";
import type { Personnel } from "@/lib/api";
import {
  createPersonnelAction,
  deletePersonnelAction,
  togglePersonnelActiveAction,
  type PersonnelActionState,
} from "./actions";

const initialState: PersonnelActionState = {};
const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function PersonnelManager({
  personnelList,
}: {
  personnelList: Personnel[];
}) {
  const [state, formAction, isPending] = useActionState(
    createPersonnelAction,
    initialState,
  );
  const [isMutating, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <form
        action={formAction}
        className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
      >
        <h2 className="text-base font-semibold text-slate-900">
          Yeni Personel Ekle
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="personnel-ad-soyad"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              id="personnel-ad-soyad"
              name="ad_soyad"
              type="text"
              maxLength={150}
              required
              placeholder="Örn: Ahmet Yılmaz"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="personnel-unvan"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Ünvan / Görev
            </label>
            <input
              id="personnel-unvan"
              name="unvan"
              type="text"
              maxLength={100}
              placeholder="Örn: Sosyal İnceleme Görevlisi"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="personnel-telefon"
              className="mb-1.5 block text-xs font-medium text-slate-700"
            >
              Telefon
            </label>
            <input
              id="personnel-telefon"
              name="telefon"
              type="tel"
              maxLength={20}
              placeholder="05xx xxx xx xx"
              className={inputClassName}
            />
          </div>
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        {state.success && (
          <p
            role="status"
            className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700"
          >
            {state.success}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Ekleniyor..." : "Personeli Ekle"}
          </button>
        </div>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Kayıtlı Personeller ({personnelList.length})
          </h2>
          <p className="text-xs text-slate-500">
            Aktif personeller ziyaret ekleme ekranında seçim listesinde görünür.
          </p>
        </div>

        {personnelList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
            Henüz kayıtlı personel bulunmuyor. Yukarıdaki formdan personel
            ekleyebilirsiniz.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {personnelList.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {person.ad_soyad}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        person.aktif
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {person.aktif ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  {(person.unvan || person.telefon) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[person.unvan, person.telefon]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() =>
                      startTransition(async () => {
                        await togglePersonnelActiveAction(
                          person.id,
                          !person.aktif,
                        );
                      })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {person.aktif ? "Pasife Al" : "Aktif Yap"}
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `${person.ad_soyad} personel kaydını silmek istediğinize emin misiniz?`,
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        await deletePersonnelAction(person.id);
                      });
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
