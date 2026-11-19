import { Suspense } from "react";
import Link from "next/link";
import { getPersonnelList } from "@/lib/api";
import PersonnelManager from "./PersonnelManager";

async function PersonnelListContent() {
  const personnelList = await getPersonnelList();
  return <PersonnelManager personnelList={personnelList} />;
}

export default function PersonnelPage() {
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
              Personel Yönetimi
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hane ziyaretlerini yapan ve ziyarete katılan vakıf personellerini
              buradan ekleyip yönetebilirsiniz.
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <Suspense
              fallback={
                <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
              }
            >
              <PersonnelListContent />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
