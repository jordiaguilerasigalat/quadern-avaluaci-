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
      <summary style="cursor:pointer;color:rgba(255,255,255,.85);font-size:13px;font-weight:600;margin-top:4px">${state.profesorNombreGlobal?esc(state.profesorNombreGlobal)+" · ":""}${esc(state.cursoEscolarGlobal||"")}${state.centroNombre?" · "+esc(state.centroNombre):""}${(state.cursoEscolarGlobal||state.profesorNombreGlobal)?" — ":""}les meues dades, còpies i ajuda</summary>
    <p class="hero-tag" style="max-width:none">El teu quadern d'avaluació de Física i Química: programació, seguiment i avaluació, correcció amb rúbriques, més el seguiment diari de l'alumnat (assistència, convivència, famílies, reforç, repetició i NESE). Tot compartix el mateix alumnat i les mateixes notes, i tot ix en informes preparats per a imprimir.</p>
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
    <p class="hero-tag" style="margin-top:8px;font-size:12px;max-width:none;opacity:.75">Estes dades s'usen en les portades de tots els documents imprimibles. Cada Programació d'Aula pot tindre el seu propi curs escolar i professor/a si cal; si els deixa en blanc, usa estos.</p>
    <div class="flex" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirDiagnostico()">🩺 Revisar les meues dades</button><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirCopias()">🛟 Còpies de seguretat</button><button class="ghost small" style="color:#fff;border:1px solid rgba(255,255,255,.35)" onclick="abrirNuevoCurso()" title="Arxiva el curs que acaba i prepara el següent conservant grups, programacions i horari">🎓 Començar curs nou</button></div>
    <p class="hero-tag" style="margin-top:6px;font-size:12.5px;max-width:none;opacity:.85">📶 Afig-la a la pantalla d'inici de l'iPad (Safari → compartir → "Afegir a la pantalla d'inici"). Després d'obrir-la una vegada amb connexió, continua funcionant sense wifi.</p>
    </details>
  </div>
  ${hoyTarjetaHTML()}
  ${homeGrupsActiusHTML()}
  ${novedadesHTML()}
  ${coberturaAvisosInicioHTML()}
  ${typeof ccAvisoInicioHTML==="function"?ccAvisoInicioHTML():""}
  ${queMeFaltaHTML()}
  ${homeAlertasHTML()}

  ${homeSeccionHeaderHTML("evaluacion","Avaluació i seguiment de l'alumnat")}
  ${homeSecciones.evaluacion?`<div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📊</div>
      <div class="gcard-title">Seguiment i avaluació</div>
      <div class="gcard-meta">Els teus grups (alumnat, activitats, rúbriques, qualificacions i informes) i les programacions d'aula per temes i situacions d'aprenentatge, amb la seua temporització. Inclou les programacions del departament 2026-2027.</div>
      <div class="gcard-count">${nGrupos} grup${nGrupos===1?"":"s"} · ${nAlumnos} alumne${nAlumnos===1?"":"s"} · ${nProgramaciones} programaci${nProgramaciones===1?"ó":"ons"}</div>
      <div class="gcard-actions" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="irModo('competencial')">👥 Grups</button><button class="btn" onclick="irModo('programacion')">📘 Programacions</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🖊️</div>
      <div class="gcard-title">Corrector d'Exàmens</div>
      <div class="gcard-meta">Rúbriques per examen, vinculades a criteris d'avaluació. La nota quantitativa i la qualitativa per criteri es calculen soles i es guarden en Seguiment i avaluació.</div>
      <div class="gcard-count">${nExamenes} ${nExamenes===1?"examen":"exàmens"} amb rúbrica</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('corrector')">Obrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🌈</div>
      <div class="gcard-title">Atenció a la diversitat</div>
      <div class="gcard-meta">NESE (adaptacions, plans de reforç NESE i dossiers) i Repetició i pendents (plans de repetició i de reforç).</div>
      <div class="gcard-count">${nNeseTotal} NESE${nNesePendientes?` (${nNesePendientes} sense pla)`:""} · ${nRepeticionActivos} repetició · ${nRefuerzoActivos} reforç</div>
      <div class="gcard-actions" style="display:flex;flex-wrap:wrap;gap:6px">
        <button class="btn" onclick="irModo('nese')">🧩 NESE</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="irModo('repeticion')">🔁 Repetició</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="irModo('refuerzo')">📈 Reforç</button>
      </div>
    </div>
  </div>`:""}

  ${homeSeccionHeaderHTML("organizacion","Organització")}
  ${homeSecciones.organizacion?`<div class="gcard-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">🗂️</div>
      <div class="gcard-title">Reunions</div>
      <div class="gcard-meta">Registre de reunions amb famílies, alumnat i equip directiu, amb acta imprimible.</div>
      <div class="gcard-count">${nReuniones} reuni${nReuniones===1?"ó":"ons"} registrad${nReuniones===1?"a":"es"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('reuniones')">Obrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📄</div>
      <div class="gcard-title">Memòria de curs</div>
      <div class="gcard-meta">Resultats, assistència, convivència i SdA de tots els teus grups junts, per avaluació o per al curs complet, amb l'evolució de cada grup.</div>
      <div class="gcard-count">${state.grupos.length} grup${state.grupos.length===1?"":"s"}</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('memoria')">Obrir</button></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">👥</div>
      <div class="gcard-title">Gestor de Tutoria</div>
      <div class="gcard-meta">Aplicació a banda, amb les seues pròpies dades. Pot rebre la teua llista d'alumnat i els teus suspesos.</div>
      <div class="gcard-count">S'obri en la seua pròpia carpeta</div>
      <div class="gcard-actions"><a class="btn" href="tutoria/index.html" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center">Obrir</a></div>
    </div>
    <div class="gcard">
      <div style="font-size:28px;margin-bottom:4px">📚</div>
      <div class="gcard-title">Biblioteca</div>
      <div class="gcard-meta">Tots els documents en un sol lloc i amb buscador: programacions, propostes pedagògiques, temporització, material de cada tema (teoria, exercicis, exàmens…), diversitat i els teus enllaços.</div>
      <div class="gcard-count">Material de ${typeof MATERIAL_CURSOS!=="undefined"?Object.keys(MATERIAL_CURSOS).length:0} cursos · ${Object.values((state.documentsInici||{}).enllacos||{}).reduce((a,l)=>a+(l||[]).length,0)} enllaços teus</div>
      <div class="gcard-actions"><button class="btn" onclick="irModo('biblioteca')">Obrir</button></div>
    </div>
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

  <button class="home-seccion-header" onclick="homeToggleAyuda()" aria-expanded="${homeAyudaAbierta}">
    <span class="home-seccion-chevron">${homeAyudaAbierta?"▾":"▸"}</span>
    <span class="section-eyebrow" style="margin:0">Ajuda</span>
  </button>
  ${homeAyudaAbierta?`<div class="card" style="margin-top:0">
    <div class="grid" style="gap:10px">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:13.5px">📖 Guia d'ús</div>
          <p class="sub" style="margin:2px 0 0">Primers passos, rúbriques, còpies de seguretat, paperera i preguntes freqüents (guia original, en castellà).</p>
        </div>
        <a class="btn small" href="guia_mejorada.html" style="text-decoration:none;display:inline-flex;align-items:center;flex-shrink:0">Obrir la guia</a>
      </div>
      <div class="row" style="align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:13.5px">Nota sobre el Gestor de Tutoria</div>
          <p class="sub" style="margin:2px 0 0">Viu en la subcarpeta <code>tutoria/</code> i guarda les seues pròpies dades: el que canvies en Tutoria no modifica el Quadern. Es poden passar dades d'ací a Tutoria de dos maneres: <strong>👥 Per a la tutoria</strong> (en Resultats de cada grup) crea un arxiu amb els teus suspesos per avaluació, que el tutor/a carrega en Tutoria → Gestió del Curs → «Importar suspensos del Cuaderno»; i el botó <strong>📥 Del Cuaderno</strong> de cada grup de Tutoria copia la llista d'alumnat (noms i dates de naixement) d'un grup d'este Quadern, si els dos s'usen en el mateix dispositiu i navegador.</p>
        </div>
      </div>
    </div>
  </div>`:""}
  ${state.ui.agModalFecha ? agRenderModalHTML() : ""}
  ${state.ui.agModalFestivos ? agRenderModalFestivosHTML() : ""}
  ${state.ui.agModalColores ? agRenderModalColoresHTML() : ""}
  ${state.ui.agModalMesGrande ? agModalMesGrandeHTML() : ""}
  ${state.ui.horModalCelda ? horRenderModalHTML() : ""}
  ${state.ui.horModalFranjas ? horFranjasModalHTML() : ""}`;
}

/* Pestanyetes amb els grups del curs: un clic obri el grup amb tot el seu
   (alumnat, activitats, rúbriques, programació vinculada…). */
function homeGrupsActiusHTML(){
  const gs=state.grupos||[];
  const chip=g=>{
    const cat=getCatalogo(g.catalogoKey);
    const prog=typeof progDeGrupo==="function"?progDeGrupo(g):null;
    return `<button class="home-grup" onclick="buscarIrGrupo('${escJS(g.id)}')" title="Obrir el grup ${esc(g.nombre)}">
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
    ${gs.length?`<div class="home-grups">${gs.map(chip).join("")}</div>`
      :`<p class="sub" style="margin:0">Encara no tens grups. Crea'n un amb «+ Nou grup».</p>`}
  </div>`;
}
