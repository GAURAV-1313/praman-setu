// Types mirror app/CONTRACT.md exactly.
export type I18n = { en: string; hi: string };
export type Lang = "en" | "hi";
export type Lane = "records_complete" | "standard_review" | "needs_attention";
export type Service = "caste_st" | "caste_sc" | "caste_obc" | "domicile";
export type Role = "kendra_operator" | "sdo" | "tehsildar" | "collector";
export type SuggestedAction = "approve" | "send_back" | "refer";
export type DecisionAction = SuggestedAction | "reject" | "show_cause";

export interface Certificate {
  cert_no: string;
  service: Service;
  cert_type: "permanent" | "temporary";
  category: "ST" | "SC" | "OBC" | null;
  caste_name: I18n | null;
  holder_name: I18n;
  father_name: I18n;
  gender: "M" | "F";
  birth_year: number;
  village: I18n;
  village_lgd: number;
  tehsil: I18n;
  district: I18n;
  district_lgd: number;
  issue_date: string;
  issuing_authority: I18n;
  authority_role: "SDO" | "Tehsildar" | "Collector" | "Addl. Collector";
  status: "active" | "cancelled" | "under_scrutiny";
  qr_verified: boolean;
}

export interface WeightItem {
  field: string;
  label: I18n;
  comparison: I18n;
  level: string;
  weight: number;
}

export interface ValidityCheck {
  code: string;
  ok: boolean;
  label: I18n;
  detail: I18n;
  /** Round 1: on a failed check, "review" = verify first (e.g. pre-ruling Tehsildar certificate), "fail" = cannot be used */
  severity?: "fail" | "review";
}

export interface LineageMatch {
  certificate: Certificate;
  relation: "father" | "sibling" | "paternal_grandfather" | "paternal_uncle";
  relation_label: I18n;
  match_probability: number;
  match_level: "exact" | "possible";
  prior_weight: number;
  weights: WeightItem[];
  validity: ValidityCheck[];
  usable_as_evidence: boolean;
  /** Round 1: the most important validity problem phrased as a card title (null when all checks pass) */
  validity_headline?: I18n | null;
  validity_severity?: "fail" | "review" | null;
  /** Round 2: the officer's recorded act on this record (null = not yet disposed) */
  disposition?: Disposition | null;
  /** Round 2: this is the certificate number on the application (declared) */
  declared?: boolean;
  /** Round 2: declared number was attached by the Kendra operator after a search (needs the officer's confirmation) */
  kendra_attached?: boolean;
  /** citizen portal: named by the applicant online after a masked archive search (still needs confirmation) */
  citizen_attached?: boolean;
  /** Round 2: grounds offered pre-ticked for "same family" (never committed without the officer) */
  default_grounds?: string[];
  /** Round 7: present only when the record came from the native (maiden) village search */
  found_via?: "native_village";
  found_via_note?: I18n;
}

export interface Disposition {
  decision: "same" | "not";
  grounds: string[];
  note: string;
  ts: string | null;
}

export interface EvidenceRow {
  source: I18n;
  field: I18n;
  value: I18n;
  status: "ok" | "warn" | "info";
  note?: I18n;
}

export interface Flag {
  code: string;
  severity: "attention" | "info";
  title: I18n;
  explanation: I18n;
  cert_nos?: string[];
  /** Round 2: neutral, factual sentence used in orders / references (no tool voice) */
  order_point?: I18n;
}

export interface ChecklistItem {
  code: string;
  label: I18n;
  required: boolean;
  present: boolean;
  satisfied_by?: I18n;
  /** Round 1: shown instead of a tick when a family record is awaiting confirmation or cannot be relied on */
  note?: I18n;
  state?: "pending" | "blocked" | "not_on_file";
}

export interface Deficiency {
  code: string;
  text: I18n;
}

