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
    return `<div class="gpill ${g.id===state.ui.grupoId?"on":""}">
      <span class="gpillname" onclick="irAGrupo('${g.id}')">${esc(g.nombre)}<span class="mat">${esc(cat.materia)} · ${esc(cat.curso)}</span></span>
      <button class="gpillx" title="Eliminar grup" onclick="borrarGrupoId('${g.id}')">×</button>
    </div>`;
  }).join("") + `<button class="gpill" style="border-style:dashed" onclick="irAGrupo(null)">+ Nou grup</button>
    <label class="gpill file" style="border-style:dashed;cursor:pointer">Importar grup…<input type="file" accept=".json,application/json" style="display:none" onchange="importarGrupoArchivo(this)"></label>`;

  const diasSinCopia = state.lastBackupAt? (Date.now()-state.lastBackupAt)/86400000 : Infinity;
  const cambios = state.cambiosSinCopia||0;
  const copiaUrge = diasSinCopia>7 || cambios>=40 || !state.lastBackupAt;
  const copiaTitulo = state.lastBackupAt?new Date(state.lastBackupAt).toLocaleString('ca-ES'):'Encara no has exportat cap còpia';
  const copiaBadge = copiaUrge
    ? `<button class="tb-copia" onclick="exportarTodo()" title="${copiaTitulo}" aria-label="Convé exportar una còpia de seguretat (última: ${state.lastBackupAt?haceTiempo(state.lastBackupAt):'mai'})" style="border:none;border-radius:20px;padding:4px 11px;font-size:12px;font-weight:600;background:var(--warning-soft);color:var(--warning);border:1px solid var(--warning);cursor:pointer">⚠️<span class="tb-txt"> Convé exportar còpia (${state.lastBackupAt?haceTiempo(state.lastBackupAt):'mai'})</span></button>`
    : `<span class="badge tb-fuera-movil" title="${copiaTitulo}">Còpia: ${haceTiempo(state.lastBackupAt)}</span>`;
  document.getElementById("backupBar").innerHTML = `
    <button class="ghost" style="border:1px solid var(--line)" onclick="irInicio()" aria-label="Inici">🏠<span class="tb-txt"> Inici</span></button>
    ${copiaBadge}
    <span class="badge tb-fuera-movil">Període</span>
    <select class="in" id="trimSel" style="padding:6px 9px" aria-label="Període"></select>
    <button class="ghost tb-fuera-movil" onclick="exportarTodo()">Exportar còpia</button>
    <label class="ghost file tb-fuera-movil">Importar còpia<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>
    <button class="ghost" onclick="abrirCopias()" title="Còpies de seguretat: exportar, importar, còpies automàtiques, PIN" aria-label="Còpies de seguretat">🛟<span class="tb-txt"> Còpies</span></button>
    <button class="ghost" id="btnDeshacer" onclick="deshacer()" ${_pilaDeshacer.length?"":"disabled"} title="Desfer l'últim canvi (Ctrl/Cmd+Z)" aria-label="Desfer l'últim canvi" style="${_pilaDeshacer.length?"":"opacity:.45"}">↶</button>
    <button class="ghost" id="btnRehacer" onclick="rehacer()" ${_pilaRehacer.length?"":"disabled"} title="Refer (Ctrl/Cmd+Maj+Z)" aria-label="Refer" style="${_pilaRehacer.length?"":"opacity:.45"}">↷</button>`;
  const trimSel=document.getElementById("trimSel");
  trimSel.innerHTML=TRIMESTRES.map((t,i)=>`<option value="${i}">${t}</option>`).join("");
  trimSel.value=state.ui.trim;
  trimSel.addEventListener("change",e=>{ state.ui.trim=Number(e.target.value); save(); render(); });
}
function renderShell(){ renderTopBar(); renderMain(); }
function renderCorrectorApp(){ renderTopBar(); renderCorMain(); }
window.irInicio=()=>{ state.ui.appMode="inicio"; save(); render(); };

/* =================================================================
   INICIO — hub de acceso a las tres aplicaciones
   ================================================================= */
window.irModo=modo=>{ state.ui.appMode=modo; save(); render(); };

