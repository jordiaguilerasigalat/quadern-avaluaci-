/* ============================================================================
   Cuaderno del profesor · Alertas automáticas y pantalla de Inicio
   js/inicio/alertas-home.js
   ============================================================================ */

/* =================================================================
   Alertas automáticas de Inicio — un vistazo rápido a los últimos 30
   días de todos los grupos, sin tener que entrar módulo por módulo.
   Reutiliza exactamente los mismos cálculos que ya usan Asistencia,
   Convivencia y Refuerzo/Repetición.
   ================================================================= */
function homeAlertasCalcular(){
  const hasta=agHoyStr();
  const d=new Date(); d.setDate(d.getDate()-30);
  const desde=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  let totalFaltasNoJust=0, alumnosConFaltas=new Set();
  let totalConv=0, alumnosConConv=new Set();
  (state.grupos||[]).forEach(g=>{
    (g.alumnos||[]).forEach(al=>{
      const asis=asistContarPeriodo(g,al.id,desde,hasta);
      if(asis.falta_no_justificada>0){ totalFaltasNoJust+=asis.falta_no_justificada; alumnosConFaltas.add(g.id+"|"+al.id); }
      const conv=convContarTipos(g,al.id,desde,hasta);
      const totalConvAl=conv.ac+conv.rc+conv.pa;
      if(totalConvAl>0){ totalConv+=totalConvAl; alumnosConConv.add(g.id+"|"+al.id); }
    });
  });
  const planesActivos=(state.planesRefuerzo||[]).filter(p=>p.estado==="activo").length+(state.planesRepeticion||[]).filter(p=>p.estado==="activo").length;
  return {
    alumnosConFaltas:alumnosConFaltas.size, totalFaltasNoJust,
    alumnosConConv:alumnosConConv.size, totalConv,
    planesActivos
  };
}
function homeAlertasHTML(){
  if(!(state.grupos||[]).length) return "";
  const a=homeAlertasCalcular();
  const hayAlgo=a.alumnosConFaltas>0||a.alumnosConConv>0;
  if(!hayAlgo && a.planesActivos===0) return "";
  return `<div class="card" style="border-color:${hayAlgo?"#dc2626":"var(--border-soft)"};margin-bottom:14px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14px">${hayAlgo?"⚠️":"✅"} Últims 30 dies, tots els grups</strong>
      <span class="sub" style="margin:0">d'una ullada, sense entrar mòdul per mòdul</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:10px">
      ${a.alumnosConFaltas>0?`<div style="cursor:pointer" onclick="irModo('competencial')">
        <div style="font-size:19px;font-weight:700;color:#dc2626">${a.alumnosConFaltas}</div>
        <div style="font-size:12px;color:var(--mut)">alumne${a.alumnosConFaltas===1?"":"s"} amb faltes no justificades (${a.totalFaltasNoJust} en total)</div>
      </div>`:`<div><div style="font-size:19px;font-weight:700;color:var(--green,#16a34a)">0</div><div style="font-size:12px;color:var(--mut)">faltes no justificades</div></div>`}
      ${a.alumnosConConv>0?`<div style="cursor:pointer" onclick="irModo('competencial')">
        <div style="font-size:19px;font-weight:700;color:#dc2626">${a.alumnosConConv}</div>
        <div style="font-size:12px;color:var(--mut)">alumne${a.alumnosConConv===1?"":"s"} amb convivència registrada (${a.totalConv} en total)</div>
      </div>`:`<div><div style="font-size:19px;font-weight:700;color:var(--green,#16a34a)">0</div><div style="font-size:12px;color:var(--mut)">incidències de convivència</div></div>`}
      <div><div style="font-size:19px;font-weight:700">${a.planesActivos}</div><div style="font-size:12px;color:var(--mut)">pla${a.planesActivos===1?"":"ns"} de Reforç/Repetició actiu${a.planesActivos===1?"":"s"}</div></div>
    </div>
  </div>`;
}

/* =================================================================
   v3 · QUÉ ME FALTA (periodo seleccionado, todos los grupos)
   - Actividades corregidas a medias: alguien tiene nota y a otros les
     falta (sin contar NP/Exento ni las recuperaciones).
   - Comentarios de evaluación vacíos de alumnado con nota, solo en los
     grupos donde ya se ha escrito alguno (quien no los usa no recibe aviso).
   Cada aviso lleva al sitio donde se resuelve.
   ================================================================= */