export interface Application {
  app_id: string;
  /** citizen portal filing */
  channel?: "citizen_portal";
  /** citizen portal: no pre-notification papers — unavailability declaration + Rule 7 inquiry requested */
  inquiry_requested?: boolean;
  /** citizen portal: last 4 digits only, as typed by the applicant */
  aadhaar_last4?: string;
  mobile_last4?: string;
  service: Service;
  service_label: I18n;
  applicant_name: I18n;
  father_name: I18n;
  mother_name: I18n;
  gender: "M" | "F";
  birth_year: number;
  claimed_category: "ST" | "SC" | "OBC" | null;
  claimed_caste: I18n | null;
  village: I18n;
  village_lgd: number;
  tehsil: I18n;
  district: I18n;
  district_lgd: number;
  purpose: I18n;
  submitted_at: string;
  sla_due: string;
  kendra: I18n;
  routed_to: Role;
  status: "pending" | "approved" | "sent_back" | "referred" | "rejected" | "show_cause_issued" | "awaiting_patwari";
  /** `text`: a system-generated document's own text (e.g. the citizen's unavailability declaration, Hindi) */
  documents: { code: string; label: I18n; uploaded: boolean; text?: string }[];
  persona_note?: I18n;
  declared_relative_cert_no?: string;
  /** Round 1: times this application was sent back before */
  sendback_count?: number;
  /** Round 2: who put the declared certificate number on the application */
  declared_source?: "applicant" | "kendra_search";
  /** Round 4: permanent / temporary (the wrong-authority guard reads it) */
  certificate_kind?: "permanent" | "temporary";
}

export type ReferTo = "patwari" | "scrutiny_committee" | "sdo";
export interface SendbackReason {
  code: string;
  text: I18n;
  suggested: boolean;
}

