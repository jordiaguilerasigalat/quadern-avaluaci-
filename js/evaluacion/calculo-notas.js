/* ============================================================================
   Cuaderno del profesor · Motor de cálculo de notas (criterios, CE, CC, bloques, trimestres, final) y recuperaciones
   js/evaluacion/calculo-notas.js
   ============================================================================ */

/* =================================================================
   Ventana emergente con la descripción completa de un criterio
   Se invoca al pinchar en el número/código de cualquier criterio
   (en Calificar, Actividades…) para no tener que mostrar el texto
   entero en sitios donde solo cabe el identificador.
   ================================================================= */
function critLinkHTML(catalogoKey,critId,label){
  return `<span class="critlink" onclick="verCriterio('${escJS(catalogoKey)}','${escJS(critId)}')" title="Ver la descripción completa de este criterio">${esc(label||critId)}</span>`;
}
function cerrarModalCriterioEsc(e){ if(e.key==="Escape") cerrarModalCriterio(); }
window.verCriterio=(catalogoKey,critId)=>{
  const idx=catIndex(catalogoKey);
  const l=idx.critMap[critId];
  if(!l){ return; }
  const ce=idx.ceMap[l.ceId];
  const grupo=grupoActual();
  let pesoHTML="";
  if(grupo && grupo.catalogoKey===catalogoKey){
    const p=pesoCriterio(grupo,critId);
    pesoHTML=`<div style="font-size:12.5px;color:var(--mut);margin-top:12px">Peso dentro de ${esc(ce.id)}: <strong>${fmt(p)}%</strong></div>`;
  }
  const ccHTML=(ce.cc||[]).map(cc=>`<span class="badge" style="margin:0 5px 5px 0;display:inline-block">${esc(cc)} · ${esc(COMP_CLAVE[cc]||cc)}</span>`).join("");
  cerrarModalCriterio();
  const wrap=document.createElement("div");
  wrap.id="critModalWrap";
  wrap.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this) cerrarModalCriterio()">
    <div class="modal-box">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px">
        <div style="font-size:16px;font-weight:600">Criteri ${esc(critId)}</div>
        <button class="modal-close" onclick="cerrarModalCriterio()" aria-label="Cerrar">×</button>
      </div>
      <div style="font-size:14.5px;line-height:1.6">${esc(l.texto)}</div>
      ${pesoHTML}
      <div style="font-size:12.5px;color:var(--mut);margin:14px 0 6px">Pertenece a la competencia específica</div>
      <div style="font-size:13.5px;line-height:1.5"><strong>${esc(ce.id)}</strong> · ${esc(ce.titulo)}</div>
      <div style="font-size:12.5px;color:var(--mut);margin:14px 0 6px">Competencias clave relacionadas</div>
      <div>${ccHTML}</div>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  document.addEventListener("keydown",cerrarModalCriterioEsc);
};
window.cerrarModalCriterio=()=>{
  const el=document.getElementById("critModalWrap");
  if(el) el.remove();
  document.removeEventListener("keydown",cerrarModalCriterioEsc);
};

/* v6 · Rendimiento: índice de la estructura de actividades de cada grupo
   (qué actividades hay en cada trimestre y qué recuperaciones afectan a
   cada una). Se reconstruye solo si cambia la lista de actividades y se
   invalida en cada guardado y en cada pintado, así que nunca queda viejo.
   Con 10 grupos × 30 alumnos × 60 actividades, la Memoria de curso pasa
   de ~0,5 s a una fracción. */
let _cacheEstructura=new WeakMap();
function _invalidarCaches(){ _cacheEstructura=new WeakMap(); }
function _estructura(grupo){
  const acts=grupo.actividades;
  let c=_cacheEstructura.get(grupo);
  if(!c || c.acts!==acts || c.n!==acts.length){
    c={acts,n:acts.length,rec:{},trim:{},memo:new Map()};
    acts.forEach(r=>{ if(r.recupera && Array.isArray(r.recupera.ids)) r.recupera.ids.forEach(id=>{ (c.rec[id]=c.rec[id]||[]).push(r); }); });
    _cacheEstructura.set(grupo,c);
  }
  return c;
}
function actsTrim(grupo){ const c=_estructura(grupo), t=state.ui.trim; return c.trim[t]||(c.trim[t]=grupo.actividades.filter(a=>a.trimestre===t)); }

/* =================================================================
   v2 · RECUPERACIONES
   Una actividad con act.recupera = {ids:[…], modo, tope} es la
   recuperación de otra(s). No cuenta por sí misma: modifica la nota de
   las actividades que recupera (aunque sean de otro trimestre):
     - "mayor": se queda con la nota más alta (por defecto)
     - "sustituye": la nota de la recuperación sustituye a la original
     - "media": media entre original y recuperación
   tope (opcional): nota máxima que puede aportar la recuperación (p. ej. 5).
   Para las competencias, se aplica igual criterio a criterio, en los
   criterios que comparten original y recuperación.
   ================================================================= */
