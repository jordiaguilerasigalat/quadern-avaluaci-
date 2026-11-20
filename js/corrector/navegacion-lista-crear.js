/* ============================================================================
   Cuaderno del profesor · Navegación del Corrector, lista de exámenes y crear examen
   js/corrector/navegacion-lista-crear.js
   ============================================================================ */

/* ---------- Navegación del Corrector ---------- */
window.cxTab=k=>{ if(k!=="editor") cxAvisarAlSalirDelEditor(); state.ui.corTab=k; if(k==="lista"){ state.ui.corExamId=""; state.ui.corAlId=""; } save(); render(); };
function cxAvisarAlSalirDelEditor(){
  if(state.ui.corTab!=="editor") return;
  const grupo=grupoActual(); const act=grupo&&grupo.actividades.find(a=>a.id===state.ui.corExamId); if(!act||!act.rubrica) return;
  const av=cxAvisosCriterios(grupo,act); if(!av.length) return;
  const ids=[...new Set(av.flatMap(a=>a.faltan))];
  setTimeout(()=>mostrarToast(`⚠️ «${act.nombre}»: ${ids.length===1?"el criteri "+ids[0]+" ha":"els criteris "+ids.join(", ")+" han"} quedat sense vincular en la rúbrica`,"info"),50);
}
window.cxIrLista=()=>{ cxAvisarAlSalirDelEditor(); state.ui.corTab="lista"; state.ui.corExamId=""; state.ui.corAlId=""; save(); render(); };
window.cxIrCrear=()=>{ state.ui.corTab="crear"; save(); render(); };
window.cxIrEditor=examId=>{ if(state.ui.corExamId!==examId) state.ui.corVarId=""; state.ui.corTab="editor"; state.ui.corExamId=examId; save(); render(); };
window.cxIrCorregir=examId=>{ cxAvisarAlSalirDelEditor(); state.ui.corTab="corregir"; state.ui.corExamId=examId; state.ui.corAlId=""; save(); render(); };
window.cxIrAlumno=alId=>{ state.ui.corAlId=alId; save(); render(); };
window.cxVolverLista=()=>{ state.ui.corAlId=""; save(); render(); };