function queMeFaltaCalcular(){
  const t=state.ui.trim, out=[];
  (state.grupos||[]).forEach(g=>{
    if(!(g.alumnos||[]).length) return;
    g.actividades.filter(a=>a.trimestre===t && !a.recupera).forEach(a=>{
      let con=0; const faltan=[];
      g.alumnos.forEach(al=>{
        if(notaActividadBase(g,al.id,a)!=null) con++;
        else if(!marcaDe(g,al.id,a.id)) faltan.push(al);
      });
      if(con>0 && faltan.length) out.push({g,tipo:"notas",act:a,n:faltan.length,quien:faltan});
    });
    const conNota=g.alumnos.filter(al=>notaTrimestre(g,al.id,t)!=null);
    const escritos=conNota.filter(al=>((al.comentariosEval||[])[t]||"").trim()).length;
    const vacios=conNota.length-escritos;
    if(escritos>0 && vacios>0) out.push({g,tipo:"comentarios",n:vacios});
  });
  return out;
}
window.queMeFaltaIr=(gid,tipo,actId)=>{
  if(tipo==="notas"){ state.ui.calAct=actId; hoyIr(gid,"calificar"); }
  else hoyIr(gid,"resultados");
};
function queMeFaltaHTML(){
  const items=queMeFaltaCalcular(); if(!items.length) return "";
  const MAX=6, vis=items.slice(0,MAX);
  const nombres=l=>l.slice(0,3).map(al=>esc(al.nombre)).join("; ")+(l.length>3?` i ${l.length-3} més`:"");
  return `<div class="card que-falta" style="margin-bottom:14px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14px">📝 Què em falta · ${TRIMESTRES[state.ui.trim]}</strong>
      <span class="sub" style="margin:0">${items.length} pendent${items.length===1?"":"s"} en els teus grups</span>
    </div>
    <div style="display:grid;gap:6px;margin-top:8px">
      ${vis.map(it=>`<div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-size:13px"><strong>${esc(it.g.nombre)}</strong> · ${it.tipo==="notas"
          ?`«${esc(it.act.nombre)}»: falta${it.n===1?"":"en"} ${it.n} nota${it.n===1?"":"s"} <span style="color:var(--mut)">(${nombres(it.quien)})</span>`
          :`${it.n} alumne${it.n===1?"":"s"} amb nota i sense comentari d'avaluació`}</span>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="queMeFaltaIr('${it.g.id}','${it.tipo}','${it.act?it.act.id:""}')">${it.tipo==="notas"?"Qualificar":"Vore resultats"}</button>
      </div>`).join("")}
      ${items.length>MAX?`<div class="sub" style="margin:0">i ${items.length-MAX} més en altres grups o activitats.</div>`:""}
    </div>
  </div>`;
}

