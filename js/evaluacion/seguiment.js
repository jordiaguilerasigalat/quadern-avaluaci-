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
  /* Treballs: primer un bloc de treballs/exposicions/projectes o d'investigació
     (2n i 3r: «Treball experimental i d'investigació»), després el d'activitats
     avaluables (4t). Mai el de proactivitat, que és el de l'Actitud: abans
     «altres» el feia caure en «Altres activitats avaluables (proactivitat)» i
     els treballs comptaven com a actitud. */
  {k:"treballs",   nom:"Treballs i exposicions",     ico:"🎤", plantilla:"Elaboració i exposició de treballs", tipo:"Treball / projecte / SdA",            bloc:[/exposici|projecte|investigaci/i,/^(?!.*proactiv).*activitats avaluables/i,/laborat|experimental/i]}
];
function segTipus(k){ return SEG_TIPUS.find(t=>t.k===k); }
function segNorm(x){ return String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g," "); }
/* Bloc on compta cada apartat: 1) el que s'ha triat en el desplegable de
   l'apartat (grupo.segBlocs), 2) un bloc amb el mateix nom que l'apartat
   (p. ex. un bloc «Deures»), 3) per paraules clau, 4) el primer que no siga
   d'exàmens. */
/* Blocs on compta cada apartat (un o diversos): 1) els marcats en l'apartat
   (grupo.segBlocs[k], llista d'ids), 2) un bloc amb el mateix nom que
   l'apartat (p. ex. un bloc «Deures»), 3) per paraules clau, 4) el primer que
   no siga d'exàmens. Si n'hi ha diversos, cada activitat compta amb la seua
   nota en tots ells; dins de cada bloc la nota és la mitjana de les activitats. */
const SEG_RE_EXAMEN=/prov[ae]|examen|escrit/i;
function segTriats(grupo,k){
  let t=grupo.segBlocs&&grupo.segBlocs[k]; if(!t) return [];
  if(!Array.isArray(t)) t=[t];
  return t.filter(id=>grupo.bloques.some(b=>b.id===id));
}
function segBlocAuto(grupo,t){
  const paraula=segNorm(t.nom).split(/[\s\/]+/)[0];
  const perNom=grupo.bloques.find(b=>!b.inactiu && segNorm(b.label).split(/[^a-z0-9]+/).includes(paraula))||grupo.bloques.find(b=>segNorm(b.label).split(/[^a-z0-9]+/).includes(paraula)); if(perNom) return perNom;
  for(const re of t.bloc){ const b=grupo.bloques.find(b=>re.test(b.label||"")); if(b) return b; }
  return grupo.bloques.find(b=>!SEG_RE_EXAMEN.test(b.label||""))||grupo.bloques[0];
}
/* Llista buida guardada (grupo.segBlocs[k]=[]): l'apartat s'ha desmarcat de
   tots els blocs i les seues activitats no compten en la nota numèrica. */