const REC_MODOS=[{id:"mayor",label:"Es queda amb la nota més alta"},{id:"sustituye",label:"Substituïx la nota original"},{id:"media",label:"Mitjana entre l'original i la recuperació"}];
function recuperacionesDe(grupo,actId){
  return _estructura(grupo).rec[actId]||[];
}
function _combinarRec(v,rv,modo){
  if(rv==null) return v;
  if(modo==="sustituye") return rv;
  if(modo==="media") return v==null?rv:(v+rv)/2;
  return v==null?rv:Math.max(v,rv);
}
function _notaCritCruda(grupo,alId,a,cid){
  const n=grupo.notas?.[alId]?.[a.id]?.[cid];
  return (n==null||n==="")?null:Number(n);
}
function scoreCriterio(grupo,alId,cid){
  let sw=0,sv=0;
  for(const a of actsTrim(grupo)){
    if(a.recupera) continue;
    const l=a.criterios.find(x=>x.critId===cid); if(!l) continue;
    let n=_notaCritCruda(grupo,alId,a,cid);
    for(const r of recuperacionesDe(grupo,a.id)){
      if(marcaDe(grupo,alId,r.id)==="EX") continue;
      n=_combinarRec(n,_notaCritCruda(grupo,alId,r,cid),r.recupera.modo);
    }
    if(n==null||n==="") continue;
    const w=Number(l.peso)||0; if(w<=0) continue;
    sw+=w; sv+=(Number(n)/10)*100*w;
  }
  return sw>0? sv/sw : null;
}
function scoreCE(grupo,alId,ceId){
  const _m=_estructura(grupo).memo, _k="ce|"+state.ui.trim+"|"+alId+"|"+ceId;
  if(_m.has(_k)) return _m.get(_k);
  const _v=_scoreCEsinCache(grupo,alId,ceId); _m.set(_k,_v); return _v;
}
function _scoreCEsinCache(grupo,alId,ceId){
  const idx=catIndex(grupo.catalogoKey);
  let sw=0,sv=0;
  for(const c of idx.ceMap[ceId].criterios){
    const sc=scoreCriterio(grupo,alId,c.id); if(sc==null) continue;
    const w=pesoCriterio(grupo,c.id); sw+=w; sv+=sc*w;
  }
  return sw>0? sv/sw : null;
}
function scoreCC(grupo,alId,cc){
  const idx=catIndex(grupo.catalogoKey);
  let sw=0,sv=0;
  for(const ce of idx.cat.ces){
    if(!ce.cc.includes(cc)) continue;
    const sc=scoreCE(grupo,alId,ce.id); if(sc==null) continue;
    const w=pesoCEenCC(grupo,ce.id,cc); sw+=w; sv+=sc*w;
  }
  return sw>0? sv/sw : null;
}
function nivel(grupo,p){
  if(p==null) return null;
  const u=grupo.umbrales;
  if(p>=u.excelente) return NIV.excelente;
  if(p>=u.adecuado) return NIV.adecuado;
  if(p>=u.enProceso) return NIV.enProceso;
  return NIV.necesita;
}

/* =================================================================
   PUNTOS EXTRA (p. ej. +0,5 o +1 por presentarse voluntario/a)
   Se guardan APARTE de las notas, para que recalcular una rúbrica o
   cambiar la nota del examen no los borre y quede constancia del motivo:
     grupo.extras[alId][actId]        = {pts, motivo}   · en una actividad
     grupo.extrasEval[alId][periodo]  = {pts, motivo}   · periodo "0","1","2" o "final"
   - Actividad: se suman a su nota DESPUÉS de aplicar la recuperación
     (si la hay). No se suman con NP ni Exento, ni si no tiene nota.
   - Evaluación: se suman a la media de los bloques del trimestre. La
     nota final es la media de los trimestres (ya con sus extras) más el
     extra de la nota final, si lo hay.
   - La nota resultante nunca pasa de 10.
   - Solo cambian la nota numérica: los niveles de logro de criterios y
     competencias no se tocan.
   ================================================================= */
const EXTRA_TOPE=10;
function _ptsExtra(e){ const p=e?Number(e.pts):0; return (isFinite(p)&&p>0)?p:0; }
function extraActividad(grupo,alId,actId){ return (grupo.extras&&grupo.extras[alId]&&grupo.extras[alId][actId])||null; }
function extraEval(grupo,alId,periodo){ return (grupo.extrasEval&&grupo.extrasEval[alId]&&grupo.extrasEval[alId][String(periodo)])||null; }
function ptsExtraActividad(grupo,alId,actId){ return _ptsExtra(extraActividad(grupo,alId,actId)); }
function ptsExtraEval(grupo,alId,periodo){ return _ptsExtra(extraEval(grupo,alId,periodo)); }
function _sumarExtra(v,pts){ if(v==null||!pts) return v; return Math.min(EXTRA_TOPE,v+pts); }
/* Puntos extra que se suman de verdad en esta actividad (0 si no se aplican). */
function extraAplicadoActividad(grupo,alId,a){
  if(a.recupera) return 0;
  const pts=ptsExtraActividad(grupo,alId,a.id); if(!pts) return 0;
  if(marcaDe(grupo,alId,a.id)) return 0;
  return notaActividadSinExtra(grupo,alId,a)==null?0:pts;
}

