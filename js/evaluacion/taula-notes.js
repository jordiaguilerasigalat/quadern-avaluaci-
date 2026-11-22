/* ============================================================================
   Quadern d'avaluació · «Taula de notes» (Avaluar → Taula de notes)
   js/evaluacion/taula-notes.js

   Una graella com la d'un quadern de notes: l'alumnat a l'esquerra (fix) i,
   en columnes, totes les activitats de l'avaluació triada (ordenades per data),
   amb el títol, la data i els criteris de cada una. Cada casella mostra la nota
   de l'activitat (la que compta: amb la recuperació i els punts extra ja
   aplicats) pintada de roig (baixa) a verd (alta). L'última columna és la nota
   de l'avaluació.

   Tocar una casella obri la rúbrica d'eixa activitat amb eixe alumne/a, per a
   vore-la i canviar-la. No guarda res nou: llig i escriu les mateixes dades que
   Qualificar i el Corrector (grupo.notas, grupo.notasCuant, grupo.rubricScores,
   grupo.marcas), amb les mateixes funcions.
   ============================================================================ */

/* Activitats de l'avaluació en l'ordre de la taula: primer les que tenen data
   (de la més antiga a la més nova), després les que no en tenen (en l'ordre en
   què es van crear). Les activitats del quadern de reforç NESE (només per a un
   alumne/a; la resta n'està exempta) van al final. */
function tnActivitats(grupo){
  const acts=actsTrim(grupo).map((a,i)=>({a,i,f:(typeof agDataActivitat==="function"? agDataActivitat(a.id) : "")||""}));
  acts.sort((x,y)=> (!!x.a.quadernNese-!!y.a.quadernNese) || ((x.f&&y.f)? (x.f<y.f?-1:x.f>y.f?1:x.i-y.i) : x.f? -1 : y.f? 1 : x.i-y.i));
  return acts;
}
function tnDataCurta(f){
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(f||""); return m? `${m[3]}-${m[2]}-${m[1].slice(2)}` : "";
}
/* Nota que es veu en la casella. Una recuperació no compta sola: es mostra la
   seua nota pròpia (la de l'examen de recuperació). */
function tnNota(grupo,alId,a,trim){
  return a.recupera? notaActividadBase(grupo,alId,a) : notaActividad(grupo,alId,a,trim);
}
/* Color de la casella: de roig intens (0) a rosa pàl·lid (<5); de verd pàl·lid (5)
   a verd intens (10). El text sempre fosc, per a llegir-se bé en clar i en fosc. */
function tnColor(v){
  if(v==null||isNaN(v)) return "";
  const mix=(c1,c2,t)=>"#"+[0,1,2].map(k=>{ const a=parseInt(c1.substr(1+2*k,2),16), b=parseInt(c2.substr(1+2*k,2),16); return Math.round(a+(b-a)*t).toString(16).padStart(2,"0"); }).join("");
  if(v<5) return mix("#e8492f","#f8d9d2",Math.max(0,Math.min(1,v/5)));
  return mix("#eaf6e2","#7fd858",Math.max(0,Math.min(1,(v-5)/5)));
}
function tnCriterisCap(grupo,a){
  const ids=(a.rubrica && typeof cxCriteriosDeActividad==="function")? cxCriteriosDeActividad(a) : criterisActivitatCE(a).map(l=>l.critId);
  return ids;
}

