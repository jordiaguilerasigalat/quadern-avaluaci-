/* ============================================================================
   Quadern d'avaluació · Alumnat en risc (targeta d'Inici)
   js/inicio/alumnat-risc.js

   Abans de cada sessió d'avaluació, d'una ullada i per a tots els grups: qui
   suspén l'avaluació triada dalt, qui acumula NP (activitats no presentades) i
   qui baixa clarament respecte a l'avaluació anterior. Tocar un nom obri la
   seua fitxa. No guarda res: només llig les notes.
   ============================================================================ */
const RISC_NP_MIN=2;        // NP en l'avaluació a partir dels quals s'avisa
const RISC_BAIXADA=1.5;     // punts de baixada respecte a l'avaluació anterior

function riscCalcular(trim){
  const out=[];
  (state.grupos||[]).forEach(g=>{
    if(!(g.alumnos||[]).length || !(g.actividades||[]).some(a=>a.trimestre===trim)) return;
    const files=[];
    g.alumnos.forEach(al=>{
      const mot=[]; let greu=0;
      let v=null; try{ v=notaTrimestre(g,al.id,trim); }catch(e){}
      if(v!=null && !esAprobado(v,g)){ mot.push({t:`suspén (${fmt(v)})`,c:"n"}); greu+=10-v; }
      const np=(g.actividades||[]).filter(a=>a.trimestre===trim && marcaDe(g,al.id,a.id)==="NP").length;
      if(np>=RISC_NP_MIN){ mot.push({t:`${np} NP`,c:"np"}); greu+=np; }
      if(trim>0 && v!=null){
        let ant=null; try{ ant=notaTrimestre(g,al.id,trim-1); }catch(e){}
        if(ant!=null && ant-v>=RISC_BAIXADA){ mot.push({t:`baixa ${fmt(ant-v)} punts`,c:"b"}); greu+=ant-v; }
      }
      if(mot.length) files.push({al,mot,greu,v});
    });
    if(files.length) out.push({g,files:files.sort((a,b)=>b.greu-a.greu)});
  });
  return out;
}
window.riscObrir=(gid,alId)=>{
  hoyIr(gid,"taula");
  if(typeof obrirFitxaAlumne==="function") obrirFitxaAlumne(alId);
};
function riscHTML(){
  const trim=Number(state.ui.trim)||0;
  const grups=riscCalcular(trim); if(!grups.length) return "";
  const total=grups.reduce((s,x)=>s+x.files.length,0);
  const MAX=8;
  const cls={n:"risc-n",np:"risc-np",b:"risc-b"};
  return `<div class="card risc-card" style="margin-bottom:14px;border-left:4px solid #dc2626">
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <strong style="font-size:14px">⚠️ Alumnat en risc · ${esc(TRIMESTRES[trim]||"")}</strong>
      <span class="sub" style="margin:0">${total} alumne${total===1?"":"s"} · suspén, ${RISC_NP_MIN} o més NP, o baixa ${String(RISC_BAIXADA).replace(".",",")} punts o més</span>
    </div>
    <div style="display:grid;gap:10px;margin-top:8px">
      ${grups.map(({g,files})=>`<div>
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(g.nombre)} <span class="tn-mut" style="font-weight:400">(${files.length} de ${g.alumnos.length})</span></div>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          ${files.slice(0,MAX).map(x=>`<button type="button" class="risc-al" onclick="riscObrir('${escJS(g.id)}','${escJS(x.al.id)}')" title="Obrir la fitxa de ${esc(x.al.nombre)}"><span class="sens">${esc(x.al.nombre)}</span> ${x.mot.map(m=>`<span class="risc-mot ${cls[m.c]}">${esc(m.t)}</span>`).join(" ")}</button>`).join("")}
          ${files.length>MAX?`<button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="hoyIr('${escJS(g.id)}','resultados')">i ${files.length-MAX} més →</button>`:""}
        </div>
      </div>`).join("")}
    </div>
  </div>`;
}
