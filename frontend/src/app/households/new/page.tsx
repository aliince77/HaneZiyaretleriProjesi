import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPersonnelList } from "@/lib/api";
import HouseholdForm from "./HouseholdForm";

async function NewHouseholdFormSection() {
  const personnelList = await getPersonnelList();
  const activePersonnel = personnelList.filter((person) => person.aktif);
  return <HouseholdForm personnelList={activePersonnel} />;
}

export default function NewHouseholdPage() {
  return (
    <main className="flex-1 bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <p className="mt-2 text-sm text-slate-500">
            Hane bilgilerini ve ziyaret detaylarını kaydedin.
          </p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                aria-label="Ana sayfaya dön"
                title="Ana sayfaya dön"
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 p-1.5 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
              >
                <Image
                  src="/sydv-logo.png"
                  alt="Menteşe SYDV Logosu"
                  width={40}
                  height={40}
                  className="size-10 object-contain"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Yeni Hane
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Yıldızlı alanların doldurulması zorunludur.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <Suspense
              fallback={
                <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
              }
            >
              <NewHouseholdFormSection />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