/* fins (opcional): últim trimestre les recuperacions del qual compten. Així una
   recuperació feta en la 2a avaluació no canvia la nota (ja tancada) de la 1a,
   però sí que compta per a la nota final. Sense fins, compten totes. */
function notaActividad(grupo,alId,a,fins){
  const v=notaActividadSinExtra(grupo,alId,a,fins);
  return _sumarExtra(v,extraAplicadoActividad(grupo,alId,a));
}
/* Nota de la actividad con la recuperación ya aplicada, pero sin puntos extra. */
function _recCompta(r,fins){ return fins==null || r.trimestre==null || !(Number(r.trimestre)>Number(fins)); }
function notaActividadSinExtra(grupo,alId,a,fins){
  if(a.recupera) return null; // la recuperación no cuenta sola: actúa sobre sus originales
  let v=notaActividadBase(grupo,alId,a);
  for(const r of recuperacionesDe(grupo,a.id)){
    if(marcaDe(grupo,alId,r.id)==="EX") continue;
    if(!_recCompta(r,fins)) continue;
    let rv=notaActividadBase(grupo,alId,r);
    if(rv==null) continue;
    const tope=r.recupera.tope;
    if(tope!=null && tope!=="" && isFinite(Number(tope))) rv=Math.min(rv,Number(tope));
    v=_combinarRec(v,rv,r.recupera.modo);
  }
  return v;
}
function notaActividadBase(grupo,alId,a){
  if(a.esExamen){
    /* Los exámenes tienen una nota cuantitativa propia e independiente de la
       calificación cualitativa de cada criterio (ver grupo.notasCuant). Esta
       es la única que cuenta para la nota de bloque/trimestre/final. */
    const vc=grupo.notasCuant?.[alId]?.[a.id];
    return (vc==null||vc==="")? null : Number(vc);
  }
  let sw=0,sv=0;
  for(const l of a.criterios){
    const n=grupo.notas?.[alId]?.[a.id]?.[l.critId];
    if(n==null||n==="") continue;
    const w=Number(l.peso)||0; if(w<=0) continue;
    sw+=w; sv+=Number(n)*w;
  }
  return sw>0? sv/sw : null;
}
/* Una activitat compta en el seu bloc (bloqueId) i, si el seu apartat està
   vinculat a més d'un bloc, també en els de bloquesExtra (amb la nota sencera
   en cadascun). Dins de cada bloc la nota és la mitjana de les activitats. */
/* Pes d'un bloc en la nota numèrica: 0 si està desactivat (b.inactiu), sense
   perdre el pes escrit, que torna quan es reactiva. Un bloc a 0 % no compta. */
function pesoBloqueNota(b){ return b && !b.inactiu ? (Number(b.peso)||0) : 0; }
/* a.sinBloc: el seu apartat de Seguiment s'ha desmarcat de tots els blocs, així
   que l'activitat no compta en la nota numèrica (conserva bloqueId per si es torna a marcar). */
function actEnBloque(a,bloqueId){ if(a.sinBloc) return false; return a.bloqueId===bloqueId || (Array.isArray(a.bloquesExtra) && a.bloquesExtra.includes(bloqueId)); }
/* Pes d'una activitat dins d'un bloc. Les que tenen pes escrit (pesoBloque)
   el conserven; les que el tenen en blanc es reparteixen a parts iguals el
   que falta fins al 100 % (80 % escrit + dues en blanc → 10 % cadascuna).
   Si els pesos escrits ja arriben al 100 %, les en blanc compten com abans
   (100 / nombre d'activitats del bloc), perquè no desaparega cap nota. */
function pesoActividadEnBloque(grupo,act,bloqueId){
  const v=act.pesoBloque; if(v!=null && v!=="") return Number(v);
  const bid=bloqueId||act.bloqueId;
  const del=grupo.actividades.filter(a=>a.trimestre===act.trimestre && actEnBloque(a,bid) && !a.recupera);
  const n=del.length; if(!n) return 100;
  let escrit=0, blanc=0;
  for(const a of del){ const p=a.pesoBloque; if(p!=null && p!=="" && isFinite(Number(p))) escrit+=Number(p); else blanc++; }
  if(escrit>0 && blanc>0 && escrit<100) return (100-escrit)/blanc;
  return 100/n;
}
function notaBloque(grupo,alId,bloqueId,trim,fins){
  if(fins==null) fins=trim;
  const acts=grupo.actividades.filter(a=>a.trimestre===trim && actEnBloque(a,bloqueId));
  let sw=0,sv=0;
  for(const a of acts){
    const v=notaActividad(grupo,alId,a,fins); if(v==null) continue;
    const w=pesoActividadEnBloque(grupo,a,bloqueId); if(w<=0) continue;
    sw+=w; sv+=v*w;
  }
  return sw>0? sv/sw : null;
}
/* v1: bloques de calificación que ya tienen actividades corregidas en el
   trimestre pero en los que ESTE alumno/a no tiene ninguna nota. Como la
   media se reparte solo entre los bloques con nota, un bloque vacío
   (p. ej. no ha hecho ningún examen) cambia el peso real del resto: se avisa. */
