"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let previousScrollY = window.scrollY;
    let animationFrame = 0;

    function handleScroll() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - previousScrollY;

        if (currentScrollY <= 12) {
          setIsHidden(false);
        } else if (scrollDelta >= 4) {
          setIsHidden(true);
        } else if (scrollDelta <= -4) {
          setIsHidden(false);
        }

        if (Math.abs(scrollDelta) >= 4 || currentScrollY <= 12) {
          previousScrollY = currentScrollY;
        }
        animationFrame = 0;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <nav
      onFocusCapture={() => setIsHidden(false)}
      className={`sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="SYDV Ziyaret Sistemi ana sayfası"
          className="inline-flex w-full items-center justify-center gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:w-auto sm:justify-start"
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

        <div className="mx-auto flex items-center gap-2 sm:mx-0">
          {process.env.NEXT_PUBLIC_SAHA_TEST === "true" && (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 sm:inline-flex">
              Saha Testi · Sentetik Veri
            </span>
          )}
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
