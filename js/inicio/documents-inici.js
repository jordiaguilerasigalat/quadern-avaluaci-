/* ============================================================================
   Quadern d'avaluació · Documents del departament (Inici → Organització)
   js/inicio/documents-inici.js

   Requadre amb pestanyes: Programacions, Propostes pedagògiques, Temporització
   i les que afija el professorat. Cada pestanya mostra els PDF del departament
   que li toquen i, a més, enllaços propis (Drive, web del centre…) que es
   guarden en state.documentsInici.
   ============================================================================ */
const DOCS_PESTANYES_FIXES=[
  {id:"prog",nom:"📘 Programacions"},
  {id:"pp",nom:"🧭 Propostes pedagògiques"},
  {id:"temp",nom:"🗓️ Temporització"}
];
function docsDades(){
  if(!state.documentsInici || typeof state.documentsInici!=="object") state.documentsInici={};
  const d=state.documentsInici;
  if(!d.enllacos || typeof d.enllacos!=="object") d.enllacos={};
  if(!Array.isArray(d.pestanyes)) d.pestanyes=[];
  return d;
}
function docsPestanyaActual(){
  const d=state.documentsInici||{};
  const id=state.ui.docsTab||"prog";
  const valides=[...DOCS_PESTANYES_FIXES.map(p=>p.id),...(d.pestanyes||[]).map(p=>p.id)];
  return valides.includes(id)? id : "prog";
}
function docsUrlValida(u){ return /^(https?:\/\/|docs\/)/i.test(String(u||"").trim()); }
function docsPdfChip(f,titol){
  return `<a class="chip" style="text-decoration:none" href="docs/programacions/${esc(f)}" target="_blank" rel="noopener">📄 ${esc(titol)}</a>`;
}
function docsProgDeCataleg(k){ return (state.programaciones||[]).filter(p=>p.catalogoKey===k); }
function docsContingutFix(id){
  const pdfs=typeof PROG_DOCUMENTS_PDF!=="undefined"? PROG_DOCUMENTS_PDF : [];
  const perCat=typeof PROG_PDF_PER_CATALEG!=="undefined"? PROG_PDF_PER_CATALEG : {};
  if(id==="prog"){
    const files=Object.keys(perCat).map(k=>{
      const pa=perCat[k][0], titol=(pdfs.find(x=>x[0]===pa)||[pa,pa])[1].replace(/^PA · /,"");
      const meues=docsProgDeCataleg(k);
      const accio= meues.length
        ? meues.map(p=>`<button class="ghost small" style="border:1px solid var(--line)" onclick="progAbrirDetalle('${escJS(p.id)}');irModo('programacion')">📘 Obrir «${esc(p.nombre)}»</button>`).join("")
        : (typeof PROG_DEPARTAMENTO!=="undefined" && PROG_DEPARTAMENTO[k] ? `<button class="ghost small" style="border:1px solid var(--line)" onclick="docsCarregarProg('${escJS(k)}')">📥 Crear la programació en el Quadern</button>` : "");
      return `<div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)">
        <div style="font-weight:600;font-size:13.5px">${esc(titol)}</div>
        <div class="flex" style="flex-wrap:wrap;gap:6px">${docsPdfChip(pa,"PDF original")}${accio}</div>
      </div>`;
    }).join("");
    return `<p class="sub" style="margin:0 0 4px">Programacions d'aula del departament 2026-2027 (PDF sense noms ni dades dels grups) i la seua versió editable dins del Quadern.</p>${files}`;
  }
  if(id==="pp"){
    const pps=pdfs.filter(x=>/^PP_/.test(x[0]));
    return `<p class="sub" style="margin:0 0 8px">Propostes pedagògiques del departament: criteris de qualificació, pesos dels instruments i mesures d'atenció a la diversitat.</p>
      <div class="flex" style="flex-wrap:wrap;gap:6px">${pps.map(([f,t])=>docsPdfChip(f,t)).join("")}</div>`;
  }
  if(id==="temp"){
    const progs=state.programaciones||[];
    const llista= progs.length
      ? progs.map(p=>`<div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)">
          <div style="font-weight:600;font-size:13.5px">${esc(p.nombre)}</div>
          <button class="ghost small" style="border:1px solid var(--line)" onclick="docsObrirTemporitzacio('${escJS(p.id)}')">🗓️ Obrir la planificació temporal</button>
        </div>`).join("")
      : `<p class="sub" style="margin:0">Encara no tens cap programació en el Quadern. Crea-la des de la pestanya «Programacions» i ací podràs obrir la seua planificació temporal (sessions de cada SdA repartides en el calendari del curs).</p>`;
    return `<p class="sub" style="margin:0 0 4px">Temporització de cada programació: quantes sessions té cada Situació d'Aprenentatge i en quines setmanes cau.</p>${llista}`;
  }
  return "";
}
function docsEnllacosHTML(id){
  const d=docsDades();
  const llista=d.enllacos[id]||[];
  return `<div style="margin-top:12px">
    ${llista.length?`<div class="flex" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${llista.map((e,i)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px">
        <a href="${esc(e.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">🔗 ${esc(e.titol)}</a>
        <button class="ghost small" style="padding:0 4px;border:0" title="Llevar este enllaç" aria-label="Llevar l'enllaç ${esc(e.titol)}" onclick="docsLlevarEnllac('${escJS(id)}',${i})">✕</button>
      </span>`).join("")}</div>`:""}
    <div class="flex" style="flex-wrap:wrap;gap:6px;align-items:center">
      <input class="in" id="docsTitol" style="flex:1;min-width:160px" placeholder="Nom del document" aria-label="Nom del document">
      <input class="in" id="docsUrl" style="flex:2;min-width:220px" placeholder="Enllaç (Drive, web del centre…)" aria-label="Enllaç del document">
      <button class="ghost" style="border:1px solid var(--line)" onclick="docsAfegirEnllac('${escJS(id)}')">+ Afegir enllaç</button>
    </div>
  </div>`;
}
function renderDocumentsIniciHTML(){
  const d=state.documentsInici||{};
  const actual=docsPestanyaActual();
  const propies=d.pestanyes||[];
  const propia=propies.find(p=>p.id===actual);
  const tabs=[...DOCS_PESTANYES_FIXES,...propies.map(p=>({id:p.id,nom:"📁 "+p.nom}))];
  return `<div class="card" style="margin-top:12px">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div><h2 style="font-size:15px;margin:0">📂 Documents del departament</h2>
      <p class="sub" style="margin:2px 0 0">Programacions, propostes pedagògiques, temporització i el que vulgues afegir.</p></div>
    </div>
    <div class="flex" style="flex-wrap:wrap;gap:6px;margin:10px 0 12px">
      ${tabs.map(t=>`<button class="tab ${t.id===actual?"on":""}" aria-pressed="${t.id===actual}" onclick="docsTriarPestanya('${escJS(t.id)}')">${esc(t.nom)}</button>`).join("")}
      <button class="ghost small" style="border:1px dashed var(--line)" onclick="docsNovaPestanya()">+ Nova pestanya</button>
    </div>
    ${propia?`<div class="flex" style="justify-content:flex-end;gap:6px;margin-bottom:6px">
        <button class="ghost small" style="border:1px solid var(--line)" onclick="docsReanomenarPestanya('${escJS(propia.id)}')">✏️ Canviar el nom</button>
        <button class="ghost small" style="border:1px solid var(--line)" onclick="docsEliminarPestanya('${escJS(propia.id)}')">🗑️ Eliminar la pestanya</button>
      </div>
      ${(d.enllacos&&d.enllacos[propia.id]||[]).length?"":`<p class="sub" style="margin:0">Pestanya buida. Afig enllaços a documents (Drive, OneDrive, web del centre…).</p>`}`
      : docsContingutFix(actual)}
    ${docsEnllacosHTML(actual)}
  </div>`;
}
window.docsTriarPestanya=(id)=>{ state.ui.docsTab=id; save(); render(); };
window.docsNovaPestanya=async ()=>{
  const nom=await pedirTexto("Nom de la nova pestanya (p. ex. Plans de centre, Actes de departament):","");
  if(nom==null || !String(nom).trim()) return;
  const d=docsDades();
  const p={id:uid(),nom:String(nom).trim().slice(0,60)};
  d.pestanyes.push(p); state.ui.docsTab=p.id; save(); render();
};
window.docsReanomenarPestanya=async (id)=>{
  const d=docsDades(); const p=d.pestanyes.find(x=>x.id===id); if(!p) return;
  const nom=await pedirTexto("Nou nom de la pestanya:",p.nom);
  if(nom==null || !String(nom).trim()) return;
  p.nom=String(nom).trim().slice(0,60); save(); render();
};
window.docsEliminarPestanya=async (id)=>{
  const d=docsDades(); const p=d.pestanyes.find(x=>x.id===id); if(!p) return;
  if(!await confirmar(`Eliminar la pestanya «${p.nom}» i els seus enllaços? Els documents enllaçats no s'esborren.`)) return;
  d.pestanyes=d.pestanyes.filter(x=>x.id!==id); delete d.enllacos[id];
  state.ui.docsTab="prog"; save(); render();
};
window.docsAfegirEnllac=(id)=>{
  const titol=(document.getElementById("docsTitol")?.value||"").trim();
  let url=(document.getElementById("docsUrl")?.value||"").trim();
  if(url && !/^[a-z]+:/i.test(url) && !/^docs\//i.test(url)) url="https://"+url;
  if(!docsUrlValida(url)){ mostrarAviso("Escriu un enllaç que comence per https:// (per exemple, l'enllaç de compartir de Drive)."); return; }
  const d=docsDades();
  (d.enllacos[id]=d.enllacos[id]||[]).push({titol:(titol||url).slice(0,120),url});
  save(); render();
};
window.docsLlevarEnllac=(id,i)=>{
  const d=docsDades(); const l=d.enllacos[id]||[];
  l.splice(i,1); save(); render();
};
window.docsObrirTemporitzacio=(progId)=>{
  state.ui.progDetTab="planificacion"; progAbrirDetalle(progId); irModo("programacion");
};
window.docsCarregarProg=async (k)=>{
  await progCargarDepartamento(k);
  irModo("programacion");
};
