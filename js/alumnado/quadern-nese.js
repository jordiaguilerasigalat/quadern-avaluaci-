/* ============================================================================
   Quadern d'avaluació · Seguiment del quadern (dossier) de reforç NESE
   js/alumnado/quadern-nese.js

   Dins del pla NESE de cada alumne/a: per on va el dossier de treball (quines
   tasques ha fet i quan), com les ha fetes (nivell d'assoliment AE/AN/AS/NA,
   si ha necessitat ajuda i una nota breu) i, com que cada tasca està lligada
   a criteris d'avaluació, el progrés per competència específica i criteri.

   Es guarda dins del pla: p.quadern = { dossier:"2eso"|"3eso"|"", tasques:[
     { id, tema (n del tema o 0 = altres), titol, nivell, criteris:["7.2"],
       trim (només tasques d'«Altres»), propia, feta, data, assol, ajuda, nota }],
     activitats:{ "<trim>|<tema>": actId } }   (activitats creades al grup)
   Les dades viuen només al navegador, com la resta del pla.
   ============================================================================ */
const QN_NIVELLS=[
  {id:"AE",label:"Assoliment excel·lent",v:4,nota:10,bg:"#c8e6c9",fg:"#14532d"},
  {id:"AN",label:"Assoliment notable",v:3,nota:7.5,bg:"#e6f2b3",fg:"#3f6212"},
  {id:"AS",label:"Assoliment suficient",v:2,nota:5,bg:"#ffe5a3",fg:"#854d0e"},
  {id:"NA",label:"No assolit",v:1,nota:2.5,bg:"#f7a1aa",fg:"#7f1d1d"}
];
const QN_ESTRELLES={Inici:"★",Guiada:"★★",Autonomia:"★★★"};
function qnNivell(id){ return QN_NIVELLS.find(n=>n.id===id)||null; }
/* Nivell (AE/AN/AS/NA) més pròxim a una mitjana 1-4. */
function qnNivellDeMitjana(m){ if(m==null) return null; return QN_NIVELLS.slice().sort((a,b)=>Math.abs(a.v-m)-Math.abs(b.v-m))[0]; }
function qnPill(n,titol){
  if(!n) return '<span style="color:var(--mut);font-size:12.5px">—</span>';
  return `<span class="pill" title="${esc(titol||n.label)}" style="background:${n.bg};color:${n.fg};font-weight:700">${n.id}</span>`;
}
function qnDossier(p){ return p && p.quadern && QN_DOSSIERS[p.quadern.dossier] || null; }
function qnTema(p,n){ const d=qnDossier(p); return d? d.temes.find(t=>t.n===n)||null : null; }
function qnTrimTasca(p,t){ const T=t.tema? qnTema(p,t.tema) : null; return T? T.trim : (t.trim==null? null : Number(t.trim)); }
/* Dossier suggerit pel catàleg del grup de l'alumne/a. */
function qnDossierSuggerit(p){
  const alV=typeof neAlumno==="function"? neAlumno(p) : null;
  const k=alV&&alV.g? alV.g.catalogoKey||"" : "";
  if(/3ESO/i.test(k)) return "3eso";
  if(/2ESO/i.test(k)) return "2eso";
  return "";
}
function qnCatalogo(p){ const d=qnDossier(p); if(d) return d.catalogo; const alV=neAlumno(p); return alV&&alV.g? alV.g.catalogoKey : ""; }
function qnCritInfo(p,id){
  const key=qnCatalogo(p); let of=null;
  try{ of=key? catIndex(key).critMap[id] : null; }catch(e){}
  let adaptat="";
  const d=qnDossier(p); if(d) for(const T of d.temes){ const c=T.criteris.find(x=>x[0]===id); if(c){ adaptat=c[1]; break; } }
  return {id, ce:"CE"+String(id).split(".")[0], adaptat, oficial:of? of.texto : ""};
}
function qnCETitol(p,ce){
  const key=qnCatalogo(p);
  try{ const c=key? catIndex(key).ceMap[ce] : null; if(c) return c.titulo; }catch(e){}
  return (typeof NESE_CE_ESO_FQ!=="undefined" && NESE_CE_ESO_FQ[ce])||"";
}
function qnPlanActual(){ return (state.planesNESE||[]).find(x=>x.id===state.ui.neId); }
function qnTasca(p,id){ return p&&p.quadern? p.quadern.tasques.find(t=>t.id===id) : null; }

