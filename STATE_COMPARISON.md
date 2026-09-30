# State-wise Comparative Analysis: Sewa Setu (Chhattisgarh) and Other States' Citizen-Service Platforms
Compiled 27–28 Sep 2026 from our research tracks. Sources: `research/02_existing_solutions.md`, `research/06_officer_tools_benchmark.md`, and the first comparison brief. **[U]** = unverified or secondary source.

## 1. Chhattisgarh Sewa Setu today (baseline)
- **Launch:** 29 Apr 2026, as the upgraded CHiPS e-District. It then had 441 services; the public MIS now shows **907 services**, 38 departments and 16,611 centres.
- **Built-in integrations:** Aadhaar eKYC, DigiLocker, e-Pramaan, UMANG, QR e-signed certificates, SMS/WhatsApp alerts, **WhatsApp for 25 services**, Bhashini (the UI toggles only Hindi and English).
- **Performance:** 53.9 lakh applications since Apr 2025, **95.7% decided on time**, only **4,264** files past the time limit.
- **Gap we found:** 3.64 lakh rejections; caste = 22% of applications but **61% of rejections**. The officer console's checklist tab is empty, and there's no archive lookup.
- **NeSDA:**
  - 2021 (last ranked edition): CG's services portal was last in its group.
  - Jan 2026: 100% of the 59 mandatory services, but only **52% of services on the unified portal** (Karnataka, Kerala, MP and Assam are at 100%).

## 2. Comparison matrix
Y = strong · P = partial · – = not found

| Dimension | **CG Sewa Setu** | AP | TG | KA | MH | HR | RJ | KL | OD | PB | GJ | TN |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Unified service discovery | Y (907) | Y | Y | Y 100% | Y | Y 600+ | Y | Y 100% | Y 100% | Y | P | P |
| Proactive / eligibility-based | – | P | – | **Y Kutumba** | – | **Y auto-pension** | P | **Y auto-permit** | – | – | – | – |
| Citizen/family ID | P e-Pramaan | P | P | Y | P | **Y PPP** | **Y Jan Aadhaar** | P | P | – | – | – |
| Document-less (registry pull) | P | Y | P | **Y** | P | **Y** | Y | P | P | P | – | Y blockchain |
| WhatsApp channel | P (25 services) | **Y 1,126** | Y 580+ | – | Y 500+ | – | – | – | Y 150 | Y booking | – | – |
| Voice / vernacular | P | Y | P | P | Y | – | – | P | Y | – | – | P |
| Assisted / doorstep | Y (16.6k centres) | **Y secretariats** | Y | Y | Y | Y | Y e-Mitra | Y Akshaya | Y | **Y 437 doorstep** | P | Y camps |
| SLA escalation / auto-appeal | Y auto-penalty | P | P | P Sakala | Y RTS | **Y Auto Appeal** | P | Y | P | P | **Y SWAGAT 2.0** | P |
| Grievance integration | Y | **Y AI4PGRS** | P | P | Y | Y | Y | Y | **Y Mo Sarkar** | Y | Y | Y |
| AI in use | P (claimed) | **Y 29 in production** | – | P | P | – | – | P | P | – | – | P |
| **AI / evidence at the officer's decision** | **– (empty checklist tab)** | P | – | P (Kutumba fetch) | – | P (PPP-verified) | – | – | – | – | – | – |
| Public dashboard / MIS | Y (public MIS) | Y RTGS | P | P | P | P | **Y Jan Soochna** | P | P | P | Y | P |
| Interoperability | P | **Y 55-DB lake** | P | **Y 30+ systems** | P | Y | Y | P | P | P | P | P |

## 3. Platform highlights (with numbers)
- **Andhra Pradesh:**
  - **Mana Mitra WhatsApp: 1,126 services**, 58.2 lakh users.
  - **AI4PGRS: 17.6 lakh grievances; 29 AI use cases in production.** A data lake of 55 databases flagged 17,547 pension anomalies (₹84 cr).
  - Caste is certified once per family from data: 28.62 lakh families certified in 2025.
- **Telangana:** MeeSeva on WhatsApp, 580+ services (Nov 2025). **Samagra Vedika** removed about 19 lakh ration cards by algorithm (the cautionary tale).
- **Karnataka:**
  - **Kutumba** family registry: 5.5 crore people, 1.6 crore families, feeding 30+ systems for eligibility without documents.
  - e-Kshana instant certificates. Sakala RTS still has more than 1 lakh files overdue.
