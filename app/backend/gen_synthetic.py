"""Deterministic SYNTHETIC population + certificate archive for Chhattisgarh.

Outputs (data/synthetic/):
  population.csv              ~20k people, 3 generations, real LGD villages
  certificate_archive.json    archived caste / domicile certificates 2015-2026
  lineage_queries.csv         applicant-view records (father's name as typed) for training/eval
  applications.json           8 fixed demo cases + background queue, with mock evidence rows

Guardrail: caste category is assigned to a family at random from district census shares,
INDEPENDENTLY of surname. Caste then only ever appears on certificates. Nothing here
maps a surname to a caste.

Run:  uv run python gen_synthetic.py
"""
from __future__ import annotations

import csv
import json
import random
import zlib
from dataclasses import dataclass, field, asdict
from datetime import date, timedelta

import geo

SEED = 20260928
rng = random.Random(SEED)
SEEDS = json.load(open(geo.SYN / "cg_name_seeds.json", encoding="utf-8"))

SURNAMES = SEEDS["surnames"]
MALE = SEEDS["first_names_male"]
FEMALE = SEEDS["first_names_female"]
SN = {s["en"][0]: i for i, s in enumerate(SURNAMES)}
MN = {s["en"][0]: i for i, s in enumerate(MALE)}
FN = {s["en"][0]: i for i, s in enumerate(FEMALE)}


# The seed file has 32 male / 25 female given names. Real village name vocabularies are
# larger, and with too few names every village is full of namesakes. Extra common CG names:
MORE_MALE = [
    ("अशोक", ["Ashok", "Asok"]), ("संजय", ["Sanjay", "Sanjai"]), ("राकेश", ["Rakesh", "Rakes"]),
    ("मुकेश", ["Mukesh"]), ("नरेश", ["Naresh"]), ("उमेश", ["Umesh"]), ("कमलेश", ["Kamlesh", "Kamalesh"]),
    ("दिलीप", ["Dilip", "Deelip"]), ("प्रदीप", ["Pradeep", "Pradip"]), ("सुनील", ["Sunil", "Suneel"]),
    ("अजय", ["Ajay", "Ajai"]), ("रवि", ["Ravi", "Rabi"]), ("हरिराम", ["Hariram", "Hari Ram"]),
    ("परसराम", ["Parasram", "Paras Ram"]), ("घासीराम", ["Ghasiram", "Ghasi Ram"]), ("जगदीश", ["Jagdish", "Jagadish"]),
    ("बिसाहू", ["Bisahu", "Bisahoo"]), ("मानसिंह", ["Mansingh", "Man Singh"]), ("तुलाराम", ["Tularam", "Tula Ram"]),
    ("चैतराम", ["Chaitram", "Chait Ram"]), ("मोहन", ["Mohan"]), ("सोहन", ["Sohan"]), ("किशोर", ["Kishor", "Kishore"]),
    ("नंदकुमार", ["Nandkumar", "Nand Kumar"]), ("प्रकाश", ["Prakash", "Parkash"]), ("योगेश", ["Yogesh", "Jogesh"]),
    ("लोकेश", ["Lokesh"]), ("हेमंत", ["Hemant", "Hemanth"]), ("तरुण", ["Tarun"]), ("गजेंद्र", ["Gajendra", "Gajender"]),
    ("नरेंद्र", ["Narendra", "Narender"]), ("जितेंद्र", ["Jitendra", "Jeetendra"]), ("देवेंद्र", ["Devendra", "Dewendra"]),
    ("घनश्याम", ["Ghanshyam", "Ghanasyam"]), ("राधेश्याम", ["Radheshyam", "Radhe Shyam"]), ("बलिराम", ["Baliram", "Bali Ram"]),
    ("सुखदेव", ["Sukhdev", "Sukhdeo"]), ("भुनेश्वर", ["Bhuneshwar", "Bhuneswar"]), ("कार्तिक", ["Kartik", "Kartick"]),
    ("जागेश्वर", ["Jageshwar", "Jageswar"]), ("फागू", ["Phagu", "Fagu"]), ("रामदास", ["Ramdas", "Ram Das"]),
    ("महेंद्र", ["Mahendra", "Mahender"]), ("रूपेश", ["Rupesh", "Roopesh"]), ("कमल", ["Kamal"]),
    ("पुनीराम", ["Puniram", "Puni Ram"]), ("सुकालू", ["Sukalu", "Sukaloo"]), ("मंगलराम", ["Mangalram", "Mangal Ram"]),
]
MORE_FEMALE = [
    ("अंजली", ["Anjali", "Anjli"]), ("कविता", ["Kavita", "Kawita"]), ("संगीता", ["Sangeeta", "Sangita"]),
    ("ममता", ["Mamta", "Mamata"]), ("राधा", ["Radha"]), ("सुशीला", ["Sushila", "Susila"]), ("शांति", ["Shanti", "Santi"]),
    ("कुसुम", ["Kusum"]), ("उमा", ["Uma"]), ("उषा", ["Usha", "Usa"]), ("निर्मला", ["Nirmala", "Nirmla"]),
    ("मीरा", ["Meera", "Mira"]), ("बबीता", ["Babita", "Bobita"]), ("तुलसी", ["Tulsi", "Tulasi"]),
    ("रामकली", ["Ramkali", "Ram Kali"]), ("धनेश्वरी", ["Dhaneshwari", "Dhaneswari"]), ("चमेली", ["Chameli"]),
    ("जमुना", ["Jamuna", "Yamuna"]), ("गंगा", ["Ganga"]), ("लता", ["Lata", "Latha"]), ("सुमन", ["Suman"]),
    ("नीलम", ["Neelam", "Nilam"]), ("भूमिका", ["Bhumika", "Bhoomika"]), ("खुशबू", ["Khushboo", "Khusbu"]),
    ("आशा", ["Asha", "Aasha"]), ("महिमा", ["Mahima"]), ("दुर्गेश्वरी", ["Durgeshwari", "Durgeswari"]),
    ("सोनमती", ["Sonmati", "Sonamati"]), ("फुलेश्वरी", ["Phuleshwari", "Fuleshwari"]), ("रजनी", ["Rajni", "Rajani"]),
]
MALE += [{"hi": h, "en": e} for h, e in MORE_MALE]
FEMALE += [{"hi": h, "en": e} for h, e in MORE_FEMALE]
MN.update({x["en"][0]: i for i, x in enumerate(MALE)})
FN.update({x["en"][0]: i for i, x in enumerate(FEMALE)})

# extra female names used only in demo stories (not in the seed file)
EXTRA_FEMALE = [{"hi": "मीना", "en": ["Meena", "Mina"]}]
for e in EXTRA_FEMALE:
    FN[e["en"][0]] = len(FEMALE)
    FEMALE.append(e)
EXTRA_MALE = [{"hi": "रोहित", "en": ["Rohit", "Rohith"]}, {"hi": "किरण", "en": ["Kiran", "Kiran"]}]
for e in EXTRA_MALE:
    MN[e["en"][0]] = len(MALE)
    MALE.append(e)

# --------------------------------------------------------------------------- caste names (certificates only)
def _split(s):  # "गोंड (Gond)" -> {"en": "Gond", "hi": "गोंड"}
    hi, en = s.split(" (")
    return {"en": en.rstrip(")"), "hi": hi}


CASTES = {k: [_split(x) for x in v] for k, v in SEEDS["caste_tribe_names_for_synthetic_certificates"].items() if k != "_note"}
CASTE_W = {"ST": [30, 8, 6, 6, 6, 2, 2, 2, 2, 1, 1, 6, 4, 2, 2, 2, 1, 1],
           "SC": [50, 10, 10, 15, 5, 10], "OBC": [20, 18, 12, 8, 8, 8, 6, 6, 6, 8]}

