/* ============================================================================
   Quadern d'avaluació · Lliscar amb el dit per a canviar d'alumne/a
   js/ui/lliscar.js

   En el mòbil i la tauleta, quan es qualifica alumne per alumne (diàleg de la
   Taula de notes i Seguiment → rúbrica d'una activitat), lliscar el dit cap a
   l'esquerra passa a l'alumne/a següent i cap a la dreta a l'anterior.
   Només compta un lliscament clarament horitzontal (no interferix amb el
   desplaçament vertical ni amb les taules que es desplacen de costat).
   ============================================================================ */
function lliscarAlumnes(el,moure){
  if(!el || el._lliscar) return;
  el._lliscar=true;
  let x0=null,y0=null,t0=0,dins=false;
  el.addEventListener("touchstart",e=>{
    if(e.touches.length!==1){ x0=null; return; }
    /* Dins d'una zona que es desplaça de costat (taula ampla), no es canvia d'alumne/a. */
    const sc=e.target.closest&&e.target.closest(".cxn-wrap,.tn-wrap,.scroll,input,textarea,select");
    dins=!!(sc && sc.scrollWidth>sc.clientWidth+4) || !!(sc && /INPUT|TEXTAREA|SELECT/.test(sc.tagName));
    x0=e.touches[0].clientX; y0=e.touches[0].clientY; t0=Date.now();
  },{passive:true});
  el.addEventListener("touchend",e=>{
    if(x0==null || dins) { x0=null; return; }
    const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0, dt=Date.now()-t0;
    x0=null;
    if(dt>700 || Math.abs(dx)<70 || Math.abs(dx)<Math.abs(dy)*2) return;
    moure(dx<0? 1 : -1);
  },{passive:true});
}
