# Critique 1: How an SDO (Revenue) would see "Nirnay Sahayak"
*This is a role-play review. The speaker is a composite SDO (Revenue) in Kondagaon district with 9 years in revenue service, including earlier years as a Tehsildar. He decides permanent SC/ST/OBC caste certificates on Sewa Setu. He has about 150 caste files pending, Patwari posts lying vacant, a writ petition or two from rejected applicants, a Monday meeting where the Collector reviews speed rankings, and a standing fear of vigilance. He has read the July 2026 High Court rulings. He is not a real person, and his local details are plausible illustrations, not verified facts. He was given the validation report (§7 in particular) and skimmed files 03 and 05.*

---

## 1. First reaction (3 lines)
1. You have named my district as a "high-rejection" pilot, using an all-services number (Kondagaon 11.6%) that you admit you cannot split by service. Before I say anything about the product, I already feel accused.
2. The family-certificate lookup is the one thing here I would open on a real working day. Almost everything else adds a colour, a click or a log that vigilance will read before I do.
3. "The AI never decides" is written for the judges. My question is who stands in the witness box when a GREEN file turns out to be a fake Halba or Baiga certificate. The answer on this page is me.

---

## 2. What would genuinely help me day-to-day

**a) Searching the archive for a sibling's or relative's certificate. This is the real product.**
- Today I see only what the CSC operator uploaded. Many applicants have an elder brother or sister who got a permanent certificate on e-District or Sewa Setu after 2018, but the operator never asked for it. They upload a blurry vanshavali and a Sarpanch letter instead, and I have to send back or reject.
- A lookup that finds certificate no. XXXX issued to the sister, same father's name, same village, with QR-verified status, turns a doubtful file into a clean one in 30 seconds. It is also exactly what the HC said on 22-07-2026 (father or sister already holds a permanent certificate). That is the one point in this report that turns directly into a decision on my desk.
- Be realistic about fathers. The archive starts in 2018. Most fathers of today's 17 to 25 year-old applicants got their certificates in the MP era or from the old Jagdalpur/Bastar offices, handwritten or typed, and those are not in your database. **Sibling and cousin matches are where your hit rate will come from.** Say so, and design for it.

**b) Checking that an uploaded certificate is real.**
- Half my fear is a scanned "father's certificate" that was photoshopped at a shop. If the panel says "certificate no. entered = exists in archive, name matches, caste matches, not cancelled, issued by SDO X on date Y", that alone is worth installing.
- Today I either trust the scan or ask the reader to call the other office. You do not even need AI for this. It is a lookup.

**c) A conflict flag when a relative's certificate shows a different caste.**
- This is my vigilance protection. If the cousin is recorded as Dhimar/Kewat (OBC) and the applicant claims an ST, I want to know before I sign, not after the Scrutiny Committee finds it three years later.
- It works only if the flag is correct. See §3 on spelling variants.

**d) A send-back with a specific list of what is missing, in Hindi, drafted for me.**
- I already use Sendback. What wastes my time is typing the same "कृपया 1950 के पूर्व का राजस्व अभिलेख / वंशावली पटवारी से प्रमाणित कर संलग्न करें" ("please attach a pre-1950 revenue record / vanshavali certified by the Patwari") again and again, and the applicant then coming back with the wrong paper.
- A tick-list of deficiencies that produces a clean Hindi send-back note, which the applicant receives by SMS/WhatsApp, would cut repeat visits and reduce the "no reasons given" appeals.

**e) A draft rejection order with reasons, for rejections only.**
- Appeals to the Collector, and now writs, all start with "no reasons given". A template that fills in the record-backed facts for a rejection and leaves me a mandatory box for my own finding is useful.
- **Do not** make me sign an extra order on every approval. For an approval, the certificate is the order.

**f) A queue sorted by how complete the evidence is.**
- I will not "bulk approve", and I understand why you forbid it. But I want the 40 files with an exact, verified sibling match sorted to the top so I can clear them first, one by one, and give my real time to the 20 doubtful ones.
- Sorting is fine. Colour-coding is where the trouble starts.

---

## 3. What would NOT work in practice (what I would ignore or resent)