# --------------------------------------------------------------------------- geography
DEMO_VILLAGES = {"Kongera": 448656, "Bayanar": 448703, "Kumhari": 937712, "Isalnar": 448697,
                 "Makadi": 448778, "Umargaon": 448804, "Bansgaon": 448665, "Telanga": 448699,
                 "Jhanki": 441706}
FOCUS = {643: 45, 374: 20, 387: 15, 734: 12, 650: 15}  # district lgd -> number of villages
BASTAR_POOL = ["Netam", "Markam", "Sori", "Kashyap", "Mandavi", "Poyam", "Kawasi", "Kunjam", "Dhruw",
               "Nag", "Baghel", "Uike", "Salam", "Usendi", "Korram", "Porte", "Thakur", "Sahu",
               "Yadav", "Nishad", "Dewangan", "Patel", "Sen", "Manjhi"]
SURGUJA_POOL = ["Paikra", "Kanwar", "Rathia", "Sidar", "Minj", "Ekka", "Tirkey", "Lakra", "Kujur",
                "Toppo", "Porte", "Uike", "Bhagat", "Manjhi", "Yadav", "Sahu", "Gupta", "Soni",
                "Kaushik", "Netam", "Markam"]
PLAINS_POOL = ["Sahu", "Verma", "Yadav", "Dhruw", "Kurre", "Banjare", "Jangde", "Ratre", "Barman",
               "Sonwani", "Mahilang", "Khunte", "Dewangan", "Chandrakar", "Chandravanshi", "Patel",
               "Sinha", "Tiwari", "Sharma", "Mishra", "Dubey", "Pandey", "Agrawal", "Gupta", "Soni",
               "Tamrakar", "Nishad", "Thakur", "Baghel", "Netam", "Markam", "Sen", "Kaushik", "Uike",
               "Porte", "Paikra", "Kanwar"]
POOL = {"Bastar": BASTAR_POOL, "Surguja": SURGUJA_POOL}


def pick_villages() -> list[int]:
    by_d: dict[int, list[int]] = {}
    for v in geo.villages().values():
        if v["lgd"] in DEMO_VILLAGES.values():
            continue
        by_d.setdefault(v["district_lgd"], []).append(v["lgd"])
    out = []
    for d in sorted(geo.districts()):
        vs = sorted(by_d.get(d, []))
        k = FOCUS.get(d, 2)
        out += rng.sample(vs, min(k, len(vs)))
    return out


# --------------------------------------------------------------------------- name rendering + noise
def latin_variant(entry: dict, r: random.Random) -> str:
    en = entry["en"]
    en = [e for e in en if "(" not in e]
    if len(en) == 1 or r.random() < 0.6:
        return en[0]
    return r.choice(en[1:])


def vowel_double(s: str, r: random.Random) -> str:
    idx = [i for i, c in enumerate(s) if c in "aeoAEO" and 0 < i < len(s) - 1]
    if not idx:
        return s
    i = r.choice(idx)
    return s[: i + 1] + s[i].lower() + s[i + 1:]


def typo(s: str, r: random.Random) -> str:
    if len(s) < 5:
        return s
    i = r.randrange(1, len(s) - 2)
    if r.random() < 0.5:
        return s[:i] + s[i + 1] + s[i] + s[i + 2:]
    return s[:i] + s[i + 1:]


def render_name(given: dict, surname: dict | None, gender: str, script: str, r: random.Random,
                noise: bool = True, honorific_p: float = 0.12, late_ok: bool = False) -> str:
    if script == "deva":
        parts = [given["hi"]] + ([surname["hi"]] if surname else [])
        if noise and r.random() < 0.04:  # matra swap ि <-> ी
            p0 = parts[0]
            parts[0] = p0.replace("ी", "ि", 1) if "ी" in p0 else p0.replace("ि", "ी", 1)
        s = " ".join(parts)
        if noise and r.random() < honorific_p:
            s = (r.choice(["श्री", "स्व."] if late_ok else ["श्री"]) if gender == "M" else r.choice(["श्रीमती", "कु."])) + " " + s
        return s
    g = latin_variant(given, r)
    sn = latin_variant(surname, r) if surname else ""
    if noise:
        roll = r.random()
        if roll < 0.10:
            if sn and r.random() < 0.6:
                sn = vowel_double(sn, r)
            else:
                g = vowel_double(g, r)
        elif roll < 0.13:
            g = typo(g, r)
        elif roll < 0.15 and sn:
            sn = typo(sn, r)
        if gender == "M" and r.random() < 0.03:
            g = g + " Kumar"
        if r.random() < 0.08:  # ALL CAPS / lower-case entry
            g, sn = (g.upper(), sn.upper()) if r.random() < 0.5 else (g.lower(), sn.lower())
    s = (g + " " + sn).strip()
    if noise and r.random() < honorific_p:
        s = (r.choice(["Shri", "Sri", "Late"] if late_ok else ["Shri", "Sri"]) if gender == "M" else r.choice(["Smt.", "Kum.", "Ku."])) + " " + s
    return s


def i18n_name(given: dict, surname: dict | None) -> dict:
    return {"en": (given["en"][0] + (" " + surname["en"][0] if surname else "")).strip(),
            "hi": (given["hi"] + (" " + surname["hi"] if surname else "")).strip()}


# --------------------------------------------------------------------------- people
@dataclass
class Person:
    pid: int
    lineage: int
    gen: int
    gender: str
    given_idx: int
    surname_idx: int            # current surname (married women: husband's)
    birth_surname_idx: int
    birth_year: int
    village_lgd: int            # current residence
    birth_village_lgd: int
    father_id: int | None = None
    mother_id: int | None = None
    spouse_id: int | None = None
    father_name_en: str = ""    # canonical father's name (also for people whose father is not modelled)
    father_name_hi: str = ""
    category: str | None = None
    caste_idx: int | None = None
    married_year: int | None = None
    migrated: bool = False
    split: str = "train"

    @property
    def given(self):
        return (FEMALE if self.gender == "F" else MALE)[self.given_idx]

    @property
    def surname(self):
        return SURNAMES[self.surname_idx]

    def name(self):
        return i18n_name(self.given, self.surname)


people: list[Person] = []


def new_person(**kw) -> Person:
    p = Person(pid=len(people) + 1, **kw)
    people.append(p)
    return p


def draw_category(district_lgd: int, r: random.Random):
    dname = geo.districts()[district_lgd]["name_en"]
    dem = geo.district_demographics().get(dname, {"st": 0.3, "sc": 0.12})
    x = r.random()
    if x < dem["st"]:
        cat = "ST"
    elif x < dem["st"] + dem["sc"]:
        cat = "SC"
    elif x < dem["st"] + dem["sc"] + (1 - dem["st"] - dem["sc"]) * 0.8:
        cat = "OBC"
    else:
        return None, None
    return cat, r.choices(range(len(CASTES[cat])), weights=CASTE_W[cat])[0]


RESERVED_KDG = {("Ramlal", "Markam"), ("Sitaram", "Netam"), ("Shyamlal", "Sahu"), ("Govind", "Dhruw"),
                ("Lakhan", "Kashyap"), ("Sukhram", "Sori"), ("Dukalu", "Yadav"), ("Hemlal", "Verma")}


def male_given(r, district_lgd, surname_en):
    while True:
        g = r.randrange(len(MALE) - len(EXTRA_MALE))
        if not (district_lgd in (643, 650) and (MALE[g]["en"][0], surname_en) in RESERVED_KDG):
            return g


