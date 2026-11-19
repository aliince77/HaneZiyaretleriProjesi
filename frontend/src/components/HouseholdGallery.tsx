"use client";

import Image from "next/image";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  autoClassifyPhotosAction,
  deleteHouseholdPhotoAction,
  updatePhotoTypeAction,
  uploadHouseholdPhotosAction,
  type HouseholdActionState,
  type PhotoUploadActionState,
} from "@/app/households/[id]/actions";
import type { HouseholdPhoto } from "@/lib/api";
import { optimizeCameraOrGalleryPhotos } from "@/lib/imageCompression";

function normalizePhotoUrl(url: string): string {
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/media/")) {
      return parsed.pathname;
    }
  } catch {
    // Already a relative path
  }
  return url;
}

const photoTypeLabels: Record<string, string> = {
  dis: "Dış Cephe",
  salon: "Salon",
  oturma_odasi: "Oturma Odası",
  mutfak: "Mutfak",
  oda: "Oda",
  banyo: "Banyo",
  diger: "Diğer",
};
const initialDeleteState: HouseholdActionState = {};
const initialUploadState: PhotoUploadActionState = { uploadedPhotoCount: 0 };

export default function HouseholdGallery({
  householdId,
  householdName,
  photos,
}: {
  householdId: number;
  householdName: string;
  photos: HouseholdPhoto[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [isClassifying, startClassifyTransition] = useTransition();
  const [isUpdatingType, startUpdateTypeTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeGallery = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        setGalleryError(
          error instanceof Error
            ? error.message
            : "Tam ekrandan çıkılamadı.",
        );
        return;
      }
    }

    setActiveIndex(null);
  }, []);

  useEffect(() => {
    function updateFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void closeGallery();
      } else if (event.key === "ArrowLeft" && photos.length > 1) {
        setActiveIndex((index) =>
          index === null ? null : (index - 1 + photos.length) % photos.length,
        );
      } else if (event.key === "ArrowRight" && photos.length > 1) {
        setActiveIndex((index) =>
          index === null ? null : (index + 1) % photos.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, closeGallery, photos.length]);

  async function toggleFullscreen() {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await panel.requestFullscreen();
      }
      setGalleryError("");
    } catch (error) {
      setGalleryError(
        error instanceof Error
          ? error.message
          : "Tam ekran görünümü açılamadı.",
      );
    }
  }

  function showPhoto(index: number) {
    setGalleryError("");
    setActiveIndex(index);
  }

  function changePhoto(offset: number) {
    setActiveIndex((index) =>
      index === null ? null : (index + offset + photos.length) % photos.length,
    );
  }

  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  return (
    <>
      <PhotoUploadForm key={photos.length} householdId={householdId} />

      {photos.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
          <PhotoIcon className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Henüz fotoğraf eklenmemiş
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-3">
            <p className="text-xs text-slate-700">
              Yeni yüklenen fotoğraflar yapay zeka ile otomatik etiketlenir.
              Etiketin üzerine tıklayarak elle de değiştirebilirsiniz.
            </p>
            <button
              type="button"
              disabled={isClassifying}
              onClick={() => {
                setAiStatusMessage("");
                startClassifyTransition(async () => {
                  const res = await autoClassifyPhotosAction(householdId);
                  if (res.error) {
                    setAiStatusMessage(res.error);
                  } else {
                    setAiStatusMessage(
                      `${res.totalChecked ?? 0} fotoğraf analiz edildi, ${res.updatedCount ?? 0} etiket güncellendi.`,
                    );
                  }
                });
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isClassifying
                ? "Yapay Zeka Analiz Ediyor..."
                : "Mevcut Fotoğrafları Yapay Zeka ile Etiketle"}
            </button>
          </div>

          {aiStatusMessage && (
            <p
              role="status"
              className="mt-2.5 text-xs font-medium text-blue-700"
            >
              {aiStatusMessage}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="group relative">
                <button
                  type="button"
                  onClick={() => showPhoto(index)}
                  aria-label={`${householdName}, ${index + 1}. fotoğrafı görüntüle`}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  <Image
                    src={normalizePhotoUrl(photo.photo)}
                    alt={`${householdName} - ${photoTypeLabels[photo.photo_type] ?? "Fotoğraf"}`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <span className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-lg bg-slate-950/50 text-white opacity-100 backdrop-blur transition sm:opacity-0 sm:group-hover:opacity-100">
                    <ExpandIcon className="size-4" />
                  </span>
                </button>
                <div className="absolute inset-x-2 bottom-2 z-10">
                  <select
                    aria-label={`${index + 1}. fotoğrafın oda/bölüm etiketi`}
                    value={photo.photo_type}
                    disabled={isUpdatingType}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      startUpdateTypeTransition(async () => {
                        await updatePhotoTypeAction(
                          householdId,
                          photo.id,
                          nextType,
                        );
                      });
                    }}
                    className="w-full cursor-pointer rounded-lg border border-white/25 bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {Object.entries(photoTypeLabels).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                        className="bg-slate-900 text-white"
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <DeletePhotoForm
                  householdId={householdId}
                  photoId={photo.id}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {activePhoto && activeIndex !== null && (
        <div
          className="gallery-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${householdName} fotoğraf galerisi`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              void closeGallery();
            }
          }}
        >
          <div
            ref={panelRef}
            className="gallery-panel flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {householdName}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {photoTypeLabels[activePhoto.photo_type] ?? "Fotoğraf"} ·{" "}
                  {activeIndex + 1} / {photos.length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? "Tam ekrandan çık" : "Tam ekran"
                  }
                  title={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
                  className="flex size-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ExpandIcon className="size-5" />
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => void closeGallery()}
                  aria-label="Galeri kapat, detaylara dön"
                  title="Detaylara dön"
                  className="flex size-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-3 sm:px-5">
              <Image
                src={normalizePhotoUrl(activePhoto.photo)}
                alt={`${householdName} - ${photoTypeLabels[activePhoto.photo_type] ?? "Fotoğraf"}`}
                fill
                priority
                unoptimized
                sizes="100vw"
                className="object-contain p-2 sm:p-4"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => changePhoto(-1)}
                    aria-label="Önceki fotoğraf"
                    className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-6"
                  >
                    <ChevronIcon className="size-5 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changePhoto(1)}
                    aria-label="Sonraki fotoğraf"
                    className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6"
                  >
                    <ChevronIcon className="size-5" />
                  </button>
                </>
              )}
            </div>

            {galleryError && (
              <p role="alert" className="px-5 pb-3 text-sm text-red-300">
                {galleryError}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const MAX_TOTAL_PHOTO_SIZE = 20 * 1024 * 1024;

function PhotoUploadForm({ householdId }: { householdId: number }) {
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    uploadHouseholdPhotosAction.bind(null, householdId),
    initialUploadState,
  );

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

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <input
        ref={filesInputRef}
        id="household-photos"
        type="file"
        name="photos"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <input
        id="detail-camera-photo"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleAddPhotos}
        className="peer/camera sr-only"
      />
      <input
        id="detail-gallery-photos"
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddPhotos}
        className="peer/gallery sr-only"
      />
      <input
        type="hidden"
        name="uploaded_photo_count"
        value={state.uploadedPhotoCount ?? 0}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-2.5 sm:grid-cols-2">
          <label
            htmlFor="detail-camera-photo"
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-blue-200 bg-white p-3 transition hover:border-blue-400 hover:bg-blue-50 peer-focus-visible/camera:ring-4 peer-focus-visible/camera:ring-blue-500/15"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition group-hover:bg-blue-700">
              <CameraIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-blue-700">
                Kameradan Çek
              </span>
              <span className="block text-xs text-slate-500">
                Doğrudan kamerayı aç
              </span>
            </span>
          </label>

          <label
            htmlFor="detail-gallery-photos"
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/60 peer-focus-visible/gallery:ring-4 peer-focus-visible/gallery:ring-blue-500/15"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition group-hover:bg-blue-100">
              <UploadIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                Galeriden Seç
              </span>
              <span className="block text-xs text-slate-500">
                En fazla 20 MB
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={
            isPending || selectedPhotos.length === 0 || Boolean(photoError)
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadIcon className="size-4" />
          {isPending ? "Yükleniyor..." : "Fotoğrafları Yükle"}
        </button>
      </div>

      {selectedPhotos.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              {selectedPhotos.length} fotoğraf seçildi ·{" "}
              {formatFileSize(
                selectedPhotos.reduce((total, photo) => total + photo.size, 0),
              )}
            </p>
            <button
              type="button"
              onClick={() => updateSelectedPhotos([])}
              className="text-xs font-medium text-red-700 hover:underline"
            >
              Temizle
            </button>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {selectedPhotos.map((photo, index) => (
              <li
                key={`${photo.name}-${photo.lastModified}-${index}`}
                className="flex items-center justify-between gap-3 py-1.5 text-xs"
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
                  className="shrink-0 rounded-md px-2 py-0.5 font-medium text-red-700 transition hover:bg-red-50"
                >
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {photoError && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {photoError}
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DeletePhotoForm({
  householdId,
  photoId,
}: {
  householdId: number;
  photoId: number;
}) {
  const [state, formAction, isPending] = useActionState(
    deleteHouseholdPhotoAction.bind(null, householdId, photoId),
    initialDeleteState,
  );

  return (
    <>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm("Bu fotoğrafı silmek istediğinizden emin misiniz?")) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={isPending}
          aria-label="Fotoğrafı sil"
          title="Fotoğrafı sil"
          className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-lg bg-red-600/90 text-white shadow-sm backdrop-blur transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <TrashIcon className="size-4" />
        </button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </>
  );
}

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
      <path
        d="m4 17 5-5 3 3 2-2 6 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
