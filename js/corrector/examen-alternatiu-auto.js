/* ============================================================================
   Cuaderno del profesor · Exàmens alternatius automàtics
   js/corrector/examen-alternatiu-auto.js
   ============================================================================ */

/* =================================================================
   En crear un «+ Examen alternatiu» es pot començar de dues maneres noves:
   1) «Còpia amb altres dades numèriques» (sense internet, gratis): es copia l'examen general i
      es canvien els valors numèrics que porten unitat (20 g, 1,5 L, 3,2·10⁵ m…), amb les mateixes
      xifres significatives. L'estructura, els punts, els criteris i la rúbrica no canvien.
      No es toquen els números sense unitat (Z = 11, numeració…), els que van en subíndex o
      superíndex (H₂O, 10⁻³) ni les constants conegudes (g = 9,8 m/s², R = 0,082…).
   2) «Generat amb IA»: s'envia NOMÉS el contingut de l'examen (sense títol, dades de l'alumne,
      imatges ni res de l'alumnat) a l'API de Claude amb la clau de qui ho usa. Dificultat igual,
      més fàcil o més difícil; amb la mateixa rúbrica (mateixes preguntes, punts i criteris: només
      canvia el text) o amb una rúbrica nova (pot canviar preguntes i punts).
      La clau es guarda només en este navegador (localStorage «cuaderno_ia_clau»), fora de l'estat:
      no va en les còpies de seguretat ni en els paquets.
   El disseny resultant es desa com el de l'examen alternatiu (clau «<examen>:<variant>») i, en
   obrir-lo, la seua rúbrica es posa al dia amb el disseny (eaDespresCarregar).
   ================================================================= */
const EA_IA_CLAU="cuaderno_ia_clau", EA_IA_MODEL="cuaderno_ia_model";
const EA_MODELS=[["claude-opus-5-5","Opus 5.5 · millor (≈10-15 cèntims)"],["claude-sonnet-5-5","Sonnet 5.5 · més barat (≈5 cèntims)"]];
const EA_IA_URL="https://api.anthropic.com/v1/messages";

/* ---------- 1) Altres dades numèriques ---------- */
const EA_UNITATS=["km/h","m/s²","m/s2","m/s","g/cm³","g/cm3","g/mL","g/ml","g/L","g/l","kg/m³","kg/m3","kg/L","mol/L","mol/l","mmHg","kPa","hPa","MPa","atm","bar","Pa","kWh","kcal","cal","kJ","kW","MW","mA","kV","J","W","mol","mmol","mg","kg","g","mL","ml","cL","cl","dL","dl","L","l","cm³","cm3","cm²","cm2","dm³","dm3","m³","m3","m²","m2","km","cm","mm","nm","µm","μm","m","min","ms","s","h","°C","ºC","°","º","K","N","V","Hz","%","M","C","Ω","rpm","nC","µC","μC","mC"];
const _eaEscRe=s=>s.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");
const EA_RE_DADA=new RegExp(
  "(^|[^\\p{L}\\p{N}.,·^/_\\-−])"                       // 1: el que hi ha davant (no una lletra ni un número)
  +"([-−]?)"                                              // 2: signe
  +"(\\d{1,3}(?:\\.\\d{3})+(?![.,]?\\d)|\\d+(?:[.,]\\d+)?)" // 3: el número (1.000 = mil)
  +"((?:[ \\u00a0]?[·x×][ \\u00a0]?10<sup>[-−]?\\d+</sup>)?)" // 4: ·10ⁿ
  +"([ \\u00a0]?)"                                        // 5: espai
  +"("+[...EA_UNITATS].sort((a,b)=>b.length-a.length).map(_eaEscRe).join("|")+")" // 6: unitat
  +"(?![\\p{L}\\p{N}'’])","gu");
