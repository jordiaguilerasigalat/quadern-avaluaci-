/* ============================================================================
   Quadern d'avaluació · Editar els temes de cada avaluació i la temporització
   js/programacion/editar-temes.js

   Des de la pestanya «Programació» del grup, el botó «✏️ Editar temes i
   sessions» obri un editor on:
     - cada tema es posa en una avaluació (1a, 2a o 3a) i es reordena;
     - es calculen soles les sessions de cada tema amb les dates de cada
       avaluació (Ajustos), el teu horari (classes d'este grup) i els festius
       del calendari, repartint-les en proporció al pes original del tema;
     - qualsevol tema es pot ajustar a mà (🔒): el recàlcul el respecta i
       reparteix la resta entre els altres.
   Els canvis es guarden en la programació vinculada (la comparteixen tots els
   grups que la tenen vinculada). «Cancel·lar» ho deixa com estava en obrir.
   ============================================================================ */

/* Sessions d'este grup per dia de la setmana segons l'horari: {L:2, M:0, ...}. */
function tempSessionsSetmana(g){
  const out={L:0,M:0,X:0,J:0,V:0};
  if(typeof horFilas!=="function" || !state.horario || !state.horario.celdas) return out;
  horFilas().forEach((f,i)=>{
    if(f.recreo) return;
    Object.keys(out).forEach(d=>{ const gc=horGrupoDeCelda(horCelda(i,d)); if(gc&&gc.id===g.id) out[d]++; });
  });
  return out;
}
/* Llista de dates (una entrada per sessió) d'una avaluació, sense festius. */
function tempSessionsAval(g,t,setmana){
  const ft=(g.fechasTrimestre||[])[t];
  if(!ft || !ft.inicio || !ft.fin || ft.fin<ft.inicio) return null;
  setmana=setmana||tempSessionsSetmana(g);
  const out=[]; const d=new Date(ft.inicio+"T00:00:00"), fi=new Date(ft.fin+"T00:00:00");
  for(let i=0;i<400 && d<=fi;i++, d.setDate(d.getDate()+1)){
    const id=["L","M","X","J","V","S","D"][(d.getDay()+6)%7];
    const n=setmana[id]||0; if(!n) continue;
    const f=fechaISOLocal(d);
    if(typeof agFestivoEnDia==="function" && agFestivoEnDia(f)) continue;
    for(let k=0;k<n;k++) out.push(f);
  }
  return out;
}
/* Què falta per poder calcular soles: dates d'avaluació i classes en l'horari. */
function tempQueFalta(g){
  const s=tempSessionsSetmana(g), falta=[];
  if(!Object.values(s).some(n=>n>0)) falta.push("horari");
  if(![0,1,2].some(t=>{ const f=(g.fechasTrimestre||[])[t]; return f&&f.inicio&&f.fin; })) falta.push("dates");
  return falta;
}
function _tempPes(s){ return Number(s.sessionsOriginals)||Number(s.sesionesPrevistas)||1; }
/* Reparteix les sessions de cada avaluació entre els seus temes. Els temes
   ajustats a mà (s.sessionsManual) es respecten. Torna {t:{disp,usades}} o null. */
