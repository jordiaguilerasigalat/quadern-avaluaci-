/* ============================================================================
   Quadern d'avaluació · Pestanya «Seguiment» del grup
   js/evaluacion/seguiment.js

   Un apartat per a cada rúbrica del departament (Deures, Laboratori, Actitud,
   Dossier, Treballs). En cada apartat es creen les activitats del període amb
   la seua rúbrica (plantilla de js/datos/rubriques-fiq.js) i s'avaluen alumne
   per alumne punxant el nivell (AE/AN/AS/NA) de cada apartat. Reutilitza el
   motor de rúbriques del Corrector: les notes van a Qualificar/Resultats igual
   que qualsevol altra activitat.
   ============================================================================ */
const SEG_TIPUS=[
  {k:"deures",     nom:"Deures",                     ico:"📝", plantilla:"Deures",                             tipo:"Deures (activitat per a casa)",       bloc:[/quadern|llibreta|activitats avaluables/i,/proactiv|altres/i]},
  {k:"laboratori", nom:"Laboratori",                 ico:"⚗️", plantilla:"Laboratori",                         tipo:"Pràctica de laboratori / informe",    bloc:[/laborat|experimental/i]},
  {k:"actitud",    nom:"Actitud",                    ico:"🙋", plantilla:"Actitud",                            tipo:"Proactivitat i hàbits de treball",    bloc:[/proactiv|altres/i,/activitats avaluables/i]},
  {k:"dossier",    nom:"Dossier / llibreta",         ico:"📒", plantilla:"Dossier de feina / llibreta",        tipo:"Quadern / llibreta",                  bloc:[/quadern|llibreta|activitats avaluables/i]},
  {k:"treballs",   nom:"Treballs i exposicions",     ico:"🎤", plantilla:"Elaboració i exposició de treballs", tipo:"Treball / projecte / SdA",            bloc:[/altres|activitats avaluables/i,/laborat|experimental/i]}
];
function segTipus(k){ return SEG_TIPUS.find(t=>t.k===k); }
function segBloc(grupo,t){
  for(const re of t.bloc){ const b=grupo.bloques.find(b=>re.test(b.label||"")); if(b) return b; }
  const noExamen=grupo.bloques.find(b=>!/prova|examen/i.test(b.label||""));
  return noExamen||grupo.bloques[0];
}
function segPlantilla(t){
  const pl=(state.plantillasRubrica||[]).find(p=>String(p.nombre||"").trim().toLowerCase()===t.plantilla.toLowerCase());
  if(pl) return pl.rubrica;
  const def=RUBRIQUES_FIQ.find(r=>r.nom===t.plantilla);
  return def? rubricaFiqAPlantilla(def) : null;
}
function segCorregit(grupo,alId,act){ return grupo.notasCuant?.[alId]?.[act.id]!=null || !!marcaDe(grupo,alId,act.id); }
function segActivitats(grupo,k){ return grupo.actividades.filter(a=>a.seguiment===k && a.trimestre===state.ui.trim); }

/* Pestanya Activitats: si s'està avaluant una activitat, la rúbrica alumne per
   alumne; si no, els apartats (Exàmens + rúbriques) i, davall, la llista completa
   d'activitats original. Torna true si ha pintat la vista d'avaluació. */