### Workflow, clicks and login
- **Separate app or login: I will not use it.** I already juggle Sewa Setu (e-Pramaan/OTP), the DSC token or e-Sign OTP for signing, the RCMS revenue court portal, e-Office, and WhatsApp groups from the Collector's office. If Nirnay Sahayak is a new tab with its own login, it dies within a week.
- **"The officer must tick or override each flag" means clicks across 150 files.** Three flags per file at 10 seconds each is 75 minutes a week of clicking that, from where I sit, earns me nothing in the ranking. I understand it is meant as legal friction against rubber-stamping. It will still turn into click-through within a month, and then the log shows I "acknowledged" a flag I never read. That is worse for me than no flag at all.
- **The office reality.** In many subdivision offices the computer operator drives the login and the screen, and the officer reviews and signs. I am not proud of it, but it is how 150 files move. A tick-box meant to prove "application of mind" is then proof of nothing, and your design should not pretend otherwise. Put friction only where it matters: rejections, and approvals where a conflict flag is open.
- **Connectivity.** Sewa Setu slows down in the afternoons. BharatNet goes down. Power cuts happen during the rains. If your lookup takes 20 seconds or times out, the operator will skip it. It must be fast, fail open ("lookup unavailable, decide as usual"), and never block the Approve/Reject/Sendback buttons.

### "Who is responsible if the AI says GREEN and it is fake?"
- **Me.** Section 12 of the Caste Act names the Competent Authority. CHiPS, the vendor and the hackathon team are not named.
- A GREEN label is dangerous for me in two ways:
  - If I approve a GREEN file and it is fake, vigilance asks why I did not do a Rule 8 enquiry. "The system said green" is not a defence. It reads like I outsourced my mind, which is Jadeja.
  - If I approve an AMBER file after considering it, the log shows the machine warned me and I went ahead. That is the first exhibit in any inquiry.
- **Lineage can launder fraud.** If one fake certificate slipped through in 2019, your system will now mark the whole extended family GREEN because a relative holds a certificate. One bad certificate becomes ten, each approved with the system's blessing. Your "random audit of the GREEN lane" will then find my approvals, not the original fraud.
- So I do not want lanes. I want evidence and a list of what is missing, with no verdict attached.

### Is the Patwari report still needed?
- **Yes.** Rule 3(3) requires a three-generation family tree issued by the Halka Patwari, and Rule 8 requires the enquiry. Nothing in §7 removes either, so my real bottleneck is untouched.
- That bottleneck is one Patwari holding two or three halkas and the vanshavali taking two weeks of the 22-day SLA. Your "officer time saved" number (18,000 to 26,000 hours) is measured at the wrong desk. Half the delay is before the file reaches me.
- If you want to save time, pre-fill the Patwari's vanshavali with the certificates you already found, so he confirms instead of writing from scratch.

### Common surnames: Netam, Markam, Sori, Korram, Mandavi, Poyam, Salam, Sahu, Yadav
- In a Kondagaon village, half the households may be Netam or Markam. "Sukhram Netam, village X" can be three different men. Father's names are written as Sukhram, Sukharam, Sukhu, or Sukh Ram.
- A RapidFuzz score of 92 on name + father's name + village will link unrelated families. A wrong link is not harmless. It makes me approve on a stranger's certificate, or it throws a false "different caste" conflict against a genuine applicant.
- Sahu and Yadav are everywhere in the OBC files. Name matching on these surnames is close to useless without an exact certificate number or mobile/Aadhaar-seeded identity.
- **Mobile numbers are not identity.** The report says archive pull works by "application number + mobile". Half my applications carry the CSC operator's or kiosk's mobile number. The same number appears on 200 unrelated applicants from one camp.

### Caste name variants
- A "different caste" flag done by string comparison will fire all day. Gond / Gound / Gondh; Dhimar / Dheemar / Dhivar / Kewat; Rawat / Raut / Yadav; Kalar / Kalal; Halba / Halbi; Muria / Madia / Maria; plus old e-District dropdown entries typed differently.
- Some of these are genuinely different entries in the notified list and some are the same. Only a person who knows the Schedule and local usage can say which. **Halba/Halbi in particular is a sensitive, litigated area.** Get it wrong and you either insult a genuine community or wave through the thing vigilance looks for first.
- Map everything to the serial number in the notified ST/SC/OBC list, with a synonym table signed off by the department, not by your fuzzy matcher.