def build_population():
    village_ids = pick_villages()
    vinfo = geo.villages()
    # each village has a few dominant surnames -> realistic "same surname, same village" clusters
    for vid in village_ids:
        d = vinfo[vid]["district_lgd"]
        div = geo.districts()[d]["division"]
        pool = POOL.get(div, PLAINS_POOL)
        k = rng.randint(3, 6)
        vs = rng.sample(pool, k)
        weights = [1 / (i + 1) ** 1.1 for i in range(k)]
        n_lineages = rng.randint(12, 19) if d in FOCUS else rng.randint(8, 12)
        # neighbouring villages in the same district (for marriages)
        same_d = [x for x in village_ids if vinfo[x]["district_lgd"] == d and x != vid] or [vid]
        for _ in range(n_lineages):
            lineage = rng.randrange(10**9)
            split = "test" if (lineage % 10) < 3 else "train"
            sname = rng.choices(vs, weights=weights)[0]
            s_idx = SN[sname]
            cat, caste = draw_category(d, rng)
            gf_given = male_given(rng, d, sname)
            g1 = new_person(lineage=lineage, gen=1, gender="M", given_idx=male_given(rng, d, sname), surname_idx=s_idx,
                            birth_surname_idx=s_idx, birth_year=rng.randint(1938, 1964), village_lgd=vid,
                            birth_village_lgd=vid, category=cat, caste_idx=caste, split=split)
            g1.father_name_en = f"{MALE[gf_given]['en'][0]} {SURNAMES[s_idx]['en'][0]}"
            g1.father_name_hi = f"{MALE[gf_given]['hi']} {SURNAMES[s_idx]['hi']}"
            w_s = SN[rng.choice(pool)]
            w1 = new_person(lineage=lineage, gen=1, gender="F", given_idx=rng.randrange(len(FEMALE) - len(EXTRA_FEMALE)),
                            surname_idx=s_idx, birth_surname_idx=w_s, birth_year=g1.birth_year + rng.randint(-8, 1),
                            village_lgd=vid, birth_village_lgd=rng.choice(same_d), spouse_id=g1.pid,
                            category=draw_category(d, rng)[0], split=split)
            w1.caste_idx = rng.choices(range(len(CASTES[w1.category])), weights=CASTE_W[w1.category])[0] if w1.category else None
            w1.father_name_en = f"{MALE[rng.randrange(len(MALE) - len(EXTRA_MALE))]['en'][0]} {SURNAMES[w_s]['en'][0]}"
            w1.father_name_hi = ""  # filled below
            g1.spouse_id = w1.pid
            make_children(g1, w1, 2, pool, same_d, split)
    return village_ids


def fill_father_names():
    by_id = {p.pid: p for p in people}
    for p in people:
        if p.father_id:
            f = by_id[p.father_id]
            p.father_name_en, p.father_name_hi = f.name()["en"], f.name()["hi"]
        elif not p.father_name_hi:
            g, s = p.father_name_en.split(" ", 1)
            p.father_name_hi = MALE[MN[g]]["hi"] + " " + SURNAMES[SN[s]]["hi"]


def make_children(father: Person, mother: Person, gen: int, pool, same_d, split):
    if gen > 3:
        return
    n = rng.choices([1, 2, 3, 4, 5], weights=[1, 3, 4, 3, 1])[0] if gen == 2 else rng.choices([0, 1, 2, 3, 4], weights=[1, 3, 4, 2, 1])[0]
    base = max(father.birth_year, mother.birth_year)
    years = sorted(base + rng.randint(19, 38) for _ in range(n))
    for by in years:
        if by > 2010:
            continue
        gender = rng.choice("MF")
        d = geo.villages()[father.village_lgd]["district_lgd"]
        sname = SURNAMES[father.surname_idx]["en"][0]
        c = new_person(lineage=father.lineage, gen=gen, gender=gender,
                       given_idx=male_given(rng, d, sname) if gender == "M" else rng.randrange(len(FEMALE) - len(EXTRA_FEMALE)),
                       surname_idx=father.surname_idx, birth_surname_idx=father.surname_idx, birth_year=by,
                       village_lgd=father.village_lgd, birth_village_lgd=father.village_lgd,
                       father_id=father.pid, mother_id=mother.pid, category=father.category,
                       caste_idx=father.caste_idx, split=split)
        # migration within CG (a few percent), e.g. Bemetara -> Kondagaon
        if rng.random() < 0.04 and by < 2000:
            c.migrated = True
            c.village_lgd = rng.choice(list(geo.villages()))
        if gender == "F" and by < 2000 and rng.random() < 0.85:
            # marries out: takes husband's surname (most of the time), moves to a nearby village
            c.married_year = by + rng.randint(18, 26)
            if rng.random() < 0.8:
                c.surname_idx = SN[rng.choice(pool)]
            c.village_lgd = rng.choice(same_d)
        elif gender == "M" and by < 1995 and gen == 2:
            w_s = SN[rng.choice(pool)]
            w = new_person(lineage=father.lineage, gen=gen, gender="F",
                           given_idx=rng.randrange(len(FEMALE) - len(EXTRA_FEMALE)), surname_idx=c.surname_idx,
                           birth_surname_idx=w_s, birth_year=by + rng.randint(-6, 1), village_lgd=c.village_lgd,
                           birth_village_lgd=rng.choice(same_d), spouse_id=c.pid, split=split,
                           married_year=by + rng.randint(20, 28))
            w.category, w.caste_idx = draw_category(d, rng)
            w.father_name_en = f"{MALE[rng.randrange(len(MALE) - len(EXTRA_MALE))]['en'][0]} {SURNAMES[w_s]['en'][0]}"
            c.spouse_id = w.pid
            make_children(c, w, gen + 1, pool, same_d, split)


# --------------------------------------------------------------------------- certificates
seq_counter: dict[tuple, int] = {}
AUTH_HI = {"SDO": "अनुविभागीय अधिकारी (राजस्व)", "Tehsildar": "तहसीलदार", "Collector": "कलेक्टर",
           "Addl. Collector": "अपर कलेक्टर"}
AUTH_EN = {"SDO": "SDO (Revenue)", "Tehsildar": "Tehsildar", "Collector": "Collector",
           "Addl. Collector": "Addl. Collector"}
ROLE_CODE = {"SDO": "SDO", "Tehsildar": "TSL", "Collector": "COL", "Addl. Collector": "ACL"}


def cert_no(dist_lgd: int, role: str, year: int, seq: int | None = None) -> str:
    code = geo.districts()[dist_lgd]["code3"]
    key = (code, role, year)
    if seq is None:
        seq_counter[key] = seq_counter.get(key, 0) + rng.randint(1, 40)
        seq = seq_counter[key]
    return f"CG/{code}/{ROLE_CODE[role]}/{year}/{seq:06d}"


def authority(role: str, place: dict) -> dict:
    where_en = place["tehsil"]["en"] if role == "Tehsildar" else place["district"]["en"]
    where_hi = place["tehsil"]["hi"] if role == "Tehsildar" else place["district"]["hi"]
    return {"en": f"{AUTH_EN[role]}, {where_en}", "hi": f"{AUTH_HI[role]}, {where_hi}"}


