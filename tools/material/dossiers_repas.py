#!/usr/bin/env python3
"""
Quadern d'avaluació · Dossiers de repàs per tema i crèdits del material
tools/material/dossiers_repas.py

S'executa a mà (no forma part de l'app) quan canvia el material:
    python3 tools/material/dossiers_repas.py

1. Crèdits: llig l'autor de cada document (metadades del PDF o del Word) i,
   si no és del professorat del departament, l'apunta en el camp "a" de
   l'índex js/datos/material/<curs>.js. L'app el mostra al costat del títol.
2. Dossiers de repàs: per a cada tema, ajunta en un sol PDF els exercicis i
   els models d'examen d'altres cursos (sense solucions, pràctiques de
   laboratori ni versions repetides), amb una portada que diu què hi ha i
   de qui és cada document. Si el tema té exàmens adaptats, en fa també una
   versió adaptada. Els Word/ODT es passen a PDF amb LibreOffice.
   Resultat: docs/material/<curs>/tema-NN/dossier-repas[-adaptat].pdf i una
   entrada «tipus: repas» al principi del tema en l'índex.
Necessita: pypdf, reportlab, pdfinfo (poppler) i soffice (LibreOffice).
"""
import json, os, re, subprocess, sys, tempfile, zipfile, io
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

ARREL = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CURSOS = {"FiQ_2ESO": "FiQ 2n ESO", "FiQ_3ESO": "FiQ 3r ESO", "FiQ_4ESO": "FiQ 4t ESO",
          "FiQ_1BAT": "FiQ 1r Batxillerat", "QUI_2BAT": "Química 2n Batxillerat"}
# Autors de les metadades que són professorat del departament (no cal citar-los).
PROPIS = {"", "jordi"}
NOMS = {"rafael bueno": "Rafael Bueno", "jesus escriva": "Jesús Escrivà", "nelo traver": "Nelo Traver",
        "generalitat de catalunya": "Proves PAU · Generalitat de Catalunya",
        "departament d'educació": "Departament d'Educació"}
FORA = re.compile(r"adaptat|model-b|-b\.\w+$|-v[23]\.\w+$|resolt|complet|solucio|practica|phet|dossier-repas", re.I)


def autor(path):
    a = ""
    if path.endswith(".pdf"):
        r = subprocess.run(["pdfinfo", path], capture_output=True, text=True)
        m = re.search(r"^Author:\s*(.*)$", r.stdout, re.M)
        a = m.group(1).strip() if m else ""
    elif path.endswith((".docx", ".pptx", ".xlsx")):
        try:
            x = zipfile.ZipFile(path).read("docProps/core.xml").decode("utf8", "replace")
            m = re.search(r"<dc:creator>([^<]*)", x); a = m.group(1).strip() if m else ""
        except Exception:
            pass
    if a.lower() in PROPIS:
        return ""
    return NOMS.get(a.lower(), a)


def llegir_index(clau):
    f = os.path.join(ARREL, "js", "datos", "material", clau + ".js")
    src = open(f, encoding="utf8").read()
    i = src.index("MATERIAL_TEMES[\"%s\"]" % clau)
    cap = src[:i]
    cos = src[src.index("{", i):src.rindex("}") + 1]
    return f, cap, json.loads(cos)


def escriure_index(f, cap, clau, dades):
    if not cap.rstrip().endswith("window."):
        cap = cap  # «MATERIAL_TEMES[…]» sense window. funciona igual
    txt = cap + "MATERIAL_TEMES[\"%s\"]=" % clau + json.dumps(dades, ensure_ascii=False, indent=1) + ";\n"
    open(f, "w", encoding="utf8").write(txt)


def a_pdf(path, tmp):
    if path.endswith(".pdf"):
        return path
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, path],
                   capture_output=True, timeout=180)
    out = os.path.join(tmp, os.path.splitext(os.path.basename(path))[0] + ".pdf")
    return out if os.path.exists(out) else None


def portada(curs, tema, items, adaptat):
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=A4); w, h = A4
    c.setFillColorRGB(0.08, 0.16, 0.27); c.rect(0, h - 6.2 * cm, w, 6.2 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1); c.setFont("Helvetica", 11); c.drawString(2 * cm, h - 2 * cm, curs)
    c.setFont("Helvetica-Bold", 22); c.drawString(2 * cm, h - 3.3 * cm, "Dossier de repàs" + (" (versió adaptada)" if adaptat else ""))
    c.setFont("Helvetica", 14); c.drawString(2 * cm, h - 4.4 * cm, tema[:80])
    y = h - 8 * cm
    c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont("Helvetica", 11)
    for linia in ["Nom i cognoms: ______________________________________   Grup: ________",
                  "Data d'entrega: ______________"]:
        c.drawString(2 * cm, y, linia); y -= 0.9 * cm
    y -= 0.4 * cm
    c.setFont("Helvetica-Bold", 12); c.drawString(2 * cm, y, "Què hi ha en este dossier"); y -= 0.7 * cm
    c.setFont("Helvetica", 10.5)
    for n, (it, pag) in enumerate(items, 1):
        t = "%d. %s" % (n, it["t"]); t = re.sub(r"\s*\((Word|PowerPoint|ODT)\)", "", t)
        c.drawString(2.3 * cm, y, t[:92]); c.drawRightString(w - 2 * cm, y, "pàg. %d" % pag)
        if it.get("a"):
            y -= 0.45 * cm; c.setFillColorRGB(0.35, 0.35, 0.35); c.setFont("Helvetica-Oblique", 9)
            c.drawString(2.8 * cm, y, "Autoria: " + it["a"]); c.setFillColorRGB(0.1, 0.1, 0.1); c.setFont("Helvetica", 10.5)
        y -= 0.62 * cm
        if y < 4 * cm:
            break
    y -= 0.4 * cm
    c.setFont("Helvetica-Bold", 12); c.drawString(2 * cm, y, "Com treballar-lo"); y -= 0.65 * cm
    c.setFont("Helvetica", 10.5)
    for linia in ["1. Repassa la teoria del tema (apunts i presentació).",
                  "2. Fes els exercicis en ordre, en un full a banda, explicant cada pas i amb unitats.",
                  "3. Els models d'examen són d'altres cursos: fes-los com si fora l'examen, sense apunts.",
                  "4. Apunta els dubtes per a preguntar-los a classe abans de la recuperació."]:
        c.drawString(2.3 * cm, y, linia); y -= 0.55 * cm
    c.setFont("Helvetica-Oblique", 8.5); c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawString(2 * cm, 1.5 * cm, "Material del Departament de Física i Química. Els documents d'altres autors porten el seu nom en este índex.")
    c.showPage(); c.save(); buf.seek(0)
    return PdfReader(buf)


