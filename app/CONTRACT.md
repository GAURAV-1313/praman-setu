# Praman Setu: Demo App Contract (backend ↔ frontend)
This is the single source of truth. Both sides build to it. If you must change it, change this file.

**Ground rules**
- **Offline demo.** No auth (mock role picker), no external network calls at runtime, no cloud LLM.
- **Ports:** backend FastAPI on `http://localhost:8000`, frontend Vite on `http://localhost:5173`, proxy `/api` → 8000.
- **Bilingual.** Every user-facing text field comes as `{en, hi}`. The frontend has an EN/HI toggle and defaults to **hi**.
- **All person data is SYNTHETIC.** The MIS dashboard data is REAL (Sewa Setu public MIS, fetched 27-09-2026).
- **The officer always decides.** There is no auto-reject and no bulk approve anywhere.
- **Lanes** (neutral language, never "fraud", never red):
  - `records_complete`: a family certificate is verified and the data agrees
  - `standard_review`: no records found. **Neutral**; the officer works as today
  - `needs_attention`: an internal inconsistency or a validity problem
- **Suggested actions:** `approve` | `send_back` | `refer` (to the SDO or scrutiny committee). Rejection stays possible only as the officer's own action (`reject`), and it requires written findings.
- **Roles:** `kendra_operator`, `sdo` (permanent SC/ST/OBC caste certificates), `tehsildar` (domicile, temporary caste), `collector`.

---

## Types (TypeScript notation)
```ts
type I18n = { en: string; hi: string };
type Lane = "records_complete" | "standard_review" | "needs_attention";
type Service = "caste_st" | "caste_sc" | "caste_obc" | "domicile";
type Role = "kendra_operator" | "sdo" | "tehsildar" | "collector";

interface Certificate {            // an archived Sewa Setu/e-District certificate (SYNTHETIC)
  cert_no: string;                 // e.g. "CG/KDG/SDO/2019/004512"
  service: Service;
  cert_type: "permanent" | "temporary";
  category: "ST" | "SC" | "OBC" | null;   // null for domicile
  caste_name: I18n | null;               // e.g. {en:"Gond", hi:"गोंड"}; null for domicile
  holder_name: I18n; father_name: I18n;
  gender: "M" | "F"; birth_year: number;
  village: I18n; village_lgd: number; tehsil: I18n; district: I18n; district_lgd: number;
  issue_date: string;              // ISO date
  issuing_authority: I18n;         // e.g. {en:"SDO (Revenue), Kondagaon", hi:"अनुविभागीय अधिकारी (राजस्व), कोंडागांव"}
  authority_role: "SDO" | "Tehsildar" | "Collector" | "Addl. Collector";
  status: "active" | "cancelled" | "under_scrutiny";
  qr_verified: boolean;            // simulated QR/e-sign check
}

interface WeightItem {             // one bar in the explainable "match-weight waterfall"
  field: string;                   // "father_name" | "surname" | "village" | "birth_year_gap" | "tehsil" | ...
  label: I18n;                     // "Father's name ↔ certificate holder"
  comparison: I18n;                // human text, e.g. "Jaro-Winkler 0.96 (रामलाल ↔ Ram Lal)"
  level: string;                   // comparison level name from the model, e.g. "jw>=0.92"
  weight: number;                  // log2(m/u) match weight; + supports match, − against
}

interface ValidityCheck { code: string; ok: boolean; label: I18n; detail: I18n }
// codes: "permanent", "competent_authority", "not_cancelled", "qr_verified", "category_consistent"

interface LineageMatch {
  certificate: Certificate;
  relation: "father" | "sibling" | "paternal_grandfather" | "paternal_uncle";
  relation_label: I18n;
  match_probability: number;       // 0..1 from the learned model
  match_level: "exact" | "possible";   // exact ≥ 0.95, possible 0.60–0.95 (below 0.60 not shown)
  prior_weight: number;            // model prior (log2 odds)
  weights: WeightItem[];           // sums with prior_weight to the final log2 odds
  validity: ValidityCheck[];
  usable_as_evidence: boolean;     // match_level=="exact" && all validity ok
}

interface EvidenceRow {            // other registries (MOCKED, Phase 2)
  source: I18n;                    // "Bhuiyan land record (mock)", "Khadya ration roster (mock)"
  field: I18n; value: I18n;
  status: "ok" | "warn" | "info";
  note?: I18n;
}

interface Flag { code: string; severity: "attention" | "info"; title: I18n; explanation: I18n; cert_nos?: string[] }

interface ChecklistItem { code: string; label: I18n; required: boolean; present: boolean; satisfied_by?: I18n }

interface Deficiency { code: string; text: I18n }   // specific, curable gap for send-back

interface Application {
  app_id: string;                  // "SS/2026/KDG/08812"
  service: Service; service_label: I18n;
  applicant_name: I18n; father_name: I18n; mother_name: I18n;
  gender: "M" | "F"; birth_year: number;
  claimed_category: "ST" | "SC" | "OBC" | null; claimed_caste: I18n | null;
  village: I18n; village_lgd: number; tehsil: I18n; district: I18n; district_lgd: number;
  purpose: I18n;                   // "Post-matric scholarship"
  submitted_at: string; sla_due: string; kendra: I18n;
  routed_to: Role;                 // role-aware routing: permanent caste → sdo; domicile → tehsildar
  status: "pending" | "approved" | "sent_back" | "referred" | "rejected";
  documents: { code: string; label: I18n; uploaded: boolean }[];
  persona_note?: I18n;             // demo storyline hint, shown small
}

interface Analysis {
  app_id: string;
  lane: Lane; lane_reason: I18n;
  suggested_action: "approve" | "send_back" | "refer";
  suggested_action_reason: I18n;
  lineage_matches: LineageMatch[];         // sorted by probability desc
  evidence_rows: EvidenceRow[];
  flags: Flag[];
  checklist: ChecklistItem[];
  deficiencies: Deficiency[];
  draft_order: I18n;                        // template-bound; cites records only (cert no, Rule 3(3))
  model_version: string; rules_version: string;
  legal_basis: I18n[];                     // e.g. CG Social Status Certificate Rules 2013 r.3(3); CG HC 22-07-2026
}

interface QueueItem { application: Application; lane: Lane; suggested_action: string; top_match_probability: number | null }

interface CitizenMessage {
  channel: "whatsapp" | "sms";
  text: I18n;                        // plain-language, short
  generator: "template" | "llm";     // demo uses "template"
  checker: { passed: boolean; unsupported_entities: string[]; checked_entities: string[] };
}

interface AuditEntry { ts: string; actor_role: Role; actor: string; action: string; app_id?: string; records_accessed: string[]; note?: string }
```

