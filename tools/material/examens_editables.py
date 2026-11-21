#!/usr/bin/env python3
"""Converteix els exàmens del material (PDF/Word) en exàmens de l'editor (JSON).

Ús:  python3 tools/material/examens_editables.py [filtre]
      (des de l'arrel del repositori; necessita pdfplumber, Pillow, numpy, scipy i, per als
       .docx, LibreOffice per a passar-los primer a PDF)

Per a cada document de tipus «examen» dels índexs js/datos/material/<clau>.js
escriu docs/material/<clau>/editor/<mateix camí>.json amb el format de
l'editor d'exàmens (editor/js/01-nucleo.js): títol + dades de l'alumne +
preguntes (question) amb subpreguntes (subquestion) i punts, text amb
<sub>/<sup>/<b>/<i>, figures com a imatges (JPEG en data URL) i espais en
blanc on l'original deixa lloc per a respondre. Després marca els documents
convertits amb "ed":1 en l'índex.

És una conversió automàtica: les fórmules complexes, les taules i alguna
maquetació poden necessitar un repàs en l'editor.
"""
import base64, io, json, os, re, subprocess, sys, tempfile, unicodedata, uuid
from collections import Counter

import numpy as np
import pdfplumber
from scipy import ndimage

ARREL = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLAUS = ["FiQ_2ESO", "FiQ_3ESO", "FiQ_4ESO", "FiQ_1BAT", "QUI_2BAT"]
NOMS = {"FiQ_2ESO": "Física i Química · 2n ESO", "FiQ_3ESO": "Física i Química · 3r ESO",
        "FiQ_4ESO": "Física i Química · 4t ESO", "FiQ_1BAT": "Física i Química · 1r Batxillerat",
        "QUI_2BAT": "Química · 2n Batxillerat"}
PT_MM = 25.4 / 72


def uid():
    return uuid.uuid4().hex[:9]


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------- índexs
def llegir_index(clau):
    ruta = os.path.join(ARREL, "js/datos/material", clau + ".js")
    src = open(ruta, encoding="utf-8").read()
    marca = 'MATERIAL_TEMES["%s"]=' % clau
    i = src.index(marca) + len(marca)
    j = src.rstrip().rstrip(";").rstrip()
    return src[:i], json.loads(src[i:len(j)]), ruta


def escriure_index(cap, dades, ruta):
    open(ruta, "w", encoding="utf-8").write(cap + json.dumps(dades, ensure_ascii=False, indent=1) + ";\n")


def es_examen(it):
    return it.get("tipus") == "examen"


# ---------------------------------------------------------------- PDF → línies
CID = re.compile(r"\(cid:\d+\)")
CAPCALERA = re.compile(r"^((nom( i cognoms)?|cognoms|curs|grup|data|nota)\b|qualificaci|departament|institut|ies |i\.e\.s|"
                       r"col·legi|alumne|n[úu]m(ero)?\b|signatura|p[àa]gina \d|\d+\s*/\s*\d+$)", re.I)


def figures(pg, chars, primera=False, taules=()):
    """Regions amb imatges o dibuixos vectorials (no línies per a escriure ni marcs de text)."""
    W, H = pg.width, pg.height
    caixes = []
    for im in pg.images:
        x0, t, x1, b = im["x0"], im["top"], im["x1"], im["bottom"]
        if b < H * 0.16 and (x1 - x0) < W * 0.35:   # logo de la capçalera
            continue
        if (x1 - x0) < 12 or (b - t) < 12:
            continue
        caixes.append([x0, t, x1, b])
    objs = []
    for c in pg.curves:
        objs.append([c["x0"], c["top"], c["x1"], c["bottom"]])
    for l in pg.lines:
        if abs(l["top"] - l["bottom"]) < 1.5:   # horitzontals: subratllats i línies de resposta
            continue
        objs.append([l["x0"], l["top"], l["x1"], l["bottom"]])
    for r in pg.rects:
        w, h = r["x1"] - r["x0"], r["bottom"] - r["top"]
        if w < 2 or h < 2 or w > W * 0.9:
            continue
        objs.append([r["x0"], r["top"], r["x1"], r["bottom"]])
    caixes += objs
    # Ajunta les que es toquen (marge de 8 pt)
    canvi = True
    while canvi:
        canvi = False
        for i in range(len(caixes)):
            for j in range(i + 1, len(caixes)):
                a, b = caixes[i], caixes[j]
                if a[0] - 8 <= b[2] and b[0] - 8 <= a[2] and a[1] - 8 <= b[3] and b[1] - 8 <= a[3]:
                    caixes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    del caixes[j]
                    canvi = True
                    break
            if canvi:
                break
    bones = []
    for x0, t, x1, b in caixes:
        if (x1 - x0) < 25 or (b - t) < 18:
            continue
        if b < H * 0.12 and (x1 - x0) < W * 0.4:
            continue
        if b < H * 0.17 and t < H * 0.08:   # marc o filet de la capçalera
            continue
        if primera and t < H * 0.16 and b < H * 0.32:   # capçalera de l'institut (logos, nom i curs)
            continue
        if any(x0 < tb[2] - 2 and tb[0] + 2 < x1 and t < tb[3] - 2 and tb[1] + 2 < b for tb in taules):
            continue
        dins = [c for c in chars if x0 <= (c["x0"] + c["x1"]) / 2 <= x1 and t <= (c["top"] + c["bottom"]) / 2 <= b]
        # Un requadre al voltant d'un enunciat no és una figura: hi ha massa text dins.
        if len(dins) > 260 or (len(dins) > 90 and (x1 - x0) > W * 0.6):
            continue
        bones.append([max(0, x0 - 3), max(0, t - 3), min(W, x1 + 3), min(H, b + 3)])
    return bones