### Genealogy (vanshavali) practice
- In interior villages, the Patwari writes the vanshavali mostly from the applicant's statement, the kotwar and the Sarpanch, not from records. Names two generations up are often nicknames or clan names.
- Your "evidence card" will show a formal-looking tree built on oral testimony. Label oral sources as oral, or it will look stronger than it is, and in court it will be.

### Married women
- Caste follows the father, not the husband. A married woman applies from her husband's village with her married surname, under a different tehsil or district. Her father's and brothers' certificates sit in her maiden village, perhaps across the district line, perhaps in Odisha.
- Match on the current address and surname and you find nothing, or worse, you find her husband's family. Different Gond clans have different surnames, so a Netam woman who married a Markam triggers "no family match". An OBC woman who married into another OBC caste triggers a "different caste" conflict.
- **You need a mandatory "father's name / maiden village" search path.** Nobody on your team has thought about this, and it is common in my files.

### Migrant families
- Some families came from Odisha, Maharashtra or other districts after the cut-off dates. They are not entitled to a CG certificate for reservation, and they are often the most insistent applicants.
- If their cousin somehow got a CG certificate, your lineage match shows GREEN and helps them. The tool must show *where and when* the relative's certificate was issued and on what basis. A certificate "found" is not a certificate "valid for this applicant".
- For inter-district moves inside CG, your archive helps. For inter-state moves it is blind, and it should say so rather than show nothing.

### Pre-1950 proof: the ground reality
- Kondagaon was carved out in 2012 from Bastar, which was a princely state. The old settlement records, where they exist at all, are in Jagdalpur's record room: some illegible, some damaged, and many families not in them because they never held patta land.
- Forest villages and landless families have no misal. The report's own data table says Missal/Chakbandi is name-searchable only for 21 legacy districts, behind a CAPTCHA.
- So for my most genuine applicants, the landless tribals, your system will show no revenue record and no archive match. The only evidence is a Gram Sabha proposal and the Patwari's enquiry. **If a blank evidence card looks worse than a full one, you will push me towards rejecting exactly the people the HC is protecting.** The design principle "missing data does not mean ineligible" must be visible on screen, not just in the slide deck.

### The speed ranking
- The ranking formula (H = 0.5·C − …) counts Approve, Reject and Sendback as "processed". Nothing in it rewards a correct decision.
- Your 90-day shadow mode is extra work that the ranking will not credit. If the Collector does not formally protect pilot officers for those 90 days, my score falls and my Monday meeting gets worse. I will not volunteer for that.
- Because Sendback counts as processed, your "send back instead of reject" recommendation suits my score. But the MIS does not track how many times a file bounces. You could create a send-back loop that looks good on my ranking and bad for the applicant. Measure loops.

---

## 4. Hidden risks you have not priced in

**Legal: my signature and void orders**
- If 300 of my rejection orders read word for word the same because they come from your Jinja template, the first writ will call them mechanical orders passed without application of mind. The HC has struck down cyclostyled orders for decades.
- A template does not protect me. The officer's own finding box, filled in for each case, protects me, and that box must be mandatory for every rejection.
- The Sonkar ruling (HC, July 2026) says Tehsildars were never competent for permanent caste certificates. **Your archive is full of permanent certificates that Tehsildars signed before the ruling.** Are those valid "relative's certificates" under Rule 3(3)? Nobody knows yet. If your tool shows them as clean evidence and a court later says they were void, every approval built on them is exposed.
- Show the issuing authority's designation on every matched certificate, and let the department decide the policy. You should not decide it.
- Your own report gives the SC/ST cut-off as 10-08-1950 in §4 of 00, while file 03 says SC 10-08-1950 and ST 06-09-1950. If the rule engine carries that error, every ST check is wrong. Fix it before anyone at CHiPS reads it.

**Vigilance**
- Every log line ("viewed flag", "overrode flag", "time on file: 14 seconds") is evidence that can be used against me. Nothing in §7 says who can read these logs or what they may be used for.
- Unless a government order says a recorded, reasoned override is a proper exercise of discretion and not by itself adverse, the rational choice for me is to reject or send back every AMBER file. **Your tool would then raise rejections, the opposite of your impact claim.**

