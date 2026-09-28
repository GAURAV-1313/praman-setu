/**
 * Round 3: ONE evidence verdict at the top of the case view. It answers, in fixed rows and fixed icons,
 * what the evidence is, what the officer must decide, what needs attention, what the file relies on and
 * what is missing. Every other restatement of the same facts was removed from the page.
 * It states facts and the officer's task; it never pre-selects an outcome (round-2 anti-anchoring).
 */
import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import type { Analysis, Application, LineageMatch } from "../api/types";
import { CATEGORY_LABEL, fmtDate, STATUS_LABEL } from "./common";
import { buildRows, Diff, nameDifference } from "./compare";
import { useDesk } from "../desk";

type Tone = "evidence" | "job" | "attention" | "ok" | "missing" | "note" | "neutral";
const ICON: Record<Tone, string> = { evidence: "▣", job: "?", attention: "!", ok: "✓", missing: "✗", note: "i", neutral: "–" };

function Line({ tone, children, label }: { tone: Tone; label: string; children: ReactNode }) {
  return (
    <div className={`vd-line ${tone}`}>
      <span className="vd-ico" aria-hidden="true">
        {ICON[tone]}
      </span>
      <span className="vd-lbl">{label}</span>
      <div className="vd-txt">{children}</div>
    </div>
  );
}

const stripMock = (s: string) => s.replace(/\s*\((mock|नमूना|मॉक)\)/gi, "");

