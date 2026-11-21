/* ============================================================================
   Cuaderno del profesor · Ajustes del grupo
   js/ajustes/ajustes-grupo.js
   ============================================================================ */

window.setRedondeoActa=v=>{
  if(!state.ajustesNota) state.ajustesNota={};
  state.ajustesNota.redondeoActa=v; save(); render();
  mostrarToast("✓ Regla de redondeo actualizada en todos los grupos");
};
function renderAjustes(grupo){
  const idx=catIndex(grupo.catalogoKey);
  const c=document.getElementById("tabContent");
  c.innerHTML=`
  <div class="card">
    <h2>Datos del grupo</h2>
    <div class="flex">
      <input class="in" id="gpNombre" value="${esc(grupo.nombre)}" style="min-width:220px">
      <button class="btn" onclick="renombrarGrupo()">Guardar el nom</button>
      <button class="ghost" onclick="duplicarGrupo()">Duplicar estructura (sin alumnado)</button>
      <button class="ghost" onclick="exportarGrupo()">Exportar solo este grupo (.json)</button>
      <button class="btn danger" onclick="borrarGrupo()">Eliminar este grupo</button>
    </div>
    ${!CATALOGOS[grupo.catalogoKey] ? (()=>{
      const altres=state.grupos.filter(g=>g.id!==grupo.id && g.catalogoKey===grupo.catalogoKey).length;
      return `<div class="flex" style="margin-top:10px">
      <input class="in" id="gpMateria" value="${esc(idx.cat.materia||"")}" placeholder="Matèria" aria-label="Matèria" style="min-width:220px">
      <input class="in" id="gpCurso" value="${esc(idx.cat.curso||"")}" placeholder="Curs" aria-label="Curs" style="min-width:160px">
      <button class="btn" onclick="renombrarMateriaGrupo()">Guardar matèria i curs</button>
    </div>${altres?`<p class="sub" style="margin:6px 0 0">També canviarà en ${altres===1?"l'altre grup":`els altres ${altres} grups`} d'esta matèria.</p>`:""}`;
    })() : ""}
  </div>

  <div class="card">
    <h2>Programación de Aula vinculada</h2>
    <p class="sub">Al vincular una Programación, en Actividades eliges de ahí las actividades ya planificadas (con sus criterios) en vez de crearlas sueltas, y el Diario permite enlazar cada entrada a su Situación de Aprendizaje.</p>
    ${(() => {
      const opciones=(state.programaciones||[]).filter(p=>p.catalogoKey===grupo.catalogoKey);
      return `<div class="flex" style="align-items:center">
        <select class="in" id="gpProgramacion" style="min-width:240px" onchange="setProgramacionGrupo(this.value)">
          <option value="">— Ninguna —</option>
          ${opciones.map(p=>`<option value="${p.id}" ${grupo.programacionId===p.id?"selected":""}>${esc(p.nombre)}</option>`).join("")}
        </select>
        ${!opciones.length?`<span class="sub" style="margin:0">No tienes ninguna Programación de ${esc(idx.cat.materia)} · ${esc(idx.cat.curso)} todavía.</span>`:""}
        <button class="ghost" style="border:1px solid var(--line)" onclick="irAProgramacion()">📘 Ir a Programación de Aula</button>
      </div>`;
    })()}
  </div>

  <div class="card">
    <h2>Redondeo de la nota de acta</h2>
    <p class="sub">La calificación oficial (Insuficiente…Sobresaliente, aprobado/suspenso) sale siempre de la <strong>nota de acta</strong>, entera y sin decimales, como en ITACA. Aquí eliges cómo se pasa de la media con decimales a esa nota. Se aplica a <strong>todos tus grupos</strong>. En ESO la nota mínima de acta es 1; en Bachillerato, 0.</p>
    <select class="in" style="min-width:260px;max-width:100%" onchange="setRedondeoActa(this.value)" aria-label="Regla de redondeo de la nota de acta">
      ${REDONDEO_MODOS.map(m=>`<option value="${m.id}" ${modoRedondeoActa()===m.id?"selected":""}>${esc(m.label)}</option>`).join("")}
    </select>
  </div>

  <div class="card">
    <h2>Ponderación de la nota final entre evaluaciones</h2>
    <p class="sub">Pesos relativos entre 1ª, 2ª y 3ª evaluación para calcular la nota final. En blanco = reparto equitativo entre las evaluaciones que ya tengan datos. Súbelo, por ejemplo, si la 3ª evaluación debe contar más que las anteriores.</p>
    <div class="flex">
      ${[0,1,2].map(t=>`
        <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px">${TRIMESTRES[t]}
          <input class="in" style="width:100px" type="number" min="0" placeholder="auto" value="${grupo.pesosTrim[t]??''}" oninput="setPesoTrim(${t},this.value)"></label>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Fechas de cada evaluación</h2>
    <p class="sub">Marca cuándo empieza y termina cada trimestre. Se usa para poder filtrar la Asistencia y la Convivencia por evaluación en la pestaña Resumen.</p>
    <style>@media(max-width:460px){.ajustesFechasGrid{grid-template-columns:1fr!important}}</style>
    <div class="ajustesFechasGrid" style="display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:12px">
      ${[0,1,2].map(t=>`
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <span style="font-size:13px;font-weight:600">${TRIMESTRES[t]}</span>
          <label style="font-size:12px;color:var(--mut)">Inicio
            <input type="date" class="in" style="width:100%;margin-top:2px" value="${grupo.fechasTrimestre[t].inicio||''}" onchange="setFechaTrimestre(${t},'inicio',this.value)">
          </label>
          <label style="font-size:12px;color:var(--mut)">Fin
            <input type="date" class="in" style="width:100%;margin-top:2px" value="${grupo.fechasTrimestre[t].fin||''}" onchange="setFechaTrimestre(${t},'fin',this.value)">
          </label>
        </div>`).join("")}
    </div>
    ${state.grupos.some(g=>g.id!==grupo.id)?`<div class="flex" style="margin-top:10px"><button class="ghost" onclick="obrirCopiarDates()">📋 Copiar a altres grups</button></div>`:""}
  </div>

  ${(()=>{
    /* Mode de qualificació + dues columnes: blocs (esquerra) i competències (dreta).
       Amagar una columna és només visual: no canvia el mode ni cap nota. */
    const ambdues=teQualitativaCE(grupo), modo=modoNotaGrupo(grupo);
    const amagat=((state.ui||{}).mqAmagat||{})[grupo.id]||"";
    const veuBlocs=amagat!=="blocs", veuCE=amagat!=="ce";
    const etiqBlocs=ambdues?"Nota quantitativa · la de l'acta":modo==="ce"?"Ara no compta (el grup qualifica per competències)":"Dona la nota";
    const etiqCE=ambdues?`Qualificació per competències · ${escalaQual(grupo).map(x=>x.abr||x.nom).join(", ")}`:modo==="ce"?"Dona la nota":"Ara no compta: tria «Les dues» per a tindre-la també";
    const colBlocs=`
      <section class="mqCol" aria-label="Qualificació per blocs">
        <div class="mqCap"><div><h3>Per blocs (instruments)</h3><span class="pill mqEtiq">${etiqBlocs}</span></div>
          <button class="ghost small" onclick="mqAmagar('blocs')" title="Amagar esta columna (només la vista: les notes no canvien)" aria-label="Amagar la qualificació per blocs">Amagar ✕</button></div>
        <p class="sub">Mitjana ponderada dels blocs de la proposta pedagògica de ${esc(idx.cat.materia)}. Han de sumar 100.</p>
        <p id="sumaBloquesAviso" style="font-size:13px;margin:0 0 8px">${sumaBloquesHTML(grupo)}</p>
        <div class="flex">
          ${grupo.bloques.map((b,i)=>{ const nAct=(grupo.actividades||[]).filter(x=>typeof actEnBloque==="function"? actEnBloque(x,b.id) : x.bloqueId===b.id).length; return `
            <div class="blocPes${b.inactiu?" blocInactiu":""}" style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px;max-width:240px">
              <span style="display:flex;align-items:center;gap:4px">${esc(b.label)} (%)
                <button class="ghost small" style="padding:0 4px;border:0" title="Canviar el nom del bloc" aria-label="Canviar el nom del bloc ${esc(b.label)}" onclick="blocReanomenar(${i})">✏️</button>
                ${grupo.bloques.length>1?`<button class="ghost small" style="padding:0 4px;border:0" title="Eliminar el bloc" aria-label="Eliminar el bloc ${esc(b.label)}" onclick="blocEliminar(${i})">🗑️</button>`:""}</span>
              <input class="in" type="number" min="0" max="100" step="any" value="${b.peso}" aria-label="Pes del bloc ${esc(b.label)} (%)" oninput="setBloqueW(${i},this.value)" ${b.inactiu?'style="opacity:.55"':""}>
              <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;cursor:pointer" title="Desactivat, el bloc no compta en la nota però es guarden el pes i les activitats"><input type="checkbox" ${b.inactiu?"":"checked"} onchange="blocActivar(${i},this.checked)"> ${b.inactiu?"<strong>Desactivat:</strong> no compta":"Compta en la nota"}</label>
              <span class="sub" style="font-size:11.5px">${nAct} activitat${nAct===1?"":"s"}${!b.inactiu&&!(Number(b.peso)>0)?" · amb 0 % no compta":""}</span>
            </div>`; }).join("")}
        </div>
        <button class="ghost" style="border:1px dashed var(--line);margin-top:10px" onclick="blocAfegir()">+ Afegir un bloc (p. ex. Deures)</button>
      </section>`;
    const colCE=`
      <section class="mqCol" aria-label="Qualificació per competències">
        <div class="mqCap"><div><h3>Per competències específiques</h3><span class="pill mqEtiq">${etiqCE}</span></div>
          <button class="ghost small" onclick="mqAmagar('ce')" title="Amagar esta columna (només la vista: les notes no canvien)" aria-label="Amagar la qualificació per competències">Amagar ✕</button></div>
        <p class="sub">Cada criteri és la mitjana de les seues evidències, cada CE la mitjana dels seus criteris i la nota, la mitjana ponderada de les CE (cada avaluació amb tot el que s'ha treballat fins a eixe moment; la final, amb tot el curs).</p>
        ${ambdues?`<p class="sub">La qualitativa ix de les qualificacions de cada <strong>criteri</strong> (també en els exàmens: la nota numèrica de l'examen va a la quantitativa i la de cada criteri, a la qualitativa).</p>`:""}
        <p class="sub" style="margin-bottom:6px">Pes de cada CE (%). En blanc = repartiment igual. Si una CE no té cap criteri avaluat, el seu pes es reparteix entre la resta.</p>
        <p id="sumaPesosCEAviso" style="font-size:13px;margin:0 0 8px">${sumaPesosCEHTML(grupo)}</p>
        <div class="flex">
          ${idx.cat.ces.map(ce=>`
            <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px" title="${esc(ce.titulo)}">${esc(ce.id)} (%)
              <input class="in" style="width:90px" type="number" min="0" placeholder="${fmt(pesoCEGrupo({...grupo,pesosCE:{}},ce.id))}" value="${grupo.pesosCE[ce.id]??''}" oninput="setPesoCE('${escJS(ce.id)}',this.value)"></label>`).join("")}
        </div>
      </section>`;
    const barra=(qui,text)=>`<button class="mqMostrar" onclick="mqMostrar('${qui}')" aria-label="Mostrar ${text}">👁 Mostrar ${text} <span class="sub" style="margin:0;font-weight:400">(amagada només a la vista: la nota es continua calculant)</span></button>`;
    return `
  <div class="card">
    <h2>Mode de qualificació</h2>
    <p class="sub">Tria quina nota dona este grup. <strong>Les dues</strong>: es calculen per separat i de manera independent la nota per blocs (quantitativa, la de l'acta) i la nota per competències (qualitativa). Els botons «Amagar» només amaguen la columna de la pantalla: no canvien cap nota.</p>
    <div class="flex" role="radiogroup" aria-label="Mode de qualificació">
      <label style="display:flex;gap:6px;align-items:center"><input type="radio" name="modoNota" value="ambdues" ${ambdues?"checked":""} onchange="setModoNota(this.value)"> Les dues, independents</label>
      <label style="display:flex;gap:6px;align-items:center"><input type="radio" name="modoNota" value="bloques" ${modo==="bloques"&&!ambdues?"checked":""} onchange="setModoNota(this.value)"> Només per blocs</label>
      <label style="display:flex;gap:6px;align-items:center"><input type="radio" name="modoNota" value="ce" ${modo==="ce"?"checked":""} onchange="setModoNota(this.value)"> Només per competències</label>
    </div>
    ${!veuBlocs?barra("blocs","la qualificació per blocs"):""}${!veuCE?barra("ce","la qualificació per competències"):""}
    <div class="mqCols${veuBlocs&&veuCE?"":" mqUna"}">${veuBlocs?colBlocs:""}${veuCE?colCE:""}</div>
  </div>`;
  })()}

  ${escalaQualAjustosHTML(grupo)}

  <div class="card">
    <h2>Cortes de las escalas cualitativas</h2>
    <p class="sub">Percentatge mínim de cada nivell. Per davall d’«En procés» → Necessita millorar.</p>
    <div class="flex">
      ${[["excelente","Excel·lent ≥"],["adecuado","Adequat ≥"],["enProceso","En procés ≥"]].map(([k,l])=>`
        <label style="font-size:13.5px;color:var(--mut);display:flex;flex-direction:column;gap:4px">${l}
          <input class="in" style="width:100px" type="number" value="${grupo.umbrales[k]}" oninput="setUmbral('${k}',this.value)"></label>`).join("")}
    </div>
  </div>

  <div class="card">
    <h2>Peso de cada competencia específica dentro de su competencia clave</h2>
    <p class="sub">Pesos relativos: se normalizan solos. En blanco = reparto equitativo.</p>
    ${Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>`
      <div style="margin-bottom:12px">
        <div style="font-size:13.5px;font-weight:500;margin-bottom:6px">${cc} · ${COMP_CLAVE[cc]}</div>
        <div class="flex">${idx.cat.ces.filter(ce=>ce.cc.includes(cc)).map(ce=>`
          <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">${ce.id}
            <input class="in miniw" type="number" placeholder="${pesoCEenCC(grupo,ce.id,cc).toFixed(0)}" value="${grupo.pesos.ceCc[ce.id+'|'+cc]??''}" oninput="setCeCc('${ce.id}','${cc}',this.value)"></label>`).join("")}</div>
      </div>`).join("")}
  </div>

  <div class="card">
    <h2>Peso de cada criterio dentro de su competencia específica</h2>
    <p class="sub">En blanco = reparto equitativo entre los criterios de cada CE.</p>
    ${idx.cat.ces.map(ce=>`
      <div style="margin-bottom:12px">
        <div style="font-size:13.5px;font-weight:500;margin-bottom:6px">${ce.id} · ${esc(ce.titulo)}</div>
        <div class="flex">${ce.criterios.map(cr=>`
          <label style="font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:5px">${cr.id}
            <input class="in miniw" type="number" placeholder="${pesoCriterio(grupo,cr.id).toFixed(0)}" value="${grupo.pesos.crit[cr.id]??''}" oninput="setCrit('${cr.id}',this.value)"></label>`).join("")}</div>
      </div>`).join("")}
  </div>`;
  document.getElementById("gpNombre").addEventListener("keydown",e=>{ if(e.key==="Enter") renombrarGrupo(); });
  ["gpMateria","gpCurso"].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener("keydown",e=>{ if(e.key==="Enter") renombrarMateriaGrupo(); }); });
}
/* Grups d'altres matèries o importades: corregir el nom de la matèria i el curs
   (es canvia en la plantilla, sense tocar-ne la clau, així que els grups que la
   comparteixen continuen enllaçats). Les plantilles oficials de FiQ no s'editen ací. */
window.renombrarMateriaGrupo=()=>{
  const grupo=grupoActual(); const key=grupo.catalogoKey;
  if(CATALOGOS[key] || !state.catalogosPersonalizados || !state.catalogosPersonalizados[key]) return;
  const m=document.getElementById("gpMateria").value.trim(), c=document.getElementById("gpCurso").value.trim();
  if(!m) return;
  const cat=state.catalogosPersonalizados[key]; cat.materia=m; cat.curso=c||"—";
  delete CAT_CACHE[key];
  save(); render(); mostrarToast("✓ Matèria i curs guardats");
};
window.renombrarGrupo=()=>{ const grupo=grupoActual(); const v=document.getElementById("gpNombre").value.trim(); if(v){ grupo.nombre=v; save(); repintarGrupQuiet(); } };
window.duplicarGrupo=async ()=>{
  const grupo=grupoActual();
  const nombre=await pedirTexto("Nom per al grup nou:", grupo.nombre+" (còpia)");
  if(!nombre||!nombre.trim()) return;
  const nuevo=defGrupo(nombre.trim(),grupo.catalogoKey);
  nuevo.pesos=JSON.parse(JSON.stringify(grupo.pesos));
  nuevo.umbrales={...grupo.umbrales};
  if(Array.isArray(grupo.escalaQual)) nuevo.escalaQual=grupo.escalaQual.map(x=>({...x}));
  nuevo.pesosTrim={...grupo.pesosTrim};
  nuevo.bloques=grupo.bloques.map(b=>({...b}));
  nuevo.modoNota=grupo.modoNota; nuevo.pesosCE={...(grupo.pesosCE||{})};
  nuevo.actividades=grupo.actividades.map(a=>{
    const copia={...a,id:uid(),criterios:a.criterios.map(l=>({...l}))};
    if(a.rubrica) copia.rubrica=JSON.parse(JSON.stringify(a.rubrica));
    // El grupo nuevo no tiene alumnado: las rúbricas adaptadas se copian sin alumnos asignados.
    if(a.variantes) copia.variantes=JSON.parse(JSON.stringify(a.variantes)).map(v=>({...v,alumnos:[]}));
    return copia;
  });
  state.grupos.push(nuevo);
  state.ui.grupoId=nuevo.id; state.ui.tab="alumnos";
  save(); render();
  mostrarAviso(`Grup «${nuevo.nombre}» creat amb la mateixa configuració i ${nuevo.actividades.length} activitat${nuevo.actividades.length===1?"":"s"}. Afig ara el seu alumnat.`);
};
window.exportarGrupo=()=>{
  const grupo=grupoActual();
  const blob=new Blob([JSON.stringify({grupos:[grupo]},null,2)],{type:"application/json"});
  const u=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=u; a.download="grupo-"+grupo.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-"+fechaISOLocal()+".json"; a.click(); URL.revokeObjectURL(u);
};
window.importarGrupoArchivo=inp=>{
  const file=inp.files[0]; if(!file) return;
  const rd=new FileReader();
  rd.onload=()=>{
    let datos;
    try{ datos=JSON.parse(rd.result); }
    catch(e){ mostrarAviso("El archivo no es un JSON válido."); inp.value=""; return; }
    const original = datos && Array.isArray(datos.grupos) && datos.grupos[0] ? datos.grupos[0] : null;
    if(!original){ mostrarAviso("Este archivo no parece ser un grupo exportado desde esta aplicación."); inp.value=""; return; }
    if(idsNoValidos(original).length){ mostrarAviso(AVISO_IDS_NO_VALIDOS); inp.value=""; return; }
    if(!CATALOGOS[original.catalogoKey] && !(state.catalogosPersonalizados||{})[original.catalogoKey]){
      mostrarAviso("Este grupo es de una materia/curso que no existe en tu catálogo — no se puede importar.");
      inp.value=""; return;
    }
    // Se importa como un grupo NUEVO e independiente: id propio (los de sus
    // alumnos se mantienen, ya que solo se referencian dentro de este mismo
    // grupo). Si venía vinculado a una Programación de Aula que no tienes
    // (las Programaciones no viajan con el grupo), se desvincula sin más.
    const copia=JSON.parse(JSON.stringify(original));
    copia.id=uid();
    copia.nombre=original.nombre+" (importado)";
    if(copia.programacionId && !progPorId(copia.programacionId)) copia.programacionId="";
    normalizarGrupo(copia);
    (copia.alumnos||[]).forEach(normalizarAlumno);
    ordenarAlumnos(copia);
    if(!Array.isArray(state.grupos)) state.grupos=[];
    state.grupos.push(copia);
    save(); render();
    mostrarToast("✓ Grupo importado — añadido a tu lista, sin tocar los que ya tenías");
    inp.value="";
  };
  rd.readAsText(file);
};
window.borrarGrupoId=async id=>{
  const g=state.grupos.find(x=>x.id===id); if(!g) return;
  if(await confirmar(`¿Eliminar "${g.nombre}" y todos sus datos (alumnado, actividades, notas)? Esta acción no se puede deshacer.`)){
    state.grupos=state.grupos.filter(x=>x.id!==id);
    if(state.ui.grupoId===id){ state.ui.grupoId=null; state.ui.corExamId=""; state.ui.corAlId=""; state.ui.corTab="lista"; }
    if(state.ui.agFiltroGrupo===id) state.ui.agFiltroGrupo="";
    (state.eventos||[]).forEach(e=>{ e.grupoIds=agGrupoIdsDeEvento(e).filter(gid=>gid!==id); if(e.grupoId===id) e.grupoId=""; });
    (state.reuniones||[]).forEach(r=>{ if(r.grupoId===id){ r.grupoId=""; r.alumnoId=""; } });
    save(); render();
  }
};
window.borrarGrupo=()=>{ const grupo=grupoActual(); if(grupo) borrarGrupoId(grupo.id); };
window.setBloqueW=(i,v)=>{ const grupo=grupoActual(); grupo.bloques[i].peso=Math.max(0,Number(String(v).replace(",","."))||0); save();
  const el=document.getElementById("sumaBloquesAviso"); if(el) el.innerHTML=sumaBloquesHTML(grupo); };
/* Activar/desactivar un bloc: desactivat no compta en la nota (com si pesara
   0 %), però conserva el pes, les activitats i les notes per a quan es reactive. */
window.blocActivar=(i,on)=>{ const grupo=grupoActual(); const b=grupo&&grupo.bloques[i]; if(!b) return;
  if(on) delete b.inactiu; else b.inactiu=true;
  save(); render();
  mostrarToast(on? `✓ «${b.label}» torna a comptar (${b.peso} %).` : `«${b.label}» desactivat: no compta en la nota. El pes i les notes es guarden.`);
};
/* v4: suma de los bloques en vivo. Si no suman 100, la nota se sigue
   calculando (en proporción), pero se avisa para que sea intencionado. */
function sumaBloquesHTML(grupo){
  const t=Math.round(grupo.bloques.reduce((n,b)=>n+pesoBloqueNota(b),0)*100)/100;
  const off=grupo.bloques.filter(b=>b.inactiu);
  const nota=off.length? ` <span class="sub">Desactivat${off.length===1?"":"s"} (no compte${off.length===1?"":"n"}): ${off.map(b=>esc(b.label)).join(", ")}.</span>` : "";
  if(Math.abs(t-100)<0.01) return `<span style="color:#1e7a44;font-weight:600">✓ Sumen 100 %</span>`+nota;
  if(!(t>0)) return `<span style="color:#b45309;font-weight:600">⚠️ Cap bloc compta.</span> <span class="sub">Activa'n algun o posa-li pes perquè hi haja nota numèrica.</span>`+nota;
  return `<span style="color:#b45309;font-weight:600">⚠️ Sumen ${String(t).replace(".",",")} %.</span> <span class="sub">La nota es calcula igualment en proporció (cada bloc pesa la seua part sobre ${String(t).replace(".",",")}), però el normal és que sumen 100.</span>`+nota;
}
/* Escala qualitativa de les competències (NA, S, B, N, E…): nom, abreviatura,
   des de quina nota comença cada nivell i nota amb què vols que aparega. */
function escalaQualAjustosHTML(grupo){
  const e=escalaQual(grupo), fx=n=>String(n).replace(".",",");
  return `
  <div class="card" id="escalaQualCard">
    <h2>Escala qualitativa de les competències</h2>
    <p class="sub">S'usa en la qualificació per competències («Les dues») i en Resultats → «Per competències». Cada nivell comença en la nota «Des de» i arriba fins al següent. «Nota que apareix» és opcional: si la poses, eixe nivell es mostra amb eixa nota (p. ex. S · 5); en blanc, es mostra la calculada.</p>
    <div style="overflow-x:auto"><table class="escalaQualTaula">
      <thead><tr><th>Abreviatura</th><th>Nom</th><th>Des de</th><th>Rang</th><th>Nota que apareix</th><th></th></tr></thead>
      <tbody>${e.map((x,i)=>`<tr>
        <td><input class="in" style="width:70px" value="${esc(x.abr)}" aria-label="Abreviatura del nivell ${i+1}" onchange="setEscalaQual(${i},'abr',this.value)"></td>
        <td><input class="in" style="width:150px" value="${esc(x.nom)}" aria-label="Nom del nivell ${i+1}" onchange="setEscalaQual(${i},'nom',this.value)"></td>
        <td>${i===0?'<span class="sub" style="margin:0">0</span>':`<input class="in" style="width:80px" type="text" inputmode="decimal" value="${fx(x.des)}" aria-label="Des de quina nota comença ${esc(x.nom||x.abr)}" onchange="setEscalaQual(${i},'des',this.value)">`}</td>
        <td><span class="pill" style="background:${x.bg};color:${x.fg}">${esc(rangNivellQual(e,i))}</span></td>
        <td><input class="in" style="width:110px" type="text" inputmode="decimal" placeholder="calculada" value="${x.nota===""?"":fx(x.nota)}" aria-label="Nota amb què apareix ${esc(x.nom||x.abr)}" onchange="setEscalaQual(${i},'nota',this.value)"></td>
        <td>${e.length>2?`<button class="ghost small" title="Eliminar el nivell" aria-label="Eliminar el nivell ${esc(x.nom||x.abr)}" onclick="escalaQualEliminar(${i})">🗑️</button>`:""}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="flex" style="gap:8px;margin-top:10px">
      <button class="ghost" style="border:1px dashed var(--line)" onclick="escalaQualAfegir()">+ Afegir un nivell</button>
      <button class="ghost" style="border:1px solid var(--line)" onclick="escalaQualRestaurar()">↺ Tornar a l'escala per defecte</button>
    </div>
  </div>`;
}
function _escalaQualEditable(g){ if(!Array.isArray(g.escalaQual)||!g.escalaQual.length) g.escalaQual=ESCALA_QUAL_DEF.map(x=>({...x})); return g.escalaQual; }
function _numCA(v){ const t=String(v==null?"":v).trim().replace(",","."); if(t==="") return ""; const n=Number(t); return isFinite(n)? n : null; }
window.setEscalaQual=(i,camp,v)=>{
  const g=grupoActual(), e=_escalaQualEditable(g); if(!e[i]) return;
  if(camp==="abr"||camp==="nom"){ e[i][camp]=String(v||"").trim(); }
  else{
    const n=_numCA(v);
    if(n===null||(camp==="des"&&n==="")){ mostrarToast("Escriu una nota entre 0 i 10"); render(); return; }
    if(n!==""&&(n<0||n>10)){ mostrarToast("Escriu una nota entre 0 i 10"); render(); return; }
    e[i][camp]=n;
    if(camp==="des"){ e.sort((a,b)=>(Number(a.des)||0)-(Number(b.des)||0)); e[0].des=0; }
  }
  if(typeof _invalidarCaches==="function") _invalidarCaches();
  save(); render();
};
window.escalaQualAfegir=()=>{ const g=grupoActual(), e=_escalaQualEditable(g); const last=e[e.length-1]; const des=Math.min(10,Math.round(((Number(last.des)||0)+10)/2*10)/10); e.push({abr:"",nom:"Nivell nou",des,nota:""}); e.sort((a,b)=>(Number(a.des)||0)-(Number(b.des)||0)); save(); render(); };
window.escalaQualEliminar=i=>{ const g=grupoActual(), e=_escalaQualEditable(g); if(e.length<=2) return; e.splice(i,1); e[0].des=0; save(); render(); };
window.escalaQualRestaurar=()=>{ const g=grupoActual(); delete g.escalaQual; save(); render(); mostrarToast("✓ Escala per defecte"); };
window.setUmbral=(k,v)=>{ grupoActual().umbrales[k]=Number(v)||0; save(); };
/* Blocs propis: afegir, canviar el nom i eliminar (les activitats d'un bloc
   eliminat passen al bloc que tries). */
window.blocAfegir=async ()=>{
  const g=grupoActual();
  const nom=await pedirTexto("Nom del nou bloc de qualificació (p. ex. Deures):","");
  if(nom==null || !String(nom).trim()) return;
  const pes=await pedirTexto("Percentatge del bloc (%). Després ajusta els altres perquè sumen 100:","10");
  if(pes==null) return;
  g.bloques.push({id:"b"+uid(),label:String(nom).trim().slice(0,60),peso:Math.max(0,Number(String(pes).replace(",","."))||0)});
  if(typeof segSincronitzarBlocs==="function") segSincronitzarBlocs(g);
  save(); render();
};
window.blocReanomenar=async (i)=>{
  const g=grupoActual(); const b=g.bloques[i]; if(!b) return;
  const nom=await pedirTexto("Nou nom del bloc:",b.label);
  if(nom==null || !String(nom).trim()) return;
  b.label=String(nom).trim().slice(0,60);
  if(typeof segSincronitzarBlocs==="function") segSincronitzarBlocs(g);
  save(); render();
};
window.blocEliminar=async (i)=>{
  const g=grupoActual(); const b=g.bloques[i]; if(!b || g.bloques.length<2) return;
  const acts=(g.actividades||[]).filter(x=>x.bloqueId===b.id);
  const altres=g.bloques.filter(x=>x.id!==b.id);
  let desti=altres[0];
  if(acts.length){
    const nom=await pedirTexto(`El bloc «${b.label}» té ${acts.length} activitat${acts.length===1?"":"s"}. A quin bloc les passe? (${altres.map(x=>x.label).join(", ")})`,altres[0].label);
    if(nom==null) return;
    desti=altres.find(x=>x.label.toLowerCase()===String(nom).trim().toLowerCase());
    if(!desti){ mostrarAviso("No hi ha cap bloc amb eixe nom. No s'ha eliminat res."); return; }
  } else if(!await confirmar(`Eliminar el bloc «${b.label}»?`)) return;
  acts.forEach(a=>{ a.bloqueId=desti.id; });
  ((g.papelera&&g.papelera.actividades)||[]).forEach(a=>{ if(a&&a.bloqueId===b.id) a.bloqueId=desti.id; });
  g.bloques.splice(i,1);
  if(g.segBlocs) Object.keys(g.segBlocs).forEach(k=>{ const o=[].concat(g.segBlocs[k]||[]); if(!o.length) return; const v=o.filter(x=>x!==b.id); if(v.length) g.segBlocs[k]=v; else delete g.segBlocs[k]; });
  g.actividades.forEach(a=>{ if(Array.isArray(a.bloquesExtra)){ a.bloquesExtra=a.bloquesExtra.filter(x=>x!==b.id); if(!a.bloquesExtra.length) delete a.bloquesExtra; } });
  if(typeof segSincronitzarBlocs==="function") segSincronitzarBlocs(g);
  save(); render();
};
/* Amagar/mostrar una columna del mode de qualificació: només la vista (per grup). */
window.mqAmagar=qui=>{ const g=grupoActual(); if(!state.ui.mqAmagat) state.ui.mqAmagat={}; state.ui.mqAmagat[g.id]=qui; save(); render(); };
window.mqMostrar=()=>{ const g=grupoActual(); if(state.ui.mqAmagat) delete state.ui.mqAmagat[g.id]; save(); render(); };
window.setModoNota=v=>{ const g=grupoActual(); g.modoNota=(v==="ce"||v==="ambdues"?v:"bloques"); save(); render(); };
window.setPesoCE=(ceId,v)=>{ const g=grupoActual(); if(!g.pesosCE) g.pesosCE={};
  const t=String(v).trim(); if(t==="") delete g.pesosCE[ceId]; else g.pesosCE[ceId]=Math.max(0,Number(t.replace(",","."))||0);
  save(); const el=document.getElementById("sumaPesosCEAviso"); if(el) el.innerHTML=sumaPesosCEHTML(g); };
function sumaPesosCEHTML(grupo){
  const ces=catIndex(grupo.catalogoKey).cat.ces;
  const t=Math.round(ces.reduce((n,ce)=>n+pesoCEGrupo(grupo,ce.id),0)*100)/100;
  if(Math.abs(t-100)<0.01) return `<span class="txtOk">✓ Sumen 100 %.</span>`;
  return `<span class="txtAvis" style="font-weight:600">⚠️ Sumen ${String(t).replace(".",",")} %.</span> <span class="sub">La nota es calcula igualment en proporció, però el normal és que sumen 100.</span>`;
}
window.setPesoTrim=(t,v)=>{ const g=grupoActual(); if(!g.pesosTrim) g.pesosTrim={}; g.pesosTrim[t]=v; save(); };
window.setFechaTrimestre=(t,campo,v)=>{ const g=grupoActual(); if(!g.fechasTrimestre) g.fechasTrimestre=[{inicio:"",fin:""},{inicio:"",fin:""},{inicio:"",fin:""}]; g.fechasTrimestre[t][campo]=v; save(); };
/* Copiar les dates d'avaluació d'este grup a altres grups triats. Abans de
   sobreescriure dates diferents que ja hi hagen, es demana confirmació. */
function _datesTxt(ft){
  const d=x=>x?x.split("-").reverse().join("/"):"…";
  return [0,1,2].map(t=>{ const f=(ft||[])[t]||{}; return f.inicio||f.fin?`${t+1}a: ${d(f.inicio)}–${d(f.fin)}`:""; }).filter(Boolean).join(" · ");
}
function _datesIguals(a,b){ return [0,1,2].every(t=>{ const x=(a||[])[t]||{}, y=(b||[])[t]||{}; return (x.inicio||"")===(y.inicio||"")&&(x.fin||"")===(y.fin||""); }); }
window.obrirCopiarDates=()=>{
  const g=grupoActual();
  if(![0,1,2].some(t=>{ const f=g.fechasTrimestre[t]; return f&&(f.inicio||f.fin); })){ mostrarAviso("Este grup encara no té cap data d'avaluació per copiar."); return; }
  const altres=state.grupos.filter(x=>x.id!==g.id);
  tancarCopiarDates();
  const wrap=document.createElement("div"); wrap.id="copiarDatesWrap";
  wrap.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this) tancarCopiarDates()">
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="copiarDatesT" style="max-width:480px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
        <h2 id="copiarDatesT" style="font-size:16.5px;margin:0">Copiar les dates d'avaluació</h2>
        <button class="modal-close" onclick="tancarCopiarDates()" aria-label="Tancar">×</button>
      </div>
      <p class="sub" style="margin:0 0 10px">${esc(_datesTxt(g.fechasTrimestre))}</p>
      <p style="font-size:14px;margin:0 0 6px">Tria a quins grups vols posar les mateixes dates:</p>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto">
        ${altres.map(x=>{ const ja=_datesTxt(x.fechasTrimestre), igual=_datesIguals(x.fechasTrimestre,g.fechasTrimestre);
          return `<label style="display:flex;gap:8px;align-items:flex-start;font-size:14px">
            <input type="checkbox" class="cdGrup" value="${esc(x.id)}" ${igual?"disabled":""} style="margin-top:3px">
            <span><strong>${esc(x.nombre)}</strong>${igual?` <span class="sub">· ja té les mateixes dates</span>`:ja?`<br><span class="sub" style="font-size:12px">Ara: ${esc(ja)}</span>`:` <span class="sub">· sense dates</span>`}</span></label>`; }).join("")}
      </div>
      <div class="flex" style="justify-content:space-between;gap:8px;margin-top:14px">
        <button class="ghost" onclick="document.querySelectorAll('#copiarDatesWrap .cdGrup:not(:disabled)').forEach(c=>c.checked=true)">Marcar-los tots</button>
        <div class="flex" style="gap:8px">
          <button class="ghost" style="border:1px solid var(--line)" onclick="tancarCopiarDates()">Cancel·lar</button>
          <button class="btn" onclick="aplicarCopiarDates()">Copiar</button>
        </div>
      </div>
    </div></div>`;
  document.body.appendChild(wrap);
  document.addEventListener("keydown",_copiarDatesEsc);
};
function _copiarDatesEsc(e){ if(e.key==="Escape" && document.getElementById("copiarDatesWrap") && !document.querySelector(".dlg-overlay")) tancarCopiarDates(); }
window.tancarCopiarDates=()=>{ const el=document.getElementById("copiarDatesWrap"); if(el) el.remove(); document.removeEventListener("keydown",_copiarDatesEsc); };
window.aplicarCopiarDates=async()=>{
  const g=grupoActual();
  const ids=[...document.querySelectorAll("#copiarDatesWrap .cdGrup:checked")].map(c=>c.value);
  const dest=state.grupos.filter(x=>ids.includes(x.id));
  if(!dest.length){ mostrarAviso("Marca almenys un grup."); return; }
  const amb=dest.filter(x=>_datesTxt(x.fechasTrimestre));
  if(amb.length && !(await confirmar(`${amb.map(x=>x.nombre).join(", ")} ja ${amb.length===1?"té":"tenen"} dates d'avaluació. Es reemplaçaran per les d'este grup.`,{titulo:"Reemplaçar les dates?",ok:"Sí, reemplaçar-les",cancelar:"Cancel·lar"}))) return;
  dest.forEach(x=>{ x.fechasTrimestre=[0,1,2].map(t=>({...(x.fechasTrimestre||[])[t], inicio:g.fechasTrimestre[t].inicio||"", fin:g.fechasTrimestre[t].fin||""})); });
  save(); tancarCopiarDates();
  mostrarAviso(`Dates copiades a ${dest.length===1?`«${dest[0].nombre}»`:`${dest.length} grups`}.`);
};
window.setProgramacionGrupo=(id)=>{ const g=grupoActual(); g.programacionId=id; save(); render(); };
window.irAProgramacion=()=>{ state.ui.appMode="programacion"; state.ui.progTab="lista"; save(); render(); };
window.setCeCc=(ce,cc,v)=>{ grupoActual().pesos.ceCc[ce+"|"+cc]=v; save(); };
window.setCrit=(id,v)=>{ grupoActual().pesos.crit[id]=v; save(); };