**Applicant appeals and RTI**
- Under the DPDP rules you plan to tell the applicant which records were used. Good. The applicant's lawyer will then attach your evidence card to the appeal: "the machine matched my client to the wrong Netam family".
- Who files the affidavit defending the matching logic before the Collector, the Commissioner or the HC? CHiPS? NIC? A graduated CM IT Fellow? It will be me, and I cannot explain RapidFuzz.
- Every false conflict flag becomes appeal material. The whole evidence card becomes discoverable under RTI.

**The officer-association reaction to the "consistency dashboard"**
- "Officer override rate" and "district rejection variance" on the Collector's and CHiPS's screens is a leaderboard with extra steps. The Tehsildars' association struck twice in 12 months over staffing and dignity. Our State Administrative Service association will not accept an AI-generated "inconsistency" score at the Monday meeting.
- Your own research file (03, §7.2) says "do not show officer-level leaderboards". §7.8 of the validation report then proposes officer override rate. Pick one.
- A high override rate may mean the officer is careful and the model is wrong. A low one may mean click-through. The number cannot tell them apart, and the Collector will read it as "disobeys the system".

**Errors in old e-District data**
- The 2015 to 2018 e-District certificates carry operator mistakes: the wrong caste picked from a dropdown, the father's name spelled three ways, the wrong village code after a panchayat reorganisation. Some legacy Hindi was typed in Kruti Dev instead of Unicode and is garbage to any matcher.
- Certificates later cancelled by the Scrutiny Committee: is cancellation written back into the archive? If not, your tool will cite a cancelled certificate as evidence. **This is the single most dangerous data gap.** Temporary certificates are also in the archive and must never count as lineage proof.
- Duplicate applications are a hidden inflator of the "1 in 5 rejected" figure. Operators file two or three times for the same person, and some "rejections" are simply closing the duplicates. Some of your 1.47 lakh "avoidable rejections" are not avoidable at all.

**The pHash duplicate flag works against your own lineage feature**
- Siblings are *supposed* to upload the same father's certificate. A camp from one village legitimately uses the same Gram Sabha proposal and the same Sarpanch letter for 40 people.
- A "same document reused" flag will fire on precisely the honest family cases you want to fast-track. Flag reuse only across *unrelated* applicants whose details conflict (different father, different village), not reuse in general.

**Accountability after the hackathon**
- CM IT Fellows rotate. When the synonym table is wrong in month 8, who fixes it, under which order, and who signs off?

---

## 5. Questions I would ask the team
1. Does your archive include e-District certificates issued between 2015 and 2018? Does it mark **cancelled**, **temporary**, and **Tehsildar-issued permanent** certificates separately? Show me the fields.
2. On real Kondagaon names (Netam, Markam, Sori, Korram, Poyam), how often does a "family match" from your matcher link to the wrong family? Measure it against files an officer has already verified, not synthetic names.
3. How do you search for a married woman's father's family when she applies from her husband's village under his surname?
4. Is this a panel inside the Sewa Setu officer screen, or a separate login? How many seconds does it add to a clean file? What happens when your service is down?
5. Who, under which government order, is responsible for a wrong match? Will the Revenue Department issue a circular saying that an officer who relies on the evidence card with recorded reasons has exercised due diligence under s.12?
6. Who can see my override log? Will it go into the Collector's review, my ACR, or a vigilance file?
7. What does your rule engine do with Halba/Halbi, Dhimar/Kewat, Rawat/Yadav? Who wrote the synonym table, and which notified list serial numbers does it map to?
8. Will the Collector exclude pilot officers' shadow-mode period from the speed ranking, or add "reversed on appeal" and "send-back loops" to it?
9. Instead of 90 days of shadow mode on live files, can you run it on my last year's decided files and show me where it disagreed with me and why?
10. How much of the caste rejection pool is duplicates, wrong-service applications, or first-generation applicants with no relative's certificate at all? Your Assumption A (30 to 50% have a relative's certificate) sounds high to me. From my own files I would guess 10 to 20%, but prove me wrong with data.
11. Can the lineage check run **at the CSC counter or camp before submission**, so the file reaches me complete? Camp caste applications are rejected at 38 to 43%.
12. Where does the evidence card sit in the case file? Is it part of the record the applicant gets, and is it retained for appeal and RTI?