---

## Endpoints
| Method & path | Body / query | Returns |
|---|---|---|
| `GET /api/health` | — | `{ok:true, model_version, synthetic_population:number, archive_certificates:number}` |
| `GET /api/queue?role=sdo` | role | `QueueItem[]` (only apps routed to that role; pending first) |
| `GET /api/applications/{app_id}` | (app_id is URL-encoded because it has slashes) | `{application: Application, analysis: Analysis}` |
| `POST /api/applications/{app_id}/confirm-relationship` | `{cert_no}` | updated `{application, analysis}`; confirming an exact, valid match can move the lane to `records_complete` and the suggested action to `approve` |
| `POST /api/applications/{app_id}/decision` | `{action:"approve"\|"send_back"\|"refer"\|"reject", officer_name, order_text: I18n, deficiency_codes?: string[], findings?: string}` (`reject` requires non-empty `findings`, else 422) | `{application, citizen_message: CitizenMessage, audit: AuditEntry}` |
| `POST /api/precheck` | `{service, applicant_name, father_name, village_lgd?:number, village_name?:string, district_lgd?:number, birth_year?:number, claimed_category?:string, relative_cert_no?:string}` | `{matches: LineageMatch[], checklist: ChecklistItem[], summary: I18n, suggestion: I18n}` (live model scoring against the synthetic archive) |
| `GET /api/villages?district_lgd=…&q=…` | autocomplete | `[{village_lgd, name:I18n, tehsil:I18n}]` (max 20) |
| `GET /api/mis/summary` | — | REAL. `{source:I18n, fetched:"2026-09-27", period:{from,to}, totals:{applications, approved, rejected, pending, pending_beyond_sla, on_time_pct}, services:[{key, label:I18n, total, rejected, rejection_pct_decided, share_of_volume, share_of_rejections}], districts:[{lgd, name:I18n, division, total, approved, rejected, pending, pending_beyond, rejection_pct}]}` |
| `GET /api/geo/districts` | — | GeoJSON FeatureCollection (33 districts, properties include lgd_code, district, name_hi, mis_rejection_rate_pct) |
| `GET /api/pilot/stats` | — | SYNTHETIC pilot panel: `{lane_mix:{records_complete, standard_review, needs_attention}, sendback_cure_rate, officer_agreement_rate, median_minutes:{before, after}, exclusion_guard:[{group:I18n, rejection_pct_pilot, rejection_pct_control}]}` |
| `GET /api/eval` | — | model evaluation: `{model:"Splink Fellegi–Sunter (EM)", test_set:{pairs, positives, description:I18n}, thresholds:{exact, possible}, overall:{precision, recall, f1}, slices:[{name:I18n, n, precision, recall}], weights_learned:[{comparison, level, m, u, weight}]}` |
| `GET /api/audit` | — | `AuditEntry[]` newest first |
| `POST /api/reset` | — | restores the demo state; `{ok:true}` |

