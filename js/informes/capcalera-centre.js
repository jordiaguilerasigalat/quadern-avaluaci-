/* ============================================================================
   Quadern · Capçalera pròpia del centre (imatge) en els documents
   js/informes/capcalera-centre.js

   - La imatge es puja una vegada (Inici → les meues dades, o des de la vista
     prèvia de qualsevol document) i es guarda en state.capcalera, de manera
     que va dins de les còpies de seguretat com la resta de dades.
   - En la vista prèvia d'impressió hi ha un botó «🏫 Capçalera» per a posar-la
     o llevar-la. La tria es recorda per a cada tipus de document (informe per
     a la família, fitxes de repàs, rúbrica…).
   - En els documents de diverses pàgines per alumne/a (informes, fitxes…) la
     capçalera es repeteix al principi de cada salt de pàgina forçat.
   - L'editor d'exàmens té el seu propi botó (editor/js/puente-cuaderno.js):
     la capçalera hi entra com un bloc d'imatge al principi de l'examen.
   ============================================================================ */
const CAPC_MAX_PX=2000;

function capcaleraImg(){ const c=state&&state.capcalera; return (c&&typeof c.src==="string"&&/^data:image\//.test(c.src))? c.src : ""; }
function capcaleraPerDefecte(){ return !(state&&state.capcalera&&state.capcalera.perDefecte===false); }
/* Tipus de document = el títol fins al primer « · » o « — » («Informe per a la família · Anna · 1a» → «Informe per a la família»). */
function _capcTipus(titol){ return String(titol||"").split(/\s[·—–-]\s/)[0].trim().toLowerCase().slice(0,60)||"document"; }
function capcaleraActivaPer(titol){
  if(!capcaleraImg()) return false;
  const m=(state.capcalera.docs||{}), k=_capcTipus(titol);
  return (k in m)? !!m[k] : capcaleraPerDefecte();
}
function _capcRecordar(titol,valor){
  if(!state.capcalera) return;
  if(!state.capcalera.docs||typeof state.capcalera.docs!=="object") state.capcalera.docs={};
  state.capcalera.docs[_capcTipus(titol)]=!!valor; save();
}

/* Llig i, si cal, redueix la imatge. PNG es queda en PNG (pot tindre transparència). */
function capcaleraLlegir(file){
  return new Promise((resol,rebutja)=>{
    if(!file || !/^image\//.test(file.type||"")) return rebutja(new Error("format"));
    const fr=new FileReader();
    fr.onerror=()=>rebutja(new Error("lectura"));
    fr.onload=()=>{
      const src=fr.result;
      if(file.type==="image/svg+xml") return resol({src,w:0,h:0});
      const im=new Image();
      im.onerror=()=>rebutja(new Error("format"));
      im.onload=()=>{
        const k=Math.min(1,CAPC_MAX_PX/Math.max(1,im.naturalWidth));
        const w=Math.round(im.naturalWidth*k), h=Math.round(im.naturalHeight*k);
        if(k===1 && file.size<600000 && /png|jpe?g/.test(file.type)) return resol({src,w,h});
        const c=document.createElement("canvas"); c.width=w; c.height=h;
        const cx=c.getContext("2d"); const png=file.type==="image/png";
        if(!png){ cx.fillStyle="#fff"; cx.fillRect(0,0,w,h); }
        cx.imageSmoothingQuality="high"; cx.drawImage(im,0,0,w,h);
        resol({src:c.toDataURL(png?"image/png":"image/jpeg",.9),w,h});
      };
      im.src=src;
    };
    fr.readAsDataURL(file);
  });
}
function capcaleraTriar(despres){
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    try{
      const r=await capcaleraLlegir(f);
      const prev=state.capcalera||{};
      state.capcalera={src:r.src,w:r.w,h:r.h,nom:String(f.name||"").slice(0,80),perDefecte:prev.perDefecte!==false,docs:prev.docs||{}};
      save(); mostrarToast("🏫 Capçalera del centre guardada");
      if(typeof despres==="function") despres(); else render();
    }catch(e){ mostrarAviso("No s'ha pogut llegir eixa imatge. Prova amb un fitxer JPG o PNG.","Capçalera del centre"); }
  };
  inp.click();
}
window.capcaleraTriar=capcaleraTriar;
window.capcaleraLlevar=async()=>{
  if(!capcaleraImg()) return;
  if(!await confirmar("Vols llevar la imatge de capçalera del centre? Els exàmens on ja l'has posada la conserven.",{ok:"Llevar-la",peligro:true})) return;
  delete state.capcalera; save(); render(); mostrarToast("Capçalera llevada");
};
window.capcaleraSetPerDefecte=(v)=>{ if(!state.capcalera) return; state.capcalera.perDefecte=!!v; state.capcalera.docs={}; save(); };

/* Bloc per a Inici → les meues dades (fons fosc de la capçalera d'Inici). */
function capcaleraIniciHTML(){
  const src=capcaleraImg(), bb='class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)"';
  return `<div style="margin-top:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.06)">
    <div style="font-size:12px;color:rgba(255,255,255,.85);font-weight:600;margin-bottom:6px">🏫 Capçalera del centre (imatge per a exàmens, informes, fitxes…)</div>
    ${src?`<img src="${src}" alt="Capçalera del centre" style="display:block;max-width:100%;max-height:60px;background:#fff;border-radius:4px;padding:3px;margin-bottom:8px">`:""}
    <div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">
      <button ${bb} onclick="capcaleraTriar()">${src?"🔄 Canviar la imatge":"⬆️ Pujar la capçalera"}</button>
      ${src?`<button ${bb} onclick="capcaleraLlevar()">🗑️ Llevar</button>
      <label style="font-size:12px;color:rgba(255,255,255,.85);display:flex;gap:6px;align-items:center"><input type="checkbox" ${capcaleraPerDefecte()?"checked":""} onchange="capcaleraSetPerDefecte(this.checked)"> Posar-la per defecte en els documents nous</label>`
      :`<span style="font-size:12px;color:rgba(255,255,255,.7)">Una imatge apaïsada (JPG o PNG) amb els logotips i les dades del centre.</span>`}
    </div>
    ${src?`<p style="margin:6px 0 0;font-size:11.5px;color:rgba(255,255,255,.65)">En cada document tens el botó «🏫 Capçalera» per a posar-la o llevar-la; en l'editor d'exàmens, el botó «🏫 Capçalera del centre».</p>`:""}
  </div>`;
}

/* ---- Vista prèvia d'impressió ---- */
function _capcEl(src){
  const d=document.createElement("div");
  d.className="doc-capcalera-centre";
  d.setAttribute("style","display:block;margin:0 0 14px;page-break-inside:avoid;break-inside:avoid");
  d.innerHTML=`<img alt="" src="${src}" style="display:block;width:100%;height:auto;max-height:30mm;object-fit:contain;object-position:left center">`;
  return d;
}
/* Posa (o lleva) la capçalera dins de .doc-root: al principi i després de cada salt de pàgina forçat. */
function capcaleraAplicar(root,posar){
  root.querySelectorAll(".doc-capcalera-centre").forEach(x=>x.remove());
  const src=capcaleraImg(); if(!posar||!src) return;
  const punts=new Set();
  root.querySelectorAll("*").forEach(el=>{
    let cs; try{ cs=getComputedStyle(el); }catch(e){ return; }
    const salt=v=>v==="page"||v==="always"||v==="left"||v==="right";
    if(salt(cs.breakBefore)||salt(cs.pageBreakBefore)) punts.add({dins:el});
    if((salt(cs.breakAfter)||salt(cs.pageBreakAfter)) && el.nextElementSibling) punts.add({abans:el.nextElementSibling});
  });
  /* Un element amb salt «abans» que ja és al principi del document no trenca la pàgina:
     si posàrem la capçalera davant, quedaria sola en el primer full. */
  let primer=null;   // primer text visible del document
  { const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>(n.nodeValue.trim() && !n.parentElement.closest("style,script") && n.parentElement.getClientRects().length)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}); primer=tw.nextNode(); }
  let alPrincipi=false;
  punts.forEach(p=>{ if(p.dins && primer && (p.dins===primer||p.dins.contains(primer))) alPrincipi=true; });
  if(!alPrincipi) root.insertBefore(_capcEl(src),root.firstChild);
  const fets=new Set();
  punts.forEach(p=>{
    if(p.dins){ if(fets.has(p.dins)) return; fets.add(p.dins); if(p.dins.closest(".doc-capcalera-centre")) return; p.dins.insertBefore(_capcEl(src),p.dins.firstChild); }
    else { const n=p.abans; if(fets.has(n)) return; fets.add(n); n.parentNode.insertBefore(_capcEl(src),n); }
  });
}
/* Botó de la barra de la vista prèvia. Cridat des de mostrarImprimible. */
function capcaleraBotoImprimible(ov,root,titol,onCanvi){
  const bar=ov.querySelector(".print-toolbar"), ref=ov.querySelector("#prtImprimir"); if(!bar||!ref) return;
  const b=document.createElement("button");
  b.id="prtCapcalera"; b.type="button"; b.className="ghost";
  b.style.cssText="border:1px solid rgba(255,255,255,.4);color:#fff";
  let on=capcaleraActivaPer(titol);
  const pinta=()=>{
    if(!capcaleraImg()){ b.textContent="🏫 Afegir capçalera…"; b.title="Puja la imatge de capçalera del centre"; b.setAttribute("aria-pressed","false"); return; }
    b.textContent=on?"🏫 Capçalera: Sí":"🏫 Capçalera: No";
    b.title=on?"Llevar la capçalera del centre d'este document":"Posar la capçalera del centre en este document";
    b.setAttribute("aria-pressed",on?"true":"false");
    b.style.background=on?"rgba(255,255,255,.18)":"";
  };
  b.onclick=()=>{
    if(!capcaleraImg()){ capcaleraTriar(()=>{ on=true; _capcRecordar(titol,true); capcaleraAplicar(root,on); pinta(); onCanvi(); }); return; }
    on=!on; _capcRecordar(titol,on); capcaleraAplicar(root,on); pinta(); onCanvi();
  };
  bar.insertBefore(b,ref);
  capcaleraAplicar(root,on); pinta(); onCanvi();
}