export interface Analysis {
  app_id: string;
  lane: Lane;
  lane_reason: I18n;
  suggested_action: SuggestedAction;
  suggested_action_reason: I18n;
  lineage_matches: LineageMatch[];
  evidence_rows: EvidenceRow[];
  flags: Flag[];
  checklist: ChecklistItem[];
  deficiencies: Deficiency[];
  draft_order: I18n;
  model_version: string;
  rules_version: string;
  legal_basis: I18n[];
  // ---- Round 1 additions (see CONTRACT.md "Round 1 changes")
  confirmed_cert_nos: string[];
  accepted_cert_nos: string[];
  evidence_summary: I18n;
  evidence_rank: number;
  next_step?: I18n;
  finding_required: Record<DecisionAction, I18n | null>;
  refer_to: ReferTo;
  refer_options: { code: ReferTo; label: I18n }[];
  refer_drafts: Partial<Record<ReferTo, I18n>>;
  sendback_reasons: SendbackReason[];
  // ---- Round 2 additions (see CONTRACT.md "Round 2 changes")
  office: I18n;
  office_info: OfficeInfo;
  dismissed_cert_nos: string[];
  disposition_required: string[];
  grounds_catalogue: { same: { code: string; label: I18n }[]; not: { code: string; label: I18n }[] };
  evidence_required: boolean;
  evidence_options: { caste: EvidenceOption[]; residence: EvidenceOption[] };
  approve_drafts: Record<string, I18n>;
  drafts: { approve: I18n | null; show_cause: I18n; reject: I18n | null };
  adverse_cert_nos: string[];
  show_cause: ShowCause | null;
  officer_segments: I18n[];
  authoritative_lang: "hi";
  // ---- Round 4 additions
  competence?: Competence;
  patwari_form?: PatwariForm;
  policy?: { tehsildar_issued_permanent: PolicyValue; sla_pause?: SlaPauseValue };
  // ---- Round 6 additions (single source of truth for the gates the case page enforces)
  /** usable family records still awaiting "same family / not this family" (block signing until decided) */
  pending_cert_nos?: string[];
  /** records complete, nothing open: the only state the queue calls "Ready to sign" and the tray accepts */
  ready_to_sign?: boolean;
  /** the SDO (Revenue) sub-division desk this file belongs to */
  subdivision?: Subdivision;
  /** OBC approvals: the officer's creamy-layer finding (required) */
  creamy_layer?: CreamyLayerInfo | null;
  sla_clock?: SlaClock;
  /** Round 7: present only after the officer searched the applicant's native (maiden) village */
  native_village?: NativeVillageInfo;
  /** Round 8b: what the system did for this file (read → search → match → rules → draft → officer); never decides */
  trace?: TraceStep[];
}
export interface TraceStep {
  step: number;
  code: "read" | "search" | "match" | "rules" | "draft" | "officer";
  status: "ok" | "attention" | "waiting";
  ms: number | null;
  title: I18n;
  detail: I18n;
  count?: number;
  passed?: number;
  total?: number;
  model_version?: string;
}
export interface NativeVillageInfo {
  village_lgd: number;
  village: I18n;
  tehsil: I18n;
  district: I18n;
  district_lgd: number;
  found_cert_nos: string[];
  note: I18n;
}
export interface Subdivision {
  en: string;
  hi: string;
  office: I18n;
}
export interface CreamyLayerInfo {
  required: boolean;
  options: { code: string; label: I18n }[];
  default_docs: string[];
  father_income_on_file: boolean;
  placeholder: I18n;
  sentence: I18n;
  mark: I18n;
  note: I18n;
}
export type SlaPauseValue = "running" | "paused_proposed";
export interface SlaClock {
  state: SlaPauseValue;
  paused: boolean;
  label: I18n;
}
export interface Desk {
  code: string;
  label: I18n;
  short: I18n;
  pending: number;
  default: boolean;
}
export type PolicyValue = "valid_with_note" | "verify";
export interface Competence {
  ok: boolean;
  forward_to?: Role;
  forward_label?: I18n;
  message?: I18n;
}
export interface PatwariRow {
  name: I18n | null;
  relation: I18n;
  birth_year: number | null;
  source: "application" | "record" | "ration" | "oral";
  detail?: I18n;
}
export interface PatwariForm {
  halka: { no: number; patwari: I18n; label: I18n };
  days: number;
  report_by: string;
  rows: PatwariRow[];
  fields: { code: string; label: I18n; prefill: I18n }[];
  channel: I18n;
}
export interface Stage {
  kind: "patwari" | "show_cause";
  day?: number;
  of?: number;
  halka?: I18n;
  report_by?: string;
  overdue?: boolean;
  reply_due?: string;
  /** Round 6: SLA clock during hearing / Patwari referral (running unless the proposed pause policy is on) */
  sla_clock?: SlaClock;
}
export interface PolicyResponse {
  policy: { tehsildar_issued_permanent: PolicyValue; sla_pause?: SlaPauseValue };
  options: { tehsildar_issued_permanent: Record<PolicyValue, I18n>; sla_pause?: Record<SlaPauseValue, I18n> };
  defaults: { tehsildar_issued_permanent: PolicyValue; sla_pause?: SlaPauseValue };
}
export interface TrayItem {
  app_id: string;
  name: I18n;
  service: I18n;
  office: I18n;
  added_ts: string;
}
export interface TrayView {
  max: number;
  items: TrayItem[];
}
export interface TraySignResponse {
  esign_txn: string;
  signed: { app_id: string; document_no: string; status: string; citizen_message: CitizenMessage; name: I18n }[];
  errors: { app_id: string; detail: string }[];
}
export interface ToolCheck {
  suggested_action: string;
  lane: Lane;
  agrees: boolean;
  reason: I18n;
}
export interface CollectorTiles {
  awaiting_patwari: { count: number; over_7_days: number; files: { app_id: string; tehsil: I18n; day: number; of: number; overdue: boolean }[] };
  show_cause_pending: { count: number; files: { app_id: string; tehsil: I18n; reply_due: string }[] };
  camp: { camp_rejection_pct: number; regular_rejection_pct: number; camp_applications: number; source: I18n; roadmap: I18n; basis?: I18n };
  tool_disagreements: { count: number; reviewed: number; files: string[] };
  tool_feedback: { yes: number; no: number; wrong_family: number };
}