**Errors:** `{detail: string}` with the proper HTTP code.

---

## Demo cases (IDs are fixed; all SYNTHETIC; district Kondagaon unless noted)
| app_id | Role | Story | Expected lane / suggestion |
|---|---|---|---|
| `SS/2026/KDG/08812` | sdo | **Sunita Markam** (F, 18, ST, Gond). Post-matric scholarship. No pre-1950 record uploaded. Her **father Ramlal Markam holds a permanent ST certificate (SDO Kondagaon, 2019, active)**. The archive spells it "Ram Lal Markaam", with Hindi on one side and English on the other. | `standard_review` → after confirm-relationship → `records_complete`, approve. **Hero case** |
| `SS/2026/KDG/08790` | sdo | **Rohit Netam** (M, 20, ST). **Elder sister holds a permanent ST certificate (2021)**. Sibling match, exact. | `records_complete`, approve |
| `SS/2026/KDG/08835` | sdo | **Pooja Sahu** (F, 19, OBC). No lineage hit. The affidavit is uploaded but the father's name differs from the ration roster (mock) ("Shyamlal" vs "Shyam Lal Sahu": OK) … **and the caste-proof document is missing**. | `standard_review`, send_back with deficiency "attach caste proof (school record / Sarpanch certificate / family member's certificate)" |
| `SS/2026/KDG/08841` | sdo | **Kiran Dhruw** (M, 22) claims ST. **Brother's certificate (2020) records category OBC.** | `needs_attention`, refer. Flag "category differs from a sibling's certificate". Category labels only, neutral wording |
| `SS/2026/KDG/08856` | sdo | **Meena Kashyap** (F, 17) claims ST. Father-match found, but **the father's certificate is CANCELLED (scrutiny committee, 2024)**. | `needs_attention`, refer. Anti-laundering case |
| `SS/2026/KDG/08863` | sdo | **Anil Sori** (M, 24) claims ST. Father's certificate is permanent but **issued by a Tehsildar (2017)**. The competent-authority check is ⚠ (CG HC Jul 2026). | `needs_attention`, refer / verify |
| `SS/2026/KDG/08870` | sdo | **Ramesh Yadav** (M, 21, OBC). **First-generation applicant who migrated within CG (from Bemetara)**. No records. All documents present. | `standard_review` (neutral), approve-as-usual after normal scrutiny. **Must not look suspicious** |
| `SS/2026/KDG/08902` | tehsildar | **Lakshmi Verma** (F, 26) domicile. Father's domicile certificate (2018) matched; residence evidence rows OK (mock Bhuiyan + ration). | `records_complete`, approve |

**Kendra pre-check demo inputs** (must return an exact match):
- service `caste_st`, applicant "Sunita Markam", father "Ramlal Markam", village = the Sunita case village (Kondagaon), which returns the father's certificate.
- Also an example with no match (a neutral message plus the document checklist).

---

## Frontend screens (inspired by the CSC operator UI: cream background, orange primary, blue nav, rounded cards, pills)
1. `/`: role picker (mock login cards: Kendra Operator / SDO (Revenue) / Tehsildar / Collector). Top bar with the EN/HI toggle. Footer: "Demo · synthetic citizen data · real Sewa Setu MIS".
2. `/kendra`: pre-check form plus results (match card, checklist).
3. `/officer?role=sdo|tehsildar`: queue table with lane chips.
4. `/officer/case/:appId`: case view:
   - application summary
   - lineage match (side by side, weight waterfall, validity ticks, small family graph)
   - evidence rows
   - flags
   - checklist
   - action panel: suggested action, editable draft order (HI/EN tabs), confirm relationship, sign (modal "आप निर्णय ले रहे हैं / You are making this decision")
   - after the decision, a WhatsApp phone-preview of the citizen message with a "✓ checked" badge
5. `/collector`: REAL MIS dashboard:
   - KPI tiles
   - the "22% of volume, 61% of rejections" chart
   - district choropleth plus table
   - pilot panel (SYNTHETIC badge)
   - evaluation panel
6. `/audit`: audit log table.

Persistent banner on the Kendra/officer screens: **"SYNTHETIC DEMO DATA · नमूना डेटा"**. On the collector MIS section: **"REAL · Sewa Setu public MIS · fetched 27-09-2026"**.

---