/* ---------- Crear / carregar ---------- */
function qnTasquesDelDossier(key){
  const d=QN_DOSSIERS[key]; if(!d) return [];
  const out=[];
  d.temes.forEach(T=>T.activitats.forEach((a,i)=>out.push({id:uid(),tema:T.n,num:i+1,titol:a.titol,nivell:a.nivell,criteris:a.criteris.slice(),propia:false,feta:false,data:"",assol:"",ajuda:false,nota:""})));
  return out;
}
window.qnCarregar=()=>{
  const p=qnPlanActual(); if(!p) return;
  const sel=document.getElementById("qnDossierSel"); const key=sel? sel.value : "";
  p.quadern={dossier:key, tasques:qnTasquesDelDossier(key), activitats:{}};
  save(); render();
  mostrarToast(key? `Carregades ${p.quadern.tasques.length} tasques del dossier de ${QN_DOSSIERS[key].curs}`:"Quadern creat: afig-hi les tasques","success");
};
window.qnEsborrarQuadern=async()=>{
  const p=qnPlanActual(); if(!p||!p.quadern) return;
  if(!await confirmar("Esborrar el seguiment del quadern d'este pla (tasques, dates, nivells i notes)? Les notes que hages passat al grup no s'esborren.")) return;
  delete p.quadern; save(); render();
};

/* ---------- Edició de tasques ---------- */
window.qnSetFeta=(id,v)=>{
  const p=qnPlanActual(), t=qnTasca(p,id); if(!t) return;
  t.feta=!!v; if(v && !t.data) t.data=agHoyStr();
  save(); render();
};
window.qnSet=(id,camp,v)=>{
  const p=qnPlanActual(), t=qnTasca(p,id); if(!t) return;
  if(camp==="ajuda") t.ajuda=!!v; else t[camp]=v;
  /* Valorar o datar una tasca vol dir que s'ha fet. */
  if((camp==="assol"&&v)||(camp==="data"&&v)){ if(!t.feta){ t.feta=true; if(!t.data) t.data=agHoyStr(); save(); render(); return; } }
  save();
  if(camp==="assol") render();
};
window.qnEliminarTasca=async id=>{
  const p=qnPlanActual(), t=qnTasca(p,id); if(!t) return;
  if(!await confirmar(`Eliminar la tasca «${t.titol}»?`)) return;
  p.quadern.tasques=p.quadern.tasques.filter(x=>x.id!==id); save(); render();
};
window.qnSetFiltre=(camp,v)=>{ state.ui["qn_"+camp]=v; save(); render(); };
window.qnObrirNova=v=>{ state.ui.qnNova=!!v; save(); render(); };
window.qnAfegirTasca=()=>{
  const p=qnPlanActual(); if(!p||!p.quadern) return;
  const titol=(document.getElementById("qnNTitol").value||"").trim();
  const tema=Number(document.getElementById("qnNTema").value)||0;
  const trimEl=document.getElementById("qnNTrim");
  const marcats=[...document.querySelectorAll("#qnNCrits input:checked")].map(x=>x.value);
  const altres=(document.getElementById("qnNAltres").value||"").split(/[\s,;]+/).map(s=>s.trim().replace(/^CE/i,"")).filter(Boolean);
  if(!titol){ mostrarAviso("Escriu què ha de fer l'alumne/a (el títol de la tasca)."); return; }
  const key=qnCatalogo(p); let critMap={};
  try{ critMap=key? catIndex(key).critMap : {}; }catch(e){}
  const dolents=altres.filter(c=>!/^\d+\.\d+$/.test(c) || (Object.keys(critMap).length && !critMap[c]));
  if(dolents.length){ mostrarAviso(`Estos codis de criteri no existixen en el currículum: ${dolents.join(", ")}. Escriu-los com 7.2 o 9.3.`); return; }
  const criteris=[...new Set([...marcats,...altres])];
  const t={id:uid(),tema,titol,nivell:"",criteris,propia:true,feta:false,data:"",assol:"",ajuda:false,nota:""};
  if(!tema) t.trim=trimEl? Number(trimEl.value)||0 : 0;
  p.quadern.tasques.push(t);
  state.ui.qnNova=false; save(); render();
  mostrarToast("Tasca afegida","success");
};
window.qnNovaTemaCanviat=()=>{
  const p=qnPlanActual(); const tema=Number(document.getElementById("qnNTema").value)||0;
  const T=qnTema(p,tema);
  document.getElementById("qnNCrits").innerHTML=qnCheckCritsHTML(T);
  const w=document.getElementById("qnNTrimWrap"); if(w) w.style.display=tema?"none":"";
};
function qnCheckCritsHTML(T){
  if(!T) return '<span class="sub" style="margin:0">Tria un tema per a marcar-ne els criteris, o escriu els codis a mà.</span>';
  return T.criteris.map(([id,tx])=>`<label style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;font-weight:400"><input type="checkbox" value="${esc(id)}"> <span><strong>${esc(id)}</strong> ${esc(tx)}</span></label>`).join("");
}

