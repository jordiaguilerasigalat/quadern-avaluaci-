/* ============================================================================
   Quadern d'avaluació · Banc de comentaris
   js/resultados/banc-comentaris.js

   Frases preparades per als comentaris de cada avaluació (Resultats → alumne
   → «Comentaris a la qualificació»), agrupades per tipus. Un clic insereix
   la frase on està el cursor, amb el nom i l'avaluació ja posats. El banc és
   del professor (state.bancComentaris), no del grup: es pot editar, ampliar
   i es conserva en començar un curs nou i en les còpies.
   ============================================================================ */
const BANC_CATS=[
  {id:"excel",   nom:"Excel·lent",          ico:"🌟"},
  {id:"be",      nom:"Notable",             ico:"👍"},
  {id:"suficient",nom:"Suficient",          ico:"🙂"},
  {id:"millora", nom:"Ha de millorar",      ico:"⚠️"},
  {id:"treball", nom:"Actitud i treball",   ico:"📒"},
  {id:"lab",     nom:"Laboratori i pràctiques", ico:"🧪"},
  {id:"consell", nom:"Recomanacions",       ico:"💡"}
];
const BANC_INICIAL=[
  ["excel","{nom} ha fet un treball excel·lent durant la {avaluacio}."],
  ["excel","Domina els continguts i els aplica amb seguretat en la resolució de problemes."],
  ["excel","Raona amb rigor i expressa els resultats amb les unitats correctes."],
  ["excel","Participa activament i ajuda els companys i companyes."],
  ["be","{nom} ha fet un bon treball durant la {avaluacio}."],
  ["be","Comprén bé els conceptes, encara que ha de revisar els càlculs amb més cura."],
  ["be","Treballa amb regularitat i els resultats ho reflecteixen."],
  ["suficient","{nom} ha assolit els aprenentatges bàsics de la {avaluacio}."],
  ["suficient","Ha d'esforçar-se més per a consolidar el que ha après."],
  ["suficient","Li costa plantejar els problemes: convé que practique més exercicis resolts pas a pas."],
  ["millora","{nom} encara no ha assolit els aprenentatges de la {avaluacio}."],
  ["millora","Ha de repassar els conceptes bàsics de la unitat i preguntar els dubtes a classe."],
  ["millora","Cal que treballe els exercicis de manera constant i no només abans dels exàmens."],
  ["millora","Ha de millorar l'ús de les unitats i els canvis d'unitats."],
  ["treball","Porta el quadern al dia i ben organitzat."],
  ["treball","Ha de portar el quadern al dia i entregar les tasques a temps."],
  ["treball","Mostra interés i bona actitud a classe."],
  ["treball","S'ha de concentrar més a classe i evitar distraure's."],
  ["treball","Ha de portar el material necessari (calculadora, quadern, llibre) cada dia."],
  ["lab","Treballa al laboratori amb autonomia i respecta les normes de seguretat."],
  ["lab","Els informes de pràctiques són complets i ben presentats."],
  ["lab","Ha de cuidar més els informes de pràctiques (dades, gràfiques i conclusions)."],
  ["consell","Li recomanem fer les fitxes de repàs per a recuperar l'avaluació."],
  ["consell","Li recomanem repassar a casa cada dia uns minuts el que s'ha fet a classe."],
  ["consell","Enhorabona i a continuar així!"],
  ["consell","Amb constància pot millorar els seus resultats."]
];
function bancComentaris(){
  if(!Array.isArray(state.bancComentaris)) state.bancComentaris=BANC_INICIAL.map(([cat,text])=>({id:uid(),cat,text}));
  return state.bancComentaris;
}
/* Categoria que toca segons la nota de l'avaluació (per a posar-la primer). */
function bancCatSuggerida(grupo,al,trim){
  let v=null; try{ v=notaTrimestre(grupo,al.id,trim); }catch(e){}
  if(v==null) return "";
  const n=notaActa(v,grupo);
  return n>=9?"excel":n>=7?"be":n>=5?"suficient":"millora";
}
function bancOmplir(text,grupo,al,trim){
  const nom=(al.nombreP||al.nombre||"").trim().split(/\s+/)[0]||al.nombre||"";
  const ev=["primera avaluació","segona avaluació","tercera avaluació"][trim]||"avaluació";
  return String(text).replace(/\{nom\}/g,nom).replace(/\{avaluacio\}/g,ev);
}
/* Panell davall del quadre del comentari en Resultats. */
function bancComentarisHTML(grupo,al,trim){
  const obert=!!state.ui.bancObert;
  const boto=`<button class="ghost small" style="border:1px solid var(--line)" aria-expanded="${obert}" onclick="bancObrir(${!obert})" title="Frases preparades: un clic les afig al comentari">📚 Banc de comentaris</button>`;
  if(!obert) return {boto,panell:""};
  const banc=bancComentaris(), sug=bancCatSuggerida(grupo,al,trim);
  const filtre=state.ui.bancCat||"", gestio=!!state.ui.bancGestio;
  const cats=[...BANC_CATS].sort((a,b)=>(b.id===sug)-(a.id===sug));
  const chip=(id,txt,act)=>`<button class="chip bancChip${act?" on":""}" aria-pressed="${act}" onclick="bancFiltre('${id}')">${txt}</button>`;
  const visibles=cats.filter(c=>!filtre||c.id===filtre);
  const llista=visibles.map(c=>{
    const fr=banc.filter(f=>f.cat===c.id);
    if(!fr.length && !gestio) return "";
    return `<div class="bancGrup"><div style="font-size:12px;font-weight:700;color:var(--mut);margin:8px 0 4px">${c.ico} ${esc(c.nom)}${c.id===sug?' <span style="font-weight:500">· segons la nota</span>':""}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${fr.map(f=>gestio
        ? `<span class="bancFrase" style="display:inline-flex;gap:4px;align-items:center;border:1px dashed var(--line);border-radius:8px;padding:3px 6px;font-size:12.5px">${esc(f.text)}
            <button class="ghost small" aria-label="Editar la frase" title="Editar" onclick="bancEditar('${escJS(f.id)}')">✏️</button>
            <button class="ghost small" aria-label="Esborrar la frase" title="Esborrar" onclick="bancEsborrar('${escJS(f.id)}')">🗑️</button></span>`
        : `<button class="ghost small bancFrase" style="border:1px solid var(--line);text-align:left;white-space:normal;font-size:12.5px" onclick="bancInserir('${escJS(f.id)}')">${esc(bancOmplir(f.text,grupo,al,trim))}</button>`).join("")}
        ${gestio?`<button class="ghost small" style="border:1px solid var(--line)" onclick="bancAfegir('${c.id}')">＋ Afegir</button>`:""}</div></div>`;
  }).join("");
  const panell=`<div class="bancPanell" style="margin-top:10px;border:1px solid var(--line);border-radius:10px;padding:8px 10px">
    <div class="flex" style="gap:6px;flex-wrap:wrap;align-items:center">
      ${chip("","Totes",!filtre)}${cats.map(c=>chip(c.id,`${c.ico} ${esc(c.nom)}`,filtre===c.id)).join("")}
      <span style="flex:1"></span>
      <button class="ghost small" style="border:1px solid var(--line)" title="Afig al banc el text que tens seleccionat en el comentari (o el comentari sencer)" onclick="bancDesarSeleccio()">⭐ Desa al banc</button>
      <button class="ghost small" style="border:1px solid var(--line)" aria-pressed="${gestio}" onclick="bancGestio(${!gestio})">${gestio?"✓ Fet":"✏️ Editar el banc"}</button>
    </div>
    <p class="sub" style="margin:6px 0 0;font-size:12px">${gestio?"Escriu {nom} o {avaluacio} i s'ompliran sols en inserir la frase.":"Toca una frase per a afegir-la on tens el cursor."}</p>
    ${llista||'<p class="sub">No hi ha frases en aquesta categoria.</p>'}
  </div>`;
  return {boto,panell};
}
window.bancObrir=v=>{ state.ui.bancObert=!!v; if(!v) state.ui.bancGestio=false; save(); render(); };
window.bancFiltre=id=>{ state.ui.bancCat=id||""; save(); render(); };
window.bancGestio=v=>{ state.ui.bancGestio=!!v; save(); render(); };
window.bancInserir=id=>{
  const grupo=grupoActual(); const al=grupo&&grupo.alumnos.find(a=>a.id===state.ui.resAl); if(!al) return;
  const f=bancComentaris().find(x=>x.id===id); if(!f) return;
  const trim=state.ui.trim, frase=bancOmplir(f.text,grupo,al,trim);
  const ta=document.getElementById("resComentario");
  let txt=ta?ta.value:((al.comentariosEval||[])[trim]||"");
  let pos=ta&&document.activeElement===ta?ta.selectionStart:(ta&&ta.dataset.cursor!=null?+ta.dataset.cursor:txt.length);
  if(!(pos>=0&&pos<=txt.length)) pos=txt.length;
  const abans=txt.slice(0,pos), despres=txt.slice(pos);
  const sep1=abans&&!/\s$/.test(abans)?" ":"", sep2=despres&&!/^\s/.test(despres)?" ":"";
  txt=abans+sep1+frase+sep2+despres;
  if(!Array.isArray(al.comentariosEval)) al.comentariosEval=["","",""];
  al.comentariosEval[trim]=txt; save();
  if(ta){ ta.value=txt; const c=(abans+sep1+frase).length; ta.dataset.cursor=c; try{ ta.focus(); ta.setSelectionRange(c,c); }catch(e){} }
  mostrarToast("✓ Frase afegida");
};
window.bancDesarSeleccio=async()=>{
  const ta=document.getElementById("resComentario"); if(!ta) return;
  const s=+(ta.dataset.selIni||0), e=+(ta.dataset.selFi||0);
  let text=(e>s?ta.value.slice(s,e):ta.value).trim();
  if(!text){ mostrarAviso("Escriu o selecciona primer el text del comentari que vols guardar."); return; }
  const grupo=grupoActual(); const al=grupo&&grupo.alumnos.find(a=>a.id===state.ui.resAl);
  const nom=al?((al.nombreP||al.nombre||"").trim().split(/\s+/)[0]):"";
  if(nom && nom.length>1) text=text.split(nom).join("{nom}");
  const cat=state.ui.bancCat||(al?bancCatSuggerida(grupo,al,state.ui.trim):"")||"treball";
  bancComentaris().push({id:uid(),cat,text}); save(); render();
  mostrarToast(`✓ Guardada en «${(BANC_CATS.find(c=>c.id===cat)||{}).nom}»`);
};
window.bancAfegir=async cat=>{
  const t=await pedirTexto("Frase nova (pots usar {nom} i {avaluacio}):",""); if(!t||!t.trim()) return;
  bancComentaris().push({id:uid(),cat,text:t.trim()}); save(); render();
};
window.bancEditar=async id=>{
  const f=bancComentaris().find(x=>x.id===id); if(!f) return;
  const t=await pedirTexto("Edita la frase:",f.text); if(t==null||!t.trim()) return;
  f.text=t.trim(); save(); render();
};
window.bancEsborrar=async id=>{
  const b=bancComentaris(), i=b.findIndex(x=>x.id===id); if(i<0) return;
  if(!(await confirmar(`Esborrar aquesta frase del banc?\n\n«${b[i].text}»`,{ok:"Esborrar",peligro:true}))) return;
  b.splice(i,1); save(); render();
};
/* Recorda on era el cursor i què hi havia seleccionat (en tocar un botó el quadre perd el focus). */
document.addEventListener("selectionchange",()=>{
  const ta=document.activeElement;
  if(ta&&ta.id==="resComentario"){ ta.dataset.cursor=ta.selectionEnd; ta.dataset.selIni=ta.selectionStart; ta.dataset.selFi=ta.selectionEnd; }
});
