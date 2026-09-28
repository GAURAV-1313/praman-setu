# Critique 2: What the citizen and the kiosk operator think of "Nirnay Sahayak"
Role-play critique of the v3 solution in `00_VALIDATION_REPORT.md` §7. Date: 27-09-2026.
These are composite, fictional personas built for design review. They are not interviews.
Where a legal or procedural point is my understanding rather than something sourced in 00/05, it is marked **[check]**.

---

## Persona A: Sunita Markam, 38, Gond (ST), a village in Kondagaon district

*Studied to class 5. Reads Hindi slowly, speaks Gondi and Halbi at home. The phone is a basic Android that her son (17) mostly carries. Her daughter Pooja (19) needs a permanent ST certificate for the post-matric scholarship, and the portal closes in about three weeks. Her husband's family came from a neighbouring district in the 1970s. The old land record is in her father-in-law's name, spelt differently from the Aadhaar. The first application came back with a one-line reason nobody at home could explain. That cost two days' wages (₹261 a day) and an extra ₹100 to the kiosk.*

### First reaction
"You're telling me the saheb will now have a computer that finds my husband's family's papers for him? Good. That is what I asked the kiosk bhaiya to do last time, and he said, 'Upload the 1950 paper, otherwise it will get rejected.' We don't have a 1950 paper. We have my father-in-law's *patta* with 'Lakhmu' written where Aadhaar says 'Lakhmuram', and I don't even know if that counts.

But you've explained all of this to me as something for the *officer*. Nothing in it talks to *me*. Kondagaon is on your list as a pilot district because we reject so many. I'm the one being rejected. What changes on *my* side of the counter?"

### Does this solve MY problem or the government's?
Partly mine, mostly the government's.

**Where it helps me:**
- If my husband's elder brother got a caste certificate on Sewa Setu after 2018, the officer will see it. That could stop the "no pre-1950 record" rejection. The High Court said in July that rejecting on those grounds is wrong when family already holds a certificate. If the machine makes the officer obey that, it is real help.
- A "send back with the deficiency" instead of "reject" saves me the second fee and the second queue.

**Where it is the government's problem, not mine:**
- The report counts me as "₹261 in wages, plus travel". My whole loss becomes one line in an impact model (₹1–2.5 cr a year). The headline numbers are officer hours saved, fraud flags and a dashboard for the Collector.
- Four of the eight features (lane suggestion, draft order, audit list, consistency dashboard) serve officers and supervisors. None of the eight sends anything to the applicant.
- My real problems all happen **before** I apply and **after** I'm refused:
  - Before: what to bring, whether we're even eligible, which relative's paper to carry.
  - After: what the reason means and how to fix it without losing more days.

  The copilot sits in the middle, on the saheb's screen.
- **Shadow mode runs for 90 days.** During that time the machine recommends and the officer works exactly as before. If Pooja applies in that window, nothing changes for her. Our scholarship deadline won't wait for your agreement statistics.

### What I would actually experience
- **Would I know an AI is involved?** No. I'd go to the same kiosk, pay the same fee, get the same acknowledgement slip. The lane colour, the evidence card and the draft order are all on the officer's side. I'd never learn that my brother-in-law's certificate was looked up, or that a "conflict flag" was raised on my family.
- **What message would I get?**
  - The design doesn't say. The draft order is "Hindi/English, template-bound, cites records only". That is written for a court, not for me.
  - Last time the SMS said something like *"आवेदन निरस्त। कारण: आवश्यक दस्तावेज संलग्न नहीं"* ("Application rejected. Reason: required document not attached"). My son read it out. Which document? Attached where?
  - If the new send-back says *"नियम 3(3) के अंतर्गत पूर्व-1950 अभिलेख अथवा परिजन का प्रमाण पत्र संलग्न करें"* ("Under Rule 3(3), attach a pre-1950 record or a relative's certificate"), I'm no better off. It's a better *order*, not a better *message*.
