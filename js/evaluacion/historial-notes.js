/* ============================================================================
   Quadern d'avaluació · Historial de canvis de les notes
   js/evaluacion/historial-notes.js

   Cada vegada que es guarda, es compara la nota de cada alumne/a en cada
   activitat (la nota pròpia de l'activitat, NP o Exempt) amb la de l'última
   vegada. Si ha canviat, s'apunta en grupo.historialNotes:
     {t: data i hora, al: alumne, act: activitat, de: valor anterior, a: valor nou}
   Així es veu quan s'ha posat o canviat una nota i quin valor tenia abans
   (útil davant d'una reclamació), es pose des d'on es pose: Taula de notes,
   Qualificar, Corrector, Seguiment, pegar una columna…

   - La comparació es fa abans de guardar, perquè l'apunt vaja en el mateix pas
     que el canvi (Desfer els desfà junts).
   - La referència és l'objecte del grup (WeakMap): en importar una còpia o
     desfer, els grups són objectes nous i no s'apunta res fals.
   - Es guarden com a màxim HN_MAX apunts per grup (els més nous).
   - No es compten les activitats esborrades ni l'alumnat esborrat.
   ============================================================================ */
const HN_MAX=4000;
let _hnBase=new WeakMap();

function hnValor(g,alId,a){
  const m=marcaDe(g,alId,a.id);
  if(m) return m==="EX"? "Exempt" : "NP";
  let v=null; try{ v=notaActividadBase(g,alId,a); }catch(e){}
  return (v==null||isNaN(v))? "" : String(Math.round(Number(v)*100)/100);
}
function hnFoto(g){
  const o=Object.create(null);
  for(const a of g.actividades||[]) for(const al of g.alumnos||[]){
    const v=hnValor(g,al.id,a); if(v!=="") o[al.id+"|"+a.id]=v;
  }
  return {v:o, acts:new Set((g.actividades||[]).map(a=>a.id)), als:new Set((g.alumnos||[]).map(a=>a.id))};
}
function hnComprovar(){
  if(typeof state!=="object" || !state || !Array.isArray(state.grupos)) return;
  const ara=Date.now();
  for(const g of state.grupos){
    if(!g || !Array.isArray(g.alumnos) || !Array.isArray(g.actividades)) continue;
    let foto; try{ foto=hnFoto(g); }catch(e){ continue; }
    const abans=_hnBase.get(g);
    _hnBase.set(g,foto);
    if(!abans) continue;
    const nous=[];
    const claus=new Set([...Object.keys(abans.v),...Object.keys(foto.v)]);
    for(const k of claus){
      const de=abans.v[k]||"", a=foto.v[k]||"";
      if(de===a) continue;
      const [al,act]=k.split("|");
      /* Només activitats i alumnat que hi eren abans i hi són ara: esborrar o
         recuperar de la paperera una activitat o un alumne/a no és canviar notes. */
      if(!abans.acts.has(act) || !foto.acts.has(act) || !abans.als.has(al) || !foto.als.has(al)) continue;
      nous.push({t:ara,al,act,de,a});
    }
    if(nous.length){
      g.historialNotes=(Array.isArray(g.historialNotes)? g.historialNotes : []).concat(nous);
      if(g.historialNotes.length>HN_MAX) g.historialNotes=g.historialNotes.slice(-HN_MAX);
    }
  }
}
/* Es comprova just abans de cada guardat. */
(function(){
  const orig=window.save; if(typeof orig!=="function") return;
  window.save=function(){
    try{ hnComprovar(); }catch(e){}
    return orig.apply(this,arguments);
  };
})();