function renderTaulaNotes(grupo){
  const c=document.getElementById("tabContent");
  const trim=state.ui.trim;
  const selTrim=`<label class="tn-trim">Avaluació
    <select class="in" onchange="tnTriarAvaluacio(this.value)">${TRIMESTRES.map((t,i)=>`<option value="${i}" ${i===trim?"selected":""}>${t}</option>`).join("")}</select></label>`;
  const acts=tnActivitats(grupo);
  if(!grupo.alumnos.length || !acts.length){
    c.innerHTML=`<div class="card"><div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Taula de notes</h2>${selTrim}</div>
      <p class="sub" style="margin:8px 0 0">${!grupo.alumnos.length?"Afig abans l'alumnat del grup.":"Encara no hi ha cap activitat en esta avaluació. Crea-les en <strong>Activitats</strong> i ací apareixeran en columnes."}</p>${grupo.alumnos.length?`<button class="btn" style="margin-top:10px" onclick="tnNovaActivitat()">＋ Nova activitat</button>`:""}</div>`;
    return;
  }
  const cap=acts.map(({a,f})=>{
    const crits=tnCriterisCap(grupo,a);
    return `<th scope="col" class="tn-act" data-act="${a.id}" title="${esc(a.nombre)}${a.tipo?" · "+esc(a.tipo):""}">
      <button type="button" class="tn-act-nom" onclick="tnObrirQualificar('${a.id}')" title="Obrir «${esc(a.nombre)}» per a qualificar tot el grup">${a.recupera?"🔁 ":""}${esc(a.nombre)}</button>
      <div class="tn-act-data">${f?tnDataCurta(f):"&nbsp;"}</div>
      <div class="tn-act-crit" title="${esc(crits.join(", "))}">${crits.length?esc(crits.join(" · ")):'<span class="tn-mut">sense criteris</span>'}</div>
    </th>`;
  }).join("");
  const files=grupo.alumnos.map((al,i)=>{
    const cel=acts.map(({a})=>{
      const m=marcaDe(grupo,al.id,a.id);
      const v=m==="EX"? null : tnNota(grupo,al.id,a,trim);
      const txt= m==="NP"? "NP" : m==="EX"? "Exempt" : (v==null? "" : fmt(v));
      const bg= m==="EX"? "" : tnColor(v);
      const extra=!a.recupera && extraAplicadoActividad(grupo,al.id,a);
      const rec=!a.recupera && recuperacionesDe(grupo,a.id).some(r=>notaActividadBase(grupo,al.id,r)!=null);
      return `<td class="tn-cel${m==="EX"?" tn-ex":""}"${bg?` style="background:${bg}"`:""}><button type="button" onclick="tnObrir('${al.id}','${a.id}')" aria-label="${esc(al.nombre)} · ${esc(a.nombre)}: ${m==="EX"?"exempt":txt||"sense nota"}"${m==="EX"?' title="Exempt: no compta per a este alumne/a"':""}>${txt}${extra?'<sup title="Amb punts extra">+</sup>':""}${rec?'<sup title="Amb recuperació">🔁</sup>':""}</button></td>`;
    }).join("");
    const nt=notaTrimestre(grupo,al.id,trim);
    return `<tr><th scope="row" class="tn-al"><span class="tn-num">${i+1}.</span> ${nomFitxaHTML(al)}${neseBadgeHTML(al)}</th>${cel}
      <td class="tn-cel tn-final"${nt!=null?` style="background:${tnColor(nt)}"`:""}><span>${nt==null?"—":fmt(nt)}</span></td><td class="tn-cel tn-nova-cel"></td></tr>`;
  }).join("");
  c.innerHTML=`<div class="card tn-card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
      <div><h2 style="margin:0">Taula de notes · ${esc(TRIMESTRES[trim]||"")}</h2>
      <p class="sub" style="margin:2px 0 0">Toca una nota per a vore i canviar la rúbrica d'eixe alumne/a. Toca el nom d'una activitat per a qualificar tot el grup.</p></div>
      ${selTrim}
    </div>
    <div class="tn-wrap scroll" tabindex="0" aria-label="Taula de notes de ${esc(TRIMESTRES[trim]||"")}">
      <table class="tn-taula">
        <thead><tr><th scope="col" class="tn-al tn-esq">Alumnat <span class="tn-mut">(${grupo.alumnos.length})</span></th>${cap}<th scope="col" class="tn-act tn-final"><div class="tn-act-nom">Nota ${esc((TRIMESTRES[trim]||"").replace(/ avaluació$/," av."))}</div><div class="tn-act-data">&nbsp;</div><div class="tn-act-crit">${modoNotaGrupo(grupo)==="ce"?"per competències":"per blocs"}</div></th><th scope="col" class="tn-act tn-nova"><button type="button" class="tn-nova-bt" onclick="tnNovaActivitat()" title="Crear una activitat nova en esta avaluació (es crea en Activitats, com totes)"><span aria-hidden="true">＋</span>Nova activitat</button></th></tr></thead>
        <tbody>${files}</tbody>
      </table>
    </div>
  </div>`;
  if(state.ui.tnCel){ c.insertAdjacentHTML("beforeend",tnModalHTML(grupo)); tnRestaurarModal(); }
  if(state.ui.tnNova){ const id=state.ui.tnNova; state.ui.tnNova=""; const w=c.querySelector(".tn-wrap"), th=c.querySelector(`.tn-act[data-act="${id}"]`);
    if(w&&th){ w.scrollLeft=Math.max(0,th.offsetLeft-w.clientWidth/2); th.classList.add("tn-recent"); } }
}

