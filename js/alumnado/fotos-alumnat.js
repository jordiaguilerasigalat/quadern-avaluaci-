/* ============================================================================
   Quadern d'avaluació · Foto de l'alumnat
   js/alumnado/fotos-alumnat.js

   Cada alumne/a pot tindre una foto xicoteta (a.foto, data URL JPEG de
   128×128) que es mostra com a avatar al costat del nom: llista d'Alumnat,
   Qualificar, Assistència, plànol d'aula, correcció i la fitxa.

   - La foto es retalla en quadrat i es redueix ací mateix, al navegador
     (unes 4-6 KB): no s'envia enlloc. Viu només en este dispositiu i en
     les còpies de seguretat (JSON) que faça el professorat.
   - Es pot posar des d'un fitxer o, al mòbil, amb la càmera.
   - Importació en bloc: els fitxers que es diuen com l'alumne/a
     («Pérez Martínez, Joan.jpg», «joan_perez.png»…) s'assignen sols.
   - En un grup on ningú té foto no es mostra res (ni inicials); si algú en
     té, qui no en té mostra les inicials perquè la llista quede alineada.
   - «Amagar les fotos» només afecta este dispositiu (per a projectar a classe).
   ============================================================================ */
const FOTO_PX=128, FOTO_QUALITAT=0.8;
const FOTO_CLAU_OCULTES="quadern_fotos_ocultes";
const FOTO_RE_VALIDA=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function fotosVisibles(){ try{ return localStorage.getItem(FOTO_CLAU_OCULTES)!=="1"; }catch(e){ return true; } }
function fotoValida(f){ return typeof f==="string" && f.length<400000 && FOTO_RE_VALIDA.test(f); }
function grupTeFotos(g){ return !!(g && (g.alumnos||[]).some(a=>fotoValida(a.foto))); }
function inicialsAlumne(al){
  const n=String(al.nombreP||"").trim(), c=String(al.apellidos||al.nombre||"").trim();
  return ((n[0]||"")+(c[0]||"")).toUpperCase() || "?";
}
function grupDeAlumne(al){
  const g=typeof grupoActual==="function"? grupoActual() : null;
  if(g && g.alumnos.includes(al)) return g;
  return (state.grupos||[]).find(x=>(x.alumnos||[]).includes(al)) || g;
}
/* Avatar. opts: {mida:px, forcar:true (mostra inicials encara que el grup no tinga fotos)} */
function avatarAlumneHTML(al,opts){
  opts=opts||{};
  if(!al) return "";
  const forcar=!!opts.forcar;
  if(!forcar && !fotosVisibles()) return "";
  const mida=opts.mida||26;
  const te=fotoValida(al.foto) && (forcar || fotosVisibles());
  if(!te && !forcar && !grupTeFotos(grupDeAlumne(al))) return "";
  const st=`width:${mida}px;height:${mida}px;font-size:${Math.round(mida*0.4)}px`;
  if(te) return `<img class="av-al" src="${al.foto}" alt="" width="${mida}" height="${mida}" style="${st}" loading="lazy" decoding="async">`;
  return `<span class="av-al av-ini" style="${st}" aria-hidden="true">${esc(inicialsAlumne(al))}</span>`;
}