const EA_CONSTANTS=[[9.8],[9.81],[0.082],[8.31],[8.314],[3,8],[6.67,-11],[9,9],[1.6,-19],[1.602,-19],[6.022,23],[6.02,23],[1.67,-27],[9.1,-31],[9.11,-31]];
function _eaValor(raw){
  if(/^\d{1,3}(\.\d{3})+$/.test(raw)) return {v:Number(raw.replace(/\./g,"")),dec:0,sep:"",mil:true};
  const m=raw.match(/^(\d+)(?:([.,])(\d+))?$/);
  return {v:Number(m[1]+(m[3]?"."+m[3]:"")),dec:m[3]?m[3].length:0,sep:m[2]||",",mil:false};
}
function _eaFactor(){ return Math.random()<0.5? 0.6+Math.random()*0.25 : 1.15+Math.random()*0.45; }
function _eaNou(x,{max,mantissa}={}){
  const {v,dec}=x;
  for(let t=0;t<30;t++){
    let f=_eaFactor(); if(mantissa&&v*f>=9.95) f=0.6+Math.random()*0.3;
    let nv;
    if(dec>0) nv=Math.round(v*f*Math.pow(10,dec))/Math.pow(10,dec);
    else{
      const dig=String(Math.round(v)).length, sig=Math.max(String(Math.round(v)).replace(/0+$/,"").length||1, v>=10?2:1);
      const p=Math.pow(10,Math.max(0,dig-sig)); nv=Math.round(v*f/p)*p;
    }
    if(nv>0 && nv!==v && (max==null||nv<=max) && (!mantissa||(nv>=1&&nv<10))) return nv;
  }
  return null;
}
function _eaFormat(nv,x){
  if(x.mil) return String(Math.round(nv)).replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return x.dec>0? nv.toFixed(x.dec).replace(".",x.sep) : String(Math.round(nv));
}
/* Canvia les dades d'un text (HTML en línia). mapa: el mateix valor dins d'una pregunta canvia igual. */
function _eaVariarText(html,mapa,canvis){
  if(typeof html!=="string"||!/\d/.test(html)) return html;
  return html.replace(EA_RE_DADA,(tot,abans,signe,raw,sci,esp,unitat,pos,str)=>{
    const ini=pos+abans.length, prev=str.slice(0,ini);
    const dins=t=>(prev.match(new RegExp("<"+t+">","g"))||[]).length>(prev.match(new RegExp("</"+t+">","g"))||[]).length;
    if(dins("sub")||dins("sup")) return tot;
    const x=_eaValor(raw); if(!x.v) return tot;
    const exp=sci? Number((sci.match(/<sup>([-−]?\d+)<\/sup>/)||[])[1].replace("−","-")) : null;
    if(EA_CONSTANTS.some(c=>Math.abs(c[0]-x.v)<1e-9&&(c.length===1?!sci:exp===c[1]))) return tot;
    if(/\b(g|R|G|K|k|NA|N_A|F)\s*=\s*$/.test(prev.replace(/<[^>]+>/g,""))) return tot;   // constants: «g = 9,8 m/s²»
    const clau=signe+raw+"|"+sci+"|"+unitat;
    let nou=mapa.get(clau);
    if(nou==null){
      const nv=_eaNou(x,{max:unitat==="%"&&x.v<=100?100:null,mantissa:!!sci&&x.v>=1&&x.v<10});
      if(nv==null) return tot;
      nou=_eaFormat(nv,x); mapa.set(clau,nou);
      canvis.push({de:signe+raw+sci.replace(/<\/?sup>/g,"^").replace(/\^$/,"")+esp+unitat,a:signe+nou+sci.replace(/<\/?sup>/g,"^").replace(/\^$/,"")+esp+unitat});
    }
    return abans+signe+nou+sci+esp+unitat;
  });
}
function _eaVariarNode(n,mapa,canvis){
  if(!n||typeof n!=="object"||n.type==="title"||n.type==="datos") return;
  ["text","title","caption"].forEach(k=>{ if(typeof n[k]==="string") n[k]=_eaVariarText(n[k],mapa,canvis); });
  if(n.table&&Array.isArray(n.table.cells)) n.table.cells=n.table.cells.map(r=>Array.isArray(r)?r.map(c=>_eaVariarText(c,mapa,canvis)):r);
  (n.children||[]).forEach(c=>_eaVariarNode(c,mapa,canvis));
}
/* Còpia de l'examen amb altres dades. Cada bloc de primer nivell (pregunta o apartat) té el seu mapa. */
function eaVariarDades(exam){
  const ex=JSON.parse(JSON.stringify(exam||{body:[]})), canvis=[];
  (ex.body||[]).forEach(n=>_eaVariarNode(n,new Map(),canvis));
  return {exam:ex,canvis};
}