window.tnTriarAvaluacio=v=>{ state.ui.trim=Number(v)||0; state.ui.tnCel=null; save(); render(); };
window.tnObrirQualificar=actId=>{ state.ui.calAct=actId; state.ui.tnCel=null; state.ui.tab="calificar"; save(); render(); };
let _tnModalScroll=0;
window.tnObrir=(alId,actId)=>{ state.ui.tnCel={al:alId,act:actId}; _tnModalScroll=0; save(); render(); };
window.tnTancar=()=>{ state.ui.tnCel=null; save(); render(); };
window.tnMoure=(dAl,dAct)=>{
  const grupo=grupoActual(); const x=state.ui.tnCel; if(!grupo||!x) return;
  const acts=tnActivitats(grupo).map(o=>o.a);
  const i=grupo.alumnos.findIndex(a=>a.id===x.al), j=acts.findIndex(a=>a.id===x.act);
  const al=grupo.alumnos[i+dAl], act=acts[j+dAct];
  if(!al||!act) return;
  state.ui.tnCel={al:al.id,act:act.id}; _tnModalScroll=0; save(); render();
};

function tnModalHTML(grupo){
  const x=state.ui.tnCel;
  const al=grupo.alumnos.find(a=>a.id===x.al), act=grupo.actividades.find(a=>a.id===x.act);
  if(!al||!act||act.trimestre!==state.ui.trim){ state.ui.tnCel=null; return ""; }
  const acts=tnActivitats(grupo).map(o=>o.a);
  const i=grupo.alumnos.indexOf(al), j=acts.indexOf(act);
  const f=typeof agDataActivitat==="function"? agDataActivitat(act.id) : "";
  const m=marcaDe(grupo,al.id,act.id);
  const v=m==="EX"? null : tnNota(grupo,al.id,act,state.ui.trim);
  let cos="";
  if(act.rubrica){
    grupo.rubricScores[al.id]=grupo.rubricScores[al.id]||{};
    const sc=grupo.rubricScores[al.id][act.id]||{};
    const rub=typeof mbRubricaVista==="function"? mbRubricaVista(act,al.id) : cxRubricaDe(act,al.id);
    const varAl=typeof cxVarianteDeAlumno==="function"? cxVarianteDeAlumno(act,al.id) : null;
    cos=`${varAl?`<p class="sub" style="margin:0 0 8px">Fa ${varAl.tipo==="ausencia"?"un examen alternatiu":"un examen adaptat"} («${esc(varAl.nombre||"Adaptada")}») i es corregix amb la seua rúbrica.</p>`:""}
      ${cxEsNiveles(rub)? cxnCorregirHTML(grupo,rub,sc,al.id,act.id) : rub.map(sec=>cxNodoCorregirHTML(sec,0,sc,al.id,act.id)).join("")}`;
  }else{
    const vc=act.esExamen? grupo.notasCuant?.[al.id]?.[act.id] : null;
    cos=`${act.esExamen?`<label class="tn-cuant">Nota de l'examen (0–10)
        <input class="in" type="text" inputmode="decimal" autocomplete="off" style="width:90px" value="${vc==null?"":String(vc).replace(".",",")}" onchange="setNotaCuantExamen('${al.id}','${act.id}',this.value,true)"></label>`:""}
      ${act.criterios.length? act.criterios.map(l=>{
        const val=grupo.notas?.[al.id]?.[act.id]?.[l.critId];
        return `<div class="cal-crit">
          <span class="cal-crit-id">${critLinkHTML(grupo.catalogoKey,l.critId)}${act.criterios.length>1?` <span class="tn-mut">(${Number(l.peso)||0} %)</span>`:""}</span>
          <div class="cal-chips">${ESCALA.map(o=>`<button class="chip ${val===o.v?"on":""}" onclick="setNota('${al.id}','${act.id}','${l.critId}',${val===o.v?"''":o.v},true)">${o.etq} (${String(o.v).replace(".",",")})</button>`).join("")}</div>
        </div>`; }).join("")
      : (act.esExamen? "" : `<p class="sub" style="margin:0">Esta activitat encara no té criteris. Afig-los en <strong>Activitats</strong> per a poder-la qualificar.</p>`)}`;
  }
  const extraTxt=!act.recupera && extraAplicadoActividad(grupo,al.id,act)? textoNotaConExtra(notaActividadSinExtra(grupo,al.id,act),extraAplicadoActividad(grupo,al.id,act),notaActividad(grupo,al.id,act)) : "";
  const recs=act.recupera? [] : recuperacionesDe(grupo,act.id).filter(r=>notaActividadBase(grupo,al.id,r)!=null);
  return `<div class="modal-overlay tn-modal" onclick="if(event.target===this) tnTancar()">
    <div class="modal-box" style="max-width:860px" role="dialog" aria-modal="true" aria-label="${esc(act.nombre)} · ${esc(al.nombre)}" id="tnModalBox">
      <div class="flex" style="justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:nowrap">
        <div style="min-width:0">
          <h2 style="font-size:16px;display:flex;align-items:center;flex-wrap:wrap;margin:0">${avatarAlumneHTML(al,{mida:36})}${esc(al.nombre)}${neseBadgeHTML(al)}${marcaBadgeHTML(grupo,al.id,act.id)}</h2>
          <p class="sub" style="margin:4px 0 0">${act.recupera?"🔁 ":""}<strong>${esc(act.nombre)}</strong>${f?" · "+esc(tnDataCurta(f)):""}${act.tipo?" · "+esc(act.tipo):""}</p>
        </div>
        <button class="ghost" aria-label="Tancar" onclick="tnTancar()">✕</button>
      </div>
      <div class="flex tn-nav">
        <button class="ghost small" ${i<=0?"disabled":""} onclick="tnMoure(-1,0)" title="Alumne/a anterior">↑ Anterior</button>
        <button class="ghost small" ${i>=grupo.alumnos.length-1?"disabled":""} onclick="tnMoure(1,0)" title="Alumne/a següent">↓ Següent</button>
        <span style="flex:1"></span>
        <button class="ghost small" ${j<=0?"disabled":""} onclick="tnMoure(0,-1)" title="Activitat anterior">← Act.</button>
        <button class="ghost small" ${j>=acts.length-1?"disabled":""} onclick="tnMoure(0,1)" title="Activitat següent">Act. →</button>
      </div>
      <div class="tn-nota">
        <div><div class="tn-mut" style="font-size:12.5px">Nota</div>
          <span class="big" style="font-size:26px">${m==="NP"?"NP":m==="EX"?"Exempt":v==null?"—":fmt(v)}</span>
          ${extraTxt?`<div style="font-size:13px">Amb punts extra: <strong>${extraTxt}</strong></div>`:""}
          ${recs.length?`<div style="font-size:13px">🔁 Amb la recuperació: ${recs.map(r=>esc(r.nombre)+" ("+fmt(notaActividadBase(grupo,al.id,r))+")").join(", ")}</div>`:""}
        </div>
        <div><div class="tn-mut" style="font-size:12.5px;margin-bottom:4px">No presentat / exempt</div>${marcaBotonesHTML(grupo,al.id,act.id)}</div>
      </div>
      <div class="tn-rub">${cos}</div>
      ${act.recupera?"":`<div style="margin-top:12px"><div class="tn-mut" style="font-size:12.5px;margin-bottom:4px">Punts extra (opcional)${extraBadgeHTML(grupo,al.id,act)}</div>${extraCamposHTML("act",al.id,act.id,extraActividad(grupo,al.id,act.id))}</div>`}
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap">
        ${act.rubrica?`<button class="ghost" style="border:1px solid var(--line)" onclick="tnTancar();cxAbrirDesdeOtroModo('${act.id}')">Obrir al Corrector →</button>`:`<button class="ghost" style="border:1px solid var(--line)" onclick="tnObrirQualificar('${act.id}')">Qualificar tot el grup →</button>`}
        <button class="btn" onclick="tnTancar()">Fet</button>
      </div>
    </div>
  </div>`;
}
/* Mentre el diàleg està obert, cada canvi torna a pintar la pantalla: es manté
   la posició de la rúbrica (scroll del diàleg) i Esc el tanca. */