- **In what language?** Here people speak Halbi and Gondi, not Chhattisgarhi. You wrote "Hindi/English". Hindi I manage slowly. English I don't read at all. A voice message in Halbi I would understand the first time.
- **Would I still travel?** The design says "send back with specific deficiency (cure opportunity)". It doesn't say *where* I cure it:
  - If it's the same kiosk, fine.
  - If I have to go to the SDO office in Kondagaon, that's a bus and a lost day's wage again. For me, the difference between a send-back and a rejection is only the fee, not the travel.

### My fears
1. **Wrongly flagged because a relative's certificate differs.**
   - In Bastar, one family can be written as Gond, Muria, Madia or Rajgond on different papers, depending on which babu wrote it. My husband's cousin's certificate might say "Muria". The rule "a relative's certificate shows a different caste" would light up red.
   - As I understand it, several of these names sit under the same Gond entry in the ST list **[check]**. Does your rule know that? If not, the machine will create a new reason to reject tribal families, the very thing it was meant to prevent.
2. **The wrong "relative" gets matched.**
   - In our village there are five "Sukhram Markam, son of Budhram". You match on name, father's name and village.
   - If you attach us to someone else's family, and that family had a certificate cancelled as fake, what happens to Pooja? The report proudly quotes "267 of 659 were fake". I'm afraid of being standing next to one of those 267 in your graph.
3. **My family's data pulled without my knowledge.**
   - You'd look up my brother-in-law's certificate, maybe the ration card, maybe the land record. Nobody asks him, and nobody tells me.
   - The report says the DPDP duty to "tell the applicant which records were used" only binds from May 2027. So the pilot won't do it unless you choose to.
   - If a relative quarrels with us over land, can he object? Would he even know his certificate was used for us?
4. **Lineage through the father, never the mother.**
   - The machine will follow Pooja's father's line. That's fine for Pooja, as long as her father's people are in the archive.
   - Women's own lineage is harder. My caste certificate, if I had one, would be in my maiden surname, from my father's village. You match on *current* village, and a married woman's records are all somewhere else.
   - If a woman is widowed or abandoned and raising children alone, she may need the children's case to go through *her* line. I believe the courts allow this in some situations **[check]**. A system that only knows "father → son → grandson" will send her straight to AMBER.
5. **We migrated, and our relatives' papers are elsewhere.**
   - My husband's family came in the 1970s. Kondagaon itself was cut out of Bastar in 2012, so any old record says "Bastar" and a different tehsil.
   - If the "neighbouring district" was inside Chhattisgarh, the papers exist, just under other village and district names. Does your matcher look across districts, or only in my village?
   - If the family came across the state border, it may not be a paperwork problem at all. The cut-off date may make us ineligible for a Chhattisgarh ST certificate **[check]**. Then I want to be told *that*, clearly, **before** I pay the kiosk. I don't want to be rejected twice by a nicer-looking order.
6. **Name spellings.** 'Lakhmu' on the land record, 'Lakhmuram' in Aadhaar, 'Lakhu' in the ration card. Markam, Markaam, मरकाम. You showed one example that scored 100. Show me the ones that score 70. Who decides then, and do I get to say "yes, that's him"?
7. **The GREEN lane is later audited.** The r.15(2) audit list mixes random and "flagged" cases. If Pooja gets her certificate and two years later a committee pulls it because of some flag, she loses the scholarship and we have to repay. Who tells us why?

### What's missing for me
- **Knowing before I apply.**
  - Tell me at the kiosk: "Your husband's brother already has certificate no. XXXX from 2021. Bring its number or photo. You don't need the 1950 paper."
  - Or: "No family certificate found. Bring a Gram Sabha resolution and a four-generation *vanshavali*." These are already listed on the portal as optional documents.
  - A simple checklist, printed, in Hindi with a voice explanation.
