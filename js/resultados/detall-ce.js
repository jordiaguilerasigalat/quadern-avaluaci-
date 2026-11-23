/* ============================================================================
   Cuaderno del profesor · Resultats → «Per competències»: d'on ix la nota
   js/resultados/detall-ce.js
   ----------------------------------------------------------------------------
   En tocar la nota d'una CE d'un alumne/a s'obri una finestra amb les
   activitats, exàmens, etc. que han treballat eixa CE fins a l'avaluació
   triada (o tot el curs, en la final): la nota de cada una, el pes que té en
   la nota de la CE i, dins de cada criteri, les preguntes de l'examen que hi
   estan lligades. En tocar la «Global», el pes i la nota de cada CE.
   Els números ixen de detallCETrims (calculo-notas.js), que fa el mateix
   càlcul que la taula, així que sempre quadren.
   ============================================================================ */
function _dcePct(p){ if(p==null||!isFinite(p)) return "—"; const r=Math.round(p*1000)/10; return (r%1===0? String(r) : r.toFixed(1).replace(".",","))+" %"; }
function _dcePeriode(trims){
  const t=Math.max(...trims);
  if(state.ui.resInfFinal===true) return "Tot el curs (avaluació final)";
  return t===0? TRIMESTRES[0] : `Fins a la ${TRIMESTRES[t]} (${trims.map(x=>TRIMESTRES[x].split(" ")[0]).join(" + ")})`;
}
function _dceNota(grupo,v){
  if(v==null) return '<span style="color:var(--mut)">—</span>';
  return state.ui.resCEqual!==false? pillNivellQual(grupo,v,"",true) : `<strong>${fmt(v)}</strong>`;
}
function _dceBarra(p){
  const w=Math.max(0,Math.min(100,Math.round((p||0)*100)));
  return `<span aria-hidden="true" style="display:inline-block;vertical-align:middle;width:54px;height:7px;border-radius:4px;background:var(--line);margin-right:6px;overflow:hidden"><span style="display:block;height:100%;width:${w}%;background:var(--accent)"></span></span>`;
}
function _dceDataAct(a){ const f=(typeof agDataActivitat==="function"&&agDataActivitat(a.id))||a.fecha||""; return f? (typeof fmt2==="function"? fmt2(f) : f) : ""; }
function _dceTipus(a){ return a.esExamen? "Examen" : (a.tipo||"Activitat"); }
/* Preguntes de la rúbrica de l'examen lligades al criteri (amb la nota de l'alumne/a). */
function _dcePreguntes(grupo,alId,a,cid){
  if(typeof cxRubricaDe!=="function") return [];
  const rub=cxRubricaDe(a,alId); if(!Array.isArray(rub)||!rub.length) return [];
  const sc=(grupo.rubricScores&&grupo.rubricScores[alId]&&grupo.rubricScores[alId][a.id])||{};
  const compten=cxEvalRubrica(rub,sc).ids;
  const out=[];
  const walk=(nodes,cami)=>(nodes||[]).forEach((n,i)=>{
    const tit=(n.title||"").trim()||`Apartat ${i+1}`, c=cami.concat(tit);
    (n.items||[]).forEach((it,j)=>{
      const l=(it.links||[]).find(x=>x.critId===cid); if(!l) return;
      const v=sc[it.id];
      const curt=t=>{ t=String(t||"").replace(/\s+/g," ").trim(); return t.length>60? t.slice(0,57).trim()+"…" : t; };
      out.push({nom:c.map(curt).join(" › ")+" › "+(curt(it.label)||`Pregunta ${j+1}`),val:(v==null||v==="")?null:Number(v),max:Number(it.max)||0,peso:Number(l.peso)||0,compta:compten.has(it.id)});
    });
    walk(n.subs,c);
  });
  walk(rub,[]);
  return out;
}
function _dceMotiu(f){
  if(f.marca==="EX") return "Exempt";
  if(f.nota==null) return "Sense nota";
  if(!(f.peso>0)) return "Pes 0";
  return "";
}
function _dceTancar(){ const el=document.getElementById("dceModalWrap"); if(el) el.remove(); document.removeEventListener("keydown",_dceEsc); }
function _dceEsc(e){ if(e.key==="Escape") _dceTancar(); }
function _dceObrir(html,etq){
  _dceTancar();
  const wrap=document.createElement("div"); wrap.id="dceModalWrap";
  wrap.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this) resTancarDetallCE()">
    <div class="modal-box dce-box" role="dialog" aria-modal="true" aria-label="${esc(etq)}" style="max-width:820px">${html}</div></div>`;
  document.body.appendChild(wrap);
  document.addEventListener("keydown",_dceEsc);
  const b=wrap.querySelector(".modal-close"); if(b) b.focus();
}
window.resTancarDetallCE=_dceTancar;

window.resDetallCE=(alId,ceId,fins)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const trims=trimsFinsA(Number(fins));
  const d=detallCETrims(grupo,alId,ceId,trims); if(!d) return;
  const idx=catIndex(grupo.catalogoKey);
  /* El quadern NESE d'un altre alumne/a ix com a «Exempt» per a la resta: no és d'este alumne/a. */
  d.crits.forEach(x=>{ x.acts=x.acts.filter(f=>!(f.act.quadernNese && f.marca==="EX")); });
  const v=d.score==null? null : d.score/10;
  /* Resum per activitat (una activitat pot treballar diversos criteris de la CE). */
  const perAct=new Map();
  d.crits.forEach(x=>x.acts.forEach(f=>{
    const r=perAct.get(f.act.id)||{act:f.act,crits:[],pes:0,sv:0,motius:new Set()};
    r.crits.push(x.crit.id);
    if(f.pesCE>0){ r.pes+=f.pesCE; r.sv+=f.nota*f.pesCE; } else r.motius.add(_dceMotiu(f));
    perAct.set(f.act.id,r);
  }));
  const acts=[...perAct.values()].sort((a,b)=>(b.pes-a.pes)||((a.act.trimestre||0)-(b.act.trimestre||0)));
  const filaAct=r=>{
    const compta=r.pes>0, nota=compta? r.sv/r.pes : null, data=_dceDataAct(r.act);
    return `<tr style="${compta?"":"opacity:.6"}">
      <td><strong>${r.act.recupera?"🔁 ":""}${esc(r.act.nombre||"(sense nom)")}</strong><div class="sub" style="margin:0;font-size:11.5px">${esc(_dceTipus(r.act))} · ${esc(TRIMESTRES[r.act.trimestre]||"")}${data?" · "+esc(data):""}</div></td>
      <td style="white-space:nowrap">${r.crits.map(c=>`<span class="chip" style="font-size:11px;padding:1px 7px">${esc(c)}</span>`).join(" ")}</td>
      <td style="white-space:nowrap">${compta? `<strong>${fmt(nota)}</strong>` : `<span class="sub" style="margin:0">${esc([...r.motius].filter(Boolean).join(", ")||"No compta")}</span>`}</td>
      <td style="white-space:nowrap">${compta? _dceBarra(r.pes)+_dcePct(r.pes) : "—"}</td></tr>`;
  };
  const filaCrit=x=>{
    const txt=(idx.critMap[x.crit.id]&&idx.critMap[x.crit.id].texto)||"";
    const files=x.acts.map(f=>{
      const motiu=_dceMotiu(f), pregs=_dcePreguntes(grupo,alId,f.act,x.crit.id);
      const recs=f.recs.length? `<div class="sub" style="margin:2px 0 0;font-size:11.5px">🔁 Recuperació: ${f.recs.map(r=>`${esc(r.act.nombre||"")} (${fmt(r.nota)})`).join(", ")} · nota original ${fmt(f.base)}</div>` : "";
      const extra=f.extra? `<div class="sub" style="margin:2px 0 0;font-size:11.5px">➕ Punts extra: +${fmt(f.extra)}</div>` : "";
      const pq=pregs.length? `<ul class="dce-preg" style="margin:4px 0 0;padding-left:18px;font-size:12px;color:var(--mut)">${pregs.map(p=>`<li style="${p.compta?"":"opacity:.6"}">${esc(p.nom)}: <strong style="color:var(--ink)">${p.val==null?"—":String(Math.round(p.val*100)/100).replace(".",",")}</strong> / ${String(p.max).replace(".",",")}${p.peso!==100?` · pes ${p.peso} %`:""}${p.compta?"":" · no compta (no triada)"}</li>`).join("")}</ul>` : "";
      return `<tr style="${motiu?"opacity:.6":""}">
        <td>${f.act.recupera?"🔁 ":""}${esc(f.act.nombre||"(sense nom)")} <span class="sub" style="margin:0;font-size:11.5px">· ${esc(TRIMESTRES[f.act.trimestre]||"")}</span>${recs}${extra}${pq}</td>
        <td style="white-space:nowrap">${motiu? `<span class="sub" style="margin:0">${esc(motiu)}</span>` : `<strong>${fmt(f.nota)}</strong>`}</td>
        <td style="white-space:nowrap">${motiu? "—" : _dcePct(f.pesCrit)}</td>
        <td style="white-space:nowrap">${motiu? "—" : _dcePct(f.pesCE)}</td></tr>`;
    }).join("");
    return `<div class="dce-crit" style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:10px">
      <div class="flex" style="justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline">
        <div><span class="critlink" onclick="verCriterio('${escJS(grupo.catalogoKey)}','${escJS(x.crit.id)}')">Criteri ${esc(x.crit.id)}</span>
          <span class="sub" style="margin:0;font-size:12px"> · pes en la CE: ${fmt(x.pesCrit).replace(",0","")} ${x.score==null?"(no compta: sense notes)":`→ ${_dcePct(x.part)} de la nota`}</span></div>
        <div>${x.score==null? '<span class="sub" style="margin:0">—</span>' : _dceNota(grupo,x.score/10)}</div>
      </div>
      <div class="sub" style="margin:4px 0 0;font-size:12px">${esc(txt.length>180? txt.slice(0,177)+"…" : txt)}</div>
      ${x.acts.length? `<div style="overflow-x:auto"><table style="margin-top:6px;font-size:13px"><thead><tr><th>Activitat</th><th>Nota</th><th title="Pes d'esta activitat dins del criteri">Pes en el criteri</th><th title="Part de la nota de la CE que ve d'esta activitat en este criteri">Pes en la CE</th></tr></thead><tbody>${files}</tbody></table></div>`
        : '<p class="sub" style="margin:6px 0 0;font-size:12.5px">No s\'ha treballat en cap activitat d\'este període.</p>'}
    </div>`;
  };
  const html=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">
      <div><div style="font-size:16px;font-weight:700">${esc(d.ce.id)} · ${esc(al.nombre)}</div>
        <div class="sub" style="margin:2px 0 0;font-size:12.5px">${esc(_dcePeriode(trims))}</div></div>
      <button class="modal-close" onclick="resTancarDetallCE()" aria-label="Tancar">×</button>
    </div>
    <div style="font-size:13px;line-height:1.5;margin-bottom:8px">${esc(d.ce.titulo||"")}</div>
    <div style="font-size:14px;margin-bottom:10px">Nota de la CE: ${_dceNota(grupo,v)}</div>
    ${acts.length? `<h3 style="font-size:14px;margin:10px 0 4px">On s'ha treballat</h3>
    <div style="overflow-x:auto"><table style="font-size:13px"><thead><tr><th>Activitat / examen</th><th>Criteris</th><th title="Nota d'esta activitat en els criteris d'esta CE">Nota</th><th title="Part de la nota de la CE que ve d'esta activitat">Pes en la CE</th></tr></thead>
      <tbody>${acts.map(filaAct).join("")}</tbody></table></div>`
    : `<p class="sub">Esta CE encara no s'ha treballat en cap activitat d'este període.</p>`}
    <h3 style="font-size:14px;margin:16px 0 0">Criteri a criteri</h3>
    <p class="sub" style="margin:2px 0 0;font-size:12px">La nota de cada criteri és la mitjana ponderada de les activitats que l'han treballat (en els exàmens, de les preguntes lligades al criteri). La de la CE, la mitjana ponderada dels criteris amb nota, amb els pesos d'Ajustos.</p>
    ${d.crits.map(filaCrit).join("")}`;
  _dceObrir(html,`${d.ce.id} · ${al.nombre}`);
};