ACCENTS = {"(cid:13)": "\u0301", "/": "\u0300", ".": "\u0308", "´": "\u0301", "`": "\u0300", "¨": "\u0308",
           "\u0301": "\u0301", "\u0300": "\u0300", "\u0308": "\u0308"}


def compon(base, comb):
    """Lletra + accent dibuixat a part (glif d'amplada zero) → lletra accentuada."""
    nu = unicodedata.normalize("NFD", base)[0]
    if comb == "\u0301" and unicodedata.normalize("NFD", base)[1:] and nu in "iI":
        return base   # «í» + accent agut repetit
    r = unicodedata.normalize("NFC", nu + comb)
    return r if len(r) == 1 else base


def figures_raster(pg, chars, primera=False, taules=()):
    """Figures = el que queda dibuixat en la pàgina quan s'esborra el text i les taules: imatges,
    gràfics vectorials, equacions en imatge… Les línies primes (subratllats, línies per a
    respondre) no compten."""
    W, H = pg.width, pg.height
    im = pg.to_image(resolution=72).original.convert("L")
    a = np.array(im) < 215
    h, w = a.shape
    sx, sy = w / W, h / H
    def esborra(x0, t, x1, b, m=0.8):
        a[max(0, int((t - m) * sy)):min(h, int((b + m) * sy) + 1), max(0, int((x0 - m) * sx)):min(w, int((x1 + m) * sx) + 1)] = False
    for c in chars:
        esborra(c["x0"], c["top"], c["x1"], c["bottom"])
    for tb in taules:
        esborra(*tb, m=2)
    # fora línies llargues (subratllats, línies per a respondre, marcs i vores de taula)
    linies = ndimage.binary_opening(a, structure=np.ones((1, 30))) | ndimage.binary_opening(a, structure=np.ones((30, 1)))
    massis = ndimage.binary_dilation(ndimage.binary_opening(a, structure=np.ones((4, 4))), structure=np.ones((3, 3)))
    linies &= ~massis   # una foto o una zona plena no és una línia
    nets = a & ~ndimage.binary_dilation(linies, structure=np.ones((3, 3)))
    lab, n = ndimage.label(ndimage.binary_dilation(nets, structure=np.ones((20, 30))))
    bones = []
    for sl in ndimage.find_objects(lab):
        if sl is None:
            continue
        zona = nets[sl]
        if zona.sum() < 25:
            continue
        ys, xs = np.nonzero(zona)
        t, b = (sl[0].start + ys.min()) / sy, (sl[0].start + ys.max() + 1) / sy
        x0, x1 = (sl[1].start + xs.min()) / sx, (sl[1].start + xs.max() + 1) / sx
        if ((x1 - x0) < 18 and (b - t) < 30) or (b - t) < 8 or (x1 - x0) < 5:
            continue
        if t < H * 0.06 or b > H * 0.955:      # capçalera o peu de pàgina
            continue
        if primera and t < H * 0.16 and b < H * 0.32:   # capçalera de l'institut (logos, nom i curs)
            continue
        dins = [c for c in chars if x0 <= (c["x0"] + c["x1"]) / 2 <= x1 and t <= (c["top"] + c["bottom"]) / 2 <= b]
        if len(dins) > 90 and (x1 - x0) > W * 0.55:   # requadre al voltant d'un text
            continue
        bones.append([x0, t, x1, b])
    # amplia cada figura a les línies llargues que la toquen (eixos d'un gràfic) i ajunta les que se solapen
    lab2, _ = ndimage.label(ndimage.binary_dilation(a, structure=np.ones((5, 5))))
    out = []
    for x0, t, x1, b in bones:
        ids = set(np.unique(lab2[int(t * sy):int(b * sy) + 1, int(x0 * sx):int(x1 * sx) + 1])) - {0}
        for i in ids:
            ys, xs = np.nonzero(lab2 == i)
            bx = [xs.min() / sx, ys.min() / sy, (xs.max() + 1) / sx, (ys.max() + 1) / sy]
            # només si el tros connectat no és un marc gran ni una línia de tota la pàgina
            if (bx[2] - bx[0]) < W * 0.8 and (bx[3] - bx[1]) < H * 0.5:
                x0, t, x1, b = min(x0, bx[0]), min(t, bx[1]), max(x1, bx[2]), max(b, bx[3])
        out.append([x0, t, x1, b])
    canvi = True
    while canvi:
        canvi = False
        for i in range(len(out)):
            for j in range(i + 1, len(out)):
                p, q = out[i], out[j]
                if p[0] - 4 <= q[2] and q[0] - 4 <= p[2] and p[1] - 4 <= q[3] and q[1] - 4 <= p[3]:
                    out[i] = [min(p[0], q[0]), min(p[1], q[1]), max(p[2], q[2]), max(p[3], q[3])]
                    del out[j]
                    canvi = True
                    break
            if canvi:
                break
    return [[max(0, x0 - 3), max(0, t - 3), min(W, x1 + 3), min(H, b + 3)] for x0, t, x1, b in out]


