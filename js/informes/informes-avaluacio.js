/* ============================================================================
   Quadern d'avaluació · Informes per a la sessió d'avaluació
   js/informes/informes-avaluacio.js

   - Informe per a la família: una pàgina per alumne/a amb les notes, com va
     tema a tema, faltes, convivència, observacions i mesures de suport.
     exportarInformeFamilia(alId) · exportarInformesFamiliaTots()
   - Acta de la sessió d'avaluació del grup: mitjanes, distribució de notes,
     suspesos per tema, alumnat amb mesures (NESE, repetició, pendents, reforç),
     faltes i convivència a revisar, propostes i espai per als acords.
     exportarActaSessio(trim)
   - Fitxa de repàs d'un tema: una pàgina per alumne/a amb les seues notes del
     tema, els criteris que ha de reforçar, els sabers i el dossier de repàs
     (exercicis + models d'examen, generat per tools/material/dossiers_repas.py).
     exportarFitxesRepas(temaId, quins)
   Tot es calcula amb les mateixes funcions que la resta de l'app i s'imprimix
   amb abrirVentanaInforme (Imprimir / Guardar PDF). No guarda res.
   ============================================================================ */
function _iaData(){ return new Date().toLocaleDateString("ca-ES"); }
function _iaPeriode(g,trim){
  const ft=g.fechasTrimestre&&g.fechasTrimestre[trim];
  if(ft&&ft.inicio&&ft.fin) return {desde:ft.inicio,fins:ft.fin,txt:`del ${fmt2(ft.inicio)} al ${fmt2(ft.fin)}`};
  return {desde:"0000-00-00",fins:"9999-12-31",txt:"tot el curs fins hui"};
}
function _iaMitjana(a){ return a.length? a.reduce((x,y)=>x+y,0)/a.length : null; }
function _iaMediana(a){ if(!a.length) return null; const s=a.slice().sort((x,y)=>x-y), m=Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }
function _iaNota(g,alId,trim){ try{ return trim==="final"? notaFinal(g,alId) : notaTrimestre(g,alId,trim); }catch(e){ return null; } }
function _iaActaTxt(g,v){ if(v==null) return "—"; const e=etiquetaNota(v,g); return `${notaActa(v,g)}${e?"\u00a0·\u00a0"+e.etq:""}`; }
function _iaQual(g){ return typeof teQualitativaCE==="function" && teQualitativaCE(g); }
function _iaPillQual(g,alId,periode){
  let v=null; try{ v=notaQualitativaCE(g,alId,periode); }catch(e){}
  const e=v==null? null : nivellQual(g,v);
  return e? `<span class="pill" style="background:${e.bg};color:${e.fg}">${e.etq}</span>${notaQualNumHTML(v)}` : `<span style="color:#888">Sense dades</span>`;
}
function _iaQualCel(g,alId,periode){ let v=null; try{ v=notaQualitativaCE(g,alId,periode); }catch(e){} const e=v==null? null : nivellQual(g,v); return e? esc(e.etq)+notaQualNumHTML(v) : "—"; }
function _iaQualTxt(g,alId,periode){ let v=null; try{ v=notaQualitativaCE(g,alId,periode); }catch(e){} const e=v==null? null : nivellQual(g,v); return e? e.etq : "—"; }
function _iaPill(g,v){
  const e=v==null? null : etiquetaNota(v,g);
  return e? `<span class="pill" style="background:${e.bg};color:${e.fg}">${notaActa(v,g)} · ${e.etq}</span>` : `<span style="color:#888">Sense nota</span>`;
}
/* Temes d'un període amb alguna activitat (no recuperació) lligada. */
function _iaTemesPeriode(g,trim){
  if(typeof temesDeGrup!=="function") return [];
  return temesDeGrup(g).filter(s=>(trim==="final"||s.trimestre===trim) && (g.actividades||[]).some(a=>!a.recupera && a.temaId===s.id));
}
/* Mesures d'atenció a la diversitat d'un alumne/a (textos curts). */
function _iaMesures(al,perFamilia){
  const m=[];
  if(al.nese) m.push(perFamilia? "Adaptació curricular (NESE)" : "NESE"+(al.neseNivel?` (${al.neseNivel})`:"")+(typeof nePlanDe==="function"&&nePlanDe(al.id)?" · amb pla":""));
  if(al.repetidor) m.push("Repetidor/a");
  if((state.planesRepeticion||[]).some(p=>p.alumnoId===al.id && p.estado==="activo")) m.push("Pla de repetició");
  if((al.pendientes||[]).length) m.push("Pendents: "+al.pendientes.map(p=>typeof p==="string"?p:(p&&(p.materia||p.nombre))||"").filter(Boolean).join(", "));
  const rf=(state.planesRefuerzo||[]).filter(p=>p.alumnoId===al.id && p.estado==="activo");
  if(rf.length) m.push("Pla de reforç");
  if(al.plan && !perFamilia) m.push(String(al.plan));
  return m;
}
/* Dossier de repàs d'un tema, si n'hi ha (null si no). */
function _iaDossier(g,s,adaptat){
  const p=typeof progDeGrupo==="function"? progDeGrupo(g) : null;
  if(!p || typeof materialDe!=="function") return null;
  const mat=materialDe(p.catalogoKey), n=materialNumTema(s);
  const ll=mat&&n? (mat[n]||[]).filter(it=>it.tipus==="repas") : [];
  const it=(adaptat&&ll.find(x=>/adaptat/.test(x.f))) || ll.find(x=>!/adaptat/.test(x.f)) || null;
  return it? {...it,url:`docs/material/${p.catalogoKey}/${it.f}`} : null;
}
const _IA_CSS=`<style>
  .ia-full{page-break-before:always;break-before:page}
  .ia-full:first-child{page-break-before:auto;break-before:auto}
  .ia-cap{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:2px solid #152a44;padding-bottom:6px;margin-bottom:10px}
  .ia-cap h1{font-size:18px;margin:0;color:#152a44}
  .ia-cap .meta{margin:0;font-size:12px;color:#555;text-align:right}
  .ia-nom{font-size:16px;font-weight:700;margin:6px 0 2px}
  .ia h2{font-size:13.5px;margin:12px 0 5px;color:#152a44;border-bottom:1px solid #ccc;padding-bottom:3px}
  .ia table{font-size:12px} .ia th,.ia td{padding:4px 6px}
  .ia .caixa{border:1px solid #bbb;border-radius:6px;padding:8px 10px;font-size:12.5px;min-height:54px;white-space:pre-wrap}
  .ia .linies{border-bottom:1px solid #999;height:22px}
  .ia .firmes{display:flex;gap:18px;margin-top:16px;font-size:11.5px;color:#444}
  .ia .firmes div{flex:1;border-top:1px solid #777;padding-top:4px;margin-top:34px}
  .ia .nota-gran{font-size:22px;font-weight:700}
  .ia .xicotet{font-size:11px;color:#666}
  .ia .chk{display:inline-block;width:11px;height:11px;border:1px solid #444;margin-right:6px;vertical-align:-1px}
  .ia .kpis{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}
  .ia .kpi{border:1px solid #ccc;border-radius:6px;padding:6px 10px;min-width:92px}
  .ia .kpi b{display:block;font-size:17px}
  .ia .kpi span{font-size:11px;color:#555}
</style>`;
function _iaCap(g,titol,trim){
  const cat=getCatalogo(g.catalogoKey);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  return `<div class="ia-cap"><h1>${esc(titol)}</h1><p class="meta">${esc(state.centroNombre||"")}${state.centroNombre?"<br>":""}${esc(cat.materia)} · ${esc(cat.curso)} · Grup ${esc(g.nombre)}<br>${esc(per)} · Curs ${esc(cursoEscolarEfectivo(null)||"")} · ${_iaData()}</p></div>`;
}

