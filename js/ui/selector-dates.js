/* ============================================================================
   Quadern d'avaluació · Selector de dates en valencià
   js/ui/selector-dates.js

   El calendari desplegable dels camps de data (<input type="date"> i
   <input type="month">) el pinta el navegador en l'idioma del sistema, i en
   un ordinador configurat en castellà ix «noviembre», «lu ma mi…». Este mòdul
   amaga eixe desplegable i n'obri un de propi en valencià, amb la setmana
   començant en dilluns.
   - Els camps continuen sent <input type="date">: es pot escriure la data
     amb el teclat com sempre, i el valor (AAAA-MM-DD) no canvia.
   - Només en ordinadors (ratolí o ratolí tàctil). En tauletes i mòbils es
     manté el selector del sistema, que és el que s'hi espera.
   - En triar un dia es llancen els esdeveniments «input» i «change», igual
     que faria el navegador, així els onchange de l'app funcionen igual.
   ============================================================================ */
(function(){
  "use strict";
  let fi=false;
  try{ fi=window.matchMedia && window.matchMedia("(pointer:fine)").matches; }catch(e){}
  if(!fi) return;

  const MESOS=["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"];
  const MESOS_CURTS=["gen.","febr.","març","abr.","maig","juny","jul.","ag.","set.","oct.","nov.","des."];
  const DIES=["Dl","Dt","Dc","Dj","Dv","Ds","Dg"];
  const DIES_LLARGS=["dilluns","dimarts","dimecres","dijous","divendres","dissabte","diumenge"];
  const pad=n=>String(n).padStart(2,"0");
  const iso=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  const hui=()=>{ const d=new Date(); return iso(d.getFullYear(),d.getMonth(),d.getDate()); };
  const mesDe=(m)=>/^[aeiouà]/i.test(MESOS[m])?"d'"+MESOS[m]:"de "+MESOS[m];

  const ICONA="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7a90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>');
  const css=`
  input.sd-camp::-webkit-calendar-picker-indicator{display:none !important;}
  input.sd-camp{background-image:url("${ICONA}") !important;background-repeat:no-repeat !important;background-position:right 8px center !important;background-size:16px 16px !important;padding-right:30px !important;}
  .sd-pop{position:fixed;z-index:100000;width:268px;padding:10px;border-radius:12px;background:var(--card,#fff);color:var(--ink,#141b28);
    border:1px solid var(--line,#dde3ec);box-shadow:0 20px 40px -8px rgba(10,17,32,.25),0 6px 12px -4px rgba(10,17,32,.12);
    font:13px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;user-select:none}
  .sd-cap{display:flex;align-items:center;gap:4px;margin-bottom:8px}
  .sd-cap .sd-tit{flex:1;text-align:center;font-weight:700;font-size:14px;text-transform:capitalize;cursor:pointer;border-radius:8px;padding:5px 4px;border:0;background:none;color:inherit;font:inherit;font-weight:700}
  .sd-cap .sd-tit:hover,.sd-nav:hover,.sd-dia:hover,.sd-mes:hover,.sd-peu button:hover{background:var(--overlay-hover,rgba(10,17,32,.08))}
  .sd-nav{width:30px;height:30px;border:0;border-radius:8px;background:none;color:inherit;font-size:17px;cursor:pointer;line-height:1}
  .sd-graella{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .sd-graella.sd-mesos{grid-template-columns:repeat(3,1fr);gap:6px}
  .sd-ds{text-align:center;font-size:11px;font-weight:700;color:var(--mut,#5b6b82);padding:4px 0}
  .sd-dia,.sd-mes{border:0;background:none;color:inherit;font:inherit;border-radius:8px;cursor:pointer;height:32px;padding:0}
  .sd-mes{height:38px;text-transform:capitalize}
  .sd-dia.sd-fora{color:var(--mut,#5b6b82);opacity:.55}
  .sd-dia.sd-cap-setmana{color:var(--mut,#5b6b82)}
  .sd-dia.sd-hui,.sd-mes.sd-hui{box-shadow:inset 0 0 0 1.5px var(--accent,#d7b463)}
  .sd-dia.sd-sel,.sd-mes.sd-sel{background:var(--brand-3,#25456b) !important;color:#fff !important;font-weight:700}
  .sd-dia:disabled,.sd-mes:disabled{opacity:.3;cursor:default;background:none !important}
  .sd-dia:focus-visible,.sd-mes:focus-visible,.sd-nav:focus-visible,.sd-tit:focus-visible,.sd-peu button:focus-visible{outline:2px solid var(--accent,#d7b463);outline-offset:1px}
  .sd-peu{display:flex;justify-content:space-between;margin-top:8px;border-top:1px solid var(--line,#dde3ec);padding-top:8px}
  .sd-peu button{border:0;background:none;color:var(--accent-texto,#7d5a12);font:inherit;font-weight:600;cursor:pointer;padding:5px 8px;border-radius:8px}
  body[data-tema="oscuro"] .sd-dia.sd-sel,body[data-tema="oscuro"] .sd-mes.sd-sel{background:var(--accent,#d7b463) !important;color:var(--accent-ink,#1c1408) !important}
  @media print{.sd-pop{display:none !important}}`;
  function posaEstil(){
    if(document.getElementById("sdEstil")) return;
    const st=document.createElement("style"); st.id="sdEstil"; st.textContent=css;
    (document.head||document.documentElement).appendChild(st);
  }

  const esCamp=el=>el && el.tagName==="INPUT" && (el.type==="date" || el.type==="month") && !el.hasAttribute("data-selector-natiu");
  function marca(arrel){
    if(!arrel || arrel.nodeType!==1) return;
    if(esCamp(arrel)) arrel.classList.add("sd-camp");
    if(arrel.querySelectorAll) arrel.querySelectorAll('input[type="date"],input[type="month"]').forEach(el=>{ if(esCamp(el)) el.classList.add("sd-camp"); });
  }

  let pop=null, camp=null, vista=null; // vista: {y,m,mode:"dies"|"mesos"}
  const llegix=v=>{ const m=/^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v||""); return m?{y:+m[1],m:+m[2]-1,d:m[3]?+m[3]:1}:null; };

  function tanca(tornaFocus){
    if(!pop) return;
    pop.remove(); pop=null;
    const c=camp; camp=null; vista=null;
    if(tornaFocus && c) try{ c.focus(); }catch(e){}
  }
  function posa(valor){
    const c=camp; if(!c) return;
    c.value=valor;
    c.dispatchEvent(new Event("input",{bubbles:true}));
    c.dispatchEvent(new Event("change",{bubbles:true}));
    tanca(true);
  }
  function fora(valor){
    const c=camp; if(!c) return false;
    const mn=c.min, mx=c.max;
    if(c.type==="month"){ return (mn && valor<mn.slice(0,7)) || (mx && valor>mx.slice(0,7)); }
    return (mn && valor<mn) || (mx && valor>mx);
  }
  function pinta(focusSel){
    if(!pop||!vista) return;
    const {y,m,mode}=vista;
    const actual=camp.value, avui=hui();
    let h="";
    if(mode==="mesos"){
      h+=`<div class="sd-cap"><button type="button" class="sd-nav" data-a="any-1" aria-label="Any anterior">‹</button><span class="sd-tit" style="cursor:default">${y}</span><button type="button" class="sd-nav" data-a="any+1" aria-label="Any següent">›</button></div><div class="sd-graella sd-mesos">`;
      for(let i=0;i<12;i++){
        const v=`${y}-${pad(i+1)}`;
        const cl=["sd-mes"]; if(actual.slice(0,7)===v) cl.push("sd-sel"); if(avui.slice(0,7)===v) cl.push("sd-hui");
        h+=`<button type="button" class="${cl.join(" ")}" data-mes="${i}" aria-label="${MESOS[i]} de ${y}" ${camp.type==="month"&&fora(v)?"disabled":""}>${MESOS_CURTS[i]}</button>`;
      }
      h+=`</div>`;
      if(camp.type==="month") h+=`<div class="sd-peu"><button type="button" data-a="buida">Esborrar</button><button type="button" data-a="hui">Este mes</button></div>`;
    }else{
      h+=`<div class="sd-cap"><button type="button" class="sd-nav" data-a="mes-1" aria-label="Mes anterior">‹</button><button type="button" class="sd-tit" data-a="mesos" title="Triar el mes">${MESOS[m]} ${y}</button><button type="button" class="sd-nav" data-a="mes+1" aria-label="Mes següent">›</button></div><div class="sd-graella" role="grid">`;
      DIES.forEach((d,i)=>{ h+=`<div class="sd-ds" title="${DIES_LLARGS[i]}">${d}</div>`; });
      const primer=new Date(y,m,1); const desfase=(primer.getDay()+6)%7;
      const inici=new Date(y,m,1-desfase);
      for(let i=0;i<42;i++){
        const d=new Date(inici.getFullYear(),inici.getMonth(),inici.getDate()+i);
        const v=iso(d.getFullYear(),d.getMonth(),d.getDate());
        const cl=["sd-dia"]; if(d.getMonth()!==m) cl.push("sd-fora"); if(i%7>=5) cl.push("sd-cap-setmana");
        if(v===actual) cl.push("sd-sel"); if(v===avui) cl.push("sd-hui");
        h+=`<button type="button" class="${cl.join(" ")}" data-dia="${v}" tabindex="-1" aria-label="${DIES_LLARGS[(d.getDay()+6)%7]}, ${d.getDate()} ${mesDe(d.getMonth())} de ${d.getFullYear()}" ${fora(v)?"disabled":""}>${d.getDate()}</button>`;
        if(i===34 && new Date(y,m+1,0).getDate()+desfase<=35) break;
      }
      h+=`</div><div class="sd-peu"><button type="button" data-a="buida">Esborrar</button><button type="button" data-a="hui">Hui</button></div>`;
    }
    pop.innerHTML=h;
    if(mode==="dies"){
      const bs=[...pop.querySelectorAll(".sd-dia:not(:disabled)")];
      const f=bs.find(b=>b.dataset.dia===focusSel) || bs.find(b=>b.classList.contains("sd-sel")) || bs.find(b=>b.classList.contains("sd-hui")) || bs.find(b=>!b.classList.contains("sd-fora")) || bs[0];
      if(f){ f.tabIndex=0; if(focusSel!==undefined) f.focus(); }
    }else if(focusSel!==undefined){
      const f=pop.querySelector(".sd-mes.sd-sel")||pop.querySelector(".sd-mes"); if(f) f.focus();
    }
  }
  function situa(){
    if(!pop||!camp) return;
    const r=camp.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
    let x=Math.min(Math.max(8,r.left), window.innerWidth-w-8);
    let y=r.bottom+4; if(y+h>window.innerHeight-8 && r.top-h-4>8) y=r.top-h-4;
    pop.style.left=x+"px"; pop.style.top=Math.max(8,y)+"px";
  }
  function obri(el,ambTeclat){
    if(camp===el){ tanca(); return; }
    tanca();
    posaEstil();
    camp=el;
    const v=llegix(el.value)||llegix(hui());
    vista={y:v.y,m:v.m,mode:el.type==="month"?"mesos":"dies"};
    pop=document.createElement("div"); pop.className="sd-pop"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-label",el.type==="month"?"Triar el mes":"Triar la data");
    pop.setAttribute("data-sense-traduccio","");
    document.body.appendChild(pop);
    pinta(null);
    situa();
    pop.addEventListener("mousedown",e=>e.preventDefault());
    pop.addEventListener("click",e=>{
      const b=e.target.closest("button"); if(!b||b.disabled) return;
      e.stopPropagation();
      if(b.dataset.dia){ posa(b.dataset.dia); return; }
      if(b.dataset.mes!=null){
        const i=+b.dataset.mes;
        if(camp.type==="month"){ posa(`${vista.y}-${pad(i+1)}`); return; }
        vista.m=i; vista.mode="dies"; pinta(); return;
      }
      const a=b.dataset.a;
      if(a==="mes-1"||a==="mes+1"){ const d=new Date(vista.y,vista.m+(a==="mes+1"?1:-1),1); vista.y=d.getFullYear(); vista.m=d.getMonth(); pinta(); }
      else if(a==="any-1"||a==="any+1"){ vista.y+=a==="any+1"?1:-1; pinta(); }
      else if(a==="mesos"){ vista.mode="mesos"; pinta(); }
      else if(a==="hui"){ posa(camp.type==="month"?hui().slice(0,7):hui()); }
      else if(a==="buida"){ posa(""); }
    });
    pop.addEventListener("keydown",e=>{
      if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); tanca(true); return; }
      const b=document.activeElement;
      if(vista.mode==="dies" && b && b.dataset && b.dataset.dia){
        const salts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
        if(salts[e.key]!=null){
          e.preventDefault();
          const p=llegix(b.dataset.dia); const d=new Date(p.y,p.m,p.d+salts[e.key]);
          const v=iso(d.getFullYear(),d.getMonth(),d.getDate());
          if(d.getMonth()!==vista.m||d.getFullYear()!==vista.y){ vista.y=d.getFullYear(); vista.m=d.getMonth(); }
          pinta(v);
        }
      }
    });
  }

  /* Clic en la icona (la vora dreta del camp) */
  document.addEventListener("click",e=>{
    const el=e.target;
    if(pop && !pop.contains(el) && el!==camp) tanca();
    if(!esCamp(el) || el.disabled || el.readOnly) return;
    const r=el.getBoundingClientRect();
    if(e.clientX>=r.right-32){ e.preventDefault(); obri(el); }
  },true);
  /* Teclat: Alt+↓, F4 o Espai obrin el selector, com el del navegador */
  document.addEventListener("keydown",e=>{
    const el=e.target;
    if(!esCamp(el) || el.disabled || el.readOnly) return;
    if((e.altKey && e.key==="ArrowDown") || e.key==="F4"){ e.preventDefault(); obri(el,true); }
    else if(e.key==="Escape" && pop){ tanca(); }
  },true);
  /* Si algun codi crida showPicker(), també obrim el nostre */
  try{
    const orig=HTMLInputElement.prototype.showPicker;
    if(orig) HTMLInputElement.prototype.showPicker=function(){ if(esCamp(this)) return obri(this); return orig.apply(this,arguments); };
  }catch(e){}
  window.addEventListener("resize",()=>tanca());
  window.addEventListener("scroll",e=>{ if(pop && !(e.target && e.target.nodeType===1 && pop.contains(e.target))) situa(); },true);
  document.addEventListener("focusin",e=>{ if(pop && !pop.contains(e.target) && e.target!==camp) tanca(); });

  function inici(){
    posaEstil(); marca(document.body);
    new MutationObserver(ms=>{ for(const m of ms) m.addedNodes.forEach(marca); }).observe(document.body,{childList:true,subtree:true});
  }
  if(document.body) inici(); else document.addEventListener("DOMContentLoaded",inici);
  window.__selectorDates={obri,tanca};
})();