/* ---------- Càlculs de progrés ---------- */
/* Agrupa per criteri i per CE les tasques (opcionalment d'unes avaluacions). */
function qnProgres(p,trims){
  const tasques=(p.quadern?p.quadern.tasques:[]).filter(t=>{ if(!trims) return true; const tr=qnTrimTasca(p,t); return tr==null || trims.includes(tr); });
  const crit={};
  tasques.forEach(t=>(t.criteris||[]).forEach(c=>{
    const x=crit[c]||(crit[c]={id:c,ce:"CE"+String(c).split(".")[0],total:0,fetes:0,suma:0,valorades:0,ajuda:0});
    x.total++; if(t.feta) x.fetes++;
    const n=qnNivell(t.assol); if(t.feta&&n){ x.suma+=n.v; x.valorades++; if(t.ajuda) x.ajuda++; }
  }));
  const ces={};
  Object.values(crit).forEach(c=>{
    c.mitjana=c.valorades? c.suma/c.valorades : null;
    const e=ces[c.ce]||(ces[c.ce]={id:c.ce,criteris:[],total:0,fetes:0,suma:0,valorades:0});
    e.criteris.push(c); e.total+=c.total; e.fetes+=c.fetes;
    if(c.mitjana!=null){ e.suma+=c.mitjana; e.valorades++; }
  });
  const ordre=(a,b)=>{ const [a1,a2]=String(a).replace("CE","").split(".").map(Number), [b1,b2]=String(b).replace("CE","").split(".").map(Number); return a1-b1||(a2||0)-(b2||0); };
  const llista=Object.values(ces).map(e=>({...e, mitjana:e.valorades? e.suma/e.valorades : null, criteris:e.criteris.sort((a,b)=>ordre(a.id,b.id))})).sort((a,b)=>ordre(a.id,b.id));
  return {tasques, fetes:tasques.filter(t=>t.feta).length, ces:llista, crit};
}
/* Resum curt per a la fitxa i la llista NESE. */
function qnResumCurt(p){
  if(!p||!p.quadern||!p.quadern.tasques.length) return "";
  const ts=p.quadern.tasques, f=ts.filter(t=>t.feta);
  const ult=f.map(t=>t.data).filter(Boolean).sort().pop();
  return `📒 ${f.length}/${ts.length} tasques${ult?" · últim "+fmt2(ult):""}`;
}