function renderSeguimentDinsActivitats(grupo){
  const act=state.ui.segAct? grupo.actividades.find(a=>a.id===state.ui.segAct) : null;
  if(act && act.rubrica && grupo.alumnos.length){
    const al=grupo.alumnos.find(a=>a.id===state.ui.segAl)||grupo.alumnos[0];
    renderSeguimentAlumne(grupo,act,al); return true;
  }
  state.ui.segAct="";
  return false;
}
function segExamensHTML(grupo){
  const exs=grupo.actividades.filter(a=>a.esExamen && !a.seguiment && !a.recupera && a.trimestre===state.ui.trim);
  const b=grupo.bloques.find(b=>/prova|examen/i.test(b.label||""))||grupo.bloques[0];
  const files=exs.map(a=>{
    const n=grupo.alumnos.filter(al=>segCorregit(grupo,al.id,a)).length;
    const notes=grupo.alumnos.map(al=>grupo.notasCuant?.[al.id]?.[a.id]).filter(v=>v!=null);
    const mitj=notes.length? fmt(notes.reduce((s,v)=>s+v,0)/notes.length) : "—";
    return `<div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line)">
      <span style="font-size:13.5px"><strong>${esc(a.nombre)}</strong>${a.rubrica?` <span class="badge">rúbrica</span>`:""}<br><span class="sub" style="margin:0">${n} de ${grupo.alumnos.length} avaluats · mitjana ${mitj}</span></span>
      ${a.rubrica?`<button class="btn small" onclick="segObrir('${a.id}')">Corregir →</button>`:`<button class="btn small" onclick="segQualificar('${a.id}')">Posar notes →</button>`}
    </div>`;}).join("");
  return `<div class="gcard">
    <div class="gcard-title">📄 Exàmens i proves escrites</div>
    <div class="gcard-meta">Bloc: ${esc(b?b.label:"—")}</div>
    ${files||`<p class="sub" style="margin:6px 0">Encara no hi ha cap examen en este període.</p>`}
    <div class="flex" style="gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="ghost" style="border:1px solid var(--line)" onclick="segNouExamen()">+ Nou examen amb rúbrica</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="segNouExamenSimple()">+ Nota directa</button>
    </div>
  </div>`;
}
window.segQualificar=actId=>{ state.ui.calAct=actId; state.ui.tab="calificar"; save(); render(); };
window.segNouExamen=()=>{ state.ui.appMode="corrector"; state.ui.corTab="crear"; state.ui.corExamId=""; state.ui.corAlId=""; save(); render(); };
window.segNouExamenSimple=()=>{
  const b=(grupoActual().bloques||[]).find(b=>/prova|examen/i.test(b.label||""));
  state.ui.form={editId:null,nombre:"",tipo:TIPO_EXAMEN,esExamen:true,bloqueId:b?b.id:"",pesoBloque:"",links:[],sda:""};
  save(); render();
  const el=document.getElementById("fN"); if(el){ el.scrollIntoView({block:"center"}); el.focus(); }
};
function segApartatsHTML(grupo){
  const idx=catIndex(grupo.catalogoKey);
  const critsHTML=idx.cat.ces.map(ce=>`<div style="margin:6px 0 2px;font-weight:600;font-size:12.5px">${esc(ce.id)} · ${esc(ce.titulo||"")}</div>`+
    ce.criterios.map(cr=>`<label style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin:2px 0"><input type="checkbox" class="segCrit" value="${esc(cr.id)}"> <span><strong>${esc(cr.id)}</strong> ${esc(cr.texto||"")}</span></label>`).join("")).join("");
  const modeCE=typeof modoNotaGrupo==="function" && modoNotaGrupo(grupo)==="ce";
  return `
  <div class="card">
    <h2>Activitats · ${esc(TRIMESTRES[state.ui.trim])}</h2>
    <p class="sub" style="margin:0">Exàmens, deures, laboratori, actitud, dossier i treballs. Crea l'activitat en el seu apartat i avalua alumne per alumne: en les rúbriques punxes el nivell (AE, AN, AS, NA) de cada fila i la nota es calcula sola i compta en el seu bloc${modeCE?" i, si l'has vinculada a criteris, en les competències":""}.</p>
    ${modeCE?`<div class="alert-box" style="margin-top:8px">Este grup qualifica per competències específiques: marca a quins criteris correspon cada activitat en crear-la, o no comptarà per a la nota.</div>`:""}
  </div>
  <div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
  ${segExamensHTML(grupo)}
  ${SEG_TIPUS.map(t=>{
    const acts=segActivitats(grupo,t.k), b=segBloc(grupo,t);
    const files=acts.map(a=>{
      const n=grupo.alumnos.filter(al=>segCorregit(grupo,al.id,a)).length;
      const notes=grupo.alumnos.map(al=>grupo.notasCuant?.[al.id]?.[a.id]).filter(v=>v!=null);
      const mitj=notes.length? fmt(notes.reduce((s,v)=>s+v,0)/notes.length) : "—";
      return `<div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line)">
        <span style="font-size:13.5px"><strong>${esc(a.nombre)}</strong><br><span class="sub" style="margin:0">${n} de ${grupo.alumnos.length} avaluats · mitjana ${mitj}</span></span>
        <button class="btn small" onclick="segObrir('${a.id}')">Avaluar →</button>
      </div>`;}).join("");
    return `<div class="gcard">
      <div class="gcard-title">${t.ico} ${esc(t.nom)}</div>
      <div class="gcard-meta">Bloc: ${esc(b?b.label:"—")}</div>
      ${files||`<p class="sub" style="margin:6px 0">Encara no hi ha cap activitat en este període.</p>`}
      <div class="flex" style="gap:6px;margin-top:8px">
        <input class="in" id="segNom_${t.k}" style="flex:1;min-width:0" placeholder="${t.k==="laboratori"?"Ex. Pràctica 1: densitat":t.k==="treballs"?"Ex. Exposició: energies renovables":t.k==="actitud"?"Ex. Actitud 1a avaluació":"Ex. "+esc(t.nom)+" unitat 1"}" aria-label="Nom de la nova activitat de ${esc(t.nom)}" onkeydown="if(event.key==='Enter') segCrear('${t.k}')">
        <button class="ghost" style="border:1px solid var(--line)" onclick="segCrear('${t.k}')">+ Nova</button>
      </div>
    </div>`;
  }).join("")}
  </div>
  <div class="card">
    <details ${modeCE?"open":""}>
      <summary style="cursor:pointer;font-weight:600;font-size:13.5px">Criteris d'avaluació per a la pròxima activitat que crees (opcional${modeCE?", però necessari en este grup":""})</summary>
      <p class="sub">Els criteris marcats s'enllacen a tots els apartats de la rúbrica de l'activitat nova. Després es poden canviar en el Corrector.</p>
      <div style="max-height:320px;overflow:auto">${critsHTML}</div>
    </details>
  </div>
  <div class="section-eyebrow" style="margin-top:18px">Totes les activitats del període (crear, editar, recuperacions)</div>`;
}
window.segCrear=k=>{
  const grupo=grupoActual(); const t=segTipus(k); if(!grupo||!t) return;
  const inp=document.getElementById("segNom_"+k);
  const nom=(inp&&inp.value||"").trim();
  if(!nom){ mostrarAviso("Escriu un nom per a l'activitat (per exemple, «Pràctica 1»)."); return; }
  const base=segPlantilla(t); if(!base){ mostrarAviso("No s'ha trobat la plantilla de rúbrica «"+t.plantilla+"»."); return; }
  const rub=cxClonarRubrica(base,grupo.catalogoKey);
  const crits=[...document.querySelectorAll(".segCrit:checked")].map(x=>x.value).filter(c=>cxCriteriosValidosEnCatalogo(grupo.catalogoKey).has(c));
  if(crits.length) cxItemsFlat(rub).forEach(it=>{ it.links=crits.map(c=>({critId:c,peso:100})); });
  const b=segBloc(grupo,t);
  const act={ id:uid(), trimestre:state.ui.trim, nombre:nom, tipo:t.tipo, bloqueId:b?b.id:"", esExamen:true, pesoBloque:"",
    criterios:[], sda:"", rubrica:rub, escalarA10:true, criteriosPrevistos:crits, seguiment:k };
  cxSyncCriteriosActividad(act);
  grupo.actividades.push(act);
  state.ui.segAct=act.id; state.ui.segAl=(grupo.alumnos[0]||{}).id||"";
  save(); render();
  mostrarToast("✓ «"+nom+"» creada amb la rúbrica de "+t.nom);
};
window.segObrir=actId=>{
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  const pendent=grupo.alumnos.find(al=>!segCorregit(grupo,al.id,act));
  state.ui.segAct=actId; state.ui.segAl=(pendent||grupo.alumnos[0]||{}).id||""; save(); render();
};
window.segIrAlumne=alId=>{ state.ui.segAl=alId; save(); render(); };
window.segTornar=()=>{ state.ui.segAct=""; state.ui.segAl=""; state.ui.tab="actividades"; save(); render(); };
function renderSeguimentAlumne(grupo,act,al){
  const c=document.getElementById("tabContent");
  if(!grupo.alumnos.length){ c.innerHTML=`<div class="card"><p class="sub">Este grup encara no té alumnat.</p><button class="ghost" onclick="segTornar()">← Activitats</button></div>`; return; }
  renderCxGradingAlumno(grupo,act,al);
  // Els botons del Corrector (Llista, Anterior, Següent) es redirigixen a esta pestanya.
  c.querySelectorAll("[onclick]").forEach(el=>{
    const oc=el.getAttribute("onclick");
    if(oc.includes("cxIrAlumno(")) el.setAttribute("onclick",oc.replace("cxIrAlumno(","segIrAlumne("));
    else if(oc.includes("cxVolverLista()")) el.setAttribute("onclick",oc.replace("cxVolverLista()","segTornar()"));
  });
  const t=segTipus(act.seguiment);
  const chips=grupo.alumnos.map(a=>{
    const v=grupo.notasCuant?.[a.id]?.[act.id], m=marcaDe(grupo,a.id,act.id);
    const txt=m? m : (v!=null? fmt(v) : "·");
    return `<button class="gpill ${a.id===al.id?"on":""}" style="font-size:12.5px;padding:4px 10px" onclick="segIrAlumne('${a.id}')" aria-label="${esc(a.nombre)}${v!=null?": "+fmt(v):""}">${esc(a.nombre)} <span style="font-weight:700;margin-left:4px">${txt}</span></button>`;
  }).join("");
  c.insertAdjacentHTML("afterbegin",`<div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <strong style="font-size:15px">${t?t.ico+" "+esc(t.nom)+" · ":""}${esc(act.nombre)}</strong>
      <button class="ghost" style="border:1px solid var(--line)" onclick="segTornar()">← Activitats</button>
    </div>
    <p class="sub" style="margin:6px 0">Tria l'alumne/a (al costat, la seua nota en esta activitat):</p>
    <div class="flex" style="gap:6px;flex-wrap:wrap">${chips}</div>
  </div>`);
}
