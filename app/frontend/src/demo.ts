/**
 * Round 5 (P0-2): demo hygiene.
 * - clearUiState(): every UI mode back to its default — shadow off, presenter off, "then next case" off, language HI,
 *   no remembered role / last case, and the offline simulation's state (all `ps_*` keys). The service-down switch
 *   lives in the URL (`?down=1`) and is cleared by navigating to "/".
 * - `?demo=reset` on any URL: POST /api/reset (policy back to default, decisions/audit cleared), clear the UI state,
 *   and drop the parameter — handy just before going on stage.
 * - A reset done elsewhere (e.g. `reset_demo.sh` → POST /api/reset) changes the backend's `reset_id`; the next page
 *   load sees the new id and clears the UI modes too.
 */
import { mock } from "./mock/mockServer";

const RESET_ID_KEY = "ps_reset_id";

export function clearUiState(keepResetId = true) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("ps_") && !(keepResetId && k === RESET_ID_KEY))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem("ps_lang", "hi");
  } catch {
    /* storage blocked: nothing to clear */
  }
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("ps_"))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  try {
    document.documentElement.classList.remove("shadow-mode");
  } catch {
    /* ignore */
  }
}

async function fetchJson(path: string, init?: RequestInit, ms = 1500): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(path, { ...init, signal: ctrl.signal });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("application/json")) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(tm);
  }
}

function rememberResetId(id: unknown) {
  if (typeof id !== "string" || !id) return false;
  try {
    const prev = localStorage.getItem(RESET_ID_KEY);
    if (prev !== id) {
      clearUiState();
      localStorage.setItem(RESET_ID_KEY, id);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Full demo reset (menu, `?demo=reset`): backend + offline simulation + every UI mode. */
export async function resetDemo(): Promise<void> {
  try {
    mock.reset();
  } catch {
    /* ignore */
  }
  await fetchJson("/api/reset", { method: "POST" }, 2500);
  clearUiState();
  const h = await fetchJson("/api/health");
  try {
    if (h && typeof h.reset_id === "string") localStorage.setItem(RESET_ID_KEY, h.reset_id);
  } catch {
    /* ignore */
  }
}

/** Runs before the first render, so every provider reads the cleaned state. */
export async function bootDemo(): Promise<void> {
  const url = new URL(window.location.href);
  if (url.searchParams.get("demo") === "reset") {
    await resetDemo();
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash);
    return;
  }
  const h = await fetchJson("/api/health");
  if (h) rememberResetId(h.reset_id);
}