export default function VerdictCard({ app, analysis, status, shadow, compact, jobAction, nativeAction }: { app: Application; analysis: Analysis; status: string; shadow?: boolean; compact?: boolean; jobAction?: ReactNode; nativeAction?: ReactNode }) {
  const { t, tx, lang } = useI18n();
  const desk = useDesk();
  const an = analysis;
  const accepted = new Set(an.accepted_cert_nos ?? []);
  const live = an.lineage_matches.filter((m) => m.disposition?.decision !== "not");
  const dismissed = an.lineage_matches.filter((m) => m.disposition?.decision === "not");
  const pending = live.find((m) => m.usable_as_evidence && !accepted.has(m.certificate.cert_no) && !m.disposition) ?? null;
  const acc = live.find((m) => accepted.has(m.certificate.cert_no)) ?? null;
  const undisposed = live.find((m) => an.disposition_required?.includes(m.certificate.cert_no)) ?? null;
  const main: LineageMatch | null = pending ?? acc ?? undisposed ?? live[0] ?? null;
  const attentionFlags = an.flags.filter((f) => f.severity === "attention");
  const decided = status !== "pending" && status !== "show_cause_issued";
  const isCaste = app.service !== "domicile";
  const referLabel = an.refer_options?.find((o) => o.code === an.refer_to)?.label;

  // ---------- 1. the evidence ----------
  let evidence: ReactNode;
  let evidenceTone: Tone = "evidence";
  if (!main) {
    evidenceTone = "note";
    evidence = (
      <>
        <b>{dismissed.length ? tx("No family record relied on — you marked it “not this family”.", "कोई पारिवारिक अभिलेख आधार नहीं — आपने “यह परिवार नहीं” दर्ज किया।") : tx("No family certificate found in the archive — this is NOT a ground for rejection.", "अभिलेखागार में परिवार का कोई प्रमाण पत्र नहीं मिला — यह अस्वीकृति का आधार नहीं है।")}</b>
        {app.gender === "F" && (
          <div className="vd-sub">
            {an.native_village
              ? tx("Her native (maiden) village was searched as well.", "मायके / मूल गांव में भी खोजा गया।")
              : tx(
                  "Married woman? Her family's records are often in her father's (maiden) village, not her husband's — search the native village.",
                  "विवाहित महिला? पैतृक परिवार के अभिलेख प्रायः पति के गांव में नहीं, पिता के (मायके के) गांव में होते हैं — मायके के गांव में खोजें।",
                )}
            {nativeAction}
          </div>
        )}
      </>
    );
  } else {
    const c = main.certificate;
    const rel = t(main.relation_label);
    // Round 5 (stage rule): category only here — the community name appears only in the neutral comparison row
    const meta = [c.category && isCaste ? t(CATEGORY_LABEL[c.category]) : null, c.cert_type === "permanent" ? tx("permanent", "स्थायी") : tx("temporary", "अस्थायी"), c.status === "active" ? tx("active", "सक्रिय") : c.status === "cancelled" ? tx("cancelled", "निरस्त") : tx("under scrutiny", "जांचाधीन")]
      .filter(Boolean)
      .join(" · ");
    const how = main.declared && !main.kendra_attached ? tx("declared by the applicant (Form 2A) and matched", "आवेदक द्वारा घोषित (फॉर्म 2A) व मिलान") : main.kendra_attached ? tx("attached by the Kendra after a search", "केंद्र द्वारा खोज के बाद संलग्न") : tx("found in the archive by the system", "सिस्टम द्वारा अभिलेखागार में मिला");
    if (main.validity_headline) {
      evidence = (
        <>
          <b>
            {tx(`${rel}'s certificate`, `${rel} का प्रमाण पत्र`)} <span className="mono">{c.cert_no}</span> — {main.validity_severity === "review" ? tx("not proof until verified", "सत्यापन तक प्रमाण नहीं") : tx("cannot be used as proof", "प्रमाण हेतु उपयोग योग्य नहीं")}
          </b>
          <div className="vd-sub">
            {how} · {t(c.issuing_authority)} {fmtDate(c.issue_date)}
          </div>
        </>
      );
    } else if (main.match_level === "possible" && !accepted.has(c.cert_no)) {
      evidence = (
        <>
          <b>
            {tx(`Possible family record — ${rel}'s certificate`, `संभावित पारिवारिक अभिलेख — ${rel} का प्रमाण पत्र`)} <span className="mono">{c.cert_no}</span>
          </b>
          <span className="vd-sub-inline"> · {meta}</span>
        </>
      );
    } else {
      evidenceTone = accepted.has(c.cert_no) ? "ok" : "evidence";
      evidence = (
        <>
          <b>
            {accepted.has(c.cert_no) ? tx(`${rel}'s certificate — relied on as evidence`, `${rel} का प्रमाण पत्र — साक्ष्य के रूप में मान्य`) : tx(`${rel}'s certificate found`, `${rel} का प्रमाण पत्र मिला`)} — <span className="mono">{c.cert_no}</span>
          </b>{" "}
          <span className="vd-sub-inline">
            · {meta}
            {main.disposition?.decision === "same" ? ` · ${tx("relationship confirmed by you", "संबंध आपके द्वारा पुष्ट")}` : main.declared ? ` · ${how}` : ""}
          </span>
        </>
      );
    }
    if (main.found_via === "native_village") {
      evidence = (
        <>
          {evidence}
          <div className="vd-native">⌂ {tx(`Found in her native (maiden) village ${c.village.en} (${c.district.en}) — not in the current-village search.`, `मायके / मूल गांव ${c.village.hi} (${c.district.hi}) से मिला — वर्तमान गांव की खोज में नहीं।`)}</div>
        </>
      );
    }
    if (live.length > 1) {
      evidence = (
        <>
          {evidence}
          <div className="vd-sub">{tx(`+ ${live.length - 1} more record(s) — see the tabs below`, `+ ${live.length - 1} अन्य अभिलेख — नीचे टैब देखें`)}</div>
        </>
      );
    }
  }

  // ---------- 2. your job (one question per state) ----------
  let job: ReactNode;
  // Round 5: the console shows no keyboard letters (its own buttons are used there)
  const k = (key: string) => (compact ? "" : ` (${key})`);
  const misrouted = !!an.competence && an.competence.ok === false;
  // Round 6: a file of another SDO sub-division opened on this desk
  const otherDesk = app.routed_to === "sdo" && !!an.subdivision && an.subdivision.en !== desk && status === "pending";
  if (decided) {
    job = <>{tx("Decision recorded", "निर्णय दर्ज")}: <b>{t(STATUS_LABEL[status])}</b></>;
  } else if (status === "show_cause_issued" || (an.show_cause && !an.show_cause.reply)) {
    job = tx(`Wait for the applicant's reply to the pre-rejection hearing notice (due ${an.show_cause?.reply_due ?? "—"}).`, `सुनवाई सूचना के उत्तर की प्रतीक्षा (देय ${an.show_cause?.reply_due ?? "—"})।`);
  } else if (otherDesk && an.subdivision) {
    job = <b>{tx(`Belongs to ${an.subdivision.office.en} — forward it. No decision on this desk.`, `${an.subdivision.office.hi} की फ़ाइल — अग्रेषित करें। इस डेस्क पर निर्णय नहीं।`)}</b>;
  } else if (misrouted) {
    job = <b>{tx(`Not your competence — forward it to the ${an.competence?.forward_label?.en ?? "SDO (Revenue)"}. Approve and Reject are disabled on this desk.`, `आपकी सक्षमता नहीं — ${an.competence?.forward_label?.hi ?? "अनुविभागीय अधिकारी (राजस्व)"} को अग्रेषित करें। इस डेस्क पर स्वीकृति व अस्वीकृति निष्क्रिय।`)}</b>;
  } else if (an.show_cause?.reply) {
    job =
      an.show_cause.reply.outcome === "no_reply"
        ? tx("No reply received within the hearing period (demo: time advanced) — decide: approve, refer, or the final reject order.", "सुनवाई की अवधि में उत्तर प्राप्त नहीं (डेमो: समय आगे बढ़ाया गया) — निर्णय लें: स्वीकृत, संदर्भ, या अंतिम अस्वीकृति आदेश।")
        : tx("Consider the reply to the pre-rejection hearing notice, then decide: approve, refer, or the final reject order.", "सुनवाई सूचना के उत्तर पर विचार कर निर्णय लें: स्वीकृत, संदर्भ, या अंतिम अस्वीकृति आदेश।");
  } else if (attentionFlags.length) {
    job = (
      <>
        {tx("Decide how this point is verified.", "तय करें कि यह बिंदु कैसे सत्यापित हो।")} {referLabel && !shadow && <>{tx("Records suggest", "अभिलेखों का सुझाव")}: <b>{t(referLabel)}</b>.</>}
        <div className="vd-sub">{tx("A rejection needs a pre-rejection hearing notice first (15 days).", "अस्वीकृति से पहले सुनवाई सूचना (15 दिन) अनिवार्य।")}</div>
      </>
    );
  } else if (pending) {
    job = <b>{tx(`Is ${t(pending.certificate.holder_name)} the applicant's ${t(pending.relation_label).toLowerCase()}? Only you decide — same family${k("C")} / not this family${k("N")}.`, `क्या ${t(pending.certificate.holder_name)} आवेदक के ${t(pending.relation_label)} हैं? यह केवल आप तय करते हैं — वही परिवार${k("C")} / यह परिवार नहीं${k("N")}।`)}</b>;
  } else if (undisposed) {
    job = <b>{tx(`Mark the possible record: same family${k("C")} or not this family${k("N")}. Then examine the documents.`, `संभावित अभिलेख चिह्नित करें: वही परिवार${k("C")} या यह परिवार नहीं${k("N")}। फिर दस्तावेज़ जांचें।`)}</b>;
  } else if (an.lane === "records_complete") {
    job = tx("All details agree. You will see the full order before signing.", "सभी विवरण मेल खाते हैं। हस्ताक्षर से पहले पूरा आदेश दिखेगा।");
  } else if (an.deficiencies.length) {
    job = tx(`A required document is missing: send back for it${k("S")}, or refer for a Patwari enquiry${k("R")}.`, `आवश्यक दस्तावेज़ कम है: मंगाने हेतु वापस भेजें${k("S")}, या पटवारी जांच हेतु संदर्भित करें${k("R")}।`);
  } else if (an.evidence_required) {
    job = (
      <>
        <b>{tx("Examine the documents and pick which one shows the claim (below) — or send back / refer.", "दस्तावेज़ जांचें और चुनें कि कौन-सा दावा दर्शाता है (नीचे) — या वापस भेजें / संदर्भित करें।")}</b>
        <div className="vd-sub">{tx("If proof is thin: school record, Gram Sabha certificate, or a Patwari field report (Rule 8 enquiry).", "प्रमाण कम हो तो: स्कूल अभिलेख, ग्राम सभा प्रमाण पत्र, या पटवारी क्षेत्र प्रतिवेदन (नियम 8 जांच)।")}</div>
      </>
    );
  } else {
    job = tx("Examine the application as usual and choose an action.", "आवेदन की सामान्य जांच कर कार्यवाही चुनें।");
  }

  // ---------- 3. attention: open flags + spelling / age differences in the comparison ----------
  const attention: ReactNode[] = attentionFlags.map((f) => (
    <details key={f.code + (f.cert_nos?.[0] ?? "")} className="vd-why">
      <summary>
        <b>{t(f.title)}</b> <span className="vd-more">{tx("why?", "क्यों?")}</span>
      </summary>
      <p>{t(f.explanation)}</p>
    </details>
  ));
  if (main && !main.validity_headline) {
    const rows = buildRows(app, main, { t, tx, lang });
    for (const r of rows) {
      const d = nameDifference(r, lang);
      if (d) {
        attention.push(
          <div key={"n" + r.key}>
            {r.key === "who" ? tx("Holder's name differs from the applicant's", "धारक का नाम आवेदक से भिन्न") : tx("Father's name spelt differently", "पिता के नाम की वर्तनी भिन्न")}:{" "}
            <span className="vd-names">
              <Diff s={d.a} other={d.b} /> / <Diff s={d.b} other={d.a} />
            </span>
            {r.state === "variant" && <span className="vd-sub-inline"> · {tx("model: same name", "मॉडल: वही नाम")}</span>}
          </div>,
        );
      } else if (r.key === "village" && r.state !== "agree") {
        attention.push(
          <div key="v">
            {tx(`Village differs: ${r.a} / ${r.b}`, `गांव भिन्न: ${r.a} / ${r.b}`)}
            {main?.found_via === "native_village" && <span className="vd-sub-inline"> · {tx("the second is her native (maiden) village, searched at your request", "दूसरा आवेदिका का मायके का गांव है, आपके कहने पर खोजा गया")}</span>}
          </div>,
        );
      } else if (r.key === "age" && r.state === "differs") {
        attention.push(<div key="a">{tx(`Birth years: ${r.a} / ${r.b} — implausible`, `जन्म वर्ष: ${r.a} / ${r.b} — असंभावित`)}</div>);
      }
    }
  }

  // ---------- 4. relied on / corroboration ----------
  const proofItem = an.checklist.find((c) => (c.code === "caste_proof" || c.code === "residence_proof") && c.present && c.satisfied_by);
  // corroboration in words: the "applicant is a member" row first, values cut to their first clause
  const corro = an.evidence_rows
    .filter((e) => e.status === "ok")
    .sort((x, y) => (/member/i.test(y.field.en) ? 1 : 0) - (/member/i.test(x.field.en) ? 1 : 0))
    .slice(0, 2);
  const short = (x: string) => stripMock(x).split(" — ")[0].split(" (")[0];

  // ---------- 5. missing ----------
  const missing = an.checklist.filter((c) => c.required && !c.present && !c.state).map((c) => t(c.label).split(" (")[0].split(",")[0]);
  const pendingProof = an.checklist.find((c) => c.state === "pending");
  const blockedProof = an.checklist.find((c) => c.state === "blocked");
  const notOnFile = an.checklist.filter((c) => c.state === "not_on_file");

  return (
    <section className={`card verdict lane-${shadow ? "shadow" : an.lane} ${compact ? "compact" : ""}`} id="verdict" aria-label={tx("Evidence verdict", "साक्ष्य निष्कर्ष")}>
      <div className="vd-title">{tx("Evidence verdict", "साक्ष्य निष्कर्ष")}</div>
      <Line tone={evidenceTone} label={tx("Evidence", "साक्ष्य")}>
        {evidence}
      </Line>
      <Line tone="job" label={tx("Your job", "आपका कार्य")}>
        {job}
        {jobAction}
      </Line>
      {attention.length > 0 && (
        <Line tone="attention" label={tx("Look at", "ध्यान दें")}>
          <div className="vd-stack">{attention}</div>
        </Line>
      )}
      {(proofItem || corro.length > 0) && (
        <Line tone="ok" label={tx("On file", "संलग्न")}>
          {proofItem && (
            <div>
              {t(proofItem.label).split(" (")[0]}: <b>{t(proofItem.satisfied_by)}</b>
            </div>
          )}
          {corro.length > 0 && (
            <div className="vd-sub">
              {tx("Other records (sample, corroborative only)", "अन्य अभिलेख (नमूना, केवल पुष्टिकारक)")}: {corro.map((e) => `${short(t(e.field))}: ${short(t(e.value))}`).join(" · ")}
            </div>
          )}
        </Line>
      )}
      {(missing.length > 0 || pendingProof || blockedProof || notOnFile.length > 0) && (
        <Line tone={missing.length || pendingProof || blockedProof ? "missing" : "neutral"} label={missing.length || pendingProof || blockedProof ? tx("Missing", "कमी") : tx("Not on file", "संलग्न नहीं")}>
          {[
            missing.length > 0 ? <b key="m">{missing.join(", ")}</b> : null,
            pendingProof ? <span key="p">{t(pendingProof.label).split(" (")[0]}: {tx("on your confirmation", "आपकी पुष्टि पर")}</span> : null,
            blockedProof ? <span key="b">{t(blockedProof.label).split(" (")[0]}: {tx("the family certificate on file cannot be relied on yet", "संलग्न पारिवारिक प्रमाण पत्र पर अभी भरोसा नहीं")}</span> : null,
            ...notOnFile.map((c) => (
              <span key={c.code} className="vd-sub-inline">
                {c.code === "family_tree" ? tx("Family tree (Rule 3(3)) not on file — the order records this", "वंशवृक्ष (नियम 3(3)) संलग्न नहीं — आदेश में दर्ज होगा") : `${t(c.label).split(" (")[0]}: ${tx("not on file", "संलग्न नहीं")}`}
              </span>
            )),
          ]
            .filter(Boolean)
            .map((x, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {x}
              </span>
            ))}
        </Line>
      )}
      {an.lane === "records_complete" && isCaste && !decided && (
        <div className="vd-foot">{tx("Records-complete files stay in the District Verification Committee's random post-issue sample (Rule 15(2)).", "अभिलेख-पूर्ण प्रकरण जिला छानबीन समिति के यादृच्छिक सत्यापन नमूने में रहते हैं (नियम 15(2))।")}</div>
      )}
    </section>
  );
}