function segCap(grupo,k){ const t=grupo.segBlocs&&grupo.segBlocs[k]; return Array.isArray(t) && !t.length; }
function segBlocsIds(grupo,k){
  if(segCap(grupo,k)) return [];
  const tr=segTriats(grupo,k); if(tr.length) return tr;
  const b= k==="examens"? (grupo.bloques.find(b=>SEG_RE_EXAMEN.test(b.label||""))||grupo.bloques[0]) : segBlocAuto(grupo,segTipus(k));
  return b? [b.id] : [];
}
function segBloc(grupo,t){ const id=segBlocsIds(grupo,t.k)[0]; return grupo.bloques.find(b=>b.id===id); }
function segBlocExamens(grupo){ const id=segBlocsIds(grupo,"examens")[0]; return grupo.bloques.find(b=>b.id===id); }
function segActsApartat(g,k){ return g.actividades.filter(a=> k==="examens"? (a.esExamen && !a.seguiment && !a.recupera) : a.seguiment===k); }
function segAplicarBlocs(g,k){
  const ids=segBlocsIds(g,k);
  const acts=segActsApartat(g,k);
  if(!ids.length){ if(!segCap(g,k)) return 0; acts.forEach(a=>{ a.sinBloc=true; delete a.bloquesExtra; }); return acts.length; }
  acts.forEach(a=>{ delete a.sinBloc; a.bloqueId=ids[0]; if(ids.length>1) a.bloquesExtra=ids.slice(1); else delete a.bloquesExtra; });
  return acts.length;
}
/* Caselles «Compta en» de cada apartat: es pot marcar un bloc o diversos. */
function segSelectorBlocHTML(grupo,k){
  const ids=segBlocsIds(grupo,k);
  const tria=grupo.bloques.filter(b=>ids.includes(b.id));
  const total=Math.round(grupo.bloques.reduce((n,b)=>n+pesoBloqueNota(b),0)*100)/100;
  const altres=b=>[["examens","Exàmens"],...SEG_TIPUS.map(t=>[t.k,t.nom])].filter(([kk])=>kk!==k && segBlocsIds(grupo,kk).includes(b.id)).map(x=>x[1]);
  return `<div style="margin:2px 0 6px;padding:6px 8px;border-radius:8px;background:var(--soft,rgba(127,127,127,.08));font-size:12.5px">
      <div style="font-weight:600;margin-bottom:4px">⚖️ Pes en la nota${total!==100?` <span class="sub" style="font-weight:400">(els blocs sumen ${String(total).replace(".",",")} %)</span>`:""}</div>
      ${!tria.length?`<div style="margin:2px 0"><strong>No compta en cap bloc.</strong> <span class="sub" style="margin:0;font-size:11.5px">Les seues activitats no fan nota numèrica. Marca un bloc davall perquè tornen a comptar.</span></div>`:""}
      ${tria.map(b=>{ const comp=altres(b); return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:2px 0">
        <span>${esc(b.label)}</span>
        <input class="in" type="number" min="0" max="100" step="1" style="width:68px;padding:2px 6px" value="${esc(b.peso)}" aria-label="Pes del bloc ${esc(b.label)} (%)" onchange="segPesBloc('${escJS(b.id)}',this.value)"> %${b.inactiu?` <span class="sub" style="margin:0;font-size:11.5px"><strong>desactivat</strong>: ara no compta (Ajustos)</span>`:""}
        ${comp.length?`<span class="sub" style="margin:0;font-size:11.5px">🔗 el mateix ${esc(String(b.peso))} % que ${esc(comp.join(", "))} (compta una sola vegada)</span>`:""}
      </div>`; }).join("")}
    </div>
    <details class="gcard-meta"><summary style="cursor:pointer">Canviar en quin bloc compta</summary>
    <div style="display:flex;align-items:center;gap:4px 10px;flex-wrap:wrap;margin-top:4px" role="group" aria-label="Blocs on compta l'apartat">
    ${grupo.bloques.map(x=>`<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer"><input type="checkbox" ${ids.includes(x.id)?"checked":""} onchange="segTriarBloc('${k}','${escJS(x.id)}',this.checked)"> ${esc(x.label)} (${x.inactiu?"desactivat":esc(x.peso)+" %"})</label>`).join("")}
    ${ids.length>1?`<span class="sub" style="font-size:11.5px;margin:0">La nota de cada activitat compta en els ${ids.length} blocs.</span>`:""}</div>
    ${tria.some(b=>altres(b).length)?`<div style="margin-top:8px"><button class="ghost small" style="border:1px solid var(--line)" onclick="segSepararBloc('${k}')">✂️ Separar: bloc propi per a «${esc(segNomApartat(k))}»</button>
      <span class="sub" style="display:block;margin:2px 0 0;font-size:11.5px">El pes nou es lleva del bloc compartit. Amb 0 % no compta.</span></div>`:""}
    </details>`;
}
window.segPesBloc=(id,v)=>{
  const g=grupoActual(); const b=g&&g.bloques.find(x=>x.id===id); if(!b) return;
  b.peso=Math.max(0,Number(String(v).replace(",","."))||0); save(); render();
  const t=Math.round(g.bloques.reduce((n,x)=>n+pesoBloqueNota(x),0)*100)/100;
  mostrarToast(t===100? `✓ «${b.label}» pesa ${b.peso} %. Els blocs sumen 100 %.` : `⚠️ «${b.label}» pesa ${b.peso} %. Ara els blocs sumen ${String(t).replace(".",",")} %: ajusta'n algun perquè sumen 100.`);
};
window.segTriarBloc=(k,id,on)=>{
  const g=grupoActual(); if(!g || !g.bloques.find(b=>b.id===id)) return;
  let ids=segBlocsIds(g,k).slice();
  if(on){ if(!ids.includes(id)) ids.push(id); }
  else {
    ids=ids.filter(x=>x!==id);
  }
  (g.segBlocs=g.segBlocs||{})[k]=ids;
  const n=segAplicarBlocs(g,k);
  save(); render();
  mostrarToast((ids.length?`✓ L'apartat compta en: ${ids.map(x=>g.bloques.find(b=>b.id===x).label).join(" + ")}`:`L'apartat ja no compta en cap bloc: les seues activitats no fan nota numèrica`)+(n?` (${n} activitat${n===1?"":"s"} actualitzada${n===1?"":"s"})`:""));
};
function segNomApartat(k){ return k==="examens"? "Exàmens" : (segTipus(k)||{}).nom||k; }
/* Separar un apartat d'un bloc compartit (p. ex. Treballs i Laboratori en
   «Treball experimental i d'investigació»): crea un bloc propi amb el nom de
   l'apartat, li passa les seues activitats i lleva el pes nou del bloc
   compartit perquè la suma no canvie. */
