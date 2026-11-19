"use client";

import { useEffect } from "react";

export default function ThemeToggle() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("sydv-theme");
    document.documentElement.dataset.theme =
      savedTheme === "dark" ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const nextTheme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("sydv-theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Açık ve koyu görünüm arasında geçiş yap"
      title="Görünümü değiştir"
      className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
    >
      <ThemeIcon className="size-5" />
    </button>
  );
}

function ThemeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3a9 9 0 0 1 0 18V3Z"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </svg>
  );
}
