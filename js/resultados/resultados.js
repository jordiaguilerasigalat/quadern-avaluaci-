/* ============================================================================
   Cuaderno del profesor · Comentarios sugeridos, paso a Tutoría y pantalla de Resultados
   js/resultados/resultados.js
   ============================================================================ */

/* =================================================================
   v3 · COMENTARIOS SUGERIDOS PARA LAS FAMILIAS (castellano / valencià)
   Un borrador a partir de datos reales: nota de acta, competencia más
   fuerte y más débil, actividades sin presentar (NP) y faltas sin
   justificar del trimestre. Siempre editable antes de imprimir.
   ================================================================= */
const COM_TXT={
  es:{ev:["primera evaluación","segunda evaluación","tercera evaluación"],
    nivel:{9:"{N} ha realizado un trabajo excelente durante la {E}.",7:"{N} ha realizado un buen trabajo durante la {E}.",6:"{N} ha tenido un rendimiento satisfactorio durante la {E}, aunque todavía puede mejorar.",5:"{N} ha alcanzado los aprendizajes básicos de la {E}, pero debe esforzarse más para consolidarlos.",0:"{N} todavía no ha alcanzado los aprendizajes de la {E}."},
    fuerte:"Destaca especialmente en la competencia «{C}».", debil:"Debe mejorar en la competencia «{C}».",
    np:"Es importante que entregue todas las tareas y se presente a las pruebas: tiene {n} sin presentar este trimestre.",
    faltas:"Las faltas de asistencia sin justificar ({n}) están afectando a su progreso.",
    cierre:{alto:"¡Enhorabuena y a seguir así!",medio:"Con constancia puede mejorar sus resultados.",bajo:"Le animamos a trabajar de forma constante y a aprovechar las actividades de recuperación."}},
  va:{ev:["primera avaluació","segona avaluació","tercera avaluació"],
    nivel:{9:"{N} ha fet un treball excel·lent durant la {E}.",7:"{N} ha fet un bon treball durant la {E}.",6:"{N} ha tingut un rendiment satisfactori durant la {E}, encara que pot millorar.",5:"{N} ha assolit els aprenentatges bàsics de la {E}, però ha d'esforçar-se més per a consolidar-los.",0:"{N} encara no ha assolit els aprenentatges de la {E}."},
    fuerte:"Destaca especialment en la competència específica {C}.", debil:"Ha de millorar en la competència específica {C}.",
    np:"És important que entregue totes les tasques i que es presente a les proves: en té {n} sense presentar aquest trimestre.",
    faltas:"Les faltes d'assistència sense justificar ({n}) estan afectant el seu progrés.",
    cierre:{alto:"Enhorabona i a continuar així!",medio:"Amb constància pot millorar els seus resultats.",bajo:"L'animem a treballar de manera constant i a aprofitar les activitats de recuperació."}}
};
function _ceCorto(txt){ const w=String(txt||"").replace(/[.:;]+$/,"").split(/\s+/); const c=w.slice(0,9).join(" "); return (w.length>9?c+"…":c).replace(/^./,m=>m.toLowerCase()); }
function comentarioSugerido(grupo,al,trim,lang){
  const T=COM_TXT[lang]||COM_TXT.va;
  const v=notaTrimestre(grupo,al.id,trim); if(v==null) return "";
  const acta=notaActa(v,grupo);
  const nombre=(al.nombreP||al.nombre||"").trim().split(/\s+/)[0]||al.nombre;
  const k=acta>=9?9:acta>=7?7:acta>=6?6:acta>=5?5:0;
  const partes=[T.nivel[k].replace("{N}",nombre).replace("{E}",T.ev[trim])];
  const idx=catIndex(grupo.catalogoKey);
  const ces=idx.cat.ces.map(ce=>({ce,p:conTrim(trim,()=>scoreCE(grupo,al.id,ce.id))})).filter(x=>x.p!=null).sort((a,b)=>b.p-a.p);
  if(ces.length>=2){
    const top=ces[0], low=ces[ces.length-1];
    const etiqueta=x=>lang==="va"?x.ce.id:_ceCorto(x.ce.titulo);
    if(top.p>=grupo.umbrales.adecuado) partes.push(T.fuerte.replace("{C}",etiqueta(top)));
    if(low.p<grupo.umbrales.adecuado && low!==top) partes.push(T.debil.replace("{C}",etiqueta(low)));
  }
  const nNP=grupo.actividades.filter(a=>a.trimestre===trim && marcaDe(grupo,al.id,a.id)==="NP").length;
  if(nNP) partes.push(T.np.replace("{n}",nNP));
  const ft=grupo.fechasTrimestre&&grupo.fechasTrimestre[trim];
  if(ft&&ft.inicio&&ft.fin){ const f=asistContarPeriodo(grupo,al.id,ft.inicio,ft.fin).falta_no_justificada; if(f>=3) partes.push(T.faltas.replace("{n}",f)); }
  partes.push(acta>=7?T.cierre.alto:acta>=5?T.cierre.medio:T.cierre.bajo);
  return partes.join(" ");
}
window.comSugerir=async(alId,trim,lang)=>{
  const grupo=grupoActual(); const al=grupo&&grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const txt=comentarioSugerido(grupo,al,trim,lang);
  if(!txt){ mostrarAviso(lang==="va"?"Encara no té nota en aquesta avaluació.":"Todavía no tiene nota en esta evaluación."); return; }
  const ta=document.getElementById("resComentario");
  const actual=(ta?ta.value:al.comentariosEval[trim]||"").trim();
  if(actual && !(await confirmar(`Ja té un comentari escrit. Vols substituir-lo per aquest esborrany?\n\n«${txt}»`,{ok:"Substituir",peligro:false}))) return;
  al.comentariosEval[trim]=txt; save(); render();
  mostrarToast("✓ Esborrany escrit: revisa'l abans d'imprimir");
};
window.comSugerirGrupo=async(lang)=>{
  const grupo=grupoActual(); if(!grupo) return; const trim=state.ui.trim;
  const vacios=grupo.alumnos.filter(al=>!((al.comentariosEval||[])[trim]||"").trim() && notaTrimestre(grupo,al.id,trim)!=null);
  if(!vacios.length){ mostrarAviso("Tot l'alumnat amb nota ja té comentari en aquesta avaluació (no se'n sobreescriu cap)."); return; }
  if(!(await confirmar(`Es redactarà un esborrany de comentari (${lang==="va"?"en valencià":"en castellà"}) per a ${vacios.length} alumne${vacios.length===1?"":"s"} amb nota i sense comentari en la ${TRIMESTRES[trim]}. Els comentaris ja escrits no es toquen.`,{ok:"Redactar",peligro:false}))) return;
  vacios.forEach(al=>{ al.comentariosEval[trim]=comentarioSugerido(grupo,al,trim,lang); });
  save(); render(); mostrarToast(`✓ ${vacios.length} esborranys escrits: revisa'ls abans d'imprimir`);
};
/* =================================================================
   v5 · DEL CUADERNO A LA TUTORÍA
   Exporta, para este grupo, la nota de acta de tu materia en cada
   evaluación y en la final. El tutor/a lo carga en el Gestor de Tutoría
   (⚙️ Gestión del Curso → «Importar suspensos del Cuaderno») y la materia
   se marca sola como suspensa (o se desmarca si está aprobada) en cada
   alumno/a, emparejando por nombre.
   ================================================================= */