window.segSepararBloc=async k=>{
  const g=grupoActual(); if(!g) return;
  const ids=segBlocsIds(g,k);
  const comp=g.bloques.find(b=>ids.includes(b.id) && [["examens"],...SEG_TIPUS.map(t=>[t.k])].some(([kk])=>kk!==k && segBlocsIds(g,kk).includes(b.id)));
  const nom=segNomApartat(k);
  const max=comp? Number(comp.peso)||0 : 100;
  const v=await pedirTexto(`Quin pes vols per a «${nom}» (%)?`+(comp?`\nEs lleva del bloc compartit «${comp.label}» (${comp.peso} %), així la suma no canvia. Posa 0 si no ha de comptar.`:""), String(Math.min(5,max)));
  if(v==null) return;
  let pes=Math.max(0,Number(String(v).replace(",","."))||0);
  if(comp && pes>max){ pes=max; }
  const altresK=["examens",...SEG_TIPUS.map(t=>t.k)].filter(kk=>kk!==k);
  const abans=Object.fromEntries(altresK.map(kk=>[kk,segBlocsIds(g,kk)]));
  const nou={id:"b"+uid(),label:nom.slice(0,60),peso:pes};
  const pos=comp? g.bloques.indexOf(comp)+1 : g.bloques.length;
  g.bloques.splice(pos,0,nou);
  if(comp) comp.peso=Math.round((max-pes)*100)/100;
  (g.segBlocs=g.segBlocs||{})[k]=[nou.id];
  /* Els altres apartats que compartien el bloc el conserven explícitament
     si la cerca automàtica els portaria al bloc nou. */
  altresK.forEach(kk=>{ if(segBlocsIds(g,kk).join()!==abans[kk].join()) g.segBlocs[kk]=abans[kk]; });
  const n=segAplicarBlocs(g,k);
  save(); render();
  mostrarToast(`✓ «${nom}» té ara el seu bloc (${pes} %)`+(comp?` i «${comp.label}» passa a ${comp.peso} %`:"")+(n?`. ${n} activitat${n===1?"":"s"} actualitzada${n===1?"":"s"}.`:"."));
};
/* Quan es crea, reanomena o elimina un bloc, els apartats sense blocs triats
   tornen a buscar el seu bloc (p. ex. un bloc nou «Deures» arreplega l'apartat Deures). */
