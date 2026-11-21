/* ============================================================================
   Quadern d'avaluació · Tot lligat pel tema
   js/programacion/temes-grup.js

   Cada activitat del grup pot estar lligada a un tema (act.temaId = id d'una
   SdA de la programació vinculada al grup). Amb això:
     - la llista d'activitats mostra el tema i el seu material;
     - la pestanya «Programació» del grup ensenya, tema a tema, les sessions
       fetes (Diari) i previstes, el material, les activitats i les notes;
     - Inici → «Avui» pot dir quin tema toca.
   ============================================================================ */
/* Tots els temes de la programació del grup, també els marcats com «Altres» (s.altres:
   temes que no es faran este curs). temesDeGrup() només torna els que es fan. */
function temesTotsGrup(g){
  const p=g&&typeof progDeGrupo==="function"? progDeGrupo(g) : null;
  return p? (p.sdas||[]).slice().sort((a,b)=>(a.trimestre-b.trimestre)) : [];
}
function temesDeGrup(g){ return temesTotsGrup(g).filter(s=>!s.altres); }
function temesAltresGrup(g){ return temesTotsGrup(g).filter(s=>s.altres); }
/* Temes «Altres» i temes sense una avaluació vàlida (0, 1 o 2): van junts, plegats al final. */
function temesSenseAvalGrup(g){ return temesTotsGrup(g).filter(s=>s.altres || ![0,1,2].includes(s.trimestre)); }
function temaPerId(g,id){ return id? temesTotsGrup(g).find(s=>s.id===id)||null : null; }
function temaDe(g,a){ return a? temaPerId(g,a.temaId) : null; }
function temaNomCurt(s){ return s? (s.tema||s.titulo||"(sense títol)") : ""; }
function _temNorm(x){ return String(x||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim(); }
/* Lliga automàticament les activitats que encara no tenen tema: per l'activitat
   de la programació d'on venen, o pel text lliure «SdA» que tenien abans. */
function temesMigrarGrup(g){
  if(!g || !Array.isArray(g.actividades)) return false;
  const temes=temesDeGrup(g); if(!temes.length) return false;
  const tots=temesTotsGrup(g);
  const p=progDeGrupo(g); let canvi=false;
  g.actividades.forEach(a=>{
    if(a.temaId && tots.some(s=>s.id===a.temaId)) return;
    let s=null;
    if(a.progActId && p){ const pa=(p.actividades||[]).find(x=>x.id===a.progActId); const id=pa&&(pa.sdaIds||[])[0]; s=id&&temes.find(x=>x.id===id); }
    if(!s && a.recupera && a.recupera.ids){ const o=g.actividades.find(x=>x.id===a.recupera.ids[0]); s=o&&temaPerId(g,o.temaId); }
    if(!s && (a.sda||"").trim()){
      const t=_temNorm(a.sda); const n=/(?:tema|unitat|ud|u|sda)\s*(\d+)/.exec(t);
      s=temes.find(x=>_temNorm(x.tema)===t||_temNorm(x.titulo)===t||_temNorm(sdaNom(x))===t)
        || (n? temes.find(x=>{ const m=/tema\s*(\d+)/.exec(_temNorm(x.tema)); return m&&m[1]===n[1]; }) : null);
    }
    if(s){ a.temaId=s.id; canvi=true; }
  });
  return canvi;
}
function temaSelectHTML(g,valor,attrs){
  const temes=temesDeGrup(g); if(!temes.length) return "";
  return `<select class="in" ${attrs||""}>
    <option value="">— Sense tema —</option>
    ${[0,1,2].map(t=>{ const ts=temes.filter(s=>s.trimestre===t); return ts.length?`<optgroup label="${esc(TRIMESTRES[t])}">${ts.map(s=>`<option value="${esc(s.id)}" ${s.id===valor?"selected":""}>${esc(temaNomCurt(s))}</option>`).join("")}</optgroup>`:""; }).join("")}
  </select>`;
}
window.setTemaActivitat=(actId,temaId)=>{
  const g=grupoActual(); const a=g&&g.actividades.find(x=>x.id===actId); if(!a) return;
  a.temaId=temaId||""; save(); render();
};
/* Etiqueta del tema per a la llista d'activitats (amb enllaç a la pestanya Programació). */
function temaBadgeHTML(g,a){
  const s=temaDe(g,a); if(!s) return "";
  return `<span class="badge" style="vertical-align:middle;margin-left:6px;cursor:pointer" title="Obrir el tema en la pestanya Programació" onclick="grupObrirTema('${escJS(s.id)}')">📚 ${esc(temaNomCurt(s))}</span>`;
}
window.grupObrirTema=id=>{ state.ui.tab="programa"; state.ui.progTemaObert=id; save(); render(); };

/* ---- Tema actual ----
   El que hages marcat; si no, el primer del període amb sessions fetes però
   no acabat; si no, el primer del període que encara no s'ha començat. */
function temaActualGrup(g){
  const temes=temesDeGrup(g); if(!temes.length) return null;
  const marcat=g.temaActual&&temes.find(s=>s.id===g.temaActual); if(marcat) return marcat;
  const fets=s=>progSesionesReales(g,s.id), prev=s=>Number(s.sesionesPrevistas)||0;
  const trim=typeof state.ui.trim==="number"? state.ui.trim : 0;
  const delTrim=temes.filter(s=>s.trimestre===trim);
  return delTrim.find(s=>fets(s)>0 && (prev(s)===0 || fets(s)<prev(s)))
    || delTrim.find(s=>fets(s)===0)
    || temes.find(s=>fets(s)>0 && fets(s)<prev(s))
    || temes.find(s=>fets(s)===0) || temes[temes.length-1];
}
window.grupMarcarTemaActual=id=>{ const g=grupoActual(); if(!g) return; g.temaActual=(g.temaActual===id?"":id); save(); render(); };
window.grupNovaActivitatTema=id=>{
  state.ui.segTema=id; state.ui.tab="actividades"; save(); render();
  mostrarToast("Les activitats que crees ara aniran al tema «"+temaNomCurt(temaPerId(grupoActual(),id))+"»");
};

/* Mitjana d'un alumne en les activitats d'un tema (nota de cada activitat, sense pesos de bloc). */
function notaTemaAlumne(g,alId,temaId){
  const vs=g.actividades.filter(a=>!a.recupera && a.temaId===temaId).map(a=>notaActividad(g,alId,a)).filter(v=>v!=null);
  return vs.length? vs.reduce((s,v)=>s+v,0)/vs.length : null;
}

/* ---- Pestanya «Programació» del grup ---- */
function renderProgramaGrup(g){
  const tc=document.getElementById("tabContent");
  const p=progDeGrupo(g);
  if(!p){
    tc.innerHTML=`<div class="card"><h2>📚 Programació del grup</h2>
      <p class="sub">Este grup encara no té cap programació d'aula vinculada. Vincula-la en Ajustos (o crea-la des de Programacions) i ací veuràs cada tema amb les sessions, el material, les activitats i les notes.</p>
      <button class="btn" onclick="state.ui.tab='ajustes';save();render()">Anar a Ajustos</button></div>`;
    return;
  }
  if(temesMigrarGrup(g)) save();
  if(state.ui.tempEditant===p.id && typeof tempEditorHTML==="function"){ tc.innerHTML=tempEditorHTML(g,p); return; }
  const temes=temesDeGrup(g);
  const datesTemes=typeof tempDatesTemes==="function"? tempDatesTemes(g,p) : {};
  const actual=temaActualGrup(g);
  const obert=state.ui.progTemaObert || (actual&&actual.id);
  const totalPrev=temes.reduce((n,s)=>n+(Number(s.sesionesPrevistas)||0),0);
  const totalFet=temes.reduce((n,s)=>n+progSesionesReales(g,s.id),0);
  const senseTema=g.actividades.filter(a=>!a.recupera && !temaDe(g,a)).length;
  const cardTema=s=>{
    const fets=progSesionesReales(g,s.id), prev=Number(s.sesionesPrevistas)||0;
    const estat= prev&&fets>=prev? ["✓ Fet","#16a34a"] : fets>0? ["En curs","#b45309"] : ["Pendent","var(--mut)"];
    const acts=g.actividades.filter(a=>!a.recupera && a.temaId===s.id);
    const esActual=actual&&actual.id===s.id;
    const mats=typeof materialTemaHTML==="function"? materialTemaHTML(p,s) : "";
    const pct=prev? Math.min(100,Math.round(fets/prev*100)) : 0;
    const files=acts.map(a=>{
      const ns=g.alumnos.map(al=>notaActividad(g,al.id,a)).filter(v=>v!=null);
      return `<div class="row" style="justify-content:space-between;gap:6px;padding:4px 0;border-top:1px solid var(--line);font-size:13px">
        <span>${esc(a.nombre)} <span class="sub" style="margin:0">· ${TRIMESTRES[a.trimestre]||""}${a.esExamen?" · examen":""}</span></span>
        <span class="sub" style="margin:0">${ns.length} de ${g.alumnos.length} · mitjana ${ns.length?fmt(ns.reduce((x,y)=>x+y,0)/ns.length):"—"}</span>
      </div>`;}).join("");
    const notes=acts.length&&g.alumnos.length? `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12.5px;font-weight:600">Notes del tema per alumne/a</summary>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px"><tbody>${g.alumnos.map(al=>{ const v=notaTemaAlumne(g,al.id,s.id); return `<tr><td style="padding:3px 6px;border-top:1px solid var(--line)">${esc(al.nombre)}</td><td style="padding:3px 6px;border-top:1px solid var(--line);text-align:right;font-weight:600;${v!=null&&v<5?"color:var(--danger,#b91c1c)":""}">${fmt(v)}</td></tr>`; }).join("")}</tbody></table>
      <p class="sub" style="margin:4px 0 0;font-size:11.5px">Mitjana simple de les activitats del tema. La nota de l'avaluació continua calculant-se pels blocs.</p></details>` : "";
    return `<details class="card" style="padding:10px 14px;${esActual?"border:2px solid var(--accent,#b7893a)":""}" ${obert===s.id?"open":""}>
      <summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;list-style:revert">
        <span style="font-weight:700;font-size:14px">${esActual?"📍 ":""}${esc(temaNomCurt(s))}${s.tema&&s.titulo?`<span class="sub" style="font-weight:400;font-style:italic;margin:0"> · ${esc(s.titulo)}</span>`:""}</span>
        <span style="font-size:12.5px;display:flex;gap:10px;align-items:center"><span style="color:${estat[1]};font-weight:600">${estat[0]}</span><span class="sub" style="margin:0">${datesTemes[s.id]?"📅 "+tempDatesText(datesTemes[s.id])+" · ":""}${fets}/${prev||"?"} sessions · ${acts.length} activitat${acts.length===1?"":"s"}</span></span>
      </summary>
      ${prev?`<div style="height:6px;background:var(--line);border-radius:4px;margin:8px 0 4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${estat[1]}"></div></div>`:""}
      <div class="flex" style="gap:6px;flex-wrap:wrap;margin:6px 0">
        <button class="ghost small" style="border:1px solid var(--line)" onclick="grupMarcarTemaActual('${escJS(s.id)}')">${g.temaActual===s.id?"✕ Deixar de marcar com a actual":"📍 Marcar com a tema actual"}</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="grupNovaActivitatTema('${escJS(s.id)}')">+ Activitat d'este tema</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="state.ui.tab='diario';save();render()">📓 Apuntar una sessió en el Diari</button>
      </div>
      ${mats}
      ${typeof fitxaRepasBotonsHTML==="function"?fitxaRepasBotonsHTML(g,s):""}
      ${files?`<div style="margin-top:6px"><div class="section-eyebrow">Activitats i exàmens</div>${files}</div>`:`<p class="sub" style="margin:6px 0 0">Encara no hi ha activitats d'este tema.</p>`}
      ${notes}
    </details>`;
  };
  tc.innerHTML=`<div class="card">
      <h2>📚 Programació · ${esc(p.nombre)}</h2>
      <p class="sub" style="margin:0">Tema a tema: sessions fetes (les que apuntes en el Diari) i previstes, material, activitats i notes. ${actual?`Ara estàs en <strong>${esc(temaNomCurt(actual))}</strong>${g.temaActual?"":" (calculat pel Diari; el pots marcar a mà)"}.`:""}</p>
      <p class="sub" style="margin:6px 0 0">${totalFet} de ${totalPrev} sessions previstes fetes.${senseTema?` · ${senseTema} activitat${senseTema===1?"":"s"} sense tema: assigna'ls-el en la pestanya Activitats.`:""}</p>
      <div class="flex" style="gap:6px;margin-top:8px;flex-wrap:wrap">${typeof tempEditorHTML==="function"?`<button class="btn small" onclick="tempEditarObrir()">✏️ Editar temes i sessions</button>`:""}<button class="ghost small" style="border:1px solid var(--line)" onclick="progAbrirDetalle('${escJS(p.id)}');irModo('programacion')">📘 Obrir la programació completa</button></div>
    </div>
    ${[0,1,2].map(t=>{ const ts=temes.filter(s=>s.trimestre===t); return ts.length?`<div class="section-eyebrow" style="margin-top:14px">${esc(TRIMESTRES[t])}</div>${ts.map(cardTema).join("")}`:""; }).join("")}
    ${(()=>{ const al=temesSenseAvalGrup(g); return al.length?`<details style="margin-top:22px"><summary style="cursor:pointer" class="section-eyebrow">Temes sense avaluació · no es fan (${al.length})</summary><div style="opacity:.8">${al.map(cardTema).join("")}</div></details>`:""; })()}`;
}

/* Activitats del període que tenen notes posades però encara no de tot l'alumnat. */
function perCorregirGrup(g){
  const trim=typeof state.ui.trim==="number"? state.ui.trim : 0;
  return (g.actividades||[]).filter(a=>!a.recupera && a.trimestre===trim).map(a=>{
    const n=g.alumnos.filter(al=>notaActividad(g,al.id,a)!=null || (typeof marcaDe==="function"&&marcaDe(g,al.id,a.id))).length;
    return {a,n,falten:g.alumnos.length-n};
  }).filter(x=>x.n>0 && x.falten>0);
}
/* Línia «Avui» d'una classe: tema actual, sessió, material i el que queda per corregir. */
function avuiClasseHTML(g){
  const s=typeof temaActualGrup==="function"? temaActualGrup(g) : null;
  const p=progDeGrupo(g);
  const pc=perCorregirGrup(g);
  const parts=[];
  if(s){
    const fets=progSesionesReales(g,s.id), prev=Number(s.sesionesPrevistas)||0;
    const det=(s.sessionsDetall||[])[fets];
    parts.push(`<span>📚 <strong>${esc(temaNomCurt(s))}</strong> · sessió ${fets+1}${prev?" de "+prev:""}${det&&det.contingut?` <span class="sub" style="margin:0">(${esc(String(det.contingut).slice(0,90))}${String(det.contingut).length>90?"…":""})</span>`:""}</span>`);
    const mat=p&&typeof materialDe==="function"? materialDe(p.catalogoKey) : null;
    const n=mat&&typeof materialNumTema==="function"? (mat[materialNumTema(s)]||[]).length : 0;
    if(n) parts.push(`<button class="ghost small" style="border:1px solid var(--line)" onclick="state.ui.progTemaObert='${escJS(s.id)}';hoyIr('${escJS(g.id)}','programa')">📎 Material (${n})</button>`);
  } else if(!p) parts.push(`<span class="sub" style="margin:0">Sense programació vinculada</span>`);
  if(pc.length) parts.push(`<button class="ghost small" style="border:1px solid var(--line)" title="${esc(pc.map(x=>x.a.nombre+": falten "+x.falten).join(" · "))}" onclick="hoyIr('${escJS(g.id)}','calificar')">✍️ ${pc.length} per acabar de corregir</button>`);
  return parts.length? `<div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center;font-size:12.5px;margin-top:4px;width:100%">${parts.join("")}</div>` : "";
}
