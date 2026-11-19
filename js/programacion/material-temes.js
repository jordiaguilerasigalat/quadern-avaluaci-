/* ============================================================================
   Quadern d'avaluació · Material de cada tema (exàmens, presentacions, apunts…)
   js/programacion/material-temes.js

   El material està en docs/material/<clau catàleg>/ i cada curs té el seu índex
   en js/datos/material/<clau>.js, que fa:
     window.MATERIAL_TEMES["<clau>"]={"1":[{f,t,tipus,kb?}],…,"globals":[…]}
   La clau "N" és el número del camp «Tema N.- …» de cada SdA.
   Els índexs es carreguen només quan cal (no van en la memòria cau sense
   connexió perquè els PDF pesen massa).
   ============================================================================ */
const MATERIAL_CURSOS={
  FiQ_2ESO:"FiQ 2n ESO",
  FiQ_3ESO:"FiQ 3r ESO",
  FiQ_4ESO:"FiQ 4t ESO",
  FiQ_1BAT:"FiQ 1r Batxillerat",
  QUI_2BAT:"Química 2n Batxillerat",
  FIS_2BAT:"Física 2n Batxillerat"
};
const MATERIAL_TIPUS={
  teoria:{ico:"📖",nom:"Teoria"},
  presentacio:{ico:"🖥️",nom:"Presentacions"},
  exercicis:{ico:"✏️",nom:"Exercicis"},
  solucions:{ico:"✅",nom:"Solucions"},
  examen:{ico:"📝",nom:"Exàmens"}
};
const _materialEstat={};
function materialDe(clau){
  const m=window.MATERIAL_TEMES;
  if(m && m[clau]) return m[clau];
  materialCarregar(clau);
  return null;
}
function materialCarregar(clau){
  if(!clau || !MATERIAL_CURSOS[clau] || _materialEstat[clau]) return;
  _materialEstat[clau]="carregant";
  const s=document.createElement("script");
  s.src=`js/datos/material/${encodeURIComponent(clau)}.js`;
  s.onload=()=>{ _materialEstat[clau]="ok"; if(typeof render==="function") render(); };
  s.onerror=()=>{ _materialEstat[clau]="no"; s.remove(); };
  document.head.appendChild(s);
}
function materialNumTema(s){
  const m=/tema\s*(\d+)/i.exec(String(s&&s.tema||"")) || /^(?:unitat|u|ud)\s*(\d+)/i.exec(String(s&&s.titulo||""));
  return m? String(parseInt(m[1],10)) : null;
}
function materialMida(kb){
  if(!kb) return "";
  return kb>=1024? ` · ${(kb/1024).toFixed(1).replace(".",",")} MB` : ` · ${Math.round(kb)} kB`;
}
function materialLlistaHTML(clau,items){
  const grups={};
  (items||[]).forEach(it=>{ const t=MATERIAL_TIPUS[it.tipus]?it.tipus:"teoria"; (grups[t]=grups[t]||[]).push(it); });
  return Object.keys(MATERIAL_TIPUS).filter(t=>grups[t]).map(t=>`<div style="margin-top:6px">
      <div style="font-size:12px;font-weight:700;color:var(--mut);margin-bottom:3px">${MATERIAL_TIPUS[t].ico} ${MATERIAL_TIPUS[t].nom}</div>
      <div class="flex" style="flex-wrap:wrap;gap:6px">${grups[t].map(it=>`<a class="chip" style="text-decoration:none" href="docs/material/${esc(clau)}/${esc(it.f)}" target="_blank" rel="noopener" title="${esc(it.t)}${materialMida(it.kb)}">${esc(it.t)}</a>`).join("")}</div>
    </div>`).join("");
}
/* Bloc plegable «📎 Material del tema» dins de cada SdA de la programació. */
function materialTemaHTML(p,s){
  const clau=p&&p.catalogoKey; if(!clau || !MATERIAL_CURSOS[clau]) return "";
  const mat=materialDe(clau); const n=materialNumTema(s);
  if(!mat || !n || !(mat[n]||[]).length) return "";
  const items=mat[n];
  return `<details style="margin-top:8px"><summary class="section-eyebrow" style="cursor:pointer">📎 Material del tema (${items.length})</summary>${materialLlistaHTML(clau,items)}</details>`;
}
/* Material general del curs (recuperacions, finals…), a la capçalera de la programació. */
function materialGlobalsHTML(p){
  const clau=p&&p.catalogoKey; if(!clau || !MATERIAL_CURSOS[clau]) return "";
  const mat=materialDe(clau); const g=mat&&mat.globals||[];
  if(!g.length) return "";
  return `<details style="margin-top:8px"><summary class="section-eyebrow" style="cursor:pointer">📎 Material general del curs: recuperacions i finals (${g.length})</summary>${materialLlistaHTML(clau,g)}</details>`;
}
/* Pestanya «📎 Material» de Documents del departament: tot el material per curs i tema. */
function materialDocumentsHTML(){
  const claus=Object.keys(MATERIAL_CURSOS);
  const blocs=claus.map(clau=>{
    const mat=materialDe(clau);
    if(!mat) return _materialEstat[clau]==="carregant"? `<p class="sub" style="margin:6px 0">${esc(MATERIAL_CURSOS[clau])}: carregant…</p>` : "";
    const temes=Object.keys(mat).filter(k=>k!=="globals" && (mat[k]||[]).length).sort((a,b)=>a-b);
    const prog=(state.programaciones||[]).find(x=>x.catalogoKey===clau);
    const nomTema=n=>{ const s=prog&&(prog.sdas||[]).find(x=>materialNumTema(x)===n); return s&&s.tema? s.tema : `Tema ${n}`; };
    const total=temes.reduce((a,k)=>a+mat[k].length,0)+(mat.globals||[]).length;
    return `<details style="padding:8px 0;border-bottom:1px solid var(--line)"><summary style="cursor:pointer;font-weight:600;font-size:13.5px">${esc(MATERIAL_CURSOS[clau])} · ${total} documents</summary>
      ${temes.map(n=>`<details style="margin:6px 0 0 14px"><summary style="cursor:pointer;font-size:13px">${esc(nomTema(n))} (${mat[n].length})</summary>${materialLlistaHTML(clau,mat[n])}</details>`).join("")}
      ${(mat.globals||[]).length?`<details style="margin:6px 0 0 14px"><summary style="cursor:pointer;font-size:13px">Recuperacions i finals (${mat.globals.length})</summary>${materialLlistaHTML(clau,mat.globals)}</details>`:""}
    </details>`;
  }).join("");
  return `<p class="sub" style="margin:0 0 4px">Material de classe per curs i tema: teoria, presentacions, exercicis, solucions i exàmens d'altres anys. També el trobaràs dins de cada tema de la programació.</p>${blocs||`<p class="sub" style="margin:0">Encara no hi ha material pujat.</p>`}`;
}