/* ---------- 2) Generat amb IA ---------- */
function eaClauIA(){ try{ return localStorage.getItem(EA_IA_CLAU)||""; }catch(e){ return ""; } }
function eaModelIA(){ try{ const m=localStorage.getItem(EA_IA_MODEL); return EA_MODELS.some(x=>x[0]===m)? m : EA_MODELS[0][0]; }catch(e){ return EA_MODELS[0][0]; } }
function eaRecordarIA(clau,model,recordar){
  try{ if(recordar&&clau) localStorage.setItem(EA_IA_CLAU,clau); else localStorage.removeItem(EA_IA_CLAU); localStorage.setItem(EA_IA_MODEL,model); }catch(e){}
}
const _eaEsCap=n=>n&&(n.type==="title"||n.type==="datos"||(n.type==="image"&&n.centre));
/* El que s'envia: només el contingut de les preguntes, sense imatges (només el seu peu). */
function _eaSimplifica(n){
  const o={id:n.id,type:n.type};
  ["title","text","caption"].forEach(k=>{ if(typeof n[k]==="string"&&n[k].trim()) o[k]=n[k]; });
  if(n.points!==""&&n.points!=null) o.points=n.points;
  if(Array.isArray(n.crit)&&n.crit.length) o.crit=n.crit;
  if(n.type==="table"&&n.table) o.cells=n.table.cells;
  if(n.type==="image") o.nota="Imatge fixa (no es pot canviar ni crear)";
  if(n.type==="lines") o.count=n.count;
  if(Array.isArray(n.children)&&n.children.length) o.children=n.children.filter(c=>!_eaEsCap(c)).map(_eaSimplifica);
  return o;
}
function _eaNetejaHTML(s){
  // Només format en línia: <b> <i> <u> <sub> <sup>, i «\n» entre paràgrafs.
  return String(s==null?"":s).replace(/<br\s*\/?>/gi,"\n").replace(/<(\/?)(strong|em)>/gi,(m,b,t)=>"<"+b+(t.toLowerCase()==="strong"?"b":"i")+">")
    .replace(/<(?!\/?(b|i|u|sub|sup)>)[^>]*>/gi,"").replace(/&(?!(amp|lt|gt|quot|#\d+);)/g,"&amp;");
}
function _eaNouNode(type){
  const n={id:uid(),type,style:{font:"",size:"",align:""},spaceBefore:"",breakBefore:false,keepTogether:false,collapsed:false};
  if(type==="section") Object.assign(n,{title:"",meta:"",text:"",points:"",numMode:"auto",customLabel:"",children:[]});
  else if(type==="question") Object.assign(n,{title:"",meta:"",text:"",points:"",numMode:"auto",customLabel:"",children:[]});
  else if(type==="subquestion") Object.assign(n,{text:"",points:"",numMode:"auto",customLabel:"",children:[]});
  else if(type==="text") Object.assign(n,{text:"",variant:"plain"});
  else if(type==="lines") Object.assign(n,{count:6,spacing:8,lineStyle:"solid"});
  else if(type==="box") Object.assign(n,{title:"",text:"",minH:0});
  else if(type==="spacer") Object.assign(n,{height:20});
  else if(type==="table") Object.assign(n,{table:{header:true,border:"grid",zebra:false,hshade:true,rowH:0,widths:[],cells:[]}});
  else return null;
  return n;
}
function _eaPosaText(dest,src){
  ["title","text","caption"].forEach(k=>{ if(typeof src[k]==="string"&&(k in dest||dest.type!=="image")) dest[k]=_eaNetejaHTML(src[k]); });
  if(dest.table&&Array.isArray(src.cells)&&src.cells.every(Array.isArray)){
    const cells=src.cells.map(r=>r.map(c=>_eaNetejaHTML(c)));
    const cols=Math.max(1,...cells.map(r=>r.length));
    dest.table.cells=cells.map(r=>{ r=r.slice(0,cols); while(r.length<cols) r.push(""); return r; });
    dest.table.widths=Array.from({length:cols},(_,i)=>(dest.table.widths||[])[i]||"");
  }
  if(dest.type==="lines"&&Number(src.count)>0) dest.count=Math.min(30,Math.round(Number(src.count)));
}
/* Junta la resposta de la IA amb l'examen general. */
function eaFusionaIA(general,body,nova,critValids){
  const ex=JSON.parse(JSON.stringify(general)), orig=new Map();
  (function w(l){ (l||[]).forEach(n=>{ orig.set(n.id,n); w(n.children); }); })(ex.body);
  const perId=new Map(); (function w(l){ (l||[]).forEach(n=>{ if(n&&n.id!=null) perId.set(String(n.id),n); w(n&&n.children); }); })(body);
  let canviats=0;
  if(!nova){
    // Mateixa rúbrica: mateixos blocs, punts i criteris; només canvia el text.
    (function w(l){ (l||[]).forEach(n=>{ if(_eaEsCap(n)) return; const s=perId.get(String(n.id)); if(s&&s.type===n.type){ const abans=JSON.stringify(n); _eaPosaText(n,s); if(JSON.stringify(n)!==abans) canviats++; } w(n.children); }); })(ex.body);
    return {exam:ex,canviats};
  }
  const usats=new Set(), ok=new Set(critValids||[]);
  const fes=s=>{
    if(!s||typeof s!=="object") return null;
    const o=orig.get(String(s.id));
    if(s.type==="image"){ if(!o||o.type!=="image"||usats.has(o.id)) return null; usats.add(o.id); const c=JSON.parse(JSON.stringify(o)); if(typeof s.caption==="string") c.caption=_eaNetejaHTML(s.caption); return c; }
    let n;
    if(o&&o.type===s.type&&!usats.has(o.id)){ n=JSON.parse(JSON.stringify(o)); usats.add(o.id); }
    else{ n=_eaNouNode(s.type); if(!n) return null; canviats++; }
    _eaPosaText(n,s);
    if("points" in n) n.points=(s.points===""||s.points==null||!isFinite(Number(String(s.points).replace(",","."))))? "" : String(s.points).replace(".",",");
    if(n.type==="question"||n.type==="subquestion"||n.type==="section"){
      const c=(Array.isArray(s.crit)?s.crit:[]).map(String).filter(id=>ok.has(id));
      if(c.length) n.crit=c; else delete n.crit;
    }
    if(Array.isArray(n.children)) n.children=(Array.isArray(s.children)?s.children:[]).map(fes).filter(Boolean);
    return n;
  };
  const cap=ex.body.filter(_eaEsCap);
  ex.body=cap.concat((Array.isArray(body)?body:[]).map(fes).filter(Boolean));
  return {exam:ex,canviats};
}
function _eaPuntsTotals(l){ let t=0; (function w(a){ (a||[]).forEach(n=>{ const p=Number(String(n.points||"").replace(",",".")); if(n.type!=="image"&&isFinite(p)&&p>0&&!(n.children||[]).some(c=>Number(String(c.points||"").replace(",","."))>0)) t+=p; else w(n.children); }); })(l); return Math.round(t*100)/100; }
function _eaPrompt(general,o,criteris){
  const preguntes=(general.body||[]).filter(n=>!_eaEsCap(n)).map(_eaSimplifica), total=_eaPuntsTotals(general.body);
  const dif={similar:"de dificultat SIMILAR a l'original",facil:"MÉS FÀCIL que l'original (dades més senzilles, menys passos, més guia en l'enunciat)",dificil:"MÉS DIFÍCIL que l'original (més passos, dades menys directes, més raonament)"}[o.dificultat]||"de dificultat similar";
  const system="Ets un professor expert de secundària que prepara exàmens alternatius (per a l'alumnat que no va poder fer l'examen el dia previst o que necessita una versió adaptada). "
    +"Escrius en la mateixa llengua que l'examen original (normalment valencià), amb rigor científic i dades realistes i coherents (unitats, xifres significatives, resultats que isquen bé). "
    +"Respons NOMÉS amb un objecte JSON vàlid, sense cap text abans ni després ni blocs de codi.";
  const regles=[
    `Fes un examen alternatiu ${dif}, que avalue els mateixos aprenentatges i criteris que l'original, però amb preguntes diferents: canvia les dades, el context i la redacció perquè no es puga copiar de l'original.`,
    "Format del text: HTML en línia; només pots usar <b>, <i>, <u>, <sub> i <sup> (fórmules químiques amb <sub>: H<sub>2</sub>O; potències amb <sup>: 10<sup>5</sup>). Separa paràgrafs amb \\n.",
    "Els blocs \"image\" són imatges fixes que no pots veure ni canviar: deixa'ls on estan i fes que la pregunta que els acompanya continue tenint sentit amb eixa imatge (o no la mencionis si ja no cal).",
    o.nova
      ? `Pots canviar l'estructura: afegir, llevar o reordenar preguntes i subpreguntes. Els blocs nous porten "id" nou (per exemple "nou1", "nou2"…). Tipus permesos: section, question, subquestion, text, table, lines, box, spacer, image (només les existents). Posa "points" a cada pregunta o subpregunta que puntue; el total ha de sumar ${total||10} punts. Posa en "crit" els criteris d'avaluació de la llista que avalua cada pregunta.`
      : "Mantín EXACTAMENT la mateixa estructura: els mateixos blocs amb el mateix \"id\" i \"type\", en el mateix ordre i niuament, amb els mateixos \"points\" i \"crit\". Només reescrius els camps de text (title, text, caption, cells). Cada pregunta ha de valer el mateix i avaluar el mateix que l'original.",
    o.indicacions? "Indicacions del professor/a: "+o.indicacions : "",
    "Respon amb aquest JSON: {\"body\":[…blocs amb el mateix format que l'entrada…],\"resum\":\"una frase sobre què has canviat\",\"solucions\":[{\"id\":\"id de la pregunta o subpregunta\",\"text\":\"solució breu, amb el resultat numèric\"}]}"
  ].filter(Boolean);
  const user="Regles:\n- "+regles.join("\n- ")
    +(o.nova&&criteris.length? "\n\nCriteris d'avaluació disponibles:\n"+criteris.map(c=>`${c.id}: ${c.texto}`).join("\n") : "")
    +"\n\nExamen original (JSON):\n"+JSON.stringify({total_punts:total,body:preguntes});
  return {system,user};
}
async function eaCridaIA(clau,model,system,user){
  let r;
  try{
    r=await fetch(EA_IA_URL,{method:"POST",headers:{"content-type":"application/json","x-api-key":clau,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","anthropic-beta":"server-side-fallback-2026-07-01"},
      body:JSON.stringify({model,max_tokens:16000,output_config:{effort:"medium"},fallbacks:"default",system,messages:[{role:"user",content:user}]})});
  }catch(e){ throw new Error("No s'ha pogut connectar amb el servei d'IA. Comprova la connexió a internet."); }
  let d=null; try{ d=await r.json(); }catch(e){}
  if(!r.ok){
    const msg=(d&&d.error&&d.error.message)||"";
    if(r.status===401||r.status===403) throw new Error("La clau no és vàlida o no té permís. Revisa que l'has copiada sencera.");
    if(/credit|balance|billing/i.test(msg)) throw new Error("El compte de la clau no té saldo. Afig crèdit en console.anthropic.com (Billing).");
    if(r.status===429) throw new Error("Massa peticions seguides. Espera un minut i torna-ho a provar.");
    if(r.status>=500||r.status===529) throw new Error("El servei d'IA està saturat ara mateix. Torna-ho a provar d'ací a una estona.");
    throw new Error("El servei d'IA ha retornat un error ("+r.status+")"+(msg?": "+msg:"")+".");
  }
  if(d&&d.stop_reason==="refusal") throw new Error("La IA no ha volgut generar este examen. Prova amb unes altres indicacions.");
  if(d&&d.stop_reason==="max_tokens") throw new Error("L'examen és massa llarg per a generar-lo d'una vegada.");
  const txt=((d&&d.content)||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  const a=txt.indexOf("{"), b=txt.lastIndexOf("}");
  let j=null; try{ j=JSON.parse(txt.slice(a,b+1)); }catch(e){}
  if(!j||!Array.isArray(j.body)) throw new Error("La resposta de la IA no té el format esperat. Torna-ho a provar.");
  return j;
}
async function eaGenerarIA(grupo,act,general,o){
  const crit=exCriteriosDe(grupo,act,true), {system,user}=_eaPrompt(general,o,exCriteriosDe(grupo,act));
  const j=await eaCridaIA(o.clau,o.model,system,user);
  const r=eaFusionaIA(general,j.body,o.nova,crit.map(c=>c.id));
  const hiHa=(r.exam.body||[]).some(n=>n.type==="question"||n.type==="section");
  if(!hiHa) throw new Error("La IA no ha retornat cap pregunta. Torna-ho a provar.");
  return {exam:r.exam,resum:String(j.resum||""),solucions:Array.isArray(j.solucions)?j.solucions:[],canviats:r.canviats};
}

/* ---------- Crear l'examen alternatiu amb el disseny fet ---------- */
let _eaPendent=null;   // {varId, nova, html}: en obrir el disseny es posa al dia la rúbrica i s'ensenya el resum
async function eaGuardarDisseny(act,v,exam,info){
  exam.id=uid(); exam.updated=Date.now();
  const k=act.id+":"+v.id;
  await exPut({key:k,exam,actualizado:Date.now(),nombre:act.nombre});
  try{ exMarcarPendiente(k); }catch(e){}
  _eaPendent=Object.assign({varId:v.id},info||{});
}
/* Resum per a revisar: dades canviades o el que diu la IA, i les solucions. */
function eaResumHTML(r){
  if(r.canvis){
    if(!r.canvis.length) return `<p>No s'ha trobat cap dada numèrica amb unitats per a canviar. L'examen alternatiu és una còpia del general: canvia les dades a mà.</p>`;
    const u=[]; const vist=new Set(); r.canvis.forEach(c=>{ const k=c.de+"→"+c.a; if(!vist.has(k)){ vist.add(k); u.push(c); } });
    return `<p>S'han canviat <b>${u.length}</b> dad${u.length===1?"a":"es"}. Revisa que els resultats isquen bé abans d'imprimir-lo.</p>
      <table style="border-collapse:collapse;font-size:13px">${u.map(c=>`<tr><td style="padding:2px 10px 2px 0;color:var(--mut)">${esc(c.de)}</td><td style="padding:2px 6px">→</td><td style="padding:2px 0"><b>${esc(c.a)}</b></td></tr>`).join("")}</table>`;
  }
  const net=s=>esc(String(s||"")).replace(/&lt;(\/?)(sub|sup|b|i)&gt;/g,"<$1$2>");
  return `${r.resum?`<p>${net(r.resum)}</p>`:""}<p class="sub">Revisa'l sencer abans d'imprimir-lo: la IA pot equivocar-se en dades o resultats.</p>
    ${r.solucions&&r.solucions.length?`<h3 style="font-size:13.5px;margin:10px 0 6px">Solucions proposades</h3><ol style="margin:0;padding-left:20px;font-size:13px">${r.solucions.map(s=>`<li style="margin-bottom:4px">${net(s&&s.text)}</li>`).join("")}</ol>`:""}`;
}
/* Cridat en carregar el disseny d'un examen alternatiu (js/corrector/editor-examenes.js). */
async function eaDespresCarregar(grupo,act,vr,win){
  const p=_eaPendent; if(!p||!vr||p.varId!==vr.id) return;
  _eaPendent=null;
  let nota="";
  try{
    if(typeof cxEsNiveles==="function"&&cxEsNiveles(vr.rubrica)) nota="La rúbrica és per nivells: no s'ha tocat.";
    else{
      const enllacada=cxItemsFlat(vr.rubrica).some(i=>i.fuenteId);
      if(p.nova||enllacada){
        const abans=vr.rubrica;
        if(p.nova) vr.rubrica=[];
        const est=exConReparto(win.__ee.estructura());
        const r=est.nodos.length? await cxImportarEstructura(grupo,act,est,vr) : null;
        if(!r){ vr.rubrica=abans; nota="Les preguntes no tenen punts: la rúbrica no s'ha canviat."; }
        else nota=p.nova? `Rúbrica nova feta a partir de les preguntes: ${r.resumen||r.items+" ítems"} · ${cxFmtPts(r.total)} punts.` : "La rúbrica és la mateixa que la del general (mateixos punts i criteris).";
        save();
      } else nota="La rúbrica és una còpia de la del general.";
    }
  }catch(e){ console.error(e); }
  exModal(`<h2 style="font-size:16.5px;margin-bottom:6px">${p.titol||"Examen alternatiu"}</h2>${p.html||""}${nota?`<p class="sub" style="margin-top:10px">${esc(nota)}</p>`:""}`);
}
/* «🔢 Altres dades» en el disseny d'un examen alternatiu: torna a canviar les dades del que hi ha. */
window.eaAltresDades=async()=>{
  const g=grupoActual(), act=g&&g.actividades.find(a=>a.id===state.ui.corExamId), vr=act&&cxVarEditando(act), win=_exFrame&&_exFrame.contentWindow;
  if(!vr||!win||!win.__ee) return;
  exFlush();
  const r=eaVariarDades(win.__ee.get());
  if(!r.canvis.length){ mostrarAviso("No s'ha trobat cap dada numèrica amb unitats (20 g, 1,5 L, 3·10⁵ m…) per a canviar.","🔢 Altres dades"); return; }
  win.__ee.cargar(r.exam); exFlush();
  _eaPendent={varId:vr.id,titol:"🔢 Dades canviades",html:eaResumHTML(r)};
  await eaDespresCarregar(g,act,vr,win);
};

/* Part del diàleg «+ Examen alternatiu» per a la IA (js/corrector/editor-rubrica.js). */
function eaPanellIAHTML(){
  const clau=eaClauIA(), model=eaModelIA();
  return `<div id="altIA" hidden style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:8px">
    <div class="flex" style="gap:10px;flex-wrap:wrap">
      <label style="font-size:12.5px;color:var(--mut);font-weight:500">Dificultat<select class="in" id="altIADif" style="display:block;margin-top:4px"><option value="similar">Similar</option><option value="facil">Més fàcil</option><option value="dificil">Més difícil</option></select></label>
      <label style="font-size:12.5px;color:var(--mut);font-weight:500;flex:1;min-width:200px">Model<select class="in" id="altIAModel" style="display:block;width:100%;margin-top:4px">${EA_MODELS.map(([id,t])=>`<option value="${id}" ${id===model?"selected":""}>${esc(t)}</option>`).join("")}</select></label>
    </div>
    <div style="margin-top:8px;font-size:13.5px">
      <label style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px"><input type="radio" name="altIARub" value="mateixa" checked> <span><b>La mateixa rúbrica</b> · mateixes preguntes, punts i criteris; canvia el text</span></label>
      <label style="display:flex;gap:6px;align-items:flex-start"><input type="radio" name="altIARub" value="nova"> <span><b>Rúbrica nova</b> · pot canviar les preguntes i els punts</span></label>
    </div>
    <label style="display:block;font-size:12.5px;color:var(--mut);font-weight:500;margin-top:8px">Indicacions (opcional)<textarea class="in" id="altIAInd" rows="2" style="width:100%;margin-top:4px;font-family:inherit" placeholder="Per exemple: sense la pregunta de gràfiques; més exercicis de mols"></textarea></label>
    <label style="display:block;font-size:12.5px;color:var(--mut);font-weight:500;margin-top:8px">La teua clau de Claude (API)<input class="in" id="altIAClau" type="password" autocomplete="off" spellcheck="false" style="width:100%;margin-top:4px" placeholder="sk-ant-…" value="${esc(clau)}"></label>
    <label style="display:flex;gap:6px;align-items:center;font-size:12.5px;margin-top:4px"><input type="checkbox" id="altIARec" ${clau||!eaHaPreguntat()?"checked":""}> Recordar-la en aquest dispositiu</label>
    <details style="font-size:12.5px;margin-top:6px"><summary style="cursor:pointer">Com aconseguir la clau</summary>
      <ol style="margin:6px 0 0;padding-left:20px;line-height:1.5">
        <li>Entra en <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> i crea un compte (és diferent de la subscripció a Claude).</li>
        <li>En <b>Billing</b>, afig saldo (amb 5 $ en tens per a molts exàmens).</li>
        <li>En <b>API keys</b>, «Create key»: copia-la i apega-la ací.</li>
      </ol></details>
    <p class="sub" style="margin:8px 0 0">🔒 Només s'envia el text de les preguntes (sense noms, notes ni imatges). La clau es queda en aquest navegador i no va en les còpies de seguretat.</p>
    <p id="altIAEstat" role="status" style="font-size:13px;margin:8px 0 0"></p>
  </div>`;
}
function eaHaPreguntat(){ try{ return localStorage.getItem(EA_IA_MODEL)!=null; }catch(e){ return false; } }