## Backend implementation notes (added by the backend build, 27-09-2026)
All changes are **additive** (extra optional fields); no existing field was renamed or removed.
- **Hero village:** Sunita Markam lives in **Bayanar (LGD 448703)**, Kondagaon tehsil (unique name in the district). Rohit Netam is in Kongera (448656). Hero certificate: `CG/KDG/SDO/2019/004512` ("Ram Lal Markaam", SDO Kondagaon, 14-03-2019). Pre-check with `village_lgd: 448703` (or `village_name: "Bayanar", district_lgd: 643`) returns it as `exact`, with or without `birth_year`.
- `Application.declared_relative_cert_no?: string`: a family certificate number the applicant declared at the Kendra. A declared certificate that matches exactly and passes validity counts as evidence without a separate confirmation (Rohit, Lakshmi, Anil). A certificate the system *finds* needs the officer's `confirm-relationship` first (Sunita).
- `Certificate.status_note?: I18n`: why a certificate is cancelled (e.g. "Cancelled by the District Verification (Scrutiny) Committee, 2024").
- Lineage evidence is like-for-like: caste applications only use caste certificates, domicile applications only domicile certificates.
- `GET /api/applications/{app_id}?role=sdo`: `role` is optional and only labels the "case_opened" audit entry.
- `POST .../confirm-relationship` with a `cert_no` that is not among the case's lineage matches → **400**. `POST .../decision` with `send_back` and no deficiency (none suggested and no `deficiency_codes`) → **422**.
- `GET /api/villages` items also carry `district_lgd`.
- `GET /api/mis/summary`: `period.from` is `null` (the public MIS is cumulative since launch) and `period.label: I18n` explains it. Extra fields: `on_time_note: I18n` (on_time_pct = MIS 30-day SLA compliance), `caste_combined: {total, rejected, share_of_volume, share_of_rejections}` (= **22.2% of volume, 61.9% of rejections**), and each service also has `approved, pending, department, is_caste`. `services` are sorted by volume (112 rows; use the top N).
- `GET /api/eval`: extra `model_version, overall_possible, relation_correct_at_exact, blocking_recall, honesty_note: I18n`; each slice also has `positives, precision_possible, recall_possible`. Values can be `null` when undefined.
- `GET /api/pilot/stats`: extra `synthetic: true, note: I18n`. `lane_mix` is computed from the live demo queue; the other numbers are illustrative.

---

## Round 1 changes (27-09-2026, officer-workflow round)
All additive; no field was renamed or removed. The frontend fixtures were re-exported (`uv run python scripts/export_fixtures.py`), so offline mode has the same fields.

**`Analysis` new fields**
- `confirmed_cert_nos: string[]`: certificates the officer confirmed (from backend state). This is the only source for "confirmed by you"; there is no browser storage. `POST /api/reset` clears it.
- `accepted_cert_nos: string[]`: certificates relied on as evidence, meaning confirmed ones plus declared-and-matched ones.
- `evidence_summary: I18n` and `evidence_rank: 0|1|2|3`:
  - the summary is the one-line reason shown in the queue, e.g. "Father's certificate found · 98% · confirm relationship"
  - rank: 0 = records complete, 1 = found and awaiting confirmation, 2 = standard review, 3 = needs attention
- `finding_required: {approve, send_back, refer, reject: I18n|null}`: the reason a written finding (≥ 15 characters) is required for that action, or null. Rules:
  - `reject`: always required.
  - `approve`: required while an attention flag or an unconfirmed usable match is open, or when approve is not the suggestion.
  - `refer`: required when refer is not the suggestion.
  - `send_back`: never required, because the ticked reasons are the grounds.
- `refer_to: "patwari"|"scrutiny_committee"|"sdo"` is the suggested destination:
  - a cancelled parent certificate or a category mismatch → `patwari` (field report, Rule 8 enquiry)
  - a Tehsildar-issued or under-scrutiny certificate → `scrutiny_committee`
- `refer_options: {code, label: I18n}[]`: SDO gets patwari and scrutiny_committee. Tehsildar gets patwari and sdo, plus scrutiny_committee for caste services.
- `refer_drafts: {[code]: I18n}`: a server-rendered reference note for each destination.
- `sendback_reasons: {code, text: I18n, suggested: boolean}[]`: the standard send-back reason library for the service, with the engine's deficiencies first (`suggested: true`).

**`LineageMatch` new fields**
- `validity_headline: I18n|null` and `validity_severity: "fail"|"review"|null`: the most important validity problem, phrased as the card title. Examples:
  - "Father's certificate CANCELLED (2024) — cannot be used as proof"
  - "Issued by Tehsildar (2017) — competence under review after CG HC Jul 2026; verify"

**`ValidityCheck.severity?: "fail"|"review"`**
- Set on failed checks only.
- A permanent caste certificate issued by a Tehsildar **before 22-07-2026** is `ok:false, severity:"review"`, meaning policy pending and verify first. It is not called "not competent", it is still not `usable_as_evidence`, and it never ticks the caste-proof checklist item.

