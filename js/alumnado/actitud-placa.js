/* ============================================================================
   Quadern d'avaluació · Positius i negatius d'actitud des del plànol d'aula
   js/alumnado/actitud-placa.js

   En el Plànol d'aula, el mode «🙋 Actitud»: toques l'alumne/a i apuntes un
   positiu (＋) o un negatiu (−) en un dels apartats de la rúbrica d'Actitud
   (Puntualitat, Interès, Participació, Col·laboració, Llenguatge). Cada apunt
   porta la data i l'avaluació: grupo.actitudObs = [{id, al, f, trim, k, s}]
   (s = 1 o −1).

   En qualificar una activitat d'Actitud (Seguiment o Taula de notes), una
   targeta mostra el recompte de l'avaluació per apartat i el botó «Aplicar a la
   rúbrica» punxa el nivell de cada apartat que té apunts:
     balanç ≥ +2 → el nivell més alt (AE) · +1 o 0 → el segon (AN)
     −1 → el tercer (AS) · ≤ −2 → el més baix (NA)
   Els apartats sense apunts no es toquen, i tot es pot canviar després a mà.
   ============================================================================ */
const AC_FILES=[
  {k:"puntual",   nom:"Puntualitat",   re:/puntual/i,        pos:"Puntual i a punt",  neg:"Tard o sense material"},
  {k:"interes",   nom:"Interès",       re:/inter[eè]s/i,     pos:"Atent/a",           neg:"Distret/a"},
  {k:"particip",  nom:"Participació",  re:/particip/i,       pos:"Participa",         neg:"No participa"},
  {k:"collab",    nom:"Col·laboració", re:/col.?labora/i,    pos:"Col·labora",        neg:"Molesta"},
  {k:"llenguatge",nom:"Llenguatge",    re:/llenguatge/i,     pos:"Llenguatge adequat",neg:"Llenguatge inadequat"}
];
/* Avaluació d'una data: la de les dates d'avaluació del grup, si n'hi ha;
   si no, l'avaluació triada dalt. */
function acTrimDeData(g,f){
  const ft=g.fechasTrimestre||[];
  for(let t=0;t<3;t++){ const x=ft[t]; if(x&&x.inicio&&x.fin&&f>=x.inicio&&f<=x.fin) return t; }
  return Number(state.ui.trim)||0;
}
function acObs(g,alId,trim){ return (g.actitudObs||[]).filter(o=>o.al===alId && (trim==null||o.trim===trim)); }
function acRecompte(g,alId,trim){
  const r={}; AC_FILES.forEach(f=>r[f.k]={p:0,n:0});
  acObs(g,alId,trim).forEach(o=>{ const x=r[o.k]; if(x){ if(o.s>0) x.p++; else x.n++; } });
  return r;
}
function acTotals(g,alId,trim){ let p=0,n=0; acObs(g,alId,trim).forEach(o=>{ if(o.s>0) p++; else n++; }); return {p,n}; }
/* Etiqueta curta per a la taula del plànol: «+3 −1». */
function acPlacaHTML(g,alId){
  const t=acTotals(g,alId,Number(state.ui.trim)||0);
  if(!t.p&&!t.n) return `<div class="ac-placa ac-buida">·</div>`;
  return `<div class="ac-placa">${t.p?`<span class="ac-pos">+${t.p}</span>`:""}${t.n?`<span class="ac-neg">−${t.n}</span>`:""}</div>`;
}
window.acApuntar=(alId,k,s)=>{
  const g=grupoActual(); if(!g) return;
  const al=g.alumnos.find(a=>a.id===alId); const fila=AC_FILES.find(f=>f.k===k); if(!al||!fila) return;
  if(!Array.isArray(g.actitudObs)) g.actitudObs=[];
  const f=agHoyStr();
  g.actitudObs.push({id:uid(),al:alId,f,trim:acTrimDeData(g,f),k,s:s>0?1:-1});
  save();
  document.querySelector(".ac-modal")?.remove();
  render();
  mostrarToast(`${s>0?"＋":"−"} ${s>0?fila.pos:fila.neg} · ${al.nombre}`);
};
window.acEsborrar=(id)=>{
  const g=grupoActual(); if(!g||!Array.isArray(g.actitudObs)) return;
  const o=g.actitudObs.find(x=>x.id===id); if(!o) return;
  g.actitudObs=g.actitudObs.filter(x=>x.id!==id);
  save(); render(); acObrir(o.al);
};
window.acObrir=alId=>{
  const g=grupoActual(); const al=g&&g.alumnos.find(a=>a.id===alId); if(!al) return;
  document.querySelector(".ac-modal")?.remove();
  const trim=Number(state.ui.trim)||0;
  const r=acRecompte(g,alId,trim);
  const ult=acObs(g,alId).slice(-5).reverse();
  const div=document.createElement("div");
  div.className="modal-overlay ac-modal";
  div.innerHTML=`<div class="modal-box" style="max-width:480px" role="dialog" aria-modal="true" aria-label="Actitud de ${esc(al.nombre)}">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:8px">
      <h2 style="font-size:16px;margin:0;display:flex;align-items:center" class="sens">${typeof avatarAlumneHTML==="function"?avatarAlumneHTML(al,{mida:36}):""}${esc(al.nombre)}</h2>
      <button class="ghost" aria-label="Tancar" data-tancar>✕</button>
    </div>
    <p class="sub" style="margin:4px 0 10px">Toca ＋ o − en un apartat de la rúbrica d'Actitud. Entre parèntesis, els d'esta avaluació (${esc(TRIMESTRES[trim]||"")}).</p>
    <div class="ac-files">${AC_FILES.map(f=>`<div class="ac-fila">
      <span class="ac-nom">${esc(f.nom)} <span class="tn-mut">(+${r[f.k].p} −${r[f.k].n})</span></span>
      <button class="ac-bt ac-bt-pos" onclick="acApuntar('${escJS(al.id)}','${f.k}',1)" aria-label="Positiu: ${esc(f.pos)}">＋ ${esc(f.pos)}</button>
      <button class="ac-bt ac-bt-neg" onclick="acApuntar('${escJS(al.id)}','${f.k}',-1)" aria-label="Negatiu: ${esc(f.neg)}">− ${esc(f.neg)}</button>
    </div>`).join("")}</div>
    ${ult.length?`<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px;color:var(--mut)">Últims apunts</summary>
      <ul style="margin:6px 0 0;padding-left:0;list-style:none;font-size:13px">${ult.map(o=>{ const f=AC_FILES.find(x=>x.k===o.k)||{nom:o.k,pos:"",neg:""};
        return `<li class="flex" style="justify-content:space-between;gap:8px;padding:2px 0"><span>${esc(fmt2(o.f))} · ${o.s>0?"＋":"−"} ${esc(f.nom)}</span><button class="ghost small" onclick="acEsborrar('${escJS(o.id)}')" aria-label="Esborrar este apunt">✕</button></li>`; }).join("")}</ul></details>`:""}
  </div>`;
  document.body.appendChild(div);
  const tancar=()=>{ div.remove(); document.removeEventListener("keydown",k,true); };
  const k=e=>{ if(e.key==="Escape"&&document.body.contains(div)){ e.preventDefault(); e.stopPropagation(); tancar(); } };
  document.addEventListener("keydown",k,true);
  div.querySelectorAll("[data-tancar]").forEach(b=>b.onclick=tancar);
  div.onclick=e=>{ if(e.target===div) tancar(); };
};

