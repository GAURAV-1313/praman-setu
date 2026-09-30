# Praman Setu: Pitch, Demo and Q&A Script
Team Insiders: **Gaurav Singh (A: story, problem, impact, ask)** and **Aditya Tiwari (B: product, model, architecture, limits)**. Swap roles if you prefer; just keep one owner per topic.
Format: 10 min presentation + 5 min live demo + 5 min Q&A.
Deck: https://claude.ai/artifact/6phyJwG9LTjPY2P8ZF8FnE. Repo: https://github.com/GAURAV-1313/praman-setu

---

## Part 1: Numbers to know by heart
| What | Number | Source |
|---|---|---|
| Sewa Setu applications since Apr 2025 | **53.9 lakh** (53,85,535) | Public MIS, 27-09-2026 |
| Decided on time | **95.7%**; only **4,264** files past the time limit | MIS |
| Rejected | **3,64,124** | MIS |
| Caste certificates | **22% of applications, 61% of rejections** | Our sum of the MIS service table |
| Rejection rate | SC/ST **19.0%**, OBC **21.2%**, domicile 7.4%, income **1.4%** | MIS |
| District range | **2.3% to 13.2%** under the same rules (never name districts) | MIS district table |
| Impact estimate | **about 16,000** fewer avoidable caste rejections a year (range 6,000–36,000) | Our model; the study measures it |
| Citizen money saved | about **₹0.9 crore a year** (₹0.24–2.5 cr) | Assumption-based |
| Model | precision **0.89**, recall 0.48 (strong links); women **0.33 → 0.71** with native-village search | Synthetic held-out test |
| Prototype | **80 tests**, 17,569 synthetic people, 8,754 archived certificates | Repo |
| Ask | **6-week study ₹10–25 lakh → 90-day shadow pilot under ₹1.5 crore** | Our estimates |

**Law:**
- **Rule 3(3)**, Chhattisgarh social status certification rules 2013: a relative's earlier certificate is valid evidence.
- **Chhattisgarh High Court, July 2026, Nistha Baghel (Bilaspur), Justice A. K. Prasad:** pre-1950 papers are not needed in every case where family members hold certificates.
- Say "reported by The Sootr". Don't give an exact date: sources say both 20 and 22 July.

---

## Part 2: The 10-minute pitch (spoken script)

### 1. Cover: two spellings (A, 0:25)
> "नमस्ते। स्क्रीन पर ये दो नाम देखिए: रामलाल मरकाम, और Ram Lal Markaam। ये एक ही व्यक्ति हैं, सुनीता के पिता। सेवा सेतु ने 2019 में इन्हें अनुसूचित जनजाति का प्रमाण पत्र दिया था। इस हफ़्ते सुनीता ने अपना प्रमाण पत्र माँगा, और अधिकारी के पास उसके पिता का प्रमाण पत्र खोजने का कोई तरीका नहीं है। We are Team Insiders, and we built that missing lookup."

### 2. Sunita (A, 0:40)
> "Sunita is 18, from Bayanar village in Kondagaon. She needs a permanent ST certificate for her post-matric scholarship. She has no 1950 land paper. Her father's certificate was issued by the same SDO office in 2019. Today her file will probably be rejected. She applies again, pays again, and may miss the deadline. Sunita is synthetic, but the pattern is real: the High Court heard exactly such a case from Bilaspur in July."

### 3. Credit to Sewa Setu (A, 0:30)
> "First, credit. This is your own public dashboard. 53.9 lakh applications, 95.7% decided on time; only 4,264 files are past their time limit statewide. Speed is solved. So we did not build another tracker or chatbot. We asked where the 3.64 lakh rejections come from."

> **New slide order (v10):**
> 1. Cover
> 2. What Sewa Setu already has (3b below)
> 3. What other states have built (3c below)
> 4. Sunita
> 5. Credit / MIS
> 6. Caste 22% / 61%
> 7. Officer's screen
> 8. Insight
> 9. Panel
> 10. Evidence
> 11. Citizen
> 12. What changes
> 13. Took / refused
> 14. Seven steps
> 15. Limits
> 16. Ask
>
> Say slides 2 and 3 right after the cover hook.

