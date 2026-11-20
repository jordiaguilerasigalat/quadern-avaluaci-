/* ============================================================================
   Quadern d'avaluació · Recordatoris de còpia de seguretat
   js/nucleo/recordatori-copia.js

   Les dades viuen només en el navegador de cada dispositiu (ordinador, iPad,
   mòbil): si s'esborren les dades del navegador o es canvia de dispositiu,
   només es recuperen amb una còpia exportada. Per això l'app ho recorda més:
     - targeta en Inici quan fa més de COPIA_DIES_AVIS dies o hi ha més de
       COPIA_CANVIS_AVIS canvis sense còpia («Recorda-m'ho demà» l'amaga fins
       l'endemà, només en este dispositiu);
     - barra flotant mentre treballes cada COPIA_CANVIS_BARRA canvis nous;
     - el botó groc de la barra superior ix abans (mateixos llindars).
   La còpia automàtica en carpeta (copia-carpeta.js) també compta com a còpia.
   ============================================================================ */
const COPIA_DIES_AVIS=3;
const COPIA_CANVIS_AVIS=20;
const COPIA_CANVIS_BARRA=30;
const COPIA_CLAU_AJORNAT="quadern_copiaAjornada";

function copiaEstat(){
  const dies=state.lastBackupAt? (Date.now()-state.lastBackupAt)/86400000 : Infinity;
  const canvis=state.cambiosSinCopia||0;
  return {dies,canvis,urgeix: !state.lastBackupAt || dies>COPIA_DIES_AVIS || canvis>=COPIA_CANVIS_AVIS};
}
function _copiaAjornadaFins(){ try{ return Number(localStorage.getItem(COPIA_CLAU_AJORNAT))||0; }catch(e){ return 0; } }
window.copiaAjornar=()=>{
  const dema=new Date(); dema.setHours(24,0,0,0);
  try{ localStorage.setItem(COPIA_CLAU_AJORNAT,String(dema.getTime())); }catch(e){}
  copiaTancarBarra(); render();
};
function _copiaHiHaDades(){
  try{ return resumenEstado(state).total>0; }catch(e){ return (state.grupos||[]).length>0; }
}
function copiaTextDies(){
  return state.lastBackupAt? `L'última còpia exportada és de ${haceTiempo(state.lastBackupAt)}` : "Encara no has exportat cap còpia des d'este dispositiu";
}
/* Targeta d'Inici. */
function copiaRecordatoriHTML(){
  if(!_copiaHiHaDades()) return "";
  const e=copiaEstat();
  if(!e.urgeix || Date.now()<_copiaAjornadaFins()) return "";
  return `<div class="card copia-recordatori" role="status" style="border:2px solid var(--warning);background:var(--warning-soft)">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div style="flex:1;min-width:240px">
        <div style="font-weight:700;font-size:14px;color:var(--warning)">🛟 Toca fer una còpia de seguretat</div>
        <div style="font-size:13px;margin-top:3px">${esc(copiaTextDies())}${e.canvis?` i hi ha <strong>${e.canvis} canvi${e.canvis===1?"":"s"}</strong> sense copiar`:""}.
          Les dades es guarden <strong>només en este navegador</strong>: cada ordinador, iPad o mòbil té les seues. Si s'esborren les dades del navegador o canvies de dispositiu, només les recuperes amb una còpia.</div>
      </div>
      <div class="flex" style="gap:6px;flex-wrap:wrap">
        <button class="btn" onclick="exportarTodo()">⬇ Exportar còpia ara</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="copiaAjornar()">Recorda-m'ho demà</button>
      </div>
    </div>
  </div>`;
}
/* Barra flotant mentre es treballa: cada COPIA_CANVIS_BARRA canvis sense còpia. */
let _copiaBarraUltima=0;
function copiaComprovarCanvis(){
  const n=state.cambiosSinCopia||0;
  if(n<COPIA_CANVIS_BARRA || n-_copiaBarraUltima<COPIA_CANVIS_BARRA) return;
  if(n%COPIA_CANVIS_BARRA!==0) return;
  if(Date.now()<_copiaAjornadaFins() || document.getElementById("copiaBarra")) return;
  _copiaBarraUltima=n;
  const bar=document.createElement("div");
  bar.id="copiaBarra"; bar.setAttribute("role","status");
  bar.style.cssText="position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:60;max-width:calc(100% - 32px);background:#8a5a12;color:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:13.5px;display:flex;gap:10px;align-items:center;flex-wrap:wrap";
  bar.innerHTML=`<span>🛟 Portes ${n} canvis sense còpia. ${state.lastBackupAt?"Última còpia: "+esc(haceTiempo(state.lastBackupAt))+".":"Encara no n'has fet cap."}</span>
    <button onclick="copiaTancarBarra();exportarTodo()" style="background:#fff;color:#333;border:none;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer">Exportar còpia</button>
    <button onclick="copiaTancarBarra()" aria-label="Ara no" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:6px;padding:6px 10px;cursor:pointer">Ara no</button>`;
  document.body.appendChild(bar);
  setTimeout(copiaTancarBarra,20000);
}
function copiaTancarBarra(){ const b=document.getElementById("copiaBarra"); if(b) b.remove(); }
window.copiaTancarBarra=copiaTancarBarra;
