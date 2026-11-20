/* ============================================================================
   Quadern d'avaluació · Fitxa única de l'alumne/a
   js/alumnado/fitxa-alumne.js

   La fitxa (modal) que ja hi havia en Alumnat ara s'obri des de qualsevol
   pestanya del grup tocant el nom, i comença amb un resum de tot: notes per
   avaluació i per tema, faltes, convivència, contactes amb la família i
   plans (NESE, repetició, reforç). Les dades no es mouen: només es mostren.
   ============================================================================ */
function nomFitxaHTML(al,extra){
  return `<button type="button" class="nom-fitxa" title="${al.nese?"Obrir el seguiment NESE de":"Obrir la fitxa i el seguiment de"} ${esc(al.nombre)}" onclick="obrirSeguimentAlumne('${escJS(al.id)}')">${typeof avatarAlumneHTML==="function"?avatarAlumneHTML(al):""}${esc(al.nombre)}</button>${extra||""}`;
}
function fitxaResumHTML(g,a){
  const bloc=(tit,cos)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:8px 10px"><div style="font-size:12px;font-weight:700;color:var(--mut);margin-bottom:4px">${tit}</div>${cos}</div>`;
  /* Notes */
  const nt=[0,1,2].map(t=>{ let v=null; try{ v=notaTrimestre(g,a.id,t); }catch(e){} return v; });
  let nf=null; try{ nf=notaFinal(g,a.id); }catch(e){}
  const col=v=>v!=null&&v<5?"color:var(--danger,#b91c1c)":"";
  const notes=`<div class="flex" style="gap:12px;flex-wrap:wrap;font-size:13px">${[0,1,2].map(t=>`<span>${esc(TRIMESTRES[t])}: <strong style="${col(nt[t])}">${fmt(nt[t])}</strong></span>`).join("")}<span>Final: <strong style="${col(nf)}">${fmt(nf)}</strong></span></div>`;
  const qual=(typeof teQualitativaCE==="function" && teQualitativaCE(g))? `<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center;font-size:12.5px;margin-top:6px"><span style="color:var(--mut)">Qualitativa (competències):</span>${[0,1,2].map(t=>`<span>${esc(TRIMESTRES[t])} ${pillQual(g,a.id,t)}</span>`).join("")}<span>Final ${pillQual(g,a.id,"final")}</span></div>` : "";
  /* Notes per tema */
  let temes="";
  if(typeof temesDeGrup==="function"){
    const ts=temesDeGrup(g).map(s=>[s,notaTemaAlumne(g,a.id,s.id)]).filter(x=>x[1]!=null);
    if(ts.length) temes=`<div style="margin-top:6px;display:grid;gap:2px;font-size:12.5px">${ts.map(([s,v])=>`<div class="flex" style="justify-content:space-between;gap:8px"><span>${esc(temaNomCurt(s))}</span><strong style="${col(v)}">${fmt(v)}</strong></div>`).join("")}</div>`;
  }
  /* Faltes */
  const c=typeof asistContarPeriodo==="function"? asistContarPeriodo(g,a.id,"0000-00-00","9999-12-31") : null;
  const faltes=c? `<div style="font-size:13px">${c.falta_no_justificada} sense justificar · ${c.falta_justificada} justificades · ${c.retraso} retards</div>` : "";
  /* Convivència i família */
  const conv=(g.convivencia||[]).filter(x=>x.alumnoId===a.id).sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
  const fam=(g.contactosFamilia||[]).filter(x=>x.alumnoId===a.id).sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
  const convHTML=`<div style="font-size:13px">${conv.length} registre${conv.length===1?"":"s"}${conv[0]?` · últim: ${esc(conv[0].fecha||"")}`:""}</div>`;
  const famHTML=`<div style="font-size:13px">${fam.length} contacte${fam.length===1?"":"s"}${fam[0]?` · últim: ${esc(fam[0].fecha||"")}${fam[0].asunto?" — "+esc(fam[0].asunto):""}`:""}</div>`;
  /* Plans */
  const ne=typeof nePlanDe==="function"? nePlanDe(a.id) : null;
  const rp=(state.planesRepeticion||[]).find(p=>p.alumnoId===a.id);
  const rf=(state.planesRefuerzo||[]).filter(p=>p.alumnoId===a.id);
  const plans=[
    a.nese? `<button class="ghost small" style="border:1px solid var(--line)" onclick="cerrarFichaAlumno();${ne?`neAbrirDesdeOtroModo('${escJS(ne.id)}')`:"irModo('nese')"}">🧩 NESE${ne?"":" (sense pla)"}</button>` : "",
    rp? `<button class="ghost small" style="border:1px solid var(--line)" onclick="cerrarFichaAlumno();rpAbrirDesdeOtroModo('${escJS(rp.id)}')">🔁 Pla de repetició</button>` : "",
    ...rf.map(p=>`<button class="ghost small" style="border:1px solid var(--line)" onclick="cerrarFichaAlumno();rfAbrirDesdeOtroModo('${escJS(p.id)}')">📈 Pla de reforç${p.titulo?" · "+esc(p.titulo):""}</button>`)
  ].filter(Boolean).join("");
  const anar=(tab,txt)=>`<button class="ghost small" style="border:1px solid var(--line)" onclick="cerrarFichaAlumno();state.ui.tab='${tab}';save();render()">${txt}</button>`;
  return `<div style="display:grid;gap:8px;margin-top:10px">
    ${bloc("📊 Notes",notes+qual+temes)}
    ${typeof anotacionsBlocHTML==="function"?anotacionsBlocHTML(g,a):""}
    <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      ${bloc("✅ Assistència",faltes)}${bloc("⚖️ Convivència",convHTML)}${bloc("👪 Família",famHTML)}
    </div>
    ${plans?bloc("🌈 Atenció a la diversitat",`<div class="flex" style="gap:6px;flex-wrap:wrap">${plans}</div>`):""}
    <div class="flex" style="gap:6px;flex-wrap:wrap">${anar("resultados","📄 Informe complet")}<button class="ghost small" style="border:1px solid var(--line)" title="Una pàgina per a la família amb les notes, faltes i observacions (${esc(TRIMESTRES[state.ui.trim]||"")})" onclick="cerrarFichaAlumno();exportarInformeFamilia('${escJS(a.id)}')">👪 Informe per a la família</button>${anar("asistencia","✅ Assistència")}${anar("convivencia","⚖️ Convivència")}${anar("familias","👪 Famílies")}</div>
    <details><summary style="cursor:pointer;font-weight:600;font-size:13px">✏️ Dades de l'alumne/a</summary>`;
}
/* Seguiment de l'alumne/a: tocar el nom (o el botó «Seguiment» de la llista)
   mostra la fitxa amb el resum (notes, faltes, plans). Si és NESE, va
   directament a la pantalla NESE del seu pla, amb un botó per a tornar al
   grup al mateix lloc on estaves. */
