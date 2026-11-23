/* ============================================================================
   Quadern d'avaluació · Recuperacions
   js/informes/recuperacions.js

   Resultats → 🖨️ Informes → «🔁 Recuperacions»: per a l'avaluació triada (o la
   final), un sol document amb
     1) la llista de l'alumnat que ha de recuperar i què ha de recuperar
        (temes i blocs per davall de 5; en la final, les avaluacions suspeses);
     2) una carta per a cada família, amb el mateix detall, la data de la
        recuperació (si s'escriu en demanar-lo) i espai per a la signatura.
   Es calcula amb les mateixes funcions que la resta de l'app. No guarda res.
   ============================================================================ */
function recQueRecuperar(g,al,trim){
  const out={temes:[],blocs:[],avaluacions:[]};
  if(trim==="final"){
    [0,1,2].forEach(t=>{ let v=null; try{ v=notaTrimestre(g,al.id,t); }catch(e){} if(v!=null && !esAprobado(v,g)) out.avaluacions.push({nom:TRIMESTRES[t],v}); });
    return out;
  }
  if(typeof _iaTemesPeriode==="function") _iaTemesPeriode(g,trim).forEach(s=>{
    let v=null; try{ v=notaTemaAlumne(g,al.id,s.id); }catch(e){}
    if(v!=null && v<5) out.temes.push({nom:temaNomCurt(s),v});
  });
  if(modoNotaGrupo(g)!=="ce") (g.bloques||[]).filter(b=>!b.inactiu && (Number(b.peso)||0)>0).forEach(b=>{
    let v=null; try{ v=notaBloque(g,al.id,b.id,trim); }catch(e){}
    if(v!=null && v<5) out.blocs.push({nom:b.label||"Bloc",v});
  });
  return out;
}
function recAlumnat(g,trim){
  return g.alumnos.map(al=>{
    let v=null; try{ v=trim==="final"? notaFinal(g,al.id) : notaTrimestre(g,al.id,trim); }catch(e){}
    return {al,v,q:recQueRecuperar(g,al,trim)};
  }).filter(x=>x.v!=null && !esAprobado(x.v,g));
}
function recLlistaQueHTML(x){
  const p=[];
  if(x.q.avaluacions.length) p.push("Avaluacions: "+x.q.avaluacions.map(a=>`${a.nom} (${fmt(a.v)})`).join(", "));
  if(x.q.temes.length) p.push("Temes: "+x.q.temes.map(a=>`${a.nom.replace(/^Tema\s*(\d+)\.?-?\s*/i,"T$1 ")} (${fmt(a.v)})`).join(", "));
  if(x.q.blocs.length) p.push("Blocs: "+x.q.blocs.map(a=>`${a.nom} (${fmt(a.v)})`).join(", "));
  return p.length? p.map(esc).join("<br>") : "Tota l'avaluació";
}
function recCartaHTML(g,x,trim,data){
  const per=trim==="final"? "el curs" : `la ${TRIMESTRES[trim]}`;
  const cat=getCatalogo(g.catalogoKey);
  const files=[
    ...x.q.avaluacions.map(a=>["Avaluació",a.nom,a.v]),
    ...x.q.temes.map(a=>["Tema",a.nom,a.v]),
    ...x.q.blocs.map(a=>["Bloc",a.nom,a.v])
  ];
  return `<div class="ia ia-full">
    ${_iaCap(g,"Comunicació de recuperació",trim)}
    <p style="font-size:13px;margin:10px 0 6px">Benvolguda família:</p>
    <p style="font-size:13px;line-height:1.5;margin:0 0 8px">Vos comunique que <strong>${esc(x.al.nombre)}</strong> no ha superat ${esc(per)} de <strong>${esc(cat?cat.materia:"la matèria")}</strong>${x.v!=null?` (nota: <strong>${esc(_iaActaTxt(g,x.v))}</strong>)`:""}. Per a recuperar-la ha de preparar i superar el que s'indica a continuació.</p>
    <h2>Què ha de recuperar</h2>
    ${files.length?`<table><thead><tr><th style="width:90px"></th><th></th><th style="width:70px;text-align:right">Nota</th></tr></thead><tbody>${files.map(f=>`<tr><td>${esc(f[0])}</td><td>${esc(f[1])}</td><td style="text-align:right"><strong style="color:#912525">${fmt(f[2])}</strong></td></tr>`).join("")}</tbody></table>`
      :`<p style="font-size:12.5px;margin:0">Tota l'avaluació.</p>`}
    <h2>Recuperació</h2>
    <table><tbody>
      <tr><th style="width:42%">Data, hora i lloc</th><td>${data?esc(data):""}</td></tr>
      <tr><th>Com preparar-la</th><td>Repassar la teoria i els exercicis de cada tema, fer el dossier o la fitxa de repàs que li done el professor/a i preguntar els dubtes a classe.</td></tr>
    </tbody></table>
    <p style="font-size:12.5px;margin:10px 0 0">Per a qualsevol dubte, podeu posar-vos en contacte amb mi a través del centre.</p>
    <div class="firmes"><div>Professor/a de la matèria</div><div>Assabentat/da: signatura de la família</div></div>
  </div>`;
}
function recDocumentHTML(g,trim,data){
  const l=recAlumnat(g,trim).sort((a,b)=>a.v-b.v);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  const llista=`<div class="ia ia-full">
    ${_iaCap(g,"Recuperacions",trim)}
    <p style="font-size:12.5px;margin:0 0 8px">${l.length} alumne${l.length===1?"":"s"} amb ${esc(per.toLowerCase())} suspesa${data?` · Recuperació: <strong>${esc(data)}</strong>`:""}.</p>
    ${l.length?`<table><thead><tr><th>Alumne/a</th><th style="width:90px">Nota</th><th>Què ha de recuperar</th><th style="width:70px">Nota rec.</th></tr></thead><tbody>
      ${l.map(x=>`<tr><td>${esc(x.al.nombre)}</td><td>${esc(_iaActaTxt(g,x.v))}</td><td style="font-size:11.5px">${recLlistaQueHTML(x)}</td><td></td></tr>`).join("")}
    </tbody></table>`:`<p style="font-size:12.5px">Cap alumne/a ha de recuperar ${esc(per.toLowerCase())}.</p>`}
  </div>`;
  return llista+l.map(x=>recCartaHTML(g,x,trim,data)).join("");
}
window.exportarRecuperacions=(trim,data)=>{
  const g=grupoActual(); if(!g) return;
  if(!g.alumnos.length){ mostrarAviso("Este grup encara no té alumnat."); return; }
  if(trim==null||trim==="") trim=state.ui.trim;
  if(trim!=="final") trim=Number(trim);
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  abrirVentanaInforme(`Recuperacions · ${g.nombre} · ${per}`, _IA_CSS+recDocumentHTML(g,trim,data||""));
};
window.resRecuperacions=async()=>{
  const g=grupoActual(); if(!g) return;
  const per=await resTriarAvaluacionsInforme("🔁 Recuperacions"); if(!per) return;
  const data=await pedirTexto("Data, hora i lloc de la recuperació (opcional: si ho deixes en blanc, queda l'espai per a escriure-ho a mà).","");
  if(data===null) return;
  resInformePerAvaluacions(per,p=>exportarRecuperacions(p,String(data).trim()),`Recuperacions · ${g.nombre}`);
};

/* Pestanya Resultats → «Recuperacions»: la llista es veu dins de l'app (amb
   l'avaluació del selector de dalt, també «Final») i des d'ací s'imprimix la
   llista amb una carta per a cada família. */
function renderRecuperacionsTab(g){
  const c=document.getElementById("tabContent"); if(!c) return;
  const trim=state.ui.resInfFinal===true? "final" : Number(state.ui.trim)||0;
  const per=trim==="final"? "Avaluació final" : TRIMESTRES[trim];
  const l=g.alumnos.length? recAlumnat(g,trim).sort((a,b)=>a.v-b.v) : [];
  const recs=(g.actividades||[]).filter(a=>a.recupera && (trim==="final"||a.trimestre===trim));
  c.innerHTML=`<div class="card">
    <div class="flex" style="justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
      <h2 style="font-size:15px;margin:0">🔁 Recuperacions · ${esc(per)}</h2>
      <button class="btn" onclick="resRecuperacions()" ${l.length?"":"disabled"} title="Document amb la llista i una carta per a cada família (data de la recuperació opcional)">🖨️ Llista i cartes per a les famílies</button>
    </div>
    <p class="sub" style="margin:6px 0 10px">Alumnat amb ${esc(per.toLowerCase())} suspesa i què ha de recuperar${trim==="final"?" (les avaluacions suspeses)":" (temes i blocs per davall de 5)"}. L'avaluació es tria en el selector de dalt; «Final» mostra el curs complet.</p>
    ${!g.alumnos.length? `<p class="sub">Este grup encara no té alumnat.</p>`
      : !l.length? `<p style="font-size:14px">✓ Ningú no ha de recuperar ${esc(per.toLowerCase())}.</p>`
      : `<div class="scroll"><table><thead><tr><th>Alumne/a</th><th style="width:90px">Nota</th><th>Què ha de recuperar</th></tr></thead><tbody>
        ${l.map(x=>`<tr><td>${typeof nomFitxaHTML==="function"? nomFitxaHTML(x.al) : esc(x.al.nombre)}</td><td>${esc(fmt(x.v))}</td><td style="font-size:13px">${recLlistaQueHTML(x)}</td></tr>`).join("")}
      </tbody></table></div>`}
    ${recs.length?`<p class="sub" style="margin:12px 0 0">Activitats de recuperació d'este període: ${recs.map(a=>`<button class="ghost small" style="border:1px solid var(--line)" onclick="tnObrirQualificar('${escJS(a.id)}')">${esc(a.nombre)}</button>`).join(" ")}</p>`
      :`<p class="sub" style="margin:12px 0 0">Per a posar les notes de recuperació, crea-la des d'Avaluar → Activitats amb el botó «🔁 Crear recuperació» de l'examen.</p>`}
  </div>`;
}