/* ---------- Interfície ---------- */
function qnSeccioHTML(p){
  if(!p || p.tipo==="altas") return "";
  if(!p.quadern){
    const sug=qnDossierSuggerit(p);
    return `<div class="card" id="qnQuadern">
      <h2 style="font-size:15px">📒 Quadern de reforç (dossier de treball)</h2>
      <p class="sub" style="margin:2px 0 10px">Porta el compte de quines tasques del dossier ha fet l'alumne/a, quan i com les ha fetes. Cada tasca està lligada als criteris d'avaluació i a les competències específiques, i el progrés es veu per competència.</p>
      <div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center">
        <select class="in" id="qnDossierSel">
          ${Object.entries(QN_DOSSIERS).map(([k,d])=>`<option value="${k}" ${k===sug?"selected":""}>Dossier NESE de FiQ ${esc(d.curs)} (${d.temes.reduce((s,T)=>s+T.activitats.length,0)} tasques)</option>`).join("")}
          <option value="" ${sug?"":"selected"}>Sense dossier: només tasques pròpies</option>
        </select>
        <button class="btn" onclick="qnCarregar()">Començar el seguiment</button>
      </div>
      <p class="sub" style="margin:8px 0 0;font-size:12px">Pots triar el dossier d'un curs inferior si l'alumne/a treballa amb un nivell de referència més baix. Després pots afegir-hi tasques pròpies.</p>
    </div>`;
  }
  const d=qnDossier(p);
  const fTema=state.ui.qn_tema||"", fPend=!!state.ui.qn_pend;
  const temes=d? d.temes.slice() : [];
  const ordreTemes=[...temes.map(T=>({n:T.n,tit:`Tema ${T.n}. ${T.titol}`,trim:T.trim})).sort((a,b)=>a.trim-b.trim||a.n-b.n)];
  if(p.quadern.tasques.some(t=>!t.tema) || !temes.length) ordreTemes.push({n:0,tit:"Altres tasques",trim:null});
  const pr=qnProgres(p,null);
  const total=pr.tasques.length, fetes=pr.fetes;
  const pct=total? Math.round(100*fetes/total) : 0;
  const filaTasca=t=>{
    const n=qnNivell(t.assol);
    const crits=(t.criteris||[]).map(c=>{ const ci=qnCritInfo(p,c); return `<span class="chip" style="font-size:11px;padding:1px 7px;cursor:help" title="${esc(ci.ce+" · criteri "+c+(ci.adaptat?"\nAdaptat: "+ci.adaptat:"")+(ci.oficial?"\nOficial: "+ci.oficial:""))}">${esc(c)}</span>`; }).join(" ");
    return `<tr style="${t.feta?"":"opacity:.92"}">
      <td style="text-align:center"><input type="checkbox" aria-label="Feta" ${t.feta?"checked":""} onchange="qnSetFeta('${t.id}',this.checked)"></td>
      <td style="min-width:200px">
        <div style="font-size:13px;font-weight:600">${t.num?`<span style="color:var(--mut);font-weight:500">${t.num}.</span> `:""}${t.nivell?`<span title="${esc(t.nivell)}" style="color:#b45309">${QN_ESTRELLES[t.nivell]||""}</span> `:""}${esc(t.titol)}${t.propia?' <span class="badge" style="font-size:10.5px">pròpia</span>':""}</div>
        <div style="margin-top:3px">${crits||'<span class="sub" style="margin:0;font-size:11.5px">sense criteris</span>'}</div>
      </td>
      <td><input class="in" type="date" style="padding:3px 6px;font-size:12.5px;max-width:140px" value="${esc(t.data||"")}" onchange="qnSet('${t.id}','data',this.value)" aria-label="Data"></td>
      <td><select class="in" style="padding:3px 6px;font-size:12.5px;${n?`background:${n.bg};color:${n.fg};font-weight:700`:""}" onchange="qnSet('${t.id}','assol',this.value)" aria-label="Com l'ha feta">
        <option value="">—</option>${QN_NIVELLS.map(x=>`<option value="${x.id}" ${t.assol===x.id?"selected":""} title="${esc(x.label)}">${x.id}</option>`).join("")}
      </select></td>
      <td style="text-align:center"><input type="checkbox" aria-label="Amb ajuda" title="Ha necessitat ajuda" ${t.ajuda?"checked":""} onchange="qnSet('${t.id}','ajuda',this.checked)"></td>
      <td><input class="in" style="padding:3px 6px;font-size:12.5px;min-width:150px;width:100%" placeholder="Com ho ha fet…" value="${esc(t.nota||"")}" onchange="qnSet('${t.id}','nota',this.value)" aria-label="Nota"></td>
      <td>${t.propia?`<button class="ghost small danger" title="Eliminar la tasca" onclick="qnEliminarTasca('${t.id}')">×</button>`:""}</td>
    </tr>`;
  };
  const blocs=ordreTemes.filter(x=>!fTema || String(x.n)===String(fTema)).map(x=>{
    let ts=p.quadern.tasques.filter(t=>(t.tema||0)===x.n);
    const f=ts.filter(t=>t.feta).length, tot=ts.length;
    if(fPend) ts=ts.filter(t=>!t.feta);
    if(!tot && x.n!==0) return "";
    const obert=fTema || (f>0 && f<tot) || state.ui.qn_obert===String(x.n);
    return `<details ${obert?"open":""} style="border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-top:8px">
      <summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-weight:700;font-size:13.5px">${esc(x.tit)}${x.trim!=null?` <span class="sub" style="font-weight:400;margin:0">· ${esc(TRIMESTRES[x.trim]||"")}</span>`:""}</span>
        <span class="pill" style="${f===tot&&tot?"background:#dcfce7;color:#166534":f?"background:#fef3c7;color:#92400e":"background:var(--line);color:var(--mut)"}">${f}/${tot} fetes</span>
      </summary>
      ${ts.length?`<div style="overflow-x:auto;margin-top:6px"><table>
        <thead><tr><th title="Feta">Feta</th><th>Tasca i criteris</th><th>Data</th><th title="AE / AN / AS / NA">Com</th><th title="Ha necessitat ajuda">Ajuda</th><th>Nota</th><th></th></tr></thead>
        <tbody>${ts.map(filaTasca).join("")}</tbody>
      </table></div>`:`<p class="sub" style="margin:6px 0">${tot?"Totes fetes.":"Encara no hi ha tasques."}</p>`}
    </details>`;
  }).join("");
  const formNova=state.ui.qnNova? `<div style="border:1px dashed var(--line);border-radius:10px;padding:10px 12px;margin-top:10px;display:grid;gap:8px">
      <div style="font-weight:700;font-size:13.5px">Nova tasca</div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Què ha de fer
        <input class="in" id="qnNTitol" style="width:100%;margin-top:4px" placeholder="P. ex. Fitxa de repàs de canvis d'unitats">
      </label>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        <label style="font-size:12.5px;color:var(--mut);font-weight:500">Tema
          <select class="in" id="qnNTema" style="margin-top:4px" onchange="qnNovaTemaCanviat()">
            ${temes.map(T=>`<option value="${T.n}" ${String(fTema)===String(T.n)?"selected":""}>Tema ${T.n}. ${esc(T.titol)}</option>`).join("")}
            <option value="0" ${!temes.length||String(fTema)==="0"?"selected":""}>Altres tasques</option>
          </select>
        </label>
        <label id="qnNTrimWrap" style="font-size:12.5px;color:var(--mut);font-weight:500;${temes.length&&String(fTema)!=="0"?"display:none":""}">Avaluació
          <select class="in" id="qnNTrim" style="margin-top:4px">${TRIMESTRES.map((x,i)=>`<option value="${i}" ${state.ui.trim===i?"selected":""}>${esc(x)}</option>`).join("")}</select>
        </label>
      </div>
      <div style="font-size:12.5px;color:var(--mut);font-weight:500">Criteris que treballa</div>
      <div id="qnNCrits" style="display:grid;gap:4px">${qnCheckCritsHTML(qnTema(p,Number(fTema)||(temes[0]&&temes[0].n)))}</div>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Altres criteris (codis separats per comes)
        <input class="in" id="qnNAltres" style="width:100%;margin-top:4px" placeholder="P. ex. 7.2, 2.4">
      </label>
      <div class="flex" style="justify-content:flex-end;gap:8px"><button class="ghost" onclick="qnObrirNova(false)">Cancel·lar</button><button class="btn" onclick="qnAfegirTasca()">Afegir</button></div>
    </div>` : "";
  return `<div class="card" id="qnQuadern">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h2 style="font-size:15px;margin:0">📒 Quadern de reforç${d?` · dossier de ${esc(d.curs)}`:""}</h2>
        <p class="sub" style="margin:2px 0 0">Marca les tasques fetes i com les ha fetes: <strong>AE</strong> excel·lent · <strong>AN</strong> notable · <strong>AS</strong> suficient · <strong>NA</strong> no assolit. Passa el ratolí pels codis per a veure el criteri.</p>
      </div>
      <div style="min-width:170px">
        <div style="font-size:13px;font-weight:700">${fetes} de ${total} tasques fetes</div>
        <div style="height:8px;border-radius:6px;background:var(--line);margin-top:4px;overflow:hidden" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="height:100%;width:${pct}%;background:#16a34a"></div></div>
      </div>
    </div>
    <div class="flex" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">
      <select class="in" onchange="qnSetFiltre('tema',this.value)" aria-label="Tema">
        <option value="">Tots els temes</option>
        ${ordreTemes.map(x=>`<option value="${x.n}" ${String(fTema)===String(x.n)?"selected":""}>${esc(x.tit)}</option>`).join("")}
      </select>
      <label style="font-size:13px;display:flex;gap:6px;align-items:center"><input type="checkbox" ${fPend?"checked":""} onchange="qnSetFiltre('pend',this.checked)"> Només les pendents</label>
      <span style="flex:1"></span>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="qnObrirNova(true)">+ Tasca pròpia</button>
      <button class="ghost small danger" onclick="qnEsborrarQuadern()" title="Tornar a començar el seguiment">Esborrar</button>
    </div>
    ${formNova}
    ${blocs}
  </div>
  ${qnProgresHTML(p)}`;
}