- **Haryana:**
  - **PPP (Family ID):** income certificates over the counter since 2022; old-age pension starts automatically at 60.
  - **Auto Appeal System:** 16.5 lakh automatic appeals on SLA breach.
  - **Caution:** 63,353 pensions were halted by algorithm, and **70% of those people were later found eligible**.
- **Maharashtra:** Aaple Sarkar, 500+ services on WhatsApp with a voice bot. RTS Commission: 0.61% rejected.
- **Rajasthan:** Jan Aadhaar family ID, e-Mitra kiosks, the **Jan Soochna** proactive-disclosure portal.
- **Kerala:** K-SMART auto-issues rule-compliant building permits (about 85k) [U: the "9 seconds" claim isn't verified].
- **Odisha:** **Mo Sarkar** random feedback calls to citizens; Ama Sathi WhatsApp bot (Odia voice).
- **Punjab:** doorstep delivery of 437 services at ₹50.
- **Gujarat:** **SWAGAT 2.0** auto-escalation, with 90% resolved on time in the pilot.
- **Madhya Pradesh:** Samagra family/member ID linking benefits.
- **Tamil Nadu:** e-Sevai, blockchain-secured certificates (Nambikkai Inayam).
- **Assam:** also called "Sewa Setu" (ARTPS). Don't confuse it with Chhattisgarh's.
- **National building blocks:**
  - DigiLocker: 72 crore users
  - UMANG: 2,575 services
  - API Setu, including CG's `edistrictcg` collection
  - e-Pramaan / MeriPehchaan
  - Bhashini: 600 crore+ requests
  - CPGRAMS IGMS: disposal time cut from 22 to 15 days

## 4. Where Chhattisgarh already leads
- Speed: 95.7% on time, with an auto-penalty under the PSG Act
- A large assisted network: about 16.6k centres
- QR e-signed certificates on DigiLocker, and a public MIS

## 5. Where others lead (gaps for CG)
1. **Evidence at the point of decision.** Karnataka, Haryana and AP pull family data into decisions; CG's checklist tab is empty.
2. **Proactive services:** Haryana auto-pension, Kutumba.
3. **WhatsApp breadth:** 25 services vs AP's 1,126.
4. **Back-office AI:** AP has 29 use cases in production.
5. **SLA auto-appeal:** Haryana, Gujarat.

## 6. Top transferable practices for CG (impact × feasibility)
1. SLA auto-escalation / auto-appeal (Haryana, Gujarat)
2. Scale WhatsApp from 25 to 300+ services (AP, Telangana, Maharashtra)
3. Voice-first access (AP, Maharashtra), once Chhattisgarhi, Gondi and Halbi models exist
4. AI grievance triage (AP AI4PGRS, CPGRAMS)
5. Public pendency dashboard (Rajasthan Jan Soochna)
6. **"Tell us once" evidence reuse from the archive (Kutumba): this is what Praman Setu does**
7. Random feedback calls (Odisha Mo Sarkar)
8. Proactive pre-approved services with consent and an appeal route (Haryana, Kerala). **Praman Setu's income renewal is the first step.**
9. A family registry built on PDS data (MP Samagra, Haryana PPP, Karnataka Kutumba); needs a law
10. Doorstep booking (Punjab)

## 7. What Praman Setu took, and what it refused
| State | What it does | Our choice |
|---|---|---|
| Andhra Pradesh | Certifies caste once per family from its data | **Took:** the family record as evidence |
| Karnataka (Kutumba) | Family database feeding certificates | **Took:** the family link, with officer confirmation |
| Haryana (Family ID) | Pensions halted automatically on mismatches | **Refused:** a mismatch never stops anything by itself |
| Telangana (Samagra Vedika) | Algorithm marked families ineligible | **Refused:** the tool never rejects; "no record" is never a reason |

**How to phrase the novelty:** "Brings proven Indian patterns (family-record evidence, risk lanes) to Chhattisgarh's certificate officers as an assistive copilot. To our knowledge, not yet deployed at the officer's decision point for certificates. And it needs no new family registry, because it uses the archive Sewa Setu already has."
