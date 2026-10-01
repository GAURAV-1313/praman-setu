# 12 — Citizen pipeline QA: citizen portal → SDO console → audit

Date: 01-10-2026 · Scope: `/nagrik` (citizen portal + Family Proof Helper), `/sewasetu` console, `/officer/case` full view, `/audit`, `/kendra`. All citizen data is synthetic. Nothing was committed.

Method: headless Chrome (playwright-core) scripts that drive the real UI end to end, plus direct API calls for misuse. Screenshots were reviewed by eye. Scripts and screenshots are in the session scratchpad (`…/scratchpad/qa/`; `run_all.mjs` re-runs every persona).

## 1. Personas run (each through to the officer's decision and the citizen's message)

| # | Persona | Path | Officer action | Result after fixes |
|---|---|---|---|---|
| 1 | Sunita Markam, 18, ST, scholarship (demo button) | Father's certificate found (••••4512), attached | Same family → Approve → DSC token | Approved; WhatsApp sent; audit shows her search, filing, confirmation and order |
| 2 | Sunita, typed by hand (Hindi) | Same | Same | Same |
| 3 | Rajni Korram, married (demo button) | Found through her maiden village Garhbengal (Narayanpur) | Same family → Approve | Approved |
| 4 | Rajni typed by hand, **husband as guardian**, marital status forgotten at first | Not found → hint "married? choose Married" → found via maiden village | (checked the officer's data) | Officer gets her **father's** name, not the husband's |
| 5 | Ramesh Yadav, OBC, no papers (demo button) | Not found → "I have no papers" → family tree + declaration | Refer → Patwari (full view), also Send back and Hearing notice | Refer suggested; Patwari timer starts; citizen told what happens next |
| 6 | Elderly applicant on a phone (390×844) | Full manual flow | — | No horizontal scroll on any step; 44 px buttons; 16 px inputs; family-tree table stacks |
| 7 | English-only typist | Names typed only in English | — | Was blocked; now completes |
| 8 | Wrong spelling "Ram Lal Markaam" | Fuzzy match still finds ••••4512 | — | Officer sees the spelling difference as an attention point |
| 9 | Wrong caste (Satnami/SC for a Gond family) | "Found — officer will check" + new hint to check caste | — | Officer gets the "category differs" flag → refer |
| 10 | Typed the village name but did not pick from the list | — | — | Was blocked at Aadhaar; now the exact match is picked automatically |
| 11 | Misuse: stranger search, 3-search limit, no consent / no Aadhaar via API, forged proof ref, double-click Pay, Back / refresh, language switch | — | — | See §4 |
| 12 | Backend down | Offline mock | — | Works; now says it is offline and does not offer a dead "open as SDO" link |

## 2. Bugs found

| # | Severity | Where | Bug | Fixed? How |
|---|---|---|---|---|
| 1 | **High** (guardrail) | `engine.py` analysis | For a "no papers" filing (unavailability declaration + Rule 7 inquiry requested), the system suggested **Send back: attach a caste proof**, the paper the citizen had just declared they do not have. The Praman panel said "refer" and the full view's dock said "send back". | Yes. A filing with `inquiry_requested` and a missing caste proof now suggests **Refer → Patwari (Rule 7)**, with its own next step "Refer for the Patwari inquiry (no papers)". Test added. |
| 2 | High | `CitizenPortal.tsx` | English-only typists could not continue: the Hindi guardian name was mandatory. | Yes. Hindi **or** English is enough (the backend already transliterates the other one). The required star follows whichever field is empty. |
| 3 | High | Portal | **Browser / phone Back left the portal** and lost the whole form. **Refresh** sent the citizen back to step 1 with an empty form and a new session, which also gave 3 fresh searches. | Yes. Each step is a history entry, so Back and Forward move between steps. The draft is kept in `sessionStorage` (`ps_nagrik_draft`, this tab only, Aadhaar reduced to its last 4 digits), and the demo reset clears it. The receipt has a "New application" button. |
| 4 | High | Portal | **Married women with the husband as guardian**: the guardian type selector did nothing, so the husband's name was searched **and sent to the officer as the father's name**, which breaks the officer's lineage check. | Yes. The guardian type is now part of the form state. If it is Husband or Guardian, the helper asks for the father's name, searches with it, and sends it to the officer as `father_name`. |
| 5 | Medium | Portal | **Stale proof**: after attaching a found certificate, the citizen could change the father's name, village, service or maiden village and the old proof stayed attached. | Yes. A result is tied to the inputs it was searched with. If they change, it is shown as stale ("search again"), it is no longer attached, and the 1950-block "optional" note goes away. |
| 6 | Medium | `citizen.py` + `/audit` | The citizen's own archive searches were logged with no application number, so `/audit?q=SS/…` (the DPDP "who accessed my records" answer) did not show them. | Yes. When the application is filed, the session's search entries are linked to its number. The Audit page has labels for citizen actions in Hindi and English. Test added. |
| 7 | Medium | SDO console | The console showed **made-up Aadhaar and mobile last-4 digits** (hashed from the application ID), different from what the citizen gave. | Yes. Submit sends only `aadhaar_last4` / `mobile_last4` (validated as 4 digits), and the console shows them. Test added. |
| 8 | Medium | Patwari referral message | After "Refer → Patwari", the citizen was told "sent for a routine records check; you need not do anything". It did not say a Patwari will come and ask about the family. | Yes. When the referral is to the Patwari, the message says it is not a rejection, the Patwari may ask them / the Kotwar / the Sarpanch, and to have grandfather's and great-grandfather's names ready. The entity checker passes. Test added. |
| 9 | Medium | Portal ↔ backend | A second submit in the same session (Back + Pay again, or a double request) could create a **second application**. | Yes. One application per session: a repeat submit returns the same receipt. Test added. The UI double-click was already guarded. |
| 10 | Medium | Phone layout | The upload table was cut off on the right (Upload buttons half hidden, DigiLocker column off screen). Language toggle and demo buttons were 20–25 px tall, checkboxes 13 px, text 11–12.5 px. The family-tree table had no column labels once squeezed. The "Which papers will work?" guide sat at the very bottom of the service page. | Yes, in `citizen.css` (≤600 px): 44 px buttons, 16 px inputs (no iOS zoom), 22 px checkboxes, ≥13.5 px small text, the upload table drops the 3 columns a phone user never fills, the family tree stacks with labels, the guide moves above the long service text, and the session timer is hidden. |
| 11 | Medium | Offline mode | With the backend down, the receipt offered "open it as the SDO", which led to "application not found". Every offline receipt had the same number, and nothing said it was offline. | Yes. An offline banner in the mock note, no officer link offline, and one sample number per session. |
| 12 | Low | Portal | The search button stayed active after 3 searches (the 4th click gave an error). | Yes. It is disabled at 0 left; a 429 also sets 0 left. |
| 13 | Low | Portal | Submit errors were raw English backend text. An expired search (server restart / demo reset) was a dead end at the fee step. | Yes. Errors are in Hindi with what to do next; an expired proof clears the stale result and says "go back and search again". |
| 14 | Low | `VillagePicker` | Typing the full village name without tapping the dropdown blocked Aadhaar. | Yes. Exactly one exact match (English or Hindi) is picked automatically. Shared component, harmless elsewhere. |
| 15 | Low | Portal i18n | In EN mode the family-tree relations stayed पिता/दादा/परदादा. Step-1 "Back" read "फिर से" ("again"). The declaration always said "करता/करती". With English-only names the declaration said "पिता ____". | Yes. Relations are translated, the button reads "पीछे", the declaration uses the right gender, and it falls back to the English names. |
| 16 | Low | 🔊 सुनें | There was no listen button on the search result. If the device has no Hindi voice, the button did nothing (or an English voice mangled the Hindi). | Yes. A listen button reads the masked result in plain Hindi. When no Hindi voice is installed, a note says to ask a family member or the Kendra. |
| 17 | Low | Console panel | For a referral file the panel hint said "pick proof / verify a point". | Yes. It now says the Patwari reference is sent from the full evidence view (form pre-filled there). |
| 18 | Low | Portal | "Found — officer will check" gave no hint why. | Yes. A neutral hint to check the chosen caste and the father's name, without revealing the holder's category. |
| 19 | Info | Kendra `/kendra` | **Privacy: the private CSC operator saw the relative's full certificate number, full name, village and district.** | Partly, on screen only (see §4). |

## 3. Citizen critique, in plain words

**Sunita (student, father's certificate exists).** This is the easiest path: one tick, one Search button, "मिल गया", attach. The masked "••••4512 · SDO Kondagaon · 2019" is enough for her to recognise her father's certificate. What could still confuse her:
- Step 1's "जमा करें" ("Submit") only moves to the next page; the real portal says the same, but it scares first-time users.
- The 1950 address block is still on screen (greyed out) after her proof is attached.
- The relation chips (पिता/भाई/बहन…) look like they change the search, but the search always uses the father's name. The text under them says so, but she has to read it.

**Rajni (married).** Before this round, if she followed the form literally (guardian = husband) the search and the officer's check both used her husband's name, and she would never be found. That is fixed. Two things remain:
- She must remember to set "Married"; the not-found box now reminds her.
- The maiden-village picker searches the whole state, so a common village name gives many options. A district dropdown would help.

**Ramesh (OBC, no papers).** The "मेरे पास कोई कागज़ नहीं" path is the strongest part of the product. The family tree accepts "पता नहीं" everywhere, the declaration is generated, and the receipt says "यह अस्वीकृति नहीं है". Before this round he would then have been sent back for the very paper he had just declared he did not have; that is fixed (suggestion: refer to the Patwari). Remaining issues:
- He still has to upload the father's income certificate (OBC); there is no "no papers" route for that.
- "नियम 7" and "Rule 3(3)" mean nothing to him. Plain words would carry more ("पटवारी आपके गांव आकर पूछेंगे").

**Elderly applicant on a phone.**
- Layout is now usable at 390 px.
- Still hard for her: Aadhaar e-auth with a long English + Hindi consent paragraph, three demo-coloured boxes, and a 7-step bar.
- Words like "अनुलग्नक", "पूर्वावलोकन", "एलजीडी" and "अभिलेखागार" are official Hindi, not spoken Hindi.
- 🔊 is on the declaration and the result only.
- She will most likely still go to a Kendra, which is why the Kendra screen matters (see privacy).

**English-only / misspelling user.** Now completes. However, the Hindi version of an English-typed name is machine transliteration and poor ("Ramlal Markam" → "रंलल मर्कम", "Sunita" → "सुनिटा"). That garbled name appears in the officer's Hindi view **and in the citizen's WhatsApp greeting**. See recommendation 1.

**Village typed but not picked.** Now fixed for an exact name. A misspelt village ("Bayanaar") still needs a tap on the suggestion; the hint says "सूची से चुनें".

**SDO (brief).**
- Approve with the DSC token is smooth, and the success screen shows the citizen's message.
- A no-papers file now points to the right action, but the console's own decision box has only Reject / Send back / Approve. Referring needs the "full evidence view" link (by design: the console mimics today's Sewa Setu).
- After "same family", "Use this draft" stays disabled for Sunita because of the spelling-difference attention point. The officer approves with the native buttons and no remark is asked for. That is consistent with the rules but may puzzle the SDO.

## 4. Privacy and honesty findings

**What the citizen sees**
- Only "No. ••••4512 · office · year" for a family certificate: never the name, village, category or full number. This was checked both in the API response and on screen.
- After approval, the officer's WhatsApp message lists the record relied on by its **full** number (the order cites it). The relationship is officer-confirmed by then, so this is acceptable.

**Guardrails that held**
- No Aadhaar → 403; no consent → 400; 4th search → 429.
- Forged `proof_ref` → 400; out-of-district village → 422; a certificate number given with the wrong father → not found.
- A stranger searched with the attacker's own village → not found.
- Every search is logged with the records touched, and is now visible by application number.

**Weaknesses (not fixed: design calls)**
- The 3-search limit is **per browser session**. A new session (new tab / private window) gives 3 more searches. A real deployment must count per Aadhaar (or per Aadhaar-token) per day.
- Anyone who knows a stranger's father's name **and** native village can learn that a certificate exists, plus its office and year. The masked result limits the damage and the officer still confirms the relationship. Treat it as residual risk; rate-limit per Aadhaar.

**Kendra `/kendra` leak**
- Before this round: **yes**, a private CSC operator saw the relative's full certificate number, full name, village and district, with no search limit and with consent optional in the API (`consent: null` is accepted).
- I masked the **screen**: the operator now sees "क्र. ••••4512 · पिता · matches the father's name entered · office · date" plus a privacy note. Certificate numbers inside the summary and checklist text are masked too.
- **The API `/api/precheck` still returns the full records to the browser.** Fixing that changes the contract that about 8 existing tests encode, so I left it for the lead to decide (see recommendation 2).

**Honesty**
- The mock banner is on every portal page ("not the official portal · synthetic data") and the Aadhaar step says "simulated".
- Offline mode now says so.
- No government emblem: the "SS" monogram only.
- The WhatsApp preview is labelled "नमूना संदेश (डेमो)".
- No fake claims found.

## 5. Files changed

Backend:
- `app/backend/engine.py`: no-papers → refer to Patwari; next-step text.
- `app/backend/citizen.py`: links search audit entries to the application; stores last-4 Aadhaar/mobile; one application per session.
- `app/backend/messages.py`, `app/backend/api.py` (1 line): passes `refer_to` into the citizen message.
- `app/backend/templates/msg_refer.hi.j2`, `msg_refer.en.j2`: Patwari wording.
- `app/backend/tests/test_citizen.py`: +5 tests.

Frontend:
- `app/frontend/src/pages/CitizenPortal.tsx`: draft persistence, Back/Forward, stale results, guardian type / father's name, Hindi-or-English guardian, search limit, errors, offline, listen button, i18n.
- `app/frontend/src/pages/citizen.css`: phone layout.
- `app/frontend/src/components/VillagePicker.tsx`: exact-match auto-pick.
- `app/frontend/src/pages/SewaSetuConsole.tsx`: real last-4 digits; refer hint.
- `app/frontend/src/pages/Kendra.tsx`: masked display.
- `app/frontend/src/pages/Audit.tsx`: citizen action/role labels and Hindi notes.
- `app/frontend/src/api/types.ts`: optional `aadhaar_last4` / `mobile_last4`.
- `app/frontend/src/mock/mockServer.ts`: offline sample receipt numbers.

Not touched: `deck/`, nothing deleted.

## 6. Test results

- `uv run pytest -q`: **118 passed** (was 113; +5 new citizen tests).
- `npx tsc --noEmit -p .`: **clean**.
- Browser re-run of all 16 persona scripts after the last change: all completed, with no page errors, no horizontal scroll at 390 px, and all decisions and audit entries as expected.
- The demo data has been reset, and both servers are running (backend :8000, frontend :5173).

## 7. Remaining recommendations (ranked)

1. **Hindi names from English typing.** Use a proper transliteration aid in the Hindi name fields (an IndicXlit-style suggestion the citizen picks from). Mark auto-transliterated names "(लिप्यंतरित)" for the officer, and greet the citizen with the name as typed rather than a guess. Today "रंलल मर्कम" reaches the WhatsApp greeting.
2. **Kendra API masking (lead decision).** Return masked results from `/api/precheck` to the Kendra role and use an opaque `proof_ref`, as the citizen API does. Require `consent: true` (today `null` passes) and Aadhaar e-auth, and add a per-operator search limit. Update the ~8 tests that read `matches[0].certificate.cert_no`.
3. **Search limit per Aadhaar, not per browser session** (the citizen API and the Kendra).
4. **A "Refer to Patwari" action in the console decision box** for files the panel itself says to refer. Today the officer must jump to the full view.
5. **Plain-word Hindi for low-literacy users.** Replace or gloss "अनुलग्नक", "पूर्वावलोकन", "एलजीडी", "अभिलेखागार", "नियम 7". Add 🔊 to the service page and the receipt. Offer an assisted mode for "fill at the Kendra / with family".
6. **OBC no-papers path for the income certificate**, or route it as a deficiency the Patwari report can cover.
7. Show the maiden-village picker with a district filter. Make the relation chips either change the search or become a plain sentence.
8. Harmonise the rule wording across citizen and officer screens: the citizen sees "नियम 7"; the officer's referral option says "नियम 8 जांच". Both are correct (Rule 7 directs, Rule 8 defines the scope), but say "नियम 7–8" in one place.
