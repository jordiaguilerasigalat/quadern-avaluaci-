/* ============================================================================
   Quadern d'avaluació · Pantalla de bienvenida y conservación de scroll
   js/ui/bienvenida.js
   ============================================================================ */

/* =================================================================
   Pantalla de bienvenida
   Se muestra siempre al abrir o recargar la app (no se guarda en el
   estado ni depende de en qué pantalla se quedó la última vez). El
   botón «Entrar» lleva siempre a Inicio; «Abrir archivo» reutiliza el
   importador de copias de seguridad ya existente.
   ================================================================= */
let _mostrarBienvenida=true;
window.entrarDesdeBienvenida=()=>{ _mostrarBienvenida=false; state.ui.appMode="inicio"; save(); render(); };
function _bienvenidaSaludo(){
  const h=new Date().getHours();
  if(h<6) return "Bona nit";
  if(h<12) return "Bon dia";
  if(h<20) return "Bona vesprada";
  return "Bona nit";
}
window._bienvenidaSoltarArchivo=e=>{
  e.preventDefault();
  if(e.currentTarget) e.currentTarget.classList.remove("bienvenida-sobre");
  const file=e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(!file) return;
  if(!/\.json$/i.test(file.name)){ mostrarAviso("Arrossega un arxiu .json de còpia de seguretat."); return; }
  _procesarArchivoCopiaJSON(file,null);
};
document.addEventListener("keydown",e=>{
  if(_mostrarBienvenida && e.key==="Enter") entrarDesdeBienvenida();
});
function renderBienvenidaHTML(){
  const r=resumenEstado(state);
  const hayDatos=r.total>0;
  const diasSinCopia=state.lastBackupAt?(Date.now()-state.lastBackupAt)/86400000:Infinity;
  const avisoCopia=hayDatos && diasSinCopia>(typeof COPIA_DIES_AVIS==="number"?COPIA_DIES_AVIS:7);
  const avisoTexto=state.lastBackupAt
    ?`Fa temps que no exportes una còpia externa (${haceTiempo(state.lastBackupAt)}). Conserva-la fora d'este dispositiu des de 🛟 Còpies.`
    :"Encara no has exportat cap còpia de seguretat a un arxiu. Fes-ho des de 🛟 Còpies tan bon punt entres.";
  const botonEntrar=`<button class="btn" onclick="entrarDesdeBienvenida()">Entrar →</button>`;
  const botonAbrir=`<label class="file">📂 Obrir arxiu…<input type="file" accept="application/json,.json" style="display:none" onchange="importarTodo(this)"></label>`;
  return `<div class="bienvenida-wrap" ondragover="event.preventDefault();this.classList.add('bienvenida-sobre')" ondragleave="this.classList.remove('bienvenida-sobre')" ondrop="_bienvenidaSoltarArchivo(event)">
    <div class="bienvenida-emblema">🗂️</div>
    <div class="bienvenida-eyebrow">${_bienvenidaSaludo()} · Física i Química · Avaluació</div>
    <h1 class="bienvenida-title">Quadern d'avaluació</h1>
    <p class="bienvenida-tag">Programació d'aula, avaluació per competències, correcció amb rúbriques i el seguiment diari del teu alumnat de Física i Química, tot en un mateix lloc, sense comptes i sense connexió.</p>
    ${hayDatos?`<div class="bienvenida-resumen">📊 ${esc(r.texto)}</div>`:""}
    <div class="bienvenida-botones${hayDatos?"":" nuevo"}">
      ${hayDatos?botonEntrar+botonAbrir:botonAbrir+botonEntrar}
    </div>
    ${avisoCopia?`<p class="bienvenida-aviso">⚠️ ${avisoTexto}</p>`:""}
    <p class="bienvenida-nota">${hayDatos?"«Obrir arxiu» substituïx les dades d'este dispositiu per les de la còpia (.json) que tries; abans es guarda una còpia de seguretat automàtica del que hi ha. També pots arrossegar-la ací.":"Véns d'un altre dispositiu? Arrossega ací la teua còpia de seguretat (.json) o usa «Obrir arxiu» per a carregar-la i continuar on ho vas deixar."}</p>
  </div>`;
}
