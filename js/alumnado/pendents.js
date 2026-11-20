/* ============================================================================
   Cuaderno del profesor · Alumnat amb la matèria pendent que no tens este curs
   js/alumnado/pendents.js
   ============================================================================ */

/* Pestanya «📌 Pendents» (al costat de les pestanyes dels grups i en Inici):
   l'alumnat que repetix o té pendent la teua matèria però que este curs no
   està en cap dels teus grups. Cada alumne/a és un pla de repetició normal
   (state.planesRepeticion) marcat amb extern:true, sense grup ni alumne
   vinculat, i amb el grup on està ara i el tutor/a escrits a mà. Així el pla
   es fa, s'imprimix i es busca igual que els altres, i ací s'ordena per cursos. */

function pdLlista(){ return (state.planesRepeticion||[]).filter(p=>p && p.extern); }
function pdCatalogo(p){
  const k=typeof rpCatalogoParaCursoRepite==="function"? rpCatalogoParaCursoRepite(p) : p.cursoRepiteCatalogoKey;
  return k? getCatalogo(k) : null;
}
/* Etiqueta del curs pendent («2n ESO», «1r Batx»…) i l'ordre de les pestanyes. */
function pdCurs(p){ const c=pdCatalogo(p); return (c&&c.curso) || (p.cursoRepite||"").trim() || "Sense curs"; }
function pdMateria(p){ const c=pdCatalogo(p); return c? c.materia : ""; }
function pdOrdreCurs(p){
  const k=typeof rpCatalogoParaCursoRepite==="function"? rpCatalogoParaCursoRepite(p) : p.cursoRepiteCatalogoKey;
  const i=k? ORDEN_CATALOGOS.indexOf(k) : -1;
  if(i>=0) return i;
  return pdCurs(p)==="Sense curs"? 9999 : 500;
}
function pdCursos(){
  const m=new Map();
  pdLlista().forEach(p=>{
    const c=pdCurs(p);
    if(!m.has(c)) m.set(c,{curs:c, ordre:pdOrdreCurs(p), plans:[]});
    const e=m.get(c); e.ordre=Math.min(e.ordre,pdOrdreCurs(p)); e.plans.push(p);
  });
  return [...m.values()].sort((a,b)=>a.ordre-b.ordre || collatorEs.compare(a.curs,b.curs));
}

window.irPendents=curs=>{
  state.ui.appMode="pendents";
  if(curs!==undefined) state.ui.pdCurs=curs;
  save(); render();
};
window.pdSetCurs=c=>{ state.ui.pdCurs=c; save(); render(); };
window.pdObrirPla=id=>rpAbrirDesdeOtroModo(id);
window.pdObrirAfegir=()=>{ state.ui.pdModal=true; save(); render(); };
window.pdTancarAfegir=()=>{ state.ui.pdModal=false; save(); render(); };

