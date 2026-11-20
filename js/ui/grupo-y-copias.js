/* ============================================================================
   Cuaderno del profesor · Navegación por grupo, pantalla inicial vacía, exportar/importar todo
   js/ui/grupo-y-copias.js
   ============================================================================ */

window.irAGrupo=id=>{ state.ui.grupoId=id;
  if(state.ui.appMode==="corrector"){ state.ui.corTab="lista"; state.ui.corExamId=""; state.ui.corAlId=""; }
  else if(id){ state.ui.tab="resultados";
    state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""}; state.ui.alumAbierto=null; }
  save(); render(); };

function renderMain(){
  const grupo=grupoActual();
  if(!grupo) return renderLanding();
  renderGrupo(grupo);
}

function avisoCopiaHTML(){
  const hasData=state.grupos.some(g=>g.alumnos.length>0||g.actividades.length>0);
  if(!hasData) return "";
  const last=state.lastBackupAt;
  if(!last) return `<div class="alert-box">⚠️ <strong>Encara no has exportat cap còpia de seguretat.</strong>&nbsp;Tot es guarda només en este navegador: exporta una còpia (dalt a la dreta) per a no perdre la teua faena si canvies d'equip o s'esborra la memòria cau.</div>`;
  const days=Math.floor((Date.now()-last)/86400000);
  if(days>=14) return `<div class="alert-box">⚠️ <strong>Última còpia de seguretat: fa ${days} dies.</strong>&nbsp;Convé exportar una còpia recent.</div>`;
  return `<p class="sub" style="margin:-6px 0 4px">Última còpia de seguretat: ${haceTiempo(last)}.</p>`;
}
function renderLanding(){
  const app=document.getElementById("app");
  const ng=state.ui.nuevoGrupo;
  const esLliure=ng.catalogoKey===NG_LLIURE;
  if(!esLliure && (!getCatalogo(ng.catalogoKey) || catalogoEstaOculto(ng.catalogoKey))) ng.catalogoKey=ORDEN_CATALOGOS.find(k=>!catalogoEstaOculto(k))||ORDEN_CATALOGOS[0];
  const hayGrupos=state.grupos.length>0;
  app.innerHTML=`
  <div class="hero">
    <div class="hero-eyebrow">Física i Química · LOMLOE</div>
    <h1 class="hero-title">Seguiment i avaluació</h1>
    <p class="hero-tag">Qualitativa i quantitativa, criteri a criteri, trimestre a trimestre. Inclou de sèrie el currículum de Física i Química de 2n, 3r i 4t d'ESO, i de 1r i 2n de Batxillerat (Física i Química), i et permet importar el de qualsevol altra matèria (més avall). Funciona en local: sense compte, sense connexió, sense que cap dada isca d'este dispositiu.</p>
    <div class="timeline">
      <div class="pt"><span class="dot"></span><span class="lbl">1a avaluació</span></div>
      <span class="seg"></span>
      <div class="pt"><span class="dot"></span><span class="lbl">2a avaluació</span></div>
      <span class="seg"></span>
      <div class="pt"><span class="dot"></span><span class="lbl">3a avaluació</span></div>
    </div>
    ${avisoCopiaHTML()}
  </div>

  ${hayGrupos ? `
  <div>
    <div class="section-eyebrow">Els teus grups</div>
    <div class="gcard-grid">
      ${state.grupos.map(g=>{
        const cat=getCatalogo(g.catalogoKey);
        return `<div class="gcard">
          <div class="gcard-title">${esc(g.nombre)}</div>
          <div class="gcard-meta">${esc(cat.materia)} · ${esc(cat.curso)}</div>
          <div class="gcard-count">${g.alumnos.length} alumne${g.alumnos.length===1?"":"s"} · ${g.actividades.length} activitat${g.actividades.length===1?"":"s"}</div>
          <div class="gcard-actions">
            <button class="btn" onclick="irAGrupo('${g.id}')">Obrir</button>
            <button class="ghost danger" onclick="borrarGrupoId('${g.id}')">Eliminar</button>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>` : `
  <div class="card">
    <h2>Benvingut/da</h2>
    <p class="sub">Comença carregant una còpia que ja tingueres exportada, o crea el teu primer grup.</p>
  </div>`}

  <div class="card">
    <h2>Carregar arxiu exportat</h2>
    <p class="sub">Recupera tots els teus grups, alumnat i qualificacions des d'una còpia de seguretat (.json) exportada prèviament.</p>
    <label class="in file">Triar arxiu…<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>
  </div>
  <div class="card">
    <h2>Crear grup nou</h2>
    <p class="sub">Tria la matèria i el curs: el catàleg de competències específiques, criteris i competències clau es carrega automàticament. Per a un grup d'una altra matèria (tallers, atenció educativa, PAC, FP…) tria «Una altra matèria» al final de la llista i escriu-ne el nom. Si vols el currículum complet d'una altra matèria, o en vols editar o eliminar alguna, fes-ho en "Matèries: importar, editar o eliminar plantilles" (just davall) i després torna ací.</p>
    <div class="grid" style="max-width:440px">
      <input class="in" id="ngNombre" placeholder="Nom del grup (p. ex. 1r Batx A)" value="${esc(ng.nombre)}">
      <select class="in" id="ngCat">${opcionesCatalogosHTML(ng.catalogoKey)}<option value="${NG_LLIURE}" ${esLliure?"selected":""}>✏️ Una altra matèria (taller, atenció educativa, PAC, FP…)</option></select>
      <div id="ngLliure" class="grid" style="gap:8px;${esLliure?"":"display:none"}">
        <input class="in" id="ngMateria" placeholder="Matèria (p. ex. Taller de robòtica, Atenció educativa, PAC, FP…)" value="${esc(ng.materia||"")}">
        <input class="in" id="ngCurso" placeholder="Curs o nivell (p. ex. 3r ESO, 1r CFGM…)" value="${esc(ng.curso||"")}">
        <p class="sub" style="margin:0">Sense currículum de FiQ: el grup tindrà alumnat, assistència, activitats i notes amb uns criteris generals senzills (treball, activitats i actitud). Els pots canviar després en «Matèries: importar, editar o eliminar plantilles».</p>
      </div>
      <button class="btn" onclick="crearGrupo()" ${!ngPotCrear()?"disabled":""} style="justify-self:start">Crear grup</button>
    </div>
  </div>

  ${renderGestionCatalogosHTML()}`;
  const ngBoto=()=>{ const b=document.querySelector("main .btn[onclick=\"crearGrupo()\"]"); if(b) b.disabled=!ngPotCrear(); };
  [["ngNombre","nombre"],["ngMateria","materia"],["ngCurso","curso"]].forEach(([id,camp])=>{
    const el=document.getElementById(id);
    el.addEventListener("input",e=>{ state.ui.nuevoGrupo[camp]=e.target.value; save(); ngBoto(); });
    el.addEventListener("keydown",e=>{ if(e.key==="Enter") crearGrupo(); });
  });
  document.getElementById("ngCat").addEventListener("change",e=>{ state.ui.nuevoGrupo.catalogoKey=e.target.value; save();
    const lliure=e.target.value===NG_LLIURE;
    document.getElementById("ngLliure").style.display=lliure?"":"none";
    if(lliure) document.getElementById("ngMateria").focus();
    ngBoto(); });
  bindGestionCatalogosEventos();
}
window.cargarArchivoCatalogo=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const ta=document.getElementById("catTexto");
    if(ta){ ta.value=String(rd.result); state.ui.catImportTexto=ta.value; save(); }
    inp.value="";
  };
  rd.readAsText(file);
};
/* Grups d'altres matèries (tallers, atenció educativa, PAC, FP…): en lloc d'un
   catàleg de la llista, es crea (o es reutilitza) una plantilla mínima amb la
   matèria i el curs escrits a mà, uns criteris generals i tres blocs de nota. */
const NG_LLIURE="__lliure__";
function ngPotCrear(){
  const ng=state.ui.nuevoGrupo;
  if(!ng.nombre.trim()) return false;
  if(ng.catalogoKey===NG_LLIURE) return !!(ng.materia||"").trim();
  return true;
}
function catalogoLliure(materia,curso){
  return {
    materia, curso, lliure:true,
    ces:[{id:"CE1", titulo:"Criteris generals de la matèria", cc:["CPSAA","CC"], criterios:[
      {id:"1.1", texto:"Treball i participació a classe"},
      {id:"1.2", texto:"Activitats, tasques i treballs"},
      {id:"1.3", texto:"Actitud, respecte i esforç"}
    ]}],
    bloques:[{label:"Activitats i treballs",peso:50},{label:"Treball diari i participació",peso:30},{label:"Actitud",peso:20}],
    saberes:{}
  };
}
function claveCatalogoLliure(materia,curso){
  if(!state.catalogosPersonalizados) state.catalogosPersonalizados={};
  const key=slugCatalogo(materia,curso);
  if(!state.catalogosPersonalizados[key] && !CATALOGOS[key]){
    state.catalogosPersonalizados[key]=catalogoLliure(materia,curso);
    delete CAT_CACHE[key];
  }
  return key;
}
window.crearGrupo=()=>{
  const ng=state.ui.nuevoGrupo; if(!ngPotCrear()) return;
  const catKey=ng.catalogoKey===NG_LLIURE
    ? claveCatalogoLliure(ng.materia.trim(), (ng.curso||"").trim()||"—")
    : ng.catalogoKey;
  const g=defGrupo(ng.nombre.trim(),catKey);
  state.grupos.push(g);
  state.ui.grupoId=g.id; state.ui.tab="alumnos";
  state.ui.nuevoGrupo={nombre:"",catalogoKey:ORDEN_CATALOGOS[0],materia:"",curso:""};
  save(); render();
};

window.exportarTodo=async()=>{
  volcarEspejoIDB();
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  const nombre=`copia-cuaderno-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  const _exAll=exTodosSync()||await exLeerTodos(); const blob=new Blob([JSON.stringify(_exAll.length?{...state,_examenesDiseno:_exAll}:state,null,2)],{type:"application/json"});
  const ok=await guardarArchivo(blob,nombre);
  if(!ok) return; // cancelado en el menú Compartir: no cuenta como copia
  state.lastBackupAt=Date.now(); state.cambiosSinCopia=0; save(); render();
  if(typeof copiaTancarBarra==="function") copiaTancarBarra();
  if(_copiasModalEl) pintarCopias();
  exLimpiarPendientes();
  mostrarToast("✓ Copia exportada");
};
function _procesarArchivoCopiaJSON(file,limpiar){
  if(!file) return; const rd=new FileReader();
  rd.onload=async()=>{
    if(limpiar) limpiar();
    let s;
    try{ s=JSON.parse(rd.result); }catch(e){ mostrarAviso("El archivo no es una copia válida: no se puede leer."); return; }
    s=await descifrarSiHaceFalta(s,file.name);
    if(s===null) return;
    if(!s || typeof s!=="object" || !Array.isArray(s.grupos)){
      mostrarAviso(s && s.grupo ? "Este archivo es un grupo suelto: cárgalo con «Importar grupo…» (junto a las pestañas de grupos)." : "El archivo no parece una copia de seguridad de esta app (le falta la lista de grupos).");
      return;
    }
    if(idsNoValidos(s).length){ mostrarAviso(AVISO_IDS_NO_VALIDOS); return; }
    const nuevo=resumenEstado(s), actual=resumenEstado(state);
    const hayDatos=actual.total>0;
    const msg=`Vas a cargar la copia «${file.name}»:\n• ${nuevo.texto}`+
      (hayDatos?`\n\nEsto SUSTITUIRÁ todo lo que tienes ahora:\n• ${actual.texto}\n\nAntes se guarda automáticamente una copia de lo actual (recuperable en 🛟 Copias).`:"")+"\n\n¿Continuar?";
    if(!await confirmar(msg)) return;
    if(hayDatos) await crearCopiaAuto("Antes de importar «"+file.name+"»",true);
    const _exDis=s._examenesDiseno; delete s._examenesDiseno;
    if(cargarEstadoCompleto(s)){
      if(Array.isArray(_exDis)){ await exGuardarVarios(_exDis); exLimpiarPendientes(); }
      state.cambiosSinCopia=0; state.lastBackupAt=Date.now(); _mostrarBienvenida=false; save(); render();
      mostrarToast("✓ Copia cargada");
    }
  };
  rd.readAsText(file);
}
window.importarTodo=inp=>{ _procesarArchivoCopiaJSON(inp.files[0],()=>{ inp.value=""; }); };

/* Secciones de un grupo. En pantallas anchas se ven todas como pestañas (.gtabs); en estrechas, en un desplegable. */
/* Les 12 pestanyes del grup s'agrupen en 4 seccions. state.ui.tab continua
   guardant la subpestanya (alumnos, calificar…), així els enllaços de tota
   l'aplicació (irATab('asistencia'), etc.) segueixen funcionant igual. */
const GRUPO_SECCIONS=[
  ["alumnat","👥 Alumnat",[["alumnos","Llista"],["plano","Plànol d'aula"],["asistencia","Assistència"],["convivencia","Convivència"],["familias","Famílies"]]],
  ["avaluar","✍️ Avaluar",[["programa","Programació"],["diario","Diari de classe"],["actividades","Activitats"],["calificar","Qualificar"]]],
  ["resultats","📊 Resultats",[["resultados","Notes i informes"],["resumen","Resum del grup"],["cobertura","Cobertura de criteris"]]],
  ["ajustos","⚙️ Ajustos",[["ajustes","Ajustos del grup"]]]
];
const GRUPO_PESTANAS=GRUPO_SECCIONS.flatMap(x=>x[2]);
function grupSeccioDe(tab){ return GRUPO_SECCIONS.find(x=>x[2].some(y=>y[0]===tab))||GRUPO_SECCIONS[0]; }
window.irASeccio=k=>{
  const sec=GRUPO_SECCIONS.find(x=>x[0]===k); if(!sec) return;
  const ult=(state.ui.tabUltim||{})[k];
  state.ui.tab=sec[2].some(y=>y[0]===ult)? ult : sec[2][0][0];
  save(); render();
};
function renderGrupo(grupo){
  const cat=getCatalogo(grupo.catalogoKey);
  const app=document.getElementById("app");
  if(!GRUPO_PESTANAS.some(x=>x[0]===state.ui.tab) && state.ui.tab!=="seguiment") state.ui.tab="alumnos";
  const sec=grupSeccioDe(state.ui.tab==="seguiment"?"actividades":state.ui.tab);
  state.ui.tabUltim=Object.assign({},state.ui.tabUltim,{[sec[0]]:state.ui.tab});
  app.innerHTML=`
  <div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between">
      <div>
        <strong style="font-size:15px">${esc(grupo.nombre)}</strong>
        <span style="color:var(--mut);font-size:13px"> · ${esc(cat.materia)} · ${esc(cat.curso)}</span>
      </div>
      <div class="flex">
        <button class="ghost boto-inici-intern" style="border:1px solid var(--line)" onclick="irAGrupo(null)">← Inici</button>
      </div>
    </div>
    <div class="gseccions" role="tablist" aria-label="Seccions del grup">
      ${GRUPO_SECCIONS.map(([k,l])=>`<button class="gseccio ${sec[0]===k?"on":""}" role="tab" aria-selected="${sec[0]===k?"true":"false"}" onclick="irASeccio('${k}')">${l}</button>`).join("")}
    </div>
    ${sec[2].length>1?`<div class="gtabs" role="tablist" aria-label="Apartats de ${esc(sec[1].replace(/^\S+\s/,""))}">
      ${sec[2].map(([k,l])=>`<button class="gtab ${state.ui.tab===k?"on":""}" role="tab" aria-selected="${state.ui.tab===k?"true":"false"}" onclick="irATab('${k}')">${l}</button>`).join("")}
    </div>`:""}
  </div>
  <div id="tabContent"></div>`;
  const t=state.ui.tab;
  try{
    if(t==="alumnos") renderAlumnos(grupo);
    else if(t==="plano") renderPlano(grupo);
    else if(t==="programa") renderProgramaGrup(grupo);
    else if(t==="actividades") renderActividades(grupo);
    else if(t==="seguiment"){ state.ui.tab="actividades"; renderActividades(grupo); }
    else if(t==="calificar") renderCalificar(grupo);
    else if(t==="resultados") renderResultados(grupo);
    else if(t==="resumen") renderResumen(grupo);
    else if(t==="cobertura") renderCobertura(grupo);
    else if(t==="asistencia") renderAsistencia(grupo);
    else if(t==="convivencia") renderConvivencia(grupo);
    else if(t==="familias") renderFamilias(grupo);
    else if(t==="diario") renderDiario(grupo);
    else if(t==="ajustes") renderAjustes(grupo);
    /* Fitxa única de l'alumne/a: s'obri des de qualsevol pestanya tocant el nom. */
    if(state.ui.fichaAlumnoId && grupo.alumnos.some(x=>x.id===state.ui.fichaAlumnoId)){
      const tc=document.getElementById("tabContent"); if(tc) tc.insertAdjacentHTML("beforeend",fichaAlumnoModalHTML(grupo,state.ui.fichaAlumnoId));
    }
  }catch(err){
    const tc=document.getElementById("tabContent");
    if(tc) tc.innerHTML=`<div class="card" style="border-color:var(--danger)">
      <h2 style="color:var(--danger)">⚠️ Ha habido un problema al mostrar esta pestaña</h2>
      <p class="sub">Prueba a recargar la página. Si sigue pasando, haz una captura de este mensaje (con el detalle técnico) y compártela para poder arreglarlo.</p>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:var(--mut)">Detalle técnico</summary>
        <pre style="white-space:pre-wrap;font-size:11.5px;color:var(--mut);background:var(--surface);padding:10px;border-radius:8px;margin-top:6px">Pestaña: ${esc(t)}
${esc(err.message||String(err))}
${esc(err.stack||"")}</pre>
      </details>
    </div>`;
    console.error("Error al renderizar la pestaña '"+t+"':", err);
  }
}
window.irATab=k=>{ state.ui.tab=k; save(); render(); };
window.irAAlumnoResultados=id=>{ state.ui.resAl = (state.ui.resAl===id && id!=="") ? "" : id; save(); render(); };