function renderHome(){
  const app=document.getElementById("app");
  const nGrupos=state.grupos.length;
  const nAlumnos=state.grupos.reduce((s,g)=>s+g.alumnos.length,0);
  const nExamenes=state.grupos.reduce((s,g)=>s+g.actividades.filter(a=>a.esExamen&&a.rubrica).length,0);
  const nProgramaciones=(state.programaciones||[]).length;
  const nReuniones=(state.reuniones||[]).length;
  const nRefuerzoActivos=(state.planesRefuerzo||[]).filter(p=>p.estado==="activo").length;
  const nRepeticionActivos=(state.planesRepeticion||[]).filter(p=>p.estado==="activo").length;
  const nNeseTotal=state.grupos.reduce((s,g)=>s+g.alumnos.filter(a=>a.nese).length,0);
  const nNesePendientes=state.grupos.reduce((s,g)=>s+g.alumnos.filter(a=>a.nese && !nePlanDe(a.id)).length,0);
  app.innerHTML=`
  <div class="hero">
    <div class="hero-eyebrow">${esc(materiasEtiqueta())}</div>
    <h1 class="hero-title">Inici</h1>
    <details class="hero-dades" ${(state.cursoEscolarGlobal&&state.profesorNombreGlobal&&state.centroNombre)?"":"open"}>
      <summary style="cursor:pointer;color:rgba(255,255,255,.85);font-size:13px;font-weight:600;margin-top:4px">${state.profesorNombreGlobal?esc(state.profesorNombreGlobal)+" · ":""}${esc(state.cursoEscolarGlobal||"")}${state.centroNombre?" · "+esc(state.centroNombre):""}${(state.cursoEscolarGlobal||state.profesorNombreGlobal)?" — ":""}<span style="display:inline-block;margin-left:4px;padding:2px 10px;border:1px solid rgba(255,255,255,.45);border-radius:14px;background:rgba(255,255,255,.1)">⚙️ Les meues dades, capçalera del centre i còpies</span></summary>
    <div class="flex" style="gap:10px;margin-top:12px;flex-wrap:wrap">
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Curs escolar
        <input class="in" style="display:block;margin-top:3px;width:130px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="2026-2027" value="${esc(state.cursoEscolarGlobal||"")}" onchange="setDatoGlobal('cursoEscolarGlobal',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Professor/a
        <input class="in" style="display:block;margin-top:3px;width:220px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="Nom i cognoms" value="${esc(state.profesorNombreGlobal||"")}" onchange="setDatoGlobal('profesorNombreGlobal',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Centre
        <input class="in" style="display:block;margin-top:3px;width:240px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="Nom del centre" value="${esc(state.centroNombre||"")}" onchange="setDatoGlobal('centroNombre',this.value)">
      </label>
      <label style="font-size:12px;color:rgba(255,255,255,.75);font-weight:500">Codi centre
        <input class="in" style="display:block;margin-top:3px;width:110px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff" placeholder="46001234" value="${esc(state.centroCodigo||"")}" onchange="setDatoGlobal('centroCodigo',this.value)">
      </label>
    </div>
    ${typeof capcaleraIniciHTML==="function"?capcaleraIniciHTML():""}
    <p class="hero-tag" style="margin-top:8px;font-size:12px;max-width:none;opacity:.75">Estes dades s'usen en les portades de tots els documents imprimibles. Cada Programació d'Aula pot tindre el seu propi curs escolar i professor/a si cal; si els deixa en blanc, usa estos.</p>
    <div class="flex" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirDiagnostico()">🩺 Revisar les meues dades</button><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirCopias()">🛟 Còpies de seguretat</button><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirNuevoCurso()" title="Arxiva el curs que acaba i prepara el següent conservant grups, programacions i horari">🎓 Començar curs nou</button></div>
    </details>
  </div>
  ${typeof copiaRecordatoriHTML==="function"?copiaRecordatoriHTML():""}
  ${hoyTarjetaHTML()}
  ${homeGrupsActiusHTML()}
  ${queMeFaltaHTML()}
  ${homeAlertasHTML()}
  ${coberturaAvisosInicioHTML()}
  ${typeof ccAvisoInicioHTML==="function"?ccAvisoInicioHTML():""}
  ${novedadesHTML()}

  ${homeSeccionHeaderHTML("evaluacion","🧰 Totes les eines")}
  ${homeSecciones.evaluacion?`<div class="home-eines">
    ${[
      ["👥","Grups",`${nGrupos} grup${nGrupos===1?"":"s"} · ${nAlumnos} alumne${nAlumnos===1?"":"s"}`,"irModo('competencial')","Alumnat, activitats, rúbriques, qualificacions i informes de cada grup"],
      ["📘","Programacions",`${nProgramaciones} programaci${nProgramaciones===1?"ó":"ons"}`,"irModo('programacion')","Programacions d'aula per temes i situacions d'aprenentatge, amb la temporització"],
      ["🖊️","Corrector d'exàmens",`${nExamenes} amb rúbrica`,"irModo('corrector')","Rúbriques per examen vinculades a criteris; les notes van soles a Seguiment i avaluació"],
      ["🧩","NESE",`${nNeseTotal} alumne${nNeseTotal===1?"":"s"}${nNesePendientes?` · ${nNesePendientes} sense pla`:""}`,"irModo('nese')","Adaptacions, plans de reforç NESE i dossiers"],
      ["🔁","Repetició i pendents",`${nRepeticionActivos} repetició · ${nRefuerzoActivos} reforç`,"irModo('repeticion')","Plans de repetició i de reforç"],
      ["📚","Biblioteca","Documents i material","irModo('biblioteca')","Programacions, propostes, material de cada tema, diversitat i els teus enllaços, amb buscador"],
      ["🗂️","Reunions",`${nReuniones} registrad${nReuniones===1?"a":"es"}`,"irModo('reuniones')","Reunions amb famílies, alumnat i equip directiu, amb acta imprimible"],
      ["📄","Memòria de curs",`${state.grupos.length} grup${state.grupos.length===1?"":"s"}`,"irModo('memoria')","Resultats, assistència, convivència i SdA de tots els grups junts"]
    ].map(([ico,nom,meta,on,tit])=>`<button class="home-eina" onclick="${on}" title="${esc(tit)}"><span class="home-eina-ico">${ico}</span><span><span class="home-eina-nom">${nom}</span><span class="home-eina-meta">${meta}</span></span></button>`).join("")}
    <a class="home-eina" href="tutoria/index.html" target="_blank" rel="noopener" title="Aplicació a banda, amb les seues pròpies dades" style="text-decoration:none"><span class="home-eina-ico">🎓</span><span><span class="home-eina-nom">Gestor de Tutoria</span><span class="home-eina-meta">S'obri a banda</span></span></a>
  </div>`:""}

  ${homeSeccionHeaderHTML("calendario","Calendari i el meu horari")}
  ${homeSecciones.calendario?`<div class="card" style="margin-top:0;padding-bottom:10px">
    <div class="flex" style="gap:8px">
      <button class="tab ${homeTabActual==="calendario"?"on":""}" onclick="homeSetTab('calendario')">📅 Calendari</button>
      <button class="tab ${homeTabActual==="horario"?"on":""}" onclick="homeSetTab('horario')">🗓️ El meu horari</button>
    </div>
  </div>
  ${homeTabActual==="calendario"?`<div class="ag-layout">
    ${agRenderCalendarioHTML()}
    ${agRenderResumenHTML()}
  </div>`:horRenderGridHTML()}`:""}

  ${state.ui.agModalFecha ? agRenderModalHTML() : ""}
  ${state.ui.agModalFestivos ? agRenderModalFestivosHTML() : ""}
  ${state.ui.agModalColores ? agRenderModalColoresHTML() : ""}
  ${state.ui.agModalMesGrande ? agModalMesGrandeHTML() : ""}
  ${state.ui.horModalCelda ? horRenderModalHTML() : ""}
  ${state.ui.horModalFranjas ? horFranjasModalHTML() : ""}`;
}