/* ───────────────────────── 4 · Informe per a la família ───────────────────────── */
function informeFamiliaBodyHTML(g,al,trim){
  const fin=trim==="final", ambFinal=fin||trim===2;
  const per=fin? {desde:"0000-00-00",fins:"9999-12-31",txt:"tot el curs"} : _iaPeriode(g,trim);
  const v=_iaNota(g,al.id,trim);
  const trims=[0,1,2].filter(t=>fin||t<=trim);
  const notes=`<table><thead><tr>${trims.map(t=>`<th>${esc(TRIMESTRES[t])}</th>`).join("")}${ambFinal?"<th>Final</th>":""}</tr></thead>
    <tbody><tr>${trims.map(t=>`<td>${_iaPill(g,_iaNota(g,al.id,t))}</td>`).join("")}${ambFinal?`<td>${_iaPill(g,_iaNota(g,al.id,"final"))}</td>`:""}</tr>
    ${_iaQual(g)?`<tr>${trims.map(t=>`<td><span class="xicotet">Per competències (qualitativa):</span> ${_iaPillQual(g,al.id,t)}</td>`).join("")}${ambFinal?`<td><span class="xicotet">Per competències (qualitativa):</span> ${_iaPillQual(g,al.id,"final")}</td>`:""}</tr>`:""}</tbody></table>
    ${_iaQual(g)?`<p class="xicotet" style="margin:3px 0 0">Dalt, la qualificació per continguts (quantitativa, la nota numèrica); baix, la qualificació per competències (qualitativa).</p>`:""}`;
  /* Temes */
  const temes=_iaTemesPeriode(g,trim);
  const filesTemes=temes.map(s=>{
    const n=typeof notaTemaAlumne==="function"? notaTemaAlumne(g,al.id,s.id) : null;
    const estat=n==null? "Sense nota" : n>=5? "Superat" : "Per recuperar";
    const dos=n!=null&&n<5? _iaDossier(g,s,al.nese) : null;
    return `<tr><td>${esc(temaNomCurt(s))}</td><td style="text-align:center"><strong style="${n!=null&&n<5?"color:#912525":""}">${fmt(n)}</strong></td><td>${estat}${dos?` <span class="xicotet">· té un dossier de repàs</span>`:""}</td></tr>`;
  }).join("");
  /* Assistència i convivència */
  const as=asistContarPeriodo(g,al.id,per.desde,per.fins);
  const cv=typeof convContarTipos==="function"? convContarTipos(g,al.id,per.desde,per.fins) : {ac:0,rc:0,pa:0};
  const np=(g.actividades||[]).filter(a=>(fin||a.trimestre===trim) && marcaDe(g,al.id,a.id)==="NP");
  const com=fin? "" : ((al.comentariosEval||[])[trim]||"").trim();
  const mes=_iaMesures(al,true).filter(x=>x!=="Repetidor/a");
  return `<div class="ia ia-full">
    ${_iaCap(g,"Informe d'avaluació per a la família",trim)}
    <div class="flex" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div><div class="ia-nom">${esc(al.nombre)}</div><div class="xicotet">${esc(profesorNombreEfectivo(null)?"Professor/a: "+profesorNombreEfectivo(null):"")}</div></div>
      <div style="text-align:right"><div class="xicotet">Qualificació · ${esc(fin?"Avaluació final":TRIMESTRES[trim])}</div><div class="nota-gran">${esc(_iaActaTxt(g,v))}</div></div>
    </div>
    <h2>Qualificacions</h2>${notes}
    ${temes.length?`<h2>Tema a tema</h2><table><thead><tr><th>Tema</th><th style="width:70px;text-align:center">Nota</th><th style="width:220px">Estat</th></tr></thead><tbody>${filesTemes}</tbody></table>
      <p class="xicotet" style="margin:3px 0 0">Mitjana de les activitats de cada tema. La qualificació de l'avaluació es calcula amb els criteris de la programació.</p>`:""}
    <h2>Assistència i actitud (${esc(per.txt)})</h2>
    <table><tbody>
      <tr><th style="width:46%">Faltes d'assistència justificades</th><td>${as.falta_justificada}</td></tr>
      <tr><th>Faltes d'assistència sense justificar</th><td>${as.falta_no_justificada}</td></tr>
      <tr><th>Retards</th><td>${as.retraso}</td></tr>
      <tr><th>Reconeixements positius</th><td>${cv.rc}</td></tr>
      <tr><th>Anotacions d'actitud / amonestacions</th><td>${cv.ac} / ${cv.pa}</td></tr>
      ${np.length?`<tr><th>Treballs o proves no presentats</th><td>${np.length}: ${esc(np.map(a=>a.nombre).join(", "))}</td></tr>`:""}
    </tbody></table>
    ${mes.length?`<h2>Mesures de suport</h2><p style="font-size:12.5px;margin:0">${esc(mes.join(" · "))}</p>`:""}
    <h2>Observacions del professor/a</h2>
    <div class="caixa">${com?esc(com):"&nbsp;"}</div>
    <div class="firmes"><div>Signatura del professor/a</div><div>Assabentat/da: signatura del pare, mare o tutor/a legal</div></div>
  </div>`;
}
window.exportarInformeFamilia=(alId,trim)=>{
  const g=grupoActual(); const al=g&&g.alumnos.find(a=>a.id===alId); if(!al) return;
  if(trim==null) trim=state.ui.trim;
  if(trim!=="final") trim=Number(trim);
  abrirVentanaInforme(`Informe per a la família · ${al.nombre} · ${trim==="final"?"Avaluació final":TRIMESTRES[trim]}`, _IA_CSS+informeFamiliaBodyHTML(g,al,trim));
};
window.exportarInformesFamiliaTots=(trim)=>{
  const g=grupoActual(); if(!g) return;
  if(!g.alumnos.length){ mostrarAviso("Este grup encara no té alumnat."); return; }
  if(trim==null || trim==="") trim=state.ui.trim;
  if(trim!=="final") trim=Number(trim);
  abrirVentanaInforme(`Informes per a les famílies · ${g.nombre} · ${trim==="final"?"Avaluació final":TRIMESTRES[trim]}`, _IA_CSS+g.alumnos.map(al=>informeFamiliaBodyHTML(g,al,trim)).join(""));
};

/* ───────────────────────── 5 · Acta de la sessió d'avaluació ───────────────────────── */
function actaSessioBodyHTML(g,trim){
  const per=trim==="final"? {desde:"0000-00-00",fins:"9999-12-31",txt:"tot el curs"} : _iaPeriode(g,trim);
  const files=g.alumnos.map(al=>({al,v:_iaNota(g,al.id,trim)}));
  const amb=files.filter(x=>x.v!=null), vals=amb.map(x=>x.v);
  const ap=amb.filter(x=>esAprobado(x.v,g)), su=amb.filter(x=>!esAprobado(x.v,g));
  const pct=n=>amb.length? Math.round(n/amb.length*100)+" %" : "—";
  const dist=NIVCUANT.map(n=>({etq:n.etq,bg:n.bg,fg:n.fg,n:amb.filter(x=>{ const e=etiquetaNota(x.v,g); return e&&e.etq===n.etq; }).length}));
  const distQ=_iaQual(g)? escalaQual(g).map(n=>({...n,etq:n.nom||n.abr})).map(n=>({etq:n.etq,bg:n.bg,fg:n.fg,n:g.alumnos.filter(al=>_iaQualTxt(g,al.id,trim)===n.etq).length})) : null;
  const kpi=(b,s)=>`<div class="kpi"><b>${b}</b><span>${s}</span></div>`;
  /* Temes */
  const temes=_iaTemesPeriode(g,trim);
  const filesTemes=temes.map(s=>{
    const ns=g.alumnos.map(al=>({al,n:notaTemaAlumne(g,al.id,s.id)})).filter(x=>x.n!=null);
    const sus=ns.filter(x=>x.n<5);
    return `<tr><td>${esc(temaNomCurt(s))}</td><td style="text-align:center">${fmt(_iaMitjana(ns.map(x=>x.n)))}</td><td style="text-align:center">${ns.length-sus.length}/${ns.length}</td>
      <td style="font-size:11.5px">${sus.length?`<strong>${sus.length}:</strong> ${esc(sus.map(x=>x.al.nombre).join("; "))}`:"—"}</td></tr>`;
  }).join("");
  /* Mesures */
  const mesures=g.alumnos.map(al=>({al,m:_iaMesures(al),v:_iaNota(g,al.id,trim)})).filter(x=>x.m.length);
  /* Suspesos amb detall */
  const temesSus=al=>temes.filter(s=>{ const n=notaTemaAlumne(g,al.id,s.id); return n!=null&&n<5; }).map(s=>temaNomCurt(s).replace(/^Tema\s*(\d+)\.?-?\s*/i,"T$1 "));
  const nps=al=>(g.actividades||[]).filter(a=>(trim==="final"||a.trimestre===trim) && marcaDe(g,al.id,a.id)==="NP").length;
  /* Faltes i convivència */
  const alertes=g.alumnos.map(al=>{
    const as=asistContarPeriodo(g,al.id,per.desde,per.fins);
    const cv=typeof convContarTipos==="function"? convContarTipos(g,al.id,per.desde,per.fins) : {ac:0,rc:0,pa:0};
    return {al,as,cv};
  }).filter(x=>x.as.falta_no_justificada>=3 || x.as.retraso>=5 || x.cv.pa>0 || x.cv.ac>=3);
  const prop=trim==="final"? (g.propuestasMejoraFinal||"") : ((g.propuestasMejora||[])[trim]||"");
  return `<div class="ia">
    ${_iaCap(g,"Acta de la sessió d'avaluació",trim)}
    <p style="font-size:12px;margin:0 0 6px">Data de la sessió: ____________ &nbsp; Assistents: ____________________________________________</p>
    <h2>Resultats del grup</h2>
    <div class="kpis">${kpi(g.alumnos.length,"alumnes")}${kpi(amb.length,"amb nota")}${kpi(`${ap.length} <small style="font-size:12px;font-weight:400">(${pct(ap.length)})</small>`,"aprovats")}${kpi(`${su.length} <small style="font-size:12px;font-weight:400">(${pct(su.length)})</small>`,"suspesos")}${kpi(fmt(_iaMitjana(vals)),"mitjana")}${kpi(fmt(_iaMediana(vals)),"mediana")}${kpi(vals.length?fmt(Math.max(...vals))+" / "+fmt(Math.min(...vals)):"—","màx. / mín.")}</div>
    <table><thead><tr>${dist.map(d=>`<th style="text-align:center">${esc(d.etq)}</th>`).join("")}</tr></thead><tbody><tr>${dist.map(d=>`<td style="text-align:center"><span class="pill" style="background:${d.bg};color:${d.fg}">${d.n}</span></td>`).join("")}</tr></tbody></table>
    ${distQ?`<p class="xicotet" style="margin:6px 0 2px">Qualificació per competències (qualitativa) (${distQ.reduce((x,d)=>x+d.n,0)} amb dades):</p><table><thead><tr>${distQ.map(d=>`<th style="text-align:center">${esc(d.etq)}</th>`).join("")}</tr></thead><tbody><tr>${distQ.map(d=>`<td style="text-align:center"><span class="pill" style="background:${d.bg};color:${d.fg}">${d.n}</span></td>`).join("")}</tr></tbody></table>`:""}
    ${temes.length?`<h2>Resultats per tema</h2><table><thead><tr><th>Tema</th><th style="width:62px;text-align:center">Mitjana</th><th style="width:70px;text-align:center">Aprovats</th><th>Suspesos</th></tr></thead><tbody>${filesTemes}</tbody></table>`:""}
    <h2>Alumnat suspés (${su.length})</h2>
    ${su.length?`<table><thead><tr><th>Alumne/a</th><th style="width:80px">${distQ?"Per continguts (quantitativa)":"Nota"}</th>${distQ?'<th style="width:80px">Per competències (qualitativa)</th>':""}<th>Temes per recuperar</th><th style="width:44px">NP</th><th>Mesures</th></tr></thead><tbody>
      ${su.sort((a,b)=>a.v-b.v).map(x=>`<tr><td>${esc(x.al.nombre)}</td><td>${esc(_iaActaTxt(g,x.v))}</td>${distQ?`<td>${_iaQualCel(g,x.al.id,trim)}</td>`:""}<td style="font-size:11.5px">${esc(temesSus(x.al).join(", ")||"—")}</td><td>${nps(x.al)||""}</td><td style="font-size:11.5px">${esc(_iaMesures(x.al).join(" · "))}</td></tr>`).join("")}
    </tbody></table>`:`<p style="font-size:12.5px;margin:0">Cap alumne/a suspés.</p>`}
    <h2>Alumnat amb mesures d'atenció a la diversitat (${mesures.length})</h2>
    ${mesures.length?`<table><thead><tr><th>Alumne/a</th><th>Mesures</th><th style="width:80px">${distQ?"Per continguts (quantitativa)":"Nota"}</th>${distQ?'<th style="width:80px">Per competències (qualitativa)</th>':""}<th style="width:34%">Valoració / proposta</th></tr></thead><tbody>
      ${mesures.map(x=>`<tr><td>${esc(x.al.nombre)}</td><td style="font-size:11.5px">${esc(x.m.join(" · "))}</td><td>${esc(_iaActaTxt(g,x.v))}</td>${distQ?`<td>${_iaQualCel(g,x.al.id,trim)}</td>`:""}<td></td></tr>`).join("")}
    </tbody></table>`:`<p style="font-size:12.5px;margin:0">Cap alumne/a amb mesures registrades en el Quadern.</p>`}
    <h2>Assistència i convivència a revisar (${esc(per.txt)})</h2>
    ${alertes.length?`<table><thead><tr><th>Alumne/a</th><th style="text-align:center">Faltes sense just.</th><th style="text-align:center">Retards</th><th style="text-align:center">Anot. actitud</th><th style="text-align:center">Amonestacions</th></tr></thead><tbody>
      ${alertes.map(x=>`<tr><td>${esc(x.al.nombre)}</td><td style="text-align:center">${x.as.falta_no_justificada}</td><td style="text-align:center">${x.as.retraso}</td><td style="text-align:center">${x.cv.ac}</td><td style="text-align:center">${x.cv.pa}</td></tr>`).join("")}
    </tbody></table><p class="xicotet" style="margin:3px 0 0">Ixen qui té 3 o més faltes sense justificar, 5 o més retards, 3 o més anotacions d'actitud o alguna amonestació.</p>`:`<p style="font-size:12.5px;margin:0">Res a destacar.</p>`}
    <h2>Propostes de millora</h2>
    <div class="caixa">${prop.trim()?esc(prop.trim()):"&nbsp;"}</div>
    <h2>Acords de la sessió</h2>
    <div class="linies"></div><div class="linies"></div><div class="linies"></div><div class="linies"></div>
    <div class="firmes"><div>Professor/a de la matèria</div><div>Tutor/a del grup</div></div>
  </div>`;
}
window.exportarActaSessio=(trim)=>{
  const g=grupoActual(); if(!g) return;
  if(!g.alumnos.length){ mostrarAviso("Este grup encara no té alumnat."); return; }
  if(trim==null || trim==="") trim=state.ui.trim;
  if(trim!=="final") trim=Number(trim);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  abrirVentanaInforme(`Acta de la sessió d'avaluació · ${g.nombre} · ${per}`, _IA_CSS+actaSessioBodyHTML(g,trim));
};

