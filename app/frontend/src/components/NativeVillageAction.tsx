/**
 * Round 7: "मायके के गांव में खोजें · Search native village". Married women's family records sit in the parental
 * (maiden) village, while the application is from the husband's village. The officer names the native village; the
 * backend re-runs the lineage search with it (audited). Anything found still needs "same family / not this family".
 */
import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useI18n } from "../i18n";
import type { Analysis, Application, CaseBundle, Role, Village } from "../api/types";
import VillagePicker from "./VillagePicker";

/** Offered on a woman's pending standard-review file with no family record in play (or after a native search). */
export function nativeSearchOffered(app: Application, an: Analysis, status: string): boolean {
  if (app.gender !== "F" || status !== "pending") return false;
  if (an.native_village) return true;
  const live = an.lineage_matches.filter((m) => m.disposition?.decision !== "not");
  return an.lane === "standard_review" && live.length === 0 && (an.competence?.ok ?? true);
}

export default function NativeVillageAction({
  app,
  analysis,
  role,
  onBundle,
  compact,
}: {
  app: Application;
  analysis: Analysis;
  role: Role;
  onBundle: (b: CaseBundle) => void;
  compact?: boolean;
}) {
  const { t, tx } = useI18n();
  const nv = analysis.native_village;
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Village | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const officer = analysis.office?.en;

  async function run() {
    if (!v) return;
    if (v.village_lgd === app.village_lgd) {
      // the backend refuses it too; say so in the officer's language without a round trip
      setErr(tx("This is the applicant's current village — it is already searched. Name her father's (maiden) village.", "यह आवेदिका का वर्तमान गांव है — इसमें पहले ही खोजा जा चुका है। उनके पिता का (मायके का) गांव चुनें।"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const b = await api.searchNativeVillage(app.app_id, v.village_lgd, role, officer);
      onBundle(b);
      setOpen(false);
      setV(null);
      setText("");
    } catch (e) {
      setErr(
        e instanceof ApiError && e.status === 409
          ? tx("You already marked a record found in the earlier native-village search — undo that first.", "पिछली मायके-गांव खोज में मिले अभिलेख पर आप निर्णय दर्ज कर चुके हैं — पहले उसे पूर्ववत करें।")
          : e instanceof ApiError
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  }

  const foundHere = !!nv && nv.found_cert_nos.length > 0;
  return (
    <div className={`native-search ${compact ? "compact" : ""}`} id="native-search">
      {nv && !open && (
        <div className="small">
          <span className={`pill ${foundHere ? "blue" : "slate"}`} style={{ whiteSpace: "normal" }}>⌂ {t(nv.note)}</span>{" "}
          {!foundHere && (
            <button type="button" className="linkish" onClick={() => setOpen(true)}>
              {tx("Search another village", "दूसरा गांव खोजें")}
            </button>
          )}
        </div>
      )}
      {!nv && !open && (
        <button type="button" className="btn soft sm" id="native-search-open" onClick={() => setOpen(true)}>
          ⌂ {tx("Search native village", "मायके के गांव में खोजें")}
        </button>
      )}
      {open && (
        <div className="native-form">
          <label htmlFor={`nv-${compact ? "c" : "o"}`} className="small">
            <b>{tx("Native / maiden village (father's village)", "मायके / मूल गांव (पिता का गांव)")}</b>{" "}
            <span className="muted">{tx("— as stated by the applicant (affidavit / ration card / school record)", "— आवेदिका के कथन अनुसार (शपथ पत्र / राशन कार्ड / स्कूल अभिलेख)")}</span>
          </label>
          <div className="row" style={{ gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <VillagePicker
                id={`nv-${compact ? "c" : "o"}`}
                value={v}
                text={text}
                autoFocus
                onChange={(nv2, tx2) => {
                  setV(nv2);
                  setText(tx2);
                  setErr(null);
                }}
                placeholder={tx("Village name — any district", "गांव का नाम — किसी भी जिले का")}
              />
            </div>
            <button type="button" className="btn blue sm" id="native-search-run" disabled={!v || busy} onClick={run}>
              {busy ? <span className="spinner" /> : "🔍"} {tx("Search", "खोजें")}
            </button>
            <button type="button" className="btn secondary sm" onClick={() => (setOpen(false), setErr(null))}>
              {tx("Cancel", "रद्द करें")}
            </button>
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            🔒 {tx("The search is logged in the audit trail. Any record found still needs your “same family / not this family”.", "यह खोज ऑडिट ट्रेल में दर्ज होती है। मिले किसी भी अभिलेख पर “वही परिवार / यह परिवार नहीं” आपको ही तय करना है।")}
          </div>
          {err && <div className="small" style={{ color: "var(--amber)", marginTop: 4 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