function tempRecalcular(g,p){
  const setmana=tempSessionsSetmana(g);
  if(!Object.values(setmana).some(n=>n>0)) return null;
  const reserva=Math.max(0,Number(p.tempReserva)||0);
  const res={};
  [0,1,2].forEach(t=>{
    const dates=tempSessionsAval(g,t,setmana); if(!dates) return;
    const temes=temesDeGrup(g).filter(s=>s.trimestre===t);
    temes.forEach(s=>{ if(s.sessionsOriginals==null) s.sessionsOriginals=Number(s.sesionesPrevistas)||""; });
    const disp=Math.max(0,dates.length-reserva);
    const fixos=temes.filter(s=>s.sessionsManual), autos=temes.filter(s=>!s.sessionsManual);
    let resta=disp-fixos.reduce((n,s)=>n+(Number(s.sesionesPrevistas)||0),0);
    if(autos.length){
      resta=Math.max(resta,autos.length);
      const pesTot=autos.reduce((n,s)=>n+_tempPes(s),0);
      const brut=autos.map(s=>resta*_tempPes(s)/pesTot);
      const base=brut.map(x=>Math.max(1,Math.floor(x)));
      let sobra=resta-base.reduce((a,b)=>a+b,0);
      const ordre=brut.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]);
      for(let k=0;sobra>0&&k<ordre.length*4;k++){ base[ordre[k%ordre.length][1]]++; sobra--; }
      autos.forEach((s,i)=>{ s.sesionesPrevistas=String(base[i]); });
    }
    res[t]={disp,usades:temes.reduce((n,s)=>n+(Number(s.sesionesPrevistas)||0),0)};
  });
  return res;
}
/* Dates previstes de cada tema (seguint l'ordre dins de l'avaluació). {id:{ini,fi,noCap}} */
function tempDatesTemes(g,p){
  const setmana=tempSessionsSetmana(g); const out={};
  if(!Object.values(setmana).some(n=>n>0)) return out;
  const reserva=Math.max(0,Number(p&&p.tempReserva)||0);
  [0,1,2].forEach(t=>{
    const dates=tempSessionsAval(g,t,setmana); if(!dates||!dates.length) return;
    const util=dates.slice(0,Math.max(0,dates.length-reserva));
    let c=0;
    temesDeGrup(g).filter(s=>s.trimestre===t).forEach(s=>{
      const n=Number(s.sesionesPrevistas)||0; if(!n) return;
      out[s.id]={ini:util[c]||null, fi:util[Math.min(c+n,util.length)-1]||null, noCap:c+n>util.length};
      c+=n;
    });
  });
  return out;
}
function tempDataCurta(f){ if(!f) return "?"; const [,m,d]=f.split("-"); return d+"/"+m; }
function tempDatesText(r){ return r&&r.ini? `${tempDataCurta(r.ini)} – ${tempDataCurta(r.fi)}${r.noCap?" ⚠️":""}` : ""; }

/* ---- Accions de l'editor ---- */
function _tempCtx(){ const g=grupoActual(); const p=g&&progDeGrupo(g); return p?{g,p}:null; }
window.tempEditarObrir=()=>{
  const c=_tempCtx(); if(!c) return;
  state.ui.tempEditant=c.p.id;
  window.__tempCopia={id:c.p.id, sdas:JSON.parse(JSON.stringify(c.p.sdas||[])), reserva:c.p.tempReserva};
  render();
};
window.tempEditarTancar=()=>{ state.ui.tempEditant=""; window.__tempCopia=null; save(); render(); mostrarToast("✓ Temes i sessions guardats"); };
window.tempEditarCancel=()=>{
  const c=_tempCtx(), k=window.__tempCopia;
  if(c && k && k.id===c.p.id){ c.p.sdas=k.sdas; c.p.tempReserva=k.reserva; if(c.p.tempReserva===undefined) delete c.p.tempReserva; }
  state.ui.tempEditant=""; window.__tempCopia=null; save(); render();
};
window.tempSetAval=(id,t)=>{
  const c=_tempCtx(); if(!c) return; const s=c.p.sdas.find(x=>x.id===id); if(!s) return;
  t=Number(t); if(s.trimestre===t) return;
  c.p.sdas.splice(c.p.sdas.indexOf(s),1); s.trimestre=t;
  let ult=-1; c.p.sdas.forEach((x,i)=>{ if(x.trimestre===t) ult=i; });
  c.p.sdas.splice(ult+1,0,s);
  if(state.ui.tempAuto!==false) tempRecalcular(c.g,c.p);
  save(); render();
};
window.tempMoure=(id,dir)=>{
  const c=_tempCtx(); if(!c) return; const s=c.p.sdas.find(x=>x.id===id); if(!s) return;
  const germans=temesDeGrup(c.g).filter(x=>x.trimestre===s.trimestre);
  const i=germans.indexOf(s), v=germans[i+dir]; if(!v) return;
  const a=c.p.sdas.indexOf(s), b=c.p.sdas.indexOf(v); [c.p.sdas[a],c.p.sdas[b]]=[c.p.sdas[b],c.p.sdas[a]];
  save(); render();
};
window.tempSetSessions=(id,v)=>{
  const c=_tempCtx(); if(!c) return; const s=c.p.sdas.find(x=>x.id===id); if(!s) return;
  const n=parseInt(v,10);
  if(s.sessionsOriginals==null) s.sessionsOriginals=Number(s.sesionesPrevistas)||"";
  s.sesionesPrevistas=Number.isFinite(n)&&n>0? String(n) : "";
  s.sessionsManual=true;
  if(state.ui.tempAuto!==false) tempRecalcular(c.g,c.p);
  save(); render();
};
window.tempAlliberar=id=>{
  const c=_tempCtx(); if(!c) return; const s=c.p.sdas.find(x=>x.id===id); if(!s) return;
  delete s.sessionsManual; tempRecalcular(c.g,c.p); save(); render();
};
window.tempSetReserva=v=>{
  const c=_tempCtx(); if(!c) return; const n=parseInt(v,10);
  c.p.tempReserva=Number.isFinite(n)&&n>0? n : 0;
  tempRecalcular(c.g,c.p); save(); render();
};
window.tempSetAuto=on=>{ state.ui.tempAuto=!!on; if(on){ const c=_tempCtx(); if(c) tempRecalcular(c.g,c.p); } save(); render(); };
window.tempRecalcularTot=async (totsAuto)=>{
  const c=_tempCtx(); if(!c) return;
  const falta=tempQueFalta(c.g);
  if(falta.length){ mostrarAviso(tempQueFaltaText(falta)); return; }
  if(totsAuto){
    if(!await confirmar("Es tornaran a calcular les sessions de TOTS els temes, també els que has ajustat a mà. Continuar?")) return;
    c.p.sdas.forEach(s=>{ delete s.sessionsManual; });
  }
  tempRecalcular(c.g,c.p); save(); render(); mostrarToast("✓ Temporització recalculada");
};
function tempQueFaltaText(falta){
  const t=[];
  if(falta.includes("dates")) t.push("les dates de cada avaluació (Ajustos del grup → Dates d'avaluació)");
  if(falta.includes("horari")) t.push("les classes d'este grup en el teu horari (Inici → El meu horari, enllaçant cada classe amb el grup)");
  return "Per a calcular soles les sessions em falten "+t.join(" i ")+". Mentrestant pots posar les sessions de cada tema a mà.";
}