/* Pestanyetes amb els grups del curs: un clic obri el grup amb tot el seu
   (alumnat, activitats, rúbriques, programació vinculada…). */
function homePendentsChipHTML(){
  if(typeof pdCursos!=="function") return "";
  const cs=pdCursos(), n=cs.reduce((s,c)=>s+c.plans.length,0);
  return `<button class="home-grup pd" onclick="irPendents('')" title="Alumnat amb la matèria pendent que no tens este curs" style="border-style:dashed">
      <span class="home-grup-nom">📌 Pendents</span>
      <span class="home-grup-meta">No els tinc este curs</span>
      <span class="home-grup-meta">${n?n+" alumne"+(n===1?"":"s")+(cs.length?" · "+cs.map(c=>esc(c.curs)+" ("+c.plans.length+")").join(", "):""):"Cap encara"}</span>
    </button>`;
}
function homeGrupsActiusHTML(){
  const gs=state.grupos||[];
  const chip=g=>{
    const cat=getCatalogo(g.catalogoKey);
    const prog=typeof progDeGrupo==="function"?progDeGrupo(g):null;
    return `<button class="home-grup" data-ordre-grup="${esc(g.id)}" onclick="buscarIrGrupo('${escJS(g.id)}')" title="Obrir el grup ${esc(g.nombre)} (arrossega per a canviar l'ordre)">
      <span class="home-grup-nom">${esc(g.nombre)}</span>
      <span class="home-grup-meta">${esc(cat?cat.materia+" · "+cat.curso:"")}</span>
      <span class="home-grup-meta">${(g.alumnos||[]).length} alumne${(g.alumnos||[]).length===1?"":"s"}${prog?" · 📘 "+esc(prog.nombre.replace(/ · Programació del departament.*/,"")):""}</span>
    </button>`;
  };
  return `<div class="card">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <h2 style="font-size:15px;margin:0">👥 Els meus grups${state.cursoEscolarGlobal?" · "+esc(state.cursoEscolarGlobal):""}</h2>
      <button class="ghost small" style="border:1px dashed var(--line)" onclick="state.ui.appMode='competencial';irAGrupo(null)">+ Nou grup</button>
    </div>
    ${gs.length?`<div class="home-grups" data-ordre-grups>${gs.map(chip).join("")}${homePendentsChipHTML()}</div>`
      :`<p class="sub" style="margin:0">Encara no tens grups. Crea'n un amb «+ Nou grup».</p>`}
  </div>`;
}
