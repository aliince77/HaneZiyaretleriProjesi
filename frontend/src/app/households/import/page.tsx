import { Suspense } from "react";
import Link from "next/link";
import { getRegisteredHouseholdStats } from "@/lib/api";
import ExcelImportForm from "./ExcelImportForm";

async function ImportStatsContent() {
  const stats = await getRegisteredHouseholdStats();
  return (
    <ExcelImportForm
      initialTotalCount={stats.total_registered_households}
    />
  );
}

export default function HouseholdImportPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 transition hover:text-blue-700"
          >
            ← Hane ziyaret listesine dön
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Aktif Hane Listesi (Excel) Yükle
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vakıfta kayıtlı aktif haneleri Excel (.xlsx) dosyasından
              veritabanına aktarın.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <Suspense
              fallback={
                <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              }
            >
              <ImportStatsContent />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