function renderCorMain(){
  const grupo=grupoActual();
  const app=document.getElementById("app");
  if(!grupo){ renderCorSinGrupo(); return; }
  app.innerHTML = `<div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div>
        <strong style="font-size:15px">🖊️ Corrector de Exámenes</strong>
        <span style="color:var(--mut);font-size:13px"> · ${esc(grupo.nombre)}</span>
      </div>
      <div class="flex">
        ${[["lista","Exámenes"],["crear","Nuevo examen"]].map(([k,l])=>`<button class="tab ${state.ui.corTab===k?"on":""}" onclick="cxTab('${k}')">${l}</button>`).join("")}
      </div>
    </div>
  </div><div id="tabContent"></div>`;
  const t=state.ui.corTab;
  if(t==="crear") renderCorCrear(grupo);
  else if(t==="diseno") renderCorDiseno(grupo);
  else if(t==="editor"){ renderCorEditor(grupo); cxPonerSubtabs(grupo); }
  else if(t==="corregir"){ renderCorCorregir(grupo); if(!state.ui.corAlId) cxPonerSubtabs(grupo); }
  else renderCorLista(grupo);
}
function renderCorSinGrupo(){
  const app=document.getElementById("app");
  const hay=state.grupos.length>0;
  app.innerHTML=`<div class="hero">
    <div class="hero-eyebrow">Corrector de Exámenes</div>
    <h1 class="hero-title">Elige un grupo</h1>
    <p class="hero-tag">${hay?"Selecciona un grup dalt per a gestionar-ne els exàmens.":"Encara no tens cap grup creat. Crea'l des de l'Avaluació per competències: el Corrector usa el mateix alumnat, sense donar-lo d'alta dues vegades."}</p>
    ${!hay?`<button class="btn" onclick="irModo('competencial')">Anar a l'Avaluació per competències</button>`:""}
  </div>`;
}

/* ---------- Lista de exámenes ---------- */
/* Vínculo de un examen con una actividad de la Programación de Aula del grupo (act.progActId).
   Permite vincular a posteriori un examen creado a mano, o desvincularlo. */
function cxVinculoProgHTML(grupo,act){
  if(act.recupera) return "";
  const ref=cxProgActDe(grupo,act);
  const estilo="font-size:12.5px;color:var(--mut);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap";
  if(ref) return `<div style="${estilo}">📘 Vinculat a la Programació «${esc(ref.prog.nombre)}» · ${esc(ref.progAct.nombre||"activitat sense nom")}
    <button class="ghost small" style="border:1px solid var(--line)" onclick="cxDesvincularDeProgramacion('${act.id}')">Desvincular</button></div>`;
  return `<div style="${estilo}"><button class="ghost small" style="border:1px solid var(--line)" title="Asocia este examen a una actividad de la Programación de Aula del grupo, sin crear otro examen" onclick="cxVincularAProgramacion('${act.id}')">🔗 Vincular a una actividad de la Programación…</button></div>`;
}
window.cxVincularAProgramacion=async actId=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  const prog=progDeGrupo(grupo);
  if(!prog){ mostrarAviso("Aquest grup no té cap Programació d'aula vinculada.\n\nVincula-la en Ajustos del grup (targeta «Programació d'aula vinculada») i torna a prémer ací."); return; }
  // Solo exámenes con nombre y que no estén ya asociados a otro examen del grupo.
  const ocupadas=new Set(grupo.actividades.filter(a=>a.id!==act.id && !a.recupera && a.progActId).map(a=>a.progActId));
  const libres=(prog.actividades||[]).filter(pa=>pa.esExamen && (pa.nombre||"").trim() && !ocupadas.has(pa.id));
  if(!libres.length){ mostrarAviso(`La Programació «${prog.nombre}» no té cap activitat de tipus examen lliure per a vincular.\n\nCrea l'examen en la Programació d'aula (marcat com a examen) i torna a prémer ací.`); return; }
  const id=await elegirOpcion("🔗 Vincular a la Programación",`A quina activitat de «${prog.nombre}» correspon «${act.nombre}»?\n\nL'examen no es duplica: conserva la seua rúbrica i les seues notes.`,
    libres.map(pa=>({value:pa.id,label:pa.nombre})));
  if(!id) return;
  const pa=libres.find(x=>x.id===id); if(!pa) return;
  act.progActId=pa.id;
  save(); render();
  mostrarToast(`✓ «${act.nombre}» vinculado a «${pa.nombre}» de la Programación`);
};
window.cxDesvincularDeProgramacion=async actId=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===actId); if(!act) return;
  if(!await confirmar(`¿Desvincular «${act.nombre}» de la Programación? El examen, su rúbrica y sus notas se quedan como están; solo se rompe la asociación con la actividad planificada.`,{ok:"Desvincular"})) return;
  delete act.progActId; save(); render();
};
/* Cambia el nombre de un examen desde la lista (el mismo cambio que el campo «Nombre» del editor de la rúbrica):
   si estaba vinculado a un evento del calendario, también se actualiza su título. Un nombre vacío no se admite. */
