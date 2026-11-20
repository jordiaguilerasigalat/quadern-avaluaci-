/* ============================================================================
   Quadern d'avaluació · Ordenar els grups arrossegant-los
   js/ui/ordenar-grups.js
   Qualsevol llista amb l'atribut data-ordre-grups i elements amb
   data-ordre-grup="<id del grup>" es pot reordenar:
   - amb el ratolí: es prem i s'arrossega (a partir de 6 px, així un clic normal
     continua obrint el grup);
   - amb el dit: es manté premut mig segon i després s'arrossega (el desplaçament
     normal de la pàgina no es veu afectat).
   L'ordre es guarda reordenant state.grupos, que és la llista que usen totes
   les pantalles (pestanyes de dalt, Inici, desplegables…).
   ============================================================================ */
(function(){
  let drag=null; // {el, cont, x0, y0, actiu, timer, pointerId, moguts}
  let suprimirClic=false;

  function elementsDe(cont){ return [...cont.querySelectorAll("[data-ordre-grup]")].filter(e=>e.closest("[data-ordre-grups]")===cont); }

  function activar(){
    if(!drag || drag.actiu) return;
    drag.actiu=true;
    drag.el.classList.add("ordre-arrossegant");
    drag.cont.classList.add("ordre-actiu");
    try{ drag.el.setPointerCapture(drag.pointerId); }catch(e){}
    if(navigator.vibrate && drag.tactil) try{ navigator.vibrate(15); }catch(e){}
  }

  function acabar(guardar){
    if(!drag) return;
    const d=drag; drag=null;
    clearTimeout(d.timer);
    if(!d.actiu) return;
    d.el.classList.remove("ordre-arrossegant");
    d.cont.classList.remove("ordre-actiu");
    suprimirClic=true; setTimeout(()=>{ suprimirClic=false; },0);
    if(!guardar || !d.moguts) { render(); return; }
    const ids=elementsDe(d.cont).map(e=>e.getAttribute("data-ordre-grup"));
    const pos=new Map(ids.map((id,i)=>[id,i]));
    // Els grups que no apareixen en esta llista conserven el seu lloc relatiu al final.
    const abans=state.grupos.slice();
    state.grupos.sort((a,b)=>{
      const pa=pos.has(a.id)?pos.get(a.id):ids.length+abans.indexOf(a);
      const pb=pos.has(b.id)?pos.get(b.id):ids.length+abans.indexOf(b);
      return pa-pb;
    });
    save(); render();
    if(typeof mostrarToast==="function") mostrarToast("✓ Ordre dels grups guardat");
  }

  document.addEventListener("pointerdown",e=>{
    if(e.button!==0 && e.pointerType==="mouse") return;
    const el=e.target.closest("[data-ordre-grup]"); if(!el) return;
    const cont=el.closest("[data-ordre-grups]"); if(!cont) return;
    if(e.target.closest("input,select,textarea,.gpillx,.danger")) return;
    drag={el,cont,x0:e.clientX,y0:e.clientY,actiu:false,pointerId:e.pointerId,tactil:e.pointerType!=="mouse",moguts:false};
    if(drag.tactil) drag.timer=setTimeout(activar,450);
  });

  document.addEventListener("pointermove",e=>{
    if(!drag || e.pointerId!==drag.pointerId) return;
    const dx=e.clientX-drag.x0, dy=e.clientY-drag.y0;
    if(!drag.actiu){
      if(drag.tactil){ if(Math.hypot(dx,dy)>10) { clearTimeout(drag.timer); drag=null; } return; }
      if(Math.hypot(dx,dy)<6) return;
      activar();
    }
    e.preventDefault();
    const sota=document.elementFromPoint(e.clientX,e.clientY);
    const desti=sota && sota.closest("[data-ordre-grup]");
    if(!desti || desti===drag.el || desti.closest("[data-ordre-grups]")!==drag.cont) return;
    const r=desti.getBoundingClientRect();
    // En graelles i files (targetes una al costat de l'altra) decidim per la meitat
    // esquerra/dreta; en llistes d'una sola columna, per la meitat de dalt/baix.
    const enFila = r.width < drag.cont.getBoundingClientRect().width*0.9;
    const despres = enFila ? (e.clientX>r.left+r.width/2) : (e.clientY>r.top+r.height/2);
    if(despres) desti.after(drag.el); else desti.before(drag.el);
    drag.moguts=true;
  },{passive:false});

  document.addEventListener("pointerup",e=>{ if(drag && e.pointerId===drag.pointerId) acabar(true); });
  document.addEventListener("pointercancel",e=>{ if(drag && e.pointerId===drag.pointerId) acabar(false); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && drag && drag.actiu) acabar(false); });
  // Després d'arrossegar, el «clic» final no ha d'obrir el grup.
  document.addEventListener("click",e=>{ if(suprimirClic){ e.stopPropagation(); e.preventDefault(); suprimirClic=false; } },true);
  // Mentre s'arrossega amb el dit, que el navegador no desplace la pàgina.
  document.addEventListener("touchmove",e=>{ if(drag && drag.actiu) e.preventDefault(); },{passive:false});
  // Evita el menú contextual del «mantindre premut» en mòbil sobre els grups.
  document.addEventListener("contextmenu",e=>{ if(drag && e.target.closest && e.target.closest("[data-ordre-grup]")) e.preventDefault(); });
})();