/* ---- Targeta en la rúbrica d'una activitat d'Actitud ---- */
function acItemsRubrica(act,alId){
  const rub=cxRubricaDe(act,alId);
  const niv=(typeof cxnNiveles==="function"? cxnNiveles(rub) : []).slice().sort((a,b)=>(Number(b.valor)||0)-(Number(a.valor)||0));
  const items=cxItemsFlat(rub);
  return {niv, files:AC_FILES.map(f=>({f,it:items.find(it=>f.re.test(it.label||""))})).filter(x=>x.it)};
}
function acNivellIdx(net,n){ const i= net>=2? 0 : net>=0? 1 : net===-1? 2 : 3; return Math.min(i,n-1); }
function acRubricaCardHTML(g,act,al){
  if(!g||!act||!al||act.seguiment!=="actitud" || !act.rubrica) return "";
  const r=acRecompte(g,al.id,act.trimestre);
  const amb=AC_FILES.filter(f=>r[f.k].p||r[f.k].n);
  const {niv,files}=acItemsRubrica(act,al.id);
  const aplicables=files.filter(x=>r[x.f.k].p||r[x.f.k].n);
  return `<div class="card ac-rub" style="border-left:4px solid var(--accent)">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <strong style="font-size:14px">🙋 Del plànol d'aula · ${esc(TRIMESTRES[act.trimestre]||"")}</strong>
      ${aplicables.length&&niv.length?`<button class="btn small" onclick="acAplicarRubrica('${escJS(act.id)}','${escJS(al.id)}')" title="Punxa el nivell de cada apartat amb apunts (els altres no es toquen)">Aplicar a la rúbrica</button>`:""}
    </div>
    ${amb.length?`<div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:6px">${amb.map(f=>`<span class="chip" title="${esc(f.nom)}: ${r[f.k].p} positius i ${r[f.k].n} negatius">${esc(f.nom)} <span class="ac-pos">+${r[f.k].p}</span> <span class="ac-neg">−${r[f.k].n}</span>${niv.length&&files.some(x=>x.f.k===f.k)?` → ${esc((niv[acNivellIdx(r[f.k].p-r[f.k].n,niv.length)]||{}).nombre||"")}`:""}</span>`).join("")}</div>
      <p class="sub" style="margin:6px 0 0">Balanç +2 o més → ${esc((niv[0]||{}).nombre||"el nivell més alt")}; +1 o 0 → ${esc((niv[1]||{}).nombre||"el segon")}; −1 → ${esc((niv[2]||{}).nombre||"el tercer")}; −2 o menys → ${esc((niv[3]||niv[niv.length-1]||{}).nombre||"el més baix")}. Després ho pots canviar a mà.</p>`
    :`<p class="sub" style="margin:6px 0 0">Encara no hi ha cap positiu ni negatiu en esta avaluació. Apunta'ls en <strong>Classe → Plànol d'aula → 🙋 Actitud</strong>, tocant l'alumne/a durant la classe.</p>`}
  </div>`;
}
window.acAplicarRubrica=(actId,alId)=>{
  const g=grupoActual(); const act=g&&g.actividades.find(a=>a.id===actId); if(!act) return;
  const r=acRecompte(g,alId,act.trimestre);
  const {niv,files}=acItemsRubrica(act,alId); if(!niv.length) return;
  let n=0;
  files.forEach(({f,it})=>{
    const x=r[f.k]; if(!x.p&&!x.n) return;
    const l=niv[acNivellIdx(x.p-x.n,niv.length)]; if(!l) return;
    cxSetItemScore(alId,actId,it.id,String(cxnPuntosNivel(it,l,cxnNiveles(cxRubricaDe(act,alId)))));
    n++;
  });
  save(); render();
  mostrarToast(`✓ ${n} apartat${n===1?"":"s"} de la rúbrica punxat${n===1?"":"s"} a partir del plànol`);
};
