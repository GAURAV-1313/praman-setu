"""Name normalisation for Hindi (Devanagari) and romanised Indian names.

The same functions are used by Splink training (to build the comparison columns)
and by the runtime scorer, so the comparison levels agree exactly.

Pipeline for one name string:
  1. strip honorifics / relation markers (Shri, Smt, श्री, S/O, पिता ...)
  2. Devanagari -> Latin with indic_transliteration (ITRANS) + Hindi schwa deletion
  3. lowercase, phonetic folding (aa->a, ee->i, w->v, sh->s, ksh->x ...),
     collapse doubled letters ("Markaam" -> "markam")
  4. tokens; surname = last token; given = the rest joined WITHOUT spaces
     ("Ram Lal" == "Ramlal")
  5. consonant skeleton = folded string with vowels removed
"""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

DEVANAGARI_RE = re.compile(r"[ऀ-ॿ]")

HONORIFICS_LATIN = {
    "shri", "sri", "shree", "smt", "shrimati", "kum", "ku", "km", "kumari", "late", "lt",
    "sushri", "mr", "mrs", "ms", "miss", "dr",
}
HONORIFICS_HI = {"श्री", "श्रीमती", "कु", "कु.", "सुश्री", "स्व", "स्व.", "कुमारी", "स्वर्गीय"}
RELATION_LATIN = {"s/o", "d/o", "w/o", "f/n", "h/n", "c/o", "so", "do", "wo"}
RELATION_HI = {"पिता", "पति", "पुत्री", "पुत्र", "आत्मज", "वल्द", "पत्नी"}
# middle tokens that are frequently added or dropped ("Ramesh Kumar Sahu" == "Ramesh Sahu")
DROPPABLE_LATIN = {"kumar", "kr", "kumari"}
DROPPABLE_HI = {"कुमार"}

VOWELS = set("aeiou")


def is_devanagari(s: str) -> bool:
    return bool(DEVANAGARI_RE.search(s or ""))


_VIRAMA = "्"
_NUKTA = "़"
_CODA = ("ं", "ँ", "ः")  # anusvara, chandrabindu, visarga


def _is_cons(ch: str) -> bool:
    return "क" <= ch <= "ह" or "क़" <= ch <= "य़"


def _is_matra(ch: str) -> bool:
    return "ा" <= ch <= "ौ" or ch in ("ॢ", "ॣ")


def _schwa_delete_deva(word: str) -> str:
    """Hindi schwa deletion done on Devanagari by inserting a virama.

    ITRANS keeps every inherent 'a' (रामलाल -> rAmalAla), but Hindi drops the word-final
    schwa and a medial schwa in the context V C _ C V (रामलाल -> rAmlAl). We split the
    word into aksharas, decide right-to-left which inherent vowels are silent, and mark
    those consonants with a virama so the transliterator emits no vowel.
    """
    aks = []  # (text, has_inherent_a, n_consonants, has_coda)
    i, n = 0, len(word)
    while i < n:
        ch = word[i]
        if _is_cons(ch):
            j, ncons = i + 1, 1
            while j + 1 < n and word[j] == _VIRAMA and _is_cons(word[j + 1]):
                j += 2
                ncons += 1
            inherent = True
            if j < n and (_is_matra(word[j]) or word[j] == _VIRAMA):
                inherent = False
                j += 1
            coda = False
            while j < n and word[j] in _CODA:
                coda = True
                j += 1
            aks.append((word[i:j], inherent, ncons, coda))
            i = j
        else:
            j = i + 1
            while j < n and word[j] in _CODA:
                j += 1
            aks.append((word[i:j], False, 0, True))
            i = j
    m = len(aks)
    silent = [False] * m
    # final schwa after a single consonant (not after a conjunct: "Bhupendra")
    if m >= 2 and aks[-1][1] and aks[-1][2] == 1 and not aks[-1][3]:
        silent[-1] = True
    # medial V C _ C V, right to left
    for k in range(m - 2, 0, -1):
        cur = aks[k]
        if cur[1] and not cur[3] and cur[2] == 1 and not silent[k - 1] and not silent[k + 1] \
                and aks[k + 1][2] <= 1:
            silent[k] = True
    return "".join(a[0] + (_VIRAMA if s else "") for a, s in zip(aks, silent))