- **A send-back reason I can act on**, by SMS *and* WhatsApp voice note, in Hindi and Halbi/Gondi (Chhattisgarhi for the plains). It should say one thing: *what* is missing, *where* I submit it, *by when*. And it should come with a printout from the kiosk that I can show the Patwari.
- **A way to contest a flag before the decision**, such as "That is not our family" or "Muria is Gond". Today the only road is an appeal to the Collector after rejection. That means more travel and more weeks, and the scholarship deadline is gone.
- **Not having to travel again.** A cure should happen at the same kiosk or by a photo upload from my son's phone, with no new fee.
- **Deadline awareness.** Pooja's scholarship closes before the 22-day SLA ends. Is there a temporary certificate the Tehsildar can give? Will the scholarship portal accept the acknowledgement? Nobody tells us this, and it isn't in the design.

### Equity and fairness (Sunita's voice, then the designer's)
"The families who already have certificates are the ones whose children already went to college or got government jobs. Their next child gets GREEN in two minutes. My family is getting its *first* certificate. The machine finds nothing, so we go to AMBER. Isn't that the same line as before, only now with a colour on it?"

**Designer's reading:**
- **The archive only starts in 2018.** A GREEN lane built on "a relative holds a Sewa Setu or e-District certificate" structurally favours families that are already inside the system: educated, connected, and more often non-migrant and less remote.
- **"Rich get richer" is a fair description.** First-generation applicants, migrants, women applying through a natal line, and the landless (whom the report itself says "lack such records") will land in AMBER by default. They are the people the High Court ruling was meant to protect.
- **§7 breaks the report's own guardrail.** It defines AMBER as "gaps *or* conflicts". That treats *absence* of data as a risk signal, which contradicts the §4/§5 rule "missing data ≠ ineligible".
- **There is an automation-bias risk in reverse.** Once officers are used to GREEN files, a no-match file may feel *more* suspect than it did before the tool existed. If the pilot's success metric is overall rejection falling, it could hide rejection *rising* for first-generation applicants.
- **Pilot assumption A (30–50% have a relative in the archive) means 50–70% don't.** The design has almost nothing for that majority.

---

## Persona A2 (brief): Rahul, 24, OBC, Raipur; father born in UP

*Grew up in Raipur. His father came from eastern UP in the 1990s for a factory job. The family rents, owns no land and has no ration card here. Rahul needs an OBC certificate for a state recruitment exam and a domicile certificate for the same form.*

- **First reaction:** "Family lineage? My whole family's papers are in a tehsil in UP. Your archive has nothing on us. Your copilot will open my file, find zero, and paint it AMBER."
- **The real issue is eligibility, not evidence.**
  - The CG OBC cut-off is 26-12-1984. If his father arrived after that, the state OBC certificate may simply not be available to him in CG, whatever the documents say. As I understand it, migrants carry the status of their state of origin **[check]**.
  - The OBC list in UP and the list in CG may not even include his caste in the same way.
  - Nobody told him this. The kiosk took his fee, and he was rejected with a one-liner.
  - The single most useful thing for Rahul is an **eligibility pre-check** that says, before the fee: "Domicile: likely yes (15 years of stay). CG OBC: depends on your family's residence before 1984; here is what counts as proof; here is where to ask about a central-list certificate."
- **Domicile trap.** Domicile needs 15 years' stay. Urban tenants have rent receipts, school records and electricity bills in a landlord's name, not Bhuiyan land or a Khadya ration card. Phase 2 of the evidence card leans on land and ration data, which is rural-shaped. Urban migrants need school/TC records, voter rolls and utility connections treated as first-class evidence.
- **Creamy layer.** OBC needs mandatory income proof. His father's factory salary slips are in UP-style formats. OCR on a cheap scan will mis-read digits, and the report itself warns about this. A mis-read income that crosses the creamy-layer line becomes a silent rejection.
- **Fear:** "Being flagged because my cousin in Lucknow has a certificate with a different sub-caste spelling? You don't even look there. Fine. But then don't call the absence a 'gap'."