def make_cert(p: Person, service: str, year: int, role: str, cert_type: str = "permanent",
              status: str = "active", qr: bool = True, holder_raw: str | None = None,
              father_raw: str | None = None, holder_name: dict | None = None, father_name: dict | None = None,
              number: str | None = None, month_day: tuple | None = None, status_note: dict | None = None,
              r: random.Random = rng) -> dict:
    # a certificate is registered where the holder lived at the time
    vil = p.village_lgd if (p.married_year is None or year >= p.married_year) else p.birth_village_lgd
    pl = geo.place(vil)
    married_now = p.married_year is not None and year >= p.married_year
    surname = SURNAMES[p.surname_idx if married_now else p.birth_surname_idx]
    script = "deva" if (holder_raw is None and r.random() < 0.45) else "latin"
    if holder_raw is not None:
        script = "deva" if any("ऀ" <= ch <= "ॿ" for ch in holder_raw) else "latin"
    if holder_raw is None:
        holder_raw = render_name(p.given, surname, p.gender, script, r)
    # father's name field; ~30% of married women's certificates record the husband (W/O)
    fname_i18n = {"en": p.father_name_en, "hi": p.father_name_hi}
    if married_now and p.spouse_id and r.random() < 0.3:
        h = PEOPLE_BY_ID.get(p.spouse_id)
        if h:
            fname_i18n = h.name()
    if father_raw is None:
        fg, fs = fname_i18n["en"].split(" ", 1)
        fr = render_name(MALE[MN[fg]], SURNAMES[SN[fs]], "M", script, r, honorific_p=0.1, late_ok=True)
        father_raw = fr
    by = p.birth_year + (r.choice([-1, 1]) if r.random() < 0.05 else 0)
    md = month_day or (r.randint(1, 12), r.randint(1, 28))
    cat = p.category if service != "domicile" else None
    caste = CASTES[cat][p.caste_idx] if cat else None
    hn = holder_name or ({"en": holder_raw, "hi": i18n_name(p.given, surname)["hi"]} if script == "latin"
                         else {"en": i18n_name(p.given, surname)["en"], "hi": holder_raw})
    fn = father_name or ({"en": father_raw, "hi": fname_i18n["hi"]} if script == "latin"
                         else {"en": fname_i18n["en"], "hi": father_raw})
    return {
        "cert_no": number or cert_no(pl["district_lgd"], role, year),
        "service": {"ST": "caste_st", "SC": "caste_sc", "OBC": "caste_obc", None: "domicile"}[cat],
        "cert_type": cert_type,
        "category": cat,
        "caste_name": caste,
        "holder_name": hn,
        "father_name": fn,
        "gender": p.gender,
        "birth_year": by,
        "village": pl["village"], "village_lgd": pl["village_lgd"], "tehsil": pl["tehsil"],
        "district": pl["district"], "district_lgd": pl["district_lgd"],
        "issue_date": date(year, md[0], md[1]).isoformat(),
        "issuing_authority": authority(role, pl),
        "authority_role": role,
        "status": status,
        "qr_verified": qr,
        **({"status_note": status_note} if status_note else {}),
        # internal fields (not part of the Certificate contract type)
        "_person_id": p.pid, "_holder_raw": holder_raw, "_father_raw": father_raw, "_script": script,
        "_tehsil_lgd": pl["tehsil_lgd"],
    }


PEOPLE_BY_ID: dict[int, Person] = {}


def build_archive() -> list[dict]:
    certs = []
    for p in people:
        age_2026 = 2026 - p.birth_year
        # caste certificates
        if p.category:
            prob = {1: 0.10, 2: 0.38, 3: 0.58}[p.gen]
            if p.spouse_id and p.gender == "F" and p.father_id is None:
                prob = 0.22
            if rng.random() < prob:
                year = rng.randint(max(2015, p.birth_year + 6), 2026)
                temporary = rng.random() < 0.08
                if temporary:
                    role, ctype = "Tehsildar", "temporary"
                else:
                    ctype = "permanent"
                    if year < 2026:
                        role = rng.choices(["SDO", "Tehsildar", "Addl. Collector", "Collector"], weights=[86, 8, 4, 2])[0]
                    else:
                        role = rng.choices(["SDO", "Addl. Collector", "Collector"], weights=[95, 3, 2])[0]
                x = rng.random()
                status = "cancelled" if x < 0.01 else ("under_scrutiny" if x < 0.015 else "active")
                qr = rng.random() < (0.98 if year >= 2017 else 0.7)
                note = None
                if status == "cancelled":
                    note = {"en": f"Cancelled by the District Verification Committee ({min(2026, year + rng.randint(1, 4))})",
                            "hi": "जिला छानबीन समिति द्वारा निरस्त"}
                certs.append(make_cert(p, "caste", year, role, ctype, status, qr, status_note=note))
        # domicile certificates
        if p.gen >= 2 and age_2026 >= 14 and rng.random() < 0.25:
            year = rng.randint(max(2015, p.birth_year + 10), 2026)
            role = rng.choices(["Tehsildar", "SDO"], weights=[90, 10])[0]
            c = make_cert(p, "domicile", year, role)
            certs.append(c)
    return certs


# --------------------------------------------------------------------------- applicant-view queries (training/eval)
def build_queries() -> list[dict]:
    rows = []
    qr = random.Random(SEED + 7)
    for p in people:
        if p.father_id is None or p.split == "demo":
            continue
        script = "deva" if qr.random() < 0.4 else "latin"
        f = PEOPLE_BY_ID[p.father_id]
        father_raw = render_name(f.given, f.surname, "M", script, qr, honorific_p=0.1)
        app_raw = render_name(p.given, p.surname, p.gender, script, qr, honorific_p=0.05)
        by = p.birth_year + (qr.choice([-1, 1]) if qr.random() < 0.05 else 0)
        pl = geo.place(p.village_lgd)
        rows.append({
            "query_id": f"Q{p.pid:06d}", "person_id": p.pid, "father_id": p.father_id, "lineage": p.lineage,
            "split": p.split, "gender": p.gender, "birth_year": by, "script": script,
            "applicant_raw": app_raw, "father_raw": father_raw, "village_lgd": pl["village_lgd"],
            "tehsil_lgd": pl["tehsil_lgd"], "district_lgd": pl["district_lgd"], "division": pl["division"],
            "migrated": int(p.migrated), "married": int(p.married_year is not None),
        })
    return rows


# --------------------------------------------------------------------------- demo families (fixed stories)
DOCS = {
    "affidavit": {"en": "Self-declaration affidavit (Form 2A)", "hi": "स्वघोषणा शपथ पत्र (फॉर्म 2A)"},
    "identity_proof": {"en": "Identity proof (Aadhaar / voter ID)", "hi": "पहचान प्रमाण (आधार / मतदाता पहचान पत्र)"},
    "record_1950": {"en": "Pre-1950 / pre-1984 record (revenue record, jamabandi)", "hi": "1950/1984 से पूर्व का अभिलेख (राजस्व अभिलेख, जमाबंदी)"},
    "school_record": {"en": "School record (scholar register / TC) showing caste", "hi": "स्कूल अभिलेख (दाखिल-खारिज पंजी / टीसी) जिसमें जाति दर्ज हो"},
    "sarpanch_cert": {"en": "Sarpanch / Parshad certificate", "hi": "सरपंच / पार्षद प्रमाण पत्र"},
    "family_cert": {"en": "Family member's caste certificate", "hi": "परिवार के सदस्य का जाति प्रमाण पत्र"},
    "family_domicile": {"en": "Family member's domicile certificate", "hi": "परिवार के सदस्य का मूल निवास प्रमाण पत्र"},
    "residence_proof": {"en": "Residence proof (land record / ration card / school record in CG)", "hi": "निवास प्रमाण (भूमि अभिलेख / राशन कार्ड / छ.ग. का स्कूल अभिलेख)"},
    "family_tree": {"en": "Family tree (3 generations, Halka Patwari)", "hi": "वंशवृक्ष (3 पीढ़ी, हल्का पटवारी)"},
}
SERVICE_LABEL = {
    "caste_st": {"en": "Scheduled Tribe (ST) caste certificate — permanent", "hi": "अनुसूचित जनजाति प्रमाण पत्र — स्थायी"},
    "caste_sc": {"en": "Scheduled Caste (SC) caste certificate — permanent", "hi": "अनुसूचित जाति प्रमाण पत्र — स्थायी"},
    "caste_obc": {"en": "Other Backward Class (OBC) caste certificate — permanent", "hi": "अन्य पिछड़ा वर्ग जाति प्रमाण पत्र — स्थायी"},
    "domicile": {"en": "Domicile (Mool Niwasi) certificate", "hi": "मूल निवास प्रमाण पत्र"},
}
PURPOSES = [
    {"en": "Post-matric scholarship", "hi": "पोस्ट-मैट्रिक छात्रवृत्ति"},
    {"en": "College admission", "hi": "महाविद्यालय प्रवेश"},
    {"en": "Government job application", "hi": "शासकीय नौकरी हेतु आवेदन"},
    {"en": "Hostel admission", "hi": "छात्रावास प्रवेश"},
    {"en": "Pre-matric scholarship", "hi": "प्री-मैट्रिक छात्रवृत्ति"},
]
KENDRAS = [
    {"en": "Lok Seva Kendra, Kondagaon", "hi": "लोक सेवा केंद्र, कोंडागांव"},
    {"en": "CSC Bayanar (VLE)", "hi": "सीएससी बयानार (वीएलई)"},
    {"en": "Lok Seva Kendra, Keskal", "hi": "लोक सेवा केंद्र, केशकाल"},
    {"en": "Choice Centre, Farasgaon", "hi": "चॉइस सेंटर, फरसगांव"},
]