function hnDataHora(t){
  const d=new Date(t);
  return d.toLocaleDateString("ca-ES",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+d.toLocaleTimeString("ca-ES",{hour:"2-digit",minute:"2-digit"});
}
function hnTxt(v){ return v===""? "sense nota" : /^\d/.test(v)? fmt(Number(v)) : v; }
function hnCanviHTML(e){
  return `<span class="hn-de">${esc(hnTxt(e.de))}</span> → <strong>${esc(hnTxt(e.a))}</strong>`;
}
/* Dins del diàleg d'una casella de la Taula de notes. */
function hnLlistaCasellaHTML(g,alId,actId){
  const l=(g.historialNotes||[]).filter(e=>e.al===alId&&e.act===actId);
  if(!l.length) return "";
  return `<details class="hn-casella" style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--mut)">🕓 Historial d'esta nota (${l.length} canvi${l.length===1?"":"s"})</summary>
    <ul style="margin:6px 0 0;padding-left:18px;font-size:13px">${l.slice().reverse().map(e=>`<li>${esc(hnDataHora(e.t))}: ${hnCanviHTML(e)}</li>`).join("")}</ul></details>`;
}
/* Finestra amb tots els canvis del grup, amb filtre per alumne/a i activitat. */
window.hnObrirGrup=()=>{
  const g=grupoActual(); if(!g) return;
  document.querySelector(".hn-modal")?.remove();
  const div=document.createElement("div");
  div.className="modal-overlay hn-modal";
  const opAl=g.alumnos.map(a=>`<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join("");
  const actsAmb=new Set((g.historialNotes||[]).map(e=>e.act));
  const opAct=g.actividades.filter(a=>actsAmb.has(a.id)).map(a=>`<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join("");
  div.innerHTML=`<div class="modal-box" style="max-width:760px" role="dialog" aria-modal="true" aria-labelledby="hnTit">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;gap:8px">
      <div><h2 id="hnTit" style="font-size:17px;margin:0">🕓 Historial de notes · ${esc(g.nombre)}</h2>
      <p class="sub" style="margin:4px 0 0">Cada nota posada o canviada, amb el dia i l'hora i el valor que tenia abans. Es guarda en les còpies de seguretat.</p></div>
      <button class="ghost" aria-label="Tancar" data-tancar>✕</button>
    </div>
    <div class="flex" style="gap:8px;flex-wrap:wrap;margin:10px 0">
      <select class="in" id="hnAl" aria-label="Alumne/a"><option value="">Tot l'alumnat</option>${opAl}</select>
      <select class="in" id="hnAct" aria-label="Activitat"><option value="">Totes les activitats</option>${opAct}</select>
    </div>
    <div id="hnLlista"></div>
    <div class="flex" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-tancar>Tancar</button></div>
  </div>`;
  document.body.appendChild(div);
  const pinta=()=>{
    const fa=div.querySelector("#hnAl").value, fx=div.querySelector("#hnAct").value;
    const l=(g.historialNotes||[]).filter(e=>(!fa||e.al===fa)&&(!fx||e.act===fx)).slice().reverse();
    const nomAl=id=>(g.alumnos.find(a=>a.id===id)||{}).nombre||"(alumne/a esborrat)";
    const nomAct=id=>(g.actividades.find(a=>a.id===id)||{}).nombre||"(activitat esborrada)";
    const MAX=400;
    div.querySelector("#hnLlista").innerHTML=!l.length
      ? `<p class="sub" style="margin:0">${(g.historialNotes||[]).length?"Cap canvi amb este filtre.":"Encara no s'ha apuntat cap canvi. A partir d'ara, cada nota que poses o canvies apareixerà ací."}</p>`
      : `<div class="scroll" style="max-height:55vh;overflow:auto"><table class="tbl" style="width:100%;font-size:13px"><thead><tr><th>Quan</th><th>Alumne/a</th><th>Activitat</th><th>Canvi</th></tr></thead><tbody>
        ${l.slice(0,MAX).map(e=>`<tr><td style="white-space:nowrap">${esc(hnDataHora(e.t))}</td><td><span class="sens">${esc(nomAl(e.al))}</span></td><td>${esc(nomAct(e.act))}</td><td style="white-space:nowrap">${hnCanviHTML(e)}</td></tr>`).join("")}
        </tbody></table></div>${l.length>MAX?`<p class="sub" style="margin:6px 0 0">Es mostren els ${MAX} canvis més recents de ${l.length}. Filtra per alumne/a o activitat per a vore'n més.</p>`:""}`;
  };
  div.querySelector("#hnAl").onchange=pinta; div.querySelector("#hnAct").onchange=pinta;
  const tancar=()=>{ div.remove(); document.removeEventListener("keydown",esc_,true); };
  const esc_=e=>{ if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); tancar(); } };
  document.addEventListener("keydown",esc_,true);
  div.querySelectorAll("[data-tancar]").forEach(b=>b.onclick=tancar);
  div.onclick=e=>{ if(e.target===div) tancar(); };
  pinta();
};