def dossier(clau, num, items, tema_nom, adaptat, tmp):
    dir_curs = os.path.join(ARREL, "docs", "material", clau)
    trossos = []
    for it in items:
        p = a_pdf(os.path.join(dir_curs, it["f"]), tmp)
        if not p:
            print("   ! no es pot convertir", it["f"]); continue
        trossos.append((it, PdfReader(p)))
    if not trossos:
        return None
    pag = 2; idx = []
    for it, r in trossos:
        idx.append((it, pag)); pag += len(r.pages)
    out = PdfWriter()
    for p in portada(CURSOS[clau], tema_nom, idx, adaptat).pages:
        out.add_page(p)
    for it, r in trossos:
        for p in r.pages:
            out.add_page(p)
    for p in out.pages:
        try: p.compress_content_streams()
        except Exception: pass
    out.compress_identical_objects()
    carpeta = os.path.dirname(items[0]["f"])
    nom = "%s/dossier-repas%s.pdf" % (carpeta, "-adaptat" if adaptat else "")
    with open(os.path.join(dir_curs, nom), "wb") as fh:
        out.write(fh)
    kb = round(os.path.getsize(os.path.join(dir_curs, nom)) / 1024)
    autors = sorted({it["a"] for it, _ in trossos if it.get("a")})
    e = {"f": nom, "t": "Dossier de repàs del tema" + (" · versió adaptada" if adaptat else "") + " (%d documents, %d pàg.)" % (len(trossos), pag - 1),
         "tipus": "repas", "kb": kb}
    if autors: e["a"] = ", ".join(autors)
    return e


_TEMES = None
def nom_tema(clau, num):
    """Nom del tema tal com el posa l'app (progSepararTitol de programaciones-departamento.js)."""
    global _TEMES
    if _TEMES is None:
        js = r"""const src=require("fs").readFileSync(process.argv[1],"utf8");
const {PROG_DEPARTAMENTO:P,progSepararTitol:s}=new Function(src+";return {PROG_DEPARTAMENTO,progSepararTitol};")();
const o={};for(const k in P){o[k]={};P[k].sdas.forEach((x,i)=>{const r=s(x.titulo,i+1);const m=/tema\s*(\d+)/i.exec(r.tema||"");if(m)o[k][m[1]]=r.tema.replace(/\.-\s*/," · ");});}
console.log(JSON.stringify(o));"""
        r = subprocess.run(["node", "-e", js, os.path.join(ARREL, "js", "datos", "programaciones-departamento.js")], capture_output=True, text=True)
        try: _TEMES = json.loads(r.stdout)
        except Exception: _TEMES = {}
    return _TEMES.get(clau, {}).get(str(num), "Tema %s" % num)


def main():
    tmp = tempfile.mkdtemp()
    for clau in CURSOS:
        f, cap, dades = llegir_index(clau)
        print("==", clau)
        for k, llista in dades.items():
            llista[:] = [it for it in llista if it.get("tipus") != "repas"]
            for it in llista:
                a = autor(os.path.join(ARREL, "docs", "material", clau, it["f"]))
                if a: it["a"] = a
                else: it.pop("a", None)
        for k, llista in dades.items():
            if k == "globals":
                continue
            base = [it for it in llista if it["tipus"] in ("exercicis", "examen") and re.search(r"\.(pdf|docx|odt)$", it["f"]) and not FORA.search(it["f"])]
            base.sort(key=lambda it: (it["tipus"] != "exercicis",))
            nous = []
            if len(base) >= 2 or any(it["tipus"] == "exercicis" for it in base):
                e = dossier(clau, k, base, nom_tema(clau, k), False, tmp)
                if e: nous.append(e); print("  tema", k, "→", e["t"], e["kb"], "kB")
                adapt = [it for it in llista if it["tipus"] == "examen" and re.search(r"adaptat", it["f"]) and re.search(r"\.(pdf|docx|odt)$", it["f"])]
                if adapt:
                    ex = [it for it in base if it["tipus"] == "exercicis"]
                    e2 = dossier(clau, k, ex + adapt, nom_tema(clau, k), True, tmp)
                    if e2: nous.append(e2); print("  tema", k, "→", e2["t"], e2["kb"], "kB")
            llista[:0] = nous
        escriure_index(f, cap, clau, dades)


if __name__ == "__main__":
    main()
