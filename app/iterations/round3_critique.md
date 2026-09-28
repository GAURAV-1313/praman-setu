# Round 3 critique: UI/UX and information design
27-09-2026. Lens: can the officer tell **what the evidence is, what is missing and what to do** within about 10 seconds, and decide a clean file without reading everything?

**Reviewers (composite, not real people)**
- **(a) A senior government-product UX designer** who knows UX4G / NeGD, GIGW 3.0 and WCAG 2.1 AA.
- **(b) An SDO, 52.** Reads Hindi more easily than English. Works on a 1366×768 office monitor (sometimes a 1280×720 laptop) and mostly uses the mouse.
- **(c) The jury**, watching on a projector (1920×1080 at 125% = 1536×864 CSS px).

**Method**
- Ran `POST /api/reset`, then used the live app (:5173, backend :8000) on tab-1.
- **Viewports:** 1366×768, 1280×720 and 1536×864 (the projector).
- **Languages:** Hindi and English.
- **SDO cases:** 08812 (confirmed and signed end to end), 08790, 08835, 08841 (X → show-cause panel, not signed), 08856, 08863, 08870, 08811, 08743.
- **Tehsildar:** 08902.
- **Other screens:** Landing, Queue (SDO and Tehsildar), Kendra (Sunita demo → consent → search), Collector, Audit.
- **Measurements** came from JS (`getBoundingClientRect` and `getComputedStyle`; contrast computed from WCAG relative luminance). No code was edited.
- **Caveat:** another session was using the same backend at the same time. 08790 was already "Approved SDO-KON/2026/0002" when I opened it, and my 08812 order was numbered 0003. The UI findings below do not depend on that.

---

## 0. Verdict in five lines
1. **Round 2 made the screens legally honest, but the case view now asks for reading, not glancing.**
   - At 1366×768 the three-column grid starts at **Y=331** (43% of the screen is chrome).
   - One page uses **16 different font sizes**, and 25 text runs are 10.5–11 px.
   - The same evidence sentence appears **3–4 times** (band, checklist, centre card, right panel, flag).
2. **Colour carries no meaning.**
   - All three lane chips are navy or slate on white: `records_complete` #134A9C, `standard_review` #334E7A, `needs_attention` #3F4A5E.
   - The queue is monochrome, so the officer cannot see at a glance which files are clean.
3. **The one fact the officer must judge is not visible.**
   - On 08812 the "पिता ↔ धारक ≈ वर्तनी" row shows **"रामलाल मरकाम" vs "रामलाल मरकाम"** in Hindi: the two are identical.
   - The Latin forms, where the spelling actually differs, are **ellipsised** ("Ram Lal Markaam" is 196 px of content in a 178 px cell).
4. **The visual hierarchy re-introduces the anchoring that round 2 removed.**
   - The right panel's big green "✓ पहले संबंध दर्ज करें (पिता)" opens only the *same family* grounds, with a ground pre-ticked.
   - In the card, "Same family" is a solid green button while "Not this family" is only an outline.
   - The queue's "Records suggest" column says **"✓ Approve"** for files with *no* family record (08710), an unresolved possible match (08845) and unconfirmed matches (08811/08812/08772).
5. **Decision controls fall below the fold, and focus goes to places the officer can't see.**
   - On 08870 the A/S/R/X row is at Y=787 and Sign at Y=876 (viewport 768).
   - On 08841, pressing X focuses a textarea at Y=789, so the officer types without seeing it.
   - The sticky right panel (`top:12px`) slides under the 77 px sticky nav.
   - The signing dialog shows **29%** of the order (274 of 941 px) at 13.5 px with ~110-character lines.

---

## 1. Measurements (1366×768 unless noted)
| What | Measured | Target |
|---|---|---|
| Chrome above the case grid | topbar 40 + sticky nav 77 + synthetic banner 33 + Prev/Next row ~50 + case band 95 → **grid Y=331**; at 1280×720, **Y=362** | Verdict visible by Y≤200 |
| Case-grid columns | `300px 588px 390px` (3 columns); at 1280, `832px 380px`, with the Application column pushed below | 2 columns max at ≤1440 |
| Distinct font sizes on 08812 | **16** (10.5, 11, 11.5, 12, 12.5, 12.9, 13, 13.5, 14, 14.5, 14.72, 15, 15.5, 16, 18, 20.64). 10.5–11 px used on 25 text runs | 5-step scale; minimum 13 px (14 px for Devanagari body) |
| Muted text contrast | `#64748B` on `#FFF7EF` = **4.49:1** at 12 px (app IDs, Latin alt-names, table headers). Fails AA by a hair and washes out on a projector | ≥ 4.5 (aim for 5.5) |
| Focus ring | `3px solid #FDBA74` on `#FFFAF4` ≈ **1.6:1**. Fails WCAG 1.4.11 (3:1 for non-text) | ≥ 3:1 |
| Lane chips | all white background with navy/slate text; the only differences are the dot, ring or diamond shape | Green / neutral / amber, keeping the shapes |
| Truncation | 3 cells in the comparison table, including the differing name | 0 in `≈`/`≠` rows |
| 08870 decision | A/S/R/X Y=787, Sign Y=876 (fold 768) | Always visible (sticky bar) |
| 08841 after X | focused textarea at Y=789, `case-right.scrollTop=0` | In view |
| Signing dialog | modal 691 px; `.order-preview` 274/941 px visible; 13.5 px; line 740 px (~110 chars); at 1280×720 ≈ 233 px visible | ≥ 60% visible; 15–16 px; ≤ 70ch |
| Right panel | `position:sticky; top:12px; max-height:calc(100vh-24px); overflow:auto`, under a 77 px sticky nav → "साक्ष्य" heading hidden after scrolling; nested scroll for the WhatsApp preview | `top: calc(var(--nav-h) + 12px)`; no nested scroll |
| Landing | H1 at Y=476; role cards start at ≈Y=830 (below the fold) | Role cards above the fold |
| Queue | Table starts at ≈Y=340, so 6 rows are visible; thead is not sticky | ≥ 8 rows; sticky thead |

---

## 2. Findings, screen by screen