export interface OfficeInfo {
  designation: I18n;
  office: I18n;
  place: I18n;
  code: string;
  jurisdiction: I18n;
}
export interface EvidenceOption {
  code: string;
  label: I18n;
}
export interface ShowCause {
  no: string;
  date: string;
  issued_ts: string;
  reply_due: string;
  grounds: string;
  adverse_cert_nos: string[];
  reply: { outcome: "reply_received" | "no_reply"; date: string; summary: string | null; simulated?: boolean } | null;
  officer_name?: string;
  snapshot?: DecisionSnapshot;
}

export interface DecisionSnapshot {
  model_version: string;
  rules_version: string;
  lane: Lane;
  suggested_action: string;
  agreed_with_suggestion: boolean;
  matches_shown: { cert_no: string; relation: string; level: string; probability: number; usable: boolean; validity_headline: string | null; validity_failed: string[]; disposition: Disposition | null }[];
  flags_open: { code: string; severity: string; cert_nos: string[] }[];
  checklist: { code: string; present: boolean; required: boolean; state: string | null }[];
  accepted_cert_nos: string[];
  evidence_basis: { caste: string | null; residence: string | null } | null;
  show_cause: ShowCause | null;
  system_draft_sha: string | null;
  signed_sha: string;
  edited: boolean;
  read_confirmed: boolean;
  time_on_screen_s: number | null;
  authoritative_lang: string;
  /** Round 4 */
  channel?: string;
  shadow_mode?: boolean;
  tool_shown_before_decision?: boolean;
  hidden_before_decision?: string[];
  esign_txn?: string;
  tool_feedback?: { useful: string; note: string | null; ts: string };
}

export interface CaseBundle {
  application: Application;
  analysis: Analysis;
}

export interface QueueItem {
  application: Application;
  lane: Lane;
  suggested_action: string;
  top_match_probability: number | null;
  evidence_summary: I18n;
  evidence_rank: number;
  /** Round 3: the officer's pending task for this file ("Confirm relationship", "Ready to sign", …) */
  next_step?: I18n;
  sla_days_left: number;
  sla_urgent: boolean;
  /** Round 4 */
  stage?: Stage | null;
  in_tray?: boolean;
  competent?: boolean;
  /** Round 6 */
  ready_to_sign?: boolean;
  subdivision?: Subdivision;
}

export interface CitizenMessage {
  channel: "whatsapp" | "sms";
  text: I18n;
  generator: "template" | "llm";
  checker: { passed: boolean; unsupported_entities: string[]; checked_entities: string[] };
}

export interface AuditEntry {
  ts: string;
  actor_role: Role;
  actor: string;
  action: string;
  app_id?: string;
  records_accessed: string[];
  note?: string;
  /** Round 2: what the officer saw when deciding */
  snapshot?: DecisionSnapshot;
  document_no?: string;
  esign_txn?: string;
}

export interface DecisionRequest {
  action: DecisionAction;
  officer_name: string;
  order_text: I18n;
  deficiency_codes?: string[];
  findings?: string;
  refer_to?: ReferTo;
  custom_deficiency?: string;
  evidence_basis?: { caste: string | null; residence: string | null };
  system_text?: I18n;
  time_on_screen_s?: number;
  read_confirmed?: boolean;
  /** Round 4: decided in the Praman view, or with Sewa Setu's own buttons (console) */
  channel?: "praman" | "sewasetu_native";
  tool_visible?: boolean;
  shadow?: boolean;
  /** Round 6: the acting SDO desk (sub-division) */
  desk?: string;
  /** Round 6: OBC approvals — the officer's creamy-layer finding and the documents relied on */
  creamy_layer?: { non_creamy: boolean; docs: string[] };
}