window.cxRenombrarExamen=(id,valor)=>{
  const grupo=grupoActual(), act=grupo&&grupo.actividades.find(a=>a.id===id); if(!act) return;
  const nombre=String(valor||"").trim();
  if(!nombre){ render(); return; }
  act.nombre=nombre;
  const evVinc=(state.eventos||[]).find(ev=>ev.examId===act.id); if(evVinc) evVinc.titulo=act.nombre;
  save(); render();
};
function renderCorLista(grupo){
  const c=document.getElementById("tabContent");
  const exams=cxExamenesRubrica(grupo);
  c.innerHTML=`
  <div class="card">
    <div class="flex" style="justify-content:space-between">
      <div><h2>Exàmens de la ${TRIMESTRES[state.ui.trim]}</h2><p class="sub" style="margin:0">També apareixen en la pestanya «Activitats» de l'Avaluació per competències.</p></div>
      <button class="btn" onclick="cxIrCrear()">+ Nou examen</button>
    </div>
  </div>
  ${exams.length? exams.map(act=>{
    const notas=grupo.alumnos.filter(al=>!marcaDe(grupo,al.id,act.id)).map(al=>grupo.notasCuant?.[al.id]?.[act.id]).filter(v=>v!=null);
    const media=notas.length? notas.reduce((a,b)=>a+b,0)/notas.length : null;
    const b=grupo.bloques.find(x=>x.id===act.bloqueId);
    return `<div class="card" style="padding:14px 16px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <div style="flex:1 1 100%;min-width:0">
          <div class="flex" style="align-items:center;gap:6px;flex-wrap:nowrap">
            <input class="in" value="${esc(act.nombre)}" aria-label="Nom de l'examen (es pot canviar)" title="Polsa per a canviar el nom de l'examen" style="font-size:15px;font-weight:600;flex:1;min-width:0;width:100%" onchange="cxRenombrarExamen('${act.id}',this.value)">
            ${act.sda?`<span class="badge" style="vertical-align:middle">${esc(act.sda)}</span>`:''}
          </div>
          <div style="font-size:12.5px;color:var(--mut);margin-top:2px">${b?esc(b.label):""} · ${notas.length}/${grupo.alumnos.length} corregit${notas.length===1?"":"s"}${media!=null?` · mitjana ${fmt(media)}`:""}</div>
          ${cxAvisoCriteriosBadgeHTML(grupo,act)}
          ${cxVinculoProgHTML(grupo,act)}
        </div>
        <div class="flex">
          <button class="btn small" onclick="cxIrCorregir('${act.id}')">Corregir</button>
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrDiseno('${act.id}')">✏️ Disseny</button>
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxIrEditor('${act.id}')">Rúbrica</button>
          ${notas.length?`<button class="ghost" style="border:1px solid var(--line)" title="Imprimir juntes i ordenades per alumne/a totes les rúbriques ja corregides d'este examen" onclick="cxImprimirRubricasTodos('${act.id}')">🖨️ Imprimir</button>
          <button class="ghost" style="border:1px solid var(--line)" title="Rúbriques resumides de tot l'alumnat corregit: només puntuacions i anotacions, per a gastar menys paper" onclick="cxImprimirRubricasTodos('${act.id}',true)">📄 Resumides</button>`:""}
          <button class="ghost" style="border:1px solid var(--line)" onclick="cxExportarCSV('${act.id}')">CSV</button>
          <button class="ghost danger" onclick="delActividad('${act.id}')">Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join("") : '<div class="card"><p class="sub" style="margin:0">Todavía no hay ningún examen con rúbrica en este periodo.</p></div>'}
  ${cxPendientesHTML(grupo)}`;
}
/* Exámenes que aún no se corrigen con rúbrica: los del grupo sin rúbrica y los
   de la Programación vinculada que todavía no se han traído a este grupo. */
function cxPendientesHTML(grupo){
  const sinRub=grupo.actividades.filter(a=>a.esExamen && !a.rubrica && a.trimestre===state.ui.trim);
  const prog=progDeGrupo(grupo);
  const deProg=prog? (prog.actividades||[]).filter(pa=>pa.esExamen && (pa.nombre||"").trim() && !progActividadesEnGrupo(grupo,pa).length) : [];
  if(!sinRub.length && !deProg.length) return "";
  const trimDe=pa=>{ const t=(pa.sdaIds||[]).map(sid=>(prog.sdas.find(s=>s.id===sid)||{}).trimestre).filter(x=>typeof x==="number"&&TRIMESTRES[x]); return t.length?Math.min(...t):null; };
  return `<div class="card">
    <h2 style="font-size:15px">Exámenes sin rúbrica</h2>
    <p class="sub" style="margin:0 0 8px">Al añadirles rúbrica se crea una inicial con un ítem por cada criterio marcado (o la que tengas guardada en la Programación), lista para ajustar.</p>
    <div class="grid" style="gap:8px">
      ${sinRub.map(a=>`<div class="row" style="justify-content:space-between;border:1px solid var(--line);border-radius:8px;padding:8px 12px">
        <span style="font-size:14px">${esc(a.nombre)} <span style="font-size:12.5px;color:var(--mut)">· en Avaluació${cxActTieneNotas(grupo,a)?" · ja té notes":""}</span></span>
        <button class="btn small" onclick="cxAnadirRubrica('${a.id}')">🖊️ Añadir rúbrica</button>
      </div>`).join("")}
      ${deProg.map(pa=>{ const t=trimDe(pa); return `<div class="row" style="justify-content:space-between;border:1px dashed var(--line);border-radius:8px;padding:8px 12px">
        <span style="font-size:14px">${esc(pa.nombre)} <span style="font-size:12.5px;color:var(--mut)">· en la Programació${t!=null?" ("+TRIMESTRES[t]+")":""}, encara no portat a este grup${(pa.rubrica||[]).length?" · amb rúbrica guardada":""}</span></span>
        <button class="btn small" title="L'afig a l'Avaluació per competències en la ${TRIMESTRES[state.ui.trim]}, ja amb rúbrica" onclick="cxTraerDeProgramacion('${pa.id}')">+ Portar a la ${TRIMESTRES[state.ui.trim].replace(/ª evaluación|a avaluació/,"a av.")} amb rúbrica</button>
      </div>`; }).join("")}
    </div>
  </div>`;
}
window.cxTraerDeProgramacion=async progActId=>{
  const grupo=grupoActual(); const prog=progDeGrupo(grupo); if(!grupo||!prog) return;
  const pa=prog.actividades.find(x=>x.id===progActId); if(!pa) return;
  if(!(pa.criterios||[]).length && !(pa.rubrica||[]).length){
    if(!await confirmar(`«${pa.nombre}» encara no té criteris marcats en la Programació, així que la rúbrica començarà en blanc i no comptarà per a les competències fins que vincules els seus ítems a criteris.\n\nVols continuar?`)) return;
  }
  const act=progCrearActividadEnGrupo(grupo,pa,state.ui.trim);
  cxAbrirEditor(grupo,act);
  mostrarToast("✓ Examen añadido con rúbrica — ajústala y corrige desde aquí");
};

/* ---------- Crear examen ---------- */
function renderCorCrear(grupo){
  const c=document.getElementById("tabContent");
  const f=state.ui.corForm;
  if(!f.bloqueId) f.bloqueId=grupo.bloques[0]?.id||"";
  const plantillas=state.plantillasRubrica||[];
  c.innerHTML=`<div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h2>Nou examen</h2><button class="ghost" style="border:1px solid var(--line)" title="Crear l'examen a partir d'un paquet exportat (examen + rúbrica + variants)" onclick="exImportarPaquete()">📥 Importar paquet</button></div>
    <p class="sub">Es crea en la ${TRIMESTRES[state.ui.trim]}. Després dissenyes la rúbrica i vincules cada ítem als criteris que treballa.</p>
    <div class="grid" style="max-width:640px">
      <input class="in" id="cxfNombre" placeholder="Nom de l'examen o treball" aria-label="Nom de l'examen o treball" value="${esc(f.nombre)}">
      <select class="in" id="cxfBloque">${grupo.bloques.map(b=>`<option value="${b.id}" ${b.id===f.bloqueId?"selected":""}>${esc(b.label)}</option>`).join("")}</select>
      <input class="in" id="cxfSda" placeholder="Situació d'aprenentatge (opcional)" value="${esc(f.sda||'')}">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Data de l'examen (opcional)
        <input class="in" style="width:100%;margin-top:4px" type="date" id="cxfFecha" value="${esc(f.fecha||'')}">
      </label>
      <p class="sub" style="margin:-4px 0 0;font-size:11.5px">Si la indiques, també es crea en el calendari d'Inici.</p>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Començar la rúbrica des de
        <select class="in" style="width:100%;margin-top:4px" id="cxfPlantilla">
          <option value="">Rúbrica nova</option>
          ${plantillas.map(p=>`<option value="${p.id}" ${f.plantillaId===p.id?"selected":""}>${esc(p.nombre)}${cxEsNiveles(p.rubrica)?" · per nivells":" · per punts"}</option>`).join("")}
        </select>
      </label>
      ${plantillas.length?`<p class="sub" style="margin:-4px 0 0;font-size:11.5px">Les plantilles servixen per a qualsevol grup: es copien amb els seus punts (o nivells) i descriptors; els criteris vinculats només es copien si existixen en el catàleg d'este grup.</p>`:""}
      ${!f.plantillaId?`<fieldset style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0">
        <legend style="font-size:12.5px;color:var(--mut);font-weight:500;padding:0 4px">Tipus de rúbrica</legend>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;cursor:pointer;padding:3px 0"><input type="radio" name="cxfTipo" value="puntos" ${f.tipoRub!=="niveles"?"checked":""} onchange="cxFormTipo(this.value)" style="margin-top:3px"><span><strong>Per punts</strong> · apartats, preguntes i ítems amb la seua puntuació (exàmens escrits)</span></label>
        <label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;cursor:pointer;padding:3px 0"><input type="radio" name="cxfTipo" value="niveles" ${f.tipoRub==="niveles"?"checked":""} onchange="cxFormTipo(this.value)" style="margin-top:3px"><span><strong>Per nivells d'assoliment</strong> · taula de categories × nivells (Expert, Avançat…): es corregix tocant caselles (treballs, exposicions, projectes)</span></label>
      </fieldset>`:""}
      <div>
        <button class="ghost" style="border:1px solid var(--line)" onclick="state.ui.corFormCritAbierto=!state.ui.corFormCritAbierto;save();render()">${state.ui.corFormCritAbierto?"▾":"▸"} Criteris d'avaluació que avalua — ${(f.criterios||[]).length} marcat${(f.criterios||[]).length===1?"":"s"}</button>
        <p class="sub" style="margin:4px 0 0;font-size:11.5px">Opcional, pero recomendable: la rúbrica empezará con una pregunta por criterio, solo te ofrecerá estos para vincular y te avisará si alguno se queda sin evaluar. Pueden ser de varias Situaciones de Aprendizaje.</p>
        ${state.ui.corFormCritAbierto?cxSelectorCriteriosHTML(grupo.catalogoKey,f.criterios||[],"cxFormToggleCrit"):""}
      </div>
      <button class="btn" id="cxfBtn" onclick="cxCrearExamen()" ${!f.nombre.trim()?"disabled":""} style="justify-self:start">Crear y diseñar rúbrica</button>
    </div>
  </div>
  ${plantillas.length?`<div class="card">
    <h2 style="font-size:14.5px">Plantilles guardades</h2>
    <div class="flex">
      ${plantillas.map(p=>`<span class="chip">${esc(p.nombre)}${cxEsNiveles(p.rubrica)?' <span style="font-size:11.5px;color:var(--mut)">· nivells</span>':""} <button class="ghost danger small" style="padding:2px 6px;margin-left:4px" onclick="cxEliminarPlantilla('${p.id}')" title="Eliminar la plantilla">✕</button></span>`).join("")}
    </div>
  </div>`:""}`;
  document.getElementById("cxfNombre").addEventListener("input",e=>{ state.ui.corForm.nombre=e.target.value; save();
    document.getElementById("cxfBtn").disabled=!e.target.value.trim(); });
  document.getElementById("cxfBloque").addEventListener("change",e=>{ state.ui.corForm.bloqueId=e.target.value; save(); });
  document.getElementById("cxfSda").addEventListener("input",e=>{ state.ui.corForm.sda=e.target.value; save(); });
  document.getElementById("cxfFecha").addEventListener("change",e=>{ state.ui.corForm.fecha=e.target.value; save(); });
  document.getElementById("cxfPlantilla").addEventListener("change",e=>{ state.ui.corForm.plantillaId=e.target.value; save(); render(); });
}
window.cxEliminarPlantilla=async id=>{
  if(!await confirmar("¿Eliminar esta plantilla de rúbrica? No afecta a los exámenes ya creados con ella.")) return;
  state.plantillasRubrica=(state.plantillasRubrica||[]).filter(p=>p.id!==id);
  save(); render();
};
window.cxFormTipo=v=>{ state.ui.corForm.tipoRub=v==="niveles"?"niveles":"puntos"; save(); };
window.cxGuardarComoPlantilla=async examId=>{
  const grupo=grupoActual(); const act=grupo.actividades.find(a=>a.id===examId); if(!act) return;
  const nombre=await pedirTexto("Nom per a esta plantilla de rúbrica:", act.nombre);
  if(!nombre || !nombre.trim()) return;
  if(!Array.isArray(state.plantillasRubrica)) state.plantillasRubrica=[];
  const rubrica=JSON.parse(JSON.stringify(act.rubrica));
  const igual=state.plantillasRubrica.find(p=>String(p.nombre).trim().toLowerCase()===nombre.trim().toLowerCase());
  if(igual){
    if(!await confirmar(`Ya tienes una plantilla llamada «${igual.nombre}». ¿Sustituirla por esta rúbrica? Los exámenes ya creados con ella no cambian.`,{ok:"Sustituir",peligro:false})) return;
    igual.rubrica=rubrica;
  } else state.plantillasRubrica.push({ id:uid(), nombre:nombre.trim(), rubrica });
  save();
  mostrarAviso(`Plantilla "${nombre.trim()}" guardada. Podrás elegirla al crear un nuevo examen o cargarla en la rúbrica de cualquier examen, en cualquier grupo.`);
};
function cxCriteriosValidosEnCatalogo(catalogoKey){
  const idx=catIndex(catalogoKey); const set=new Set();
  idx.cat.ces.forEach(ce=>ce.criterios.forEach(c=>set.add(c.id)));
  return set;
}
window.cxCrearExamen=()=>{
  const grupo=grupoActual(); const f=state.ui.corForm;
  if(!f.nombre.trim()) return;
  if(!f.bloqueId) f.bloqueId=defBloque(TIPO_EXAMEN,grupo.bloques);
  const critsForm=(f.criterios||[]).filter(c=>cxCriteriosValidosEnCatalogo(grupo.catalogoKey).has(c));
  let rubricaInicial= f.tipoRub==="niveles"? cxnRubricaNueva(critsForm.map(c=>({critId:c,peso:100})),grupo.catalogoKey)
    : critsForm.length? cxRubricaDesdeCriterios(critsForm.map(c=>({critId:c,peso:100})),grupo.catalogoKey)
    : [{id:uid(),title:"Apartado 1",items:[{id:uid(),label:"",max:10,desc:[],links:[]}]}];
  if(f.plantillaId){
    const plantilla=(state.plantillasRubrica||[]).find(p=>p.id===f.plantillaId);
    if(plantilla){
      rubricaInicial=cxClonarRubrica(plantilla.rubrica,grupo.catalogoKey);
    }
  }
  const act={ id:uid(), trimestre:state.ui.trim, nombre:f.nombre.trim(), tipo:TIPO_EXAMEN,
    bloqueId:f.bloqueId, esExamen:true, pesoBloque:"", criterios:[], sda:(f.sda||"").trim(),
    rubrica:rubricaInicial, escalarA10:true, criteriosPrevistos:critsForm };
  cxSyncCriteriosActividad(act);
  grupo.actividades.push(act);
  if((f.fecha||"").trim()){
    if(!Array.isArray(state.eventos)) state.eventos=[];
    state.eventos.push({id:uid(), fecha:f.fecha.trim(), titulo:act.nombre, tipo:"examen", grupoId:grupo.id, notas:"", examId:act.id});
    state.ui.agMes=f.fecha.trim().slice(0,7);
  }
  state.ui.corExamId=act.id; state.ui.corTab="editor"; state.ui.corForm={nombre:"",bloqueId:"",sda:"",fecha:"",plantillaId:"",criterios:[],tipoRub:f.tipoRub||"puntos"}; state.ui.corFormCritAbierto=false;
  save(); render();
};