document.addEventListener("scroll",e=>{ if(e.target&&e.target.id==="tnModalBox") _tnModalScroll=e.target.scrollTop; },true);
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && state && state.ui && state.ui.tnCel && document.querySelector(".tn-modal")){ e.preventDefault(); tnTancar(); } });
function tnRestaurarModal(){ const b=document.getElementById("tnModalBox"); if(b && _tnModalScroll) b.scrollTop=_tnModalScroll; }

/* ---- «＋ Nova activitat»: es crea en Activitats (amb el mateix formulari i el
   selector de la Programació) i, en guardar-la, es torna a la taula amb la
   columna nova a la vista. ---- */
window.tnNovaActivitat=()=>{
  const grupo=grupoActual(); if(!grupo) return;
  state.ui.tnTornar=true; state.ui.tnCel=null; state.ui.segAct="";
  state.ui.form={editId:null,nombre:"",tipo:TIPOS[0],esExamen:false,bloqueId:"",pesoBloque:"",links:[],sda:""};
  state.ui.formLliure=false;
  state.ui.tab="actividades"; save(); render(); window.scrollTo(0,0);
};
window.tnTornarTaula=()=>{ state.ui.tnTornar=false; state.ui.formLliure=false; state.ui.tab="taula"; save(); render(); };
function tnBarraTornarHTML(){
  return `<div class="card tn-tornar" role="note"><div class="flex" style="justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
    <span>➕ <strong>Nova activitat per a la Taula de notes</strong> (${esc(TRIMESTRES[state.ui.trim]||"")}). Quan la guardes, tornaràs a la taula.</span>
    <button class="ghost" style="border:1px solid var(--line)" onclick="tnTornarTaula()">← Tornar a la taula</button></div></div>`;
}
/* Després de crear l'activitat (formulari propi o des de la Programació), torna a la taula. */
function tnEmbolcallarCrear(nom){
  const orig=window[nom]; if(typeof orig!=="function") return;
  window[nom]=function(){
    const grupo=grupoActual(); const abans=grupo? new Set(grupo.actividades.map(a=>a.id)) : null;
    const r=orig.apply(this,arguments);
    if(state.ui.tnTornar && grupo){
      const nova=grupo.actividades.find(a=>!abans.has(a.id));
      if(nova){ state.ui.tnTornar=false; state.ui.formLliure=false; state.ui.segAct=""; state.ui.tnNova=nova.id; state.ui.trim=nova.trimestre; state.ui.tab="taula"; save(); render(); }
    }
    return r;
  };
}
tnEmbolcallarCrear("saveActividad");
tnEmbolcallarCrear("actAnadirDesdeProgramacion");
tnEmbolcallarCrear("segCrear");
/* Un examen amb rúbrica es crea en el Corrector: d'allí ja no es torna sol a la taula. */
(function(){ const o=window.segNouExamen; if(typeof o==="function") window.segNouExamen=function(){ state.ui.tnTornar=false; return o.apply(this,arguments); }; })();