/* ---- Pintar l'editor (substitueix la vista de temes mentre s'edita) ---- */
function tempEditorHTML(g,p){
  const temes=temesDeGrup(g);
  const setmana=tempSessionsSetmana(g);
  const perSetmana=Object.values(setmana).reduce((a,b)=>a+b,0);
  const reserva=Math.max(0,Number(p.tempReserva)||0);
  const dates=tempDatesTemes(g,p);
  const falta=tempQueFalta(g);
  const auto=state.ui.tempAuto!==false;
  const altres=state.grupos.filter(x=>x.id!==g.id && x.programacionId===p.id);
  const seccio=t=>{
    const ts=temes.filter(s=>s.trimestre===t);
    const dl=tempSessionsAval(g,t,setmana);
    const disp=dl? Math.max(0,dl.length-reserva) : null;
    const usades=ts.reduce((n,s)=>n+(Number(s.sesionesPrevistas)||0),0);
    const color=disp==null? "var(--mut)" : usades>disp? "var(--danger,#b91c1c)" : usades<disp? "#b45309" : "#16a34a";
    const resum=disp==null? `${usades} sessions posades · sense dates d'avaluació`
      : `${usades} de ${disp} sessions${reserva?` (+${reserva} reservades)`:""}${usades>disp?" · en sobren "+(usades-disp):usades<disp?" · en queden "+(disp-usades)+" lliures":" · quadra"}`;
    const files=ts.map((s,i)=>{
      const man=!!s.sessionsManual;
      return `<div class="temp-fila" style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--line)">
        <span style="display:flex;flex-direction:column;gap:2px">
          <button class="ghost small" style="padding:0 6px;line-height:1.2" title="Pujar" aria-label="Pujar ${esc(temaNomCurt(s))}" ${i===0?"disabled":""} onclick="tempMoure('${escJS(s.id)}',-1)">▲</button>
          <button class="ghost small" style="padding:0 6px;line-height:1.2" title="Baixar" aria-label="Baixar ${esc(temaNomCurt(s))}" ${i===ts.length-1?"disabled":""} onclick="tempMoure('${escJS(s.id)}',1)">▼</button>
        </span>
        <span style="min-width:0">
          <span style="font-weight:600;font-size:13.5px">${esc(temaNomCurt(s))}</span>${s.tema&&s.titulo?`<span class="sub" style="margin:0;font-style:italic"> · ${esc(s.titulo)}</span>`:""}
          <span class="sub" style="display:block;margin:0;font-size:12px">${dates[s.id]?"📅 "+tempDatesText(dates[s.id]):""}${s.sessionsOriginals?`${dates[s.id]?" · ":""}en la programació: ${esc(String(s.sessionsOriginals))} s.`:""}</span>
        </span>
        <span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <select class="in" style="width:auto" aria-label="Avaluació de ${esc(temaNomCurt(s))}" onchange="tempSetAval('${escJS(s.id)}',this.value)">
            ${[0,1,2].map(k=>`<option value="${k}" ${k===t?"selected":""}>${k+1}a av.</option>`).join("")}
          </select>
          <input class="in" type="number" min="0" step="1" style="width:64px;${man?"border-color:var(--accent,#b7893a);font-weight:700":""}" aria-label="Sessions de ${esc(temaNomCurt(s))}" value="${esc(String(s.sesionesPrevistas||""))}" onchange="tempSetSessions('${escJS(s.id)}',this.value)">
          ${man?`<button class="ghost small" style="border:1px solid var(--line)" title="Ajustat a mà. Clica per a tornar al càlcul automàtic" onclick="tempAlliberar('${escJS(s.id)}')">🔒 a mà</button>`:`<span class="sub" style="margin:0;font-size:12px" title="Calculat soles">auto</span>`}
        </span>
      </div>`;
    }).join("");
    return `<div class="card" style="padding:10px 14px">
      <div class="flex" style="justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline">
        <strong>${esc(TRIMESTRES[t])}</strong>
        <span style="font-size:12.5px;font-weight:600;color:${color}">${resum}</span>
      </div>
      ${(()=>{ const f=(g.fechasTrimestre||[])[t]; return f&&f.inicio&&f.fin?`<p class="sub" style="margin:2px 0 0;font-size:12px">${tempDataCurta(f.inicio)} – ${tempDataCurta(f.fin)}</p>`:""; })()}
      ${files||`<p class="sub" style="margin:6px 0 0">Cap tema en esta avaluació. Canvia l'avaluació d'un tema amb el desplegable.</p>`}
    </div>`;
  };
  return `<div class="card">
      <h2>✏️ Editar temes i sessions · ${esc(p.nombre)}</h2>
      <p class="sub" style="margin:0">Tria en quina avaluació va cada tema i ordena'ls amb ▲▼. Les sessions es calculen soles amb les dates de cada avaluació, el teu horari (${perSetmana} sessió${perSetmana===1?"":"ns"} a la setmana amb este grup) i els festius, repartides segons el pes de cada tema en la programació. Si escrius un número, eixe tema queda ajustat a mà (🔒) i el càlcul reparteix la resta entre els altres.</p>
      ${falta.length?`<p style="margin:8px 0 0;padding:8px 10px;border-radius:8px;background:var(--warn-soft,#fef3c7);font-size:13px">⚠️ ${esc(tempQueFaltaText(falta))}</p>`:""}
      ${altres.length?`<p class="sub" style="margin:6px 0 0">Esta programació també la té vinculada ${esc(altres.map(x=>x.nombre).join(", "))}: els canvis valen per a tots.</p>`:""}
      <div class="flex" style="gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px">
        <label style="font-size:13px;display:flex;gap:6px;align-items:center"><input type="checkbox" ${auto?"checked":""} onchange="tempSetAuto(this.checked)"> Recalcular soles en cada canvi</label>
        <label style="font-size:13px;display:flex;gap:6px;align-items:center">Reservar <input class="in" type="number" min="0" step="1" style="width:56px" value="${reserva||""}" placeholder="0" onchange="tempSetReserva(this.value)"> sessions per avaluació (exàmens, repàs…)</label>
      </div>
      <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:10px">
        <button class="btn" onclick="tempEditarTancar()">✓ Fet</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="tempRecalcularTot(false)">🔄 Recalcular</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="tempRecalcularTot(true)">↺ Tot automàtic (oblida els ajustos a mà)</button>
        <button class="ghost" style="border:1px solid var(--line)" onclick="tempEditarCancel()">Cancel·lar</button>
      </div>
    </div>
    ${[0,1,2].map(seccio).join("")}`;
}