**`ChecklistItem.note?: I18n` and `state?: "pending"|"blocked"`**
- `pending` means a found certificate is awaiting the officer's confirmation.
- `blocked` means a family certificate is on file but cannot be relied on.
- Neither state ticks the item.

**`Application.sendback_count: number`**
- How many times the application was sent back before. It defaults to 0; SS/2026/KDG/08842 starts at 1 so the demo shows it.
- It is incremented by a `send_back` decision.

**`QueueItem` new fields**
- `evidence_summary`, `evidence_rank`, `sla_days_left` (calendar days, IST, negative = overdue) and `sla_urgent` (≤ 3 days).
- Queue order:
  1. pending first
  2. SLA-urgent first, whatever the lane
  3. `evidence_rank`
  4. `sla_due`

**`POST /decision` changes**
- New optional body fields:
  - `refer_to` must be one of `refer_options`; it defaults to the suggested destination.
  - `custom_deficiency` is the officer's own send-back reason, added to the ticked ones.
- **422 when:**
  - a required finding is missing or shorter than 15 characters (see `finding_required`)
  - the order text still contains a placeholder, matched by `/\[\s*(\.{3,}|…)|\[\s*(Officer|अधिकारी|written findings|लिखित|specify|आवश्यक दस्तावेज़)|_{4,}/`
  - `refer_to` is invalid
- **409** when the application has already been decided.
- The response also carries `document_kind: "order"|"notice"|"reference"`. A send-back is a **notice** to the applicant, not an e-signed order.

**Drafts and templates**
- Orders carry no blank slots.
  - An approval states a record-backed finding: how the relationship was accepted and the certificate's validity.
  - The date is filled with today's date (IST).
  - Rule 3(3) is cited only when a relative's certificate is relied on (or awaiting confirmation).
  - Rule 15(2) is no longer cited in orders; it appears only as a UI note.
  - Mock registry rows are listed as "Other records seen (not relied upon)".
- The "no family record" info flag was removed, because absence is shown once, neutrally, on the lineage card.
- Cancelled-certificate and category-differs flags now name the same destination as the suggestion (Patwari field report, Rule 8 enquiry).

**Audit**
- `case_opened` is de-duplicated, so the same role opening the same app within 3 s logs one entry.

---

## Round 2 changes (27-09-2026, legal defensibility and automation-bias round)
All additive; nothing renamed or removed except that `confirm-relationship` now records grounds. Fixtures re-exported.