function bloquesSinNota(grupo,alId,trim){
  const out=[];
  for(const b of grupo.bloques){
    if(!(pesoBloqueNota(b)>0)) continue;
    const acts=grupo.actividades.filter(a=>a.trimestre===trim && actEnBloque(a,b.id));
    const corregidas=acts.filter(a=>grupo.alumnos.some(x=>notaActividad(grupo,x.id,a)!=null));
    if(!corregidas.length) continue;
    const exento=corregidas.every(a=>marcaDe(grupo,alId,a.id)==="EX");
    if(exento) continue;
    if(notaBloque(grupo,alId,b.id,trim)==null) out.push(b.label);
  }
  return out;
}
function avisoBloquesHTML(grupo,alId,trim){
  const f=bloquesSinNota(grupo,alId,trim); if(!f.length) return "";
  return ` <span title="Sin ninguna nota en: ${esc(f.join(", "))}. Su nota de ${TRIMESTRES[trim]} se calcula solo con el resto de bloques. Pon la nota que falte, o márcalo como NP (cuenta 0) o Exento." style="cursor:help;color:#b45309">⚠️</span>`;
}
function notaTrimestre(grupo,alId,trim,fins){
  const _m=_estructura(grupo).memo, _k="nt|"+trim+"|"+(fins==null?"":fins)+"|"+alId;
  if(_m.has(_k)) return _m.get(_k);
  const _v=_notaTrimestreSinCache(grupo,alId,trim,fins); _m.set(_k,_v); return _v;
}
function _notaTrimestreSinCache(grupo,alId,trim,fins){
  return _sumarExtra(notaTrimestreSinExtra(grupo,alId,trim,fins),ptsExtraEval(grupo,alId,trim));
}
/* =================================================================
   FiQ · MODE DE QUALIFICACIÓ
   grupo.modoNota = "bloques" (per instruments: mitjana ponderada dels
   blocs, com fins ara) o "ce" (per competències: mitjana ponderada de
   les CE amb grupo.pesosCE). En mode "ce":
     - cada criteri és la mitjana de les seues evidències (com sempre);
     - cada CE, la mitjana dels seus criteris treballats;
     - la nota d'una avaluació usa els criteris treballats FINS A eixa
       avaluació (avaluació contínua) i la final, tots els del curs;
     - si una CE no té cap criteri treballat, el seu pes es reparteix
       proporcionalment entre la resta.
   ================================================================= */
function modoNotaGrupo(grupo){ return grupo && grupo.modoNota==="ce" ? "ce" : "bloques"; }
/* Doble qualificació (grupo.modoNota = "ambdues"): la nota numèrica
   (quantitativa) ix dels instruments, com en mode "bloques", i a banda es
   dona una qualificació QUALITATIVA per competències: la mitjana ponderada
   de les CE (grupo.pesosCE) amb les qualificacions de cada criteri, passada
   a Insuficient / Suficient / Bé / Notable / Excel·lent. Com en mode "ce",
   cada avaluació usa tot el que s'ha treballat fins a eixa avaluació i la
   final, tot el curs. Els punts extra no la toquen. */
function teQualitativaCE(grupo){ return !!grupo && grupo.modoNota==="ambdues"; }
function notaQualitativaCE(grupo,alId,periodo){
  if(!teQualitativaCE(grupo)) return null;
  return notaPorCE(grupo,alId, String(periodo)==="final"? [0,1,2] : trimsFinsA(Number(periodo)));
}
function etiquetaQualitativaCE(grupo,alId,periodo){
  const v=notaQualitativaCE(grupo,alId,periodo);
  return v==null? null : nivellQual(grupo,v);
}
/* Píndola amb la qualificació qualitativa (sense número: el número va en el títol). */
function pillQual(grupo,alId,periodo){
  const v=notaQualitativaCE(grupo,alId,periodo);
  return pillNivellQual(grupo,v,"Qualificació per competències (mitjana ponderada de les CE)");
}
/* ---- Escala qualitativa de les competències (editable per grup) ----
   grupo.escalaQual=[{abr,nom,des,nota}] de menor a major: «des» és la nota
   (0-10) a partir de la qual comença el nivell (el primer, sempre 0) i
   «nota», opcional, la nota numèrica amb què vols que aparega eixe nivell
   (en blanc = es mostra la calculada). S'aplica a la qualificació per
   competències («Les dues») i a la vista per competències de Resultats. */