### 3c. What other states have already built (A, 0:40)
> "Other states have already built most of what teams usually pitch. Andhra, Telangana and Maharashtra run hundreds of services on WhatsApp. Karnataka, Haryana and Rajasthan built family registries, which took years and laws. Haryana and Gujarat auto-escalate delays. Punjab delivers to the doorstep. So we did not rebuild any of it. The one gap nobody has filled for certificates is evidence at the officer's desk, and Chhattisgarh doesn't need a new registry for that: its certificate archive already is one."

### 3b. What Sewa Setu already has (A, 0:35)
> "Before showing anything we built, here is what Sewa Setu already does well, so you know we did not rebuild it. Citizens already have eKYC, DigiLocker, ARN tracking, SMS alerts, WhatsApp for 25 services and QR e-signed certificates. Officers have the pending list, SLA colours, five tabs and DSC signing. The platform has the Public Service Guarantee auto-penalty and a public MIS. So: no chatbot, no WhatsApp bot, no new portal. The one thing missing is evidence at the moment of decision. The checklist tab is empty. That is the only gap we fill."

### 4. Caste = 22% of applications, 61% of rejections (A, 0:45)
> "We added up your service-wise table ourselves. Income certificates are half of all applications and are rejected 1.4% of the time. Caste certificates are 22% of applications and 61% of rejections: SC/ST 19%, OBC 21%. And the same certificate under the same rules is rejected anywhere from 2.3% to 13.2% across districts. We checked tribal share, literacy and urbanisation; none of them explain it. The evidence reaches some desks and not others."

### 5. The officer's screen (A, 0:40)
> "From a public walkthrough of the officer console: five tabs per file, three buttons (Reject, Send back, Approve), a 200-character remark, and a checklist tab that is empty. There is no way to look up a father's earlier certificate. By our estimate, a caste file needs about 5 minutes, and on a 60-file day the officer has 2.5 to 4. So the scans get skimmed."

### 6. The insight (A → hand-off, 0:35)
> "प्रमाण पहले से सेवा सेतु में है। The proof is already in Sewa Setu. Rule 3(3) of the 2013 rules accepts a relative's earlier certificate, and the High Court said in July it should be considered. We are not adding a new rule. We are making the existing one usable. And every certificate Sewa Setu issues makes the next family member's case easier. Aditya will show how."

### 7. Praman Setu fills that tab (B, 0:35)
> "Same file, Sunita's. The console is unchanged; our panel sits in the empty checklist tab. One: it finds her father's 2019 certificate, across spellings and scripts. Two: it asks the officer, same family or not? Only the officer can say yes, and they give a reason. Three: it drafts the order and a remark that fits the 200-character box."

### 8. Same man, two spellings (B, 0:50)
> "This is the AI part: probabilistic record linkage, a Fellegi–Sunter model learned from the records themselves, without labels. We'll say the weakness before you ask. On our test, about 1 in 10 strong links was wrong, so a person confirms every link, and the pilot bar is 98% on 300 real files. It was weakest for women, recall 0.33, because married women's records sit in their native village. So we added native-village search: 0.71. And no match never means rejection; it means normal scrutiny."

### 9. The citizen (A, 0:30)
> "Sunita never sees the AI. At the Kendra, before the fee, the operator already sees that her father's certificate exists. If something is missing, she gets a send-back that names it, with no new fee. Before any rejection there is a notice and a hearing. The message names the record the decision was based on."

### 10. What changes (A, 0:50)
> "About 16,000 families a year who should not be turned away; the range is 6,000 to 36,000, and a six-week study measures the real figure first. For the officer, a file needs about 3 minutes, so the work fits the day; a clean file is 3 keystrokes. On a 60-file day, about 12 rejections become about 8, and the rest become send-backs or hearings. Every order cites the record it relied on. For Sunita: one visit, and the scholarship deadline met."

### 11. Other states (B, 0:45)
> "Other states got here first, and we learned from both their wins and their harms. We took Andhra's family record as evidence and Karnataka's family link, but with officer confirmation. We refused Haryana's automatic halts and Telangana's algorithmic ineligibility. So: the officer signs every order, there's a hearing before rejection, data stays in the State Data Centre, family search only runs from inside an open application, and caste is never guessed from surnames."