def docs(*present: str, missing: tuple = ()) -> list[dict]:
    out = [{"code": c, "label": DOCS[c], "uploaded": True} for c in present]
    out += [{"code": c, "label": DOCS[c], "uploaded": False} for c in missing]
    return out


def demo_person(given: str, surname: str, gender: str, by: int, village: str, category=None, caste=None,
                father: Person | None = None, mother: Person | None = None, lineage=0, gen=2,
                birth_surname: str | None = None, married_year=None) -> Person:
    vil = DEMO_VILLAGES[village]
    gi = (MN if gender == "M" else FN)[given]
    p = new_person(lineage=lineage, gen=gen, gender=gender, given_idx=gi, surname_idx=SN[surname],
                   birth_surname_idx=SN[birth_surname or surname], birth_year=by, village_lgd=vil,
                   birth_village_lgd=vil, father_id=father.pid if father else None,
                   mother_id=mother.pid if mother else None, category=category,
                   caste_idx=caste, split="demo", married_year=married_year)
    PEOPLE_BY_ID[p.pid] = p
    return p


def caste_idx(cat: str, en: str) -> int:
    return next(i for i, c in enumerate(CASTES[cat]) if c["en"].startswith(en))


def family(lineage: int, father_given: str, surname: str, fby: int, village: str, cat, caste,
           mother_given: str, grandfather_given: str) -> tuple[Person, Person]:
    f = demo_person(father_given, surname, "M", fby, village, cat, caste, lineage=lineage, gen=1)
    f.father_name_en = f"{grandfather_given} {surname}"
    f.father_name_hi = f"{MALE[MN[grandfather_given]]['hi']} {SURNAMES[SN[surname]]['hi']}"
    m = demo_person(mother_given, surname, "F", fby + 3, village, cat, caste, lineage=lineage, gen=1)
    m.father_name_en = f"Samaru {surname}"
    m.father_name_hi = f"{MALE[MN['Samaru']]['hi']} {SURNAMES[SN[surname]]['hi']}"
    f.spouse_id, m.spouse_id = m.pid, f.pid
    return f, m


def child(lineage, given, surname, gender, by, village, cat, caste, f, m) -> Person:
    c = demo_person(given, surname, gender, by, village, cat, caste, father=f, mother=m, lineage=lineage)
    c.father_name_en, c.father_name_hi = f.name()["en"], f.name()["hi"]
    return c


PRIOR_SENDBACKS = {"SS/2026/KDG/08842": 1}  # one background case already sent back once


def app_record(app_id, service, applicant: Person, father: Person, mother: Person, claimed_cat, claimed_caste,
               purpose, submitted, documents, routed_to, persona=None, father_raw=None, applicant_raw=None,
               declared_cert=None, kendra=None, village_override=None) -> dict:
    pl = geo.place(village_override or applicant.village_lgd)
    sub = date.fromisoformat(submitted)
    sla_days = 15 if service == "domicile" else 30
    app = {
        "app_id": app_id, "service": service, "service_label": SERVICE_LABEL[service],
        "applicant_name": applicant.name(), "father_name": father.name(), "mother_name": mother.name(),
        "gender": applicant.gender, "birth_year": applicant.birth_year,
        "claimed_category": claimed_cat, "claimed_caste": claimed_caste,
        "village": pl["village"], "village_lgd": pl["village_lgd"], "tehsil": pl["tehsil"],
        "district": pl["district"], "district_lgd": pl["district_lgd"],
        "purpose": purpose, "submitted_at": sub.isoformat() + "T10:" + f"{(zlib.crc32(app_id.encode()) % 50) + 10:02d}:00+05:30",
        "sla_due": (sub + timedelta(days=sla_days)).isoformat(), "kendra": kendra or KENDRAS[0],
        "routed_to": routed_to, "status": "pending", "documents": documents,
    }
    if persona:
        app["persona_note"] = persona
    if declared_cert:
        app["declared_relative_cert_no"] = declared_cert
    meta = {
        "person_id": applicant.pid, "father_id": father.pid,
        "father_raw": father_raw or father.name()["en"],
        "applicant_raw": applicant_raw or applicant.name()["en"],
        "tehsil_lgd": pl["tehsil_lgd"],
    }
    return {"application": app, "meta": meta}


