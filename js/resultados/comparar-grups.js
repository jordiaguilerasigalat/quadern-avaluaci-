/* ============================================================================
   Quadern d'avaluació · Comparar grups del mateix nivell
   js/resultados/comparar-grups.js

   Resultats → 🖨️ Informes → «📊 Comparar grups»: els grups amb la mateixa
   matèria i curs (mateix catàleg, p. ex. 3r ESO A i 3r ESO B) costat per costat
   en l'avaluació triada (o la final): alumnes, mitjana, aprovats, distribució
   de notes, NP i mitjana de cada bloc i de cada tema. Per a la memòria i les
   reunions de departament. Es calcula amb les funcions de sempre; no guarda res.
   ============================================================================ */
function cgGrups(g){ return (state.grupos||[]).filter(x=>x.catalogoKey===g.catalogoKey && (x.alumnos||[]).length); }
function cgMitjana(a){ return a.length? a.reduce((x,y)=>x+y,0)/a.length : null; }
function cgDades(g,trim){
  const fin=trim==="final";
  const ns=g.alumnos.map(al=>{ try{ return fin? notaFinal(g,al.id) : notaTrimestre(g,al.id,trim); }catch(e){ return null; } }).filter(v=>v!=null);
  const ap=ns.filter(v=>esAprobado(v,g)).length;
  const dist={}; NIVCUANT.forEach(n=>dist[n.etq]=0);
  ns.forEach(v=>{ const e=etiquetaNota(v,g); if(e&&dist[e.etq]!=null) dist[e.etq]++; });
  const np=(g.actividades||[]).filter(a=>fin||a.trimestre===trim).reduce((s,a)=>s+g.alumnos.filter(al=>marcaDe(g,al.id,a.id)==="NP").length,0);
  const blocs={};
  (g.bloques||[]).filter(b=>!b.inactiu&&(Number(b.peso)||0)>0).forEach(b=>{
    const vs=g.alumnos.map(al=>{ try{ return fin? notaBloqueFinal(g,al.id,b.id) : notaBloque(g,al.id,b.id,trim); }catch(e){ return null; } }).filter(v=>v!=null);
    if(vs.length) blocs[(b.label||"Bloc").trim()]=cgMitjana(vs);
  });
  const temes={};
  if(typeof _iaTemesPeriode==="function") _iaTemesPeriode(g,trim).forEach(s=>{
    const vs=g.alumnos.map(al=>{ try{ return notaTemaAlumne(g,al.id,s.id); }catch(e){ return null; } }).filter(v=>v!=null);
    if(vs.length) temes[temaNomCurt(s)]=cgMitjana(vs);
  });
  return {g,n:g.alumnos.length,amb:ns.length,mitj:cgMitjana(ns),ap,dist,np,blocs,temes};
}
function cgCel(v,max){
  if(v==null) return `<td style="text-align:center;color:#888">—</td>`;
  const dest=max!=null && Math.abs(v-max)<0.005;
  return `<td style="text-align:center;${v<5?"color:#912525;":""}${dest?"font-weight:700;":""}">${fmt(v)}</td>`;
}
function cgDocumentHTML(g,trim){
  const ds=cgGrups(g).map(x=>cgDades(x,trim));
  const cat=getCatalogo(g.catalogoKey);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  const cap=`<tr><th></th>${ds.map(d=>`<th style="text-align:center">${esc(d.g.nombre)}</th>`).join("")}</tr>`;
  const fila=(nom,f)=>`<tr><th>${nom}</th>${ds.map(f).join("")}</tr>`;
  const filaMitj=(nom,vals)=>{ const max=Math.max(...vals.filter(v=>v!=null)); return `<tr><td>${esc(nom)}</td>${vals.map(v=>cgCel(v,isFinite(max)?max:null)).join("")}</tr>`; };
  const nomsB=[...new Set(ds.flatMap(d=>Object.keys(d.blocs)))];
  const nomsT=[...new Set(ds.flatMap(d=>Object.keys(d.temes)))];
  const pct=(a,b)=>b? Math.round(a/b*100)+" %" : "—";
  return `<div class="ia">
    <div class="ia-cap"><h1>Comparativa de grups</h1><p class="meta">${esc(state.centroNombre||"")}${state.centroNombre?"<br>":""}${esc(cat?cat.materia+" · "+cat.curso:"")}<br>${esc(per)} · ${esc(_iaData())}</p></div>
    <h2>Resultats generals</h2>
    <table><thead>${cap}</thead><tbody>
      ${fila("Alumnes",d=>`<td style="text-align:center">${d.n}</td>`)}
      ${fila("Amb nota",d=>`<td style="text-align:center">${d.amb}</td>`)}
      ${filaMitj("Nota mitjana",ds.map(d=>d.mitj)).replace("<td>Nota mitjana</td>","<th>Nota mitjana</th>")}
      ${fila("Aprovats",d=>`<td style="text-align:center">${d.ap} <span class="xicotet">(${pct(d.ap,d.amb)})</span></td>`)}
      ${fila("Suspesos",d=>`<td style="text-align:center">${d.amb-d.ap} <span class="xicotet">(${pct(d.amb-d.ap,d.amb)})</span></td>`)}
      ${NIVCUANT.map(n=>fila(`<span class="pill" style="background:${n.bg};color:${n.fg}">${esc(n.etq)}</span>`,d=>`<td style="text-align:center">${d.dist[n.etq]||0}</td>`)).join("")}
      ${fila("NP (activitats no presentades)",d=>`<td style="text-align:center">${d.np}</td>`)}
    </tbody></table>
    ${nomsB.length?`<h2>Mitjana per bloc</h2><table><thead>${cap}</thead><tbody>${nomsB.map(b=>filaMitj(b,ds.map(d=>d.blocs[b]??null))).join("")}</tbody></table>`:""}
    ${nomsT.length?`<h2>Mitjana per tema</h2><table><thead>${cap}</thead><tbody>${nomsT.map(t=>filaMitj(t,ds.map(d=>d.temes[t]??null))).join("")}</tbody></table>`:""}
    <p class="xicotet" style="margin-top:8px">En negreta, la mitjana més alta de cada fila; en roig, les mitjanes per davall de 5. Un bloc o tema en blanc vol dir que eixe grup no hi té notes.</p>
  </div>`;
}
window.exportarComparativaGrups=trim=>{
  const g=grupoActual(); if(!g) return;
  if(trim==null||trim==="") trim=state.ui.trim;
  if(trim!=="final") trim=Number(trim);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  const cat=getCatalogo(g.catalogoKey);
  abrirVentanaInforme(`Comparativa de grups · ${cat?cat.materia+" · "+cat.curso:g.nombre} · ${per}`, _IA_CSS+cgDocumentHTML(g,trim));
};
window.resCompararGrups=async()=>{
  const g=grupoActual(); if(!g) return;
  const gs=cgGrups(g);
  if(gs.length<2){
    const cat=getCatalogo(g.catalogoKey);
    mostrarAviso(`Per a comparar fan falta almenys dos grups de ${cat?cat.materia+" · "+cat.curso:"la mateixa matèria i curs"} amb alumnat. Ara només tens «${g.nombre}».`);
    return;
  }
  const per=await resTriarAvaluacionsInforme(`📊 Comparar grups (${gs.map(x=>x.nombre).join(", ")})`); if(!per) return;
  resInformePerAvaluacions(per,p=>exportarComparativaGrups(p),"Comparativa de grups");
};

