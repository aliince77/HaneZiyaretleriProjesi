"use client";

import { useState } from "react";
import VisitReportModal, {
  exportVisitsToCsv,
} from "@/components/VisitReportModal";
import type { Household } from "@/lib/api";

export default function HouseholdSingleReportButton({
  household,
  allVisits,
}: {
  household: Household;
  allVisits: Household[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            exportVisitsToCsv(allVisits, `hane-raporu-${household.tc_no}`)
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Excel İndir (.xlsx)
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Bu Hanenin Ziyaretlerini Raporla ({allVisits.length})
        </button>
      </div>

      {isOpen && (
        <VisitReportModal
          visits={allVisits}
          summary={{
            title: `${household.ad_soyad} (${household.tc_no}) Hane Ziyaretleri Raporu`,
            dateInfo: "Haneye Ait Tüm Ziyaret Geçmişi",
            householdInfo: `${household.ad_soyad} (TC: ${household.tc_no})`,
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