/* Noms de les dues qualificacions (Jordi): la numèrica és «per continguts» i la de les CE, «per competències». */
const ETQ_QUANT="Per continguts (quantitativa)", ETQ_QUAL="Per competències (qualitativa)";
const ESCALA_QUAL_DEF=[
  {abr:"NA",nom:"No assoleix",des:0,nota:""},
  {abr:"S",nom:"Suficient",des:5,nota:""},
  {abr:"B",nom:"Bé",des:6,nota:""},
  {abr:"N",nom:"Notable",des:7,nota:""},
  {abr:"E",nom:"Excel·lent",des:8.5,nota:""}
];
const _COLORS_QUAL=[["#f3dcdc","#912525"],["#f6eccf","#8a5a12"],["#d9e6f2","#1d4e74"],["#e3f0df","#3a6b2a"],["#dcece0","#1e5631"]];
function escalaQual(grupo){
  const e=grupo&&Array.isArray(grupo.escalaQual)&&grupo.escalaQual.length? grupo.escalaQual : ESCALA_QUAL_DEF;
  return e.map((x,i)=>{ const c=_COLORS_QUAL[Math.round(i*(_COLORS_QUAL.length-1)/Math.max(1,e.length-1))];
    return {abr:String(x.abr||""),nom:String(x.nom||""),des:i===0?0:(Number(x.des)||0),nota:(x.nota===""||x.nota==null||!isFinite(Number(x.nota)))?"":Number(x.nota),bg:c[0],fg:c[1]}; });
}
/* Nivell (de l'escala del grup) d'una nota 0-10. Torna {abr,nom,etq,des,nota,bg,fg,v}. */
function nivellQual(grupo,v){
  if(v==null||v===""||isNaN(Number(v))) return null;
  v=Math.max(0,Math.min(10,_limpiaFP(Number(v))));
  const e=escalaQual(grupo); let r=e[0];
  for(const x of e) if(v>=x.des-1e-9) r=x;
  return {...r,etq:r.nom||r.abr,v};
}
/* Rang d'un nivell en text: «5 – 5,99». */
function rangNivellQual(e,i){
  const f=n=>String(Math.round(n*100)/100).replace(".",",");
  return i<e.length-1? `${f(e[i].des)} – ${f(Math.max(e[i].des,e[i+1].des-0.01))}` : `${f(e[i].des)} – 10`;
}
function pillNivellQual(grupo,v,titol,curt){
  const n=nivellQual(grupo,v);
  if(!n) return '<span style="color:var(--mut,#888);font-size:13px">—</span>';
  const txt=(curt? (n.abr||n.nom) : n.etq)+(n.nota!==""? " · "+String(n.nota).replace(".",",") : "");
  return `<span style="white-space:nowrap"><span class="pill" title="${esc((titol? titol+": " : "")+fmt(v)+" → "+n.nom+(n.abr?" ("+n.abr+")":""))}" style="background:${n.bg};color:${n.fg}">${esc(txt)}</span>${notaQualNumHTML(v)}</span>`;
}
/* Nota calculada sobre 10, entre parèntesis i en gris clar, al costat del nivell (Jordi: sempre). */
function notaQualNumHTML(v){ return v==null||v===""||isNaN(Number(v))? "" : ` <span class="notaQualNum" style="color:var(--qualnum,#6e7787);font-weight:400;font-size:.92em;white-space:nowrap">(${fmt(v)})</span>`; }
/* Nota que es posarà en ITACA: la que has escrit a mà o, si no n'hi ha, la
   d'acta calculada. grupo.notaItaca[alId][periodo] (periodo "0","1","2","final"). */
function notaItacaManual(grupo,alId,periodo){
  const v=grupo.notaItaca&&grupo.notaItaca[alId]&&grupo.notaItaca[alId][String(periodo)];
  return (v==null||v===""||!isFinite(Number(v)))? null : Number(v);
}
function notaItaca(grupo,alId,periodo){
  const m=notaItacaManual(grupo,alId,periodo); if(m!=null) return m;
  const v=String(periodo)==="final"? notaFinal(grupo,alId) : notaTrimestre(grupo,alId,Number(periodo));
  return v==null? null : notaActa(v,grupo);
}
function pesoCEGrupo(grupo,ceId){
  const v=grupo.pesosCE && grupo.pesosCE[ceId];
  if(v!=null && v!=="" && isFinite(Number(v))) return Math.max(0,Number(v));
  const n=catIndex(grupo.catalogoKey).cat.ces.length;
  return n? 100/n : 0;
}
/* Criteris que avalua una activitat a efectes de la nota per competències:
   els enllaçats (criterios) o, en un examen que encara no en té cap, els
   previstos en crear-lo (criteriosPrevistos), amb el mateix pes. */
