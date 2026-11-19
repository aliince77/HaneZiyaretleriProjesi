import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="SYDV Ziyaret Sistemi ana sayfası"
          className="inline-flex items-center gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
        >
          <Image
            src="/sydv-logo.png"
            alt="Menteşe Sosyal Yardımlaşma ve Dayanışma Vakfı Logosu"
            width={64}
            height={64}
            priority
            className="size-14 shrink-0 object-contain sm:size-16"
          />
          <span className="flex flex-col items-center text-center leading-tight">
            <span className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
              MENTEŞE SOSYAL
            </span>
            <span className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
              YARDIMLAŞMA VE DAYANIŞMA
            </span>
            <span className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
              VAKFI BAŞKANLIĞI
            </span>
            <span className="mt-1 text-[11px] font-normal tracking-wide text-slate-700 sm:text-xs">
              HANE ZİYARETİ BİLGİ SİSTEMİ
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/personnel"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:text-sm"
          >
            Personeller
          </Link>
          <Link
            href="/households/import"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:text-sm"
          >
            Excel Hane Yükle
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