---

## 6. The 5 changes that would make me actually use it (in priority order)

**1. Embed it and make it zero-click for clean files, failing open.**
- One collapsible "परिवार प्रमाण / Evidence" panel inside the existing Sewa Setu officer screen. There is no new login.
- It loads in the background and never blocks Approve/Reject/Sendback. If it is down, the screen says "lookup unavailable" and I proceed as today.
- Friction (a mandatory reason box) applies only when I reject, or when I approve with an open conflict flag. There is no per-flag tick on clean files, and no extra order to sign on approvals.

**2. Show evidence, not a verdict. Remove GREEN/AMBER and make the matching honest.**
- Replace the lane colours with:
  - "Relative's certificate found (exact: certificate no. + QR + father's name)"
  - "Possible match, verify (reasons listed)"
  - "Not found. Absence is not ineligibility; proceed per Rule 8."
- Every matched certificate shows issuing officer and designation, date, permanent or temporary, cancelled or not, and the village or district of issue.
- Mandatory father's-name and maiden-village search for married women.
- Caste comparison uses notified-list serial numbers plus a department-approved synonym table, never raw strings.
- The duplicate-document flag fires only across unrelated applicants.

**3. Legal cover in writing before go-live.**
- A Revenue Department circular or GO that says:
  - The tool is an aid to the Rule 7/8 enquiry.
  - The evidence card and a recorded reasoned override are the officer's due-diligence record under s.12.
  - Override logs are for system improvement and audit of the *tool*, not for ranking or disciplinary action without a separate complaint.
- Rejection orders must carry the officer's own written finding. The template fills in only the record-cited facts.
- CHiPS, not the officer, defends the matching logic whenever it is challenged.

**4. Move it upstream, to the CSC counter, the camp and the Patwari.**
- Run the lineage lookup and a deficiency checklist at the counter *before* submission, so the operator asks "does your brother or sister have a certificate?" and attaches it. That fixes the 38 to 43% camp rejections at source.
- Pre-fill the Patwari's vanshavali form with the certificates already found, so a stretched Patwari confirms instead of writing from scratch.
- Generate the send-back deficiency list in Hindi and send it to the applicant's own mobile (not the operator's), with a one-time resubmission path.
- This reduces my 150-file pile. Adding intelligence at my desk does not.

**5. Measure the right thing, and prove it on my old files first.**
- Back-test on the last year of my subdivision's decided caste files. Show where it disagreed with me and whether it was right, especially on common surnames and married women, before touching a live file.
- The dashboard stays at district and tehsil level only. Drop the officer-wise override rate.
- Add appeal-reversal rate and send-back-loop count next to the existing speed metrics, and ask the Collector to exclude pilot officers from speed-rank penalties during the pilot.
- Stop presenting Kondagaon's all-services 11.6% as a caste-scrutiny problem until you have the district × service split.

---

## 7. Scores

| | As proposed in §7 | With the 5 changes |
|---|---|---|
| **Would I use it myself?** | **4 / 10.** I would use the certificate lookup and the Hindi send-back draft. I would ignore the lanes and resent the per-flag ticks and the dashboard. | **7 / 10.** The sibling-certificate lookup plus certificate-authenticity check alone would save me real time and real fear. |
| **Would I recommend it to the Collector?** | **3 / 10.** The Collector would like the dashboard, which is the part I fear. I would not put my name to a GREEN lane on caste certificates in a district with a Halba/Baiga history. | **6.5 / 10.** I would recommend it as an intake and evidence tool with legal cover, piloted first in one subdivision on back-tested data. I would not pitch it as "AI that fixes rejection rates". |

**Bottom line from my chair:** build me a fast, honest *records lookup* that checks certificates for authenticity and cancellation, finds the brother's or sister's certificate, and tells the applicant exactly what is missing before the file ever reaches me. Do not build me a traffic light with my name on the signature line.