/* Pestanya Resultats → «Comparar grups»: la comparativa es veu dins de l'app
   (avaluació del selector de dalt, també «Final») i es pot imprimir. */
function renderCompararTab(g){
  const c=document.getElementById("tabContent"); if(!c) return;
  const trim=state.ui.resInfFinal===true? "final" : Number(state.ui.trim)||0;
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  const gs=cgGrups(g), cat=getCatalogo(g.catalogoKey);
  const nivell=cat? cat.materia+" · "+cat.curso : "la mateixa matèria i curs";
  c.innerHTML=`<div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
      <h2 style="font-size:15px;margin:0">📊 Comparar grups · ${esc(per)}</h2>
      ${gs.length>1?`<button class="btn" onclick="resCompararGrups()">🖨️ Imprimir la comparativa</button>`:""}
    </div>
    <p class="sub" style="margin:6px 0 10px">Els grups de ${esc(nivell)} costat per costat: mitjana, aprovats, distribució de notes, NP i mitjana de cada bloc i tema. L'avaluació es tria en el selector de dalt.</p>
    ${gs.length<2? `<p style="font-size:14px">Per a comparar fan falta almenys dos grups de ${esc(nivell)} amb alumnat. Ara només tens «${esc(g.nombre)}».</p>` : `<div id="cgVista" style="overflow-x:auto"></div>`}
  </div>`;
  const host=document.getElementById("cgVista"); if(!host) return;
  const sh=host.attachShadow({mode:"open"});
  sh.innerHTML=`<style>:host{display:block}.doc{background:#fff;color:#222;font-family:system-ui,sans-serif;font-size:13px;padding:14px;border-radius:8px}
    table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:6px}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #ddd}th{color:#555}
    h1{font-size:16px;margin:0}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.meta{color:#666;font-size:12px;margin:0}</style>
    ${_IA_CSS}<div class="doc">${cgDocumentHTML(g,trim)}</div>`;
}
