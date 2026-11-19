"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import HouseholdMap from "@/components/HouseholdMap";
import type { Household, Personnel } from "@/lib/api";
import { optimizeCameraOrGalleryPhotos } from "@/lib/imageCompression";
import {
  createHouseholdAction,
  lookupHouseholdByTcAction,
  type CreateHouseholdState,
} from "./actions";

const initialState: CreateHouseholdState = {};
const MAX_TOTAL_PHOTO_SIZE = 20 * 1024 * 1024;
const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function HouseholdForm({
  personnelList = [],
}: {
  personnelList?: Personnel[];
}) {
  const [tcNo, setTcNo] = useState("");
  const [adSoyad, setAdSoyad] = useState("");
  const [dosyaNo, setDosyaNo] = useState("");
  const [referansNo, setReferansNo] = useState("");
  const [telefon, setTelefon] = useState("");
  const [adres, setAdres] = useState("");
  const [notlar, setNotlar] = useState("");
  const [ziyaretiYapanId, setZiyaretiYapanId] = useState("");
  const [katilanPersonelId, setKatilanPersonelId] = useState("");

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    type: "found" | "not_found" | "error";
    message: string;
  } | null>(null);
  const [previousVisits, setPreviousVisits] = useState<Household[]>([]);
  const lastLookedUpTcRef = useRef("");

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    createHouseholdAction,
    initialState,
  );

  async function performTcLookup(targetTc: string) {
    const cleaned = targetTc.trim();
    if (!/^[0-9]{11}$/.test(cleaned)) {
      return;
    }

    lastLookedUpTcRef.current = cleaned;
    setIsLookingUp(true);
    setLookupStatus(null);

    const result = await lookupHouseholdByTcAction(cleaned);
    setIsLookingUp(false);

    if (result.error || !result.data) {
      setLookupStatus({
        type: "error",
        message: result.error ?? "TC Kimlik sorgulanırken bir hata oluştu.",
      });
      return;
    }

    const { found_in_registered, registered_household, previous_visits } =
      result.data;
    setPreviousVisits(previous_visits);

    if (found_in_registered && registered_household) {
      setAdSoyad(registered_household.ad_soyad || "");
      setDosyaNo(registered_household.dosya_no || "");
      setReferansNo(registered_household.referans_no || "");
      setTelefon(registered_household.telefon || "");
      setAdres(registered_household.adres || "");
      setLookupStatus({
        type: "found",
        message:
          "Vakıfta kayıtlı aktif hane bulundu. Hane bilgileri otomatik olarak dolduruldu.",
      });
    } else if (previous_visits.length > 0) {
      const latestVisit = previous_visits[0];
      setAdSoyad(latestVisit.ad_soyad || "");
      setDosyaNo(latestVisit.dosya_no || "");
      setReferansNo(latestVisit.referans_no || "");
      setTelefon(latestVisit.telefon || "");
      setAdres(latestVisit.adres || "");
      setLookupStatus({
        type: "found",
        message:
          "Daha önceki ziyaret kaydından hane bilgileri otomatik olarak getirildi.",
      });
    } else {
      setLookupStatus({
        type: "not_found",
        message:
          "Bu TC Kimlik No aktif hane listesinde bulunamadı. Hane bilgilerini aşağıdan elle girebilirsiniz.",
      });
    }
  }

  function handleTcChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 11);
    setTcNo(digitsOnly);

    if (digitsOnly.length < 11) {
      lastLookedUpTcRef.current = "";
      setLookupStatus(null);
      setPreviousVisits([]);
      return;
    }

    if (digitsOnly.length === 11 && lastLookedUpTcRef.current !== digitsOnly) {
      void performTcLookup(digitsOnly);
    }
  }

  useEffect(() => {
    const input = filesInputRef.current;
    if (!input) {
      return;
    }
    const dataTransfer = new DataTransfer();
    for (const file of selectedPhotos) {
      dataTransfer.items.add(file);
    }
    input.files = dataTransfer.files;
  }, [selectedPhotos, state]);

  function updateSelectedPhotos(nextPhotos: File[]) {
    const totalSize = nextPhotos.reduce((total, file) => total + file.size, 0);
    setSelectedPhotos(nextPhotos);
    setPhotoError(
      totalSize > MAX_TOTAL_PHOTO_SIZE
        ? "Fotoğrafların toplam boyutu en fazla 20 MB olabilir."
        : "",
    );
  }

  async function handleAddPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const addedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (addedFiles.length === 0) {
      return;
    }
    const optimized = await optimizeCameraOrGalleryPhotos(addedFiles);
    updateSelectedPhotos([...selectedPhotos, ...optimized]);
  }

  function handleRemovePhoto(indexToRemove: number) {
    updateSelectedPhotos(
      selectedPhotos.filter((_, index) => index !== indexToRemove),
    );
  }

  function handleClearPhotos() {
    updateSelectedPhotos([]);
  }

  function getLocation() {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationMessage("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setLocation(null);
    setLocationMessage("Konum alınıyor...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        });
        setLocationMessage("Konum alındı.");
      },
      (error) => {
        setLocation(null);
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
    <form action={formAction} className="space-y-3">
      <input
        type="hidden"
        name="household_id"
        value={state.householdId ?? ""}
        readOnly
      />
      <input
        type="hidden"
        name="uploaded_photo_count"
        value={state.uploadedPhotoCount ?? 0}
        readOnly
      />
      <input
        type="hidden"
        name="latitude"
        value={location?.latitude ?? ""}
        readOnly
      />
      <input
        type="hidden"
        name="longitude"
        value={location?.longitude ?? ""}
        readOnly
      />

      <fieldset
        disabled={Boolean(state.householdId)}
        className="space-y-5 disabled:opacity-70"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tc_no"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              TC Kimlik No <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="tc_no"
                name="tc_no"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                value={tcNo}
                onChange={(event) => handleTcChange(event.target.value)}
                placeholder="11 haneli kimlik numarası"
                required
                className={inputClassName}
              />
              <button
                type="button"
                onClick={() => void performTcLookup(tcNo)}
                disabled={tcNo.length !== 11 || isLookingUp}
                className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLookingUp ? "Sorgulanıyor..." : "Sorgula"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              11 hane girildiğinde kayıtlı 15.000+ hane ve geçmiş ziyaretler otomatik sorgulanır.
            </p>
          </div>

          <div>
            <label
              htmlFor="ad_soyad"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              id="ad_soyad"
              name="ad_soyad"
              type="text"
              maxLength={200}
              value={adSoyad}
              onChange={(event) => setAdSoyad(event.target.value)}
              placeholder="Hane başvuru sahibinin adı"
              required
              className={inputClassName}
            />
          </div>
        </div>

        {lookupStatus && (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm ${
              lookupStatus.type === "found"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : lookupStatus.type === "not_found"
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p className="font-medium">{lookupStatus.message}</p>
          </div>
        )}

        {previousVisits.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Daha Önce Yapılmış Hane Ziyareti Kayıtları
              </h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {previousVisits.length} ziyaret kaydı
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {previousVisits.map((visit) => (
                <li
                  key={visit.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-700">
                      Ziyaret Tarihi: {formatVisitDate(visit.created_at)}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        {visit.photos.length} fotoğraf
                      </span>
                      <Link
                        href={`/households/${visit.id}`}
                        target="_blank"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Ziyaret Detayını Gör →
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                    {visit.notlar
                      ? visit.notlar
                      : "Bu ziyarette not girilmemiş."}
                  </p>
                  {(visit.ziyareti_yapan_personel_adi ||
                    visit.katilan_personel_adi) && (
                    <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                      {[
                        visit.ziyareti_yapan_personel_adi
                          ? `Ziyareti Yapan: ${visit.ziyareti_yapan_personel_adi}`
                          : null,
                        visit.katilan_personel_adi
                          ? `Katılan: ${visit.katilan_personel_adi}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="dosya_no"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Dosya No
            </label>
            <input
              id="dosya_no"
              name="dosya_no"
              type="text"
              maxLength={100}
              value={dosyaNo}
              onChange={(event) => setDosyaNo(event.target.value)}
              placeholder="Dosya numarası"
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor="referans_no"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Referans No
            </label>
            <input
              id="referans_no"
              name="referans_no"
              type="text"
              maxLength={100}
              value={referansNo}
              onChange={(event) => setReferansNo(event.target.value)}
              placeholder="Referans numarası"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="telefon"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Telefon
          </label>
          <input
            id="telefon"
            name="telefon"
            type="tel"
            maxLength={20}
            value={telefon}
            onChange={(event) => setTelefon(event.target.value)}
            placeholder="05xx xxx xx xx"
            className={inputClassName}
          />
        </div>

        <div>
          <label
            htmlFor="adres"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Adres <span className="text-red-500">*</span>
          </label>
          <textarea
            id="adres"
            name="adres"
            value={adres}
            onChange={(event) => setAdres(event.target.value)}
            placeholder="Mahalle, sokak, bina ve daire bilgileri"
            required
            rows={3}
            className={`${inputClassName} min-h-28 resize-y`}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={getLocation}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-4"
              >
                <path
                  d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
              Konumumu Al
            </button>
            {location && (
              <button
                type="button"
                onClick={() => {
                  setLocation(null);
                  setLocationMessage("Konum temizlendi.");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Konumu Temizle
              </button>
            )}
          </div>
          {locationMessage && (
            <p
              role="status"
              className={`mt-2 text-sm ${
                location ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {locationMessage}
            </p>
          )}
          {location && (
            <div className="mt-3">
              <HouseholdMap
                latitude={location.latitude}
                longitude={location.longitude}
                title="Alınan GPS Konumu"
                compact
              />
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="notlar"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Notlar
          </label>
          <textarea
            id="notlar"
            name="notlar"
            value={notlar}
            onChange={(event) => setNotlar(event.target.value)}
            placeholder="Ziyaretle ilgili eklemek istedikleriniz"
            rows={3}
            className={`${inputClassName} min-h-28 resize-y`}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Ziyaret Görevlisi Personeller
            </span>
            <Link
              href="/personnel"
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              + Personel Ekle / Yönet
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ziyareti_yapan_personel"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Hane Ziyaretini Yapan Personel
              </label>
              <select
                id="ziyareti_yapan_personel"
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
                {personnelList.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.ad_soyad}
                    {person.unvan ? ` (${person.unvan})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="katilan_personel"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Hane Ziyaretine Katılan Personel{" "}
                <span className="font-normal text-slate-500">
                  (İsteğe bağlı)
                </span>
              </label>
              <select
                id="katilan_personel"
                name="katilan_personel"
                value={katilanPersonelId}
                onChange={(event) => setKatilanPersonelId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Yok (Tek personel)</option>
                {personnelList
                  .filter((person) => String(person.id) !== ziyaretiYapanId)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.ad_soyad}
                      {person.unvan ? ` (${person.unvan})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </fieldset>

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Fotoğraflar
        </span>
        <input
          ref={filesInputRef}
          id="photos"
          name="photos"
          type="file"
          multiple
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <input
          id="camera-photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAddPhotos}
          aria-describedby={
            photoError ? "photos-error" : "photos-description"
          }
          className="peer/camera sr-only"
        />
        <input
          id="gallery-photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handleAddPhotos}
          aria-describedby={
            photoError ? "photos-error" : "photos-description"
          }
          className="peer/gallery sr-only"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label
            htmlFor="camera-photo"
            className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-blue-200 bg-blue-50 p-4 transition hover:border-blue-400 hover:bg-blue-100 peer-focus-visible/camera:ring-4 peer-focus-visible/camera:ring-blue-500/15"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition group-hover:bg-blue-700">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
              >
                <path
                  d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-blue-700">
                Kameradan Çek
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Telefon kamerasını doğrudan açar
              </span>
            </span>
          </label>

          <label
            htmlFor="gallery-photos"
            className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-400 hover:bg-blue-50 peer-focus-visible/gallery:ring-4 peer-focus-visible/gallery:ring-blue-500/15"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition group-hover:bg-blue-200">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
              >
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800">
                Galeriden / Dosya Seç
              </span>
              <span
                id="photos-description"
                className="mt-0.5 block text-xs text-slate-500"
              >
                Birden fazla görsel · En fazla 20 MB
              </span>
            </span>
          </label>
        </div>

        {selectedPhotos.length > 0 && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                {selectedPhotos.length} fotoğraf eklendi ·{" "}
                {formatFileSize(
                  selectedPhotos.reduce((total, photo) => total + photo.size, 0),
                )}
              </p>
              <button
                type="button"
                onClick={handleClearPhotos}
                className="text-xs font-medium text-red-700 hover:underline"
              >
                Tümünü temizle
              </button>
            </div>
            <ul className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {selectedPhotos.map((photo, index) => (
                <li
                  key={`${photo.name}-${photo.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                    {index + 1}. {photo.name}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {formatFileSize(photo.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    aria-label={`${photo.name} fotoğrafını listeden çıkar`}
                    className="shrink-0 rounded-md px-2 py-1 font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {photoError && (
        <p id="photos-error" role="alert" className="text-sm text-red-700">
          {photoError}
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={isPending || Boolean(photoError)}
          className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-4 animate-spin"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity=".25"
                strokeWidth="3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
          {isPending
            ? "Kaydediliyor..."
            : state.householdId
              ? "Fotoğrafları Yeniden Dene"
              : "Kaydet"}
        </button>
      </div>
    </form>
  );
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatVisitDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}
