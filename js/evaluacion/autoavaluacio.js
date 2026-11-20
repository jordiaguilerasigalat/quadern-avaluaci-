/* ============================================================================
   Quadern d'avaluació · Autoavaluació i coavaluació amb rúbrica
   js/evaluacion/autoavaluacio.js

   Per a les activitats amb rúbrica per nivells (Deures, Laboratori, Actitud,
   Dossier, Treballs… de la pestanya Activitats). L'alumnat valora el seu
   treball (autoavaluació) o el d'un company/a (coavaluació) amb la mateixa
   rúbrica, sense veure cap nota. Dues maneres de recollir-ho, sense servidor:
   - «Passar el dispositiu»: pantalla completa en este dispositiu; cada alumne/a
     toca el seu nom, tria el nivell de cada fila i l'envia.
   - «Enllaç per als mòbils»: tools/autoavaluacio.html amb la rúbrica dins de
     l'enllaç (cap nom). L'alumne/a posa el seu número de llista i obté un codi
     curt que el professor/a enganxa ací.
   Es guarda en l'activitat:
     act.autoaval={[alId]:{n:{itemId:nivelId},d}}, act.coaval={[avaluadorId]:{obj,n,d}},
     act.coavalParelles={[avaluadorId]:objectiuId}
   No canvia cap nota: el professor/a ho veu al costat de la seua correcció i,
   si vol, ho copia com a punt de partida.
   ============================================================================ */
function aaPotFer(act){ return !!(act && act.rubrica && cxEsNiveles(act.rubrica) && cxItemsFlat(act.rubrica).length); }
function aaItems(act){ return cxItemsFlat(act.rubrica); }
function aaNivells(act){ return cxnNiveles(act.rubrica); }
/* Nota sobre 10 d'una selecció de nivells (només si totes les files tenen nivell). */
function aaNota(act,sel){
  if(!sel) return null;
  const its=aaItems(act), niv=aaNivells(act); let pts=0, max=0;
  for(const it of its){
    const l=niv.find(x=>x.id===sel[it.id]); if(!l) return null;
    pts+=cxnPuntosNivel(it,l,niv); max+=Number(it.max)||0;
  }
  return max>0? Math.round(pts/max*100)/10 : null;
}
function aaNomNivell(act,id){ const l=aaNivells(act).find(x=>x.id===id); return l? (l.nombre||"") : ""; }
function aaCoavDe(act,alId){ return Object.entries(act.coaval||{}).filter(([ev,x])=>x&&x.obj===alId).map(([ev,x])=>Object.assign({ev},x)); }
function aaMitjanaCo(act,alId){
  const ns=aaCoavDe(act,alId).map(x=>aaNota(act,x.n)).filter(v=>v!=null);
  return ns.length? Math.round(ns.reduce((a,b)=>a+b,0)/ns.length*10)/10 : null;
}
/* Parelles de coavaluació: cadascú avalua un altre (cicle aleatori, ningú a si mateix). */
function aaFerParelles(grupo,act){
  const ids=grupo.alumnos.map(a=>a.id).sort(()=>Math.random()-.5);
  const p={}; if(ids.length<2) return p;
  ids.forEach((id,i)=>{ p[id]=ids[(i+1)%ids.length]; });
  return p;
}
function aaParelles(grupo,act){
  const ok=act.coavalParelles && grupo.alumnos.every(a=>act.coavalParelles[a.id] && act.coavalParelles[a.id]!==a.id && grupo.alumnos.some(b=>b.id===act.coavalParelles[a.id]));
  if(!ok){ act.coavalParelles=aaFerParelles(grupo,act); save(); }
  return act.coavalParelles;
}
/* Empremta curta de la rúbrica (per a no barrejar codis d'una altra activitat). */
function aaEmpremta(act){
  const s=act.id+"|"+aaItems(act).map(i=>i.id).join(",")+"|"+aaNivells(act).map(l=>l.id).join(",");
  let h=5381; for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0;
  return h.toString(36).toUpperCase().slice(-4).padStart(4,"0");
}