def build_demo(certs: list[dict]) -> tuple[list[dict], dict]:
    """The 8 fixed demo cases. Returns (applications, extra evidence spec)."""
    apps = []
    ST_GOND = caste_idx("ST", "Gond")
    kdr = random.Random(SEED + 99)

    # 1. HERO — Sunita Markam; father Ramlal Markam, permanent ST, SDO Kondagaon 2019
    f, m = family(9001, "Ramlal", "Markam", 1976, "Bayanar", "ST", ST_GOND, "Sukhmati", "Budhram")
    sunita = child(9001, "Sunita", "Markam", "F", 2008, "Bayanar", "ST", ST_GOND, f, m)
    certs.append(make_cert(f, "caste", 2019, "SDO", holder_raw="Ram Lal Markaam", father_raw="Budhram Markaam",
                           number="CG/KDG/SDO/2019/004512", month_day=(3, 14), r=kdr))
    apps.append(app_record("SS/2026/KDG/08812", "caste_st", sunita, f, m, "ST", CASTES["ST"][ST_GOND],
                           PURPOSES[0], "2026-09-22", docs("affidavit", "identity_proof", missing=("record_1950",)),
                           "sdo", father_raw="रामलाल मरकाम", applicant_raw="सुनीता मरकाम",
                           kendra=KENDRAS[1],
                           persona={"en": "Hero case: no pre-1950 record, but her father's ST certificate is in the archive (spelt differently, other script).",
                                    "hi": "मुख्य केस: 1950 से पूर्व का अभिलेख नहीं, पर पिता का ST प्रमाण पत्र अभिलेखागार में है (अलग वर्तनी, अलग लिपि)।"}))

    # 2. Rohit Netam — elder sister Rekha holds permanent ST (2021); declared by the applicant
    f, m = family(9002, "Sitaram", "Netam", 1972, "Kongera", "ST", ST_GOND, "Parvati", "Somaru")
    rekha = child(9002, "Rekha", "Netam", "F", 2001, "Kongera", "ST", ST_GOND, f, m)
    rohit = child(9002, "Rohit", "Netam", "M", 2006, "Kongera", "ST", ST_GOND, f, m)
    certs.append(make_cert(rekha, "caste", 2021, "SDO", holder_raw="रेखा नेताम", father_raw="सीताराम नेताम",
                           number="CG/KDG/SDO/2021/007731", month_day=(7, 9), r=kdr))
    apps.append(app_record("SS/2026/KDG/08790", "caste_st", rohit, f, m, "ST", CASTES["ST"][ST_GOND],
                           PURPOSES[1], "2026-09-18", docs("affidavit", "identity_proof", "family_cert"), "sdo",
                           father_raw="Seetaram Netam", applicant_raw="Rohit Netam",
                           declared_cert="CG/KDG/SDO/2021/007731",
                           persona={"en": "Sibling match: his elder sister's permanent ST certificate (2021).",
                                    "hi": "भाई-बहन मिलान: बड़ी बहन का स्थायी ST प्रमाण पत्र (2021)।"}))

    # 3. Pooja Sahu — OBC, no lineage hit, caste proof missing
    OBC_SAHU = caste_idx("OBC", "Sahu")
    f, m = family(9003, "Shyamlal", "Sahu", 1978, "Kumhari", "OBC", OBC_SAHU, "Geeta", "Dhaniram")
    pooja = child(9003, "Pooja", "Sahu", "F", 2007, "Kumhari", "OBC", OBC_SAHU, f, m)
    apps.append(app_record("SS/2026/KDG/08835", "caste_obc", pooja, f, m, "OBC", CASTES["OBC"][OBC_SAHU],
                           PURPOSES[0], "2026-09-20", docs("affidavit", "identity_proof",
                                                           missing=("record_1950", "school_record", "sarpanch_cert")),
                           "sdo", father_raw="Shyamlal", applicant_raw="Pooja Sahu",
                           persona={"en": "No family record found. One document is missing — a clear, curable send-back.",
                                    "hi": "पारिवारिक अभिलेख नहीं मिला। एक दस्तावेज़ कम है — स्पष्ट, सुधार योग्य वापसी।"}))

    # 4. Kiran Dhruw — claims ST; brother's certificate (2020) records OBC
    f, m = family(9004, "Govind", "Dhruw", 1970, "Isalnar", "ST", ST_GOND, "Kamla", "Itwari")
    manoj = child(9004, "Manoj", "Dhruw", "M", 2000, "Isalnar", "OBC", caste_idx("OBC", "Kalar"), f, m)
    kiran = child(9004, "Kiran", "Dhruw", "M", 2004, "Isalnar", "ST", ST_GOND, f, m)
    certs.append(make_cert(manoj, "caste", 2020, "SDO", holder_raw="Manoj Dhruv", father_raw="Govind Dhruv",
                           number="CG/KDG/SDO/2020/003318", month_day=(11, 2), r=kdr))
    apps.append(app_record("SS/2026/KDG/08841", "caste_st", kiran, f, m, "ST", CASTES["ST"][ST_GOND],
                           PURPOSES[2], "2026-09-19", docs("affidavit", "identity_proof", "sarpanch_cert"), "sdo",
                           father_raw="गोविंद ध्रुव", applicant_raw="किरण ध्रुव",
                           persona={"en": "A sibling's certificate records a different category. Needs the officer's attention — not an accusation.",
                                    "hi": "भाई के प्रमाण पत्र में अलग वर्ग दर्ज है। अधिकारी का ध्यान आवश्यक — यह आरोप नहीं है।"}))

    # 5. Meena Kashyap — father's certificate CANCELLED by scrutiny committee (2024)
    ST_BHATRA = caste_idx("ST", "Bhatra")
    f, m = family(9005, "Lakhan", "Kashyap", 1980, "Makadi", "ST", ST_BHATRA, "Janki", "Manglu")
    meena = child(9005, "Meena", "Kashyap", "F", 2009, "Makadi", "ST", ST_BHATRA, f, m)
    certs.append(make_cert(f, "caste", 2016, "SDO", status="cancelled", holder_raw="लखन कश्यप",
                           father_raw="मंगलू कश्यप", number="CG/KDG/SDO/2016/002207", month_day=(5, 23),
                           status_note={"en": "Cancelled by the District Verification (Scrutiny) Committee, 2024",
                                        "hi": "जिला छानबीन समिति द्वारा निरस्त, 2024"}, r=kdr))
    apps.append(app_record("SS/2026/KDG/08856", "caste_st", meena, f, m, "ST", CASTES["ST"][ST_BHATRA],
                           PURPOSES[4], "2026-09-21", docs("affidavit", "identity_proof", "school_record"), "sdo",
                           father_raw="Lakhan Kashyap", applicant_raw="Meena Kashyap",
                           persona={"en": "The father's certificate was cancelled after scrutiny. It cannot be used as evidence.",
                                    "hi": "पिता का प्रमाण पत्र छानबीन के बाद निरस्त हुआ। इसे साक्ष्य के रूप में उपयोग नहीं किया जा सकता।"}))

    # 6. Anil Sori — father's permanent certificate issued by a Tehsildar (2017)
    f, m = family(9006, "Sukhram", "Sori", 1975, "Umargaon", "ST", ST_GOND, "Sita", "Budhu")
    anil = child(9006, "Anil", "Sori", "M", 2002, "Umargaon", "ST", ST_GOND, f, m)
    certs.append(make_cert(f, "caste", 2017, "Tehsildar", holder_raw="Sukh Ram Sori", father_raw="Budhu Sori",
                           number="CG/KDG/TSL/2017/001164", month_day=(8, 30), r=kdr))
    apps.append(app_record("SS/2026/KDG/08863", "caste_st", anil, f, m, "ST", CASTES["ST"][ST_GOND],
                           PURPOSES[2], "2026-09-17", docs("affidavit", "identity_proof", "family_cert"), "sdo",
                           father_raw="सुखराम सोरी", applicant_raw="अनिल सोरी",
                           declared_cert="CG/KDG/TSL/2017/001164",
                           persona={"en": "The father's permanent certificate was signed by a Tehsildar — competent authority needs checking (CG HC, Jul 2026).",
                                    "hi": "पिता का स्थायी प्रमाण पत्र तहसीलदार द्वारा जारी — सक्षम प्राधिकारी की जांच आवश्यक (छ.ग. उच्च न्यायालय, जुलाई 2026)।"}))

    # 7. Ramesh Yadav — first-generation, migrated from Bemetara; no records; all documents present
    OBC_YADAV = caste_idx("OBC", "Yadav")
    f, m = family(9007, "Dukalu", "Yadav", 1974, "Jhanki", "OBC", OBC_YADAV, "Sukhmati", "Samaru")
    ramesh = child(9007, "Ramesh", "Yadav", "M", 2005, "Jhanki", "OBC", OBC_YADAV, f, m)
    for p in (f, m, ramesh):
        p.village_lgd = DEMO_VILLAGES["Bansgaon"]
        p.migrated = True
    apps.append(app_record("SS/2026/KDG/08870", "caste_obc", ramesh, f, m, "OBC", CASTES["OBC"][OBC_YADAV],
                           PURPOSES[1], "2026-09-23", docs("affidavit", "identity_proof", "school_record", "family_tree"),
                           "sdo", father_raw="Dukalu Yadav", applicant_raw="Ramesh Yadav", kendra=KENDRAS[0],
                           persona={"en": "First-generation applicant who moved within CG (from Bemetara). No records is normal — standard review.",
                                    "hi": "प्रथम पीढ़ी आवेदक, छ.ग. के भीतर बेमेतरा से आए। अभिलेख न मिलना सामान्य है — सामान्य जांच।"}))

    # 8. Lakshmi Verma — domicile; father's domicile certificate (2018) declared and matched
    f, m = family(9008, "Hemlal", "Verma", 1970, "Telanga", None, None, "Savitri", "Khemraj")
    lakshmi = child(9008, "Laxmi", "Verma", "F", 2000, "Telanga", None, None, f, m)
    certs.append(make_cert(f, "domicile", 2018, "Tehsildar", holder_raw="Hem Lal Verma", father_raw="Khemraj Verma",
                           number="CG/KDG/TSL/2018/005402", month_day=(1, 17), r=kdr))
    app = app_record("SS/2026/KDG/08902", "domicile", lakshmi, f, m, None, None,
                     {"en": "Government job application", "hi": "शासकीय नौकरी हेतु आवेदन"}, "2026-09-24",
                     docs("affidavit", "identity_proof", "family_domicile"), "tehsildar",
                     father_raw="Hemlal Verma", applicant_raw="Lakshmi Verma",
                     declared_cert="CG/KDG/TSL/2018/005402",
                     persona={"en": "Domicile: father's domicile certificate (2018) plus land and ration records agree.",
                              "hi": "मूल निवास: पिता का मूल निवास प्रमाण पत्र (2018) तथा भूमि और राशन अभिलेख मेल खाते हैं।"})
    app["application"]["applicant_name"] = {"en": "Lakshmi Verma", "hi": "लक्ष्मी वर्मा"}
    apps.append(app)
    return apps