/* ---- Reduir la imatge (quadrat centrat, una mica cap amunt per a no tallar la cara) ---- */
function fotoReduir(fitxer){
  return new Promise((resol,rebutja)=>{
    if(!fitxer || !/^image\//.test(fitxer.type||"image/")) return rebutja(new Error("no és una imatge"));
    const url=URL.createObjectURL(fitxer);
    const img=new Image();
    img.onload=()=>{
      try{
        const w=img.naturalWidth, h=img.naturalHeight, s=Math.min(w,h);
        const sx=(w-s)/2, sy=h>w? (h-s)*0.3 : 0;
        // Reducció per passos (meitat a meitat): queda més nítid que d'una vegada.
        let src=img, sxx=sx, syy=sy, ss=s;
        while(ss/2>FOTO_PX*1.5){
          const c=document.createElement("canvas"); const m=Math.round(ss/2); c.width=c.height=m;
          const cx=c.getContext("2d"); cx.imageSmoothingQuality="high"; cx.drawImage(src,sxx,syy,ss,ss,0,0,m,m);
          src=c; sxx=0; syy=0; ss=m;
        }
        const c=document.createElement("canvas"); c.width=c.height=FOTO_PX;
        const cx=c.getContext("2d"); cx.fillStyle="#fff"; cx.fillRect(0,0,FOTO_PX,FOTO_PX);
        cx.imageSmoothingQuality="high"; cx.drawImage(src,sxx,syy,ss,ss,0,0,FOTO_PX,FOTO_PX);
        resol(c.toDataURL("image/jpeg",FOTO_QUALITAT));
      }catch(e){ rebutja(e); }
      finally{ URL.revokeObjectURL(url); }
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); rebutja(new Error("no s'ha pogut llegir la imatge")); };
    img.src=url;
  });
}
function _alumneDelGrup(id){ const g=grupoActual(); return g? g.alumnos.find(a=>a.id===id) : null; }

/* ---- Una foto (des de la fitxa) ---- */
window.fotoTriar=(id,camera)=>{
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="image/*";
  if(camera) inp.setAttribute("capture","environment");
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    const a=_alumneDelGrup(id); if(!a) return;
    try{ a.foto=await fotoReduir(f); save(); render(); mostrarToast("📷 Foto posada"); }
    catch(e){ mostrarAviso("No s'ha pogut llegir eixa imatge. Prova amb una foto JPG o PNG.","Foto"); }
  };
  inp.click();
};
window.fotoLlevar=async(id)=>{
  const a=_alumneDelGrup(id); if(!a||!a.foto) return;
  if(!await confirmar(`Vols llevar la foto de ${a.nombre}?`,{ok:"Llevar la foto",peligro:true})) return;
  delete a.foto; save(); render(); mostrarToast("Foto llevada");
};
function fotoFitxaHTML(a){
  const mobil=(()=>{ try{ return matchMedia("(pointer:coarse)").matches; }catch(e){ return false; } })();
  const te=fotoValida(a.foto);
  return `<div class="flex" style="gap:12px;align-items:center;flex-wrap:wrap">
    ${avatarAlumneHTML(a,{mida:72,forcar:true})}
    <div class="flex" style="gap:6px;flex-wrap:wrap">
      <button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="fotoTriar('${escJS(a.id)}')">🖼️ ${te?"Canviar la foto":"Posar foto"}</button>
      ${mobil?`<button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="fotoTriar('${escJS(a.id)}',true)">📷 Fer foto</button>`:""}
      ${te?`<button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="fotoLlevar('${escJS(a.id)}')">🗑️ Llevar</button>`:""}
    </div>
    <span class="sub" style="margin:0;font-size:11.5px;flex-basis:100%">La foto es reduïx i es guarda només en este dispositiu (i en les teues còpies de seguretat).</span>
  </div>`;
}