function qnProgresHTML(p){
  const fT=state.ui.qn_progTrim==null? "" : String(state.ui.qn_progTrim);
  const trims=fT===""? null : [0,1,2].filter(i=>i<=Number(fT));
  const pr=qnProgres(p,trims);
  const alV=neAlumno(p);
  const barra=(f,t)=>{ const pc=t? Math.round(100*f/t) : 0; return `<div style="display:flex;gap:6px;align-items:center"><div style="flex:1;min-width:60px;height:7px;border-radius:5px;background:var(--line);overflow:hidden"><div style="height:100%;width:${pc}%;background:#2563eb"></div></div><span style="font-size:12px;color:var(--mut);white-space:nowrap">${f}/${t}</span></div>`; };
  const files=pr.ces.map(e=>{
    const nE=qnNivellDeMitjana(e.mitjana);
    return `<tr style="background:var(--bg2,rgba(0,0,0,.025))">
        <td style="font-weight:700;white-space:nowrap">${esc(e.id)}</td>
        <td style="font-size:12.5px;font-weight:600">${esc(qnCETitol(p,e.id))}</td>
        <td style="min-width:120px">${barra(e.fetes,e.total)}</td>
        <td style="text-align:center">${qnPill(nE,nE?`${nE.label} (mitjana dels criteris valorats)`:"")}</td>
      </tr>
      ${e.criteris.map(c=>{ const ci=qnCritInfo(p,c.id), n=qnNivellDeMitjana(c.mitjana); return `<tr>
        <td style="padding-left:18px;font-size:12.5px;white-space:nowrap">${esc(c.id)}</td>
        <td style="font-size:12px" title="${esc(ci.oficial?"Oficial: "+ci.oficial:"")}">${esc(ci.adaptat||ci.oficial||"")}${c.ajuda?` <span class="sub" style="margin:0;font-size:11px">· ${c.ajuda} amb ajuda</span>`:""}</td>
        <td>${barra(c.fetes,c.total)}</td>
        <td style="text-align:center">${qnPill(n, n? `${n.label} · ${c.valorades} tasca${c.valorades===1?"":"s"} valorada${c.valorades===1?"":"s"}`:"")}</td>
      </tr>`; }).join("")}`;
  }).join("");
  const potPassar=alV && p.quadern && (!qnDossier(p) || alV.g.catalogoKey===qnDossier(p).catalogo);
  const trimAccio=fT===""? (state.ui.trim||0) : Number(fT);
  return `<div class="card" id="qnProgres">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h2 style="font-size:15px;margin:0">🎯 Progrés del quadern per competència i criteri</h2>
      <select class="in" onchange="qnSetFiltre('progTrim',this.value)" aria-label="Fins a l'avaluació">
        <option value="" ${fT===""?"selected":""}>Tot el curs</option>
        ${TRIMESTRES.map((x,i)=>`<option value="${i}" ${fT===String(i)?"selected":""}>Fins a la ${esc(x)}</option>`).join("")}
      </select>
    </div>
    <p class="sub" style="margin:4px 0 8px">Barra = tasques fetes de les que treballen eixa competència o criteri. Nivell = mitjana de com ha fet les tasques valorades.</p>
    ${pr.ces.length?`<div style="overflow-x:auto"><table>
      <thead><tr><th>Codi</th><th>Competència / criteri</th><th>Tasques</th><th>Nivell</th></tr></thead>
      <tbody>${files}</tbody></table></div>`:'<p class="sub" style="margin:0">Encara no hi ha tasques amb criteris.</p>'}
    <div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:12px">
      ${(p.filas||[]).length?`<button class="ghost small" style="border:1px solid var(--line)" onclick="qnProposarIPA(${trimAccio})" title="Omple les caselles buides de la ${esc(TRIMESTRES[trimAccio])} del seguiment curricular (I/P/A) amb el nivell de cada competència al quadern">↓ Proposar I/P/A de la ${esc(TRIMESTRES[trimAccio])}</button>`:""}
      ${potPassar?`<button class="ghost small" style="border:1px solid var(--line)" onclick="qnPassarAlGrup(${trimAccio})" title="Crea o actualitza, al grup ${esc(alV.g.nombre)}, una activitat per tema només per a este alumne/a amb la nota de cada criteri">📤 Passar a les notes del grup (${esc(TRIMESTRES[trimAccio])})</button>`
        : (alV&&qnDossier(p)?`<span class="sub" style="margin:0;font-size:12px">El dossier és d'un altre curs que el grup: els criteris no coincidixen, així que no es passen a les notes del grup.</span>`:"")}
    </div>
  </div>`;
}

/* ---------- Enllaç amb el seguiment curricular (I/P/A) ---------- */
window.qnProposarIPA=async trim=>{
  const p=qnPlanActual(); if(!p) return;
  const pr=qnProgres(p,[0,1,2].filter(i=>i<=trim));
  const perCE={}; pr.ces.forEach(e=>{ if(e.mitjana!=null) perCE[e.id]=e.mitjana; });
  const camp="v"+(trim+1); let n=0;
  (p.filas||[]).forEach(f=>{
    if(f[camp] || perCE[f.ce]==null) return;
    const m=perCE[f.ce]; f[camp]= m>=2.75? "A" : m>=1.75? "P" : "I"; n++;
  });
  save(); render();
  mostrarToast(n? `${n} casella${n===1?"":"es"} de la ${TRIMESTRES[trim]} omplida${n===1?"":"es"} (revisa-les)` : "No hi havia cap casella buida amb dades del quadern", n?"success":"info");
};

/* ---------- Enllaç amb les notes del grup ---------- */
window.qnPassarAlGrup=async trim=>{
  const p=qnPlanActual(); if(!p||!p.quadern) return;
  const alV=neAlumno(p); if(!alV) return;
  const g=alV.g, al=alV.al;
  let critMap={}; try{ critMap=catIndex(g.catalogoKey).critMap; }catch(e){}
  /* Tasques fetes i valorades de l'avaluació, agrupades per tema. */
  const perTema={};
  p.quadern.tasques.forEach(t=>{
    if(!t.feta || !qnNivell(t.assol) || qnTrimTasca(p,t)!==trim) return;
    (perTema[t.tema||0]=perTema[t.tema||0]||[]).push(t);
  });
  const temes=Object.keys(perTema);
  if(!temes.length){ mostrarAviso(`No hi ha cap tasca feta i valorada de la ${TRIMESTRES[trim]}.`); return; }
  const blocQ=(g.bloques||[]).find(b=>/quadern|dossier|llibreta|cuaderno/i.test(b.label||"")) || (g.bloques||[])[0];
  if(!await confirmar(`Es crearà o actualitzarà al grup ${g.nombre} una activitat per tema (${temes.length}) a la ${TRIMESTRES[trim]}${blocQ?`, dins del bloc «${blocQ.label}»`:""}, NOMÉS per a ${al.nombre}: la resta d'alumnes hi queda com a exempt. La nota de cada criteri és la mitjana de les tasques (AE 10 · AN 7,5 · AS 5 · NA 2,5). Continuar?`)) return;
  p.quadern.activitats=p.quadern.activitats||{};
  g.notas=g.notas||{}; g.marcas=g.marcas||{}; g.notasCuant=g.notasCuant||{};
  let creades=0, actualitzades=0, saltats=new Set();
  temes.forEach(k=>{
    const ts=perTema[k], T=qnTema(p,Number(k));
    const per={}; ts.forEach(t=>(t.criteris||[]).forEach(c=>{ if(Object.keys(critMap).length && !critMap[c]){ saltats.add(c); return; } (per[c]=per[c]||[]).push(qnNivell(t.assol).nota); }));
    const crits=Object.keys(per); if(!crits.length) return;
    const clau=trim+"|"+k;
    let a=g.actividades.find(x=>x.id===p.quadern.activitats[clau]);
    const nom=`Quadern NESE · ${T?`T${T.n} ${T.titol}`:"Altres tasques"} · ${al.nombre}`;
    if(!a){
      a={id:uid(),trimestre:trim,nombre:nom,tipo:"Quadern / llibreta",bloqueId:blocQ?blocQ.id:"",esExamen:false,pesoBloque:"",criterios:[],sda:"",temaId:"",quadernNese:p.id};
      g.actividades.push(a); p.quadern.activitats[clau]=a.id; creades++;
    }else{ a.nombre=nom; actualitzades++; }
    a.criterios=crits.map(c=>({critId:c,peso:1}));
    const notes={}; crits.forEach(c=>{ const v=per[c]; notes[c]=Math.round(100*v.reduce((s,x)=>s+x,0)/v.length)/100; });
    g.notas[al.id]=g.notas[al.id]||{}; g.notas[al.id][a.id]=notes;
    if(g.marcas[al.id]) delete g.marcas[al.id][a.id];
    g.alumnos.forEach(x=>{ if(x.id===al.id) return; g.marcas[x.id]=g.marcas[x.id]||{}; g.marcas[x.id][a.id]="EX"; if(g.notas[x.id]) delete g.notas[x.id][a.id]; });
  });
  save(); render();
  mostrarToast(`${creades} activitat${creades===1?"":"s"} creada${creades===1?"":"es"}, ${actualitzades} actualitzada${actualitzades===1?"":"es"} al grup${saltats.size?` (criteris que el grup no té: ${[...saltats].join(", ")})`:""}`,"success");
};