# --------------------------------------------------------------------------- mock evidence (Bhuiyan / Khadya)
BHUIYAN = {"en": "Bhuiyan land record (mock)", "hi": "भुइयां भू-अभिलेख (नमूना)"}
KHADYA = {"en": "Khadya ration roster (mock)", "hi": "खाद्य राशन सूची (नमूना)"}


def evidence_for(app: dict, meta: dict) -> list[dict]:
    a = app
    r = random.Random(zlib.crc32(a["app_id"].encode()) + SEED)
    father = PEOPLE_BY_ID[meta["father_id"]]
    rows = []
    rc_no = f"{2200000000 + r.randrange(10**8)}"
    head_en, head_hi = father.name()["en"], father.name()["hi"]
    special = a["app_id"]
    if special == "SS/2026/KDG/08835":
        rows.append({"source": KHADYA, "field": {"en": "Head of household", "hi": "परिवार मुखिया"},
                     "value": {"en": "Shyam Lal Sahu (ration card " + rc_no + ")", "hi": "श्याम लाल साहू (राशन कार्ड " + rc_no + ")"},
                     "status": "ok",
                     "note": {"en": "Affidavit says 'Shyamlal'. Same name, different spelling — the name normaliser treats them as equal.",
                              "hi": "शपथ पत्र में 'श्यामलाल' लिखा है। नाम एक ही है, वर्तनी अलग — नाम-मिलान इन्हें समान मानता है।"}})
        rows.append({"source": KHADYA, "field": {"en": "Applicant listed as member", "hi": "आवेदक सदस्य के रूप में दर्ज"},
                     "value": {"en": "Yes — Pooja (daughter)", "hi": "हाँ — पूजा (पुत्री)"}, "status": "ok"})
        return rows
    if special == "SS/2026/KDG/08870":
        rows.append({"source": KHADYA, "field": {"en": "Ration card", "hi": "राशन कार्ड"},
                     "value": {"en": f"{rc_no} — issued in Bemetara (Nawagarh), used in Kondagaon under One Nation One Ration Card",
                               "hi": f"{rc_no} — बेमेतरा (नवागढ़) में जारी, 'एक राष्ट्र एक राशन कार्ड' के तहत कोंडागांव में उपयोग"},
                     "status": "info",
                     "note": {"en": "Family moved within Chhattisgarh. This is normal and is not a concern.",
                              "hi": "परिवार छत्तीसगढ़ के भीतर स्थानांतरित हुआ। यह सामान्य है, चिंता का विषय नहीं।"}})
        rows.append({"source": KHADYA, "field": {"en": "Head of household", "hi": "परिवार मुखिया"},
                     "value": {"en": head_en, "hi": head_hi}, "status": "ok"})
        rows.append({"source": BHUIYAN, "field": {"en": "Land holding", "hi": "भूमि धारण"},
                     "value": {"en": "No holding found in the family's name", "hi": "परिवार के नाम पर भूमि नहीं मिली"},
                     "status": "info",
                     "note": {"en": "Many families hold no land. Absence of a land record is not a ground for rejection.",
                              "hi": "अनेक परिवारों के पास भूमि नहीं होती। भूमि अभिलेख न होना अस्वीकृति का आधार नहीं है।"}})
        return rows
    # generic, consistent with the synthetic family
    has_land = r.random() < 0.6 or special == "SS/2026/KDG/08902"
    if has_land:
        khasra = f"{r.randint(12, 980)}/{r.randint(1, 9)}"
        area = round(r.uniform(0.2, 2.8), 2)
        rows.append({"source": BHUIYAN, "field": {"en": "Khasra holder", "hi": "खसरा धारक"},
                     "value": {"en": f"{head_en} — khasra {khasra}, {area} ha, village {a['village']['en']}",
                               "hi": f"{head_hi} — खसरा {khasra}, {area} हे., ग्राम {a['village']['hi']}"},
                     "status": "ok"})
    rows.append({"source": KHADYA, "field": {"en": "Head of household", "hi": "परिवार मुखिया"},
                 "value": {"en": f"{head_en} (ration card {rc_no})", "hi": f"{head_hi} (राशन कार्ड {rc_no})"},
                 "status": "ok"})
    rows.append({"source": KHADYA, "field": {"en": "Applicant listed as member", "hi": "आवेदक सदस्य के रूप में दर्ज"},
                 "value": {"en": "Yes", "hi": "हाँ"}, "status": "ok"})
    return rows


