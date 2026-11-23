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
/* ---- Vistes de la taula de tota la classe ----
   «Notes» (per defecte): avaluació, final i les columnes ITACA (nota a mà).
   «Per blocs»: nota 0-10 de cada bloc en l'avaluació triada.
   «Per competències»: nota de cada CE amb tot el treballat fins a eixa
   avaluació, en número (0-10) o amb l'escala qualitativa del grup. */
function resVista(){ const v=state.ui.resVista; return v==="blocs"||v==="ce"? v : "notes"; }
function resVistaBotonsHTML(grupo){
  const v=resVista(), qual=state.ui.resCEqual!==false;
  const b=(id,t)=>`<button class="${v===id?"btn":"ghost"} small" style="${v===id?"":"border:1px solid var(--line)"}" aria-pressed="${v===id}" onclick="setResVista('${id}')">${t}</button>`;
  return `<div class="flex" role="group" aria-label="Què vols veure en la taula" style="gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center">
    ${b("notes","Notes i ITACA")}${b("blocs","Per blocs")}${b("ce","Per competències")}
    ${v==="ce"?`<span style="width:10px"></span><label style="display:flex;gap:5px;align-items:center;font-size:13px"><input type="radio" name="resCEqual" ${qual?"checked":""} onchange="setResCEqual(true)"> Qualitativa (${esc(escalaQual(grupo).map(x=>x.abr||x.nom).join(", "))})</label>
      <label style="display:flex;gap:5px;align-items:center;font-size:13px"><input type="radio" name="resCEqual" ${qual?"":"checked"} onchange="setResCEqual(false)"> Numèrica (0-10)</label>
      <button class="ghost small" style="border:1px solid var(--line)" title="Canviar els nivells, els llindars i la nota que apareix" onclick="resAnarEscala()">⚙️ Escala</button>`:""}
  </div>`;
}
window.setResVista=v=>{ state.ui.resVista=v; save(); render(); };
window.setResCEqual=q=>{ state.ui.resCEqual=!!q; save(); render(); };
window.resAnarEscala=()=>{ irATab("ajustes"); setTimeout(()=>{ const e=document.getElementById("escalaQualCard"); if(e) e.scrollIntoView({block:"start"}); },60); };
/* Nota ITACA escrita a mà (en blanc = la calculada). */
window.setNotaItaca=(alId,periodo,v)=>{
  const g=grupoActual(); const t=String(v==null?"":v).trim().replace(",",".");
  g.notaItaca=g.notaItaca||{};
  if(t===""){ if(g.notaItaca[alId]){ delete g.notaItaca[alId][periodo]; if(!Object.keys(g.notaItaca[alId]).length) delete g.notaItaca[alId]; } save(); render(); return; }
  const n=Number(t);
  if(!isFinite(n)||n<0||n>10){ mostrarToast("Escriu una nota entre 0 i 10 (o deixa-ho en blanc per a usar la calculada)"); render(); return; }
  (g.notaItaca[alId]=g.notaItaca[alId]||{})[periodo]=n; save(); render();
};
function resCeldaItacaHTML(grupo,a,periodo,calc){
  const m=notaItacaManual(grupo,a.id,periodo), acta=calc==null? null : notaActa(calc,grupo);
  const canvi=m!=null && m!==acta;
  return `<td onclick="event.stopPropagation()" style="white-space:nowrap"><input type="text" inputmode="decimal" autocomplete="off" class="in miniw" style="width:58px;${canvi?"border-color:var(--accent);font-weight:700;background:var(--accent-soft)":""}" placeholder="${acta==null?"":acta}" value="${m==null?"":String(m).replace(".",",")}" title="Nota per a ITACA. En blanc = la calculada (${acta==null?"sense nota":acta}). Escriu-ne una altra per a canviar-la a mà." aria-label="Nota ITACA de ${esc(a.nombre)} (${periodo==="final"?"final":TRIMESTRES[Number(periodo)]})" onchange="setNotaItaca('${a.id}','${periodo}',this.value)">${canvi?` <span title="Canviada a mà (calculada: ${acta==null?"—":acta})" style="font-size:12px">✍️</span>`:""}</td>`;
}
function resBotonsFilaHTML(grupo,a,trim){
  return `<td><button class="ghost small" style="border:1px solid var(--line)" title="Vore l'evolució de ${esc(a.nombre)} en esta avaluació" onclick="event.stopPropagation();verEvolucionAlumno('${a.id}')">👁️</button>${grupoTieneEntrega(grupo,a.id,trim)?`<span title="Informe entregado el ${fmt2(grupoTieneEntrega(grupo,a.id,trim).fecha)}" style="margin-left:4px;color:#1e5631;font-weight:700;font-size:13px">✓</span>`:""}</td>
          <td><button class="ghost" onclick="event.stopPropagation();resInformeAlumne('${a.id}')">Informe</button></td>
          <td><button class="ghost" onclick="event.stopPropagation();exportarInformeFinalAlumno('${a.id}')">Informe final</button></td>`;
}
function resTaulaClasseHTML(grupo,al,trim){
  const v=resVista();
  const fila=(a,cos)=>`<tr style="cursor:pointer;${a.id===(al&&al.id)?'background:var(--surface-2)':''}" onclick="irAAlumnoResultados('${a.id}')" title="Vore i editar l'informe de ${esc(a.nombre)} davall"><td><strong><button type="button" class="nom-fitxa" title="Obrir la fitxa de ${esc(a.nombre)} (totes les notes i el seguiment)" onclick="event.stopPropagation();obrirFitxaAlumne('${escJS(a.id)}')">${avatarAlumneHTML(a)}${esc(a.nombre)}</button></strong>${neseBadgeHTML(a)}</td>${cos}</tr>`;
  const finalCurs=state.ui.resInfFinal===true;
  if(v==="blocs"){
    const bl=grupo.bloques||[];
    /* Amb «Avaluació final»: nota de cada bloc en tot el curs i la nota final. */
    const nb=(a,b)=>finalCurs? notaBloqueFinal(grupo,a.id,b.id) : notaBloque(grupo,a.id,b.id,trim);
    return `${finalCurs?`<p class="sub" style="margin:0 0 6px">Final de curs: nota de cada bloc amb les tres avaluacions (mitjana ponderada com la nota final, amb les recuperacions). La columna «Nota final» és la mitjana ponderada de les avaluacions.</p>`:""}<div style="overflow-x:auto"><table>
      <thead><tr><th>Alumne/a</th>${bl.map(b=>`<th title="${esc(b.label)} · ${b.inactiu?"desactivat":(b.peso||0)+" %"}">${esc(b.label)}<div class="sub" style="margin:0;font-weight:400;font-size:11.5px">${b.inactiu?"desactivat":(b.peso||0)+" %"}</div></th>`).join("")}<th>${finalCurs?"Nota final":TRIMESTRES[trim]}</th></tr></thead>
      <tbody>${grupo.alumnos.map(a=>fila(a,bl.map(b=>`<td style="${b.inactiu?"opacity:.55":""}">${fmt(nb(a,b))}</td>`).join("")+`<td><strong>${fmt(finalCurs? notaFinal(grupo,a.id) : notaTrimestre(grupo,a.id,trim))}</strong></td>`)).join("")}</tbody>
    </table></div>`;
  }
  if(v==="ce"){
    const qual=state.ui.resCEqual!==false, trims=finalCurs? [0,1,2] : trimsFinsA(trim);
    const fins=finalCurs? "final de curs (les tres avaluacions)" : esc(TRIMESTRES[trim]);
    const ces=catIndex(grupo.catalogoKey).cat.ces;
    const val={}; grupo.alumnos.forEach(a=>{ val[a.id]={}; ces.forEach(ce=>{ const p=scoreCETrims(grupo,a.id,ce.id,trims); val[a.id][ce.id]=p==null? null : p/10; }); });
    const usades=ces.filter(ce=>grupo.alumnos.some(a=>val[a.id][ce.id]!=null));
    if(!usades.length) return `<p class="sub">Encara no hi ha cap competència específica avaluada fins a la ${fins}. Lliga les preguntes de la rúbrica dels exàmens (o les activitats) als criteris i qualifica-les.</p>`;
    const cel0=x=>qual? pillNivellQual(grupo,x,"",true) : `<span title="${x==null?"":fmt(x)}">${fmt(x)}</span>`;
    /* Tocar la nota → d'on ix (activitats, notes i pesos). detall-ce.js */
    const tf=finalCurs? 2 : trim;
    const cel=(x,a,ce)=>x==null? cel0(x) : `<button type="button" class="res-cebtn" title="Vore en quines activitats s'ha treballat ${ce?esc(ce.id):"cada CE"} i quin pes té" aria-label="${ce?esc(ce.id):"Global"} de ${esc(a.nombre)}: d'on ix la nota" onclick="event.stopPropagation();${ce?`resDetallCE('${escJS(a.id)}','${escJS(ce.id)}',${tf})`:`resDetallGlobalCE('${escJS(a.id)}',${tf})`}">${cel0(x)}</button>`;
    return `<p class="sub" style="margin:0 0 6px">Nota de cada CE amb tot el que s'ha treballat fins a ${finalCurs?"":"la "}${fins} (mitjana dels seus criteris; en els exàmens, de les preguntes lligades a cada criteri). La columna «Global» és la mitjana ponderada de les CE (pesos en Ajustos). <strong>Toca una nota</strong> per a vore en quines activitats s'ha treballat i quin pes té cada una.</p>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Alumne/a</th>${usades.map(ce=>`<th title="${esc(ce.titulo)}">${esc(ce.id)}</th>`).join("")}<th title="Mitjana ponderada de les CE">Global</th></tr></thead>
      <tbody>${grupo.alumnos.map(a=>fila(a,usades.map(ce=>`<td>${cel(val[a.id][ce.id],a,ce)}</td>`).join("")+`<td><strong>${cel(notaPorCE(grupo,a.id,trims),a,null)}</strong></td>`)).join("")}</tbody>
    </table></div>`;
  }
  /* «Notes i ITACA»: capçalera en dos files, agrupada per a que es veja a què
     correspon cada columna (l'avaluació triada, el final de curs o accions). */
  const q=teQualitativaCE(grupo);
  const thG=(txt,n,tit)=>`<th colspan="${n}" scope="colgroup" class="res-grup" title="${esc(tit||"")}" style="text-align:center;border-bottom:2px solid var(--line);border-left:2px solid var(--line)">${txt}</th>`;
  const th=(txt,tit,ini)=>`<th scope="col" title="${esc(tit||"")}"${ini?' style="border-left:2px solid var(--line)"':""}>${txt}</th>`;
  const td=(html,ini)=>`<td${ini?' style="border-left:2px solid var(--line)"':""}>${html}</td>`;
  const titQual=t=>`Qualificació per competències amb TOT el que s'ha treballat fins a la ${TRIMESTRES[t]} (avaluació contínua), a partir de les notes de cada criteri. Per això pot no coincidir amb la nota numèrica de l'avaluació, que només compta les activitats d'esta avaluació i ix dels blocs.`;
  const titItacaF="Nota final que posaràs en ITACA. En blanc = la calculada; escriu-ne una altra per a canviar-la a mà. És la que va a «Exportar notes (CSV)».";
  const fin=`${th(ETQ_QUANT,"Nota numèrica final: mitjana ponderada de les tres avaluacions",true)}${th("Qualificació (acta)","Qualificació i nota d'acta (entera) de la nota final")}${q?th(ETQ_QUAL,"Qualificació per competències de tot el curs"):""}${th("ITACA",titItacaF)}`;
  const nFin=3+(q?1:0);
  const acc=`${th("Evolució","Gràfica de l'evolució de l'alumne/a",true)}${th("Informe","Informe de l'avaluació (PDF)")}${th("Informe final","Informe final de curs (PDF)")}`;
  const celFin=(a,f)=>td(`${fmt(f)}${extraEvalBadgeHTML(grupo,a.id,"final")}`,true)+td(pillCuant(f))+(q?td(pillQual(grupo,a.id,"final")):"")+resCeldaItacaHTML(grupo,a,"final",f);
  const nota=`<p class="sub" style="margin:0 0 6px">${q?`<strong>Per continguts (quantitativa)</strong> = nota numèrica (instruments i blocs) · <strong>Per competències (qualitativa)</strong> = acumulada fins a eixa avaluació, a partir dels criteris (per això pot no coincidir amb la quantitativa) · `:""}<strong>ITACA</strong> = la que es passa a ITACA (en blanc, la calculada; es pot canviar a mà).</p>`;
  if(finalCurs){
    const perAv=1+(q?1:0);
    return nota+`<div style="overflow-x:auto"><table>
      <thead><tr><th rowspan="2" scope="col">Alumne/a</th>${[0,1,2].map(t=>thG(TRIMESTRES[t],perAv)).join("")}${thG("Final de curs",nFin,"Nota final del curs")}${thG("Accions",3)}</tr>
      <tr>${[0,1,2].map(t=>th(ETQ_QUANT,"Nota numèrica de la "+TRIMESTRES[t],true)+(q?th(ETQ_QUAL,titQual(t)):"")).join("")}${fin}${acc}</tr></thead>
      <tbody>${grupo.alumnos.map(a=>{ const f=notaFinal(grupo,a.id);
        return fila(a,[0,1,2].map(t=>td(`${fmt(notaTrimestre(grupo,a.id,t))}${extraEvalBadgeHTML(grupo,a.id,t)}`,true)+(q?td(pillQual(grupo,a.id,t)):"")).join("")
          +celFin(a,f)+resBotonsFilaHTML(grupo,a,trim).replace("<td>",'<td style="border-left:2px solid var(--line)">')); }).join("")}</tbody>
    </table></div>`;
  }
  const nAv=2+(q?1:0);
  return nota+`<div style="overflow-x:auto"><table>
      <thead><tr><th rowspan="2" scope="col">Alumne/a</th>${thG(TRIMESTRES[trim],nAv)}${thG("Final de curs",nFin,"Nota final del curs (mitjana de les avaluacions)")}${thG("Accions",3)}</tr>
      <tr>${th(ETQ_QUANT,"Nota numèrica de la "+TRIMESTRES[trim]+" (mitjana ponderada dels blocs)",true)}${q?th(ETQ_QUAL,titQual(trim)):""}${th("ITACA","Nota que posaràs en ITACA per a la "+TRIMESTRES[trim]+". En blanc = la calculada; escriu-ne una altra per a canviar-la a mà. És la que va a «Exportar notes (CSV)».")}${fin}${acc}</tr></thead>
      <tbody>${grupo.alumnos.map(a=>{const t=notaTrimestre(grupo,a.id,trim),f=notaFinal(grupo,a.id);
        return fila(a,td(`${fmt(t)}${extraEvalBadgeHTML(grupo,a.id,trim)}${avisoBloquesHTML(grupo,a.id,trim)}`,true)+(q?td(pillQual(grupo,a.id,trim)):"")+resCeldaItacaHTML(grupo,a,String(trim),t)
          +celFin(a,f)+resBotonsFilaHTML(grupo,a,trim).replace("<td>",'<td style="border-left:2px solid var(--line)">'));}).join("")}</tbody>
    </table></div>`;
}
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
      <div class="flex res-barra" style="gap:8px;flex-wrap:wrap;align-items:center">
        <select class="in" id="repGrupoSel" style="padding:6px 9px" title="Avaluació de la taula i dels informes (és la mateixa que la de dalt; ací també pots triar la final)" onchange="resTriarAvaluacio(this.value)">
          ${TRIMESTRES.map((t,i)=>`<option value="${i}" ${i===state.ui.trim&&state.ui.resInfFinal!==true?"selected":""}>${t}</option>`).join("")}
          <option value="final" ${state.ui.resInfFinal===true?"selected":""}>Evaluación final (curso completo)</option>
        </select>
        <details class="res-menu">
          <summary class="btn">🖨️ Informes ▾</summary>
          <div class="res-menu-pop" onclick="if(event.target.closest('button')) this.parentElement.open=false">
            <button class="ghost" onclick="resInformeGrup('grup')">Informe de grupo</button>
            <button class="ghost" onclick="resInformeGrup('detallats')">🖨️ Informes detallados</button>
            <button class="ghost" title="Acta per a la sessió d'avaluació: mitjanes, suspesos per tema, alumnat amb mesures, faltes i espai per als acords" onclick="resInformeGrup('acta')">🧾 Acta de la sessió</button>
            <button class="ghost" title="Una pàgina per alumne/a per a les famílies: notes, temes, faltes, observacions i signatures" onclick="resInformeGrup('families')">👪 Informes per a les famílies</button>
            <button class="ghost" title="Llista de qui ha de recuperar i què (temes, blocs o avaluacions), i una carta per a cada família" onclick="resRecuperacions()">🔁 Recuperacions</button>
            <button class="ghost" title="Este grup al costat dels altres grups de la mateixa matèria i curs: mitjanes, aprovats, blocs i temes" onclick="resCompararGrups()">📊 Comparar grups</button>
          </div>
        </details>
        <details class="res-menu">
          <summary class="ghost" style="border:1px solid var(--line)">📤 Exportar ▾</summary>
          <div class="res-menu-pop" onclick="if(event.target.closest('button')) this.parentElement.open=false">
            <button class="ghost" onclick="exportarCSVGrupo()" title="Hoja de cálculo con la media y la nota de acta (entera) de cada alumno/a, lista para pasar a ITACA">Exportar notas (CSV)</button>
            <button class="ghost" onclick="resInformeGrup('individuals')">Exportar tots els informes individuals</button>
            <button class="ghost" onclick="exportarInformesFinalesTodos()">Exportar informes finales de curso</button>
            <button class="ghost" title="Archivo con los suspensos de tu materia en cada evaluación, para cargarlo en el Gestor de Tutoría del tutor/a del grupo" onclick="exportarParaTutoria()">👥 Para la tutoría</button>
          </div>
        </details>
        <button class="ghost" style="border:1px solid var(--line)" title="Sumar puntos a la nota de la evaluación o a la nota final (p. ej. +0,5 por presentarse voluntario/a)" onclick="abrirExtrasEvaluacion(${trim})">➕ Puntos extra</button>
        <button class="ghost" style="border:1px solid var(--line)" title="Esborranys de comentari per a qui encara no en tinga (no en sobreescriu cap)" onclick="comSugerirGrupo('va')">💬 Comentaris buits</button>
      </div>
    </div>
    ${resVistaBotonsHTML(grupo)}
    <p class="sub" style="margin:6px 0 10px">Toca el nom d'un alumne/a per a obrir la seua fitxa (totes les notes i el seguiment). Toca la resta de la fila per a vore i editar el seu informe complet davall.</p>
    ${resTaulaClasseHTML(grupo,al,trim)}
  </div>
  ${state.ui.evolModalAl?evolucionModalHTML(grupo,grupo.alumnos.find(x=>x.id===state.ui.evolModalAl)):""}`;

  if(!al){ c.innerHTML=htmlClase+grafiquesGrupHTML(grupo); return; }
  const nt=notaTrimestre(grupo,al.id,trim), nf=notaFinal(grupo,al.id);
  const ccT=Object.keys(COMP_CLAVE).filter(cc=>idx.cat.ces.some(ce=>ce.cc.includes(cc))).map(cc=>({cc,p:scoreCC(grupo,al.id,cc)})).filter(x=>x.p!=null);
  const ceT=idx.cat.ces.map(ce=>({ce,p:scoreCE(grupo,al.id,ce.id)})).filter(x=>x.p!=null);
  
  const actsT = actsDeAlumne(grupo, actsTrim(grupo), al.id);
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
     ? `<div class="alert-box" style="margin-bottom:16px">⚠️ <strong>Atenció:</strong> L'alumne/a no té qualificació en estos criteris que el grup ha treballat en esta avaluació, i això pot desequilibrar la nota: ${critSinNota.join(', ')}.</div>`
     : '');

  c.innerHTML=htmlClase+`
  <div class="card res-informe-cap" style="margin-top:28px">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div><h2 style="margin:0 0 4px">Informe de <span class="res-informe-nom" style="font-size:1.45em;display:inline-block;margin-left:4px"><button type="button" class="nom-fitxa" title="Obrir la fitxa de ${esc(al.nombre)} (totes les notes i el seguiment)" onclick="obrirFitxaAlumne('${escJS(al.id)}')">${typeof avatarAlumneHTML==="function"?avatarAlumneHTML(al):""}${esc(al.nombre)}</button></span>${neseBadgeHTML(al)}</h2><p class="sub" style="margin:0">${TRIMESTRES[trim]}</p></div>
      <div class="flex">
        <button class="ghost" style="border:1px solid var(--line)" onclick="irAAlumnoResultados('')">← Ver toda la clase</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="exportarInformeFinalAlumno('${al.id}')">Exportar informe final de curso</button>
        <button class="btn" onclick="resInformeAlumne('${al.id}')">Exportar informe individual</button>
      </div>
    </div>
  </div>

  ${htmlAlertaAsimetria}

  <div class="card">
    <h2 style="font-size:15px">Qualificació per continguts (quantitativa)</h2>
    <p class="sub">Ponderación: ${grupo.bloques.map(b=>`${esc(b.label)} ${b.inactiu?"desactivat":b.peso+" %"}`).join(" · ")}.</p>
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
    <h2 style="font-size:15px">Qualificació per competències (qualitativa)</h2>
    <p class="sub">Mitjana ponderada de les competències específiques amb la qualificació de cada criteri (pesos en Ajustos → Mode de qualificació). Va per separat de la qualificació per continguts (quantitativa) i els punts extra no la toquen.</p>
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
    <textarea class="in" id="resComentario" style="width:100%;min-height:90px;resize:vertical" placeholder="Comentari sobre la qualificació de la ${TRIMESTRES[trim]}…">${esc((al.comentariosEval&&al.comentariosEval[trim])||"")}</textarea>
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


/* El desplegable de «Tota la classe» canvia també l'avaluació de la taula (la
   mateixa que el selector de dalt): abans només triava la dels informes i
   semblava que no feia res. «Avaluació final» mostra en la taula les tres avaluacions i la final. */
window.resTriarAvaluacio=v=>{
  if(v==="final"){ state.ui.resInfFinal=true; save(); render(); return; }
  state.ui.resInfFinal=false; state.ui.trim=Number(v)||0; save(); render();
};

/* =================================================================
   Triar les avaluacions d'un informe
   En demanar un informe des de Resultats ix una finestra amb 1a, 2a, 3a i
   Final per a marcar quines vols. Ja ve marcada la del desplegable de
   Resultats (es pot desmarcar). Si en marques més d'una, s'obri un sol
   document amb totes, cadascuna en pàgines a banda.
   ================================================================= */
const RES_INF_PERIODES=[{v:"0",t:()=>TRIMESTRES[0]},{v:"1",t:()=>TRIMESTRES[1]},{v:"2",t:()=>TRIMESTRES[2]},{v:"final",t:()=>"Avaluació final"}];
function resAvaluacioTriada(){ return state.ui.resInfFinal===true? "final" : String(state.ui.trim); }
function resTriarAvaluacionsInforme(titol){
  const actual=resAvaluacioTriada();
  if(window.__dialogosAuto){ const a=window.__dialogosAuto.avaluacions; return Promise.resolve(a? a.map(String) : [actual]); }
  return new Promise(resolve=>{
    const previo=document.activeElement;
    const div=document.createElement("div");
    div.className="modal-overlay dlg-overlay"; div.style.zIndex=String(++_dlgZ);
    div.innerHTML=`<div class="modal-box dlg-box" role="dialog" aria-modal="true" aria-labelledby="resAvT" style="max-width:420px">
      <h2 id="resAvT" style="font-size:16.5px;margin-bottom:6px">${esc(titol)}</h2>
      <p class="sub" style="margin:0 0 10px">Quines avaluacions vols en l'informe? Pots marcar-ne més d'una: ixen totes en un mateix document.</p>
      <div id="resAvChecks" style="display:grid;gap:8px">${RES_INF_PERIODES.map(p=>`<label style="display:flex;gap:8px;align-items:center;font-size:14.5px"><input type="checkbox" value="${p.v}" ${p.v===actual?"checked":""}> ${esc(p.t())}</label>`).join("")}</div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:16px">
        <button class="ghost dlg-no" style="border:1px solid var(--line)">Cancel·lar</button>
        <button class="btn dlg-si">Fer l'informe</button>
      </div></div>`;
    document.body.appendChild(div);
    const si=div.querySelector(".dlg-si"), checks=[...div.querySelectorAll("#resAvChecks input")];
    const triades=()=>checks.filter(c=>c.checked).map(c=>c.value);
    const actualitza=()=>{ si.disabled=!triades().length; };
    checks.forEach(c=>c.addEventListener("change",actualitza)); actualitza();
    const fin=v=>{ div.remove(); document.removeEventListener("keydown",tecla,true); try{ previo&&previo.focus&&previo.focus(); }catch(e){} resolve(v); };
    const tecla=e=>{ if(!document.body.contains(div)) return;
      if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); fin(null); }
      else if(e.key==="Enter"){ e.preventDefault(); e.stopPropagation(); if(triades().length) fin(triades()); } };
    document.addEventListener("keydown",tecla,true);
    si.onclick=()=>{ if(triades().length) fin(triades()); };
    div.querySelector(".dlg-no").onclick=()=>fin(null);
    div.onclick=e=>{ if(e.target===div) fin(null); };
    setTimeout(()=>{ (div.querySelector("#resAvChecks input:checked")||si).focus(); },20);
  });
}
/* Crida genera(periode) per a cada avaluació triada; si n'hi ha més d'una,
   ajunta tots els documents en un de sol. */
function resInformePerAvaluacions(periodes,genera,titol){
  if(periodes.length===1){ genera(periodes[0]); return; }
  const parts=[]; window._capturaInforme=parts;
  try{ periodes.forEach(p=>genera(p)); } finally { window._capturaInforme=null; }
  if(!parts.length) return;
  const noms=periodes.map(p=>RES_INF_PERIODES.find(x=>x.v===p).t()).join(", ");
  const cos=parts.map((x,i)=>`<div${i?' style="page-break-before:always;break-before:page"':""}>${x.opts.portada||""}${x.bodyHtml}</div>`).join("");
  abrirVentanaInforme(`${titol} · ${noms}`, cos, {landscape:parts.some(x=>x.opts.landscape), center:parts.some(x=>x.opts.center), maxWidth:parts[0].opts.maxWidth});
}
window.resInformeAlumne=async alId=>{
  const grupo=grupoActual(); const al=grupo&&grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const per=await resTriarAvaluacionsInforme(`Informe de ${al.nombre}`); if(!per) return;
  resInformePerAvaluacions(per,p=>p==="final"? exportarInformeFinalAlumno(alId) : conTrim(Number(p),()=>exportarInformeAlumno(alId)),`Informe · ${al.nombre}`);
};
window.resInformeGrup=async tipus=>{
  const grupo=grupoActual(); if(!grupo) return;
  const T={grup:["Informe de grup",p=>exportarInformeGrupo(p)],
    detallats:["Informes detallats",p=>exportarInformesDetalladosTodos(p)],
    acta:["Acta de la sessió",p=>exportarActaSessio(p)],
    families:["Informes per a les famílies",p=>exportarInformesFamiliaTots(p)],
    individuals:["Informes individuals",p=>p==="final"? exportarInformesFinalesTodos() : conTrim(Number(p),()=>exportarInformesTodos())]}[tipus];
  if(!T) return;
  const per=await resTriarAvaluacionsInforme(T[0]); if(!per) return;
  resInformePerAvaluacions(per,T[1],`${T[0]} · ${grupo.nombre}`);
};
