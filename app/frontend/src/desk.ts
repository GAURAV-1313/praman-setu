/**
 * Round 6 (P2): the SDO (Revenue) desk the officer is working, by sub-division. The demo officer is SDO Kondagaon;
 * the queue, the console list and the sign tray show only that sub-division's files. Stored per browser in
 * `ps_desk` (cleared by the demo reset with every other `ps_*` key).
 */
import { useSyncExternalStore } from "react";
import type { I18n } from "./api/types";

export const DESKS = ["Kondagaon", "Keskal"] as const;
export const DEFAULT_DESK = "Kondagaon";
export const DESK_LABEL: Record<string, I18n> = {
  Kondagaon: { en: "SDO Kondagaon", hi: "एसडीओ कोंडागांव" },
  Keskal: { en: "SDO Keskal", hi: "एसडीओ केशकाल" },
};

const listeners = new Set<() => void>();

export function getDesk(): string {
  try {
    const v = localStorage.getItem("ps_desk");
    return v && (DESKS as readonly string[]).includes(v) ? v : DEFAULT_DESK;
  } catch {
    return DEFAULT_DESK;
  }
}

export function setDesk(d: string) {
  try {
    if (d === DEFAULT_DESK) localStorage.removeItem("ps_desk");
    else localStorage.setItem("ps_desk", d);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useDesk(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getDesk,
  );
}