# --------------------------------------------------------------------------- background queue
def build_background(certs: list[dict], n_sdo=21, n_tsl=5) -> list[dict]:
    br = random.Random(SEED + 5)
    cert_by_person: dict[int, list[dict]] = {}
    for c in certs:
        cert_by_person.setdefault(c["_person_id"], []).append(c)
    kdg = [p for p in people if p.split != "demo" and p.father_id and p.gen == 3 and 2001 <= p.birth_year <= 2010
           and geo.villages()[p.village_lgd]["district_lgd"] == 643 and not p.migrated
           and p.pid not in cert_by_person and p.married_year is None]
    br.shuffle(kdg)
    apps = []
    seq = 8700
    used_lineages = set()

    def father_certs(p):
        return [c for c in cert_by_person.get(p.father_id, []) if c["service"] != "domicile"]

    kids: dict[int, list[Person]] = {}
    for q in people:
        if q.father_id:
            kids.setdefault(q.father_id, []).append(q)

    def sib_certs(p):
        sibs = [q for q in kids.get(p.father_id, []) if q.pid != p.pid]
        return [c for q in sibs for c in cert_by_person.get(q.pid, []) if c["service"] != "domicile"]

    caste_pool = [p for p in kdg if p.category]
    picked = []
    # a deliberate mix: declared family certificate, undeclared match, no match / missing doc
    for p in caste_pool:
        if p.lineage in used_lineages:
            continue
        fam = father_certs(p) + sib_certs(p)
        kind = "declared" if fam and len([x for x in picked if x[1] == "declared"]) < 8 else \
               ("found" if fam and len([x for x in picked if x[1] == "found"]) < 5 else
                ("none" if not fam and len([x for x in picked if x[1] == "none"]) < 8 else None))
        if kind is None:
            continue
        picked.append((p, kind, fam))
        used_lineages.add(p.lineage)
        if len(picked) >= n_sdo:
            break
    for p, kind, fam in picked:
        seq += br.randint(3, 11)
        f, m = PEOPLE_BY_ID[p.father_id], PEOPLE_BY_ID[p.mother_id]
        service = {"ST": "caste_st", "SC": "caste_sc", "OBC": "caste_obc"}[p.category]
        present = ["affidavit", "identity_proof"]
        missing = []
        declared = None
        if kind == "declared":
            present.append("family_cert")
            declared = sorted(fam, key=lambda c: c["issue_date"])[-1]["cert_no"]
        elif kind == "found":
            missing += ["record_1950"]
        else:
            if br.random() < 0.55:
                present.append(br.choice(["school_record", "sarpanch_cert", "record_1950"]))
            else:
                missing += ["record_1950", "school_record", "sarpanch_cert"]
        script = "deva" if br.random() < 0.45 else "latin"
        father_raw = render_name(f.given, f.surname, "M", script, br, honorific_p=0.08)
        applicant_raw = render_name(p.given, p.surname, p.gender, script, br, honorific_p=0.0)
        caste = CASTES[p.category][p.caste_idx]
        submitted = (date(2026, 9, 1) + timedelta(days=br.randint(0, 26))).isoformat()
        apps.append(app_record(f"SS/2026/KDG/{seq:05d}", service, p, f, m, p.category, caste,
                               br.choice(PURPOSES), submitted, docs(*present, missing=tuple(missing)), "sdo",
                               father_raw=father_raw, applicant_raw=applicant_raw, declared_cert=declared,
                               kendra=br.choice(KENDRAS)))
    # domicile (Tehsildar queue)
    dom = [p for p in kdg if p.lineage not in used_lineages][: n_tsl * 3]
    for p in dom[:n_tsl]:
        seq += br.randint(3, 11)
        f, m = PEOPLE_BY_ID[p.father_id], PEOPLE_BY_ID[p.mother_id]
        fdom = [c for c in cert_by_person.get(p.father_id, []) if c["service"] == "domicile"]
        present = ["affidavit", "identity_proof"]
        declared = None
        if fdom:
            present.append("family_domicile")
            declared = fdom[0]["cert_no"]
        elif br.random() < 0.6:
            present.append("residence_proof")
        submitted = (date(2026, 9, 8) + timedelta(days=br.randint(0, 19))).isoformat()
        apps.append(app_record(f"SS/2026/KDG/{seq:05d}", "domicile", p, f, m, None, None,
                               br.choice(PURPOSES[1:3]), submitted,
                               docs(*present, missing=() if len(present) > 2 else ("residence_proof",)),
                               "tehsildar", father_raw=f.name()["en"], applicant_raw=p.name()["en"],
                               declared_cert=declared, kendra=br.choice(KENDRAS)))
    return apps


# --------------------------------------------------------------------------- round 2 data fixes (27-09-2026)
FATHER_INCOME_DOC = {"code": "father_income", "uploaded": True,
                     "label": {"en": "Father's income certificate (preceding year; OBC creamy-layer check)",
                               "hi": "पिता का आय प्रमाण पत्र (पिछला वर्ष; अ.पि.व. क्रीमी लेयर जांच)"}}
DOMICILE_AFFIDAVIT = {"en": "Self-declaration affidavit (domicile)", "hi": "स्वघोषणा शपथ पत्र (मूल निवास)"}
MEENA_FATHER_CERT = "CG/KDG/SDO/2016/002207"
KENDRA_SEARCH_ATTACHED = {"SS/2026/KDG/08772"}  # certificate attached by the Kendra operator after an archive search


def round2_fixes(apps: list[dict], certs: list[dict]) -> None:
    """Idempotent. Hindi 'प्रारूप' (draft) is reserved for draft orders, so Form 2A reads 'फॉर्म 2A'; domicile
    affidavits are not Form 2A; Ramesh (OBC) has the father's income certificate (Rule 3(3)); declared family
    certificates carry their provenance; the cancelled certificate carries the Committee's order."""
    for e in apps:
        a = e["application"]
        for d in a["documents"]:
            d["label"]["hi"] = d["label"]["hi"].replace("प्रारूप 2A", "फॉर्म 2A")
            if a["service"] == "domicile" and d["code"] == "affidavit":
                d["label"] = dict(DOMICILE_AFFIDAVIT)
        if a["app_id"] == "SS/2026/KDG/08870" and not any(d["code"] == "father_income" for d in a["documents"]):
            a["documents"].append(json.loads(json.dumps(FATHER_INCOME_DOC)))
        if a.get("declared_relative_cert_no"):
            a["declared_source"] = "kendra_search" if a["app_id"] in KENDRA_SEARCH_ATTACHED else "applicant"
    for c in certs:
        if c["cert_no"] == MEENA_FATHER_CERT:
            c["status_order"] = {"no": "DVC/KDG/2024/117", "date": "2024-08-12",
                                 "grounds": {"en": "the documents produced before the Committee did not establish the claimed tribe",
                                             "hi": "समिति के समक्ष प्रस्तुत दस्तावेज़ों से दावा की गई जनजाति स्थापित नहीं हुई"}}
            c["status_note"] = {"en": "Cancelled by the District Verification (Scrutiny) Committee, order No. DVC/KDG/2024/117 dated 12-08-2024",
                                "hi": "जिला छानबीन समिति द्वारा निरस्त, आदेश क्र. DVC/KDG/2024/117 दिनांक 12-08-2024"}


# --------------------------------------------------------------------------- main
def main():
    build_population()
    PEOPLE_BY_ID.update({p.pid: p for p in people})
    fill_father_names()
    # fill wives' fathers' Hindi names
    for p in people:
        if not p.father_name_hi:
            g, s = p.father_name_en.split(" ", 1)
            p.father_name_hi = MALE[MN[g]]["hi"] + " " + SURNAMES[SN[s]]["hi"]
    certs = build_archive()
    demo_apps = build_demo(certs)
    fill_father_names()
    PEOPLE_BY_ID.update({p.pid: p for p in people})
    background = build_background(certs)
    apps = demo_apps + background
    for a in apps:
        a["evidence_rows"] = evidence_for(a["application"], a["meta"])
        # how many times this application was sent back before (shown to the officer as a loop count)
        a["application"]["sendback_count"] = PRIOR_SENDBACKS.get(a["application"]["app_id"], 0)
    round2_fixes(apps, certs)
    queries = build_queries()

    geo.SYN.mkdir(parents=True, exist_ok=True)
    with open(geo.SYN / "population.csv", "w", newline="", encoding="utf-8") as fh:
        cols = list(asdict(people[0]).keys()) + ["name_en", "name_hi"]
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for p in people:
            d = asdict(p)
            d["name_en"], d["name_hi"] = p.name()["en"], p.name()["hi"]
            w.writerow(d)
    json.dump(certs, open(geo.SYN / "certificate_archive.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    with open(geo.SYN / "lineage_queries.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(queries[0].keys()))
        w.writeheader()
        w.writerows(queries)
    json.dump(apps, open(geo.SYN / "applications.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_c = sum(1 for c in certs if c["service"] != "domicile")
    print(f"people={len(people)} certificates={len(certs)} (caste {n_c}, domicile {len(certs) - n_c}) "
          f"cancelled={sum(c['status'] == 'cancelled' for c in certs)} tehsildar_perm_caste="
          f"{sum(c['authority_role'] == 'Tehsildar' and c['cert_type'] == 'permanent' and c['service'] != 'domicile' for c in certs)} "
          f"queries={len(queries)} applications={len(apps)} (demo 8, background {len(background)})")


if __name__ == "__main__":
    main()