/* ───────────────────────── 6 · Fitxa de repàs d'un tema ───────────────────────── */
function _iaSabers(s){
  const m=/Sabers:\s*([^\n]+)/.exec(s.saberesOtros||"");
  return m? m[1].replace(/\.\s*$/,"").split(/;\s*/).filter(Boolean) : [];
}
function _iaCriterisTema(g,s){
  const set=new Set();
  (g.actividades||[]).filter(a=>!a.recupera && a.temaId===s.id).forEach(a=>(a.criterios||[]).forEach(c=>set.add(c.critId)));
  return [...set];
}
function fitxaRepasBodyHTML(g,al,s){
  const idx=catIndex(g.catalogoKey);
  const acts=(g.actividades||[]).filter(a=>!a.recupera && a.temaId===s.id);
  const n=notaTemaAlumne(g,al.id,s.id);
  const crit=_iaCriterisTema(g,s).map(cid=>({cid,c:idx.critMap[cid],p:conTrim(s.trimestre,()=>scoreCriterio(g,al.id,cid))}));
  const fluixos=crit.filter(x=>x.p!=null && x.p<g.umbrales.adecuado);
  const llistaCrit=(fluixos.length?fluixos:crit).slice(0,8);
  const sabers=_iaSabers(s);
  const dos=_iaDossier(g,s,al.nese);
  const p=progDeGrupo(g); const mat=p&&typeof materialDe==="function"? materialDe(p.catalogoKey) : null;
  const items=mat? (mat[materialNumTema(s)]||[]).filter(it=>it.tipus==="teoria"||it.tipus==="presentacio") : [];
  return `<div class="ia ia-full">
    ${_iaCap(g,"Fitxa de repàs",s.trimestre)}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px">
      <div><div class="ia-nom">${esc(al.nombre)}</div><div style="font-size:14px;font-weight:600;color:#152a44">${esc(temaNomCurt(s))}${s.titulo?` <span style="font-weight:400;font-style:italic;color:#555">· ${esc(s.titulo)}</span>`:""}</div></div>
      <div style="text-align:right"><div class="xicotet">Nota del tema</div><div class="nota-gran" style="${n!=null&&n<5?"color:#912525":""}">${fmt(n)}</div></div>
    </div>
    <h2>Les teues notes en este tema</h2>
    ${acts.length?`<table><tbody>${acts.map(a=>{ const v=notaActividad(g,al.id,a), mk=marcaDe(g,al.id,a.id); return `<tr><td>${esc(a.nombre)}</td><td style="width:90px;text-align:right"><strong style="${v!=null&&v<5?"color:#912525":""}">${mk==="NP"?"No presentat":mk==="EX"?"Exempt":fmt(v)}</strong></td></tr>`; }).join("")}</tbody></table>`:`<p style="font-size:12.5px;margin:0">Encara no hi ha activitats d'este tema.</p>`}
    ${llistaCrit.length?`<h2>${fluixos.length?"Què has de reforçar":"Què s'avalua en este tema"}</h2>
      <ul style="margin:0;padding-left:18px;font-size:12.5px">${llistaCrit.map(x=>`<li style="margin:2px 0"><strong>${esc(x.cid)}</strong> ${esc(x.c&&x.c.texto||"")}${x.p!=null?` <span class="xicotet">(${Math.round(x.p)} %)</span>`:""}</li>`).join("")}</ul>`:""}
    ${sabers.length?`<h2>Continguts del tema</h2><p style="font-size:12.5px;margin:0">${sabers.map(x=>`<span class="chk"></span>${esc(x)}`).join(" &nbsp; ")}</p>`:""}
    <h2>Què has de fer</h2>
    <ol style="margin:0;padding-left:20px;font-size:12.5px">
      <li style="margin:3px 0">Repassa la teoria${items.length?`: ${esc(items.map(it=>it.t).join("; "))}`:" del tema (apunts i llibreta)"}.</li>
      <li style="margin:3px 0">${dos?`Fes el <strong>${esc(dos.t.replace(/\s*\(.*\)$/,""))}</strong> (${esc((/\((.*)\)/.exec(dos.t)||["",""])[1])}): exercicis i models d'examen d'altres cursos.`:"Fes els exercicis del tema que t'indique el professor/a."} Explica cada pas i posa les unitats.</li>
      <li style="margin:3px 0">Apunta els dubtes i pregunta'ls a classe abans de la prova.</li>
    </ol>
    <table style="margin-top:8px"><tbody>
      <tr><th style="width:42%">Data d'entrega del dossier</th><td></td></tr>
      <tr><th>Data de la prova de recuperació</th><td></td></tr>
      <tr><th>Dubtes que tinc</th><td style="height:46px"></td></tr>
    </tbody></table>
    ${dos&&dos.a?`<p class="xicotet" style="margin:6px 0 0">El dossier inclou material de: ${esc(dos.a)}.</p>`:""}
    <div class="firmes"><div>Signatura de l'alumne/a</div><div>Assabentat/da: signatura de la família</div></div>
  </div>`;
}
/* quins: "suspesos" (nota del tema < 5), "tots" o l'id d'un alumne/a. */
window.exportarFitxesRepas=(temaId,quins)=>{
  const g=grupoActual(); const s=g&&temaPerId(g,temaId); if(!s) return;
  let als;
  if(quins==="tots") als=g.alumnos.slice();
  else if(quins && quins!=="suspesos") als=g.alumnos.filter(a=>a.id===quins);
  else als=g.alumnos.filter(al=>{ const n=notaTemaAlumne(g,al.id,s.id); return n!=null&&n<5; });
  if(!als.length){ mostrarAviso("Ningú té este tema per recuperar (nota del tema per davall de 5). Pots imprimir-les per a tot el grup amb «Per a tot el grup»."); return; }
  abrirVentanaInforme(`Fitxes de repàs · ${temaNomCurt(s)} · ${g.nombre}`, _IA_CSS+als.map(al=>fitxaRepasBodyHTML(g,al,s)).join(""));
};
/* Botons per a la targeta de cada tema (pestanya Programació del grup). */
function fitxaRepasBotonsHTML(g,s){
  const acts=(g.actividades||[]).filter(a=>!a.recupera && a.temaId===s.id);
  const sus=acts.length? g.alumnos.filter(al=>{ const n=notaTemaAlumne(g,al.id,s.id); return n!=null&&n<5; }).length : 0;
  const dos=_iaDossier(g,s,false), dosA=_iaDossier(g,s,true);
  return `<div class="flex" style="gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0">
    <span class="section-eyebrow" style="margin:0">🔁 Repàs</span>
    ${acts.length?`<button class="ghost small" style="border:1px solid var(--line)" onclick="exportarFitxesRepas('${escJS(s.id)}','suspesos')" ${sus?"":"disabled"} title="Una pàgina per alumne/a amb nota del tema per davall de 5">📝 Fitxes per a qui ha de recuperar (${sus})</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="exportarFitxesRepas('${escJS(s.id)}','tots')">📝 Per a tot el grup</button>`:""}
    ${dos?`<a class="chip" style="text-decoration:none" href="${esc(dos.url)}" target="_blank" rel="noopener" title="${esc(dos.t)}">📕 Dossier de repàs (PDF)</a>`:""}
    ${dosA&&/adaptat/.test(dosA.f)?`<a class="chip" style="text-decoration:none" href="${esc(dosA.url)}" target="_blank" rel="noopener" title="${esc(dosA.t)}">📕 Versió adaptada</a>`:""}
  </div>`;
}