let _segTornarPos=null;
window.obrirSeguimentAlumne=id=>{
  const g=grupoActual(); const a=g&&g.alumnos.find(x=>x.id===id);
  if(!a) return;
  if(!a.nese){ state.ui.fichaAlumnoId=id; state.ui.fichaSeguiment=true; save(); render(); return; }
  const ne=typeof nePlanDe==="function"? nePlanDe(a.id) : null;
  _segTornarPos=typeof capturarPosicio==="function"? capturarPosicio() : null;
  state.ui.neTornar={appMode:state.ui.appMode, grupoId:g.id, tab:state.ui.tab, neId:ne?ne.id:"", grupNom:g.nombre};
  state.ui.fichaAlumnoId="";
  if(ne){ neAbrirDesdeOtroModo(ne.id); return; }
  state.ui.appMode="nese"; state.ui.neTab="lista"; state.ui.neId="";
  neAbrirModalCrear(g.id,a.id);
};
function neTornarHTML(){
  const t=state.ui.neTornar;
  if(!t || !state.grupos.some(g=>g.id===t.grupoId)) return "";
  const onDetall=state.ui.neTab==="detalle" && state.ui.neId===t.neId;
  const onLlista=!t.neId && state.ui.neTab!=="detalle";
  if(!onDetall && !onLlista) return "";
  return `<div style="margin:0 0 10px"><button class="btn small" onclick="neTornarAlGrup()">← Tornar a ${esc(t.grupNom||"el grup")}</button></div>`;
}
window.neTornarAlGrup=()=>{
  const t=state.ui.neTornar; if(!t) return;
  state.ui.neTornar=null; state.ui.neModalCrear=null;
  state.ui.appMode=t.appMode; state.ui.grupoId=t.grupoId; state.ui.tab=t.tab;
  save(); render();
  const pos=_segTornarPos; _segTornarPos=null;
  if(pos && typeof restaurarPosicio==="function") restaurarPosicio(pos);
};