/* ---------- Informe ---------- */
function qnInformeHTML(p,alcance){
  if(!p||!p.quadern||!p.quadern.tasques.length) return "";
  const trims=alcance==="final"? null : [0,1,2].filter(i=>i<=Number(alcance)-1);
  const pr=qnProgres(p,trims);
  const nomesTrim=alcance==="final"? null : Number(alcance)-1;
  const fetes=p.quadern.tasques.filter(t=>t.feta && (nomesTrim==null || qnTrimTasca(p,t)===nomesTrim));
  const ces=pr.ces.map(e=>{ const n=qnNivellDeMitjana(e.mitjana); return `<tr><td>${esc(e.id)}</td><td>${esc(qnCETitol(p,e.id))}</td><td style="text-align:center">${e.fetes}/${e.total}</td><td style="text-align:center;font-weight:700">${n?n.id:"—"}</td></tr>`; }).join("");
  const llista=fetes.sort((a,b)=>String(a.data).localeCompare(String(b.data))).map(t=>{ const T=t.tema? qnTema(p,t.tema):null; return `<tr><td>${t.data?fmt2(t.data):"—"}</td><td>${T?`T${T.n} · `:""}${esc(t.titol)}</td><td>${esc((t.criteris||[]).join(", "))}</td><td style="text-align:center;font-weight:700">${t.assol||"—"}${t.ajuda?" *":""}</td><td style="font-size:12px">${esc(t.nota||"")}</td></tr>`; }).join("");
  return `<h2>Quadern de reforç</h2>
    <p style="font-size:13px;color:#666">${pr.fetes} de ${pr.tasques.length} tasques fetes${alcance==="final"?" en tot el curs":" fins a esta avaluació"}. Nivells: AE excel·lent · AN notable · AS suficient · NA no assolit. * = amb ajuda.</p>
    ${ces?`<table><thead><tr><th style="width:60px">CE</th><th>Competència específica</th><th>Tasques fetes</th><th>Nivell</th></tr></thead><tbody>${ces}</tbody></table>`:""}
    ${llista?`<h2>Tasques fetes${nomesTrim==null?"":" en la "+esc(TRIMESTRES[nomesTrim])}</h2><table><thead><tr><th style="width:80px">Data</th><th>Tasca</th><th>Criteris</th><th>Nivell</th><th>Nota</th></tr></thead><tbody>${llista}</tbody></table>`:""}`;
}