### 12. Seven steps (B, 0:40)
> "Seven steps, all inside the State Data Centre. An application arrives by webhook; we narrow the search to the same village and tehsil using LGD codes; the model matches relatives; rules from the 2013 Act check validity; the panel shows the officer; the officer signs with the existing DSC token; everything is logged. Phase one needs only CHiPS's own certificate archive. A new service is a rule file plus templates, and if we're down, officers work exactly as today."

### 13. Limits (B, 0:35)
> "Our limits, and why. We don't read scans yet, because real scans are citizens' private data; OCR comes in the pilot. Real-record accuracy is unknown because we have no real data, rightly, and the study measures it. Land and ration records are mocked until a Revenue order. First-generation applicants have nothing to find, so they get normal scrutiny and a pre-filled Patwari request."

### 14. The ask (A, 0:40)
> "Measure first, then a quiet pilot. Phase zero needs no AI: a family-certificate-number field and a Revenue circular. Six weeks, ₹10 to 25 lakh: study 20,000 decided files inside the SDC. Ninety days, under ₹1.5 crore: a shadow pilot in two sub-divisions with two controls, which a Revenue-chaired group can stop. We stop if false matches pass 2%, or if rejections rise for any group. प्रमाण पहले से सेवा सेतु में है। कोड CHiPS का, निर्णय राजस्व का, कलम अधिकारी की। अब सुनीता की फ़ाइल, लाइव।"

**Total: about 9:00.** Leave 1 minute of buffer.

---

## Part 3: The 5-minute live demo (B drives, A narrates)
**Pre-flight (10 minutes before):**
1. Start both servers: `bash app/backend/run.sh` and `npm --prefix app/frontend run dev`.
2. Open **http://localhost:5173/?demo=reset** in ONE tab.
3. Chrome fullscreen (F11 / Ctrl+Cmd+F), zoom 100%.
4. Check there is **no "ऑफ़लाइन डेमो" pill** at the top. If there is, the backend is down: restart it.
5. Keep the **backup video** (`~/Downloads/praman-setu-demo-noaudio.mp4`) open in another tab.

