/* ============================================================================
   Quadern d'avaluació · Gràfiques d'evolució (Resultats)
   js/resultados/grafiques.js

   Gràfiques en SVG, sense llibreries, que fan servir els colors del tema
   (també en mode fosc):
   - Grup: mitjana i aprovats per avaluació, mitjana de cada activitat en
     l'ordre del curs, mapa de les competències específiques per avaluació i
     comparació amb els altres grups de la mateixa matèria.
   - Alumne/a: les seues notes activitat a activitat al costat de la mitjana
     del grup, i l'evolució de cada CE.
   Només llegeixen notes: no en canvien cap.
   ============================================================================ */
function _grMitjana(vs){ const x=vs.filter(v=>v!=null&&!isNaN(v)); return x.length? x.reduce((a,b)=>a+b,0)/x.length : null; }
function _grActivitats(grupo){
  return grupo.actividades.filter(a=>!a.recupera).map((a,i)=>({a,i})).sort((x,y)=>(x.a.trimestre-y.a.trimestre)||(x.i-y.i)).map(x=>x.a);
}
function _grNotaAct(grupo,alId,a){ let v=null; try{ v=notaActividadSinExtra(grupo,alId,a); }catch(e){} return v; }
function _grCurt(t,n){ t=String(t||""); return t.length>n? t.slice(0,n-1)+"…" : t; }
function _grDetalls(clau,titol,cos){
  const obert=!!(state.ui.grafObert||{})[clau];
  return `<details class="card grafCard" ${obert?"open":""} ontoggle="grafToggle('${clau}',this.open)">
    <summary style="cursor:pointer;font-weight:700;font-size:15px">${titol}</summary>${obert?cos():""}</details>`;
}
window.grafToggle=(clau,obert)=>{
  if(!state.ui.grafObert||typeof state.ui.grafObert!=="object") state.ui.grafObert={};
  if(!!state.ui.grafObert[clau]===!!obert) return;
  state.ui.grafObert[clau]=!!obert; save(); render();
};
/* Barres verticals de 0 a 10. sèries: [{nom,classe,valors:[]}] */
function svgBarres(etiquetes,series,opts){
  opts=opts||{};
  const n=etiquetes.length; if(!n) return "";
  const w=Math.max(320,Math.min(900,60+n*(series.length*22+18))), h=190, pL=opts.girar?46:28, pB=opts.girar?58:28, pT=18, pR=8;
  const cw=w-pL-pR, ch=h-pT-pB, grup=cw/n, bw=Math.min(34,(grup-10)/series.length);
  const y=v=>pT+ch-(Math.max(0,Math.min(10,v))/10)*ch;
  const reixa=[0,5,10].map(v=>`<line x1="${pL}" x2="${w-pR}" y1="${y(v)}" y2="${y(v)}" class="grLin${v===5?" grCinc":""}"/><text x="${pL-5}" y="${y(v)+3}" text-anchor="end" class="grTxtMut">${v}</text>`).join("");
  const barres=etiquetes.map((et,i)=>{
    const x0=pL+i*grup+(grup-bw*series.length)/2;
    const bs=series.map((s,j)=>{ const v=s.valors[i]; if(v==null) return "";
      const x=x0+j*bw, yy=y(v), cls=s.classe||(v<5?"grBarSus":"grBar");
      return `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${(pT+ch-yy).toFixed(1)}" rx="3" class="${cls}"><title>${esc(s.nom?s.nom+": ":"")}${esc(et)} — ${fmt(v)}</title></rect>`+
        (series.length===1?`<text x="${(x+bw/2-1).toFixed(1)}" y="${(yy-4).toFixed(1)}" text-anchor="middle" class="grTxt">${fmt(v)}</text>`:"");
    }).join("");
    const cx=pL+i*grup+grup/2;
    const lab=opts.girar? `<text transform="translate(${cx.toFixed(1)},${pT+ch+10}) rotate(-35)" text-anchor="end" class="grTxtMut">${esc(_grCurt(et,16))}</text>`
      : `<text x="${cx.toFixed(1)}" y="${h-8}" text-anchor="middle" class="grTxtMut">${esc(_grCurt(et,14))}</text>`;
    return bs+lab;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" class="grSvg" style="max-width:${w}px" role="img" aria-label="${esc(opts.aria||"Gràfica de barres")}">${reixa}${barres}</svg>`;
}
/* Línies de 0 a 10. sèries: [{nom,classe,valors:[]}] (null = sense punt) */
function svgLinies(etiquetes,series,opts){
  opts=opts||{};
  const n=etiquetes.length; if(!n) return "";
  const w=Math.max(320,Math.min(900,60+n*46)), h=200, pL=46, pB=58, pT=14, pR=12;
  const cw=w-pL-pR, ch=h-pT-pB, pas=n>1? cw/(n-1) : 0;
  const X=i=>pL+(n>1?i*pas:cw/2), Y=v=>pT+ch-(Math.max(0,Math.min(10,v))/10)*ch;
  const reixa=[0,5,10].map(v=>`<line x1="${pL}" x2="${w-pR}" y1="${Y(v)}" y2="${Y(v)}" class="grLin${v===5?" grCinc":""}"/><text x="${pL-5}" y="${Y(v)+3}" text-anchor="end" class="grTxtMut">${v}</text>`).join("");
  const labs=etiquetes.map((et,i)=>`<text transform="translate(${X(i).toFixed(1)},${pT+ch+10}) rotate(-35)" text-anchor="end" class="grTxtMut">${esc(_grCurt(et,16))}</text>`).join("");
  const ls=series.map(s=>{
    const pts=s.valors.map((v,i)=>v==null?null:[X(i),Y(v),v,i]).filter(Boolean);
    const d=pts.map((p,k)=>(k?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
    return (pts.length>1?`<path d="${d}" fill="none" class="${s.classe}"/>`:"")+pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" class="${s.classe}Punt"><title>${esc(s.nom)}: ${esc(etiquetes[p[3]])} — ${fmt(p[2])}</title></circle>`).join("");
  }).join("");
  const llegenda=series.map(s=>`<span class="flex" style="gap:5px;align-items:center"><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" class="${s.classe}"/></svg>${esc(s.nom)}</span>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" class="grSvg" style="max-width:${w}px" role="img" aria-label="${esc(opts.aria||"Gràfica de línies")}">${reixa}${labs}${ls}</svg>
    <div class="flex" style="gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:4px">${llegenda}</div>`;
}
/* Mapa CE × avaluació amb el percentatge mitjà i el color del nivell. */
function grMapaCEHTML(grupo,files){
  const ces=catIndex(grupo.catalogoKey).cat.ces;
  const cols=[0,1,2].map(t=>TRIMESTRES[t]).concat(["Curs"]);
  const cel=p=>{ if(p==null) return `<td class="grCel" style="color:var(--mut)">—</td>`;
    const nv=nivel(grupo,p); return `<td class="grCel"><span class="pill" style="background:${nv.bg};color:${nv.fg}">${Math.round(p)}%</span></td>`; };
  const rows=ces.map(ce=>{
    const vs=files(ce); if(vs.every(v=>v==null)) return "";
    return `<tr><th scope="row" style="text-align:left;font-weight:600" title="${esc(ce.titulo)}">${esc(ce.id)} <span style="font-weight:400;color:var(--mut)">${esc(_grCurt(ce.titulo,48))}</span></th>${vs.map(cel).join("")}</tr>`;
  }).join("");
  if(!rows) return '<p class="sub">Encara no hi ha cap criteri qualificat.</p>';
  return `<div style="overflow-x:auto"><table class="grMapa"><thead><tr><th>Competència</th>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
/* ---------- Grup ---------- */
function grafiquesGrupHTML(grupo){
  return _grDetalls("grup","📈 Gràfiques del grup",()=>{
    const als=grupo.alumnos;
    /* 1. Per avaluació */
    const per=[0,1,2].map(t=>als.map(a=>{ let v=null; try{ v=notaTrimestre(grupo,a.id,t); }catch(e){} return v; }));
    const fin=als.map(a=>{ let v=null; try{ v=notaFinal(grupo,a.id); }catch(e){} return v; });
    const totes=per.concat([fin]), etq=TRIMESTRES.slice(0,3).concat(["Final"]);
    const mitj=totes.map(_grMitjana);
    const aprov=totes.map(vs=>{ const x=vs.filter(v=>v!=null); return x.length? {a:x.filter(v=>notaActa(v,grupo)>=5).length,n:x.length} : null; });
    const resum=etq.map((e,i)=>aprov[i]?`<span><strong>${esc(e)}</strong>: mitjana ${fmt(mitj[i])} · ${aprov[i].a}/${aprov[i].n} aprovats (${Math.round(aprov[i].a/aprov[i].n*100)} %)</span>`:"").filter(Boolean).join("");
    const s1= mitj.some(v=>v!=null)
      ? svgBarres(etq,[{nom:"Mitjana del grup",valors:mitj}],{aria:"Mitjana del grup per avaluació"})+`<div class="flex" style="gap:14px;flex-wrap:wrap;font-size:12.5px;margin-top:6px">${resum}</div>`
      : '<p class="sub">Encara no hi ha notes.</p>';
    /* 2. Activitat a activitat */
    const acts=_grActivitats(grupo);
    const ma=acts.map(a=>_grMitjana(als.map(al=>_grNotaAct(grupo,al.id,a))));
    const ok=acts.map((a,i)=>[a,ma[i]]).filter(x=>x[1]!=null);
    const dificil=ok.filter(x=>x[1]<5).map(x=>esc(x[0].nombre));
    const s2= ok.length
      ? svgBarres(ok.map(x=>x[0].nombre),[{nom:"Mitjana",valors:ok.map(x=>x[1])}],{girar:true,aria:"Mitjana del grup en cada activitat"})
        +(dificil.length?`<p class="sub" style="margin:6px 0 0">⚠️ Mitjana per davall de 5: ${dificil.join(", ")}.</p>`:"")
      : '<p class="sub">Encara no hi ha activitats qualificades.</p>';
    /* 3. Competències */
    const s3=grMapaCEHTML(grupo,ce=>[0,1,2].map(t=>_grMitjana(als.map(a=>conTrim(t,()=>scoreCE(grupo,a.id,ce.id))))).concat([_grMitjana(als.map(a=>scoreCEAnual(grupo,a.id,ce.id)))]));
    /* 4. Altres grups de la mateixa matèria */
    const germans=(state.grupos||[]).filter(g=>g.catalogoKey===grupo.catalogoKey && g.alumnos&&g.alumnos.length);
    let s4="";
    if(germans.length>1){
      const series=germans.map((g,k)=>({nom:g.nombre||g.id,classe:g.id===grupo.id?"grBar":"grBar"+(k%3+2),valors:[0,1,2].map(t=>_grMitjana(g.alumnos.map(a=>{ try{ return notaTrimestre(g,a.id,t); }catch(e){ return null; } }))).concat([_grMitjana(g.alumnos.map(a=>{ try{ return notaFinal(g,a.id); }catch(e){ return null; } }))])}));
      s4=`<h3 class="grH">Comparació amb els altres grups de ${esc(((getCatalogo(grupo.catalogoKey)||{}).materia)||"la matèria")}</h3>`
        +svgBarres(etq,series,{aria:"Mitjana de cada grup per avaluació"})
        +`<div class="flex" style="gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:4px">${series.map(s=>`<span class="flex" style="gap:5px;align-items:center"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" class="${s.classe}"/></svg>${esc(s.nom)}</span>`).join("")}</div>`;
    }
    return `<p class="sub" style="margin:6px 0 10px">Passa el ratolí (o toca) una barra per a veure'n el valor.</p>
      <h3 class="grH">Mitjana i aprovats per avaluació</h3>${s1}
      <h3 class="grH">Mitjana de cada activitat, en ordre</h3>${s2}
      <h3 class="grH">Competències específiques del grup</h3>${s3}${s4}`;
  });
}
/* ---------- Alumne/a ---------- */
function grafiquesAlumneHTML(grupo,al){
  return _grDetalls("alumne","📈 Evolució de l'alumne/a",()=>{
    const acts=_grActivitats(grupo).filter(a=>_grNotaAct(grupo,al.id,a)!=null);
    const s1= acts.length
      ? svgLinies(acts.map(a=>a.nombre),[
          {nom:"Mitjana del grup",classe:"grLinGrup",valors:acts.map(a=>_grMitjana(grupo.alumnos.map(x=>_grNotaAct(grupo,x.id,a))))},
          {nom:al.nombre,classe:"grLinAl",valors:acts.map(a=>_grNotaAct(grupo,al.id,a))}],{aria:"Notes de l'alumne/a activitat a activitat i mitjana del grup"})
      : '<p class="sub">Encara no té cap activitat qualificada.</p>';
    const nt=[0,1,2].map(t=>{ try{ return notaTrimestre(grupo,al.id,t); }catch(e){ return null; } });
    const s2=svgBarres(TRIMESTRES.slice(0,3).concat(["Final"]),[{nom:al.nombre,valors:nt.concat([(()=>{ try{ return notaFinal(grupo,al.id); }catch(e){ return null; } })()])}],{aria:"Nota per avaluació"});
    const s3=grMapaCEHTML(grupo,ce=>[0,1,2].map(t=>conTrim(t,()=>scoreCE(grupo,al.id,ce.id))).concat([scoreCEAnual(grupo,al.id,ce.id)]));
    return `<h3 class="grH">Activitat a activitat, al costat de la mitjana del grup</h3>${s1}
      <h3 class="grH">Nota per avaluació</h3>${s2}
      <h3 class="grH">Competències específiques</h3>${s3}`;
  });
}