/* ---- Importar fotos en bloc: el nom del fitxer ha de ser el de l'alumne/a ---- */
function _paraulesNom(s){ return normalizarTexto(s).replace(/[^a-z0-9ñç]+/g," ").trim().split(" ").filter(p=>p.length>1 || /\d/.test(p)); }
function fotoAlumnePerFitxer(g,nomFitxer){
  const base=String(nomFitxer||"").replace(/\.[^.]+$/,"");
  const pf=new Set(_paraulesNom(base)); if(!pf.size) return null;
  let millor=null, puntsMillor=0, empat=false;
  g.alumnos.forEach(a=>{
    const nom=_paraulesNom(a.nombreP), cog=_paraulesNom(a.apellidos||a.nombre);
    if(!nom.length && !cog.length) return;
    // Cal que hi siguen totes les paraules del nom i, com a mínim, el primer cognom.
    const okNom=nom.every(p=>pf.has(p));
    const okCog=cog.length? pf.has(cog[0]) : true;
    if(!okNom || !okCog) return;
    const punts=[...nom,...cog].filter(p=>pf.has(p)).length;
    if(punts>puntsMillor){ millor=a; puntsMillor=punts; empat=false; }
    else if(punts===puntsMillor) empat=true;
  });
  return empat? null : millor;
}
window.fotosImportarBloc=()=>{
  const g=grupoActual(); if(!g) return;
  const inp=document.createElement("input");
  inp.type="file"; inp.accept="image/*"; inp.multiple=true;
  inp.onchange=async()=>{
    const fitxers=[...(inp.files||[])]; if(!fitxers.length) return;
    let posades=0; const sense=[], errors=[];
    for(const f of fitxers){
      const a=fotoAlumnePerFitxer(g,f.name);
      if(!a){ sense.push(f.name); continue; }
      try{ a.foto=await fotoReduir(f); posades++; }catch(e){ errors.push(f.name); }
    }
    if(posades){ save(); render(); }
    const llista=arr=>arr.slice(0,15).join("\n")+(arr.length>15?`\n… i ${arr.length-15} més`:"");
    let msg=`S'han posat ${posades} foto${posades===1?"":"s"} de ${fitxers.length}.`;
    if(sense.length) msg+=`\n\nSense alumne/a que coincidisca (canvia el nom del fitxer o posa-la des de la fitxa):\n${llista(sense)}`;
    if(errors.length) msg+=`\n\nNo s'han pogut llegir:\n${llista(errors)}`;
    mostrarAviso(msg,"🖼️ Importar fotos");
  };
  inp.click();
};
window.fotosLlevarTotes=async()=>{
  const g=grupoActual(); if(!g) return;
  const n=g.alumnos.filter(a=>a.foto).length; if(!n) return;
  if(!await confirmar(`Vols llevar les ${n} fotos de ${g.nombre}? (Es pot desfer amb ↶)`,{ok:"Llevar les fotos",peligro:true})) return;
  g.alumnos.forEach(a=>{ delete a.foto; }); save(); render(); mostrarToast("Fotos llevades");
};
window.fotosAlternarVisibles=()=>{
  try{ if(fotosVisibles()) localStorage.setItem(FOTO_CLAU_OCULTES,"1"); else localStorage.removeItem(FOTO_CLAU_OCULTES); }catch(e){}
  render();
};
let fotosPanelObert=false;
window.fotosPanelAlternar=()=>{ fotosPanelObert=!fotosPanelObert; render(); };
function fotosBotoAlumnatHTML(g){
  const n=g.alumnos.filter(a=>fotoValida(a.foto)).length;
  return `<div style="position:relative">
    <button class="ghost" style="border:1px solid var(--line)" aria-expanded="${fotosPanelObert}" onclick="fotosPanelAlternar()">🖼️ Fotos${n?` (${n}/${g.alumnos.length})`:""}</button>
    ${fotosPanelObert?`<div class="card" style="position:absolute;right:0;top:100%;margin-top:6px;z-index:20;width:290px;padding:12px;display:grid;gap:8px">
      <div style="font-size:12.5px;color:var(--mut)">Posa la foto de cada alumne/a des de la seua <strong>fitxa</strong>, o importa-les totes d'una vegada: el nom de cada fitxer ha de ser el de l'alumne/a (per exemple <em>Pérez Martínez, Joan.jpg</em>).</div>
      <button class="btn small" onclick="fotosImportarBloc()">📥 Importar fotos…</button>
      <button class="ghost small" style="border:1px solid var(--line)" onclick="fotosAlternarVisibles()">${fotosVisibles()?"🙈 Amagar les fotos en este dispositiu":"👁️ Mostrar les fotos"}</button>
      ${n?`<button class="ghost small" style="border:1px solid var(--line)" onclick="fotosLlevarTotes()">🗑️ Llevar totes les fotos del grup</button>`:""}
      <div style="font-size:11.5px;color:var(--mut)">🔒 Les fotos són de menors: es guarden només en este navegador i en les còpies que tu descarregues. No es publiquen enlloc.</div>
    </div>`:""}
  </div>`;
}