window.exportarParaTutoria=async()=>{
  const grupo=grupoActual(); if(!grupo) return;
  const cat=getCatalogo(grupo.catalogoKey);
  const alumnos=grupo.alumnos.map(al=>{
    const n={};
    [0,1,2].forEach(t=>{ const v=notaTrimestre(grupo,al.id,t); if(v!=null) n[t+1]=notaActa(v,grupo); });
    const f=notaFinal(grupo,al.id); if(f!=null && notaTrimestre(grupo,al.id,2)!=null) n.final=notaActa(f,grupo);
    return {id:al.id, nombre:al.nombre, apellidos:al.apellidos||"", nombrePropio:al.nombreP||"", notas:n};   // id: Tutoría empareja por él antes que por el nombre
  });
  const conNota=alumnos.filter(a=>Object.keys(a.notas).length).length;
  if(!conNota){ mostrarAviso("Todavía no hay notas en este grupo."); return; }
  const obj={formato:"cuaderno-a-tutoria",version:1,materia:(cat&&cat.materia)||"",curso:(cat&&cat.curso)||"",grupo:grupo.nombre,
    profesor:profesorNombreEfectivo?profesorNombreEfectivo(null):"",generado:new Date().toISOString(),regla:"Nota de acta; suspenso = acta < 5",alumnos};
  const limpio=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase();
  const ok=await guardarArchivo(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),`para-tutoria-${limpio(grupo.nombre)}-${limpio(obj.materia)}.json`);
  if(ok) mostrarToast("✓ Archivo para la tutoría guardado. El tutor/a lo carga en Gestor de Tutoría → Gestión del Curso.");
};
function renderResultados(grupo){
  const c=document.getElementById("tabContent");
  const idx=catIndex(grupo.catalogoKey);
  if(!grupo.alumnos.length){ c.innerHTML='<div class="card"><h2>Resultados</h2><p style="color:var(--mut);font-size:14px">Añade alumnado, crea actividades y califícalas: aquí verás la nota cuantitativa y la adquisición de cada competencia.</p></div>'; return; }
  if(state.ui.resAl && !grupo.alumnos.find(a=>a.id===state.ui.resAl)) state.ui.resAl="";
  const al=grupo.alumnos.find(a=>a.id===state.ui.resAl)||null; let banc={boto:"",panell:""};
  const trim=state.ui.trim;

  // ---- "Toda la clase": tabla siempre visible, cada fila abre el detalle del alumno debajo ----
  const htmlClase=`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:15px">Toda la clase</h2>
      <div class="flex res-acciones">
        <button class="ghost" style="border:1px solid var(--line)" onclick="exportarCSVGrupo()" title="Hoja de cálculo con la media y la nota de acta (entera) de cada alumno/a, lista para pasar a ITACA">Exportar notas (CSV)</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformesTodos()">Exportar todos los informes</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformesFinalesTodos()">Exportar informes finales de curso</button>
        <button class="ghost" style="border:1px solid var(--line)" title="Archivo con los suspensos de tu materia en cada evaluación, para cargarlo en el Gestor de Tutoría del tutor/a del grupo" onclick="exportarParaTutoria()">👥 Para la tutoría</button>
        <button class="ghost" style="border:1px solid var(--line)" title="Sumar puntos a la nota de la evaluación o a la nota final (p. ej. +0,5 por presentarse voluntario/a)" onclick="abrirExtrasEvaluacion(${trim})">➕ Puntos extra</button>
        <button class="ghost" style="border:1px solid var(--line)" title="Esborranys de comentari per a qui encara no en tinga (no en sobreescriu cap)" onclick="comSugerirGrupo('va')">💬 Comentaris buits</button>
        <span class="flex" style="gap:6px;align-items:center">
          <select class="in" id="repGrupoSel" style="padding:6px 9px">
            ${TRIMESTRES.map((t,i)=>`<option value="${i}" ${i===state.ui.trim?"selected":""}>${t}</option>`).join("")}
            <option value="final">Evaluación final (curso completo)</option>
          </select>
          <button class="btn" onclick="exportarInformeGrupo(document.getElementById('repGrupoSel').value)">Informe de grupo</button>
          <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformesDetalladosTodos(document.getElementById('repGrupoSel').value)">🖨️ Informes detallados</button>
          <button class="ghost" style="border:1px solid var(--line)" title="Acta per a la sessió d'avaluació: mitjanes, suspesos per tema, alumnat amb mesures, faltes i espai per als acords" onclick="exportarActaSessio(document.getElementById('repGrupoSel').value)">🧾 Acta de la sessió</button>
          <button class="ghost" style="border:1px solid var(--line)" title="Una pàgina per alumne/a per a les famílies: notes, temes, faltes, observacions i signatures" onclick="(v=>exportarInformesFamiliaTots(v==='final'?2:v))(document.getElementById('repGrupoSel').value)">👪 Informes per a les famílies</button>
        </span>
      </div>
    </div>
    <p class="sub" style="margin:6px 0 10px">Toca un alumno/a para ver y editar su informe completo debajo.</p>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Alumno/a</th><th>${TRIMESTRES[trim]}</th><th>Nota final</th><th title="Calificación y nota de acta (entera) de la nota final">Calificación · acta</th>${teQualitativaCE(grupo)?`<th title="Qualificació qualitativa per competències (mitjana ponderada de les CE)">Qualitativa · ${TRIMESTRES[trim]}</th><th title="Qualificació qualitativa per competències de tot el curs">Qualitativa final</th>`:""}<th></th><th></th><th></th></tr></thead>
      <tbody>${grupo.alumnos.map(a=>{const t=notaTrimestre(grupo,a.id,trim),f=notaFinal(grupo,a.id);
        return `<tr style="cursor:pointer;${a.id===(al&&al.id)?'background:var(--surface-2)':''}" onclick="irAAlumnoResultados('${a.id}')">
          <td>${avatarAlumneHTML(a)}<strong>${esc(a.nombre)}</strong>${neseBadgeHTML(a)}</td><td>${fmt(t)}${extraEvalBadgeHTML(grupo,a.id,trim)}${avisoBloquesHTML(grupo,a.id,trim)}</td><td>${fmt(f)}${extraEvalBadgeHTML(grupo,a.id,"final")}</td>
          <td>${pillCuant(f)}</td>${teQualitativaCE(grupo)?`<td>${pillQual(grupo,a.id,trim)}</td><td>${pillQual(grupo,a.id,"final")}</td>`:""}
          <td><button class="ghost small" style="border:1px solid var(--line)" title="Ver la evolución de ${esc(a.nombre)} en esta evaluación" onclick="event.stopPropagation();verEvolucionAlumno('${a.id}')">👁️</button>${grupoTieneEntrega(grupo,a.id,trim)?`<span title="Informe entregado el ${fmt2(grupoTieneEntrega(grupo,a.id,trim).fecha)}" style="margin-left:4px;color:#1e5631;font-weight:700;font-size:13px">✓</span>`:""}</td>
          <td><button class="ghost" onclick="event.stopPropagation();exportarInformeAlumno('${a.id}')">Informe</button></td>
          <td><button class="ghost" onclick="event.stopPropagation();exportarInformeFinalAlumno('${a.id}')">Informe final</button></td></tr>`;}).join("")}</tbody>
    </table></div>
  </div>
  ${state.ui.evolModalAl?evolucionModalHTML(grupo,grupo.alumnos.find(x=>x.id===state.ui.evolModalAl)):""}`;

  if(!al){ c.innerHTML=htmlClase+grafiquesGrupHTML(grupo); return; }
  const nt=notaTrimestre(grupo,al.id,trim), nf=notaFinal(grupo,al.id);
  const ccT=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>({cc,p:scoreCC(grupo,al.id,cc)})).filter(x=>x.p!=null);
  const ceT=idx.cat.ces.map(ce=>({ce,p:scoreCE(grupo,al.id,ce.id)})).filter(x=>x.p!=null);
  
  const actsT = actsTrim(grupo);
  let htmlActs = '<div style="margin-top:8px">';
  if (actsT.length === 0) {
     htmlActs += '<p style="color:var(--mut);font-size:14px">Sin actividades en este periodo.</p>';
  } else {
     const sdaMap = {};
     actsT.forEach(a => { const s = a.sda || 'Sin SdA'; if(!sdaMap[s]) sdaMap[s]=[]; sdaMap[s].push(a); });
     
     Object.keys(sdaMap).forEach(sda => {
        if(sda !== 'Sin SdA') htmlActs += `<div style="font-size:12.5px;color:var(--mut);font-weight:600;text-transform:uppercase;margin-top:8px">${esc(sda)}</div>`;
        htmlActs += '<div style="overflow-x:auto;margin-bottom:6px"><table><thead><tr><th>Actividad</th><th>Tipo</th><th style="min-width:100px">Nota (0-10)</th><th style="min-width:220px">Criterios (calificación cualitativa)</th></tr></thead><tbody>';
        sdaMap[sda].forEach(a => {
           let notaCell;
           if(a.rubrica){
              const vc=grupo.notasCuant?.[al.id]?.[a.id];
              notaCell = `<strong>${vc==null?"—":fmt(vc)}</strong> <button class="ghost small" title="Corregir en el Corrector de Exámenes" onclick="cxAbrirDesdeOtroModo('${a.id}')">🖊️</button>`;
           } else if(a.esExamen){
              const vc=grupo.notasCuant?.[al.id]?.[a.id];
              notaCell = `<input type="text" inputmode="decimal" autocomplete="off" class="in miniw" style="width:76px" value="${vc==null?"":String(vc).replace(".",",")}" onchange="setNotaCuantExamen('${al.id}','${a.id}',this.value,true)">`;
           } else {
              const val = notaActividad(grupo, al.id, a);
              notaCell = `<strong>${val==null?"—":fmt(val)}</strong>`;
           }
           const critCell = a.rubrica
             ? a.criterios.map(l=>{
                 const cv=grupo.notas?.[al.id]?.[a.id]?.[l.critId];
                 return `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-size:12.5px">
                   <span style="color:var(--mut)">${critLinkHTML(grupo.catalogoKey,l.critId)}</span>
                   <span style="color:var(--ink);font-weight:500">${cv==null?"—":cv.toFixed(1)+"/10"}</span>
                 </span>`;
               }).join("")
             : a.criterios.map(l=>{
              const cv=grupo.notas?.[al.id]?.[a.id]?.[l.critId];
              return `<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0">
                <span style="font-size:11.5px;color:var(--mut)">${critLinkHTML(grupo.catalogoKey,l.critId)}</span>
                <select class="in" style="font-size:13px;padding:3px 6px" onchange="setNota('${al.id}','${a.id}','${l.critId}',this.value,true)">
                  <option value="">-</option>
                  ${ESCALA.map(o=>`<option value="${o.v}" ${cv===o.v?'selected':''}>${o.etq} (${String(o.v).replace('.',',')})</option>`).join("")}
                </select>
              </span>`;
           }).join("");
           if(!a.recupera && recuperacionesDe(grupo,a.id).length){
              const vb=notaActividadBase(grupo,al.id,a), vf=notaActividadSinExtra(grupo,al.id,a);
              if(vf!=null && (vb==null || Math.abs(vf-vb)>1e-9)) notaCell += ` <span class="pill" title="Nota tras aplicar la recuperación" style="background:#dcece0;color:#1e5631;font-size:11.5px">🔁 ${fmt(vf)}</span>`;
           }
           if(!a.recupera) notaCell += `${extraBadgeHTML(grupo,al.id,a)} <button class="ghost small" title="Punts extra en ${esc(a.nombre)}" aria-label="Punts extra en ${esc(a.nombre)}" onclick="abrirExtrasActividad('${a.id}','${al.id}')">➕</button>`;
           if(a.recupera) notaCell += ` <span class="badge" title="${esc(recResumenTexto(grupo,a).replace(/<[^>]+>/g,""))}">🔁 recuperación</span>`;
           htmlActs += `<tr><td>${esc(a.nombre)}${marcaBadgeHTML(grupo,al.id,a.id)}</td><td>${esc(a.tipo)}</td><td>${notaCell}</td><td>${critCell}</td></tr>`;
        });
        htmlActs += '</tbody></table></div>';
     });
  }
  htmlActs += '</div>';

  // Check for Missing Grades in worked criteria
  const critTrabajados = new Set();
  actsT.forEach(a => a.criterios.forEach(c => critTrabajados.add(c.critId)));
  const critSinNota = [];
  critTrabajados.forEach(cid => {
     if(scoreCriterio(grupo, al.id, cid) == null) critSinNota.push(cid);
  });
  const _bloquesVacios = bloquesSinNota(grupo, al.id, trim);
  const htmlAlertaBloques = _bloquesVacios.length
     ? `<div class="alert-box" style="margin-bottom:16px">⚠️ <strong>Bloque sin nota:</strong> no tiene ninguna calificación en <strong>${esc(_bloquesVacios.join(", "))}</strong>, así que su nota de ${TRIMESTRES[trim]} sale solo del resto de bloques. Si no se ha presentado, márcalo como <strong>NP</strong> en Calificar (cuenta 0); si no le corresponde, como <strong>Exento</strong>.</div>`
     : '';
  const htmlAlertaAsimetria = htmlAlertaBloques + (critSinNota.length > 0 
     ? `<div class="alert-box" style="margin-bottom:16px">⚠️ <strong>Atención:</strong> El alumno no tiene calificación en los siguientes criterios trabajados por el grupo este trimestre, lo que puede causar asimetría en la evaluación: ${critSinNota.join(', ')}.</div>`
     : '');

  c.innerHTML=htmlClase+`
  <div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><h2>Informe de ${nomFitxaHTML(al)}${neseBadgeHTML(al)}</h2><p class="sub" style="margin:0">${TRIMESTRES[trim]}</p></div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="irAAlumnoResultados('')">← Ver toda la clase</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformeFinalAlumno('${al.id}')">Exportar informe final de curso</button>
        <button class="btn" onclick="exportarInformeAlumno('${al.id}')">Exportar informe individual</button>
      </div>
    </div>
  </div>

  ${htmlAlertaAsimetria}

  <div class="card">
    <h2 style="font-size:15px">Calificación cuantitativa</h2>
    <p class="sub">Ponderación: ${grupo.bloques.map(b=>`${esc(b.label)} ${b.peso} %`).join(" · ")}.</p>
    <div class="flex" style="gap:24px;align-items:flex-end">
      <div><div style="font-size:12.5px;color:var(--mut)">Nota de ${TRIMESTRES[trim]}${extraEvalBadgeHTML(grupo,al.id,trim)}</div>
        <div class="flex" style="gap:8px;align-items:baseline"><span class="big" style="color:var(--accent-texto)">${fmt(nt)}</span> ${pillCuant(nt)}</div></div>
      <div><div style="font-size:12.5px;color:var(--mut)">Nota final (mitjana ponderada)${extraEvalBadgeHTML(grupo,al.id,"final")}</div>
        <div class="flex" style="gap:8px;align-items:baseline"><span class="big">${fmt(nf)}</span> ${pillCuant(nf)}</div></div>
    </div>
    <div class="grid" style="gap:8px;margin-top:14px">
      <div><div style="font-size:12.5px;color:var(--mut);margin-bottom:4px">Punts extra en la ${TRIMESTRES[trim]}${(x=>x&&nt!=null?` · ${textoNotaConExtra(notaTrimestreSinExtra(grupo,al.id,trim),x,nt)}`:"")(ptsExtraEval(grupo,al.id,trim))}</div>${extraCamposHTML("eval",al.id,String(trim),extraEval(grupo,al.id,trim))}</div>
      <div><div style="font-size:12.5px;color:var(--mut);margin-bottom:4px">Punts extra en la nota final${(x=>x&&nf!=null?` · ${textoNotaConExtra(notaFinalSinExtra(grupo,al.id),x,nf)}`:"")(ptsExtraEval(grupo,al.id,"final"))}</div>${extraCamposHTML("eval",al.id,"final",extraEval(grupo,al.id,"final"))}</div>
    </div>
  </div>

  ${grafiquesAlumneHTML(grupo,al)}

  ${teQualitativaCE(grupo)?`<div class="card">
    <h2 style="font-size:15px">Qualificació qualitativa (per competències)</h2>
    <p class="sub">Mitjana ponderada de les competències específiques amb la qualificació de cada criteri (pesos en Ajustos → Mode de qualificació). Va per separat de la nota quantitativa i els punts extra no la toquen.</p>
    <div class="flex" style="gap:24px;align-items:flex-end">
      <div><div style="font-size:12.5px;color:var(--mut)">${TRIMESTRES[trim]}</div><div style="margin-top:4px">${pillQual(grupo,al.id,trim)}</div></div>
      <div><div style="font-size:12.5px;color:var(--mut)">Final (tot el curs)</div><div style="margin-top:4px">${pillQual(grupo,al.id,"final")}</div></div>
    </div>
  </div>`:""}

  <div class="card">
    <h2 style="font-size:15px">Desglose de actividades</h2>
    <p class="sub">Calificaciones de ${esc(al.nombre)} en ${TRIMESTRES[trim]}. Puedes corregirlas aquí mismo: la nota cuantitativa de los exámenes y la calificación de cada criterio se actualizan al instante.</p>
    ${htmlActs}
  </div>

  <div class="card">
    <h2 style="font-size:15px">Competencias clave trabajadas</h2>
    ${ccT.length? `<div class="grid" style="margin-top:8px">${ccT.map(x=>`
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <span style="font-size:14px"><strong>${x.cc}</strong> · ${COMP_CLAVE[x.cc]}
          <div style="font-size:11.5px;color:var(--mut);margin-top:3px;font-weight:400">${esc(abrevActs(actividadesDeCC(grupo,al.id,x.cc)))}</div>
        </span>${pillHTML(grupo,x.p)}</div>`).join("")}</div>`
      : '<p style="color:var(--mut);font-size:14px">Sin datos todavía en este periodo.</p>'}
  </div>

  <div class="card">
    <h2 style="font-size:15px">Competencias específicas trabajadas</h2>
    ${ceT.length? `<div class="grid" style="margin-top:8px">${ceT.map(x=>`
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <span style="font-size:14px"><strong>${x.ce.id}</strong> · ${esc(x.ce.titulo)}
          <div style="font-size:11.5px;color:var(--mut);margin-top:3px;font-weight:400">${esc(abrevActs(actividadesDeCE(grupo,al.id,x.ce.id)))}</div>
        </span>${pillHTML(grupo,x.p)}</div>`).join("")}</div>`
      : '<p style="color:var(--mut);font-size:14px">Sin datos todavía en este periodo.</p>'}
  </div>

  <div class="card">
    <h2 style="font-size:15px">Comentarios a la calificación</h2>
    <p class="sub">Específico de ${TRIMESTRES[trim]}. Se imprime en el informe individual, junto a la nota de este periodo.</p>
    <textarea class="in" id="resComentario" style="width:100%;min-height:90px;resize:vertical" placeholder="Comentario sobre la calificación de ${TRIMESTRES[trim]}…">${esc((al.comentariosEval&&al.comentariosEval[trim])||"")}</textarea>
    <div class="flex" style="gap:6px;margin-top:8px;flex-wrap:wrap">
      <button class="ghost small" style="border:1px solid var(--line)" onclick="comSugerir('${al.id}',${trim},'va')" title="Redacta un esborrany a partir de la nota, les competències, les entregues i l'assistència. Revisa'l abans d'imprimir.">💬 Suggerir comentari</button>
      ${(banc=bancComentarisHTML(grupo,al,trim)).boto}
    </div>
    ${banc.panell}
  </div>

  <div class="card">
    <h2 style="font-size:15px">Distribución del grupo · ${TRIMESTRES[trim]}</h2>
    ${renderDistribucionHTML(grupo,trim)}
  </div>`;
  document.getElementById("resComentario").addEventListener("change",e=>{ al.comentariosEval[trim]=e.target.value; save(); });
}