**Shortcuts:**
- ⋯ menu → **Demo mode** jumps to any step, so you never type URLs.
- In a case: **C** = same family, **N** = not this family, **A/S/R/X** = approve / send back / refer / reject, **Ctrl+Enter** = sign sheet, **Space** = tick "read", **Enter** = sign, **J/K** = next/previous.

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00–0:20 | Landing → console list | Click "सेवा सेतु में खोलें (एसडीओ)" | "Sewa Setu's own pending list, redrawn. We add one panel." |
| 0:20–1:05 | Console **08790** (Rohit, sister's certificate) | Open row → "निर्णय / जांच सूची" → panel "यह प्रारूप उपयोग करें" → ◉ **अनुमोदित (स्वीकृत)** → ✔ सबमिट → Space → ↵ → ✓ declaration → passcode `123456` → Sign → OK | "A clean file: the same Approve, the same DSC token. Remark and PDF order filled in." Then tick "प्रमाण सेवा उपलब्ध नहीं" for 3 s: "If we are down, nothing changes." Untick. |
| 1:05–2:20 | **Sunita 08812** (officer view) | Point at the spelling row → **C** → ↵ → **Ctrl+↵** → **Space** → **↵** | "Only the officer decides it is her father. The order cites certificate 004512 and Rule 3(3)." The WhatsApp message stays on screen: "She is told which record was used." |
| 2:20–2:50 | **Pooja 08835** | **S** → Ctrl+↵ → Space → ↵ | "Missing caste proof: a send-back, not a rejection. Same application, no new fee." |
| 2:50–3:25 | **Kiran 08841** | Point at "भाई के प्रमाण पत्र से वर्ग भिन्न" → **R** → Ctrl+↵ → Space → ↵ | "A conflict is shown, never decided by the tool. A Patwari report is requested with the family tree pre-filled." |
| 3:25–4:05 | **Rajni 08925** | "⌂ मायके के गांव में खोजें" → type **Garh** → ↵ → **खोजें** → then **C** → ↵ | "Married women's family records sit in the native village. Found. Recall for women: 0.33 to 0.71." |
| 4:05–4:40 | **Collector** | Scroll: tiles → 22%/61% chart → district map → pilot stop rules → model card | "Real MIS, dated. District level only, with no officer ranking. Targets, not results." |
| 4:40–5:00 | **Audit** | 004512 search → खोजें | "Every access to a record is logged: who, when, for which application." |

**If something breaks:** say "let me show the recording", switch to the video tab, and keep narrating. Never debug on stage.

**Optional for Q&A:**
- Kendra pre-check ("डेमो: सुनीता मरकाम" → tick consent → "पारिवारिक अभिलेख जांचें").
- Meena **08856**: the cancelled certificate is caught.
- Anil **08863**: Tehsildar-issued certificate.
- Shadow mode (⋯ menu).
- **08915**: misrouted file → forward to SDO.

---

## Part 4: Q&A (concede → mechanism → backup slide)
| # | Likely question | Owner | Answer |
|---|---|---|---|
| 1 | "Your archive is digital only from about 2015–18. How many rejected applicants actually have a relative in it? Your 16,000 depends on that." | A | "We don't know, and we say so. We assume 10–35%; siblings are likelier than fathers. That's exactly what the 6-week study measures before any pilot money is spent. Backup B3." |
| 2 | "API Setu is fetch-by-number. How do you search by name?" | B | "A read-only copy of the certificate archive inside the SDC, approved by CHiPS and Revenue. Search is narrowed to the same village and tehsil, which keeps 98.2% of true links. It only runs from inside an open application, there's no free-text search, and every view is logged." |
| 3 | "0.89 precision on data you generated is circular. One wrong link in ten on a caste certificate is dangerous." | B | "Agreed, partly circular. That's why a human confirms every link, the pilot bar is 98% on 300 real officer-labelled files, and we stop at 2% false matches. A wrong link can't approve anything by itself." |
| 4 | "Recall 0.33 for women: isn't that discriminatory?" | B | "We found it in our own sliced test. No match never counts against anyone; it means normal scrutiny. And we built native-village search: 0.71. Show 08925 live." |
| 5 | "Who is liable if a wrong link gives someone a certificate?" | A | "The officer remains the competent authority and signs. The tool shows both records, requires a reason to confirm, logs a snapshot of what the officer saw, and the r.15(2) scrutiny sample still applies. We'd ask Revenue for a circular that treats the evidence card as due diligence." |
| 6 | "Officers are ranked on speed. Why would they use this?" | A | "Because a clean file is 3 keystrokes: faster, not slower. And a reasoned, record-cited order protects them on appeal." |
| 7 | "Is this really AI, or just rules?" | B | "Rules where the law demands reasons; learning where the problem is hard. Matching names across Hindi and English spellings, villages and generations is learned: a Fellegi–Sunter model fitted by EM. The decision itself is deliberately never automated." |
| 8 | "What about fake certificates in the archive?" | B | "A cancelled or under-scrutiny certificate can't be used; Meena's case shows this. Records-complete files still go into the random post-issue sample. And a conflict between family members' categories is flagged, as in Kiran's case." |
| 9 | "Cost? Who owns it?" | A | "Open-source stack on CPU in the SDC. Study ₹10–25 lakh, pilot under ₹1.5 crore, our estimates. CHiPS owns the code, Revenue owns the decisions, officers keep the pen." |
| 10 | "Why not just add a certificate-number field?" | A | "That's our Phase 0, and we recommend it. The AI covers the rest: when the citizen doesn't know the number, or the names are spelt differently across scripts." |
| 11 | "Data protection?" | B | "The Second Schedule of the DPDP Rules covers state processing for certificates. The search is purpose-bound, Aadhaar, ration and khasra numbers are masked, every access is logged, and the citizen message lists the records used." |
| 12 | "Tehsildar-issued certificates after the Sonkar ruling?" | B | "It's a policy switch for Revenue, with a default of 'valid with a note'. Misrouted permanent-caste files are forwarded to the SDO in one click (08915)." |
| 13 | "Did you talk to officers?" | A | Answer honestly. If not: "We worked from public data: the MIS, the console walkthrough and court orders. The study and shadow pilot are how officers shape it." |

**Never say:** "the AI decides", "worst district", "officers reject wrongly", "first in India", or any exact court date.