/* ---------- Targeta en la vista d'avaluació de l'activitat ---------- */
function aaTargetaHTML(grupo,act,al){
  if(!aaPotFer(act)) return "";
  const obert=!!state.ui.aaObert;
  const nAuto=Object.keys(act.autoaval||{}).filter(id=>grupo.alumnos.some(a=>a.id===id)).length;
  const nCo=Object.keys(act.coaval||{}).filter(id=>grupo.alumnos.some(a=>a.id===id)).length;
  const resum=`${nAuto} autoavaluaci${nAuto===1?"ó":"ons"} · ${nCo} coavaluaci${nCo===1?"ó":"ons"}`;
  if(!obert) return `<div class="card aaCard"><div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
    <strong>🪞 Autoavaluació i coavaluació</strong><span class="sub" style="margin:0">${resum}</span>
    <button class="ghost small" style="border:1px solid var(--line)" aria-expanded="false" onclick="aaObrir(true)">Obrir</button></div></div>`;
  const items=aaItems(act);
  /* Per a l'alumne/a que s'està corregint: què ha dit ell/a i què n'han dit. */
  const auto=(act.autoaval||{})[al.id], cos=aaCoavDe(act,al.id);
  const fila=it=>`<tr><th scope="row" style="text-align:left;font-weight:600">${esc(it.label||"")}</th>
    <td>${auto?esc(aaNomNivell(act,auto.n[it.id])||"—"):"—"}</td>
    <td>${cos.length?esc(cos.map(x=>aaNomNivell(act,x.n[it.id])||"—").join(" · ")):"—"}</td></tr>`;
  const actual=`<h3 style="font-size:13px;margin:10px 0 4px">${esc(al.nombre)}</h3>
    <div style="overflow-x:auto"><table class="aaTaula"><thead><tr><th>Fila de la rúbrica</th><th>🪞 Ell/a mateix</th><th>👥 Company/a</th></tr></thead>
    <tbody>${items.map(fila).join("")}</tbody>
    <tfoot><tr><th scope="row" style="text-align:left">Nota</th><td><strong>${fmt(aaNota(act,auto&&auto.n))}</strong></td><td><strong>${fmt(aaMitjanaCo(act,al.id))}</strong></td></tr></tfoot></table></div>
    <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:6px">
      ${auto?`<button class="ghost small" style="border:1px solid var(--line)" onclick="aaCopiar('${escJS(al.id)}','auto')" title="Posa els nivells que ha triat en la teua correcció (després els pots canviar)">⤵️ Copiar l'autoavaluació a la meua correcció</button>`:""}
      ${cos.length===1?`<button class="ghost small" style="border:1px solid var(--line)" onclick="aaCopiar('${escJS(al.id)}','co')">⤵️ Copiar la coavaluació</button>`:""}
      ${auto?`<button class="ghost small" style="border:1px solid var(--line)" onclick="aaEsborrar('${escJS(al.id)}','auto')">🗑️ Esborrar l'autoavaluació</button>`:""}
    </div>`;
  /* Tota la classe */
  const totes=grupo.alumnos.map(a=>{
    const prof=grupo.notasCuant?.[a.id]?.[act.id];
    const na=aaNota(act,((act.autoaval||{})[a.id]||{}).n), nc=aaMitjanaCo(act,a.id);
    const dif=(na!=null&&prof!=null&&Math.abs(na-prof)>=2)?` <span title="Diferència de 2 punts o més amb la teua nota" aria-label="diferència gran">⚠️</span>`:"";
    return `<tr${a.id===al.id?' style="background:var(--surface-2)"':""}><th scope="row" style="text-align:left;font-weight:500"><span class="priv">${esc(a.nombre)}</span></th><td class="priv">${fmt(na)}${dif}</td><td class="priv">${fmt(nc)}</td><td class="priv">${prof!=null?fmt(prof):"—"}</td></tr>`;
  }).join("");
  return `<div class="card aaCard">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <strong>🪞 Autoavaluació i coavaluació</strong><span class="sub" style="margin:0">${resum}</span>
      <button class="ghost small" style="border:1px solid var(--line)" aria-expanded="true" onclick="aaObrir(false)">Plegar</button>
    </div>
    <p class="sub" style="margin:6px 0">L'alumnat valora amb esta mateixa rúbrica, sense veure cap nota. No canvia la teua correcció: ho veus ací al costat i, si vols, ho copies.</p>
    <div class="flex" style="gap:6px;flex-wrap:wrap">
      <button class="btn small" onclick="aaKiosc('${escJS(act.id)}','auto')">📱 Passar el dispositiu: autoavaluació</button>
      <button class="btn small" onclick="aaKiosc('${escJS(act.id)}','co')">📱 Passar el dispositiu: coavaluació</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="aaEnllac('${escJS(act.id)}')">🔗 Enllaç per als mòbils</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="aaEnganxarCodis('${escJS(act.id)}')">📥 Enganxar codis</button>
    </div>
    ${actual}
    <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600;font-size:13px">Tota la classe</summary>
      <div style="overflow-x:auto"><table class="aaTaula"><thead><tr><th>Alumne/a</th><th>🪞 Auto</th><th>👥 Co (mitjana)</th><th>Professor/a</th></tr></thead><tbody>${totes}</tbody></table></div>
      <p class="sub" style="margin:4px 0 0">⚠️ = l'autoavaluació s'allunya 2 punts o més de la teua nota.</p>
      <button class="ghost small" style="border:1px solid var(--line);margin-top:6px" onclick="aaNovesParelles('${escJS(act.id)}')">🔀 Fer parelles noves de coavaluació</button>
    </details>
  </div>`;
}
window.aaObrir=v=>{ state.ui.aaObert=!!v; save(); render(); };
function _aaAct(actId){ const g=grupoActual(); const act=g&&g.actividades.find(a=>a.id===actId); return act&&aaPotFer(act)? {g,act} : null; }
window.aaCopiar=(alId,qui)=>{
  const x=_aaAct(state.ui.segAct); if(!x) return; const {act}=x;
  const sel= qui==="auto"? ((act.autoaval||{})[alId]||{}).n : (aaCoavDe(act,alId)[0]||{}).n;
  if(!sel) return;
  const rub=cxRubricaDe(act,alId), niv=cxnNiveles(rub);
  let n=0; cxItemsFlat(rub).forEach(it=>{ const l=niv.find(v=>v.id===sel[it.id]); if(l){ cxSetItemScore(alId,act.id,it.id,String(cxnPuntosNivel(it,l,niv))); n++; } });
  render(); mostrarToast(n? `✓ ${n} fil${n===1?"a copiada":"es copiades"}: revisa-les` : "Esta rúbrica no coincideix amb la de l'alumne/a");
};
window.aaEsborrar=async(alId,qui)=>{
  const x=_aaAct(state.ui.segAct); if(!x) return;
  if(!(await confirmar("Esborrar l'autoavaluació d'este alumne/a?",{ok:"Esborrar",peligro:true}))) return;
  if(x.act.autoaval) delete x.act.autoaval[alId]; save(); render();
};
window.aaNovesParelles=async actId=>{
  const x=_aaAct(actId); if(!x) return;
  if(!(await confirmar("Es faran parelles noves a l'atzar. Les coavaluacions ja fetes es mantenen.",{ok:"Fer-les",peligro:false}))) return;
  x.act.coavalParelles=aaFerParelles(x.g,x.act); save(); render(); mostrarToast("🔀 Parelles noves");
};

/* ---------- Passar el dispositiu (pantalla completa) ---------- */
let _aaK=null;
window.aaKiosc=(actId,mode)=>{
  const x=_aaAct(actId); if(!x) return;
  if(mode==="co" && x.g.alumnos.length<2){ mostrarAviso("Cal un mínim de dos alumnes per a la coavaluació."); return; }
  if(mode==="co") aaParelles(x.g,x.act);
  _aaK={grupoId:x.g.id,actId,mode,alId:"",sel:{},fet:false};
  let el=document.getElementById("aaKiosc");
  if(!el){ el=document.createElement("div"); el.id="aaKiosc"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Autoavaluació"); document.body.appendChild(el); }
  document.body.classList.add("aaKioscObert");
  aaPintarKiosc();
};
function aaPintarKiosc(){
  const el=document.getElementById("aaKiosc"); if(!el||!_aaK) return;
  const g=(state.grupos||[]).find(x=>x.id===_aaK.grupoId), act=g&&g.actividades.find(a=>a.id===_aaK.actId);
  if(!g||!act){ aaTancarKiosc(); return; }
  const co=_aaK.mode==="co", titol=`${co?"👥 Coavaluació":"🪞 Autoavaluació"} · ${esc(act.nombre)}`;
  const sortir=`<button class="ghost small aaSortir" style="border:1px solid var(--line)" onclick="aaSortirKiosc()">Acabar (professor/a)</button>`;
  if(_aaK.fet){
    el.innerHTML=`<div class="aaK"><div class="aaKCap"><strong>${titol}</strong>${sortir}</div>
      <div style="text-align:center;margin-top:18vh"><div style="font-size:54px">✅</div><h2>Gràcies!</h2><p class="sub">Passa el dispositiu al següent company/a.</p>
      <button class="btn" onclick="aaKSeguent()">Següent</button></div></div>`;
    return;
  }
  if(!_aaK.alId){
    const fet=id=>co? !!(act.coaval||{})[id] : !!(act.autoaval||{})[id];
    el.innerHTML=`<div class="aaK"><div class="aaKCap"><strong>${titol}</strong>${sortir}</div>
      <h2 style="margin:14px 0 4px">Toca el teu nom</h2><p class="sub">${co?"Després veuràs a qui has d'avaluar.":"Valoraràs el teu treball amb la rúbrica."} Ningú veurà cap nota.</p>
      <div class="aaNoms">${g.alumnos.map(a=>`<button class="ghost aaNom" style="border:1px solid var(--line)" onclick="aaKTriar('${escJS(a.id)}')">${typeof avatarAlumneHTML==="function"?avatarAlumneHTML(a,{mida:26}):""}${esc(a.nombre)}${fet(a.id)?' <span aria-label="ja fet">✓</span>':""}</button>`).join("")}</div></div>`;
    return;
  }
  const al=g.alumnos.find(a=>a.id===_aaK.alId);
  const objId=co? (act.coavalParelles||{})[_aaK.alId] : _aaK.alId, obj=g.alumnos.find(a=>a.id===objId);
  const niv=aaNivells(act), items=aaItems(act);
  const files=items.map(it=>`<fieldset class="aaFila"><legend>${esc(it.label||"")}</legend>
    <div class="aaOps">${niv.map((l,i)=>{ const col=cxnColor(l.color,i), on=_aaK.sel[it.id]===l.id, txt=String((it.celdas||{})[l.id]||"").trim();
      return `<button type="button" class="aaOp${on?" on":""}" style="--aa:${col};--aa-tinta:${cxnTinta(col)}" aria-pressed="${on}" onclick="aaKNivell('${escJS(it.id)}','${escJS(l.id)}')"><strong>${esc(l.nombre||"")}</strong>${txt?`<span>${esc(txt)}</span>`:""}</button>`; }).join("")}</div></fieldset>`).join("");
  const complet=items.every(it=>_aaK.sel[it.id]);
  el.innerHTML=`<div class="aaK"><div class="aaKCap"><strong>${titol}</strong>${sortir}</div>
    <p style="margin:12px 0 4px">Hola, <strong>${esc(al?al.nombre:"")}</strong>. ${co?`Avalues el treball de <strong>${esc(obj?obj.nombre:"")}</strong>.`:"Valora el teu treball:"} Tria una opció en cada fila.</p>
    ${files}
    <div class="flex" style="gap:8px;justify-content:space-between;margin:14px 0 30px;flex-wrap:wrap">
      <button class="ghost" style="border:1px solid var(--line)" onclick="aaKTriar('')">← No soc jo</button>
      <button class="btn" ${complet?"":"disabled"} onclick="aaKEnviar()">Envia</button>
    </div></div>`;
}
window.aaKTriar=id=>{ if(!_aaK) return; _aaK.alId=id; _aaK.sel={}; aaPintarKiosc(); const el=document.getElementById("aaKiosc"); if(el) el.scrollTop=0; };
window.aaKNivell=(itId,nivId)=>{ if(!_aaK) return; _aaK.sel[itId]=nivId; aaPintarKiosc(); };
window.aaKEnviar=()=>{
  if(!_aaK||!_aaK.alId) return;
  const g=(state.grupos||[]).find(x=>x.id===_aaK.grupoId), act=g&&g.actividades.find(a=>a.id===_aaK.actId); if(!act) return;
  if(!aaItems(act).every(it=>_aaK.sel[it.id])) return;
  const reg={n:Object.assign({},_aaK.sel),d:fechaISOLocal()};
  if(_aaK.mode==="co"){ (act.coaval=act.coaval||{})[_aaK.alId]=Object.assign({obj:(act.coavalParelles||{})[_aaK.alId]},reg); }
  else (act.autoaval=act.autoaval||{})[_aaK.alId]=reg;
  save(); _aaK.fet=true; aaPintarKiosc();
};
window.aaKSeguent=()=>{ if(!_aaK) return; _aaK.fet=false; _aaK.alId=""; _aaK.sel={}; aaPintarKiosc(); };
window.aaSortirKiosc=async()=>{
  if(!(await confirmar("Tornar al quadern? (Només el professor/a)",{ok:"Tornar",peligro:false}))) return;
  aaTancarKiosc();
};
function aaTancarKiosc(){ _aaK=null; const el=document.getElementById("aaKiosc"); if(el) el.remove(); document.body.classList.remove("aaKioscObert"); render(); }

/* ---------- Enllaç per als mòbils i codis ---------- */
async function _aaComprimir(txt){
  const b64=bytes=>{ let s=""; for(let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); };
  const raw=new TextEncoder().encode(txt);
  if(typeof CompressionStream==="function"){
    try{ const st=new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw")); return "z"+b64(new Uint8Array(await new Response(st).arrayBuffer())); }catch(e){}
  }
  return "j"+b64(raw);
}
async function aaEnllacURL(grupo,act,mode){
  const niv=aaNivells(act), its=aaItems(act);
  const dades={v:1,t:act.nombre,m:mode,k:aaEmpremta(act),max:grupo.alumnos.length,
    n:niv.map(l=>l.nombre||""),r:its.map(it=>[it.label||"",niv.map(l=>String((it.celdas||{})[l.id]||""))])};
  if(mode==="co"){ const p=aaParelles(grupo,act), num=id=>grupo.alumnos.findIndex(a=>a.id===id)+1; dades.p=grupo.alumnos.map(a=>num(p[a.id])); }
  const base=location.href.replace(/[#?].*$/,"").replace(/[^/]*$/,"");
  return base+"tools/autoavaluacio.html#"+(await _aaComprimir(JSON.stringify(dades)));
}
window.aaEnllac=async actId=>{
  const x=_aaAct(actId); if(!x) return;
  const [ua,uc]=[await aaEnllacURL(x.g,x.act,"auto"), x.g.alumnos.length>1? await aaEnllacURL(x.g,x.act,"co") : ""];
  const el=document.createElement("div"); el.className="modal-overlay"; el.id="aaEnllacModal";
  el.innerHTML=`<div class="modal-box" style="max-width:640px" role="dialog" aria-modal="true" aria-label="Enllaç per als mòbils">
    <div class="flex" style="justify-content:space-between;align-items:center"><strong>🔗 Enllaç per als mòbils · ${esc(x.act.nombre)}</strong><button class="modal-close" aria-label="Tancar" onclick="document.getElementById('aaEnllacModal').remove()">×</button></div>
    <p class="sub">Comparteix l'enllaç (per Aules, per exemple). L'enllaç porta només la rúbrica, cap nom. Cada alumne/a hi posa el seu <strong>número de llista</strong> i, en acabar, obté un codi curt que t'ha d'enviar o ensenyar. Després el copies en «📥 Enganxar codis».</p>
    ${[["🪞 Autoavaluació",ua],["👥 Coavaluació (parelles a l'atzar; cadascú veu el número del company/a que avalua)",uc]].filter(x=>x[1]).map(([t,u],i)=>`<div style="margin-top:10px"><div style="font-weight:600;font-size:13px">${t}</div>
      <div class="flex" style="gap:6px;margin-top:4px"><input class="in" readonly style="flex:1;min-width:0;font-size:12px" value="${esc(u)}" id="aaURL${i}" aria-label="Enllaç">
      <button class="ghost small" style="border:1px solid var(--line)" onclick="(i=>{i.select();navigator.clipboard&&navigator.clipboard.writeText(i.value);mostrarToast('✓ Enllaç copiat')})(document.getElementById('aaURL${i}'))">Copiar</button>
      <a class="ghost small" style="border:1px solid var(--line);padding:6px 10px;border-radius:8px" href="${esc(u)}" target="_blank" rel="noopener">Provar</a></div></div>`).join("")}
    <p class="sub" style="margin-top:10px">Números de llista: l'ordre de la llista del grup (1 = ${esc((x.g.alumnos[0]||{}).nombre||"")}).</p>
  </div>`;
  el.addEventListener("click",e=>{ if(e.target===el) el.remove(); });
  document.body.appendChild(el);
};
/* Codi: A-<núm>-<nivells>-<empremta>  o  C-<núm>-<núm avaluat>-<nivells>-<empremta>
   <nivells> = un dígit per fila (1 = primer nivell de la rúbrica). */
function aaLlegirCodi(grupo,act,codi){
  const m=String(codi).trim().toUpperCase().replace(/\s+/g,"").match(/^([AC])-(\d{1,3})(?:-(\d{1,3}))?-(\d+)-([0-9A-Z]{4})$/);
  if(!m) return {error:"format"};
  if(m[5]!==aaEmpremta(act)) return {error:"activitat"};
  const niv=aaNivells(act), its=aaItems(act);
  if(m[4].length!==its.length) return {error:"format"};
  const al=grupo.alumnos[Number(m[2])-1]; if(!al) return {error:"numero"};
  const n={}; for(let i=0;i<its.length;i++){ const l=niv[Number(m[4][i])-1]; if(!l) return {error:"format"}; n[its[i].id]=l.id; }
  if(m[1]==="A") return {mode:"auto",alId:al.id,n};
  const obj=grupo.alumnos[Number(m[3])-1]; if(!obj||obj.id===al.id) return {error:"numero"};
  return {mode:"co",alId:al.id,obj:obj.id,n};
}
window.aaEnganxarCodis=async actId=>{
  const x=_aaAct(actId); if(!x) return;
  const t=await _dialogo({titulo:"📥 Enganxar codis",mensaje:"Enganxa els codis que t'ha enviat l'alumnat (un per línia, o separats per espais). Exemple: A-7-1213-K3F9",ok:"Afegir",cancelar:"Cancel·lar",entrada:true,valor:""});
  if(!t) return;
  /* Un camp d'una línia s'empassa els salts: es busquen els codis dins del text. */
  const txt=String(t).toUpperCase().replace(/\s+/g," ");
  const codis=[...txt.matchAll(/[AC]-\d{1,3}(?:-\d{1,3})?-\d+-[0-9A-Z]{4}(?![0-9A-Z])|[AC]-\d{1,3}(?:-\d{1,3})?-\d+-[0-9A-Z]{4}(?=[AC]-)/g)].map(m=>m[0]);
  const resta=txt.replace(/[AC]-\d{1,3}(?:-\d{1,3})?-\d+-[0-9A-Z]{4}/g," ").split(/[\s,;]+/).filter(Boolean);
  if(!codis.length && !resta.length) return;
  let ok=0; const mal=resta.map(c=>`${c} (format incorrecte)`);
  codis.forEach(c=>{
    const r=aaLlegirCodi(x.g,x.act,c);
    if(r.error){ mal.push(`${c} (${({format:"format incorrecte",activitat:"és d'una altra activitat",numero:"número de llista que no existeix"})[r.error]})`); return; }
    const reg={n:r.n,d:fechaISOLocal()};
    if(r.mode==="auto") (x.act.autoaval=x.act.autoaval||{})[r.alId]=reg;
    else (x.act.coaval=x.act.coaval||{})[r.alId]=Object.assign({obj:r.obj},reg);
    ok++;
  });
  save(); render();
  if(mal.length) mostrarAviso(`S'han afegit ${ok} codi${ok===1?"":"s"}. No s'han pogut llegir:\n\n${mal.join("\n")}`);
  else mostrarToast(`✓ ${ok} codi${ok===1?"":"s"} afegit${ok===1?"":"s"}`);
};