def linies_pagina(pg, primera=False):
    crus = [dict(c) for c in pg.chars]
    chars = []
    for c in crus:
        t = c["text"]
        if chars and (c["x1"] - c["x0"]) < 0.4 and t in ACCENTS and chars[-1]["text"].isalpha() \
                and abs(chars[-1]["top"] - c["top"]) < 3:
            chars[-1]["text"] = compon(chars[-1]["text"], ACCENTS[t])
            continue
        t = CID.sub("", t)
        if t == "" or not (t.strip() or t == " "):
            continue
        c["text"] = t
        chars.append(c)
    taules = []
    try:
        for tb in pg.find_tables():
            files = [r for r in tb.rows if any(c is not None for c in r.cells)]
            ncol = max((len(r.cells) for r in files), default=0)
            x0, t, x1, b = tb.bbox
            if len(files) >= 2 and ncol >= 2 and (b - t) < pg.height * 0.8 and not (primera and t < pg.height * 0.2):
                taules.append({"bbox": tb.bbox, "files": [r.cells for r in files], "ncol": ncol})
    except Exception:  # noqa
        taules = []
    figs = figures_raster(pg, [c for c in chars if c["text"].strip()], primera, [t["bbox"] for t in taules])
    lliures = [c for c in chars if not any(f[0] <= (c["x0"] + c["x1"]) / 2 <= f[2] and f[1] <= (c["top"] + c["bottom"]) / 2 <= f[3] for f in figs)]
    if not lliures and not figs:
        return [], figs, []
    mides = Counter(round(c["size"]) for c in lliures if c["text"].strip())
    mida = mides.most_common(1)[0][0] if mides else 11
    grans = [c for c in lliures if c["size"] >= mida * 0.82]
    xics = [c for c in lliures if c["size"] < mida * 0.82]
    grans.sort(key=lambda c: (round(c["bottom"]), c["x0"]))
    linies = []
    for c in sorted(grans, key=lambda c: c["bottom"]):
        for l in linies:
            if abs(l["bottom"] - c["bottom"]) < max(2.0, c["size"] * 0.25):
                l["chars"].append(c)
                l["top"] = min(l["top"], c["top"])
                break
        else:
            linies.append({"bottom": c["bottom"], "top": c["top"], "chars": [c]})
    for l in linies:
        bs = sorted(c["matrix"][5] for c in l["chars"])
        l["base"] = bs[len(bs) // 2]
    for c in xics:   # superíndexs i subíndexs: a la línia que se solapa, segons la línia base
        mig = (c["top"] + c["bottom"]) / 2
        cand = [l for l in linies if l["top"] - c["size"] * 0.7 <= mig <= l["bottom"] + c["size"] * 0.7]
        if not cand:
            linies.append({"bottom": c["bottom"], "top": c["top"], "chars": [c], "base": c["matrix"][5]})
            continue
        l = min(cand, key=lambda l: abs((l["top"] + l["bottom"]) / 2 - mig))
        dy = c["matrix"][5] - l["base"]
        if dy > mida * 0.15 or (abs(dy) < 0.3 and c["bottom"] < l["bottom"] - c["size"] * 0.25):
            c["_v"] = "sup"
        elif dy < -0.4:
            c["_v"] = "sub"
        l["chars"].append(c)
    # Taules: els caràcters de dins passen a les cel·les
    eixida_taules = []
    for tb in taules:
        x0, t0, x1, b0 = tb["bbox"]
        dins = lambda c, bx: bx[0] - 1 <= (c["x0"] + c["x1"]) / 2 <= bx[2] + 1 and bx[1] - 1 <= (c["top"] + c["bottom"]) / 2 <= bx[3] + 1
        tots = []
        for l in linies:
            for c in l["chars"]:
                c["_base"] = l.get("base", c["matrix"][5])
            q = [c for c in l["chars"] if dins(c, tb["bbox"])]
            if q:
                tots += q
                l["chars"] = [c for c in l["chars"] if not dins(c, tb["bbox"])]
        cel = []
        for fila in tb["files"]:
            r = []
            for bx in list(fila) + [None] * (tb["ncol"] - len(fila)):
                r.append(text_cella([c for c in tots if bx and dins(c, bx)]) if bx else "")
            cel.append(r)
        primera_fila = next((f for f in tb["files"] if len([c for c in f if c]) == tb["ncol"]), tb["files"][0])
        amples = [((c[2] - c[0]) if c else 0) for c in primera_fila]
        tot = sum(amples) or 1
        alts = sorted((f[0][3] - f[0][1]) for f in tb["files"][1:] if f and f[0])
        buides = sum(1 for f in cel[1:] for x in f if not x.strip())
        rowh = round(alts[len(alts) // 2] * PT_MM) if alts and buides > len(cel[1:]) else 0
        eixida_taules.append({"top": t0, "bottom": b0, "x0": x0, "x1": x1, "cells": cel,
                              "widths": [str(round(a / tot * 100)) if a else "" for a in amples],
                              "rowH": rowh if rowh >= 7 else 0})
    linies = [l for l in linies if l["chars"]]
    out = []
    for l in linies:
        cs = sorted(l["chars"], key=lambda c: c["x0"])
        html, plain, prev, cur = "", "", None, None
        mmida = Counter(round(c["size"]) for c in cs if c["text"].strip()).most_common(1)
        mm = mmida[0][0] if mmida else mida
        for c in cs:
            t = c["text"]
            if prev is not None and t != " " and not plain.endswith(" ") and c["x0"] - prev["x1"] > min(c["size"], prev["size"]) * 0.18:
                html += " "
                plain += " "
            if t == " ":
                if plain and not plain.endswith(" "):
                    html += " "
                    plain += " "
                prev = c
                continue
            fn = c.get("fontname", "")
            v = c.get("_v", "")
            fmt = ("b" if re.search(r"bold|black|heavy|semibold|,B\b", fn, re.I) else "") + ("i" if re.search(r"italic|oblique", fn, re.I) else "") + ("|" + v if v else "")
            if fmt != cur:
                html += tancar(cur) + obrir(fmt)
                cur = fmt
            html += esc(t)
            plain += t
            prev = c
        html += tancar(cur)
        plain = plain.strip()
        if not plain:
            continue
        out.append({"top": l["top"], "bottom": l["bottom"], "x0": min(c["x0"] for c in cs), "x1": max(c["x1"] for c in cs),
                    "size": mm, "html": netejar_html(html), "plain": re.sub(r"\s+", " ", plain)})
    out.sort(key=lambda l: l["top"])
    return out, figs, eixida_taules


SUBS = str.maketrans("0123456789+-−()=n", "₀₁₂₃₄₅₆₇₈₉₊₋₋₍₎₌ₙ")
SUPS = str.maketrans("0123456789+-−()=n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁽⁾⁼ⁿ")


def text_cella(cs):
    """Text d'una cel·la (sense format: subíndexs i superíndexs en Unicode)."""
    if not cs:
        return ""
    mida = Counter(round(c["size"]) for c in cs).most_common(1)[0][0]
    files = []
    for c in sorted(cs, key=lambda c: c["_base"]):
        for f in files:
            if abs(f[0] - c["_base"]) < 2:
                f[1].append(c)
                break
        else:
            files.append([c["_base"], [c]])
    trossos = []
    for _, f in sorted(files, key=lambda f: -f[0]):
        txt, prev = "", None
        for c in sorted(f, key=lambda c: c["x0"]):
            t = c["text"]
            if prev is not None and t != " " and not txt.endswith(" ") and c["x0"] - prev["x1"] > min(c["size"], prev["size"]) * 0.18:
                txt += " "
            if c.get("_v") == "sub":
                t2 = t.translate(SUBS)
                t = t2 if t2 != t or not t.strip() else t
            elif c.get("_v") == "sup":
                t = t.translate(SUPS)
            txt += t
            prev = c
        trossos.append(txt.strip())
    return re.sub(r"\s+", " ", " ".join(x for x in trossos if x)).strip()


def obrir(fmt):
    if not fmt:
        return ""
    s, v = (fmt.split("|") + [""])[:2]
    return ("<b>" if "b" in s else "") + ("<i>" if "i" in s else "") + ("<%s>" % v if v else "")


def tancar(fmt):
    if not fmt:
        return ""
    s, v = (fmt.split("|") + [""])[:2]
    return ("</%s>" % v if v else "") + ("</i>" if "i" in s else "") + ("</b>" if "b" in s else "")


def netejar_html(h):
    for _ in range(3):
        h = re.sub(r"</(b|i|u|sub|sup)>(\s*)<\1>", r"\2", h)
        h = re.sub(r"<(b|i|u|sub|sup)>(\s*)</\1>", r"\2", h)
    h = re.sub(r"<(b|i|sub|sup)>(\s+)", r"\2<\1>", h)
    h = re.sub(r"(\s+)</(b|i|sub|sup)>", r"</\2>\1", h)
    for _ in range(2):
        h = re.sub(r"<(b|i|u|sub|sup)>(\s*)</\1>", r"\2", h)
    h = re.sub(r"_{26,}", "_" * 25, h)
    return re.sub(r"[ \t]+", " ", h).strip()


def imatge(pg, caixa, res=130):
    im = pg.crop(caixa).to_image(resolution=res).original.convert("RGB")
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=78, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------- flux del document
def flux(pdf_path):
    pdf = pdfplumber.open(pdf_path)
    pagines = []
    for pg in pdf.pages:
        ls, figs, taules = linies_pagina(pg, not pagines)
        pagines.append((pg, ls, figs, taules))
    # Capçaleres i peus repetits (mateix text en la mateixa franja en 2+ pàgines)
    rep = Counter()
    for pg, ls, _, _t in pagines:
        for l in ls:
            if l["top"] < pg.height * 0.1 or l["bottom"] > pg.height * 0.92:
                rep[re.sub(r"\d+", "#", l["plain"])] += 1
    items = []
    for n, (pg, ls, figs, taules) in enumerate(pagines):
        marge = min([l["x0"] for l in ls] or [70])
        for l in ls:
            clau = re.sub(r"\d+", "#", l["plain"])
            vora = l["top"] < pg.height * 0.1 or l["bottom"] > pg.height * 0.92
            if vora and (rep[clau] >= 2 or len(pagines) == 1 and CAPCALERA.match(l["plain"])):
                continue
            if n == 0 and l["top"] < pg.height * 0.3 and CAPCALERA.match(l["plain"]):
                continue
            if re.fullmatch(r"(p[àa]gina\s*)?\d+(\s*(/|de)\s*\d+)?", l["plain"], re.I):
                continue
            items.append({"k": "l", "pg": n, "marge": marge, **l})
        for tb in taules:
            items.append({"k": "t", "pg": n, **tb})
        for f in figs:
            items.append({"k": "f", "pg": n, "top": f[1], "bottom": f[3], "x0": f[0], "x1": f[2], "caixa": f, "pgobj": pg})
        # ordena dins de la pàgina
    items.sort(key=lambda it: (it["pg"], it["top"]))
    items = recol_locar(items)
    for it in items:
        if it["k"] == "f":
            it["src"] = imatge(it["pgobj"], it["caixa"])
            it["amplePct"] = max(15, min(100, round((it["x1"] - it["x0"]) / (it["pgobj"].width - 2 * 60) * 100)))
            del it["pgobj"]
    return items, pagines[0][0].width if pagines else 595


def recol_locar(items):
    """Una figura enmig d'una frase (la línia d'abans no acaba en punt i la de després comença en
    minúscula) va al final del paràgraf."""
    i = 0
    while i < len(items):
        it = items[i]
        if it["k"] == "f" and 0 < i < len(items) - 1 and items[i - 1]["k"] == "l" and items[i + 1]["k"] == "l" \
                and not re.search(r"[.:?!)]\s*$", items[i - 1]["plain"]) and re.match(r"^[a-zà-úç·]", items[i + 1]["plain"]):
            j = i + 1
            while j < len(items) - 1 and items[j]["k"] == "l" and not re.search(r"[.:?!]\s*$", items[j]["plain"]) \
                    and items[j + 1]["k"] == "l" and not (RE_Q.match(items[j + 1]["plain"]) or RE_SUB.match(items[j + 1]["plain"])):
                j += 1
            items[i + 1]["cont"] = True
            f = items.pop(i)
            items.insert(j, f)
            # perquè el paràgraf no es talle, la figura hereta la posició de la línia anterior
            i = j + 1
            continue
        i += 1
    return items


# ---------------------------------------------------------------- estructura
RE_Q = re.compile(r"^\s*(?:(?:pregunta|exercici|problema|qüestió|questió|activitat)\s*)?(\d{1,2})\s*(?:[.)]\s*[-–—]?|[-–—]|:)\s*", re.I)
RE_Q2 = re.compile(r"^\s*(?:pregunta|exercici|problema|qüestió|questió)\s+(\d{1,2})\b\s*[:.\-–]?\s*", re.I)
RE_SUB = re.compile(r"^\s*(?:\(\s*([a-hA-H])\s*\)|([a-hA-H])\s*\)|([a-h])\s*\.\s+(?=\S))\s*")
_T = r"(?:\s|</?[a-z]+>)*"
RE_PTS = re.compile(r"[\(\[]" + _T + r"(?:fins\s+a\s+|valor\s*:?\s*)?" + _T + r"(\d+(?:[.,]\d+)?)" + _T + r"(?:punts?|pts?\.?|p\.?)" + _T
                    + r"(?:cadascun[ae]?|cada una|c/u)?" + _T + r"[\)\]]" + r"(?:</?[a-z]+>|\s)*\.?(?:\s*-(?!\w))?", re.I)
RE_PTS_LLARG = re.compile(r"\(" + _T + r"(\d+(?:[.,]\d+)?)" + _T + r"(?:punts?|pts?\.?)" + _T + r"[;,]" + _T, re.I)
RE_PTS2 = re.compile(r"[\(\[]\s*(\d+(?:[.,]\d+)?)\s*[\)\]]\s*$")


def treure_marca(html, plain, rx):
    """Lleva el número/lletra del principi del text (en html pot haver-hi etiquetes)."""
    m = rx.match(plain)
    n = len(re.sub(r"\s", "", m.group(0)))
    out, vistos, i = "", 0, 0
    while i < len(html) and vistos < n:
        if html[i] == "<":
            j = html.index(">", i)
            out += html[i:j + 1]
            i = j + 1
            continue
        if html[i] == "&":
            j = html.index(";", i)
            i = j + 1
            vistos += 1
            continue
        if html[i].strip():
            vistos += 1
        i += 1
    resta = re.sub(r"^(\s|[.\-–—:])+", "", html[i:])
    return netejar_html(out + resta)


def punts(text_html):
    m = None
    for m in RE_PTS.finditer(text_html):
        pass
    if not m:
        m3 = None
        for m3 in RE_PTS_LLARG.finditer(text_html):
            pass
        if m3:
            t = text_html[:m3.start()] + "(" + text_html[m3.end():]
            return "\n".join(equilibrar(x) for x in t.split("\n")), m3.group(1).replace(",", ".")
        m2 = RE_PTS2.search(text_html.strip())
        if m2:
            return text_html[:m2.start()].rstrip(), m2.group(1).replace(",", ".")
        return text_html, ""
    t = (text_html[:m.start()] + " " + text_html[m.end():])
    t = "\n".join(equilibrar(re.sub(r"^[\s.\-–:]+(?=\S)", "", x)) for x in t.split("\n"))
    t = re.sub(r"[ \t]+([.,:;])", r"\1", t)
    t = re.sub(r"[ \t]{2,}", " ", t).strip()
    return t, m.group(1).replace(",", ".")


def equilibrar(h):
    """Tanca o lleva etiquetes desaparellades després de retallar el text."""
    out, pila = "", []
    for tros in re.split(r"(</?[a-z]+>)", h):
        m = re.fullmatch(r"<(/?)([a-z]+)>", tros)
        if not m:
            out += tros
        elif not m.group(1):
            pila.append(m.group(2)); out += tros
        elif m.group(2) in pila:
            while pila:
                t = pila.pop(); out += "</%s>" % t
                if t == m.group(2):
                    break
    out += "".join("</%s>" % t for t in reversed(pila))
    return netejar_html(out)


def a_paragrafs(linies):
    """Ajunta línies en paràgrafs; torna (paràgrafs html, espai en blanc final en mm)."""
    paras, cur, prev = [], "", None
    for l in linies:
        if prev is not None:
            salt = l["top"] - prev["bottom"]
            nou = salt > prev["size"] * 0.9 or l["pg"] != prev["pg"] or re.match(r"^\s*[•·\-–]\s", l["plain"]) \
                or (prev["plain"].rstrip().endswith((".", ":", "?")) and l["x0"] > prev["marge"] + 12)
            if nou and not l.get("cont"):
                paras.append(cur)
                cur = l["html"]
            else:
                cur = cur + l["html"] if re.search(r"[a-zà-ú]-$", cur) and re.match(r"^[a-zà-ú]", l["plain"]) else cur + " " + l["html"]
        else:
            cur = l["html"]
        prev = l
    if cur:
        paras.append(cur)
    return [p.strip() for p in paras if p.strip()]


def taula_node(it):
    return {"type": "table", "id": uid(), "table": {"header": True, "border": "grid", "zebra": False, "hshade": True,
            "rowH": it["rowH"], "widths": it["widths"], "cells": it["cells"]}}


def construir(items, titol, clau):
    body_pre, preguntes = [], []
    q = sub = None
    trossos = []   # (node, [items de text]) per a omplir després

    def nou_text_dest():
        return sub if sub is not None else q

    esperat = 1
    buffer = []   # items del node actual
    actual = None  # node que rep el text
    blocs_fora = []  # pre-preguntes

    def tancar_actual():
        nonlocal buffer, actual
        if actual is None:
            if buffer:
                blocs_fora.append(buffer)
        else:
            trossos.append((actual, buffer))
        buffer = []

    for it in items:
        if it["k"] == "l":
            m = RE_Q.match(it["plain"]) or RE_Q2.match(it["plain"])
            esq = it["x0"] <= it["marge"] + 40
            if m and esq and 1 <= int(m.group(1)) <= esperat + 2 and int(m.group(1)) >= esperat - 0 \
                    and not re.match(r"^\s*\d{1,2}\s*[.,]\s*\d", it["plain"]) \
                    and not re.match(r"^\s*\d+\s*(?:[.,]\d+)?\s*(?:k?g|m|s|l|k|°|º|ºc|j|n|cm|mol|atm|%)\b", it["plain"], re.I):
                tancar_actual()
                q = {"type": "question", "id": uid(), "title": "", "meta": "", "text": "", "points": "", "numMode": "auto", "customLabel": "", "children": []}
                preguntes.append(q)
                sub = None
                actual = q
                esperat = int(m.group(1)) + 1
                it = dict(it, html=treure_marca(it["html"], it["plain"], RE_Q if RE_Q.match(it["plain"]) else RE_Q2), plain=(RE_Q.sub("", it["plain"], 1) if RE_Q.match(it["plain"]) else RE_Q2.sub("", it["plain"], 1)))
                if not it["plain"].strip():
                    continue
            elif q is not None and RE_SUB.match(it["plain"]) and it["x0"] <= it["marge"] + 90:
                tancar_actual()
                sub = {"type": "subquestion", "id": uid(), "text": "", "points": "", "numMode": "auto", "customLabel": "", "children": []}
                q["children"].append(sub)
                actual = sub
                it = dict(it, html=treure_marca(it["html"], it["plain"], RE_SUB), plain=RE_SUB.sub("", it["plain"], 1))
                if not it["plain"].strip():
                    continue
        buffer.append(it)
    tancar_actual()

    def omplir(node, its):
        """Primer paràgraf(s) = enunciat; després figures i paràgrafs addicionals com a blocs fills."""
        text_ls, extra = [], []
        for i, it in enumerate(its):
            if it["k"] in "ft":
                extra.append((it["k"], it))
            elif not extra:
                text_ls.append(it)
            else:
                extra.append(("l", it))
        paras = a_paragrafs(text_ls)
        html = "\n".join(paras)
        html, p = punts(html)
        node["text"] = html
        if p:
            node["points"] = p
        fills = []
        grup = []

        def buida_grup():
            nonlocal grup
            if grup:
                ps = a_paragrafs(grup)
                txt, p2 = punts("\n".join(ps))
                if p2 and not node.get("points"):
                    node["points"] = p2
                if txt.strip():
                    fills.append({"type": "text", "id": uid(), "text": txt, "variant": "plain"})
                grup = []
        for k, it in extra:
            if k == "f":
                buida_grup()
                fills.append({"type": "image", "id": uid(), "src": it["src"], "widthPct": it["amplePct"], "imgAlign": "center", "caption": ""})
            elif k == "t":
                buida_grup()
                fills.append(taula_node(it))
            else:
                grup.append(it)
        buida_grup()
        # espai per a respondre: buit gran després de l'últim element (a la mateixa pàgina)
        if its:
            ult = its[-1]
            seg = None
            for it2 in items:
                if (it2["pg"], it2["top"]) > (ult["pg"], ult["top"]) and it2 is not ult:
                    seg = it2
                    break
            if seg is not None and seg["pg"] == ult["pg"]:
                buit = (seg["top"] - ult["bottom"]) * PT_MM
                if buit > 14:
                    fills.append({"type": "spacer", "id": uid(), "height": round(min(buit - 4, 90))})
            elif seg is not None:
                fills.append({"type": "spacer", "id": uid(), "height": 25})
        # les subpreguntes ja estan en node["children"]: els blocs d'enunciat van abans
        if node["type"] == "question" and node["children"]:
            node["children"] = [f for f in fills if f["type"] != "spacer"] + node["children"]
        else:
            node["children"] = fills + node.get("children", [])

    for node, its in trossos:
        omplir(node, its)

    # «2,5 punts per exercici»: per a les preguntes que no en porten
    tot = " ".join(it["plain"] for it in items if it["k"] == "l")
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*punts?\s+(?:per|cada)\s+(?:exercici|pregunta|qüestió|questió|problema|apartat)", tot, re.I)
    if m:
        for q in preguntes:
            subs = [c for c in q["children"] if c["type"] == "subquestion"]
            if not q["points"] and not any(x.get("points") for x in subs):
                q["points"] = m.group(1).replace(",", ".")

    t = {"type": "title", "id": uid(), "eyebrow": NOMS.get(clau, ""), "title": titol, "subtitle": "", "rule": True,
         "style": {"font": "", "size": "", "align": "left"}}
    d = {"type": "datos", "id": uid(), "fields": [{"label": "Nom i cognoms", "w": 50, "pre": ""}, {"label": "Curs / Grup", "w": 20, "pre": ""},
                                                   {"label": "Data", "w": 15, "pre": ""}, {"label": "Nota", "w": 15, "pre": "/ 10"}]}
    body = [t, d]
    for b in blocs_fora:
        ls = [x for x in b if x["k"] == "l"]
        fs = [x for x in b if x["k"] in "ft"]
        ps = a_paragrafs(ls)
        if ps:
            body.append({"type": "text", "id": uid(), "text": "\n".join(ps), "variant": "plain"})
        for f in fs:
            body.append(taula_node(f) if f["k"] == "t" else {"type": "image", "id": uid(), "src": f["src"], "widthPct": f["amplePct"], "imgAlign": "center", "caption": ""})
    body += preguntes
    return body, len(preguntes)


def examen(body, titol, clau):
    return {
        "v": 1, "id": uid(), "name": titol,
        "page": {"size": "A4", "orient": "portrait", "mt": 18, "mb": 16, "ml": 20, "mr": 20},
        "base": {"font": "times", "size": 11, "lh": 1.35, "align": "justify", "hyphens": False},
        "typeStyles": {}, "accent": "#111111",
        "num": {"sec": ["{I}.", "{A}.", "{n}."], "q": "{n}.-", "sub": ["{a})", "{i})", "–"], "restart": False,
                "ptsFmt": "({p} punts)", "ptsPlace": "inline", "total": 10},
        "header": {"on": True, "first": True, "l": "Nom de l'institut", "c": "", "r": "Curs 2026-2027", "font": "", "size": 9,
                   "color": "#333333", "rule": True, "off": 9, "logo": "", "logoPos": "l", "logoH": 10},
        "footer": {"on": True, "first": True, "l": NOMS.get(clau, ""), "c": "", "r": "Pàgina {pagina} de {paginas}", "font": "",
                   "size": 9, "color": "#333333", "rule": True, "off": 8},
        "body": body,
        "origen": "material",
    }


def a_pdf(ruta, tmp):
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, ruta], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    return os.path.join(tmp, os.path.splitext(os.path.basename(ruta))[0] + ".pdf")


def main():
    filtre = sys.argv[1] if len(sys.argv) > 1 else ""
    informe = []
    tmp = tempfile.mkdtemp(prefix="exed-")
    for clau in CLAUS:
        cap, dades, ruta_idx = llegir_index(clau)
        fets = set()
        for tema, its in dades.items():
            for it in its:
                if not es_examen(it) or filtre not in clau + "/" + it["f"]:
                    continue
                orig = os.path.join(ARREL, "docs/material", clau, it["f"])
                dest_rel = "editor/" + os.path.splitext(it["f"])[0] + ".json"
                dest = os.path.join(ARREL, "docs/material", clau, dest_rel)
                if dest in fets:
                    it["ed"] = 1
                    continue
                try:
                    pdf = orig if orig.lower().endswith(".pdf") else a_pdf(orig, tmp)
                    items, _ = flux(pdf)
                    titol = re.sub(r",\s*(Word|PDF)\)", ")", re.sub(r"\s*\((PDF|Word|PowerPoint)\)\s*$", "", it["t"]))
                    body, nq = construir(items, titol, clau)
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    json.dump(examen(body, titol, clau), open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
                    it["ed"] = 1
                    fets.add(dest)
                    informe.append((clau, it["f"], nq, os.path.getsize(dest) // 1024))
                except Exception as e:  # noqa
                    informe.append((clau, it["f"], -1, str(e)[:80]))
        escriure_index(cap, dades, ruta_idx)
    for r in informe:
        print("%-9s %-58s preguntes=%-3s %s KB" % r)


if __name__ == "__main__":
    main()
