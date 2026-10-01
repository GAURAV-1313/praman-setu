/**
 * Citizen portal (MOCK) — the Sewa Setu online application for a permanent caste certificate, redrawn from the CHiPS
 * user manual "अनुसूचित जाति/अनुसूचित जनजाति प्रमाण पत्र हेतु … ऑनलाइन आवेदन" (Jan 2026; figs. 9–20): service page →
 * Aadhaar e-authentication → application form → अनुलग्नक का विवरण (uploads) → पूर्वावलोकन → शुल्क → पावती.
 *
 * Praman Setu adds ONE thing inside it: the "परिवार प्रमाण सहायक" (Family Proof Helper), placed in the form right
 * before the "10 अगस्त 1950 से पहले का स्थाई पता" block — where people without old papers get stuck today:
 *   - a masked archive search for the family's certificate (the citizen sees only "No. ••••4512 · SDO … · 2019");
 *     a hit becomes an "अभिलेखागार से सत्यापित" attachment, so no scan of an old paper is needed;
 *   - "मेरे पास कोई कागज़ नहीं" — submit anyway with a generated unavailability declaration + family tree; the SDO
 *     gets a Rule 7 inquiry request instead of the case never arriving.
 * The officer still confirms the relationship. No match is never a rejection. Citizen data is synthetic.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Monogram from "../components/Monogram";
import VillagePicker from "../components/VillagePicker";
import WhatsAppPreview from "../components/WhatsAppPreview";
import { api, ApiError, useApiMode } from "../api/client";
import type { CitizenPrecheckResponse, CitizenSubmitResponse, Village } from "../api/types";
import { useI18n } from "../i18n";
import { fmtDate } from "../components/common";
import "./citizen.css";

type Svc = "caste_sc" | "caste_st" | "caste_obc";
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Path = "found" | "document" | "no_papers" | null;

const CASTES: { hi: string; en: string; svc: Svc; sr: number }[] = [
  { hi: "गोंड", en: "Gond", svc: "caste_st", sr: 16 },
  { hi: "मुरिया", en: "Muria", svc: "caste_st", sr: 16 },
  { hi: "हल्बा", en: "Halba", svc: "caste_st", sr: 18 },
  { hi: "भतरा", en: "Bhatra", svc: "caste_st", sr: 5 },
  { hi: "गांडा", en: "Ganda", svc: "caste_sc", sr: 15 },
  { hi: "सतनामी", en: "Satnami", svc: "caste_sc", sr: 14 },
  { hi: "महार", en: "Mahar", svc: "caste_sc", sr: 33 },
  { hi: "यादव", en: "Yadav", svc: "caste_obc", sr: 1 },
  { hi: "साहू", en: "Sahu", svc: "caste_obc", sr: 46 },
  { hi: "मरार", en: "Marar", svc: "caste_obc", sr: 36 },
];
const CATEGORY: Record<Svc, [string, string]> = {
  caste_sc: ["Scheduled Caste", "अनुसूचित जाति"],
  caste_st: ["Scheduled Tribe", "अनुसूचित जनजाति"],
  caste_obc: ["Other Backward Class", "अन्य पिछड़ा वर्ग"],
};
const CUTOFF: Record<Svc, [string, string]> = {
  caste_sc: ["10 August 1950", "10 अगस्त 1950"],
  caste_st: ["6 September 1950", "06 सितम्बर 1950"],
  caste_obc: ["26 December 1984", "26 दिसंबर 1984"],
};
const REL = [
  ["father", "Father", "पिता"],
  ["brother", "Brother", "भाई"],
  ["sister", "Sister", "बहन"],
  ["grandfather", "Grandfather", "दादा"],
  ["uncle", "Paternal uncle", "चाचा"],
] as const;

interface Form {
  nameHi: string;
  nameEn: string;
  mobile: string;
  village: Village | null;
  villageText: string;
  address: string;
  aadhaar: string;
  aadhaarName: string;
  /** the real form asks for the guardian (father / husband / other); the family search always needs the FATHER */
  guardianType: "father" | "husband" | "guardian";
  guardianHi: string;
  guardianEn: string;
  fatherName: string;
  motherHi: string;
  gender: "F" | "M";
  married: boolean;
  birthYear: string;
  caste: string;
  purpose: string;
}
const EMPTY: Form = { nameHi: "", nameEn: "", mobile: "", village: null, villageText: "", address: "", aadhaar: "", aadhaarName: "", guardianType: "father", guardianHi: "", guardianEn: "", fatherName: "", motherHi: "", gender: "F", married: false, birthYear: "", caste: "", purpose: "" };
interface VRow {
  relation: string;
  name: string;
  village: string;
  place: string;
}
const VROWS: VRow[] = [
  { relation: "पिता", name: "", village: "", place: "" },
  { relation: "दादा", name: "", village: "", place: "" },
  { relation: "परदादा", name: "", village: "", place: "" },
];
const VREL_EN: Record<string, string> = { पिता: "Father", दादा: "Grandfather", परदादा: "Great-grandfather" };
const THIS_YEAR = new Date().getFullYear();
const newSession = () => `nagrik-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
/** Draft kept for this browser tab only (sessionStorage), so a refresh or the phone's Back button does not throw away a
 *  half-filled form. Only the last 4 Aadhaar digits are kept. Cleared by "Start again" / a new application / demo reset. */
const DRAFT_KEY = "ps_nagrik_draft"; // ps_ prefix: cleared by the demo reset (demo.ts clearUiState)
interface Draft {
  step: Step; session: string; svcGroup: "scst" | "obc"; f: Form; aadhaarOk: boolean; relation: string; certNo: string;
  native: Village | null; nativeText: string; consent: boolean; res: CitizenPrecheckResponse | null; resKey: string;
  path: Path; vrows: VRow[]; declOk: boolean; declText: string; uploads: string[]; finalDecl: boolean; receipt: CitizenSubmitResponse | null;
}
function loadDraft(): Partial<Draft> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Draft>;
  } catch {
    return {};
  }
}

export default function CitizenPortal() {
  const { tx, t, lang, setLang } = useI18n();
  const mode = useApiMode();
  const [d0] = useState(loadDraft);
  const [step, setStep] = useState<Step>(d0.step ?? 0);
  const [session, setSession] = useState(d0.session ?? newSession());
  const [svcGroup, setSvcGroup] = useState<"scst" | "obc">(d0.svcGroup ?? "scst");
  const [f, setF] = useState<Form>({ ...EMPTY, ...d0.f });
  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [aadhaarOk, setAadhaarOk] = useState(d0.aadhaarOk ?? false);
  // Family Proof Helper
  const [relation, setRelation] = useState<string>(d0.relation ?? "father");
  const [certNo, setCertNo] = useState(d0.certNo ?? "");
  const [native, setNative] = useState<Village | null>(d0.native ?? null);
  const [nativeText, setNativeText] = useState(d0.nativeText ?? "");
  const [consent, setConsent] = useState(d0.consent ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<CitizenPrecheckResponse | null>(d0.res ?? null);
  const [resKey, setResKey] = useState(d0.resKey ?? "");
  const [path, setPath] = useState<Path>(d0.path ?? null);
  const [vrows, setVrows] = useState<VRow[]>(d0.vrows ?? VROWS);
  const [declOk, setDeclOk] = useState(d0.declOk ?? false);
  const [declText, setDeclText] = useState(d0.declText ?? "");
  // uploads (mock) + submit
  const [uploads, setUploads] = useState<Set<string>>(new Set(d0.uploads ?? []));
  const [saved, setSaved] = useState(false);
  const [finalDecl, setFinalDecl] = useState(d0.finalDecl ?? false);
  const [receipt, setReceipt] = useState<CitizenSubmitResponse | null>(d0.receipt ?? null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [timer, setTimer] = useState(15 * 60);
  const demoMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 15 * 60)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  // the phone's / browser's Back button moves one step back inside the form instead of leaving the portal
  const fromPop = useRef(false);
  useEffect(() => {
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    const st = (window.history.state ?? {}) as { czStep?: number };
    if (st.czStep === step) return;
    if (st.czStep === undefined) window.history.replaceState({ ...st, czStep: step }, "");
    else window.history.pushState({ ...st, czStep: step }, "");
  }, [step]);
  useEffect(() => {
    const h = (e: PopStateEvent) => {
      const s = (e.state as { czStep?: number } | null)?.czStep;
      if (typeof s === "number") {
        fromPop.current = true;
        setStep(s as Step);
      }
    };
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);
  useEffect(() => {
    const d: Draft = { step, session, svcGroup, f: { ...f, aadhaar: f.aadhaar ? "XXXXXXXX" + f.aadhaar.slice(-4) : "" }, aadhaarOk, relation, certNo, native, nativeText, consent, res, resKey, path, vrows, declOk, declText, uploads: [...uploads], finalDecl, receipt };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage blocked: the form still works, it just does not survive a refresh */
    }
  }, [step, session, svcGroup, f, aadhaarOk, relation, certNo, native, nativeText, consent, res, resKey, path, vrows, declOk, declText, uploads, finalDecl, receipt]);

  const casteRow = CASTES.find((c) => c.hi === f.caste) ?? null;
  const svc: Svc = svcGroup === "obc" ? "caste_obc" : casteRow?.svc === "caste_sc" ? "caste_sc" : "caste_st";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  // a search answers for the father's name / village / service it was made with; if the citizen changes them, search again
  const fatherForSearch = (f.guardianType === "father" ? f.guardianHi || f.guardianEn : f.fatherName).trim();
  const searchKey = JSON.stringify([fatherForSearch, f.village?.village_lgd ?? null, f.gender === "F" && f.married ? native?.village_lgd ?? null : null, svc]);
  const resStale = !!res && resKey !== searchKey;
  const proofAttached = !resStale && path === "found" && res?.status !== "not_found" && !!res?.proof_ref;

  function pickGroup(g: "scst" | "obc") {
    setSvcGroup(g);
    // a caste chosen for the other service is not in this list: clear it, so the form asks again
    setF((x) => {
      const c = CASTES.find((k) => k.hi === x.caste);
      return c && (c.svc === "caste_obc") !== (g === "obc") ? { ...x, caste: "" } : x;
    });
  }
  function reset() {
    demoMenu.current?.removeAttribute("open");
    setStep(0);
    setSession(newSession());
    setF(EMPTY);
    setAadhaarOk(false);
    setAadhaarConsent(false);
    setRelation("father");
    setCertNo("");
    setNative(null);
    setNativeText("");
    setConsent(false);
    setRes(null);
    setResKey("");
    setPath(null);
    setVrows(VROWS);
    setDeclOk(false);
    setDeclText("");
    setUploads(new Set());
    setSaved(false);
    setFinalDecl(false);
    setReceipt(null);
    setErr(null);
    setSubmitErr(null);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }
  async function demo(kind: "sunita" | "ramesh" | "rajni") {
    reset();
    setStep(1);
    const pick = async (q: string, d?: number) => (await api.villages(d, q).catch(() => [] as Village[]))[0] ?? null;
    if (kind === "sunita") {
      const v = (await pick("Bayanar", 643)) ?? { village_lgd: 448703, name: { en: "Bayanar", hi: "बयानार" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      setSvcGroup("scst");
      setF({ ...EMPTY, nameHi: "सुनीता मरकाम", nameEn: "Sunita Markam", mobile: "98••••3973", village: v, villageText: t(v.name), address: "ग्राम बयानार, कोंडागांव", aadhaar: "XXXXXXXX1165", aadhaarName: "Sunita Markam", guardianHi: "रामलाल मरकाम", guardianEn: "Ramlal Markam", motherHi: "सुखमती मरकाम", gender: "F", birthYear: "2008", caste: "गोंड", purpose: "पोस्ट-मैट्रिक छात्रवृत्ति" });
    } else if (kind === "rajni") {
      const v = (await pick("Masora", 643)) ?? { village_lgd: 448686, name: { en: "Masora", hi: "मसोरा" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      const n = (await api.villages(undefined, "Garhbengal").catch(() => [] as Village[])).find((x) => x.village_lgd === 449687) ?? { village_lgd: 449687, name: { en: "Garhbengal", hi: "गढ़बेंगाल" }, tehsil: { en: "Narayanpur", hi: "नारायणपुर" }, district: { en: "Narayanpur", hi: "नारायणपुर" } };
      setSvcGroup("scst");
      setF({ ...EMPTY, nameHi: "रजनी कोर्राम", nameEn: "Rajni Korram", mobile: "97••••2210", village: v, villageText: t(v.name), address: "ग्राम मसोरा, कोंडागांव", aadhaar: "XXXXXXXX4471", aadhaarName: "Rajni Korram", guardianHi: "जगलू उसेंडी", guardianEn: "Jaglu Usendi", motherHi: "सोनमती उसेंडी", gender: "F", married: true, birthYear: "1999", caste: "मुरिया", purpose: "शासकीय नौकरी" });
      setNative(n);
      setNativeText(t(n.name));
    } else {
      const v = (await pick("Umargaon", 643)) ?? { village_lgd: 448804, name: { en: "Umargaon", hi: "उमरगांव" }, tehsil: { en: "Kondagaon", hi: "कोंडागांव" } };
      setSvcGroup("obc");
      setF({ ...EMPTY, nameHi: "रमेश यादव", nameEn: "Ramesh Yadav", mobile: "94••••8812", village: v, villageText: t(v.name), address: "ग्राम उमरगांव, कोंडागांव", aadhaar: "XXXXXXXX7302", aadhaarName: "Ramesh Yadav", guardianHi: "भगवती यादव", guardianEn: "Bhagwati Yadav", motherHi: "रामबती यादव", gender: "M", birthYear: "2004", caste: "यादव", purpose: "महाविद्यालय प्रवेश" });
      setVrows([
        { relation: "पिता", name: "भगवती यादव", village: "उमरगांव", place: "उमरगांव" },
        { relation: "दादा", name: "रामधन यादव", village: "उमरगांव", place: "उमरगांव" },
        { relation: "परदादा", name: "", village: "", place: "पता नहीं" },
      ]);
    }
  }

  async function search() {
    setErr(null);
    if (!consent) return setErr(tx("Tick the consent box first.", "पहले सहमति पर टिक करें।"));
    if (!fatherForSearch)
      return setErr(f.guardianType === "father" ? tx("Fill the father's name in 'General details' above.", "ऊपर 'सामान्य विवरण' में पिता का नाम भरें।") : tx("Fill your father's name in the box above.", "ऊपर के खाने में अपने पिता का नाम भरें।"));
    setBusy(true);
    try {
      const r = await api.citizenPrecheck({
        session_id: session,
        service: svc,
        applicant_name: f.nameHi || f.nameEn,
        father_name: fatherForSearch,
        relation,
        village_lgd: f.village?.village_lgd,
        district_lgd: 643,
        native_village_lgd: f.gender === "F" && f.married ? native?.village_lgd : undefined,
        relative_cert_no: certNo.trim() || undefined,
        consent: true,
        aadhaar_ok: aadhaarOk,
      });
      setRes(r);
      setResKey(searchKey);
      setPath(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setRes((cur) => (cur && !resStale ? { ...cur, searches_left: 0 } : { status: "not_found", searches_left: 0 }));
        setResKey(searchKey);
      }
      setErr(e instanceof ApiError ? (e.status === 422 ? tx("Write your father's name in letters (Hindi or English) and search again.", "पिता का नाम अक्षरों में (हिंदी या अंग्रेज़ी) लिखकर फिर से खोजें।") : e.status === 429 ? tx("You have used all 3 searches for this application. Continue with a document, or choose “I have no papers”.", "इस आवेदन की 3 खोज पूरी हो गईं। किसी दस्तावेज़ से आगे बढ़ें, या “मेरे पास कोई कागज़ नहीं” चुनें।") : e.message) : String(e));
    } finally {
      setBusy(false);
    }
  }

  const vLabel = {
    name: tx("Name", "नाम"),
    village: tx("Village", "गांव"),
    place: tx(`Where did they live in ${CUTOFF[svc][0].slice(-4)}?`, `${CUTOFF[svc][1].slice(-4)} में कहाँ रहते थे?`),
  };
  const declaration = useMemo(() => {
    const known = vrows.filter((r) => r.name || r.place);
    const lines = known.map((r) => `${r.relation}: ${r.name || "नाम पता नहीं"}, ग्राम ${r.village || "—"}; ${CUTOFF[svc][1]} के समय: ${r.place || "पता नहीं"}`).join("। ");
    return (
      `मैं, ${f.nameHi || f.nameEn || "____"}, पिता ${fatherForSearch || "____"}, निवासी ग्राम ${f.village ? f.village.name.hi : "____"}, घोषणा ${f.gender === "M" ? "करता" : "करती"} हूँ कि मेरे पास ${CUTOFF[svc][1]} से पहले के निवास का कोई दस्तावेज़ उपलब्ध नहीं है। ` +
      `मेरे परिवार की जानकारी: ${lines || "—"}। मैं अनुरोध ${f.gender === "M" ? "करता" : "करती"} हूँ कि नियम 7 के अंतर्गत पटवारी / राजस्व निरीक्षक से जांच कराई जाए। गलत जानकारी देना दंडनीय अपराध है।`
    );
  }, [vrows, f.nameHi, f.nameEn, fatherForSearch, f.village, f.gender, svc]);
  // the "no papers" path counts only with the declaration exactly as ticked (editing the family tree un-ticks it)
  const noPapers = path === "no_papers" && declOk && declText === declaration;
  const block1950Optional = proofAttached || noPapers;

  const [voiceNote, setVoiceNote] = useState(false);
  function speak(text: string) {
    try {
      const voices = window.speechSynthesis.getVoices();
      // no Hindi voice on this phone: say so instead of silence (or an English voice mangling Hindi)
      if (voices.length && !voices.some((v) => v.lang.toLowerCase().startsWith("hi"))) setVoiceNote(true);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "hi-IN";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      setVoiceNote(true);
    }
  }
  const voiceMsg = voiceNote && (
    <p className="small cz-warn" role="status">
      {tx("Hindi voice is not available on this device — ask a family member or the Lok Seva Kendra to read it to you.", "इस फ़ोन/कंप्यूटर पर हिंदी आवाज़ उपलब्ध नहीं — परिवारजन या लोक सेवा केंद्र से पढ़कर सुनवा लें।")}
    </p>
  );

  const birthYearOk = /^\d{4}$/.test(f.birthYear) && Number(f.birthYear) >= 1930 && Number(f.birthYear) <= THIS_YEAR;
  const formMissing = [
    f.guardianType !== "father" && !f.fatherName.trim() && tx("father's name", "पिता का नाम"),
    !f.guardianHi && !f.guardianEn && tx("guardian's name (Hindi or English — one is enough)", "अभिभावक का नाम (हिंदी या अंग्रेज़ी — एक काफ़ी)"),
    !f.birthYear && tx("year of birth", "जन्म वर्ष"),
    !!f.birthYear && !birthYearOk && tx(`year of birth (4 digits, 1930–${THIS_YEAR})`, `जन्म वर्ष (4 अंक, 1930–${THIS_YEAR})`),
    !f.caste && tx("caste", "जाति"),
    !f.nameEn && tx("beneficiary's name in English", "हितग्राही का नाम अंग्रेजी में"),
  ].filter(Boolean) as string[];
  const casteProofOk = proofAttached || noPapers || uploads.has("caste_proof");
  const obcIncomeOk = svc !== "caste_obc" || uploads.has("father_income");
  const affidavitOk = svc !== "caste_obc" || uploads.has("affidavit") || noPapers;

  async function submit() {
    if (!f.village) return;
    setSubmitErr(null);
    setBusy(true);
    try {
      const other = [...uploads];
      const r = await api.citizenSubmit({
        session_id: session,
        service: svc,
        applicant_name_hi: f.nameHi,
        applicant_name_en: f.nameEn,
        // the officer's records check matches on the FATHER: a husband / other guardian is not sent as the father
        father_name_hi: f.guardianType === "father" ? f.guardianHi : f.fatherName,
        father_name_en: f.guardianType === "father" ? f.guardianEn : "",
        mother_name: f.motherHi,
        gender: f.gender,
        birth_year: Number(f.birthYear) || 2000,
        caste: f.caste,
        village_lgd: f.village.village_lgd,
        purpose: f.purpose,
        proof_ref: proofAttached ? res?.proof_ref : undefined,
        no_papers: noPapers,
        declaration: noPapers ? declaration : undefined,
        vanshavali: noPapers ? vrows.map((r) => ({ relation: r.relation, name: r.name, village: r.village, place_1950: r.place })) : [],
        other_docs: other,
        aadhaar_last4: /^\d{4}$/.test(f.aadhaar.slice(-4)) ? f.aadhaar.slice(-4) : undefined,
        mobile_last4: /\d{4}$/.test(f.mobile) ? f.mobile.slice(-4) : undefined,
      });
      setReceipt(r);
      setStep(6);
    } catch (e) {
      if (e instanceof ApiError && /proof reference/.test(e.message)) {
        // the search result expired (server restarted / demo reset): search again instead of a dead end
        setRes(null);
        setPath(null);
        setSubmitErr(tx("Your family-certificate search has expired. Press “Close”, then “Correct application”, and search again in the Family Proof Helper.", "परिवार के प्रमाण पत्र की खोज की अवधि समाप्त हो गई। “बंद” दबाएं, फिर “आवेदन सुधारें” में जाकर परिवार प्रमाण सहायक में फिर से खोजें।"));
      } else setSubmitErr(tx("Could not submit — nothing was charged. Try again in a minute, or visit your Lok Seva Kendra. ", "आवेदन जमा नहीं हो सका — कोई शुल्क नहीं कटा। थोड़ी देर में फिर प्रयास करें, या लोक सेवा केंद्र जाएं। ") + (e instanceof ApiError ? `(${e.message})` : ""));
    } finally {
      setBusy(false);
    }
  }

  const svcTitle = svcGroup === "obc" ? tx("Other Backward Class (OBC) certificate", "अन्य पिछड़ा वर्ग प्रमाण पत्र") : tx("Scheduled Caste / Scheduled Tribe certificate", "अनुसूचित जाति / अनुसूचित जनजाति प्रमाण पत्र");
  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="cz">
      <header className="cz-top">
        <div className="cz-top-in">
          <span className="cz-brand">
            <Monogram text="SS" size={30} bg="#ffffff" fg="#1d3f73" /> {tx("Sewa Setu (mock)", "सेवा सेतु (मॉक)")}
          </span>
          <span className="cz-session">
            Session TimeOut (In Minute) : {mm}:{ss}
          </span>
          <span className="spacer" />
          <div className="cz-lang" role="group" aria-label="Language">
            <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")}>
              हिंदी
            </button>
            <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
          <details className="cz-demo" ref={demoMenu}>
            <summary>{tx("Demo", "डेमो")} ▾</summary>
            <div className="cz-demo-pop">
              <button onClick={() => demo("sunita")}>{tx("Sunita — father's certificate in the archive", "सुनीता — पिता का प्रमाण पत्र अभिलेखागार में")}</button>
              <button onClick={() => demo("rajni")}>{tx("Rajni — married, father's record in her maiden village", "रजनी — विवाहित, पिता का अभिलेख मायके के गांव में")}</button>
              <button onClick={() => demo("ramesh")}>{tx("Ramesh (OBC) — no papers at all", "रमेश (अ.पि.व.) — कोई कागज़ नहीं")}</button>
              <button onClick={reset}>{tx("Start again (empty)", "फिर से शुरू (खाली)")}</button>
              <Link to="/sewasetu">{tx("Officer console (SDO) →", "अधिकारी कंसोल (एसडीओ) →")}</Link>
            </div>
          </details>
          <span className="cz-home">⌂ {tx("Home", "होम")}</span>
          <span className="cz-user" title={tx("Citizen login (mock)", "नागरिक लॉगिन (मॉक)")}>
            👤 {f.nameHi || f.nameEn ? (lang === "hi" ? f.nameHi || f.nameEn : f.nameEn || f.nameHi) : tx("Citizen", "नागरिक")} ▾
          </span>
        </div>
      </header>
      <div className="cz-mocknote">
        {tx(
          "Mock of the Sewa Setu citizen portal, redrawn from the CHiPS user manual (Jan 2026) — not the official portal · citizen data synthetic · the green-bordered parts are Praman Setu's proposal",
          "सेवा सेतु नागरिक पोर्टल का मॉक, CHiPS उपयोगकर्ता मार्गदर्शिका (जनवरी 2026) से पुनर्निर्मित — आधिकारिक पोर्टल नहीं · नागरिक डेटा सिंथेटिक · हरी किनारी वाले भाग प्रमाण सेतु का प्रस्ताव हैं",
        )}
        {mode === "offline" && (
          <b className="cz-offline" id="cz-offline">
            {" "}· {tx("Offline demo mode: the server is not reachable — answers are samples and nothing reaches the officer.", "ऑफ़लाइन डेमो मोड: सर्वर उपलब्ध नहीं — उत्तर नमूना हैं, अधिकारी तक कुछ नहीं पहुंचता।")}
          </b>
        )}
      </div>

      <div className="cz-page">
        <Stepper step={receipt ? 6 : step} />

        {receipt && step < 6 && (
          <div className="cz-box" id="cz-already" role="status" style={{ marginTop: 12 }}>
            <p>
              <b>{tx("This application is already submitted", "यह आवेदन जमा हो चुका है")}</b> · <span className="mono">{receipt.app_id}</span>
            </p>
            <p className="small">{tx("It can no longer be changed here. If something is wrong, tell the officer at the Lok Seva Kendra, or start a new application.", "इसे अब यहाँ बदला नहीं जा सकता। कुछ गलत हो तो लोक सेवा केंद्र पर अधिकारी को बताएं, या नया आवेदन शुरू करें।")}</p>
            <div className="cz-row">
              <button className="cz-btn green" onClick={() => setStep(6)} id="cz-show-receipt">
                {tx("Show the receipt", "पावती देखें")}
              </button>
              <button className="cz-btn outline" onClick={reset}>
                {tx("New application", "नया आवेदन")}
              </button>
            </div>
          </div>
        )}

        {step === 0 && !receipt && (
          <>
            <DemoStrip onPick={demo} />
            <div className="cz-svc-pick">
              <span className="small">{tx("Service", "सेवा")}:</span>
              <button className={svcGroup === "scst" ? "on" : ""} onClick={() => pickGroup("scst")}>
                {tx("SC / ST certificate", "अनुसूचित जाति / अनुसूचित जनजाति प्रमाण पत्र")}
              </button>
              <button className={svcGroup === "obc" ? "on" : ""} onClick={() => pickGroup("obc")}>
                {tx("OBC certificate", "अन्य पिछड़ा वर्ग प्रमाण पत्र")}
              </button>
            </div>
            <div className="cz-svc-head">
              <h1>{svcTitle}</h1>
              <div className="cz-dept">{tx("Revenue Department", "राजस्व विभाग")}</div>
            </div>
            <div className="cz-row" style={{ justifyContent: "space-between" }}>
              <button className="cz-btn outline" onClick={() => setStep(1)} id="cz-next-0">
                {tx("Next", "आगे")}
              </button>
              <label className="small">
                {tx("Skip this page", "इस पेज को छोड़ें")} <input type="checkbox" onChange={() => setStep(1)} />
              </label>
            </div>
            <div className="cz-svc-grid">
              <div>
                <Ribbon>{tx("Introduction", "परिचय")}</Ribbon>
                <div className="cz-box">
                  <p>
                    {tx(
                      "Certificates of Scheduled Caste, Scheduled Tribe and Other Backward Class are needed for education, jobs, scholarships and many welfare schemes. Apply at a Lok Seva Kendra or online, with the documents listed below. After submission you get an application reference number (ARN) to track the application; the digitally signed certificate can be downloaded from the portal.",
                      "अनुसूचित जाति, अनुसूचित जनजाति एवं अन्य पिछड़ा वर्ग के प्रमाण पत्र शिक्षा, रोज़गार, छात्रवृत्ति एवं कई कल्याणकारी योजनाओं हेतु आवश्यक हैं। लोक सेवा केंद्र अथवा ऑनलाइन, नीचे दिए दस्तावेज़ों के साथ आवेदन करें। आवेदन जमा करने पर आवेदन संदर्भ क्रमांक (ARN) मिलता है, जिससे स्थिति देखी जा सकती है; डिजिटल हस्ताक्षरित प्रमाण पत्र पोर्टल से डाउनलोड किया जा सकता है।",
                    )}
                  </p>
                </div>
                <Ribbon>{tx("Required documents", "आवश्यक दस्तावेज")}</Ribbon>
                <table className="cz-table">
                  <thead>
                    <tr>
                      <th>{tx("No.", "क्र.")}</th>
                      <th>{tx("Document type", "दस्तावेज प्रकार")}</th>
                      <th>{tx("Supporting documents", "सहायक दस्तावेज")}</th>
                      <th>{tx("Mandatory", "अनिवार्य")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>{tx("Residential proof", "निवास का प्रमाण")}</td>
                      <td>{tx("Domicile certificate, electricity bill, ration card, birth certificate, voter ID, land / house document …", "मूल निवासी प्रमाण पत्र, बिजली का बिल, राशन कार्ड, जन्म प्रमाण पत्र, वोटिंग कार्ड, घर या भूमि का दस्तावेज़ …")}</td>
                      <td>{tx("No", "नहीं")}</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>{svcGroup === "obc" ? tx("OBC proof", "अ.पि.व. का प्रमाण") : tx("Caste proof", "जाति का प्रमाण")}</td>
                      <td>
                        {tx(
                          "Any ONE: certificate of another state · Sarpanch / Parshad / MLA / MP certificate · school leaving certificate · ",
                          "कोई एक: अन्य राज्य का प्रमाण पत्र · सरपंच / पार्षद / विधायक / सांसद का प्रमाण पत्र · शाला त्याग प्रमाण पत्र · ",
                        )}
                        <b className="cz-hl">{svcGroup === "obc" ? tx("father's OBC certificate", "पिता का अ.पि.व. प्रमाण पत्र") : tx("caste certificate issued to the applicant or any family member", "आवेदक को या उसके किसी परिवारजन को जारी हुआ जाति प्रमाण पत्र")}</b>
                        {tx(" · Misal · Adhikar Abhilekh · Jamabandi · 1931 census · 1949 citizen register · disability / unavailability proof", " · मिसल · अधिकार अभिलेख · जमाबंदी · १९३१ की जनगणना पंजी · १९४९ का नागरिक पंजी · असमर्थता / अनुपलब्धता का प्रमाण")}
                      </td>
                      <td>{tx("Yes", "हाँ")}</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>{tx("Affidavit (Form 2A)", "शपथ पत्र (फॉर्म 2A)")}</td>
                      <td>—</td>
                      <td>{svcGroup === "obc" ? tx("Yes", "हाँ") : tx("No", "नहीं")}</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>{tx("Family tree (Vanshavali)", "वंशावली")}</td>
                      <td>{tx("Vanshavali 1–4", "वंशावली 1–4")}</td>
                      <td>{tx("No", "नहीं")}</td>
                    </tr>
                    {svcGroup === "obc" && (
                      <tr>
                        <td>5</td>
                        <td>{tx("Income proof", "आय का प्रमाण")}</td>
                        <td>{tx("Father's income certificate of the preceding year", "पिता का पिछले वर्ष का आय प्रमाण पत्र")}</td>
                        <td>{tx("Yes", "हाँ")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <Ribbon>₹ {tx("Fee", "शुल्क संबंधित जानकारी")}</Ribbon>
                <div className="cz-box">
                  <b>{tx("Where to apply?", "आवेदन कहाँ करें?")}</b>
                  <div className="cz-kv">
                    <span>{tx("Lok Seva Kendra", "लोक सेवा केंद्र")}</span>
                    <span>₹30.0</span>
                  </div>
                  <div className="cz-kv">
                    <span>{tx("Online", "ऑनलाइन")}</span>
                    <span>₹30.0</span>
                  </div>
                </div>
                <Ribbon>⏳ {tx("Time limit", "समय सीमा")}</Ribbon>
                <div className="cz-box">
                  <b>22 {tx("days", "दिन")}</b>
                </div>
                <PapersGuide svcGroup={svcGroup} onStart={() => setStep(1)} />
              </div>
            </div>
          </>
        )}

        {step === 1 && !receipt && (
          <>
            {!f.nameHi && <DemoStrip onPick={demo} />}
            <TitleBand>{svcTitle}</TitleBand>
            <div className="cz-card">
              <div className="cz-card-tab">{tx("Applicant's basic information", "आवेदक की बुनियादी जानकारी")}</div>
              <div className="cz-grid2">
                <Field label={tx("Applicant's name", "आवेदक का नाम")} req>
                  <input className="cz-in" value={f.nameHi} onChange={(e) => set("nameHi", e.target.value)} placeholder={tx("e.g. Sunita Markam", "उदा. सुनीता मरकाम")} id="cz-name" />
                </Field>
                <Field label={tx("Mobile number", "मोबाइल नंबर")} req>
                  <input className="cz-in" value={f.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder={tx("10-digit mobile", "10 अंकों का मोबाइल")} />
                </Field>
                <Field label={tx("District", "जिला")} req>
                  <select className="cz-in" value="643" disabled>
                    <option value="643">{tx("Kondagaon", "कोंडागांव")}</option>
                  </select>
                </Field>
                <Field label={tx("Office type", "कार्यालय प्रकार")} req>
                  <select className="cz-in" disabled>
                    <option>{tx("Sub-district / Revenue tehsil", "उप-जिला / राजस्व तहसील / राजस्व उप-तहसील")}</option>
                  </select>
                </Field>
                <Field label={tx("Revenue village (LGD)", "राजस्व गांव (एलजीडी)")} req>
                  <VillagePicker id="cz-village" value={f.village} text={f.villageText} districtLgd={643} onChange={(v, txt) => setF((x) => ({ ...x, village: v, villageText: txt }))} placeholder={tx("Start typing…", "टाइप करना शुरू करें…")} />
                </Field>
                <Field label={tx("Sub-district / tehsil", "उप-जिला राजस्व तहसील / तहसील")}>
                  <input className="cz-in" value={f.village ? t(f.village.tehsil) : ""} disabled />
                </Field>
                <Field label={tx("Applicant's address", "आवेदक का पता")} req wide>
                  <textarea className="cz-in" rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
              <div className="cz-row" style={{ marginTop: 10 }}>
                {aadhaarOk ? (
                  <span className="cz-ok">✓ {tx("Aadhaar e-Authentication done", "आधार ई-प्रमाणीकरण पूर्ण")} · XXXX XXXX {f.aadhaar.slice(-4)}</span>
                ) : (
                  <>
                    <button className="cz-btn blue" onClick={() => setAadhaarOpen(true)} id="cz-aadhaar" disabled={!f.nameHi || !f.village}>
                      Aadhaar e-Authentication
                    </button>
                    {(!f.nameHi || !f.village) && (
                      <span className="cz-hint">
                        {tx("Fill first", "पहले भरें")}: {[!f.nameHi && tx("applicant's name", "आवेदक का नाम"), !f.village && tx("revenue village (pick from the list)", "राजस्व गांव (सूची से चुनें)")].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="cz-actions">
              <button className="cz-btn red" disabled={!aadhaarOk} onClick={() => setStep(2)} id="cz-submit-1">
                {tx("Submit", "जमा करें")}
              </button>
              {!aadhaarOk && <span className="cz-hint">{tx("Complete Aadhaar e-Authentication first", "पहले आधार ई-प्रमाणीकरण पूरा करें")}</span>}
              <button className="cz-btn red" onClick={() => setStep(0)}>
                {tx("Back", "पीछे")}
              </button>
            </div>
            {aadhaarOpen && (
              <div className="cz-modal-bg" onClick={() => setAadhaarOpen(false)}>
                <div className="cz-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} id="cz-aadhaar-modal">
                  <div className="cz-modal-head">
                    Aadhaar e-Authentication <button onClick={() => setAadhaarOpen(false)}>✕</button>
                  </div>
                  <label className="cz-lbl">Aadhaar Number/आधार संख्या</label>
                  <input className="cz-in mono" value={f.aadhaar} onChange={(e) => set("aadhaar", e.target.value.replace(/[^\dX]/gi, "").slice(0, 12))} placeholder="XXXXXXXXXXXX" id="cz-aadhaar-no" />
                  <label className="cz-lbl">Aadhaar Name in English/आधार नाम अंग्रेजी में</label>
                  <input className="cz-in" value={f.aadhaarName} onChange={(e) => set("aadhaarName", e.target.value)} />
                  <label className="cz-check">
                    <input type="checkbox" checked={aadhaarConsent} onChange={(e) => setAadhaarConsent(e.target.checked)} id="cz-aadhaar-consent" />
                    <span className="small">
                      I have no objection in authenticating myself and fully understand that information provided by me shall be used for authenticating my identity through Aadhaar Authentication System for the purpose stated above and no other purpose. / मुझे अपने आप को प्रमाणित करने में कोई आपत्ति नहीं है और मैं पूरी तरह से समझता हूं कि मेरे द्वारा प्रदान की गई जानकारी का उपयोग ऊपर बताए गए उद्देश्य के लिए आधार प्रमाणीकरण प्रणाली के माध्यम से मेरी पहचान को प्रमाणित करने के लिए किया जाएगा और कोई अन्य उद्देश्य नहीं होगा।
                    </span>
                  </label>
                  <button
                    className="cz-btn blue"
                    disabled={!aadhaarConsent || !/^[\dX]{8}\d{4}$/i.test(f.aadhaar) || !f.aadhaarName}
                    onClick={() => {
                      setAadhaarOk(true);
                      setAadhaarOpen(false);
                      if (!f.nameEn) set("nameEn", f.aadhaarName);
                    }}
                    id="cz-aadhaar-auth"
                  >
                    Authentication
                  </button>
                  <p className="small muted" style={{ marginTop: 6 }}>
                    {tx("Demo: simulated — no Aadhaar call is made.", "डेमो: अनुकरण — कोई आधार कॉल नहीं होती।")}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && !receipt && (
          <>
            <TitleBand>{svcTitle}</TitleBand>
            <div className="cz-crumb">
              {tx("Dashboard", "डैशबोर्ड")} / <span>{tx("Application form", "आवेदन पत्र")}</span>
            </div>
            <Band>{tx("General details", "सामान्य विवरण")}</Band>
            <div className="cz-grid2 cz-formgrid">
              <Field label={tx("Type of beneficiary's guardian", "हितग्राही के अभिभावक का प्रकार")} req>
                <select className="cz-in" value={f.guardianType} onChange={(e) => set("guardianType", e.target.value as Form["guardianType"])} id="cz-guardian-type">
                  <option value="father">{tx("Father", "पिता")}</option>
                  <option value="husband">{tx("Husband", "पति")}</option>
                  <option value="guardian">{tx("Guardian", "पालक")}</option>
                </select>
              </Field>
              <Field label={tx("Guardian's name (Hindi)", "हितग्राही के अभिभावक का नाम")} req={!f.guardianEn}>
                <input className="cz-in" value={f.guardianHi} onChange={(e) => set("guardianHi", e.target.value)} id="cz-father-hi" />
              </Field>
              <Field label={tx("Guardian's name in English", "हितग्राही के अभिभावक का नाम अंग्रेजी में")} req={!f.guardianHi}>
                <input className="cz-in" value={f.guardianEn} onChange={(e) => set("guardianEn", e.target.value)} id="cz-father-en" />
              </Field>
              <Field label={tx("Mother's name", "माता का नाम")}>
                <input className="cz-in" value={f.motherHi} onChange={(e) => set("motherHi", e.target.value)} />
              </Field>
              <Field label={tx("Gender", "लिंग")} req>
                <select className="cz-in" value={f.gender} onChange={(e) => set("gender", e.target.value as "F" | "M")} id="cz-gender">
                  <option value="F">{tx("Female", "स्त्री/Female")}</option>
                  <option value="M">{tx("Male", "पुरुष/Male")}</option>
                </select>
              </Field>
              <Field label={tx("Marital status", "वैवाहिक स्थिति")} req>
                <select className="cz-in" value={f.married ? "m" : "u"} onChange={(e) => set("married", e.target.value === "m")} id="cz-married">
                  <option value="u">{tx("Unmarried", "अविवाहित")}</option>
                  <option value="m">{tx("Married", "विवाहित")}</option>
                </select>
              </Field>
              <Field label={tx("Year of birth", "जन्म वर्ष")} req>
                <input className="cz-in" inputMode="numeric" maxLength={4} value={f.birthYear} onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label={tx("Caste", "जाति")} req>
                <select className="cz-in" value={f.caste} onChange={(e) => set("caste", e.target.value)} id="cz-caste">
                  <option value="">{tx("Select", "चुनें")}</option>
                  {CASTES.filter((c) => (svcGroup === "obc" ? c.svc === "caste_obc" : c.svc !== "caste_obc")).map((c) => (
                    <option key={c.hi} value={c.hi}>
                      {lang === "hi" ? c.hi : c.en}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tx("Category", "श्रेणी")}>
                <input className="cz-in" value={casteRow ? tx(CATEGORY[casteRow.svc][0], CATEGORY[casteRow.svc][1]) : ""} disabled />
              </Field>
              <Field label={tx("Serial number of the caste", "वर्ग का क्रमांक")}>
                <input className="cz-in" value={casteRow?.sr ?? ""} disabled />
              </Field>
              <Field label={tx("Beneficiary's name in English", "हितग्राही का नाम अंग्रेजी में")} req>
                <input className="cz-in" value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} id="cz-name-en" />
              </Field>
              <Field label={tx("Purpose", "प्रयोजन")}>
                <input className="cz-in" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
              </Field>
            </div>
            <Band>{tx("Applicant's current address", "आवेदक का वर्तमान पता")}</Band>
            <div className="cz-grid2 cz-formgrid">
              <Field label={tx("Address", "पता")} req>
                <input className="cz-in" value={f.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label={tx("Village", "ग्राम")}>
                <input className="cz-in" value={f.village ? t(f.village.name) : ""} disabled />
              </Field>
              <Field label={tx("District", "जिला")}>
                <input className="cz-in" value={tx("Kondagaon", "कोंडागांव")} disabled />
              </Field>
              <Field label={tx("Are the current and permanent addresses the same?", "क्या वर्तमान पता और स्थायी पता एक है?")} req>
                <select className="cz-in" defaultValue="y">
                  <option value="y">{tx("Yes", "हाँ")}</option>
                  <option value="n">{tx("No", "नहीं")}</option>
                </select>
              </Field>
            </div>

            {/* ===================== Praman Setu: Family Proof Helper ===================== */}
            <section className="cz-helper" id="cz-helper" aria-label={tx("Family Proof Helper", "परिवार प्रमाण सहायक")}>
              <div className="cz-helper-head">
                <span>
                  <b>{tx("Family Proof Helper", "परिवार प्रमाण सहायक")}</b> · {tx("Find your family's caste certificate", "अपने परिवार का जाति प्रमाण पत्र खोजें")}
                </span>
                <span className="cz-tag">{tx("Praman Setu · new", "प्रमाण सेतु · नया")}</span>
              </div>
              <p className="cz-helper-lead">
                {tx(
                  `No ${CUTOFF[svc][0]} papers at home? You don't need them if someone in your family already has a caste certificate in Sewa Setu (Rule 3(3)). We search only for your own family, only for this application.`,
                  `घर में ${CUTOFF[svc][1]} से पहले के कागज़ नहीं? यदि आपके परिवार में किसी का जाति प्रमाण पत्र पहले से सेवा सेतु में है, तो उनकी ज़रूरत नहीं (नियम 3(3))। हम केवल आपके परिवार का, केवल इस आवेदन के लिए खोजेंगे।`,
                )}
              </p>
              {!aadhaarOk ? (
                <p className="cz-warn">{tx("Complete Aadhaar e-Authentication first.", "पहले आधार ई-प्रमाणीकरण पूरा करें।")}</p>
              ) : (
                <>
                  <div className="cz-helper-grid">
                    <div>
                      <div className="cz-lbl">{tx("Whose certificate might exist?", "किसका प्रमाण पत्र हो सकता है?")}</div>
                      <div className="cz-chips">
                        {REL.map(([k, en, hi]) => (
                          <button key={k} type="button" className={relation === k ? "on" : ""} onClick={() => setRelation(k)}>
                            {tx(en, hi)}
                          </button>
                        ))}
                      </div>
                      <p className="small muted" style={{ margin: "4px 0 0" }}>
                        {tx("We search by your father's name and village — that finds his certificate and your brothers' and sisters'.", "हम आपके पिता के नाम और गांव से खोजते हैं — इससे उनका और आपके भाई-बहनों का प्रमाण पत्र मिलता है।")}
                      </p>
                    </div>
                    <div className="cz-will">
                      <div className="cz-lbl">{tx("We will search with", "हम इससे खोजेंगे")}</div>
                      {f.guardianType === "father" ? (
                        <div>
                          {tx("Father", "पिता")}: <b>{fatherForSearch || "—"}</b>
                        </div>
                      ) : (
                        <label className="cz-field" style={{ display: "block" }}>
                          <span className="cz-flabel">
                            {tx("Your father's name (your guardian above is not your father) ", "आपके पिता का नाम (ऊपर अभिभावक पिता नहीं हैं) ")}
                            <span className="cz-req">*</span>
                          </span>
                          <input className="cz-in" value={f.fatherName} onChange={(e) => set("fatherName", e.target.value)} id="cz-father-search" />
                        </label>
                      )}
                      <div>
                        {tx("Village", "ग्राम")}: <b>{f.village ? t(f.village.name) : "—"}</b> ({tx("LGD", "एलजीडी")} {f.village?.village_lgd ?? "—"})
                      </div>
                    </div>
                    {f.gender === "F" && f.married && (
                      <div className="cz-wide">
                        <div className="cz-lbl">{tx("Married women: your maiden (father's) village", "विवाहित महिलाएं: मायके (पिता) का गांव")}</div>
                        <VillagePicker id="cz-native" value={native} text={nativeText} onChange={(v, txt) => { setNative(v); setNativeText(txt); }} placeholder={tx("Any district", "कोई भी जिला")} />
                        <p className="small muted" style={{ margin: "2px 0 0" }}>{tx("After marriage, your father's family records stay in his village. Both villages are searched.", "विवाह के बाद पिता के परिवार के अभिलेख उनके गांव में रहते हैं। दोनों गांव खोजे जाएंगे।")}</p>
                      </div>
                    )}
                    <div className="cz-wide">
                      <div className="cz-lbl">{tx("Certificate number, if you know it (optional)", "प्रमाण पत्र क्रमांक, यदि पता हो (वैकल्पिक)")}</div>
                      <input className="cz-in mono" value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder="CG/KDG/SDO/2019/…" />
                    </div>
                  </div>
                  <label className="cz-check cz-consent">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} id="cz-consent" />
                    <span>
                      {tx(
                        "I agree: search the Sewa Setu archive only for the family member I named, only for this application. Every search is logged. Giving false information is an offence.",
                        "मैं सहमत हूँ: सेवा सेतु अभिलेखागार में केवल मेरे बताए परिवारजन का प्रमाण पत्र, केवल इस आवेदन के लिए खोजा जाए। हर खोज दर्ज होती है। गलत जानकारी देना अपराध है।",
                      )}
                    </span>
                  </label>
                  <div className="cz-row">
                    <button className="cz-btn green" onClick={search} disabled={busy || res?.searches_left === 0} id="cz-search">
                      {busy ? "…" : "🔍"} {tx("Search", "खोजें")}
                    </button>
                    {res && <span className="small muted">{tx(`${res.searches_left} of 3 searches left`, `3 में से ${res.searches_left} खोज शेष`)}</span>}
                  </div>
                  {err && <div className="cz-err">{err}</div>}
                  {resStale && (
                    <p className="cz-warn small" id="cz-stale">
                      {tx("You changed the father's name, village or service after searching — search again (the earlier result is not attached).", "खोज के बाद आपने पिता का नाम, गांव या सेवा बदली है — फिर से खोजें (पिछला परिणाम संलग्न नहीं है)।")}
                    </p>
                  )}

                  {res && !resStale && (res.status === "found_usable" || res.status === "found_review") && (
                    <div className={`cz-result ${res.status === "found_usable" ? "found" : "review"}`} id="cz-result">
                      <div className="cz-row" style={{ justifyContent: "space-between" }}>
                        <span className="cz-result-title">{res.status === "found_usable" ? "✔ " + tx("Found", "मिल गया") : "◐ " + tx("Found — the officer will check it", "मिला — अधिकारी जांचेंगे")}</span>
                        <button className="cz-btn outline sm" onClick={() => speak(`आपके परिवार का स्थायी जाति प्रमाण पत्र मिला। क्रमांक के अंतिम अंक ${res.masked_no?.slice(-4).split("").join(" ")}। ${res.office?.hi ?? ""}, वर्ष ${res.year ?? ""}। यदि यह आपके परिवार का है तो हरा बटन दबाकर जोड़ें। अधिकारी संबंध की पुष्टि करेंगे।`)} id="cz-listen-result">
                          🔊 {tx("Listen", "सुनें")}
                        </button>
                      </div>
                      {voiceMsg}
                      <p>
                        {tx("A permanent caste certificate matching your family:", "आपके परिवार से मेल खाता स्थायी जाति प्रमाण पत्र:")}{" "}
                        <b className="mono">
                          {tx("No.", "क्र.")} {res.masked_no}
                        </b>{" "}
                        · {t(res.office)} · {res.year}
                        {res.found_via_native && <> · {tx("found in your maiden village", "मायके के गांव में मिला")}</>}
                      </p>
                      <p className="small muted">{tx("For privacy you see only part of the number. The officer sees the full record and confirms the relationship.", "निजता हेतु आपको क्रमांक का केवल अंश दिखता है। अधिकारी पूरा अभिलेख देखकर संबंध की पुष्टि करेंगे।")}</p>
                      {res.status === "found_review" && (
                        <p className="small cz-warn">{tx("Some detail does not match exactly. Check that the caste you chose and your father's name are right; if they are, attach it — the officer will check.", "कोई विवरण पूरी तरह मेल नहीं खाता। जांच लें कि चुनी गई जाति और पिता का नाम सही हैं; सही हों तो जोड़ दें — अधिकारी जांचेंगे।")}</p>
                      )}
                      {path === "found" ? (
                        <div className="cz-attached" id="cz-attached">
                          ✓ {tx("Caste proof attached (archive-verified). You no longer need to upload old papers. If you have a Patwari family tree or ration card, you may add it.", "जाति प्रमाण जुड़ गया (अभिलेखागार से सत्यापित)। पुराने कागज़ अपलोड करना अब ज़रूरी नहीं। पटवारी वंशावली या राशन कार्ड हो तो लगा सकते हैं।")}{" "}
                          <button className="linkish" onClick={() => setPath(null)}>
                            {tx("Undo", "हटाएं")}
                          </button>
                        </div>
                      ) : (
                        <div className="cz-row">
                          <button className="cz-btn green" onClick={() => setPath("found")} id="cz-attach">
                            {tx("Yes, this is my family — attach as proof", "हाँ, यह मेरे परिवार का है — प्रमाण के रूप में जोड़ें")}
                          </button>
                          <button className="cz-btn outline" onClick={() => { setRes({ ...res, status: "not_found" }); setPath(null); }}>
                            {tx("No, not this one", "नहीं, यह नहीं")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {res && !resStale && res.status === "not_found" && (
                    <div className="cz-result none" id="cz-result">
                      <div className="cz-result-title">○ {tx("Not found", "नहीं मिला")}</div>
                      {f.gender === "F" && !f.married && res.searches_left > 0 && (
                        <p className="small cz-warn">{tx("Married? Set marital status to “Married” above — your maiden (father's) village is then searched too.", "विवाहित हैं? ऊपर वैवाहिक स्थिति “विवाहित” चुनें — तब मायके (पिता) का गांव भी खोजा जाएगा।")}</p>
                      )}
                      <p>
                        {tx(
                          "This is common — certificates from before 2015 are not online. Your application will NOT be rejected because of this.",
                          "यह सामान्य है — 2015 से पहले के प्रमाण पत्र ऑनलाइन नहीं हैं। इससे आपका आवेदन अस्वीकार नहीं होगा।",
                        )}
                      </p>
                      <div className="cz-row">
                        <button className={`cz-btn outline ${path === "document" ? "on" : ""}`} onClick={() => setPath("document")}>
                          {tx("I have another document — upload it", "मेरे पास दूसरा कागज़ है — अपलोड करूँगा/करूँगी")}
                        </button>
                        <button className={`cz-btn outline ${path === "no_papers" ? "on" : ""}`} onClick={() => setPath("no_papers")} id="cz-no-papers">
                          {tx("I have no papers", "मेरे पास कोई कागज़ नहीं")}
                        </button>
                      </div>
                    </div>
                  )}
                  {(!res || resStale) && (
                    <p className="small" style={{ margin: "8px 0 0" }}>
                      <button className="linkish" onClick={() => setPath(path === "no_papers" ? null : "no_papers")} id="cz-no-papers-direct">
                        {tx("No family certificate and no old papers? Apply anyway →", "न परिवार का प्रमाण पत्र, न पुराने कागज़? फिर भी आवेदन करें →")}
                      </button>
                    </p>
                  )}

                  {path === "no_papers" && (
                    <div className="cz-nopapers" id="cz-nopapers-box">
                      <div className="cz-result-title">{tx("No papers? Apply anyway", "कागज़ नहीं? फिर भी आवेदन करें")}</div>
                      <p className="small">{tx(`Tell us what you know about your family. Every field can be "don't know".`, `अपने परिवार के बारे में जो पता है वह बताएं। हर जगह "पता नहीं" लिख सकते हैं।`)}</p>
                      <table className="cz-table cz-vtable">
                        <thead>
                          <tr>
                            <th>{tx("Relation", "संबंध")}</th>
                            <th>{tx("Name", "नाम")}</th>
                            <th>{tx("Village", "गांव")}</th>
                            <th>{tx(`Where did they live in ${CUTOFF[svc][0].slice(-4)}?`, `${CUTOFF[svc][1].slice(-4)} में कहाँ रहते थे?`)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vrows.map((r, i) => (
                            <tr key={r.relation}>
                              <td>{tx(VREL_EN[r.relation] ?? r.relation, r.relation)}</td>
                              {(["name", "village", "place"] as const).map((k) => (
                                <td key={k} data-label={vLabel[k]}>
                                  <input className="cz-in" aria-label={`${r.relation} — ${vLabel[k]}`} value={r[k]} placeholder={tx("don't know", "पता नहीं")} onChange={(e) => setVrows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="cz-decl">
                        <div className="cz-row" style={{ justifyContent: "space-between" }}>
                          <b>{tx("Unavailability declaration (generated; the Hindi text is the one you sign)", "अनुपलब्धता घोषणा (स्वतः निर्मित)")}</b>
                          <button className="cz-btn outline sm" onClick={() => speak(declaration)}>
                            🔊 {tx("Listen", "सुनें")}
                          </button>
                        </div>
                        <p>{declaration}</p>
                        {voiceMsg}
                      </div>
                      <label className="cz-check">
                        <input type="checkbox" checked={declOk && declText === declaration} onChange={(e) => { setDeclOk(e.target.checked); setDeclText(e.target.checked ? declaration : ""); }} id="cz-decl-ok" />
                        <span>{tx("I have read / heard this declaration; it is true. (e-sign with Aadhaar OTP; thumb impression at the Kendra)", "मैंने यह घोषणा पढ़/सुन ली है; यह सत्य है। (आधार OTP से ई-हस्ताक्षर; केंद्र पर अंगूठा)")}</span>
                      </label>
                      <div className="cz-next">
                        <b>{tx("What happens next", "आगे क्या होगा")}:</b>{" "}
                        {tx(
                          "Your application is submitted. The SDO office has the Patwari enquire (Rule 7); the Patwari may ask the Kotwar, Sarpanch or community members in your village. You can add a Gram Sabha resolution later.",
                          "आपका आवेदन जमा होगा। एसडीओ कार्यालय पटवारी से जांच करवाएगा (नियम 7); पटवारी आपके गांव में कोटवार, सरपंच या समाज के लोगों से पूछ सकते हैं। ग्राम सभा प्रस्ताव बाद में जोड़ सकते हैं।",
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="cz-helper-foot">{tx("No match is never a reason for rejection · the officer decides · searches are logged", "मिलान न होना कभी अस्वीकृति का कारण नहीं · निर्णय अधिकारी का · हर खोज दर्ज")}</div>
            </section>
            {/* =========================================================================== */}

            <Band>{tx(`Permanent address before ${CUTOFF[svc][0]}`, `${CUTOFF[svc][1]} से पहले का स्थाई पता`)}</Band>
            {block1950Optional && (
              <div className="cz-optional" id="cz-1950-optional">
                {proofAttached
                  ? tx("Optional now — family certificate attached (archive-verified).", "अब वैकल्पिक — परिवार का प्रमाण पत्र जुड़ा है (अभिलेखागार से सत्यापित)।")
                  : tx("Optional now — unavailability declaration given; the Patwari inquiry will record it.", "अब वैकल्पिक — अनुपलब्धता घोषणा दी गई; पटवारी जांच में दर्ज होगा।")}
              </div>
            )}
            <div className={`cz-grid2 cz-formgrid ${block1950Optional ? "dim" : ""}`}>
              {[
                [tx("Village or town", "ग्राम या नगर"), true],
                [tx("Patwari halka number", "पटवारी हल्का नंबर"), svc === "caste_obc"],
                [tx("Tehsil", "तहसील"), svc === "caste_obc"],
                [tx("District", "जिला"), svc === "caste_obc"],
                [tx("Name of the head of family at that time", "इस समय परिवार के मुखिया का नाम"), svc === "caste_obc"],
                [tx("Applicant's relation to the head of family", "आवेदक का परिवार के मुखिया से सम्बन्ध"), false],
              ].map(([l, r]) => (
                <Field key={String(l)} label={String(l)} req={!block1950Optional && !!r}>
                  <input className="cz-in" placeholder={block1950Optional ? tx("don't know", "पता नहीं") : ""} />
                </Field>
              ))}
            </div>
            <Band>{tx("Other details", "अन्य विवरण")}</Band>
            <div className="cz-grid2 cz-formgrid">
              <Field label={tx("Has the applicant been issued an SC/ST certificate before?", "क्या आवेदक को इससे पहले एस सी एस टी प्रमाण पत्र जारी किया गया है")}>
                <select className="cz-in" defaultValue="n">
                  <option value="n">{tx("No", "नहीं")}</option>
                  <option value="y">{tx("Yes", "हाँ")}</option>
                </select>
              </Field>
            </div>
            {formMissing.length > 0 && (
              <div className="cz-hint" style={{ textAlign: "center" }}>
                {tx("Fill the starred fields", "* वाले खाने भरें")}: {formMissing.join(" · ")}
              </div>
            )}
            <div className="cz-actions">
              <button className="cz-btn green" onClick={() => setStep(3)} disabled={formMissing.length > 0} id="cz-save-preview">
                {tx("Save and continue", "सहेजें और पूर्वावलोकन")}
              </button>
              <button className="cz-btn blue" onClick={() => setStep(1)}>
                {tx("Back", "पीछे")}
              </button>
            </div>
          </>
        )}

        {step === 3 && !receipt && (
          <>
            <TitleBand>{tx("Attachment details", "अनुलग्नक का विवरण")}</TitleBand>
            <div className="cz-rules">
              <div>{tx("Marked documents are mandatory (*)", "चिन्हित दस्तावेज लगाना अनिवार्य है (*)")}</div>
              <div>{tx("At least one document of the same attachment type is required (#)", "समान संलग्नक प्रकार का कम से कम एक दस्तावेज़ आवश्यक है (#)")}</div>
              <div>{tx("Only files up to 750 kb (jpeg/jpg/png/pdf)", "कृपया केवल अधिकतम 750kb की फ़ाइल (jpeg/jpg/png/pdf) अपलोड करें।")}</div>
            </div>
            <table className="cz-table cz-up">
              <thead>
                <tr>
                  <th>{tx("No.", "क्रमांक")}</th>
                  <th>{tx("Document name", "दस्तावेज़ का नाम")}</th>
                  <th>{tx("Document", "दस्तावेज़")}</th>
                  <th>{tx("Document number", "दस्तावेज़ संख्या")}</th>
                  <th>{tx("Attachment type", "संलग्न प्रकार")}</th>
                  <th>{tx("Upload file", "फ़ाइल अपलोड करें")}</th>
                  <th>{tx("DigiLocker", "डिजिटल लॉकर")}</th>
                </tr>
              </thead>
              <tbody>
                <UpRow n={1} name={tx("Caste proof #", "जाति का प्रमाण #")} doc={tx("Caste certificate issued to the applicant or any family member", "आवेदक को या उसके किसी परिवारजन को जारी हुआ जाति प्रमाण पत्र")} archive={proofAttached ? res?.masked_no : undefined} code="relative_cert" uploads={uploads} setUploads={setUploads} hide={!proofAttached} />
                <UpRow n={2} name={tx("Caste proof #", "जाति का प्रमाण #")} doc={tx("School leaving certificate (countersigned)", "प्राथमिक शाला या जिला शिक्षा अधिकारी द्वारा प्रमाणित शाला त्याग प्रमाण पत्र")} code="caste_proof" uploads={uploads} setUploads={setUploads} />
                <UpRow n={3} name={tx("Caste proof #", "जाति का प्रमाण #")} doc={tx("Disability / unavailability proof", "असमर्थता / अनुपलब्धता का प्रमाण")} generated={noPapers} code="unavail" uploads={uploads} setUploads={setUploads} note={noPapers ? undefined : tx("No papers? Go back to the form and choose “I have no papers” — the declaration is made there", "कागज़ नहीं? पीछे फ़ॉर्म में “मेरे पास कोई कागज़ नहीं” चुनें — घोषणा वहीं बनती है")} />
                <UpRow n={4} name={tx("Identity", "पहचान")} doc={tx("Aadhaar (e-authenticated)", "आधार (ई-प्रमाणीकृत)")} generated label={tx("✓ Aadhaar e-auth", "✓ आधार ई-प्रमाणीकरण")} code="identity" uploads={uploads} setUploads={setUploads} />
                <UpRow n={5} name={svc === "caste_obc" ? tx("Affidavit *", "शपथ पत्र *") : tx("Affidavit", "शपथ पत्र")} doc={tx("Self-declaration affidavit (Form 2A)", "स्वघोषणा शपथ पत्र (फॉर्म 2A)")} code="affidavit" uploads={uploads} setUploads={setUploads} />
                <UpRow n={6} name={tx("Vanshavali", "वंशावली")} doc={tx("Family tree by the Halka Patwari", "हल्का पटवारी द्वारा वंशावली")} code="vanshavali" uploads={uploads} setUploads={setUploads} note={noPapers ? tx("Patwari will prepare it in the inquiry", "जांच में पटवारी बनाएंगे") : undefined} />
                {svc === "caste_obc" && <UpRow n={7} name={tx("Income proof *", "आय का प्रमाण *")} doc={tx("Father's income certificate, preceding year", "पिता का पिछले वर्ष का आय प्रमाण पत्र")} code="father_income" uploads={uploads} setUploads={setUploads} />}
              </tbody>
            </table>
            {(!casteProofOk || !obcIncomeOk || !affidavitOk) && saved && (
              <div className="cz-err">
                {!casteProofOk
                  ? tx("Caste proof (#): attach at least one — or go back and use the Family Proof Helper / “I have no papers”.", "जाति का प्रमाण (#): कम से कम एक लगाएं — या पीछे जाकर परिवार प्रमाण सहायक / “मेरे पास कोई कागज़ नहीं” चुनें।")
                  : tx("Upload the documents marked *.", "* चिन्हित दस्तावेज़ अपलोड करें।")}
              </div>
            )}
            <div className="cz-actions">
              <button
                className="cz-btn green"
                id="cz-save-uploads"
                onClick={() => {
                  setSaved(true);
                  if (casteProofOk && obcIncomeOk && affidavitOk) setStep(4);
                }}
              >
                {tx("Save attachments", "अनुलग्नक सहेजें")}
              </button>
              <button className="cz-btn red" onClick={() => setStep(0)}>
                {tx("Close", "बंद")}
              </button>
              <button className="cz-btn blue" onClick={() => setStep(2)}>
                {tx("Back", "पीछे")}
              </button>
            </div>
          </>
        )}

        {step === 4 && !receipt && (
          <>
            <TitleBand>
              {tx("Preview", "पूर्वावलोकन")} - {svcTitle}
            </TitleBand>
            <Band>{tx("Applicant's basic information", "आवेदक की बुनियादी जानकारी")}</Band>
            <KV rows={[[tx("Applicant's name", "आवेदक का नाम"), f.nameHi], [tx("Beneficiary's name (English)", "हितग्राही का नाम अंग्रेजी में"), f.nameEn], [tx("Mobile", "मोबाइल नंबर"), f.mobile], [tx("Aadhaar", "आधार कार्ड नंबर"), `XXXX XXXX ${f.aadhaar.slice(-4)} · ${tx("e-authenticated", "ई-प्रमाणीकृत")}`], [tx("Village", "ग्राम"), f.village ? `${t(f.village.name)} (${f.village.village_lgd})` : "—"]]} />
            <Band>{tx("General details", "सामान्य विवरण")}</Band>
            <KV rows={[[tx("Guardian", "हितग्राही के अभिभावक का नाम"), `${f.guardianHi} / ${f.guardianEn}`], ...(f.guardianType !== "father" ? [[tx("Father", "पिता"), f.fatherName] as [string, string]] : []), [tx("Gender / year of birth", "लिंग / जन्म वर्ष"), `${f.gender === "F" ? tx("Female", "स्त्री") : tx("Male", "पुरुष")} / ${f.birthYear}`], [tx("Caste / category", "जाति / श्रेणी"), casteRow ? `${lang === "hi" ? casteRow.hi : casteRow.en} · ${tx(CATEGORY[casteRow.svc][0], CATEGORY[casteRow.svc][1])}` : "—"]]} />
            <Band>{tx("Attached documents", "अनुलग्न दस्तावेज सूची")}</Band>
            <ul className="cz-doclist">
              {proofAttached && <li>✓ {tx(`Family member's caste certificate No. ${res?.masked_no} — archive-verified`, `परिवारजन का जाति प्रमाण पत्र क्र. ${res?.masked_no} — अभिलेखागार से सत्यापित`)}</li>}
              {noPapers && <li>✓ {tx("Unavailability declaration (generated) + family tree", "अनुपलब्धता घोषणा (स्वतः निर्मित) + वंशावली जानकारी")}</li>}
              <li>✓ {tx("Aadhaar e-authentication", "आधार ई-प्रमाणीकरण")}</li>
              {[...uploads].map((u) => (
                <li key={u}>✓ {UPLOAD_LABEL(u, tx)}</li>
              ))}
            </ul>
            <div className="cz-records" id="cz-records">
              <b>{tx("Records used for this application", "इस आवेदन में उपयोग हुए अभिलेख")}</b> <span className="cz-tag">{tx("Praman Setu", "प्रमाण सेतु")}</span>
              <ul>
                <li>{res && !resStale ? tx(`Sewa Setu archive searched with your consent (father's name + village) — ${res.status === "not_found" ? "nothing found" : `certificate No. ${res.masked_no} found`}`, `आपकी सहमति से सेवा सेतु अभिलेखागार खोजा गया (पिता का नाम + गांव) — ${res.status === "not_found" ? "कुछ नहीं मिला" : `प्रमाण पत्र क्र. ${res.masked_no} मिला`}`) : tx("Sewa Setu archive: not searched", "सेवा सेतु अभिलेखागार: खोजा नहीं गया")}</li>
                {noPapers && <li>{tx("Inquiry requested: Patwari / RI (Rule 7)", "जांच का अनुरोध: पटवारी / आर.आई. (नियम 7)")}</li>}
                <li>{tx("Nothing else is looked up. You can ask who accessed your records.", "इसके अलावा कुछ नहीं देखा गया। आप पूछ सकते हैं कि आपके अभिलेख किसने देखे।")}</li>
              </ul>
            </div>
            <p className="small">
              {tx(
                "I have seen the application I filled. The information and documents given by me are true to my knowledge; if anything is found false, I am responsible and may be prosecuted.",
                "मैंने मेरे द्वारा भरा गया आवेदन देख लिया है। मेरे द्वारा प्रदान किए गए सभी विवरण व दस्तावेज़ मेरी जानकारी अनुसार सही हैं; किसी भी प्रकार की विसंगति होने की स्थिति में मैं ज़िम्मेदार रहूँगा/रहूँगी।",
              )}
            </p>
            <label className="cz-check cz-declare">
              <input type="checkbox" checked={finalDecl} onChange={(e) => setFinalDecl(e.target.checked)} id="cz-final-decl" />
              <span>{tx("Tick to submit the application", "आवेदन जमा करने के लिए यहाँ टिक करें")}</span>
            </label>
            <div className="cz-actions">
              <button className="cz-btn green" disabled={!finalDecl} onClick={() => setStep(5)} id="cz-submit-4">
                {tx("Submit", "जमा करें")}
              </button>
              <button className="cz-btn blue" onClick={() => setStep(3)}>
                {tx("Correct attachments", "अनुलग्नक सुधारें")}
              </button>
              <button className="cz-btn yellow" onClick={() => setStep(2)}>
                {tx("Correct application", "आवेदन सुधारें")}
              </button>
            </div>
          </>
        )}

        {step === 5 && !receipt && (
          <>
            <TitleBand>{tx("Fee details", "शुल्क विवरण")}</TitleBand>
            <table className="cz-table cz-fee">
              <thead>
                <tr>
                  <th>{tx("No.", "क्रमांक नं")}</th>
                  <th>{tx("Fee", "शुल्क")}</th>
                  <th>{tx("Total", "कुल राशि")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>{tx("Service fee for Lok Seva Kendra / CSC / kiosk", "लोकसेवा केंद्र/सीएससी/कीओस्क के लिए सेवा शुल्क")}</td>
                  <td>30 /-Rs.</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>{tx("Scanning fee", "स्कैनिंग शुल्क")}</td>
                  <td>0 /-Rs.</td>
                </tr>
                <tr className="tot">
                  <td colSpan={2}>{tx("Total", "कुल")}</td>
                  <td>30 /-Rs.</td>
                </tr>
              </tbody>
            </table>
            <div className="cz-row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <span className="small">{tx("Payment method", "भुगतान का तरीका")}</span>
              <select className="cz-in" style={{ width: 140 }} defaultValue="ewallet">
                <option value="ewallet">eWallet</option>
                <option>UPI</option>
              </select>
            </div>
            {submitErr && <div className="cz-err">{submitErr}</div>}
            <div className="cz-actions">
              <button className="cz-btn green" onClick={submit} disabled={busy} id="cz-pay">
                {busy ? "…" : tx("Submit", "जमा करें")}
              </button>
              <button className="cz-btn red" onClick={() => setStep(4)}>
                {tx("Close", "बंद")}
              </button>
            </div>
          </>
        )}

        {step === 6 && receipt && (
          <Receipt receipt={receipt} svcTitle={svcTitle} noPapers={!!receipt.inquiry_requested} offline={mode === "offline"} onNew={reset} />
        )}
      </div>
    </div>
  );
}

function UPLOAD_LABEL(code: string, tx: (en: string, hi: string) => string) {
  const m: Record<string, [string, string]> = {
    caste_proof: ["School leaving certificate (caste proof)", "शाला त्याग प्रमाण पत्र (जाति का प्रमाण)"],
    affidavit: ["Affidavit (Form 2A)", "शपथ पत्र (फॉर्म 2A)"],
    vanshavali: ["Vanshavali (Patwari)", "वंशावली (पटवारी)"],
    father_income: ["Father's income certificate", "पिता का आय प्रमाण पत्र"],
    unavail: ["Unavailability proof", "अनुपलब्धता का प्रमाण"],
  };
  const v = m[code];
  return v ? tx(v[0], v[1]) : code;
}

function Receipt({ receipt, svcTitle, noPapers, offline, onNew }: { receipt: CitizenSubmitResponse; svcTitle: string; noPapers: boolean; offline: boolean; onNew: () => void }) {
  const { tx, t } = useI18n();
  const msg = receipt.citizen_message;
  return (
    <div className="cz-receipt-wrap" id="cz-receipt">
      <div className="cz-receipt">
        <div className="cz-receipt-head">
          <Monogram text="SS" size={30} /> <b>{tx("Receipt (Public Service Guarantee)", "पावती (लोक सेवा गारंटी)")}</b>
        </div>
        <table className="cz-table">
          <tbody>
            <tr>
              <th>{tx("Application reference number", "आवेदन सन्दर्भ क्रमांक")}</th>
              <td className="mono">
                <b>{receipt.app_id}</b>
              </td>
            </tr>
            <tr>
              <th>{tx("Application date", "आवेदन दिनांक")}</th>
              <td>{fmtDate(receipt.submitted_at.slice(0, 10))}</td>
            </tr>
            <tr>
              <th>{tx("Service", "सेवा का नाम")}</th>
              <td>{svcTitle}</td>
            </tr>
            <tr>
              <th>{tx("Total fee paid", "कुल भुगतान शुल्क")}</th>
              <td>30.0 · eWallet</td>
            </tr>
            <tr>
              <th>{tx("Due date of service", "सेवा की नियत तिथि")}</th>
              <td>{fmtDate(receipt.sla_due)}</td>
            </tr>
            <tr>
              <th>{tx("Office", "कार्यालय")}</th>
              <td>{t(receipt.office)}</td>
            </tr>
            <tr>
              <th>{tx("Caste proof", "जाति का प्रमाण")}</th>
              <td>
                {receipt.proof
                  ? tx(`Family member's certificate No. ${receipt.proof.masked_no} (archive-verified)`, `परिवारजन का प्रमाण पत्र क्र. ${receipt.proof.masked_no} (अभिलेखागार से सत्यापित)`)
                  : noPapers
                    ? tx("No papers — unavailability declaration; Patwari inquiry requested (Rule 7)", "कागज़ नहीं — अनुपलब्धता घोषणा; पटवारी जांच का अनुरोध (नियम 7)")
                    : tx("Uploaded document", "अपलोड किया गया दस्तावेज़")}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="small">{tx("Note: if anyone asks for more than the valid fee, call 0771-4013758.", "नोट: यदि वैध शुल्क के अतिरिक्त अन्य किसी राशि की मांग की जाती है तो 0771-4013758 नंबर पर संपर्क करें।")}</p>
        <div className="cz-notrej">
          {noPapers
            ? tx("This is not a rejection. Not having old papers is recorded; the inquiry happens in your village.", "यह अस्वीकृति नहीं है। पुराने कागज़ न होना दर्ज है; जांच आपके गांव में होगी।")
            : tx("The officer decides within 22 days. You will get the reason for any decision in simple Hindi.", "अधिकारी 22 दिन में निर्णय लेंगे। हर निर्णय का कारण सरल हिंदी में मिलेगा।")}
        </div>
        <div className="cz-row" style={{ marginTop: 10 }}>
          <button className="cz-btn blue" onClick={() => window.print()}>
            🖨 {tx("Print", "प्रिंट")}
          </button>
          <button className="cz-btn outline" onClick={onNew} id="cz-new">
            {tx("New application", "नया आवेदन")}
          </button>
          {offline ? (
            <span className="small cz-warn">{tx("Offline demo: this sample receipt is not in the officer's queue.", "ऑफ़लाइन डेमो: यह नमूना पावती अधिकारी की सूची में नहीं है।")}</span>
          ) : (
            <Link className="cz-btn green" to={`/sewasetu/case/${encodeURIComponent(receipt.app_id)}`} id="cz-to-officer">
              {tx("Demo: open it as the SDO →", "डेमो: एसडीओ के रूप में खोलें →")}
            </Link>
          )}
        </div>
      </div>
      <div className="cz-receipt-msg">
        <p className="small muted" style={{ margin: "0 0 6px" }}>{tx("Message to the applicant", "आवेदक को संदेश")}</p>
        <WhatsAppPreview msg={msg} />
      </div>
    </div>
  );
}

function UpRow({ n, name, doc, code, uploads, setUploads, archive, generated, label, hide, note }: { n: number; name: string; doc: string; code: string; uploads: Set<string>; setUploads: (s: Set<string>) => void; archive?: string; generated?: boolean; label?: string; hide?: boolean; note?: string }) {
  const { tx } = useI18n();
  const has = uploads.has(code);
  if (hide && !archive) {
    return (
      <tr>
        <td>{n}</td>
        <td>{name}</td>
        <td>{doc}</td>
        <td>
          <input className="cz-in sm" disabled />
        </td>
        <td>
          <select className="cz-in sm" disabled>
            <option>{tx("Upload", "अपलोड")}</option>
          </select>
        </td>
        <td>
          <span className="cz-file">{tx("Choose File · No file chosen", "Choose File · No file chosen")}</span>
        </td>
        <td>
          <input type="checkbox" disabled />
        </td>
      </tr>
    );
  }
  return (
    <tr className={archive ? "archive" : generated ? "gen" : has ? "done" : ""}>
      <td>{n}</td>
      <td>{name}</td>
      <td>{doc}</td>
      <td>{archive ? <span className="mono">{archive}</span> : <input className="cz-in sm" disabled={generated} />}</td>
      <td>
        <select className="cz-in sm" disabled value={archive ? "archive" : generated ? "gen" : "upload"}>
          <option value="upload">{tx("Upload", "अपलोड")}</option>
          <option value="archive">{tx("Archive-verified", "अभिलेखागार से सत्यापित")}</option>
          <option value="gen">{tx("System generated", "स्वतः निर्मित")}</option>
        </select>
      </td>
      <td>
        {archive ? (
          <span className="cz-okchip">✓ {tx("Archive-verified — no file needed", "अभिलेखागार से सत्यापित — फ़ाइल आवश्यक नहीं")}</span>
        ) : generated ? (
          <span className="cz-okchip">{label ?? "✓ " + tx("Generated by the portal", "पोर्टल द्वारा निर्मित")}</span>
        ) : note ? (
          <span className="small muted">{note}</span>
        ) : has ? (
          <span className="cz-okchip">
            ✓ scan_{code}.pdf · 212 kb{" "}
            <button className="linkish" onClick={() => { const s = new Set(uploads); s.delete(code); setUploads(s); }}>
              ✕
            </button>
          </span>
        ) : (
          <span className="cz-file">
            {tx("Choose File · No file chosen", "Choose File · No file chosen")}{" "}
            <button className="cz-btn blue sm" onClick={() => setUploads(new Set([...uploads, code]))} id={`cz-up-${code}`}>
              UPLOAD
            </button>
          </span>
        )}
      </td>
      <td>
        <input type="checkbox" disabled />
      </td>
    </tr>
  );
}

/** "कौन से कागज़ चलेंगे?" — public guidance before applying (no data stored). */
function PapersGuide({ svcGroup, onStart }: { svcGroup: "scst" | "obc"; onStart: () => void }) {
  const { tx } = useI18n();
  const [fam, setFam] = useState<"yes" | "no" | "dk" | null>(null);
  const [doc, setDoc] = useState<"yes" | "no" | null>(null);
  const pathText =
    fam === "yes"
      ? tx("Path A — family certificate: in the form, the Family Proof Helper finds it. No old papers needed.", "रास्ता A — परिवार का प्रमाण पत्र: फ़ॉर्म में परिवार प्रमाण सहायक इसे खोज लेगा। पुराने कागज़ ज़रूरी नहीं।")
      : doc === "yes"
        ? tx("Path B — any ONE document from the list is enough as caste proof.", "रास्ता B — सूची का कोई एक कागज़ जाति के प्रमाण हेतु काफ़ी है।")
        : fam && doc === "no"
          ? tx("Path C — no papers: apply anyway. A declaration is generated and the Patwari enquires in your village (Rule 7).", "रास्ता C — कागज़ नहीं: फिर भी आवेदन करें। घोषणा बनेगी और पटवारी आपके गांव में जांच करेंगे (नियम 7)।")
          : null;
  return (
    <div className="cz-guide" id="cz-guide">
      <div className="cz-helper-head">
        <b>{tx("Which papers will work for me?", "कौन से कागज़ चलेंगे?")}</b>
        <span className="cz-tag">{tx("Praman Setu · new", "प्रमाण सेतु · नया")}</span>
      </div>
      <p className="small">{tx(`Has anyone in your family (father, grandfather, brother, sister) got ${svcGroup === "obc" ? "an OBC" : "a caste"} certificate before?`, `क्या परिवार में किसी (पिता, दादा, भाई, बहन) का ${svcGroup === "obc" ? "अ.पि.व." : "जाति"} प्रमाण पत्र पहले बना है?`)}</p>
      <div className="cz-chips">
        {(
          [
            ["yes", tx("Yes", "हाँ")],
            ["no", tx("No", "नहीं")],
            ["dk", tx("Don't know", "पता नहीं")],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={fam === k ? "on" : ""} onClick={() => setFam(k)}>
            {l}
          </button>
        ))}
      </div>
      {fam && fam !== "yes" && (
        <>
          <p className="small">{tx("Do you have any one: school leaving certificate with caste, Sarpanch certificate, Misal / Jamabandi?", "क्या इनमें से कोई एक है: जाति सहित शाला त्याग प्रमाण पत्र, सरपंच का प्रमाण पत्र, मिसल / जमाबंदी?")}</p>
          <div className="cz-chips">
            <button className={doc === "yes" ? "on" : ""} onClick={() => setDoc("yes")}>
              {tx("Yes", "हाँ")}
            </button>
            <button className={doc === "no" ? "on" : ""} onClick={() => setDoc("no")}>
              {tx("None", "कोई नहीं")}
            </button>
          </div>
        </>
      )}
      {fam === "dk" && <p className="small muted">{tx("Don't know? The Family Proof Helper in the form will search for you.", "पता नहीं? फ़ॉर्म में परिवार प्रमाण सहायक आपके लिए खोजेगा।")}</p>}
      {pathText && (
        <>
          <div className="cz-path">{pathText}</div>
          <button className="cz-btn green" style={{ marginTop: 8 }} onClick={onStart} id="cz-guide-start">
            {tx("Start the application →", "आवेदन शुरू करें →")}
          </button>
        </>
      )}
      <p className="small muted" style={{ marginTop: 6 }}>{tx("Guidance only, not a rejection · nothing is stored", "केवल मार्गदर्शन, अस्वीकृति नहीं · कुछ भी दर्ज नहीं होता")}</p>
    </div>
  );
}

function DemoStrip({ onPick }: { onPick: (k: "sunita" | "ramesh" | "rajni") => void }) {
  const { tx } = useI18n();
  return (
    <div className="cz-demostrip" id="cz-demostrip">
      <span className="small">{tx("Demo — fill as:", "डेमो — इस नागरिक से भरें:")}</span>
      <button className="cz-btn outline sm" onClick={() => onPick("sunita")} id="cz-demo-sunita">
        ✦ {tx("Sunita (family certificate found)", "सुनीता (परिवार का प्रमाण पत्र मिलेगा)")}
      </button>
      <button className="cz-btn outline sm" onClick={() => onPick("rajni")} id="cz-demo-rajni">
        {tx("Rajni (maiden village)", "रजनी (मायके का गांव)")}
      </button>
      <button className="cz-btn outline sm" onClick={() => onPick("ramesh")} id="cz-demo-ramesh">
        {tx("Ramesh (no papers)", "रमेश (कोई कागज़ नहीं)")}
      </button>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const { tx } = useI18n();
  const steps = [tx("Service", "सेवा"), tx("Aadhaar", "आधार"), tx("Application", "आवेदन"), tx("Attachments", "अनुलग्नक"), tx("Preview", "पूर्वावलोकन"), tx("Fee", "शुल्क"), tx("Receipt", "पावती")];
  return (
    <ol className="cz-steps" aria-label={tx("Steps", "चरण")}>
      {steps.map((s, i) => (
        <li key={s} className={i === step ? "on" : i < step ? "done" : ""}>
          <span>{i < step ? "✓" : i + 1}</span> {s}
        </li>
      ))}
    </ol>
  );
}
const TitleBand = ({ children }: { children: ReactNode }) => <div className="cz-title">{children}</div>;
const Band = ({ children }: { children: ReactNode }) => <div className="cz-band">{children}</div>;
const Ribbon = ({ children }: { children: ReactNode }) => <div className="cz-ribbon">{children}</div>;
function Field({ label, req, wide, children }: { label: string; req?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`cz-field ${wide ? "cz-wide" : ""}`}>
      <span className="cz-flabel">
        {label}
        {req && <span className="cz-req"> *</span>} :
      </span>
      {children}
    </label>
  );
}
function KV({ rows }: { rows: [string, string][] }) {
  return (
    <table className="cz-table cz-kvt">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th>{k}</th>
            <td>{v || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
