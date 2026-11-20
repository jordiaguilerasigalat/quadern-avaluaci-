/* ============================================================================
   Cuaderno del profesor · Barra superior y navegación entre las aplicaciones
   js/ui/barra-superior.js
   ============================================================================ */

function renderTopBar(){
  const h1=document.getElementById("pageH1");
  if(h1){ const t=materiasEtiqueta(); const txt=t==="Quadern d'avaluació"?t:"Quadern · "+t; if(h1.textContent!==txt) h1.textContent=txt; }
  const tabs=document.getElementById("groupTabs");
  tabs.innerHTML = state.grupos.map(g=>{
    const cat=getCatalogo(g.catalogoKey);
    return `<div class="gpill ${g.id===state.ui.grupoId&&state.ui.appMode!=="pendents"?"on":""}" data-ordre-grup="${esc(g.id)}">
      <span class="gpillname" onclick="irAGrupo('${g.id}')">${esc(g.nombre)}<span class="mat">${esc(cat.materia)} · ${esc(cat.curso)}</span></span>
      <button class="gpillx" title="Eliminar grup" onclick="borrarGrupoId('${g.id}')">×</button>
    </div>`;
  }).join("") + pendentsPillHTML() + `<button class="gpill" style="border-style:dashed" onclick="irAGrupo(null)">+ Nou grup</button>
    <label class="gpill file" style="border-style:dashed;cursor:pointer">Importar grup…<input type="file" accept=".json,application/json" style="display:none" onchange="importarGrupoArchivo(this)"></label>`;

  const diasSinCopia = state.lastBackupAt? (Date.now()-state.lastBackupAt)/86400000 : Infinity;
  const cambios = state.cambiosSinCopia||0;
  const copiaUrge = typeof copiaEstat==="function"? copiaEstat().urgeix : (diasSinCopia>7 || cambios>=40 || !state.lastBackupAt);
  const copiaTitulo = state.lastBackupAt?new Date(state.lastBackupAt).toLocaleString('ca-ES'):'Encara no has exportat cap còpia';
  const copiaBadge = copiaUrge
    ? `<button class="tb-copia" onclick="exportarTodo()" title="${copiaTitulo}" aria-label="Convé exportar una còpia de seguretat (última: ${state.lastBackupAt?haceTiempo(state.lastBackupAt):'mai'})" style="border:none;border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;background:var(--warning-soft);color:var(--warning);border:1px solid var(--warning);cursor:pointer">⚠️<span class="tb-txt"> Convé exportar còpia (${state.lastBackupAt?haceTiempo(state.lastBackupAt):'mai'})</span></button>`
    : `<span class="badge tb-fuera-movil" title="${copiaTitulo}">Còpia: ${haceTiempo(state.lastBackupAt)}</span>`;
  document.getElementById("backupBar").innerHTML = `
    <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()" aria-label="Inici">🏠<span class="tb-txt"> Inici</span></button>
    ${copiaBadge}
    <select class="in" id="trimSel" style="padding:6px 9px" aria-label="Període" title="Període (avaluació) amb què treballes"></select>
    <button class="ghost" onclick="abrirCopias()" title="Còpies de seguretat: exportar, importar, còpies automàtiques, PIN" aria-label="Còpies de seguretat">🛟<span class="tb-txt"> Còpies</span></button>
    <button class="ghost" id="btnDeshacer" onclick="deshacer()" ${_pilaDeshacer.length?"":"disabled"} title="Desfer l'últim canvi (Ctrl/Cmd+Z)" aria-label="Desfer l'últim canvi" style="${_pilaDeshacer.length?"":"opacity:.45"}">↶</button>
    <button class="ghost" id="btnRehacer" onclick="rehacer()" ${_pilaRehacer.length?"":"disabled"} title="Refer (Ctrl/Cmd+Maj+Z)" aria-label="Refer" style="${_pilaRehacer.length?"":"opacity:.45"}">↷</button>
    <button class="ghost boto-ajuda" onclick="ajudaObrir()" title="Ajuda: com funciona el quadern" aria-label="Ajuda">?</button>`;
  const trimSel=document.getElementById("trimSel");
  trimSel.innerHTML=TRIMESTRES.map((t,i)=>`<option value="${i}">${t}</option>`).join("");
  trimSel.value=state.ui.trim;
  trimSel.addEventListener("change",e=>{ state.ui.trim=Number(e.target.value); save(); render(); });
}
/* Pestanya «📌 Pendents» al costat dels grups: alumnat amb la matèria pendent
   que no tens este curs (js/alumnado/pendents.js). */