function criterisActivitatCE(a){
  if((a.criterios||[]).length) return a.criterios;
  if(a.esExamen && Array.isArray(a.criteriosPrevistos) && a.criteriosPrevistos.length) return a.criteriosPrevistos.map(c=>({critId:c,peso:100}));
  return [];
}
function _teNotesCriteri(grupo,alId,a){
  const d=grupo.notas?.[alId]?.[a.id]; if(!d) return false;
  for(const k in d){ const v=d[k]; if(v!=null && v!=="") return true; }
  return false;
}
/* Nota d'un criteri en una activitat. En mode «ce» (numerica=true), si
   l'alumne/a no té cap nota per criteris en eixa activitat però sí la nota
   numèrica de l'examen, eixa nota compta per a tots els criteris de l'examen. */
function _notaCritCE(grupo,alId,a,cid,numerica){
  const n=_notaCritCruda(grupo,alId,a,cid);
  if(n!=null || !numerica || !a.esExamen || _teNotesCriteri(grupo,alId,a)) return n;
  return notaActividadBase(grupo,alId,a);
}
/* Nota que aporta la recuperació r al criteri cid (amb el seu topall). Una
   recuperació sense criteris propis recupera tots els de l'original amb la
   seua nota numèrica (només en mode «ce»). */
function _notaRecCriteri(grupo,alId,r,cid,numerica){
  let rv;
  if(!numerica) rv=_notaCritCruda(grupo,alId,r,cid);
  else{
    const cr=criterisActivitatCE(r);
    if(cr.some(l=>l.critId===cid)) rv=_notaCritCE(grupo,alId,r,cid,true);
    else rv=cr.length? null : notaActividadBase(grupo,alId,r);
  }
  if(rv==null) return null;
  const tope=r.recupera.tope;
  if(tope!=null && tope!=="" && isFinite(Number(tope))) rv=Math.min(rv,Number(tope));
  return rv;
}
/* Puntuació (0-100) d'un criteri amb les evidències dels trimestres indicats.
   Les recuperacions compten fins a l'últim d'eixos trimestres (com en mode
   «bloques»: una recuperació de la 2a no canvia la nota de la 1a).
   En mode «ce» (la nota numèrica ix d'ací) també: la nota numèrica d'un examen
   sense notes per criteris i els punts extra de cada activitat. La qualificació
   qualitativa de «Les dues» continua usant només les notes per criteris. */
/* det (opcional): array on s'apunta cada activitat que ha treballat el criteri
   (també les que no compten), per al detall «d'on ix esta nota» de Resultats. */
function _scoreCriterioTrims(grupo,alId,cid,trims,det){
  const numerica=modoNotaGrupo(grupo)==="ce";
  const fins=Math.max(...trims);
  let sw=0,sv=0;
  for(const a of grupo.actividades){
    if(a.recupera || !trims.includes(a.trimestre)) continue;
    const l=(numerica? criterisActivitatCE(a) : (a.criterios||[])).find(x=>x.critId===cid); if(!l) continue;
    const n0=numerica? _notaCritCE(grupo,alId,a,cid,true) : _notaCritCruda(grupo,alId,a,cid);
    let n=n0; const recs=[];
    for(const r of recuperacionesDe(grupo,a.id)){
      if(marcaDe(grupo,alId,r.id)==="EX") continue;
      if(!_recCompta(r,fins)) continue;
      const rv=_notaRecCriteri(grupo,alId,r,cid,numerica);
      if(rv!=null) recs.push({act:r,nota:rv});
      n=_combinarRec(n,rv,r.recupera.modo);
    }
    const w=Number(l.peso)||0;
    const fila=det? {act:a,peso:w,base:n0,recs,marca:marcaDe(grupo,alId,a.id),nota:null,extra:0} : null;
    if(fila) det.push(fila);
    if(n==null||n==="") continue;
    if(numerica && !marcaDe(grupo,alId,a.id)){ const pe=ptsExtraActividad(grupo,alId,a.id); const n2=_sumarExtra(Number(n),pe); if(fila && pe) fila.extra=n2-Number(n); n=n2; }
    if(w<=0) continue;
    if(fila) fila.nota=Number(n);
    sw+=w; sv+=(Number(n)/10)*100*w;
  }
  return sw>0? sv/sw : null;
}
/* Desglossament de la nota d'una CE (trimestres indicats): cada criteri amb el
   seu pes dins de la CE i, dins de cada criteri, les activitats que l'han
   treballat amb la nota i el pes. pesCE = part (0-1) de la nota de la CE que
   ve d'eixa activitat en eixe criteri. Fa exactament el mateix càlcul que
   scoreCETrims, de manera que la suma quadra amb la nota de la taula. */
