
import { Suspense } from "react";
import Link from "next/link";
import { getHouseholds, getPersonnelList } from "@/lib/api";
import HouseholdExplorer from "@/components/HouseholdExplorer";

async function HouseholdData() {
  const [households, personnelList] = await Promise.all([
    getHouseholds(),
    getPersonnelList(),
  ]);
  const initialMonth =
    households[0]?.created_at.slice(0, 7) ??
    new Date().toISOString().slice(0, 7);

  return (
    <HouseholdExplorer
      households={households}
      personnelList={personnelList}
      initialMonth={initialMonth}
    />
  );
}

function HouseholdExplorerSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Haneler yükleniyor">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="h-5 w-2/5 rounded bg-slate-100" />
          <div className="mt-6 h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-8 h-4 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              HANELER
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Hane Ziyaretleri
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kayıtlı haneleri ve ziyaret bilgilerini görüntüleyin.
            </p>
          </div>
          <Link
            href="/households/new"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:self-auto"
          >
            <PlusIcon className="size-4" />
            Yeni Hane ZiyaretiEkle
          </Link>
        </header>

        <Suspense fallback={<HouseholdExplorerSkeleton />}>
          <HouseholdData />
        </Suspense>
      </div>
    </main>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