export interface IssuedDocument {
  document_no: string;
  document_kind: "order" | "notice" | "reference" | "show_cause";
  text: I18n;
  ts: string;
  snapshot?: DecisionSnapshot;
  /** Round 5: the citizen message sent with the decision (so a revisited, decided file can show it again) */
  citizen_message?: CitizenMessage | null;
}

export interface CallbackResponse {
  application: Application;
  analysis: Analysis;
  audit: AuditEntry;
}

export interface DecisionResponse {
  application: Application;
  citizen_message: CitizenMessage;
  audit: AuditEntry;
  document_kind?: "order" | "notice" | "reference" | "show_cause";
  document_no?: string;
  issued_text?: I18n;
  /** Round 4 */
  patwari?: { halka: I18n; days: number; report_by: string; form: PatwariForm; sent_ts: string } | null;
  tool_check?: ToolCheck;
}

export interface PrecheckRequest {
  service: Service;
  applicant_name: string;
  father_name: string;
  village_lgd?: number;
  village_name?: string;
  district_lgd?: number;
  birth_year?: number;
  claimed_category?: string;
  relative_cert_no?: string;
  consent?: boolean;
  /** Round 7: native / maiden village (married women) — searched as well */
  native_village_lgd?: number;
}

export interface PrecheckResponse {
  matches: LineageMatch[];
  checklist: ChecklistItem[];
  summary: I18n;
  suggestion: I18n;
}

export interface Village {
  village_lgd: number;
  name: I18n;
  tehsil: I18n;
  district_lgd?: number;
  /** Round 7 */
  district?: I18n;
}

export interface Health {
  ok: boolean;
  model_version: string;
  synthetic_population: number;
  archive_certificates: number;
}

export interface MisService {
  key: string;
  label: I18n;
  total: number;
  approved: number;
  rejected: number;
  rejection_pct_decided: number;
  share_of_volume: number;
  share_of_rejections: number;
  is_caste?: boolean;
}

export interface MisDistrict {
  lgd: number;
  name: I18n;
  division: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  pending_beyond: number;
  rejection_pct: number;
}

export interface MisSummary {
  caste_combined?: { total: number; rejected: number; share_of_volume: number; share_of_rejections: number };
  source: I18n;
  fetched: string;
  period: { from: string | null; to: string; label?: I18n };
  totals: {
    applications: number;
    approved: number;
    rejected: number;
    pending: number;
    pending_beyond_sla: number;
    on_time_pct: number;
  };
  services: MisService[];
  districts: MisDistrict[];
}

export interface PilotStats {
  kind?: "targets";
  note?: I18n;
  lane_mix: { records_complete: number; standard_review: number; needs_attention: number };
  lane_mix_source?: I18n;
  targets: { metric: I18n; target: I18n; stop_rule: I18n }[];
}

export interface EvalResult {
  model: string;
  test_set: { pairs: number; positives: number; description: I18n };
  thresholds: { exact: number; possible: number };
  overall: { precision: number; recall: number; f1: number };
  slices: { name: I18n; n: number; precision: number; recall: number; key?: string; note?: I18n }[];
  weights_learned: { comparison: string; level: string; m: number; u: number; weight: number }[];
}

