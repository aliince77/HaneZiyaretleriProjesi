import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import HouseholdGallery from "@/components/HouseholdGallery";
import HouseholdEditor from "@/components/HouseholdEditor";
import HouseholdSingleReportButton from "@/components/HouseholdSingleReportButton";
import {
  getHousehold,
  getPersonnelList,
  lookupHouseholdByTc,
  type Household,
} from "@/lib/api";

export default function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<HouseholdDetailSkeleton />}>
      <HouseholdDetail params={params} />
    </Suspense>
  );
}

async function HouseholdDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  if (!/^[1-9]\d*$/.test(idParam)) {
    notFound();
  }

  const [household, personnelList] = await Promise.all([
    getHousehold(Number(idParam)),
    getPersonnelList(),
  ]);
  if (!household) {
    notFound();
  }

  let otherVisits: Household[] = [];
  let allVisitsForHousehold: Household[] = [household];
  if (/^[0-9]{11}$/.test(household.tc_no)) {
    try {
      const lookup = await lookupHouseholdByTc(household.tc_no);
      if (lookup.previous_visits.length > 0) {
        allVisitsForHousehold = lookup.previous_visits;
      }
      otherVisits = lookup.previous_visits.filter(
        (visit) => visit.id !== household.id,
      );
    } catch {
      otherVisits = [];
    }
  }

  return (
    <main className="flex-1 bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
        >
          <ArrowLeftIcon className="size-4" />
          Hane listesine dön
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
                {getInitials(household.ad_soyad)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Hane #{household.id}
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900">
                  {household.ad_soyad}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Kayıt tarihi: {formatDate(household.created_at)}
                </p>
              </div>
            </div>
            <HouseholdSingleReportButton
              household={household}
              allVisits={allVisitsForHousehold}
            />
          </header>

        </section>

        <div className="mt-6">
          <HouseholdEditor
            household={household}
            personnelList={personnelList}
          />
        </div>

        {otherVisits.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Bu Hanenin Diğer Ziyaret Kayıtları
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Aynı TC Kimlik No ile daha önce veya farklı tarihlerde yapılmış ziyaretler.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {otherVisits.length} diğer ziyaret
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {otherVisits.map((visit) => (
                <li
                  key={visit.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Ziyaret #{visit.id} · {formatDate(visit.created_at)}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        {visit.photos.length} fotoğraf
                      </span>
                      <Link
                        href={`/households/${visit.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Bu Ziyareti Aç →
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {visit.notlar || "Bu ziyarette not girilmemiş."}
                  </p>
                  {(visit.ziyareti_yapan_personel_adi ||
                    visit.katilan_personel_adi) && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
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
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Fotoğraflar
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fotoğrafa tıklayarak galeride büyük görüntüleyin.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {household.photos.length} fotoğraf
            </span>
          </div>
          <div className="mt-5">
            <HouseholdGallery
              householdId={household.id}
              householdName={household.ad_soyad}
              photos={household.photos}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function HouseholdDetailSkeleton() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-5 h-44 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="mt-6 h-64 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    </main>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("tr-TR") || "H"
  );
}

function formatDate(value: string) {
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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="m15 18-6-6 6-6M9 12h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