function detallCETrims(grupo,alId,ceId,trims){
  const ce=catIndex(grupo.catalogoKey).ceMap[ceId]; if(!ce) return null;
  const crits=ce.criterios.map(c=>{
    const acts=[]; const sc=_scoreCriterioTrims(grupo,alId,c.id,trims,acts);
    return {crit:c,score:sc,pesCrit:pesoCriterio(grupo,c.id),acts};
  });
  const swc=crits.reduce((s,x)=>s+(x.score==null?0:x.pesCrit),0);
  crits.forEach(x=>{
    x.part=(x.score!=null && swc>0)? x.pesCrit/swc : 0;
    const swa=x.acts.reduce((s,f)=>s+(f.nota==null||f.peso<=0?0:f.peso),0);
    x.acts.forEach(f=>{ f.pesCrit=(f.nota!=null && f.peso>0 && swa>0)? f.peso/swa : 0; f.pesCE=x.part*f.pesCrit; });
  });
  return {ce,score:scoreCETrims(grupo,alId,ceId,trims),crits};
}
/* Activitats amb alguna nota que, en mode «ce», no compten perquè no tenen
   cap criteri (ni enllaçat ni previst). Per a avisar-ne. */
function activitatsSenseCriterisCE(grupo,trims){
  return grupo.actividades.filter(a=>!a.recupera && trims.includes(a.trimestre) && !criterisActivitatCE(a).length
    && grupo.alumnos.some(al=>notaActividadBase(grupo,al.id,a)!=null));
}
/* Puntuació (0-100) d'una CE amb les evidències dels trimestres indicats. */
function scoreCETrims(grupo,alId,ceId,trims){
  const ce=catIndex(grupo.catalogoKey).ceMap[ceId]; if(!ce) return null;
  let sw=0,sv=0;
  for(const c of ce.criterios){
    const sc=_scoreCriterioTrims(grupo,alId,c.id,trims); if(sc==null) continue;
    const w=pesoCriterio(grupo,c.id); sw+=w; sv+=sc*w;
  }
  return sw>0? sv/sw : null;
}
/* Nota (0-10) per competències amb les evidències dels trimestres indicats. */
function notaPorCE(grupo,alId,trims){
  const memo=_estructura(grupo).memo, k="nce|"+trims.join(",")+"|"+alId;
  if(memo.has(k)) return memo.get(k);
  let sw=0,sv=0;
  for(const ce of catIndex(grupo.catalogoKey).cat.ces){
    const w=pesoCEGrupo(grupo,ce.id); if(!(w>0)) continue;
    const sc=scoreCETrims(grupo,alId,ce.id,trims); if(sc==null) continue;
    sw+=w; sv+=(sc/10)*w;
  }
  const v=sw>0? sv/sw : null; memo.set(k,v); return v;
}
function trimsFinsA(t){ return [0,1,2].filter(x=>x<=t); }

/* Media ponderada de los bloques, sin el extra de la evaluación. */
function notaTrimestreSinExtra(grupo,alId,trim,fins){
  if(modoNotaGrupo(grupo)==="ce") return notaPorCE(grupo,alId,trimsFinsA(trim));
  let sw=0,sv=0;
  for(const b of grupo.bloques){
    const w=pesoBloqueNota(b); if(!(w>0)) continue;
    const v=notaBloque(grupo,alId,b.id,trim,fins); if(v==null) continue;
    sw+=w; sv+=v*w;
  }
  return sw>0? sv/sw : null;
}
function pesoTrimestreEfectivo(grupo,t,disponibles){
  const v=grupo.pesosTrim && grupo.pesosTrim[t];
  if(v!=null && v!=="") return Number(v);
  return 100/disponibles.length;
}
function notaFinal(grupo,alId){
  return _sumarExtra(notaFinalSinExtra(grupo,alId),ptsExtraEval(grupo,alId,"final"));
}
/* Media ponderada de las evaluaciones (cada una ya con su extra), sin el extra de la nota final. */
function notaFinalSinExtra(grupo,alId){
  if(modoNotaGrupo(grupo)==="ce") return notaPorCE(grupo,alId,[0,1,2]);
  /* En la nota final sí que compten totes les recuperacions (fins=2). */
  const disponibles=[0,1,2].filter(t=>notaTrimestre(grupo,alId,t,2)!=null);
  if(!disponibles.length) return null;
  let sw=0,sv=0;
  for(const t of disponibles){
    const v=notaTrimestre(grupo,alId,t,2);
    const w=pesoTrimestreEfectivo(grupo,t,disponibles);
    sw+=w; sv+=v*w;
  }
  return sw>0? sv/sw : null;
}
/* Nota con 1 decimal (redondeo normal). Única excepción: una nota por debajo
   de 5 nunca se muestra como "5,0" (4,96 → "4,9"), para que la cifra no
   sugiera un aprobado que la nota de acta no da. */
