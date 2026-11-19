"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import VisitReportModal, {
  exportVisitsToCsv,
  type ReportFilterSummary,
} from "@/components/VisitReportModal";
import type { Household, Personnel } from "@/lib/api";

type ViewMode = "cards" | "rows";

const weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function HouseholdExplorer({
  households,
  personnelList = [],
  initialMonth,
}: {
  households: Household[];
  personnelList?: Personnel[];
  initialMonth: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = initialMonth.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const recordsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const household of households) {
      const key = getDateKey(household.created_at);
      if (key) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [households]);

  const visitCountByTc = useMemo(() => {
    const counts = new Map<string, number>();
    for (const household of households) {
      counts.set(household.tc_no, (counts.get(household.tc_no) ?? 0) + 1);
    }
    return counts;
  }, [households]);

  const filteredHouseholds = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
    const addrQuery = addressFilter.trim().toLocaleLowerCase("tr-TR");
    const personId = selectedPersonnelId ? Number(selectedPersonnelId) : null;

    return households.filter((household) => {
      if (query) {
        const matchesQuery =
          household.ad_soyad.toLocaleLowerCase("tr-TR").includes(query) ||
          household.tc_no.includes(query) ||
          (household.dosya_no || "").toLocaleLowerCase("tr-TR").includes(query) ||
          (household.referans_no || "").toLocaleLowerCase("tr-TR").includes(query);
        if (!matchesQuery) {
          return false;
        }
      }

      if (addrQuery) {
        if (!household.adres.toLocaleLowerCase("tr-TR").includes(addrQuery)) {
          return false;
        }
      }

      if (personId !== null) {
        if (
          household.ziyareti_yapan_personel !== personId &&
          household.katilan_personel !== personId
        ) {
          return false;
        }
      }

      const recordDate = getDateKey(household.created_at);
      if (selectedDate) {
        if (recordDate !== selectedDate) {
          return false;
        }
      } else {
        if (startDate && recordDate < startDate) {
          return false;
        }
        if (endDate && recordDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    households,
    searchTerm,
    addressFilter,
    selectedPersonnelId,
    selectedDate,
    startDate,
    endDate,
  ]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      selectedDate ||
      startDate ||
      endDate ||
      selectedPersonnelId ||
      addressFilter.trim(),
  );

  const reportSummary = useMemo<ReportFilterSummary>(() => {
    let title = "Hane Ziyareti Genel Raporu";
    let dateInfo = "Tüm Tarihler";

    if (selectedDate) {
      title = `${formatDateKey(selectedDate)} Tarihli Hane Ziyaretleri Raporu`;
      dateInfo = formatDateKey(selectedDate);
    } else if (startDate || endDate) {
      const fromText = startDate ? formatDateKey(startDate) : "Başlangıç";
      const toText = endDate ? formatDateKey(endDate) : "Bugün";
      title = "İki Tarih Arası Hane Ziyaretleri Raporu";
      dateInfo = `${fromText} – ${toText}`;
    }

    let householdInfo: string | undefined;
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      const matched = filteredHouseholds[0];
      if (
        /^[0-9]{11}$/.test(trimmedSearch) &&
        matched &&
        matched.tc_no === trimmedSearch
      ) {
        title = `${matched.ad_soyad} (${matched.tc_no}) Hane Ziyaretleri Raporu`;
        householdInfo = `${matched.ad_soyad} (${matched.tc_no})`;
      } else {
        householdInfo = trimmedSearch;
      }
    }

    let personnelInfo: string | undefined;
    if (selectedPersonnelId) {
      const p = personnelList.find(
        (person) => String(person.id) === selectedPersonnelId,
      );
      if (p) {
        personnelInfo = p.ad_soyad;
      }
    }

    return {
      title,
      dateInfo,
      householdInfo,
      personnelInfo,
      addressInfo: addressFilter.trim() || undefined,
    };
  }, [
    selectedDate,
    startDate,
    endDate,
    searchTerm,
    selectedPersonnelId,
    addressFilter,
    filteredHouseholds,
    personnelList,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredHouseholds.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const visibleHouseholds = filteredHouseholds.slice(
    pageStart,
    pageStart + pageSize,
  );
  const firstVisibleRecord =
    filteredHouseholds.length === 0 ? 0 : pageStart + 1;
  const lastVisibleRecord = Math.min(
    pageStart + pageSize,
    filteredHouseholds.length,
  );
  const calendarCells = getCalendarCells(visibleMonth);
  const monthTitle = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 15));

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    if (value.trim()) {
      setSelectedDate(null);
    }
    setCurrentPage(1);
  }

  function handleDateSelect(dateKey: string) {
    setSelectedDate((currentDate) =>
      currentDate === dateKey ? null : dateKey,
    );
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value) {
      setSelectedDate(null);
    }
    setCurrentPage(1);
  }

  function handleEndDateChange(value: string) {
    setEndDate(value);
    if (value) {
      setSelectedDate(null);
    }
    setCurrentPage(1);
  }

  function handleReportSingleHousehold(tcNo: string) {
    setSearchTerm(tcNo);
    setSelectedDate(null);
    setStartDate("");
    setEndDate("");
    setSelectedPersonnelId("");
    setAddressFilter("");
    setCurrentPage(1);
    setIsReportOpen(true);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedDate(null);
    setStartDate("");
    setEndDate("");
    setSelectedPersonnelId("");
    setAddressFilter("");
    setCurrentPage(1);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Takvim</h2>
            <p className="mt-1 text-xs text-slate-500">
              Günlere göre kayıtları görüntüleyin
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (month) =>
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              aria-label="Önceki ay"
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              <ChevronIcon className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (month) =>
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              aria-label="Sonraki ay"
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              <ChevronIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold capitalize text-slate-800">
            {monthTitle}
          </h3>
          <button
            type="button"
            onClick={() => {
              const today = getTodayDateKey();
              setVisibleMonth(getMonthFromKey(today));
              setSelectedDate(today);
              setSearchTerm("");
              setCurrentPage(1);
            }}
            className="text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            Bugün
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center">
          {weekdays.map((weekday) => (
            <span
              key={weekday}
              className="py-2 text-[11px] font-medium text-slate-400"
            >
              {weekday}
            </span>
          ))}
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <span key={`empty-${index}`} aria-hidden="true" />;
            }

            const dateKey = getCalendarDateKey(visibleMonth, day);
            const recordCount = recordsByDate.get(dateKey) ?? 0;
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDateSelect(dateKey)}
                aria-label={`${formatDateKey(dateKey)}${
                  recordCount > 0 ? `, ${recordCount} kayıt` : ""
                }`}
                aria-pressed={isSelected}
                title={
                  recordCount > 0
                    ? `${recordCount} hane kaydı`
                    : "Bu tarihte kayıt yok"
                }
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 ${
                  isSelected
                    ? "bg-blue-600 font-semibold text-white shadow-sm"
                    : recordCount > 0
                      ? "bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100"
                      : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{day}</span>
                {recordCount > 0 && (
                  <span
                    className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-blue-500"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="size-2 rounded-full bg-blue-500" aria-hidden="true" />
          Kayıt bulunan günler işaretlidir
        </div>

        {selectedDate && (
          <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-blue-700">
                {formatDateKey(selectedDate)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Temizle
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-blue-700">
                {recordsByDate.get(selectedDate) ?? 0} kayıt
              </p>
              {filteredHouseholds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Bu Günü Raporla
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              İki Tarih Arası Raporla
            </h3>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Sıfırla
              </button>
            )}
          </div>
          <div className="mt-2.5 space-y-2.5">
            <div>
              <label
                htmlFor="filter-start-date"
                className="mb-1 block text-xs text-slate-500"
              >
                Başlangıç Tarihi
              </label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="filter-end-date"
                className="mb-1 block text-xs text-slate-500"
              >
                Bitiş Tarihi
              </label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </aside>

      <section aria-label="Hane kayıtları" className="min-w-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">
                TC Kimlik No, ad soyad veya dosya no ile ara
              </span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="TC Kimlik No, ad soyad veya dosya no ile ara"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <div
              className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Görünüm biçimi"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "cards"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GridIcon className="size-4" />
                Kart
              </button>
              <button
                type="button"
                onClick={() => setViewMode("rows")}
                aria-pressed={viewMode === "rows"}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "rows"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ListIcon className="size-4" />
                Satır
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="filter-personnel"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Görevli Personele Göre Filtrele
              </label>
              <select
                id="filter-personnel"
                value={selectedPersonnelId}
                onChange={(event) => {
                  setSelectedPersonnelId(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Tüm Personeller</option>
                {personnelList.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.ad_soyad}
                    {person.unvan ? ` (${person.unvan})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-address"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Mahalle / Köy / Adres Filtrele
              </label>
              <input
                id="filter-address"
                type="search"
                value={addressFilter}
                onChange={(event) => {
                  setAddressFilter(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Örn: Cumhuriyet, Köy, Sokak..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <p>
              {selectedDate
                ? `Seçilen tarih: ${formatDateKey(selectedDate)}`
                : startDate || endDate
                  ? `Tarih aralığı: ${startDate ? formatDateKey(startDate) : "Başlangıç"} – ${endDate ? formatDateKey(endDate) : "Bugün"}`
                  : searchTerm.trim()
                    ? `Arama: "${searchTerm.trim()}" (tüm geçmiş ziyaretler)`
                    : "Tüm tarihlerdeki kayıtlar"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-blue-700 hover:underline"
              >
                Tüm filtreleri temizle
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">
            {filteredHouseholds.length} ziyaret kaydı bulundu
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {filteredHouseholds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => exportVisitsToCsv(filteredHouseholds)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Excel İndir (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Raporla / Yazdır (PDF)
                </button>
              </>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sayfa başına
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>

        {visibleHouseholds.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-medium text-slate-800">
              {households.length === 0
                ? "Henüz hane kaydı yok."
                : "Bu filtrelerle eşleşen kayıt bulunamadı."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          <div className="mt-3 grid gap-3">
            {visibleHouseholds.map((household) => (
              <HouseholdCard
                key={household.id}
                household={household}
                totalVisitsForTc={visitCountByTc.get(household.tc_no) ?? 1}
                onReportHousehold={handleReportSingleHousehold}
              />
            ))}
          </div>
        ) : (
          <HouseholdRows
            households={visibleHouseholds}
            onReportHousehold={handleReportSingleHousehold}
          />
        )}

        {filteredHouseholds.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {firstVisibleRecord}–{lastVisibleRecord} /{" "}
              {filteredHouseholds.length} kayıt
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => page - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="min-w-20 text-center text-sm text-slate-600">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => page + 1)}
                disabled={currentPage >= pageCount}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </section>

      {isReportOpen && (
        <VisitReportModal
          visits={filteredHouseholds}
          summary={reportSummary}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}

function HouseholdCard({
  household,
  totalVisitsForTc,
  onReportHousehold,
}: {
  household: Household;
  totalVisitsForTc: number;
  onReportHousehold: (tcNo: string) => void;
}) {
  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <Link
        href={`/households/${household.id}`}
        aria-label={`${household.ad_soyad} ziyaret detaylarını görüntüle`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/40"
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
          {getInitials(household.ad_soyad)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="break-words font-semibold text-slate-900">
              {household.ad_soyad}
            </h3>
            <span className="text-xs text-slate-400">
              {formatDate(household.created_at)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p>
              <span className="text-slate-500">TC Kimlik No: </span>
              <span className="font-mono text-slate-800">{household.tc_no}</span>
            </p>
            {household.telefon && (
              <p>
                <span className="text-slate-500">Telefon: </span>
                <span className="text-slate-800">{household.telefon}</span>
              </p>
            )}
          </div>
          <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-600">
            {household.adres}
          </p>
          {household.notlar && (
            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-500">
              {household.notlar}
            </p>
          )}
          {(household.ziyareti_yapan_personel_adi ||
            household.katilan_personel_adi) && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
              {household.ziyareti_yapan_personel_adi && (
                <span>
                  <span className="text-slate-500">Ziyareti Yapan: </span>
                  <span className="font-semibold text-slate-800">
                    {household.ziyareti_yapan_personel_adi}
                  </span>
                </span>
              )}
              {household.katilan_personel_adi && (
                <span>
                  <span className="text-slate-500">Katılan: </span>
                  <span className="font-semibold text-slate-800">
                    {household.katilan_personel_adi}
                  </span>
                </span>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <PhotoIcon className="size-4 shrink-0 text-blue-600" />
              {household.photos.length > 0
                ? `${household.photos.length} fotoğraf yüklendi`
                : "Henüz fotoğraf yüklenmedi"}
            </p>
            {household.latitude !== null && household.longitude !== null && (
              <a
                href={`https://www.google.com/maps?q=${household.latitude},${household.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
              >
                <MapPinIcon className="size-3.5 shrink-0" />
                Haritada Gör
              </a>
            )}
            <button
              type="button"
              onClick={() => onReportHousehold(household.tc_no)}
              className="pointer-events-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
            >
              Bu Hanenin Ziyaretlerini Raporla ({totalVisitsForTc})
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function HouseholdRows({
  households,
  onReportHousehold,
}: {
  households: Household[];
  onReportHousehold: (tcNo: string) => void;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_auto] border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
        <span>Ad Soyad</span>
        <span>TC Kimlik No</span>
        <span>İşlem</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {households.map((household) => (
          <li
            key={household.id}
            className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-4 py-3.5 text-sm transition hover:bg-blue-50/60 sm:px-6"
          >
            <Link
              href={`/households/${household.id}`}
              className="break-words font-medium text-slate-800 hover:text-blue-700"
            >
              {household.ad_soyad}
            </Link>
            <span className="break-all font-mono text-slate-600">
              {household.tc_no}
            </span>
            <button
              type="button"
              onClick={() => onReportHousehold(household.tc_no)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Hane Raporu
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getCalendarCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getCalendarDateKey(month: Date, day: number) {
  const year = month.getFullYear();
  const monthNumber = String(month.getMonth() + 1).padStart(2, "0");
  const dayNumber = String(day).padStart(2, "0");
  return `${year}-${monthNumber}-${dayNumber}`;
}

function getDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = dateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getMonthFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getTodayDateKey() {
  return getDateKey(new Date().toISOString());
}

function formatDateKey(key: string) {
  const date = new Date(`${key}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="10.8"
        cy="10.8"
        r="6.8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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