@lru_cache(maxsize=200_000)
def deva_to_latin(s: str) -> str:
    """Devanagari -> casual Latin (schwa deletion, then ITRANS via indic_transliteration)."""
    s = unicodedata.normalize("NFC", s)
    s = s.replace("ड़", "र").replace("ड़", "र")  # ड़ -> र  (Lakra)
    s = s.replace("ढ़", "र").replace("ढ़", "र")  # ढ़ -> र
    s = s.replace(_NUKTA, "")
    out = []
    for word in s.split():
        it = transliterate(_schwa_delete_deva(word), sanscript.DEVANAGARI, sanscript.ITRANS)
        it = it.replace(".N", "n").replace(".n", "n").replace("M", "n").replace(".", "")
        it = it.replace("~N", "n").replace("~n", "n").replace("^", "")
        out.append(it)
    return " ".join(out)


def fold(latin: str) -> str:
    """Phonetic folding of a Latin string (one token, no spaces)."""
    s = latin.lower()
    s = re.sub(r"[^a-z]", "", s)
    s = s.replace("chh", "ch").replace("ksh", "x").replace("ks", "x")
    s = s.replace("sh", "s").replace("ph", "f").replace("w", "v").replace("z", "j")
    s = s.replace("ee", "i").replace("oo", "u").replace("aa", "a").replace("ii", "i").replace("uu", "u")
    s = s.replace("q", "k")
    # final y after a vowel/consonant -> i ; "ey" ending -> e
    s = re.sub(r"ey$", "e", s)
    s = re.sub(r"ay$", "e", s)
    s = re.sub(r"y$", "i", s)
    # collapse any doubled letter
    s = re.sub(r"(.)\1+", r"\1", s)
    return s


def skeleton(folded: str) -> str:
    """Consonant skeleton: drop vowels (and y/h used as vowel glides)."""
    s = re.sub(r"[aeiouyh]", "", folded)
    return re.sub(r"(.)\1+", r"\1", s)


def strip_noise_tokens(raw: str) -> list[str]:
    raw = unicodedata.normalize("NFC", raw or "").strip()
    raw = raw.replace(",", " ").replace("(", " ").replace(")", " ")
    toks = [t for t in re.split(r"\s+", raw) if t]
    out = []
    for t in toks:
        low = t.lower().rstrip(".")
        if low in HONORIFICS_LATIN or low in RELATION_LATIN or t.lower() in RELATION_LATIN:
            continue
        if t in HONORIFICS_HI or t.rstrip(".") in HONORIFICS_HI or t in RELATION_HI:
            continue
        out.append(t)
    return out


class NormName:
    __slots__ = ("raw", "script", "tokens", "given", "surname", "full", "given_skel", "surname_skel", "full_skel")

    def __init__(self, raw: str):
        self.raw = raw or ""
        self.script = "deva" if is_devanagari(self.raw) else "latin"
        toks = strip_noise_tokens(self.raw)
        latin_toks: list[str] = []
        for t in toks:
            if is_devanagari(t):
                if t in DROPPABLE_HI:
                    continue
                lt = deva_to_latin(t)
            else:
                if t.lower().rstrip(".") in DROPPABLE_LATIN:
                    continue
                lt = t
            f = fold(lt)
            if f:
                latin_toks.append(f)
        self.tokens = latin_toks
        if len(latin_toks) >= 2:
            self.given = "".join(latin_toks[:-1])
            self.surname = latin_toks[-1]
        elif latin_toks:
            self.given, self.surname = latin_toks[0], ""
        else:
            self.given, self.surname = "", ""
        # re-fold the joined given name so "ram"+"lal" collapses consistently
        self.given = fold(self.given)
        self.full = self.given + self.surname
        self.given_skel = skeleton(self.given)
        self.surname_skel = skeleton(self.surname)
        self.full_skel = skeleton(self.full)

    def as_dict(self) -> dict:
        return {k: getattr(self, k) for k in self.__slots__}