// Minimal GeoJSON typing we need.
export interface DistrictFeature {
  type: "Feature";
  properties: {
    lgd_code: number;
    district: string;
    name_hi: string;
    mis_rejection_rate_pct: number;
    [k: string]: unknown;
  };
  geometry: unknown;
}
export interface DistrictGeo {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

// ---- Round 8b: income-certificate renewal (second service on the same engine; SYNTHETIC)
export interface IncomeCertificate {
  cert_no: string;
  service: "income";
  cert_type: "annual";
  holder_name: I18n;
  father_name: I18n;
  gender: "M" | "F";
  birth_year: number;
  village: I18n;
  village_lgd: number;
  tehsil: I18n;
  district: I18n;
  district_lgd: number;
  annual_income: number;
  annual_income_text: string;
  income_sources: I18n;
  issue_date: string;
  valid_until: string;
  issuing_authority: I18n;
  authority_role: string;
  status: string;
  qr_verified: boolean;
  synthetic: boolean;
  persona_note?: I18n;
}
export type RenewalStrength = "strong" | "partial" | "verify";
export interface RenewalItem {
  certificate: IncomeCertificate;
  days_left: number;
  window: 30 | 60;
  evidence: EvidenceRow[];
  rule_flags: { code: string; label: I18n }[];
  strength: RenewalStrength;
  strength_label: I18n;
  strength_reason: I18n;
  renewal_id: string | null;
}
export interface RenewalList {
  district_lgd: number;
  district: I18n | null;
  as_of: string;
  window_days: number;
  counts: { d30: number; d60: number; strong: number; partial: number; verify: number };
  items: RenewalItem[];
  districts: { lgd: number; name: I18n }[];
  context: { income_share_of_volume: number | null; note: I18n };
  roadmap: { code: string; label: I18n; note: I18n }[];
  synthetic: true;
}
export interface RenewalRecord {
  renewal_id: string;
  created_at: string;
  status: "awaiting_citizen_confirmation";
  service: "income_renewal";
  service_label: I18n;
  source_certificate: IncomeCertificate;
  days_left: number;
  fields: { label: I18n; value: I18n; source: I18n }[];
  evidence_reused: EvidenceRow[];
  rule_flags: { code: string; label: I18n }[];
  strength: RenewalStrength;
  strength_label: I18n;
  strength_reason: I18n;
  citizen_confirmation: { required: true; confirmed: boolean; statement: I18n; note: I18n };
  officer_step: { required: true; auto_issue: false; office: I18n; note: I18n };
  nudge: CitizenMessage & { status: "preview"; status_note: I18n };
  rule_file: { name: string; note: I18n };
  synthetic: true;
}

/** Citizen portal: Family Proof Helper (masked archive search) and online filing */
export interface CitizenPrecheckRequest {
  session_id: string;
  service: "caste_sc" | "caste_st" | "caste_obc";
  applicant_name: string;
  father_name: string;
  relation?: string;
  village_lgd?: number;
  district_lgd?: number;
  native_village_lgd?: number;
  relative_cert_no?: string;
  consent: boolean;
  aadhaar_ok: boolean;
}
export interface CitizenPrecheckResponse {
  status: "found_usable" | "found_review" | "not_found";
  searches_left: number;
  proof_ref?: string;
  masked_no?: string;
  office?: I18n;
  year?: string;
  relation?: I18n;
  found_via_native?: boolean;
}
export interface CitizenSubmitRequest {
  session_id: string;
  service: "caste_sc" | "caste_st" | "caste_obc";
  applicant_name_hi: string;
  applicant_name_en: string;
  father_name_hi: string;
  father_name_en: string;
  mother_name?: string;
  gender: "M" | "F";
  birth_year: number;
  caste?: string;
  village_lgd: number;
  purpose?: string;
  proof_ref?: string;
  no_papers?: boolean;
  /** the generated unavailability declaration, exactly as the citizen ticked it (Hindi) */
  declaration?: string;
  vanshavali?: { relation: string; name: string; village: string; place_1950: string }[];
  other_docs?: string[];
  aadhaar_last4?: string;
  mobile_last4?: string;
}
export interface CitizenSubmitResponse {
  app_id: string;
  submitted_at: string;
  sla_due: string;
  office: I18n;
  fee: number;
  inquiry_requested: boolean;
  proof: { masked_no: string } | null;
  citizen_message: CitizenMessage;
}