function renderPendentsApp(){
  const app=document.getElementById("app");
  const cursos=pdCursos();
  const total=pdLlista().length;
  let sel=state.ui.pdCurs||"";
  if(sel && !cursos.some(c=>c.curs===sel)) sel="";
  const visibles=sel? cursos.filter(c=>c.curs===sel) : cursos;
  const pill=(val,txt,n)=>`<button class="tab ${sel===val?"on":""}" aria-pressed="${sel===val}" onclick="pdSetCurs('${escJS(val)}')">${esc(txt)}${n!==undefined?` <span class="badge" style="margin-left:4px">${n}</span>`:""}</button>`;
  const fila=p=>{
    const info=rpEstadoInfo(p.estado);
    const tr=(p.trimestres||[]).map((t,i)=>{
      const v=t&&t.valoracion? rfrpValoracionPNInfo(t.valoracion) : null;
      const nota=t&&t.calificacion? esc(t.calificacion) : "";
      return `<span class="chip" style="font-size:11.5px;${v&&t.valoracion?`color:${v.color}`:"color:var(--mut)"}" title="${esc(TRIMESTRES[i])}${v&&t.valoracion?": "+esc(v.label):""}">${i+1}a ${nota||(v&&t.valoracion?"●":"—")}</span>`;
    }).join("");
    return `<div class="card pd-fila" style="cursor:pointer;padding:14px 16px" onclick="pdObrirPla('${escJS(p.id)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter') pdObrirPla('${escJS(p.id)}')">
      <div class="flex" style="justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="min-width:0">
          <div style="font-size:15px;font-weight:700">${esc(p.alumnoNombre||"(sense nom)")}</div>
          <div class="sub" style="margin:2px 0 0">${p.grupActual?"Ara a <strong>"+esc(p.grupActual)+"</strong>":"Grup actual sense indicar"}${p.tutor?" · Tutor/a: "+esc(p.tutor):""}</div>
          <div class="sub" style="margin:2px 0 0">Pendent: ${esc(pdMateria(p)||"matèria")} · ${esc(pdCurs(p))}${p.cursoAcademico?" · Curs "+esc(p.cursoAcademico):""}</div>
        </div>
        <div style="text-align:right">
          <span class="pill" style="${pillTinte(info.color)}">${info.label}</span>
          <div class="flex" style="gap:4px;margin-top:8px;justify-content:flex-end">${tr}</div>
        </div>
      </div>
    </div>`;
  };
  const cos = total? visibles.map(c=>`
    <div class="section-eyebrow" style="margin-top:6px">${esc(c.curs)} · ${c.plans.length} alumne${c.plans.length===1?"":"s"}</div>
    <div class="grid" style="gap:8px">${c.plans.slice().sort((a,b)=>collatorEs.compare(a.alumnoNombre||"",b.alumnoNombre||"")).map(fila).join("")}</div>`).join("")
    : `<div class="card" style="text-align:center;padding:34px 18px">
      <div style="font-size:34px;margin-bottom:8px;opacity:.8">📌</div>
      <p class="sub" style="margin:0">Encara no hi ha ningú. Afig l'alumnat que repetix o té pendent la teua matèria i que este curs no està en cap dels teus grups.</p>
      <button class="btn small" style="margin-top:12px" onclick="pdObrirAfegir()">+ Afegir alumne/a</button>
    </div>`;
  app.innerHTML=`
  <div class="card" style="padding:12px 16px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div><strong style="font-size:15px">📌 Pendents</strong><span style="color:var(--mut);font-size:13px"> · alumnat amb la matèria pendent que no tens este curs</span></div>
      <div class="flex" style="gap:6px;flex-wrap:wrap">
        ${total?`<button class="ghost" style="border:1px solid var(--line)" onclick="pdImprimirLlista()">🖨️ Imprimir llistat</button>`:""}
        <button class="btn" onclick="pdObrirAfegir()">+ Afegir alumne/a</button>
      </div>
    </div>
    <p class="sub" style="margin:8px 0 0">Cada alumne/a té el seu pla de repetició (el mateix que en Atenció a la diversitat), però sense grup: escriu on està ara i qui és el tutor/a. Toca el nom per a obrir el pla, marcar les competències no conseguides i posar les notes de cada avaluació.</p>
    ${cursos.length>1?`<div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:10px" role="group" aria-label="Cursos">${pill("","Tots",total)}${cursos.map(c=>pill(c.curs,c.curs,c.plans.length)).join("")}</div>`:""}
  </div>
  ${cos}
  ${state.ui.pdModal?pdModalHTML():""}`;
}

function pdModalHTML(){
  return `<div class="modal-overlay" onclick="if(event.target===this) pdTancarAfegir()">
    <div class="modal-box" style="max-width:480px">
      <div class="flex" style="justify-content:space-between;align-items:flex-start">
        <h2 style="font-size:17px">Afegir alumne/a amb la matèria pendent</h2>
        <button class="modal-close" onclick="pdTancarAfegir()" aria-label="Tancar">×</button>
      </div>
      <p class="sub" style="margin-top:6px">Per a qui repetix o té pendent la teua matèria però este curs no està en cap dels teus grups. Es crea el seu pla de repetició, que després completes amb les competències, les activitats i les notes de cada avaluació.</p>
      <div class="grid" style="gap:12px;margin-top:6px">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Nom i cognoms
          <input class="in" style="width:100%;margin-top:4px" id="pdNom" placeholder="Nom i cognoms de l'alumne/a">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Matèria i curs pendent
          <select class="in" style="width:100%;margin-top:4px" id="pdCatalogo">
            <option value="">— Tria la matèria i el curs —</option>
            ${catalogoSelectOptionsHTML("",null)}
          </select>
        </label>
        <div class="flex">
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Grup on està ara
            <input class="in" style="width:100%;margin-top:4px" id="pdGrup" placeholder="p. ex. 3r ESO B">
          </label>
          <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1">Tutor/a (opcional)
            <input class="in" style="width:100%;margin-top:4px" id="pdTutor" placeholder="Nom del tutor/a">
          </label>
        </div>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Curs acadèmic
          <input class="in" style="width:100%;margin-top:4px" id="pdCursAcad" placeholder="2026-2027" value="${esc((typeof cursoEscolarEfectivo==="function"?cursoEscolarEfectivo(null):"")||"")}">
        </label>
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Model del departament (opcional)
          <select class="in" style="width:100%;margin-top:4px" id="pdModel">
            <option value="">Sense model: pla en blanc</option>
            <option value="2">FiQ 2n ESO</option>
            <option value="3">FiQ 3r ESO</option>
            <option value="4">FiQ 4t ESO</option>
          </select>
        </label>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:18px">
        <button class="ghost" onclick="pdTancarAfegir()">Cancel·lar</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="pdCrear(false)" title="Guarda'l i deixa la finestra oberta per a afegir-ne un altre">Guardar i afegir-ne un altre</button>
        <button class="btn" onclick="pdCrear(true)">Crear i obrir el pla</button>
      </div>
    </div>
  </div>`;
}
/* En triar el curs, proposa el model del departament del mateix nivell. */
document.addEventListener("change",e=>{
  if(!e.target || e.target.id!=="pdCatalogo") return;
  const m=document.getElementById("pdModel"); if(!m || m.dataset.tocat) return;
  const v=e.target.value, n=/^FiQ_([234])ESO$/.exec(v);
  m.value=n? n[1] : "";
});
document.addEventListener("change",e=>{ if(e.target && e.target.id==="pdModel") e.target.dataset.tocat="1"; });

window.pdCrear=obrir=>{
  const nom=(document.getElementById("pdNom").value||"").trim();
  if(!nom){ mostrarAviso("Escriu el nom de l'alumne/a."); document.getElementById("pdNom").focus(); return; }
  const key=document.getElementById("pdCatalogo").value;
  const cat=key? getCatalogo(key) : null;
  const model=document.getElementById("pdModel").value;
  const p={ id:uid(), extern:true, grupoId:"", alumnoId:"", alumnoNombre:nom,
    grupActual:(document.getElementById("pdGrup").value||"").trim(),
    tutor:(document.getElementById("pdTutor").value||"").trim(),
    cursoRepite:cat?cat.curso:"", cursoRepiteCatalogoKey:key||"",
    cursoAcademico:(document.getElementById("pdCursAcad").value||"").trim(),
    motivos:rfrpMotivosDefault(), medidasNivelII:rpMedidasDefault(RP_MEDIDAS_II), medidasNivelIII:rpMedidasDefault(RP_MEDIDAS_III),
    fechaInicio:agHoyStr(), estado:"activo", trimestres:rfrpTrimestresIniciales(model), valoracionFinal:"",
    observacionesFinales:"", planOrigenId:"", planOrigenTipo:"" };
  if(!Array.isArray(state.planesRepeticion)) state.planesRepeticion=[];
  state.planesRepeticion.push(p);
  if(obrir){
    state.ui.pdModal=false; state.ui.rpTornar="pendents";
    state.ui.appMode="repeticion"; state.ui.rpTab="detalle"; state.ui.rpId=p.id;
    save(); render();
  }else{
    save(); render();
    mostrarToast("✓ "+nom+" afegit/da");
    const n=document.getElementById("pdNom"); if(n) n.focus();
  }
};

/* Bloc del detall del pla per a l'alumnat extern: grup actual i tutor/a
   editables, i l'opció d'enllaçar-lo a un grup teu si l'acabes tenint. */
function pdDetallExternHTML(p){
  return `<div class="alert-box" style="align-items:flex-start;flex-direction:column;gap:8px;margin-top:14px">
    <div>📌 <strong>${esc(p.alumnoNombre||"Sense nom")}</strong> té la matèria pendent i este curs no està en cap dels teus grups.</div>
    <div class="flex" style="width:100%;flex-wrap:wrap">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:160px">Nom i cognoms
        <input class="in" style="width:100%;margin-top:4px" id="pdDNom" value="${esc(p.alumnoNombre||"")}">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:140px">Grup on està ara
        <input class="in" style="width:100%;margin-top:4px" id="pdDGrup" value="${esc(p.grupActual||"")}" placeholder="p. ex. 3r ESO B">
      </label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:140px">Tutor/a
        <input class="in" style="width:100%;margin-top:4px" id="pdDTutor" value="${esc(p.tutor||"")}" placeholder="Nom del tutor/a">
      </label>
    </div>
    ${state.grupos.length?`<details style="width:100%"><summary class="sub" style="cursor:pointer;margin:0">Ara el tinc en un dels meus grups…</summary>
      <div class="flex" style="width:100%;margin-top:8px">
        <select class="in" id="rpReasignGrupo" style="flex:1" onchange="rpRefrescarReasignAlumno()">
          <option value="">Tria un grup…</option>
          ${state.grupos.map(g=>`<option value="${g.id}">${esc(g.nombre)}</option>`).join("")}
        </select>
        <span id="rpReasignAlumnoWrap" style="flex:1"></span>
        <button class="btn small" onclick="rpConfirmarReasignacion('${p.id}')">Enllaçar</button>
      </div>
    </details>`:""}
  </div>`;
}
function pdDetallExternLligar(p){
  const camp=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener("change",e=>{ fn(e.target.value.trim()); save(); }); };
  camp("pdDNom",v=>{ if(v) p.alumnoNombre=v; });
  camp("pdDGrup",v=>p.grupActual=v);
  camp("pdDTutor",v=>p.tutor=v);
}

/* Llistat per a imprimir (per cursos), per a la sessió d'avaluació o el
   departament. */
window.pdImprimirLlista=()=>{
  const cursos=pdCursos();
  const val=t=>{ if(!t) return "—"; const v=t.valoracion? rfrpValoracionPNInfo(t.valoracion) : null; return esc(t.calificacion||"")+(v&&t.valoracion?(t.calificacion?" · ":"")+esc(v.label):"")||"—"; };
  const body=`<h1>Alumnat amb la matèria pendent</h1>
    <div class="meta">${esc(typeof profesorNombreEfectivo==="function"?profesorNombreEfectivo(null)||"":"")} · Generat el ${new Date().toLocaleDateString("ca-ES")}</div>
    ${cursos.map(c=>`<h2>${esc(c.curs)}</h2>
      <table><tr><th>Alumne/a</th><th>Grup actual</th><th>Tutor/a</th><th>Estat</th><th>${esc(TRIMESTRES[0])}</th><th>${esc(TRIMESTRES[1])}</th><th>${esc(TRIMESTRES[2])}</th></tr>
      ${c.plans.slice().sort((a,b)=>collatorEs.compare(a.alumnoNombre||"",b.alumnoNombre||"")).map(p=>`<tr><td>${esc(p.alumnoNombre||"")}</td><td>${esc(p.grupActual||"—")}</td><td>${esc(p.tutor||"—")}</td><td>${esc(rpEstadoInfo(p.estado).label)}</td>${[0,1,2].map(i=>`<td>${val((p.trimestres||[])[i])}</td>`).join("")}</tr>`).join("")}
      </table>`).join("")}`;
  abrirVentanaInforme("Alumnat amb la matèria pendent", body);
};
