/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · puente con el Cuaderno
   editor/js/puente-cuaderno.js
   (guardado en memoria, fuentes, PDF por la vista previa del Cuaderno, criterios y estructura)
   ============================================================================ */
(function(){
  var MEM={}, KEYS=/^ee\.(exam\.|index$|last$|fallback\.)/;
  var s0=LS.set, g0=LS.get;
  LS.set=function(k,v){ return KEYS.test(k)? true : s0.call(LS,k,v); };
  LS.get=function(k,d){ return KEYS.test(k)? d : g0.call(LS,k,d); };
  loadExamLocal=function(id){ return MEM[id]? sanitizeExam(JSON.parse(MEM[id])) : null; };
  saveExamLocal=function(exam){ exam.updated=Date.now(); MEM[exam.id]=JSON.stringify(exam); try{ asegurarFuentesWeb(exam); }catch(e){} if(window.__eeActivo&&window.__eeOnSave) window.__eeOnSave(exam); return true; };

  /* --- v2: fuentes. Lora e Inter van incrustadas (sin conexión). El resto
     solo se descarga si el examen la usa y hay conexión; nunca bloquea la carga. --- */
  var WEBF={"garamond":"https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap","merriweather":"https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap","baskerville":"https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap","sourceserif":"https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400;1,700&display=swap","opensans":"https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap","roboto":"https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap","lato":"https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap","montserrat":"https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&display=swap","atkinson":"https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap","lexend":"https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap","courierprime":"https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap","patrick":"https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap"}, webPuestas={};
  FONTS.forEach(function(f){ if(f.g==='web'&&f.id!=='lora'&&f.id!=='inter'&&f.label.indexOf('connexió')<0) f.label+=' · requereix connexió'; });
  function fuentesUsadas(ex){ var out={}, m, re=/"font":"([a-z0-9]+)"/g, j=JSON.stringify(ex||{}); while((m=re.exec(j))) if(WEBF[m[1]]) out[m[1]]=WEBF[m[1]]; return out; }
  function asegurarFuentesWeb(ex){
    if(navigator.onLine===false) return;
    var u=fuentesUsadas(ex); Object.keys(u).forEach(function(id){ if(webPuestas[id]) return; webPuestas[id]=1;
      var l=document.createElement('link'); l.rel='stylesheet'; l.href=u[id]; document.head.appendChild(l); });
  }
  window.__eeFuentesWeb=function(){ var u=fuentesUsadas(S.exam); return Object.keys(u).map(function(k){return u[k];}); };
  /* --- v2: el autoguardado no lee todas las versiones en cada cambio (como mucho cada 2 min) --- */
  var crs0=createRecoverySnapshot, ultimaVer={};
  createRecoverySnapshot=function(exam,reason,force){
    if(!force&&exam&&ultimaVer[exam.id]&&Date.now()-ultimaVer[exam.id]<120000) return Promise.resolve(false);
    if(exam) ultimaVer[exam.id]=Date.now();
    return crs0.apply(this,arguments);
  };
  /* --- v3: el CSS y las fuentes del editor son archivos propios. Para el PDF del Cuaderno se
     reúne su texto (las hojas enlazadas + los <style> internos) y las fuentes con rutas absolutas. --- */
  function textoDe(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }); }
  async function cssDelEditor(){
    var partes=[], enlaces=[].slice.call(document.querySelectorAll('link[rel="stylesheet"][data-css-editor]'));
    for(var i=0;i<enlaces.length;i++){ try{ partes.push(await textoDe(enlaces[i].href)); }catch(e){} }
    [].slice.call(document.querySelectorAll('style')).forEach(function(x){ partes.push(x.textContent); });
    return partes.join('\n');
  }
  async function fontCssAbsoluto(){
    var l=document.getElementById('embeddedFontFaces'); if(!l||!l.href) return '';
    try{ var css=await textoDe(l.href); return css.replace(/url\(([^)]+)\)/g,function(m,u){ u=u.replace(/^["']|["']$/g,''); return 'url('+new URL(u,l.href).href+')'; }); }catch(e){ return ''; }
  }
  /* --- v2: PDF. En iPad, imprimir desde un iframe imprime la página entera; se
     usa la vista previa de impresión del Cuaderno (la misma de las hojas de corrección). --- */
  var epd0=exportPdfDirect;
  exportPdfDirect=async function(){
    var P=null; try{ P=window.parent&&window.parent!==window&&window.parent.exImprimirDesdeEditor?window.parent:null; }catch(e){ P=null; }
    if(!P) return epd0.apply(this,arguments);
    if(!S.exam.body.length) return toast('Afig contingut a l\'examen abans d\'exportar');
    clearTimeout(renderTimer); await renderPreview();
    var css=(await cssDelEditor()).replace(/:root\b/g,'.doc-root');
    var doc='<!doctype html><html><head><meta charset="utf-8"><style>'+css+'\n.doc-root{display:block!important;height:auto!important;min-height:0!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;padding:0!important}#pages{transform:none!important;display:block!important}.sheet{margin:0 auto 14px!important}@media print{.sheet{margin:0!important}}</style></head><body><div id="pagesOuter" style="width:auto;height:auto"><div id="pages">'+$('#pages').innerHTML+'</div></div></body></html>';
    P.exImprimirDesdeEditor(doc,S.exam.name||'Examen',await fontCssAbsoluto(),window.__eeFuentesWeb());
  };
  var rs0=renderSide;
  renderSide=function(){ rs0.apply(this,arguments); try{ critPane(); }catch(e){} };
  var critTots=false;
  function critPane(){
    var P=window.__eeCriterios||[], T=window.__eeCriteriosTots||[]; if((!P.length&&!T.length)||S.tab!=='block'||!S.sel) return;
    var f=findNode(S.exam.body,S.sel); if(!f||(f.node.type!=='question'&&f.node.type!=='subquestion')) return;
    var n=f.node, cur=n.crit||[];
    /* Si l'activitat té criteris previstos en la Programació, només es mostren eixos;
       «Mostrar tots els criteris» obri tot el currículum del grup. Un criteri ja marcat
       que no és dels previstos es mostra sempre. */
    var ids={}; P.forEach(function(c){ ids[c.id]=1; });
    var hiHaMes=T.some(function(c){ return !ids[c.id]; });
    var L=(critTots||!P.length)? (T.length?T:P) : P.concat(T.filter(function(c){ return !ids[c.id]&&cur.indexOf(c.id)>=0; }));
    var box=h('div',{class:'sec'},h('h3',{},'Criteris d\'avaluació'),h('small',{class:'hint'},'Es vincularan a aquesta pregunta (i a les seues subpreguntes) en importar a la rúbrica.'));
    if(hiHaMes && P.length) box.append(h('div',{class:'tools',style:{margin:'6px 0'}},
      h('button',{class:'btn sm',type:'button','aria-pressed':critTots?'true':'false',onclick:function(){ critTots=!critTots; renderSide(); }},
        critTots?'Només els previstos en la Programació ('+P.length+')':'Mostrar tots els criteris ('+T.length+')')));
    L.forEach(function(c){
      var cb=h('input',{type:'checkbox'}); cb.checked=cur.indexOf(c.id)>=0;
      cb.onchange=function(){ var a=(n.crit||[]).filter(function(x){return x!==c.id;}); if(cb.checked) a.push(c.id); n.crit=a; change({}); };
      box.append(h('label',{style:{display:'flex',gap:'6px',alignItems:'flex-start',margin:'4px 0',fontSize:'12px'}},cb,h('span',{},c.id+' · '+c.texto)));
    });
    $('#inspector').append(box);
  }
  /* --- Capçalera del centre: la imatge es guarda en el Quadern (Inici → les meues dades).
     Ací entra com un bloc d'imatge al principi de l'examen (marcat amb centre:true), de
     manera que la paginació, el PDF i el Word la tracten com qualsevol altra imatge. Mentre
     hi és, la capçalera de text no ix en la primera pàgina (es restaura en llevar-la). --- */
  function capcSrc(){ try{ var P=window.parent; return (P&&P!==window&&typeof P.capcaleraImg==='function')? P.capcaleraImg() : ''; }catch(e){ return ''; } }
  function teCapc(ex){ return !!(ex&&ex.body||[]).some(function(n){ return n.type==='image'&&n.centre; }); }
  function posarCapc(ex,src){
    if(!ex||!src) return ex;
    ex.body=(ex.body||[]).filter(function(n){ return !(n.type==='image'&&n.centre); });
    var n=newNode('image'); n.src=src; n.widthPct=100; n.imgAlign='left'; n.caption=''; n.centre=true;
    ex.header=ex.header||{};
    if(ex.header.on!==false && ex.header.first!==false){ ex.header.first=false; n.prevFirst=true; }
    ex.body.unshift(n); return ex;
  }
  function llevarCapc(ex){
    var torna=false;
    ex.body=(ex.body||[]).filter(function(n){ if(n.type==='image'&&n.centre){ if(n.prevFirst) torna=true; return false; } return true; });
    if(torna&&ex.header) ex.header.first=true;
    return ex;
  }
  function alternarCapc(){
    var src=capcSrc();
    if(!teCapc(S.exam) && !src){ toast('Primer puja la imatge de la capçalera en el Quadern: Inici → les meues dades → 🏫 Capçalera del centre.'); return; }
    if(teCapc(S.exam)) llevarCapc(S.exam); else posarCapc(S.exam,src);
    if(S.sel && !findNode(S.exam.body,S.sel)) S.sel=null;
    change({tree:true,insp:true,now:true}); pintaBotoCapc();
    toast(teCapc(S.exam)?'Capçalera del centre posada al principi de l\'examen':'Capçalera del centre llevada');
  }
  var botoCapc=null;
  function pintaBotoCapc(){
    if(!botoCapc) return;
    var on=teCapc(S.exam), hiHa=!!capcSrc();
    botoCapc.hidden=!on&&!hiHa&&!(window.parent&&window.parent!==window);
    botoCapc.textContent=on?'🏫 Capçalera del centre ✓':'🏫 Capçalera del centre';
    botoCapc.setAttribute('aria-pressed',on?'true':'false');
    botoCapc.classList.toggle('primary',on);
    botoCapc.title=on?'Llevar la capçalera del centre d\'este examen':(hiHa?'Posar la capçalera del centre dalt de l\'examen':'Puja primer la capçalera en Inici → les meues dades');
  }
  function muntaBotoCapc(){
    var ref=document.getElementById('btnBank'); if(!ref||botoCapc) return;
    botoCapc=h('button',{class:'btn',id:'btnCentre',type:'button',onclick:alternarCapc},'🏫 Capçalera del centre');
    ref.parentNode.insertBefore(botoCapc,ref.nextSibling); pintaBotoCapc();
  }
  var rt0=renderTree;
  renderTree=function(){ rt0.apply(this,arguments); try{ muntaBotoCapc(); pintaBotoCapc(); }catch(e){} };
  /* També en la pestanya «Capçalera i peu», per a qui la busque allí. */
  var bp0=barsPane;
  barsPane=function(){
    var out=bp0.apply(this,arguments), on=teCapc(S.exam);
    var g=h('div',{class:'sec'},h('h3',{},'Capçalera del centre (imatge)'),
      h('small',{class:'hint'},on?'Ix dalt de la primera pàgina, com un bloc més de l\'examen. La capçalera de text es queda per a les pàgines següents.':'La imatge que has pujat en el Quadern (Inici → les meues dades).'),
      h('div',{class:'tools',style:{marginTop:'6px'}},h('button',{class:'btn sm'+(on?'':' primary'),type:'button',onclick:alternarCapc},on?'Llevar la capçalera del centre':'🏫 Posar la capçalera del centre')));
    return [g].concat(out);
  };
  window.__eeActivo=false;
  window.__ee={
    cargar:function(ex){ var e=sanitizeExam(ex); MEM[e.id]=JSON.stringify(e); try{ asegurarFuentesWeb(e); }catch(_){} loadExam(e); window.__eeActivo=true; },
    flush:function(){ if(saveTimer){ clearTimeout(saveTimer); saveTimer=0; } if(S.exam&&window.__eeActivo) saveExamLocal(S.exam); },
    get:function(){ return S.exam? JSON.parse(JSON.stringify(S.exam)) : null; },
    teCapcalera:function(){ return teCapc(S.exam); },
    posarCapcalera:function(ex,src){ return posarCapc(ex,src||capcSrc()); },
    mezclar:function(){
      var ex=JSON.parse(JSON.stringify(S.exam));
      function sh(a){ var idx=[],q=[]; a.forEach(function(n,i){ if(n.type==='question'){ idx.push(i); q.push(n); } });
        for(var i=q.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q[i]; q[i]=q[j]; q[j]=t; }
        idx.forEach(function(p,k){ a[p]=q[k]; });
        a.forEach(function(n){ if(n.children) sh(n.children); }); }
      sh(ex.body); loadExam(sanitizeExam(ex));
    },
    /* v3: también de un examen que no está abierto (el modelo B, para numerar sus preguntas). */
    estructura:function(ex0){
      var ex=ex0? sanitizeExam(JSON.parse(JSON.stringify(ex0))) : S.exam, lab=computeLabels(ex);
      function conv(list,inh){ var out=[]; list.forEach(function(n){
        if(n.type!=='section'&&n.type!=='question'&&n.type!=='subquestion') return;
        var has=String(n.points==null?'':n.points).trim()!=='', p=num(n.points,NaN), c=(n.crit&&n.crit.length)?n.crit:(inh||[]);
        var t1=plainOf(n.title).replace(/\s+/g,' ').trim(), t2=plainOf(n.text).replace(/\s+/g,' ').trim(), txt=t1||t2, numb=lab.get(n.id)||'', full=(t1&&t2)?t1+' — '+t2:txt;
        out.push({id:n.id,tipo:n.type,label:(numb+' '+txt).trim().slice(0,120),
                  num:numb,rotulo:(numb+' '+(full.length>400?full.slice(0,399)+'…':full)).trim(),
                  max:(has&&isFinite(p))?p:null,hijos:conv(n.children||[],c),crit:c}); });
        return out; }
      var nodos=conv(ex.body), desc=[];
      function sumaHijos(n){ var t=0,hay=false; (n.hijos||[]).forEach(function(h){ if(h.max!=null){ t+=h.max; hay=true; } else { var r=sumaHijos(h); if(r.hay){ t+=r.t; hay=true; } } }); return {t:t,hay:hay}; }
      (function w(l){ l.forEach(function(n){ if(n.max!=null){ var r=sumaHijos(n); if(r.hay&&Math.abs(r.t-n.max)>0.001) desc.push({label:n.label,max:n.max,suma:Math.round(r.t*100)/100}); } w(n.hijos); }); })(nodos);
      return {nombre:ex.name,nodos:nodos,descuadres:desc};
    }
  };
})();