### 2.1 Landing (`pages/Landing.tsx`)
- **Screenshot, 1366×768:**
  - an orange strip, then the nav
  - a **264 px AI-generated "लोक सेवा केंद्र" banner** (cartoon citizens at a Kendra counter, with the portal's slogan baked into the image in Hindi, even in English mode)
  - then "The state already holds your family's proof." at Y=476, with the family-tree illustration on the right
  - the role cards are below the fold
- **The banner tells Sewa Setu's story, not ours.** In 5 seconds a juror learns "this is a Lok Seva Kendra". They do not learn that "the archive already holds your father's certificate, and the officer sees why".
  - The bottom-right badge in the banner has garbled AI "emblem" text. On a projector it reads as sloppy.
- **The strongest asset is below the banner.** The H1 plus `FamilyTreeIllustration` (child → father's certificate, dashed "found" link) *is* the 5-second story. Make it the hero.
- **The role cards are good:** clear illustrations and a one-line job description each. But they sit below the fold, and the landing calls the role "Kendra Operator / केंद्र ऑपरेटर" while the role pill says "केंद्र संचालक".
- **The state crest appears on a page that says "not an official portal".** Keep it small, as it is now. Consider a neutral "Sewa Setu Innovation Hackathon" mark instead, so no juror asks about emblem use (P2).
- **Guardrail tiles are good copy.** The icons (✍ ⚖ ○ ⛨) are Unicode glyphs that render differently on Windows; use the inline SVG set.

### 2.2 Queue (`pages/Queue.tsx`)
- **Screenshot (Hindi, SDO):**
  - "आवेदन कतार"
  - filter pills: सभी 28 · ⏰ ≤3 दिन 0 · अभिलेख पूर्ण 4 · सामान्य जांच 14 · ध्यान दें 10
  - a 6-column table with the lane chip at the far right; every chip looks alike
- **P0: the "अभिलेखों का सुझाव / Records suggest" column anchors.**
  - It shows "✓ स्वीकृत करें" on 08710 and 08791 ("पारिवारिक अभिलेख नहीं — सामान्य जाँच").
  - It shows the same on 08845 ("संभावित पारिवारिक अभिलेख — वही परिवार / यह परिवार नहीं चिह्नित करें").
  - It shows the same on 08811, 08812 and 08772, before the relationship is confirmed.
  - Round 2 removed pre-selection on the case screen, but the queue still tells the officer "approve" before they open the file.
- **P0: no colour semantics.** Lane chips are blue, slate and grey on white, and attention rows look like clean rows. The officer cannot scan for the 4 clean files.
- **P1: SLA ordering hides near-due attention files.**
  - 08778 and 08785 (4 days left) are rows 19–20, below 14 standard-review files with 11–28 days left.
  - "≤3 दिन" shows 0, so nothing looks urgent.
  - Tehsildar's 08857 "⏰4 दिन विलंब" is the only coloured SLA in the whole app.
- **P1: garbled Hindi village names**, which a Kondagaon officer spots at once:
  - मोह्लै, संड्सा, सेओनिपल, मरंग्पुरी, अड्नर, उपर्बेडी, बंचपै, चिल्पुटी, उंला
  - These come from machine transliteration in the fixtures.
- **P2 terminology in one table:** "सामान्य जांच" (chip) vs "सामान्य जाँच" (reason text), and "⇪ अग्रेषित करें" vs "संदर्भित करें" on the case page.
- **No "officer's own view".** There is nothing like: my files due this week, files waiting on others (sent back, Patwari reference, show-cause reply due), signed today (with the call-back window). The queue already returns decided items with `application.status`, so this can be computed client-side (§4).

### 2.3 Case view: common layout (`pages/CaseView.tsx`, `components/LineageCard.tsx`, `components/ActionPanel.tsx`)
- **Screenshot (08812, Hindi, 1366×768):**
  - **Case band:** name, service pill "अनुसूचित जनजाति जाति प्रमाण पत्र — स्थायी" ("जनजाति जाति" is doubled), purpose, SLA "25 दिन शेष · 22 अक्टू॰ 2026", lane chip, and a 2-line grey lane explanation on the right.
  - **Below it, three columns:**
    - Application / checklist (300 px)
    - lineage card (588 px), with a 5-row comparison table and the "✓ वही परिवार / ✗ यह परिवार नहीं" pair at Y=675
    - the right panel: "साक्ष्य" summary, 4 action tiles, and a big green "✓ पहले संबंध दर्ज करें (पिता)"
- **What the officer must read, and how often it repeats (08812):**
  1. **Band lane reason:** "मेल खाता पारिवारिक प्रमाण पत्र (क्र. …004512) आपकी पुष्टि की प्रतीक्षा में है"
  2. **Checklist:** "आपकी पुष्टि की प्रतीक्षा: अभिलेखागार में प्रमाण पत्र क्र. …004512 मिला"
  3. **Card header:** "सिस्टम द्वारा अभिलेखागार में मिला · पिता: रामलाल मरकाम · प्रबल कड़ी · मॉडल 98%"
  4. **Right panel:** "पिता का प्रमाण पत्र मिला · प्रबल कड़ी · संबंध की पुष्टि करें / जाति प्रमाण: आपकी पुष्टि की प्रतीक्षा"
  5. **Right-panel CTA:** "पहले संबंध दर्ज करें (पिता)"

  That is five restatements of one fact. The things that actually need judgement are the spelling variant, the age gap of 32 and the corroboration (ration roster lists her as a member). They are small table cells or sit below the fold.
- **"अन्य अभिलेख / Other records" appears twice:** inline under the table, and again as a separate card "अन्य अभिलेख · मॉक · चरण 2 स्रोत". "(नमूना)" / "(mock)" is repeated six times.
- **English and jargon in the officer view:**
  - "QR ✔", "LGD 448703", "मॉडल · 98%", "मॉक · चरण 2 स्रोत"
  - hidden validity text: "प्रमाण पत्र में वर्ग OBC दर्ज; आवेदन में वर्ग ST।"
- **Date formats are mixed:** "22 अक्टू॰ 2026" and "14 मार्च 2019" on screen, but DD-MM-YYYY in orders. Officers read DD-MM-YYYY.
- **The status line is misleading.** "सूची के दस्तावेज़ संलग्न / Checklist documents on file" shows in the right panel while the checklist says the Patwari family tree is **not on file**. It is technically "the Sewa Setu list", but at a glance it reads as "all documents present".
- **The lane flips silently.** After C → ↵ the band changes from "सामान्य जांच" to "अभिलेख पूर्ण", with a small animation and no explanation. That is fine, but with no colour it is easy to miss.

### 2.4 Case-specific findings
| Case | What the screen shows | Issue |
|---|---|---|
| **08812** Sunita, father found | 3 columns; confirm pair at Y=675; big green CTA in the right panel | **P0** the spelling difference is invisible in Hindi and truncated in English. **P0** the right-panel CTA leads to "same family" only (it opens the grounds pop with "पिता का नाम व गांव समान" pre-ticked). After confirm: Approve pre-selected, navy "✍ हस्ताक्षर कर जारी करें" with a Ctrl+↵ key hint. |
| **08790** Rohit, declared sister | Approved (by the other session) → "निर्णय दर्ज" panel with Next / Call back / View issued text | The decided panel is clean and good. The WhatsApp preview needs a nested scroll inside the sticky panel. |
| **08835** Pooja, OBC, no record | Centre card "No family certificate found" with a search illustration. Right panel repeats the no-record notice. Missing items are listed as "Missing: Caste proof, Father's income certificate" | The no-record message appears 3 times (band, centre, panel). "What's missing" is the most useful line, but it is 12 px grey in the panel. |
| **08841** Kiran, category differs | Amber flag on top. Card title "⚠ Brother's certificate records OBC… verify". Table row "≠ differs". Panel repeats it. "Records suggest: Refer" | Stated 4 times. After X, show-cause guidance is good copy, but the grounds textarea is focused off-screen (Y=789). "अग्रेषित करें" (tile) and "संदर्भित करें" (suggestion) appear in the same panel. |
| **08856** Meena, cancelled | Amber flag + card title "Father's certificate CANCELLED by the Scrutiny Committee (order DVC/KDG/2024/117, 12-08-2024) — cannot be used as proof" (3 lines of bold orange) | ALL-CAPS "CANCELLED" plus orange bold reads as alarm. Use amber and sentence case: "Cancelled by Scrutiny Committee". |
| **08863** Anil, Tehsildar-issued (2017) | The flag is a 6-line paragraph of legal reasoning above the card | This is where a 52-year-old officer stops reading. The first line should be the verdict ("Not usable as proof until the Committee verifies"), with the HC reasoning behind "क्यों?". |
| **08870** Ramesh, OBC, no record, M | Evidence picker ("School record / Family tree" then "Family tree / School record", with the **order swapped** between rows). **Married-women recall note shown for a male applicant** | A/S/R/X at Y=787 and Sign at Y=876, so the officer must scroll to decide. The note must depend on `sex==='F'`. |
| **08902** Lakshmi (Tehsildar, domicile) | Clean, Approve pre-selected | Shows "अभिलेख-पूर्ण प्रकरण जिला छानबीन समिति के यादृच्छिक सत्यापन नमूने में रहते हैं (नियम 15(2))", which is the caste Act on a domicile file. The service is called "मूल निवास प्रमाण पत्र" here but "मूल निवासी" in the queue and on the Kendra page. |
| **08811 @1280×720** | 2 columns; Application column pushed below the evidence; confirm pair at Y=681–719 (just fits) | Name, father and village from the application are no longer beside the evidence, although they are what the officer compares. |
| **08811 @1536×864 (projector)** | 3 columns, max-width centred; readable at arm's length | 11–12 px labels (table headers, sources, key hints) are unreadable from 5 m. There is no "large text" presenter option. |

### 2.5 Signing dialog (`ActionPanel.tsx` → `SignModal`, `.order-preview` in `styles.css:531`)
- **Screenshot:**
  - a shield icon, "आप यह निर्णय ले रहे हैं / You are making this decision"
  - a 3-line summary (कार्यवाही ✓ स्वीकृत करें · आवेदन · हस्ताक्षरकर्ता)
  - Hindi / English tabs with a legend (yellow system text, green "आपका पाठ / चयन (1)")
  - a **274 px scroller** showing the header, subject and the first relied-upon record
  - an amber-bordered "मैंने पूरा आदेश पढ़ लिया है…" tick (autofocused)
  - "इसके बाद अगला प्रकरण खोलें"
  - Cancel / "ई-हस्ताक्षर (सिम्युलेटेड)"
- **The officer can tick "I have read the order" after seeing 29% of it.** The parts they must own ("अधोहस्ताक्षरी का समाधान", "आदेश") are at the bottom. They sit in plain 13.5 px Space Grotesk / Noto on a 740 px line, the same weight as the header boilerplate.
- **The order looks like a web text box, not an order.** There is no centred heading, no section weight, and no visual separation between "आधार अभिलेख / विचार किए गए, आधार नहीं लिया / विधिक आधार / तथ्य / समाधान / आदेश".
- **Good:** the system-vs-officer tinting, the required tick, Esc/↵, and `aria-modal` + `aria-labelledby`.

### 2.6 Decided panel and WhatsApp preview (`Decided`, `components/WhatsAppPreview.tsx`)
- "निर्णय दर्ज · जारी क्रमांक SDO-KON/2026/0003 · अगला प्रकरण → J · वापस लें (10 मिनट शेष) · जारी पाठ देखें", then the phone mock-up with a Hindi/EN toggle.
- It is clear, but it lives in a nested scroll area. The citizen message is the best "citizen-centric" proof for the jury, and it is half hidden. On decide, show the preview in the centre column (replacing the lineage card), where it has room.

### 2.7 Kendra (`pages/Kendra.tsx`)
- **Layout:** form on the left (4 service tiles, name, father, district, village with an LGD hint, optional certificate number, consent, orange "🔍 पारिवारिक अभिलेख जांचें"); illustration and result on the right.
- **Accessibility:** the consent checkbox's accessible name is **"on"** (`find` could not locate it by its Hindi label). The label wraps the input but the name isn't computed, so check `<label>` structure and add `id`/`htmlFor`.
- **At 1366×768:** consent and the search button are below the fold.
  - The result appears on the right, top-aligned. The operator, looking at the button bottom-left, sees nothing change.
  - The certificate number wraps mid-number ("CG/KDG/SDO/2019/004 / 512") in a large mono font.
- **The result copy is good:**
  - "परिवार का मिलता-जुलता प्रमाण पत्र मिला" with 6 validity ticks
  - "मॉडल कड़ी — संबंध की पुष्टि अधिकारी करेंगे"
  - a documents list with "केंद्र पर लाएं"
- **Missing:** a one-line *what to tell the citizen* and a printable or WhatsApp "bring these" slip. That is the citizen-facing moment.

### 2.8 Collector (`pages/Collector.tsx`)
- **Real MIS strip; KPI tiles** (53,85,535 applications · 48,63,282 approved · 3,64,124 rejected in orange · 95.7% · 4,264).
- **"22.2% → 61.9%" story card, then a bar chart by service.** The Hindi labels wrap and concatenate ("जनजातिप्रमाण पत्र", "आवेदनों में हिस्साअस्वीकृतियों में हिस्सा").
- **Then a choropleth, district table, pilot panel and model evaluation.**
- **English in Hindi mode:**
  - "REAL", "SYNTHETIC", "SYNTHETIC TEST SET"
  - "Sewa Setu public MIS · fetched 27-09-2026"
  - **division names in English** (Durg, Bastar, Raipur…)
  - "Splink Fellegi–Sunter (EM)"
- **"92% अधिकारी सुझाव से सहमत" is presented as a pilot success metric.** Shown to a Collector, that rewards rubber-stamping, which is the exact automation-bias story round 2 fought. Reframe it as "सुझाव से भिन्न निर्णय: 8% (निगरानी; कोई लक्ष्य नहीं)".
- **It helps only the Collector.** The SDO gets nothing here → §4 "मेरा डेस्क".
- **Role pill:** after visiting Kendra, the Collector and Audit pages still show "केंद्र संचालक" (P2).

### 2.9 Audit (`pages/Audit.tsx`)
- A 7-column table (समय · भूमिका · कर्ता · कार्य · आवेदन · देखे गए अभिलेख · टिप्पणी). Record chips are mono pills. The signed row has "▸ स्क्रीन पर क्या दिखा".
- **Hindi mode leaks English:**
  - actor names: "SDO (Revenue)", "Tehsildar", "Operator, CSC Kongera"
  - every note: "Records shown to the officer (lineage matches and registry rows)", "Order SDO-KON/2026/0003 issued; relied on…; system text unedited"
  - registry chips: "Bhuiyan land record (mock)"
  - times: "06:54 pm"
- **No filter.** The one signed order is buried among a dozen "प्रकरण खोला" rows. A vigilance reader wants **decisions first**.

### 2.10 Cross-cutting
- **Keyboard.** The model is good (J/K, A/S/R/X, C/N, Ctrl+↵, Space, ↵, ?). The hint line is 11 px `kbd` glyphs, and the focus ring is nearly invisible (1.6:1).
- **Fonts.** Space Grotesk (Latin) with Noto Sans Devanagari, both bundled via @fontsource. At the same px size, Devanagari reads about one step smaller than Latin (the matras eat the x-height), so 11–12 px Hindi is the worst case. Add `:lang(hi)` sizing.
- **Icons.** Unicode arrows and symbols (⇪ ↩ ✕ ⏱ ◆ ✍ 🗂 📝) are used as icons. They render differently on Windows (Segoe UI Symbol / emoji), and "⇪" (Caps Lock) is not a recognised "refer" icon. Use one SVG icon set (UX4G uses Material Symbols) at 20 px.
- **Colour.** Orange is the brand *and* the "flag" colour (the card border on 08841/08856 is orange, headlines are orange-bold). Keep brand orange for navigation and CTAs on public pages. Use **amber** (#B45309 ink / #FEF3C7 background) for "check this", and never red.

---

## 3. Proposed case view (1366×768), with every round-2 safeguard kept

### 3.1 Principles
1. **One verdict card** at the top of the evidence column answers the three questions: *what is the evidence · what is missing · what you must do*. Every other statement of the same fact is deleted or moved into details.
2. **Two columns max at ≤1440 px.**
   - Left, flexible: evidence and comparison.
   - Right, 360 px: the application facts the officer compares against, plus the checklist.
3. **The decision lives in a sticky bottom bar,** always visible and 64 px tall. The A/S/R/X segment, the "Records suggest" text (only where round 2 allows it) and the Sign button are always in view. Typing areas (grounds, finding, evidence picker, refer-to) open as a drawer *above* the bar, never off-screen.
4. **Progressive disclosure.** "How the records were linked", "all validity checks", "other records (sample)" and legal reasoning go behind `<details>` with a one-line summary: "6/6 जाँच सही", "राशन सूची में आवेदक सदस्य".
5. **Compact chrome on officer routes.**
   - Topbar + nav become one 56 px bar.
   - The synthetic banner becomes a pill in the bar ("नमूना डेटा").
   - Prev / Next / ID merge into the case band.
   - The band is sticky at 56 px after scrolling.

### 3.2 Wireframe: 08812 Sunita (found father, awaiting confirmation), Hindi
```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐ Y=0
│ ◉ प्रमाण सहायक   केंद्र  [अधिकारी]  कलेक्टर  ऑडिट      [नमूना डेटा]  SDO (राजस्व) ▾  हिं|EN  ⋯ │ 56px sticky
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ← कतार  ‹K  J›  सुनीता मरकाम · Sunita Markam   अ.ज.जा. (गोंड) स्थायी · छात्रवृत्ति   ⏱ 25 दिन  (○ सामान्य जांच) │ 56px sticky band
├───────────────────────────────────────────────────────────────┬──────────────────────────────┤ Y≈112
│ ┏━ साक्ष्य निष्कर्ष ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ आवेदन (जिससे मिलाना है)       │
│ ┃ 🗂 पिता का प्रमाण पत्र मिला — CG/KDG/SDO/2019/004512     ┃ │ पिता   रामलाल मरकाम          │
│ ┃    अ.ज.जा. · गोंड · स्थायी · सक्रिय · SDO कोंडागांव 14-03-2019┃ │        Ramlal Markam         │
│ ┃ ⓘ आपको तय करना है: क्या यही आवेदक के पिता हैं?          ┃ │ गांव   बयानार (कोंडागांव)     │
│ ┃ ⚠ ध्यान: नाम की वर्तनी भिन्न · आयु अंतर 32 वर्ष (सामान्य) ┃ │ जन्म   2008 · म               │
│ ┃ ✓ राशन सूची: आवेदक रामलाल के परिवार की सदस्य            ┃ │ दावा   अ.ज.जा. · गोंड         │
│ ┃ ✗ कमी: वंशवृक्ष (नियम 3(3)) संलग्न नहीं — आदेश में दर्ज  ┃ │ ────────────────────────────  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │ दस्तावेज़     ✓ शपथ पत्र (2A)  │
│  मिलान (आवेदन ↔ अभिलेख)                     प्रबल कड़ी ⓘ    │               ✓ पहचान           │
│  ┌──────────────┬──────────────────────┬──────────────────┐ │               ◐ जाति प्रमाण:    │
│  │ पिता का नाम  ≈│ रामलाल मरकाम          │ रामलाल मरकाम      │ │                 आपकी पुष्टि पर │
│  │              │ Ramlal Markam         │ Ram Lal Mark[aa]m │ │               – वंशवृक्ष (3(3)) │
│  │              │                       │ ↑ अभिलेख की वर्तनी │ │ ────────────────────────────  │
│  │ गांव        = │ बयानार · LGD 448703   │ बयानार            │ │ ▸ अन्य अभिलेख (नमूना) · 2       │
│  │ वर्ग · जाति  = │ अ.ज.जा. · गोंड         │ अ.ज.जा. · गोंड      │ │ ▸ कड़ी कैसे बनी · 98%           │
│  │ जन्म        = │ 2008                  │ 1976 (अंतर 32)    │ │ ▸ वैधता जाँच 6/6 सही             │
│  └──────────────┴──────────────────────┴──────────────────┘ │                              │
│   [ ✓ वही परिवार  C ]   [ ✗ यह परिवार नहीं  N ]   ← same style │                              │
│   "संबंधी है या नहीं — यह केवल आप तय करते हैं"                │                              │
├───────────────────────────────────────────────────────────────┴──────────────────────────────┤ Y≈704
│ पहले संबंध तय करें (C / N)   │ [✓ स्वीकृत A] [↩ वापस S] [⇆ संदर्भ R] [✕ अस्वीकृत X] │ [✍ हस्ताक्षर Ctrl+↵] (disabled) │ 64px sticky bottom
└──────────────────────────────────────────────────────────────────────────────────────────────┘ Y=768
```
- **Verdict card rows** use fixed icons and wording. The copy comes from `analysis`:
  - 🗂 **evidence:** what was found or declared, from where, and its status
  - ⓘ **your job:** the one question for this lane
  - ⚠ **attention:** amber lines, only from open flags or table ≈/≠ rows
  - ✓ **corroboration:** registry rows, in words
  - ✗ **missing:** checklist gaps, stating what the order will say
- **Border colour = lane:**
  - `records_complete` → green (#15803D line, #F0FDF4 background)
  - `standard_review` → slate (#CBD5E1, white)
  - `needs_attention` → amber (#FCD34D, #FFFBEB)
- **Comparison `≈` rows** never truncate. They show the *recorded* spelling in its original script with `<mark>` on the differing characters ("Ram Lal Mark**aa**m"), plus the caption "↑ अभिलेख की वर्तनी". In Hindi mode, if the Devanagari forms are identical, the Latin forms are always shown.
- **Equal-weight pair.** Both buttons use `.btn.outline-strong` (same background, border, font-weight and size). Colour appears only after the choice: green chip "✓ वही परिवार — आपके आधार: …", or slate chip "✗ यह परिवार नहीं".
- **Bottom bar states:**
  - before the relationship is decided: the text "पहले संबंध तय करें (C / N)" and a disabled Sign button. **No green CTA.**
  - records complete: the tile follows round-2 rules, plus "अभिलेखों का सुझाव: स्वीकृत"
  - standard review: no pre-selection
  - after X / S / R / evidence picker: a drawer (max 40vh) slides up above the bar with the textarea or chips, autofocused and in view

### 3.3 Variants (the same frame, only the verdict card changes)
```
08841 needs_attention (amber border)
┃ 🗂 भाई का प्रमाण पत्र मिला — CG/KDG/SDO/2020/003318 · सक्रिय
┃ ⚠ वर्ग भिन्न: प्रमाण पत्र में अ.पि.व. (कलार), आवेदन में अ.ज.जा. (गोंड)
┃ ⓘ आपको तय करना है: यह भिन्नता कैसे समझाई जाए?  सुझाव: पटवारी प्रतिवेदन (नियम 8)
┃   अस्वीकृति से पहले कारण बताओ सूचना (15 दिन) अनिवार्य     ▸ क्यों?
┃ ✓ भू-अभिलेख, राशन सूची: पिता गोविंद ध्रुव, ग्राम ईसलनार

08835 standard_review, no record (slate border)
┃ ○ कोई पारिवारिक प्रमाण पत्र नहीं मिला — यह अस्वीकृति का आधार नहीं
┃ ✗ कमी: जाति प्रमाण · पिता का आय प्रमाण पत्र (अ.पि.व., नियम 3(3))
┃ ⓘ आपको तय करना है: दस्तावेज़ मंगाएँ (S) या पटवारी जाँच (R)
┃ (महिला आवेदक) विवाहित हों तो मायके का गांव जाँचें      ← only when sex = F

08863 needs_attention (amber)
┃ ⚠ पिता का प्रमाण पत्र तहसीलदार द्वारा (2017) — समिति सत्यापन तक प्रमाण नहीं
┃ ⓘ सुझाव: जिला छानबीन समिति को संदर्भ   ▸ क्यों? (छ.ग. उ.न्या. 22-07-2026 …)

08790 / 08902 records_complete (green)
┃ ✓ बहन का प्रमाण पत्र — आवेदक द्वारा घोषित (फॉर्म 2A) व अभिलेख से मिलान
┃ ✓ सभी विवरण मेल खाते हैं · राशन सूची में आवेदक सदस्य
┃ ✗ वंशवृक्ष (नियम 3(3)) संलग्न नहीं — आदेश में दर्ज होगा
┃ ⓘ हस्ताक्षर से पहले पूरा आदेश दिखेगा                     [bar: ✓ A preselected · ✍ Ctrl+↵]
```

### 3.4 Signing dialog as an "order sheet"
```
┌──────────────── आदेश — हस्ताक्षर से पहले पढ़ें ─────────────────── Esc ┐  height: calc(100vh - 32px)
│ ✓ स्वीकृत · SS/2026/KDG/08812 · सुनीता मरकाम · आधार: पिता का प्रमाण पत्र 004512 │  1-line strip
│ [हिंदी · प्रामाणिक] [English · अनुवाद]          ■ सिस्टम पाठ  ■ आपका पाठ (1)     │
│ ┌──────────────────────── 68ch, 16px/1.7, Noto Sans Devanagari ──────────────┐ │
│ │                          आदेश                                               │ │
│ │  आदेश क्र. …   दिनांक 27-09-2026   स्थान कोंडागांव                          │ │
│ │  विषय … / आवेदक …                                                          │ │
│ │  ▌आधार अभिलेख            (section headings bold, 4px rule)                │ │
│ │  ▌विचार किए गए, आधार नहीं लिया                                              │ │
│ │  ▌विधिक आधार · ▌अभिलेखों से तथ्य                                             │ │
│ │  ▌अधोहस्ताक्षरी का समाधान   ← green tint (officer)                          │ │
│ │  ▌आदेश                                                                      │ │
│ │  ─────────── आदेश का अंत ───────────  (sentinel)                             │ │
│ └────────────────────────────────────────────── पढ़ा: ███████░░ 70% ──────────┘ │
│ [☐ मैंने पूरा आदेश पढ़ लिया है; निर्णय और कारण मेरे हैं]  Space: आगे पढ़ें → फिर टिक │
│                                        [रद्द करें Esc]  [✍ ई-हस्ताक्षर ↵]          │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- **Space pages down until the "आदेश का अंत" sentinel has been in view** (IntersectionObserver). After that, Space ticks.
- A clean file then takes about Ctrl+↵ → Space → Space → Space → ↵. That is 2 more keys than now, and each one is spent *reading*, which is the point of the safeguard.
- At 1366×768 about 520 px of text is visible, versus 274 now.

---

## 4. Officer's own view: "मेरा डेस्क" strip on the queue (computed client-side)
The queue API already returns every item routed to the role, including decided ones (`application.status`, `sla_days_left`), so no backend change is needed.
```
┌ मेरा डेस्क · SDO (राजस्व) कोंडागांव ─────────────────────────────────────────────────────────┐
│ ⏰ 3 दिन में देय  2   │ 7 दिन में देय  6   │ मुझ पर लंबित  24                                   │
│ ⏳ दूसरों की प्रतीक्षा:  वापस भेजे (नागरिक) 3 · पटवारी प्रतिवेदन 2 (अगला देय 04-10) · कारण बताओ उत्तर 1 (देय 12-10) │
│ ✍ आज हस्ताक्षरित  4  (1 अभी वापस लिया जा सकता है — 7 मिनट)                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- Each number is a filter chip.
- **No ranking and no comparison with other officers,** consistent with the Collector page's "no officer ranking".

---

## 5. Issues with fixes and acceptance tests

### P0 (fix before stage)
| # | Issue | Fix (file / CSS / component) | Acceptance test |
|---|---|---|---|
| P0-1 | **Colour carries no meaning** (lane chips and queue rows) | `styles.css:134-139`: `.lane-chip.records_complete{background:#DCFCE7;color:#166534;border-color:#86EFAC}` · `.standard_review{background:#fff;color:#334155;border-color:#CBD5E1}` · `.needs_attention{background:#FEF3C7;color:#92400E;border-color:#FCD34D}`. Keep the dot/ring/diamond shapes. Queue rows get `box-shadow: inset 4px 0 0 <lane colour>`. The verdict-card border uses the same tokens. Flags use amber, never orange-bold (`.flag`, LineageCard title `⚠` colour → `var(--amber)`). | JS: the three chips have 3 different `backgroundColor`s; text contrast ≥ 4.5 (#166534/#DCFCE7 ≈ 6.5, #92400E/#FEF3C7 ≈ 7). No element with a hue in the red range (h<15° or >345°, s>50%) on /officer and case pages. |
| P0-2 | **The differing spelling is invisible** (Hindi forms identical; Latin ellipsised 178/196 px) | `LineageCard.tsx` comparison rows: for `≈`/`≠` rows drop `.one` (ellipsis), render 2 lines (Devanagari / Latin). When the Devanagari forms are equal, always show the Latin, with a `<mark>` diff of the differing characters (simple LCS on normalised lower-case) and the caption "अभिलेख की वर्तनी / as recorded". | 08812, Hindi, 1366: the row shows "Ram Lal Markaam" in full; `scrollWidth<=clientWidth` for every cell in `.cmp tr.variant, tr.differs`; a `<mark>` exists. |
| P0-3 | **Asymmetric confirm nudge** (green right-panel CTA opens "same family" only; solid-green vs outline pair) | `ActionPanel.tsx`: when `pendingLabel`, replace the green CTA with neutral text "पहले मिलान तालिका में संबंध तय करें — वही परिवार (C) / यह परिवार नहीं (N)" and disable Sign. `LineageCard.tsx`: both buttons get the same class `.btn.decide-pair` (white background, 2px slate border, 600 weight, same size); green or slate only on the resulting chip. | Before the decision, `getComputedStyle` background, border and font-weight are identical for both buttons, and there is no `background: rgb(21,128,61)` button in `.case-right`. |
| P0-4 | **Queue "Records suggest" anchors on unresolved files** | `Queue.tsx:127,175`: rename the column to "अगला कदम / Next step". Show `suggested_action` only when `lane==='records_complete'` ("✓ स्वीकृति योग्य") or `needs_attention` (the check: "पटवारी प्रतिवेदन", "समिति को संदर्भ"). For `standard_review`, show the pending task: "संबंध तय करें" / "संभावित अभिलेख निपटाएँ" / "कमी: जाति प्रमाण" / "सामान्य जाँच". | Queue text contains no "स्वीकृत करें"/"Approve" in any row whose chip is सामान्य जांच (08710, 08791, 08845, 08811, 08812, 08772 checked). |
| P0-5 | **Decision below the fold; hidden focus; sticky panel under the nav** | `CaseView.tsx` + `ActionPanel.tsx`: split into `DecisionBar` (sticky `bottom:0`, 64 px, spans the grid: A/S/R/X segment + suggest text + Sign) and `DecisionDrawer` (textarea, picker, refer-to, grounds library; `max-height:40vh`, above the bar). On select: `el.focus({preventScroll:true}); el.scrollIntoView({block:'nearest'})`. If the right column stays: `.case-right{top:calc(var(--nav-h) + 12px); max-height:calc(100vh - var(--nav-h) - 24px)}` with `--nav-h` set from Layout. | At 1366×768 and 1280×720 on 08870, 08841, 08812: the Sign button's `getBoundingClientRect().bottom <= innerHeight` without scrolling. After X on 08841, `document.activeElement` is inside the viewport. After scrolling 600 px, the first panel heading is below the nav's bottom edge. |
| P0-6 | **Chrome eats 43%** (grid at Y=331/362) | `Layout.tsx`: on `/officer*` routes hide `.topbar` (move हिंदी/EN into the nav), make `.data-banner` a pill in the nav, and reduce nav padding to 56 px. `CaseView.tsx`: fold the Queue/Prev/Next row into `.case-band` and make the band sticky and compact (`top:var(--nav-h)`, 56 px) after 80 px of scroll. Move `lane_reason` into the chip's `title` / verdict card. | 08812 at 1366×768: the verdict card top is ≤ 200 px; the comparison table and the C/N pair are fully visible with no scroll (pair bottom ≤ 700). |

### P1 (this round if time allows)
| # | Issue | Fix | Acceptance |
|---|---|---|---|
| P1-1 | 16 font sizes; 10.5–11 px Devanagari | `styles.css`: tokens `--fs-xs:13px; --fs-sm:14px; --fs-md:16px; --fs-lg:19px; --fs-xl:24px`; replace hard-coded px (grep `font-size: 1[0-2]`); `:root:lang(hi){--fs-sm:15px;--fs-md:17px}`; `.kbd` 12 px min. | JS census on 08812 finds ≤ 6 distinct sizes and none < 13 px (except `.kbd` ≥ 12). |
| P1-2 | Muted contrast 4.49 at 12 px; focus ring 1.6:1 | `--muted:#56657A` (≈5.7:1 on cream). `:focus-visible{outline:3px solid #134A9C; outline-offset:2px; box-shadow:0 0 0 5px #fff}`. `tr.click:focus-visible td{background:#E8EFFB}` plus the outline. | Contrast script: min text ratio ≥ 4.5 on /, /officer, case pages; focus ring vs background ≥ 3:1. |
| P1-3 | The same fact 3–5×; "Other records" twice; "(नमूना)" ×6 | Delete `.band-lane .small` lane reason (tooltip instead); delete the right-panel `.evi-sum` when the verdict card exists; drop the separate "अन्य अभिलेख" card (keep one `<details>` inside LineageCard with a single "नमूना स्रोत" tag). | 08841: the string "OBC"/"अ.पि.व." (category difference) appears ≤ 2× in visible text (verdict card + table). |
| P1-4 | Signing dialog shows 29% | §3.4: `.sign-modal{height:calc(100vh-32px);display:flex;flex-direction:column}`, `.order-preview{flex:1;max-height:none;font:16px/1.7 "Noto Sans Devanagari";max-width:68ch;margin:auto}`; section headings bold (split on known headings in `orderText.ts`); end sentinel + IntersectionObserver; Space = page-down until seen. | 1366×768: `.order-preview.clientHeight ≥ 480`; the tick cannot be set before the sentinel is seen; after reading, Ctrl+↵ → Space×n → ↵ still signs. |
| P1-5 | Misleading or irrelevant copy | (a) "सूची के दस्तावेज़ संलग्न" → "सेवा सेतु सूची पूर्ण · वंशवृक्ष संलग्न नहीं". (b) Married-women note only when `app.sex==='F'` (`ActionPanel.tsx:284`, `CaseView.tsx:350`). (c) Rule 15(2) Scrutiny-sample note hidden for domicile (08902). (d) "अनुसूचित जनजाति जाति प्रमाण पत्र" → "अनुसूचित जनजाति प्रमाण पत्र". (e) 08856 title without ALL-CAPS. | 08870 (M): no "married women" text; 08902: no "नियम 15(2)"; 08812: the panel does not claim all documents are attached. |
| P1-6 | Terminology drift | Add a glossary in `i18n.tsx` (§7) and use it: Refer = **संदर्भित करें** everywhere (tile, queue, suggestion); जांच (anusvara) everywhere; मूल निवास प्रमाण पत्र; केंद्र संचालक; dates DD-MM-YYYY on officer screens (`common.tsx` date helper). | grep in `src/`: no "अग्रेषित", no "जाँच" in UI strings; on-screen dates match `/\d{2}-\d{2}-\d{4}/`. |
| P1-7 | Garbled Hindi village names | Fixtures / `gen_synthetic.py`: take Hindi names from LGD (it has a Hindi column) or a curated list for the ~40 demo villages. Until then, in Hindi mode show the Latin name. | Queue in Hindi: none of मोह्लै/संड्सा/सेओनिपल/मरंग्पुरी/अड्नर/उपर्बेडी/बंचपै/चिल्पुटी/उंला. |
| P1-8 | Queue SLA ordering; no officer view | `queue_key` (api.py) or client sort: within each lane, SLA ≤ 7 days first. SLA cell: amber pill ≤ 7 days, bold ≤ 3 days. Sticky `thead`. Add the "मेरा डेस्क" strip (§4) in `Queue.tsx`. | 08778/08785 (4 days) appear in the first 8 rows or are highlighted amber; the strip counts match the filtered lists. |
| P1-9 | Hindi mode leaks English (Collector, Audit) | Collector: REAL→"वास्तविक", SYNTHETIC→"नमूना", division names in Hindi, "fetched"→"प्राप्त". Audit: i18n actor labels and notes (`{en,hi}` from the backend `audit` or mapped client-side), 24-hour "18:54". Add a filter "निर्णय · सूचना · देखा गया" (default: निर्णय). | Latin-word scan (script in §8) on /collector and /audit in Hindi returns only IDs / cert numbers / "MIS". |
| P1-10 | Landing doesn't tell the story in 5 s; roles below the fold | `Landing.tsx`: remove the 264 px banner (or cut it to a 64 px strip). Hero = H1 + `FamilyTreeIllustration` + a 3-step strip "① केंद्र पर खोज → ② अधिकारी को कारण सहित मिलान → ③ नागरिक को प्रमाण पत्र". Role cards above the fold at 1366×768. | At 1366×768 the H1 top is ≤ 180 and all 4 role cards' tops are ≤ 700. |
| P1-11 | Kendra a11y and flow | Consent: `<input id="consent">` + `<label htmlFor>`. Cert number `white-space:nowrap`. On result: `resultRef.scrollIntoView({block:'start'})` at ≤ 1366, or render the result under the button. Add a "नागरिक को बताएं" line + "पर्ची प्रिंट / WhatsApp" button. | `find("सहमति")` resolves to the checkbox; the certificate number stays on one line; after search the result top is in the viewport. |
| P1-12 | "92% agree" as a success KPI | `Collector.tsx` pilot panel: show "सुझाव से भिन्न निर्णय 8% — निगरानी हेतु, लक्ष्य नहीं". | The text "सहमत" is no longer a headline KPI. |

### P2
- **Model %.** Move "मॉडल · 98%" from the card header into the "कड़ी कैसे बनी" details. Keep the strength word.
- **Evidence picker chip order.** Keep it constant ("School record" first in both rows).
- **Hidden validity text leaks "OBC/ST" in Hindi** (LineageCard validity notes).
- **Role pill follows the route** (Collector/Audit shouldn't say "केंद्र संचालक").
- **Icons.** Swap Unicode glyphs (⇪ ↩ ✕ ⏱ ◆ 🗂 📝 ✍) for one SVG set; "⇆" or an arrow-to-document for Refer.
- **Presenter "बड़ा पाठ".** Add a toggle in ⋯ that sets `html{font-size:18px}` for the projector.
- **Emblem.** Replace the state crest with a neutral hackathon mark, or keep it with a visible "प्रदर्शन हेतु" label.
- **Decided state.** Show the WhatsApp preview in the centre column on decide, not in the nested scroll of the right panel.
- **Collector chart labels.** Fix the Hindi tspan concatenation ("जनजातिप्रमाण पत्र").

---

## 6. TOP 8 for this round (~2.5 h)
| # | Change | Where | Est. |
|---|---|---|---|
| 1 | **Lane colour semantics** (green/neutral/amber chips, queue row stripe, amber flags, no orange-bold alarms) | `styles.css` lane-chip/flag/LineageCard title | 15 min |
| 2 | **Sticky bottom DecisionBar and drawer.** Sign always visible; focused inputs in view; fix sticky `top` under the nav | `CaseView.tsx`, `ActionPanel.tsx`, `styles.css` | 45 min |
| 3 | **Evidence verdict card** (evidence · your job · attention · corroboration · missing). Delete the duplicates: band lane reason, `.evi-sum`, the second "Other records" card | `CaseView.tsx` (new `VerdictCard` in `components/`), `LineageCard.tsx` | 35 min |
| 4 | **Neutral, equal-weight confirm.** Remove the green right-panel CTA; identical C/N buttons | `ActionPanel.tsx`, `LineageCard.tsx`, CSS | 10 min |
| 5 | **Comparison rows never truncate; diff highlight for spelling variants** (shows "Ram Lal Mark**aa**m" in Hindi mode) | `LineageCard.tsx`, CSS | 20 min |
| 6 | **Compact officer chrome** (merge topbar into nav, banner → pill, Prev/Next into the band, 56 px sticky band) and **type/contrast tokens** (≤ 6 sizes, min 13 px, `--muted #56657A`, blue focus ring) | `Layout.tsx`, `CaseView.tsx`, `styles.css` | 30 min |
| 7 | **Queue "Next step" column, SLA amber, "मेरा डेस्क" strip** | `Queue.tsx`, CSS | 25 min |
| 8 | **Copy and terminology sweep:** married-women note only for F; no Rule 15(2) on domicile; "सूची पूर्ण · वंशवृक्ष संलग्न नहीं"; संदर्भित करें / जांच / मूल निवास everywhere; DD-MM-YYYY; the signing sheet at full height with 16 px / 68ch (the sentinel can wait for round 4 if time runs out) | `ActionPanel.tsx`, `CaseView.tsx`, `common.tsx`, `styles.css:531` | 20 min |

**Re-test after the changes:**
- **Timed glance test.** Show each of 08812, 08841, 08835, 08870 and 08902 for 10 s at 1366×768 in Hindi. Ask "what is the evidence, what is missing, what should you do?". Pass = 3/3 answers for each case, using only the verdict card and the bar.
- **Sign button in view:** its `getBoundingClientRect().bottom ≤ innerHeight` at 1366×768 and 1280×720 on every demo case.
- **Contrast and Latin-leak scripts** (§8) come back clean.
- **Keystroke counts** stay within round 2's, plus the reading pages in the signing sheet.

---

## 7. Terminology to lock (Hindi / English)
| Concept | Hindi (use) | Avoid | English |
|---|---|---|---|
| Lanes | अभिलेख पूर्ण · सामान्य जांच · ध्यान दें | सामान्य जाँच | Records complete · Standard review · Needs attention |
| Refer | संदर्भित करें (जांच हेतु) | अग्रेषित करें | Refer |
| Send back | वापस भेजें (कमी पूर्ति हेतु) | — | Send back |
| Reject | अस्वीकृत करें → पहले कारण बताओ सूचना | — | Reject → show-cause first |
| Same / not family | वही परिवार / यह परिवार नहीं | भिन्न परिवार (kbd hint) | Same family / Not this family |
| Link strength | प्रबल कड़ी / संभावित कड़ी | मॉडल 98% on the face | Strong link / Possible link |
| Domicile | मूल निवास प्रमाण पत्र | मूल निवासी प्रमाण पत्र | Domicile certificate |
| Kendra role | केंद्र संचालक | केंद्र ऑपरेटर | Kendra operator |
| Sample source | नमूना स्रोत (once per card) | मॉक · चरण 2 स्रोत, (नमूना)×6 | Sample source |
| Dates | 22-10-2026 | 22 अक्टू॰ 2026 | 22-10-2026 |

---

## 8. Scripts used (paste into DevTools)
- **Contrast:** walk leaf text nodes, take the first non-transparent ancestor background, and compute WCAG relative luminance. Worst values found: 4.49 (`.dev-alt`, `.mono` app ID on the `#FFF7EF` row hover), 4.57 (`th`), 4.58 (`.page-sub`).
- **Latin leak in Hindi mode:** a TreeWalker over text nodes, skipping `.dev-alt` / `.mono`, matching `/[A-Za-z][A-Za-z()' .-]{2,}/`, with IDs whitelisted (SS, CG, KDG, SDO, LGD, QR, MIS).
  - Case page: only names plus "OBC/ST" inside the validity notes.
  - Collector and Audit: many leaks (see §2.8–2.9).
- **Truncation:** `el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow==='ellipsis'`.

End state: no code changed. Backend reset (`POST /api/reset`) and browser viewport reset to desktop after this review.