/* «Global»: pes i nota de cada CE. */
window.resDetallGlobalCE=(alId,fins)=>{
  const grupo=grupoActual(); if(!grupo) return;
  const al=grupo.alumnos.find(a=>a.id===alId); if(!al) return;
  const trims=trimsFinsA(Number(fins));
  const files=catIndex(grupo.catalogoKey).cat.ces.map(ce=>({ce,w:pesoCEGrupo(grupo,ce.id),sc:scoreCETrims(grupo,alId,ce.id,trims)}));
  const sw=files.reduce((s,f)=>s+(f.w>0&&f.sc!=null?f.w:0),0);
  const html=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">
      <div><div style="font-size:16px;font-weight:700">Global per competències · ${esc(al.nombre)}</div>
        <div class="sub" style="margin:2px 0 0;font-size:12.5px">${esc(_dcePeriode(trims))}</div></div>
      <button class="modal-close" onclick="resTancarDetallCE()" aria-label="Tancar">×</button>
    </div>
    <div style="font-size:14px;margin:4px 0 10px">Nota global: ${_dceNota(grupo,notaPorCE(grupo,alId,trims))}</div>
    <div style="overflow-x:auto"><table style="font-size:13px"><thead><tr><th>Competència</th><th>Nota</th><th title="Pes de la CE en Ajustos">Pes (Ajustos)</th><th title="Part de la nota global que ve d'esta CE">Pes real</th></tr></thead><tbody>
    ${files.map(f=>{ const compta=f.w>0&&f.sc!=null;
      return `<tr style="${compta?"":"opacity:.6"}${f.sc!=null?";cursor:pointer":""}" ${f.sc!=null?`onclick="resDetallCE('${escJS(alId)}','${escJS(f.ce.id)}',${Number(fins)})" title="Vore d'on ix la nota de ${esc(f.ce.id)}"`:""}><td><strong>${esc(f.ce.id)}</strong> <span class="sub" style="margin:0;font-size:11.5px">${esc((f.ce.titulo||"").slice(0,90))}${(f.ce.titulo||"").length>90?"…":""}</span></td>
        <td style="white-space:nowrap">${f.sc==null?'<span class="sub" style="margin:0">Sense treballar</span>':_dceNota(grupo,f.sc/10)}</td>
        <td style="white-space:nowrap">${fmt(f.w).replace(",0","")}</td>
        <td style="white-space:nowrap">${compta? _dceBarra(f.w/sw)+_dcePct(f.w/sw) : "—"}</td></tr>`; }).join("")}
    </tbody></table></div>
    <p class="sub" style="margin:8px 0 0;font-size:12px">Les CE sense cap nota no compten: el seu pes es reparteix entre les altres. Toca una CE per a vore les activitats.</p>`;
  _dceObrir(html,`Global per competències · ${al.nombre}`);
};