---

## Persona B: Ramesh Sahu, 34, Sewa Setu Kendra / CSC operator (VLE), block town

*Runs a kiosk next to the tehsil. Handles 30–60 applications a day. Earns per transaction. One shared desktop, a ₹4,000 flatbed scanner, BSNL/Jio hotspot internet that drops after 2 pm, and a printer that is usually out of toner. When an application bounces, the citizen comes back and shouts at him, not at the SDO.*

### First reaction
"Arre, finally somebody noticed that 1 in 5 caste forms comes back. But you built the tool for the SDO sahab. I'm the one who takes the documents, types the names, scans the papers, and explains the rejection to an angry mother. If your machine is going to flag things, flag them **on my screen, before I press submit**, not three weeks later on his."

### Does it change my workload or income?
Honestly, both ways.

- **Income, the uncomfortable truth.** A rejection today means a fresh application, and a fresh application means a fresh fee for me. I won't pretend that's a loss. The ₹100 "extra" Sunita paid happens because the official fee doesn't cover a 40-minute caste form with three rescans. If you cut rejections and don't fix the fee, some kiosks will quietly lose money and push the extra charges higher.
- **Send-back is unpaid rework.** If "send back with deficiency" lands in *my* login, I have to call the citizen, wait for them to come, rescan and resubmit. For all that I get **zero**. Today a rejection at least pays. You have turned my paid work into free work unless the department pays for a "cure" transaction.
- **Workload up front, less shouting later.** A pre-check that asks for the relative's certificate number adds 3–5 minutes per form. I'll accept that if it means fewer returns, but only if the portal doesn't hang while it looks up the archive. At 2 pm my internet can't load a Cytoscape graph.
- **Blame.** The design has an "officer override rate" and "reason codes" on a Collector dashboard. Whose reason is it? If a send-back reason says "document illegible", the tehsil will say "the kiosk scanned it badly." Then kiosks with high send-back rates get show-cause notices, even when the real problem is the citizen's 50-year-old *patta* photocopy.

### What would go wrong at my counter
- **pHash "duplicate document" flags on honest work.**
  - Every photo I take is against the same blue wall.
  - Every affidavit is the same notary template on the same ₹50 stamp paper.
  - Two sisters apply the same day with *the same* father's certificate as proof. That is legitimate, and it is exactly what r.3(3) invites.
  - Your rule "the same document or photo is reused across applications" will flag my whole kiosk as a fraud factory. You need to tell "same father's certificate used by siblings" apart from "same photo on two different people".
- **Scans.** 150 dpi, slightly skewed, a greyish background. Tesseract reads "1950" as "1958" and a khasra number wrong. The evidence card shows a warning, the file goes AMBER, and nobody tells me it was the scan.
- **Names.** The citizen says "Lakhmu", Aadhaar says "Lakhmuram", I type "Lakhmu Ram". Show me *on my screen* how the name appears in the relative's certificate, so I type it to match, or let me link the two explicitly.

### What the front end should give me
1. **A pre-check screen before fee and submission:**
   - service eligibility questions (year the family came to CG, state of origin)
   - "Does any family member already hold a caste certificate? Enter certificate/application number", with a live check against the archive that shows the name, caste and issuing office
   - a relationship picker (father / brother / paternal uncle / grandfather / mother, with reason)
2. **A document checklist generated from the answers**, with the alternative proofs (Gram Sabha resolution, *vanshavali*, school TC, Patwari report). It should be printable in Hindi and read aloud.
3. **A scan-quality check before upload**, run in the browser: blur, resolution and crop, with a "rescan" prompt before it becomes the officer's problem.
4. **A plain-language send-back slip** I can print and hand over, and a free "cure" resubmission with no new citizen fee. Ideally the department pays me a small cure fee.
5. **Status and reason visible to me** with a cause tag: *citizen document* / *scan quality* / *eligibility* / *officer judgement*. Then I'm only blamed for what I actually did.
6. **Low-bandwidth mode:** a text-only evidence summary and no graph for the kiosk. It should keep working when the hotspot drops, and save the draft locally.