**New endpoints**
| Method & path | Body | Returns |
|---|---|---|
| `POST /api/applications/{id}/confirm-relationship` | `{cert_no, grounds?: string[], note?, officer_name?}` — grounds from `analysis.grounds_catalogue.same` (default: the record's `default_grounds`) | `{application, analysis}` |
| `POST /api/applications/{id}/reject-match` | `{cert_no, grounds: string[], note?, officer_name?}` ("not this family"; needs ≥1 ground or a 10+ char note) | `{application, analysis}` — the record leaves the evidence, its flags close, the lane is re-evaluated |
| `POST /api/applications/{id}/clear-match` (also `DELETE …/confirm-relationship?cert_no=`) | `{cert_no}` | undo either act; 409 once the case is not pending |
| `POST /api/applications/{id}/decision` | new `action: "show_cause"`; new optional `evidence_basis {caste, residence}`, `system_text: I18n`, `time_on_screen_s`, `read_confirmed` | also `document_no`, `issued_text: I18n`; `document_kind` may be `"show_cause"` |
| `POST /api/applications/{id}/show-cause-reply` | `{outcome: "reply_received"\|"no_reply", summary?}` (demo simulation) | `{application, analysis}`; status back to `pending` |
| `POST /api/applications/{id}/callback` | `{reason (≥10 chars), officer_name?}` | within 10 min of the decision / notice: status back to `pending`, audit `decision_called_back`; 409 after the window |
| `GET /api/applications/{id}/issued` | — | `{document_no, document_kind, text: I18n, ts, snapshot}` |

**Decision rules (422 unless met)**
- `reject` needs a completed show-cause (`analysis.show_cause.reply`) — issue `show_cause` first (15 days to reply).
- `approve` needs every possible (0.60–0.95) record disposed of (`analysis.disposition_required == []`).
- `approve` on standard review (`analysis.evidence_required`) needs `evidence_basis` from `analysis.evidence_options`.
- The signed text is finalised by the server: draft header removed; title, number (`{office_code}/[REF|NTC|SCN/]{yyyy}/{seq}`), date and place stamped; "(e-signature)" replaced; Hindi marked authoritative.

**`Application`**: `status` may be `"show_cause_issued"`; `declared_source?: "applicant"|"kendra_search"` (only `applicant` auto-accepts a declared certificate).

**`LineageMatch`**: `disposition: {decision: "same"|"not", grounds, note, ts}|null`, `declared`, `kendra_attached`, `default_grounds`. `ValidityCheck` code `issue_date_valid` (issue date not after the application / today). Competence is tested only for permanent certificates.

**`Flag`**: `order_point?: I18n` — neutral text rendered into references / notices (the `explanation` stays officer-facing). New codes `possible_conflicting_record` (attention), `issue_date_after_application` (attention).

**`ChecklistItem`**: new items `family_tree` (Rule 3(3), not required; `state: "not_on_file"` when absent) and `father_income` (OBC, required).

**`Analysis`**: `office`, `office_info {designation, office, place, code, jurisdiction}` (Tehsildar → tehsil; SDO → sub-division map [verify]), `dismissed_cert_nos`, `disposition_required`, `grounds_catalogue`, `evidence_required`, `evidence_options {caste, residence}`, `approve_drafts {"caste|residence": I18n}`, `drafts {approve, show_cause, reject}` (show-cause / reject carry the placeholder `[Officer: write your finding in the box above]` that the client fills), `adverse_cert_nos`, `show_cause`, `officer_segments` (officer-authored sentences, for the signing dialog's highlighting), `authoritative_lang: "hi"`. `finding_required.show_cause`.

**`AuditEntry`**: optional `snapshot` (what the screen showed: model/rules versions, lane, suggestion, matches with level/probability/validity/disposition, open flags, checklist, evidence basis, show-cause, system/signed text hashes, `edited`, `read_confirmed`, `time_on_screen_s`) and `document_no`. The note no longer says "Suggested vs decided".

**Statute** (every order): "Chhattisgarh Scheduled Castes, Scheduled Tribes and Other Backward Classes (Regulation of Social Status Certification) Act, 2013 and Rules, 2013" / "छत्तीसगढ़ अनुसूचित जाति, अनुसूचित जनजाति और अन्य पिछड़ा वर्ग (सामाजिक प्रास्थिति के प्रमाणीकरण का विनियमन) अधिनियम, 2013 एवं नियम, 2013"; s.4, s.5 (30-day appeal to the Appellate Authority), s.15, r.3(3), r.7/8.

## Round 4 changes (27-09-2026, "inside Sewa Setu" + officer-at-scale round)
- **Policy setting** `GET/POST /api/policy` `{tehsildar_issued_permanent: "valid_with_note" | "verify"}` (default `valid_with_note`; audit `policy_changed`; reset restores the default). Under the default, a permanent caste certificate issued by a Tehsildar before 22-07-2026 passes `competent_authority` with `severity: "note"`, raises an info flag `tehsildar_issued_note`, and the order's facts carry a one-line policy note. `verify` restores the old "review" behaviour, and the headline names the policy.
- **Wrong-authority guard** `analysis.competence = {ok, forward_to, forward_label, message}`. A permanent caste application on the Tehsildar desk returns `ok: false`; `POST …/decision` answers 409; `POST /api/applications/{id}/forward` moves it to the SDO (audit `forwarded_wrong_authority`). Seeded demo file: `SS/2026/KDG/08915` (created on reset, Tehsildar queue).
- **Patwari request** `analysis.patwari_form` = halka (synthetic, derived from LGD) + pre-filled vanshavali rows (`source`: application / record / ration / oral) + fields caste / land / income / relation. `refer` → `patwari` sets status **`awaiting_patwari`**, stores `decisions[app].patwari`, and the queue item gets `stage: {kind: "patwari", day, of: 7, halka, report_by, overdue}` (also `kind: "show_cause"`). `finding_required.refer` is now always `null`.
- **Decision body**: `channel: "praman" | "sewasetu_native"`, `tool_visible`, `shadow`. Native channel (the console's own Approve / Reject / Sendback) skips the tool-only steps (evidence picker, disposition); reject still needs a show-cause first; approving over an open attention point that was visible needs remarks ≥ 15 chars. Snapshot adds `channel`, `shadow_mode`, `tool_shown_before_decision`, `hidden_before_decision`, `esign_txn`, `tool_feedback`. Response adds `tool_check {suggested_action, lane, agrees, reason}` and `patwari`.
- **Tool feedback** `POST /api/applications/{id}/tool-feedback {useful: yes|no|wrong_family}` (after a decision; audit `tool_feedback`; never an officer metric).
- **Sign tray** `GET /api/tray`, `POST /api/tray/add {app_id, decision}`, `POST /api/tray/remove`, `POST /api/tray/sign {otp}` (6 digits, mock). Only records-complete approvals with no open point, opened (audit `case_opened`) and read (`read_confirmed`), one desk, max 5. Each order gets its own number, text and snapshot; all share one `esign_txn`.
- **Audit search** `GET /api/audit?q=004512` — rows whose records, application no. or document no. contain `q`.
- **Collector** `GET /api/collector/tiles` (awaiting Patwari, show-cause pending, camp rejection 41.3% vs 19.0% from the real MIS, tool-disagreement files, tool feedback). `GET /api/pilot/stats` now returns `targets` (target + stop rule) and no officer-level or "result" fields.
- **Data minimisation**: registry rows are minimised on load (ration card → `••••1234`; no khasra number/area). Citizen messages carry a "records used / seen" line and a grievance route (entity checker passes). Hindi village labels keep digits and are unique within a district (LGD code appended on collision; curated overrides for demo villages).
- **Frontend routes**: `/sewasetu/case/:appId` (illustrative console mock, outside the main layout), `/sewasetu` → 08790. Shadow mode is a global toggle (`ps_shadow`, `?shadow=1`).
- **Fixtures**: `policy_verify_cases.json`, `forward_overrides.json`; the mock implements every new endpoint offline.
- **Console alignment (Round 4b):**
  - Recreated from the public Aug-2026 Sewa Setu Government-Login walkthrough (`research/07_sewasetu_officer_side.md`).
  - The native decision is: radios अस्वीकृत / आवेदक को वापस भेजें / अनुमोदित, a 200-character टिप्पणी, and an upload of the reasoned order as a PDF (≤256 KB).
  - Signing is by DSC token (Sign PDF). The sign tray uses one token passcode; the `otp` field name is unchanged.
  - The applicant-facing pre-rejection notice is now "पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर)", with numbers `…/HRG/…`. The action code `show_cause` is unchanged.

## Round 7 changes (28-09-2026, native / maiden village search)
All additive; with the new field absent every existing response is byte-identical (tested on all 36 files, the pre-check examples and the eval slices).
- **`POST /api/precheck`**: optional `native_village_lgd: number`. The same lineage search also runs against that village (its tehsil and district); results are merged and de-duplicated per certificate. A record only the native search surfaced (or that it scored higher) carries `found_via: "native_village"` and `found_via_note: I18n`. Unknown code → 422. The audit note names the native village.
- **`POST /api/applications/{id}/search-native-village`** `{village_lgd: number|null, officer_name?}` → `{application, analysis}`. Re-runs lineage matching with the extra village; `null` clears it. Audit `native_village_searched` (records_accessed = records found there, `native_village_lgd`) / `native_village_search_cleared`. 409 if not pending, or if a record found by an earlier native search already has a disposition (undo first); 422 for an unknown code or the applicant's current village.
- **`Analysis.native_village?`** `{village_lgd, village, tehsil, district, district_lgd, found_cert_nos, note: I18n}` — present only after a native search. **`LineageMatch.found_via?` / `found_via_note?`** — present only on native-found records. Safeguards unchanged: a found record still needs "same family / not this family"; the "same father & village" ground is offered when the record is in the stated native village, and the order sentence says so ("… प्रमाण पत्र आवेदिका के मायके / मूल गांव (…) का है; वर्तमान निवास …").
- **`GET /api/villages`** items also carry `district: I18n` (the native-village picker searches the whole state).
- **`GET /api/eval`**: a 6th slice `key: "women_native_village"` (with `note`) and `native_village_search {women, married_women: {before, after: {exact, possible}}, women_queries_with_native_search, assumption}`. The first five slices are unchanged.
- **Demo file `SS/2026/KDG/08925`** (SDO Kondagaon desk, seeded on reset by `backend/seed_round7.py`; generator outputs untouched): Rajni Korram (F, 1999, ST Muria) applies from her husband's village Masora (448686). Her father Jaglu Usendi's permanent ST certificate `CG/NRP/SDO/2017/003186` (SDO Narayanpur, 12-06-2017) is registered in her maiden village Garhbengal (449687, Narayanpur). Normal search: no record (standard review, send back). Native search → exact father match → C → records complete.

## Round 8b changes (29-09-2026, second service on the same engine + visible agent trace)
All additive. Caste/domicile rules (`rules.py`) are untouched; income renewal lives in its own module (`backend/renewal.py`).

**`Analysis.trace?: TraceStep[]`** (added by `api.State.analysis`; `engine.analyse()` output is unchanged, it only fills an optional `timings` dict)
```ts
interface TraceStep { step: number; code: "read"|"search"|"match"|"rules"|"draft"|"officer";
  status: "ok"|"attention"|"waiting"; ms: number|null; title: I18n; detail: I18n;
  count?: number /* search: candidate certificates */; passed?: number; total?: number /* rules: validity checks */; model_version?: string }
```
Six steps from real data: ① read the application → ② blocking by village/tehsil LGD (+ district surname, name) → N like-for-like candidates of the archive → ③ model score of the top record (attention while a record awaits "same family / not this family") → ④ validity checks passed/total + checklist, attention flags and gaps → ⑤ draft kind (order / notice / reference) → ⑥ always `waiting` for the officer (the frontend shows it as done once the file is decided). Timings are measured when the analysis is computed (cached per file).

**Income-certificate renewal (SYNTHETIC; nothing is issued)**
| Method & path | Body / query | Returns |
|---|---|---|
| `GET /api/renewals?district_lgd=643&window=60` | `window` 1–90 (UI uses 30 / 60); unknown district → 422 | `{district_lgd, district, as_of, window_days, counts {d30, d60, strong, partial, verify}, items: RenewalItem[], districts, context {income_share_of_volume (REAL MIS 48.98), note}, roadmap [{code: legal_heir|ews, label, note}], synthetic: true}` |
| `POST /api/renewals/{cert_no}/prefill` | — (cert_no keeps its slashes) | `RenewalRecord` (idempotent until reset; audit `renewal_prefilled`, records = cert no + Khadya + Bhuiyan); unknown → 404 |

- `RenewalItem {certificate: IncomeCertificate, days_left, window: 30|60, evidence: EvidenceRow[3] (last year's certificate, Khadya ration category, Bhuiyan land holding), rule_flags [{code, label}], strength: strong|partial|verify, strength_label, strength_reason, renewal_id|null}`.
- `IncomeCertificate`: `cert_no` `CG/{DIST}/TSL/INC/{yyyy}/{seq}`, `service: "income"`, holder/father, place (LGD), `annual_income`, `annual_income_text`, `income_sources`, `issue_date`, `valid_until` (= issue + 364 days), Tehsildar authority, `synthetic: true`. Derived deterministically from the synthetic population (1 in 100 adults, one per family; expiries 1–90 days from today); Ramlal Markam (Bayanar, Sunita's father) is pinned at 12 days.
- `strength`: `verify` when the starter rule file `data/rules/income_certificate.starter.jdm.json` (placeholder thresholds) fires; `partial` when the ration category or land holding changed since last year; else `strong`.
- `RenewalRecord {renewal_id "REN/{DIST}/{yyyy}/{seq}", status: "awaiting_citizen_confirmation", fields [{label, value, source}], evidence_reused, rule_flags, strength…, citizen_confirmation {required: true, confirmed: false, statement, note}, officer_step {required: true, auto_issue: false, office, note}, nudge: CitizenMessage & {status: "preview", status_note}, rule_file, synthetic}`.
- Nudge: template `templates/renewal_nudge.{hi,en}.j2`, checked by the same entity checker (`check_entities(..., vocab_pattern="renewal_nudge.*.j2")`; the decision-message vocabulary is unchanged).
- `POST /api/reset` also clears pre-filled renewals.
- Frontend: route `/renewals` (nav "नवीनीकरण"), landing strip "एक इंजन, कई सेवाएँ", Audit label `renewal_prefilled`. Offline: fixtures `renewals.json`, `renewal_prefill.json`.

## Round 8a changes (29-09-2026, family graph + human-in-the-loop learning; all SYNTHETIC)
Additive only; see `app/iterations/round8a_changes.md`.
- `GET /api/graph/family/{app_id}?role=` → `{app_id, family_id, applicant, lane, nodes[{id, kind: person|applicant|cert|application, label: I18n, rel?, rel_label?, gen?, birth_year?, in_register?, name_only?, cert_no?, category?, status?, authority_role?, issue_year?, use?: relied|candidate|dismissed|null}], edges[{id, source, target, kind: parent|spouse|holds|match|applied, probability?, relation_label?, use?}], signals[{code, title, detail, node_ids}], records_used, records_found, note}`. Audited `family_graph_viewed`.
- `GET /api/graph/integrity` → `{graph, overlay{planted, found, extra_flags, note}, edges_note, signals[{code, title, explanation, count, families, certificates, examples[{family_id, district, cert_nos, app_id?}], top_districts}], districts[{lgd, name, <code>: n, total}]}`. Signal codes: `category_conflict`, `cancelled_relative`, `duplicate_identity`, `tehsildar_permanent`. Category labels only; neutral wording.
- `GET /api/learning/status` → `{labels{real, simulated, total, by_source{officer_case, officer_active, simulated}, …}, calibration|null, baseline{exact, possible}, live:false, uncertain[5 pairs], held_out, method, note, simulated_note}`; `POST /api/learning/recalibrate` → same (audit `model_recalibrated`; proposal only, never applied to live matching); `POST /api/learning/label {pair_id, decision: same|not}` → `{ok, label, status}` (404 unknown pair). `POST /api/reset` clears learning state.