@lru_cache(maxsize=200_000)
def norm(raw: str) -> NormName:
    return NormName(raw)


# ---------------------------------------------------------------- roman -> Devanagari (display only)
# A small rule-based converter used ONLY to give LGD village/tehsil names (which the
# LGD directory publishes in English) a Hindi display form. Never used for matching.
_CONS = [
    ("chh", "छ"), ("kh", "ख"), ("gh", "घ"), ("ch", "च"), ("jh", "झ"), ("th", "थ"), ("dh", "ध"),
    ("ph", "फ"), ("bh", "भ"), ("sh", "श"), ("rh", "ढ़"),
    ("k", "क"), ("g", "ग"), ("c", "क"), ("j", "ज"), ("t", "ट"), ("d", "ड"), ("n", "न"), ("p", "प"),
    ("b", "ब"), ("m", "म"), ("y", "य"), ("r", "र"), ("l", "ल"), ("v", "व"), ("w", "व"), ("s", "स"),
    ("h", "ह"), ("f", "फ"), ("z", "ज़"), ("q", "क"), ("x", "क्स"),
]
_VOW_IND = [("aa", "आ"), ("ai", "ऐ"), ("au", "औ"), ("ee", "ई"), ("oo", "ऊ"), ("a", "अ"), ("i", "इ"),
            ("u", "उ"), ("e", "ए"), ("o", "ओ")]
_VOW_MATRA = [("aa", "ा"), ("ai", "ै"), ("au", "ौ"), ("ee", "ी"), ("oo", "ू"), ("a", ""), ("i", "ि"),
              ("u", "ु"), ("e", "े"), ("o", "ो")]
_SPECIAL_WORDS = {"gaon": "गांव", "pur": "पुर", "para": "पारा", "nar": "नार", "pal": "पाल",
                  "khurd": "खुर्द", "kalan": "कलां", "bhata": "भाठा", "tola": "टोला"}


def _word_to_deva(w: str) -> str:
    w = w.lower()
    for suf, dev in (("gaon", "गांव"), ("khurd", "खुर्द"), ("kalan", "कलां")):
        if w.endswith(suf) and len(w) > len(suf):
            return _word_to_deva(w[: -len(suf)]) + dev
    if w in _SPECIAL_WORDS:
        return _SPECIAL_WORDS[w]
    out = ""
    i = 0
    prev_cons = False
    while i < len(w):
        matched = False
        for rom, dev in _CONS:
            if w.startswith(rom, i):
                # nasal before a consonant -> anusvara
                if rom in ("n", "m") and prev_cons is False and out and i + 1 < len(w) \
                        and w[i + 1] not in "aeiouy" and i > 0 and w[i - 1] in "aeiou":
                    out += "ं"
                    i += 1
                    matched = True
                    prev_cons = False
                    break
                if prev_cons:
                    out += "्"
                out += dev
                i += len(rom)
                prev_cons = True
                matched = True
                break
        if matched:
            continue
        for rom, dev in (_VOW_MATRA if prev_cons else _VOW_IND):
            if w.startswith(rom, i):
                is_final = i + len(rom) == len(w)
                if prev_cons and rom == "a" and is_final:
                    dev = "ा"
                if prev_cons and rom == "i" and is_final:
                    dev = "ी"
                out += dev
                i += len(rom)
                prev_cons = False
                matched = True
                break
        if not matched:
            i += 1
    return out


def roman_to_deva(name: str) -> str:
    """Round 4: digits and punctuation are carried over unchanged ("Bade Kilepal-2" -> "...-2"), so two LGD
    villages never lose the number that tells them apart."""
    parts = re.split(r"([\s\-()]+)", name.strip())
    out = []
    for p in parts:
        if re.fullmatch(r"[\s\-()]+", p or " "):
            out.append(p)
            continue
        # letters are transliterated; digits and any other characters are kept as they are
        out.append("".join(_word_to_deva(seg) if seg.isalpha() else seg for seg in re.findall(r"[A-Za-z]+|[^A-Za-z]+", p)))
    return "".join(out)