function segSincronitzarBlocs(g){
  if(!g) return;
  SEG_TIPUS.forEach(t=>{ if(!segTriats(g,t.k).length && !segCap(g,t.k)) segAplicarBlocs(g,t.k); });
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
  const b=segBlocExamens(grupo);
  const files=exs.map(a=>{
    const n=grupo.alumnos.filter(al=>segCorregit(grupo,al.id,a)).length;
    const notes=grupo.alumnos.map(al=>grupo.notasCuant?.[al.id]?.[a.id]).filter(v=>v!=null);
    const mitj=notes.length? fmt(notes.reduce((s,v)=>s+v,0)/notes.length) : "—";
    return `<div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line)">
      <span style="font-size:13.5px"><strong>${esc(a.nombre)}</strong>${a.rubrica?` <span class="badge">rúbrica</span>`:""}<br><span class="sub" style="margin:0">${n} de ${grupo.alumnos.length} avaluats · mitjana ${mitj}</span></span>
      ${segDataInputHTML(a)}
      ${a.rubrica?`<button class="btn small" onclick="segObrir('${a.id}')">Corregir →</button>`:`<button class="btn small" onclick="segQualificar('${a.id}')">Posar notes →</button>`}
      <button class="ghost small" title="Eliminar l'activitat" aria-label="Eliminar ${esc(a.nombre)}" onclick="delActividad('${a.id}')">🗑</button>
    </div>`;}).join("");
  return `<div class="gcard">
    <div class="gcard-title">📄 Exàmens i proves escrites</div>
    ${segSelectorBlocHTML(grupo,"examens")}
    ${files||`<p class="sub" style="margin:6px 0">Encara no hi ha cap examen en este període.</p>`}
    <div class="flex" style="gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="ghost" style="border:1px solid var(--line)" onclick="segNouExamen()">+ Nou examen amb rúbrica</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="segNouExamenSimple()">+ Nota directa</button>
    </div>
  </div>`;
}
/* Data de l'activitat: es guarda com a esdeveniment del calendari. */
function segDataInputHTML(a){
  if(typeof agDataActivitat!=="function") return "";
  return `<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--mut);margin-left:auto" title="La data apareix al calendari">📅<input class="in" type="date" style="padding:4px 6px;font-size:12.5px;width:auto" value="${esc(agDataActivitat(a.id))}" aria-label="Data de ${esc(a.nombre)}" onchange="segFixarData('${escJS(a.id)}',this.value)"></label>`;
}
window.segFixarData=(actId,f)=>{
  const g=grupoActual(); const a=g&&g.actividades.find(x=>x.id===actId); if(!a) return;
  agFixarDataActivitat(g,a,f); save();
  mostrarToast(f?"📅 Afegit al calendari":"Data llevada del calendari");
};
window.segQualificar=actId=>{ state.ui.calAct=actId; state.ui.tab="calificar"; save(); render(); };
window.segNouExamen=()=>{ state.ui.appMode="corrector"; state.ui.corTab="crear"; state.ui.corExamId=""; state.ui.corAlId=""; save(); render(); };
window.segNouExamenSimple=()=>{
  const b=segBlocExamens(grupoActual());
  state.ui.form={editId:null,nombre:"",tipo:TIPO_EXAMEN,esExamen:true,bloqueId:b?b.id:"",pesoBloque:"",links:[],sda:""};
  state.ui.formLliure=true; save(); render();
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
    ${typeof temesDeGrup==="function"&&temesDeGrup(grupo).length?`<label style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px;font-weight:600;margin:4px 0 8px">📚 Tema de les activitats noves: ${temaSelectHTML(grupo,state.ui.segTema??((temaActualGrup(grupo)||{}).id||""),'id="segTema" style="max-width:340px" onchange="state.ui.segTema=this.value;save()"')}</label>`:""}
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
        ${segDataInputHTML(a)}
        <button class="btn small" onclick="segObrir('${a.id}')">Avaluar →</button>
        <button class="ghost small" title="Eliminar l'activitat" aria-label="Eliminar ${esc(a.nombre)}" onclick="delActividad('${a.id}')">🗑</button>
      </div>`;}).join("");
    return `<div class="gcard">
      <div class="gcard-title">${t.ico} ${esc(t.nom)}</div>
      ${segSelectorBlocHTML(grupo,t.k)}
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
  const ids=segBlocsIds(grupo,k);
  const temaId=(document.getElementById("segTema")||{}).value ?? (state.ui.segTema||"");
  const act={ id:uid(), trimestre:state.ui.trim, nombre:nom, tipo:t.tipo, bloqueId:ids[0]||(segBlocAuto(grupo,t)||{}).id||"", esExamen:true, pesoBloque:"",
    criterios:[], sda:"", rubrica:rub, escalarA10:true, criteriosPrevistos:crits, seguiment:k, temaId:temaId||"" };
  if(ids.length>1) act.bloquesExtra=ids.slice(1);
  if(!ids.length) act.sinBloc=true;
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
    return `<button class="gpill ${a.id===al.id?"on":""}" style="font-size:12.5px;padding:4px 10px" onclick="segIrAlumne('${a.id}')" aria-label="${esc(a.nombre)}${v!=null?": "+fmt(v):""}">${avatarAlumneHTML(a,{mida:20})}${esc(a.nombre)} <span style="font-weight:700;margin-left:4px">${txt}</span></button>`;
  }).join("");
  c.insertAdjacentHTML("afterbegin",`<div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <strong style="font-size:15px">${t?t.ico+" "+esc(t.nom)+" · ":""}${esc(act.nombre)}</strong>
      <button class="ghost" style="border:1px solid var(--line)" onclick="segTornar()">← Activitats</button>
    </div>
    <p class="sub" style="margin:6px 0">Tria l'alumne/a (al costat, la seua nota en esta activitat):</p>
    <div class="flex seg-chips" style="gap:6px;flex-wrap:wrap">${chips}</div>
  </div>`);
  if(typeof aaTargetaHTML==="function"){ const h=aaTargetaHTML(grupo,act,al); if(h) c.firstElementChild.insertAdjacentHTML("afterend",h); }
  if(typeof acRubricaCardHTML==="function"){ const h=acRubricaCardHTML(grupo,act,al); if(h) c.firstElementChild.insertAdjacentHTML("afterend",h); }
  { const ch=c.querySelector(".seg-chips .gpill.on"); if(ch&&ch.parentElement.scrollWidth>ch.parentElement.clientWidth) ch.parentElement.scrollLeft=Math.max(0,ch.offsetLeft-ch.parentElement.clientWidth/2+ch.offsetWidth/2); }
  /* Mòbil: lliscar el dit canvia d'alumne/a (esquerra = següent). */
  if(typeof lliscarAlumnes==="function") lliscarAlumnes(c,d=>{ const i=grupo.alumnos.findIndex(a=>a.id===state.ui.segAl); const x=grupo.alumnos[i+d]; if(x) segIrAlumne(x.id); });
}
