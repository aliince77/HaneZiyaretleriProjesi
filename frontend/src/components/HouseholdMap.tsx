"use client";

export default function HouseholdMap({
  latitude,
  longitude,
  title = "Hane Konumu",
  compact = false,
}: {
  latitude: string | number;
  longitude: string | number;
  title?: string;
  compact?: boolean;
}) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const delta = 0.0035;
  const minLng = (lng - delta).toFixed(6);
  const minLat = (lat - delta).toFixed(6);
  const maxLng = (lng + delta).toFixed(6);
  const maxLat = (lat + delta).toFixed(6);

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
  const googleMapsViewUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <MapPinIcon className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900">{title}</p>
            <p className="font-mono text-[11px] text-slate-500">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={googleMapsViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <MapPinIcon className="size-3.5 text-blue-600" />
            Google Haritalar&apos;da Aç
          </a>
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <NavigationIcon className="size-3.5" />
            Yol Tarifi Al
          </a>
        </div>
      </div>

      <div className={compact ? "h-48 w-full bg-slate-100" : "h-64 w-full bg-slate-100 sm:h-72"}>
        <iframe
          title={`${title} Haritası`}
          src={osmEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function NavigationIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="m3 11 18-8-8 18-2.5-7.5L3 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