---

## Top 6 design changes to make it fair and useful to citizens and operators

1. **Add a citizen/operator pre-check ("Taiyari Jaanch") before the fee.**
   - It runs at the kiosk: eligibility questions (cut-off dates, migration, state of origin), then a consented lookup of a *named* relative's certificate by number, then a tailored checklist, then a scan-quality check.
   - It tells the applicant *before paying* whether they are likely to be corroborated, which alternative proofs to bring, or that they are probably not eligible under CG rules and why.
   - This moves the product's value to the point where citizens lose money.
2. **Make the lanes three-state, and never treat absence as risk.**
   - **GREEN:** corroborated.
   - **STANDARD:** no archive evidence. This is today's normal process and must not be treated as suspect.
   - **AMBER:** only for an explicit, explained conflict.
   - Gram Sabha resolutions, *vanshavali*, school TCs and Patwari reports should count toward GREEN, not only archive certificates.
   - Track as a hard pilot KPI that the approval rate for no-match, first-generation, migrant and women-natal-line applicants does not fall below the pre-pilot baseline. Publish lane mix by these groups.
3. **Send a plain-language, multilingual notice for every send-back or decision.**
   - Channels: SMS, WhatsApp text plus voice note, IVR, and a kiosk printout.
   - Languages: Hindi, plus Halbi/Gondi in Bastar and Chhattisgarhi in the plains.
   - It names **one** specific deficiency, what to bring, where to submit it (same kiosk or phone upload, never the SDO office by default) and by when.
   - It lists **which records were checked** (DPDP-ready now, not in 2027).
   - A cure costs no new fee and needs no new trip.
4. **Let people contest a flag before the decision, and make the flags smarter.**
   - The applicant or operator can reply to any flag ("wrong person matched", "Muria/Madia are listed under Gond").
   - A synonym table built from the ST/OBC schedules suppresses false "different caste" conflicts.
   - A relative's differing or cancelled certificate is never on its own grounds for rejection, and never taints the applicant without an officer's written reasoning.
   - Fuzzy matches below a threshold go to the operator or citizen to confirm ("Is this your father-in-law?"), not silently to the officer.
5. **Make family-data use consented, bounded and gender-aware.**
   - The applicant *names* the relative and relationship, and the system looks up only that. There is no trawling of villages.
   - The relative's record use is logged and visible to the applicant.
   - Matching must not key on current village. It should support maiden names, natal villages and pre-2012 district names (Bastar → Kondagaon).
   - A mother's line must be a selectable path with officer review, not an automatic AMBER.
6. **Give operators fairness and support.**
   - Reason codes carry a cause tag (citizen document / scan / eligibility / officer judgement), and operators are never ranked or penalised on officer-judgement outcomes.
   - A paid or free "cure" transaction, so send-back isn't unpaid rework.
   - pHash rules that whitelist kiosk backdrops and legitimate sibling reuse of a parent's certificate.
   - A low-bandwidth, text-first kiosk view with offline draft saving.
   - Deadline awareness: flag scholarship or exam deadlines, and surface the temporary-certificate route or an acceptable acknowledgement.

## How the pitch should talk about citizens
Talk about the applicant as the person the state already owes an answer to: *"The state already holds your family's proof. You shouldn't have to find it, pay twice, or guess why you were refused."* Don't reduce citizens to "₹261 of lost wages" or to fraud suspects. Never make a "fake certificate" flag on a tribal family the demo's wow moment. Show a Sunita who learns at the kiosk what to bring, gets a reason she can understand in her own language, and doesn't have to make a second trip.