function pendentsPillHTML(){
  if(typeof pdLlista!=="function") return "";
  const n=pdLlista().length;
  return `<div class="gpill ${state.ui.appMode==="pendents"?"on":""}"><span class="gpillname" onclick="irPendents('')" title="Alumnat amb la matèria pendent que no tens este curs">📌 Pendents<span class="mat">${n?n+" alumne"+(n===1?"":"s")+" · per cursos":"no els tinc este curs"}</span></span></div>`;
}
function renderShell(){ renderTopBar(); renderMain(); }
function renderCorrectorApp(){ renderTopBar(); renderCorMain(); }
/* «?»: les explicacions llargues que abans ocupaven Inici. */
window.ajudaObrir=()=>{
  ajudaTancar();
  const div=document.createElement("div");
  div.className="modal-overlay"; div.id="ajudaModal";
  div.onclick=e=>{ if(e.target===div) ajudaTancar(); };
  const bloc=(tit,cos)=>`<div style="padding:10px 0;border-top:1px solid var(--line)"><div style="font-weight:700;font-size:13.5px;margin-bottom:3px">${tit}</div><div class="sub" style="margin:0">${cos}</div></div>`;
  div.innerHTML=`<div class="modal-box" style="max-width:620px">
    <div class="flex" style="justify-content:space-between;align-items:center"><h2 style="font-size:17px;margin:0">❓ Ajuda</h2><button class="modal-close" onclick="ajudaTancar()" aria-label="Tancar">×</button></div>
    <p class="sub" style="margin:8px 0 6px">El teu quadern d'avaluació de Física i Química: programació, seguiment i avaluació, correcció amb rúbriques i el seguiment diari de l'alumnat (assistència, convivència, famílies, reforç, repetició i NESE). Tot compartix el mateix alumnat i les mateixes notes, i tot ix en informes preparats per a imprimir.</p>
    ${bloc("📌 Com està organitzat","<strong>Inici</strong>: el que tens hui (Avui), els teus grups i el que et falta per fer. <strong>Cada grup</strong> té 4 seccions: Alumnat (llista, plànol, assistència, convivència, famílies), Avaluar (programació, diari, activitats, qualificar), Resultats i Ajustos. Toca el nom d'un alumne/a per a obrir la seua fitxa. La <strong>Biblioteca</strong> té tots els documents amb buscador.")}
    ${bloc("🔍 Buscar","El botó Cercar (o Ctrl/Cmd + K) troba alumnat, activitats, exàmens, programacions, reunions i esdeveniments de tots els grups.")}
    ${bloc("🛟 Còpies de seguretat","Les dades es guarden només en este dispositiu: cada ordinador, iPad o mòbil té les seues. Exporta una còpia des de 🛟 Còpies; l'app t'ho recorda en Inici quan fa més de 3 dies o portes 20 canvis sense còpia, i mentre treballes cada 30 canvis. També en fa d'automàtiques dins del dispositiu.")}
    ${bloc("🧾 Sessió d'avaluació","En <strong>Resultats → Notes i informes</strong> tries l'avaluació i tens l'<strong>Acta de la sessió</strong> (mitjanes, suspesos per tema, alumnat amb mesures, faltes i acords) i els <strong>Informes per a les famílies</strong> (una pàgina per alumne/a). L'informe d'un sol alumne/a ix també des de la seua fitxa.")}
    ${bloc("🔁 Repàs i recuperació","En <strong>Avaluar → Programació</strong>, cada tema té el seu <strong>dossier de repàs</strong> en PDF (exercicis i models d'examen d'altres cursos, i una versió adaptada si n'hi ha) i les <strong>fitxes de repàs</strong>: una pàgina per alumne/a amb les seues notes del tema, què ha de reforçar i què ha de fer.")}
    ${bloc("📶 Sense connexió","Afig-la a la pantalla d'inici de l'iPad (Safari → compartir → «Afegir a la pantalla d'inici»). Després d'obrir-la una vegada amb connexió, funciona sense wifi.")}
    ${bloc("🎓 Gestor de Tutoria","Viu en la subcarpeta <code>tutoria/</code> i guarda les seues pròpies dades. Pots passar-li els teus suspesos amb «👥 Per a la tutoria» (en Resultats de cada grup) i la llista d'alumnat amb «📥 Del Cuaderno» des de Tutoria, si les dos s'usen en el mateix navegador.")}
    ${bloc("📖 Guia d'ús",`Primers passos, rúbriques, còpies, paperera i preguntes freqüents. <a href="guia_mejorada.html">Obrir la guia</a>`)}
  </div>`;
  document.body.appendChild(div);
};
window.ajudaTancar=()=>{ const m=document.getElementById("ajudaModal"); if(m) m.remove(); };
document.addEventListener("keydown",e=>{ if(e.key==="Escape") ajudaTancar(); });
window.irInicio=()=>{ state.ui.appMode="inicio"; save(); render(); };

/* =================================================================
   INICIO — hub de acceso a las tres aplicaciones
   ================================================================= */
window.irModo=modo=>{ state.ui.appMode=modo; save(); render(); };

