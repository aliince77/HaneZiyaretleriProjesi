"use client";

import { useActionState, useState } from "react";
import HouseholdMap from "@/components/HouseholdMap";
import type { Household, Personnel } from "@/lib/api";
import {
  updateHouseholdAction,
  type HouseholdActionState,
} from "@/app/households/[id]/actions";

const initialState: HouseholdActionState = {};
const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function HouseholdEditor({
  household,
  personnelList = [],
}: {
  household: Household;
  personnelList?: Personnel[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Hane Bilgileri
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kayıt bilgilerini görüntüleyin veya güncelleyin.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
          >
            <PencilIcon className="size-4" />
            Bilgileri Düzenle
          </button>
        )}
      </header>

      <div className="p-5 sm:p-8">
        {isEditing ? (
          <HouseholdEditForm
            household={household}
            personnelList={personnelList}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailField label="TC Kimlik No">
              <span className="font-mono">{household.tc_no}</span>
            </DetailField>
            <DetailField label="Dosya No">
              {household.dosya_no || "Belirtilmedi"}
            </DetailField>
            <DetailField label="Referans No">
              {household.referans_no || "Belirtilmedi"}
            </DetailField>
            <DetailField label="Telefon">
              {household.telefon || "Belirtilmedi"}
            </DetailField>
            <DetailField label="Hane Ziyaretini Yapan Personel">
              {household.ziyareti_yapan_personel_adi || "Belirtilmedi"}
            </DetailField>
            <DetailField label="Hane Ziyaretine Katılan Personel">
              {household.katilan_personel_adi || "Yok (Tek personel)"}
            </DetailField>
            <DetailField label="Adres" className="sm:col-span-2">
              {household.adres}
            </DetailField>
            {household.notlar && (
              <DetailField label="Notlar" className="sm:col-span-2">
                {household.notlar}
              </DetailField>
            )}
            {household.latitude !== null &&
              household.longitude !== null && (
                <div className="sm:col-span-2">
                  <HouseholdMap
                    latitude={household.latitude}
                    longitude={household.longitude}
                    title={`${household.ad_soyad} · Hane Konumu`}
                  />
                </div>
              )}
          </dl>
        )}
      </div>
    </section>
  );
}

function HouseholdEditForm({
  household,
  personnelList,
  onCancel,
}: {
  household: Household;
  personnelList: Personnel[];
  onCancel: () => void;
}) {
  const [ziyaretiYapanId, setZiyaretiYapanId] = useState(
    household.ziyareti_yapan_personel
      ? String(household.ziyareti_yapan_personel)
      : "",
  );
  const [katilanPersonelId, setKatilanPersonelId] = useState(
    household.katilan_personel ? String(household.katilan_personel) : "",
  );
  const [latitude, setLatitude] = useState(household.latitude ?? "");
  const [longitude, setLongitude] = useState(household.longitude ?? "");
  const [locationMessage, setLocationMessage] = useState("");
  const [state, formAction, isPending] = useActionState(
    updateHouseholdAction.bind(null, household.id),
    initialState,
  );

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    setLocationMessage("Konum alınıyor...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setLocationMessage("Mevcut GPS konumu alındı.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage("Konum izni verilmedi.");
        } else if (error.code === error.TIMEOUT) {
          setLocationMessage("Konum alınamadı: zaman aşımına uğradı.");
        } else {
          setLocationMessage("Konum alınamadı. Lütfen tekrar deneyin.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Ad Soyad" htmlFor="edit-ad-soyad">
          <input
            id="edit-ad-soyad"
            name="ad_soyad"
            defaultValue={household.ad_soyad}
            maxLength={200}
            required
            className={inputClassName}
          />
        </FormField>
        <FormField label="TC Kimlik No" htmlFor="edit-tc-no">
          <input
            id="edit-tc-no"
            name="tc_no"
            defaultValue={household.tc_no}
            inputMode="numeric"
            pattern="[0-9]{11}"
            maxLength={11}
            required
            className={inputClassName}
          />
        </FormField>
        <FormField label="Dosya No" htmlFor="edit-dosya-no">
          <input
            id="edit-dosya-no"
            name="dosya_no"
            defaultValue={household.dosya_no}
            maxLength={100}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Referans No" htmlFor="edit-referans-no">
          <input
            id="edit-referans-no"
            name="referans_no"
            defaultValue={household.referans_no}
            maxLength={100}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Telefon" htmlFor="edit-telefon">
          <input
            id="edit-telefon"
            name="telefon"
            type="tel"
            defaultValue={household.telefon}
            maxLength={20}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Adres" htmlFor="edit-adres" className="sm:col-span-2">
          <textarea
            id="edit-adres"
            name="adres"
            defaultValue={household.adres}
            rows={3}
            required
            className={`${inputClassName} resize-y`}
          />
        </FormField>
        <FormField label="Notlar" htmlFor="edit-notlar" className="sm:col-span-2">
          <textarea
            id="edit-notlar"
            name="notlar"
            defaultValue={household.notlar}
            rows={3}
            className={`${inputClassName} resize-y`}
          />
        </FormField>
        <FormField
          label="Hane Ziyaretini Yapan Personel"
          htmlFor="edit-ziyareti-yapan-personel"
        >
          <select
            id="edit-ziyareti-yapan-personel"
            name="ziyareti_yapan_personel"
            value={ziyaretiYapanId}
            onChange={(event) => {
              const nextId = event.target.value;
              setZiyaretiYapanId(nextId);
              if (nextId && nextId === katilanPersonelId) {
                setKatilanPersonelId("");
              }
            }}
            className={inputClassName}
          >
            <option value="">Personel seçiniz</option>
            {personnelList
              .filter(
                (person) =>
                  person.aktif ||
                  person.id === household.ziyareti_yapan_personel,
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.ad_soyad}
                  {person.unvan ? ` (${person.unvan})` : ""}
                </option>
              ))}
          </select>
        </FormField>
        <FormField
          label="Hane Ziyaretine Katılan Personel"
          htmlFor="edit-katilan-personel"
        >
          <select
            id="edit-katilan-personel"
            name="katilan_personel"
            value={katilanPersonelId}
            onChange={(event) => setKatilanPersonelId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Yok (Tek personel)</option>
            {personnelList
              .filter(
                (person) =>
                  (person.aktif || person.id === household.katilan_personel) &&
                  String(person.id) !== ziyaretiYapanId,
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.ad_soyad}
                  {person.unvan ? ` (${person.unvan})` : ""}
                </option>
              ))}
          </select>
        </FormField>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">
            Konum{" "}
            <span className="font-normal text-slate-500">(isteğe bağlı)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={captureCurrentLocation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              Mevcut Konumumu Al (GPS)
            </button>
            {(latitude || longitude) && (
              <button
                type="button"
                onClick={() => {
                  setLatitude("");
                  setLongitude("");
                  setLocationMessage("Konum temizlendi.");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Konumu Temizle
              </button>
            )}
          </div>
        </div>
        {locationMessage && (
          <p role="status" className="mb-3 text-xs font-medium text-blue-700">
            {locationMessage}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Enlem" htmlFor="edit-latitude">
            <input
              id="edit-latitude"
              name="latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Boylam" htmlFor="edit-longitude">
            <input
              id="edit-longitude"
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </div>
        {latitude !== "" && longitude !== "" && (
          <div className="mt-4">
            <HouseholdMap
              latitude={latitude}
              longitude={longitude}
              title="Seçilen Konum Önizlemesi"
              compact
            />
          </div>
        )}
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}

function DetailField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-slate-50 px-4 py-3.5 ${className}`}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
        {children}
      </dd>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