const fmt=x=>{
  if(x==null||x===""||isNaN(Number(x))) return "—";
  x=_limpiaFP(x);
  let r=Math.round(_limpiaFP(x*10))/10;
  if(x<5 && r>=5) r=4.9;
  return r.toFixed(1).replace(".",",");
};
function pillHTML(grupo,p){
  const nv=nivel(grupo,p);
  if(!nv) return '<span style="color:var(--mut);font-size:13px">—</span>';
  return `<span class="pill" style="background:${nv.bg};color:${nv.fg}"><strong>${p.toFixed(0)}%</strong> ${nv.etq}</span>`;
}
function pillCuant(v,grupo){
  const n=etiquetaNota(v,grupo);
  if(!n) return '<span style="color:var(--mut);font-size:13px">—</span>';
  return `<span class="pill" title="Nota de acta: ${notaActa(v,grupo)} (regla de redondeo en Ajustes del grupo)" style="background:${n.bg};color:${n.fg}">${n.etq} · ${notaActa(v,grupo)}</span>`;
}
function actividadesDeCriterio(grupo,alId,cid){
  const set=new Set();
  for(const a of actsTrim(grupo)){
    if(a.recupera) continue;
    const l=a.criterios.find(x=>x.critId===cid); if(!l) continue;
    const n=grupo.notas?.[alId]?.[a.id]?.[cid];
    if(n!=null&&n!=="") set.add(a.nombre);
    for(const r of recuperacionesDe(grupo,a.id)){ if(_notaCritCruda(grupo,alId,r,cid)!=null) set.add(r.nombre); }
  }
  return [...set];
}
function actividadesDeCE(grupo,alId,ceId){
  const idx=catIndex(grupo.catalogoKey);
  const set=new Set();
  idx.ceMap[ceId].criterios.forEach(c=>actividadesDeCriterio(grupo,alId,c.id).forEach(n=>set.add(n)));
  return [...set];
}
function actividadesDeCC(grupo,alId,cc){
  const idx=catIndex(grupo.catalogoKey);
  const set=new Set();
  idx.cat.ces.filter(ce=>ce.cc.includes(cc)).forEach(ce=>actividadesDeCE(grupo,alId,ce.id).forEach(n=>set.add(n)));
  return [...set];
}
function abrevActs(names,max=3){
  if(!names.length) return "Sin actividades con nota en este periodo";
  const shown=names.slice(0,max).join(" · ");
  return names.length>max? `${shown} · +${names.length-max} més` : shown;
}

/* =================================================================
   Informe final de curso: agregados anuales (media de las 3 evaluaciones)
   Varias funciones de puntuación (scoreCriterio, scoreCE, scoreCC,
   actividadesDeCE/CC…) dependen del trimestre "actual" (state.ui.trim).
   conTrim() permite reutilizarlas para un trimestre concreto sin tocar
   la interfaz: cambia el trimestre global, ejecuta la función y lo
   restaura siempre (incluso si la función lanza un error).
   ================================================================= */
function conTrim(trim,fn){
  const prev=state.ui.trim;
  state.ui.trim=trim;
  try{ return fn(); } finally { state.ui.trim=prev; }
}
/* Media ponderada (misma lógica que notaFinal) de una puntuación de
   competencia a lo largo de los trimestres en los que hay dato. */
function mediaAnualPonderada(grupo,valoresPorTrim){
  const disponibles=valoresPorTrim.filter(x=>x.v!=null);
  if(!disponibles.length) return null;
  const trims=disponibles.map(x=>x.t);
  let sw=0,sv=0;
  for(const {t,v} of disponibles){ const w=pesoTrimestreEfectivo(grupo,t,trims); sw+=w; sv+=v*w; }
  return sw>0? sv/sw : null;
}
function scoreCEAnual(grupo,alId,ceId){
  return mediaAnualPonderada(grupo,[0,1,2].map(t=>({t,v:conTrim(t,()=>scoreCE(grupo,alId,ceId))})));
}
function scoreCCAnual(grupo,alId,cc){
  return mediaAnualPonderada(grupo,[0,1,2].map(t=>({t,v:conTrim(t,()=>scoreCC(grupo,alId,cc))})));
}
function actividadesDeCEAnual(grupo,alId,ceId){
  const set=new Set();
  for(const t of [0,1,2]) conTrim(t,()=>actividadesDeCE(grupo,alId,ceId)).forEach(n=>set.add(n));
  return [...set];
}
function actividadesDeCCAnual(grupo,alId,cc){
  const set=new Set();
  for(const t of [0,1,2]) conTrim(t,()=>actividadesDeCC(grupo,alId,cc)).forEach(n=>set.add(n));
  return [...set];
}

/* v2: la cabecera muestra las materias reales de tus grupos (antes decía
   siempre "Geografía e Historia"). */
function materiasEtiqueta(){
  // Les matèries escrites a mà (tallers, atenció educativa…) no van a la capçalera si hi ha alguna matèria amb catàleg.
  const cats=state.grupos.map(g=>getCatalogo(g.catalogoKey)).filter(c=>c&&c.materia);
  const principals=cats.filter(c=>!c.lliure);
  const ms=[...new Set((principals.length?principals:cats).map(c=>c.materia))];
  if(!ms.length) return "Quadern d'avaluació";
  if(ms.length<=2) return ms.join(" · ");
  return ms.slice(0,2).join(" · ")+` i ${ms.length-2} més`;
}
