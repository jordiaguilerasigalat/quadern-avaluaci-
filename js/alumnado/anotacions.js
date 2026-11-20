/* ============================================================================
   Quadern d'avaluació · Anotacions ràpides de l'alumne/a
   js/alumnado/anotacions.js

   Dins de la fitxa de l'alumne/a (s'obri tocant el nom des de qualsevol
   pestanya): notes curtes amb data, de tipus positiva / a millorar / nota,
   amb una foto (reduïda a 1024 px en JPEG) o un àudio curt (màxim 60 s).
   Es guarden en grupo.anotacions = [{id,alumnoId,fecha,tipus,text,foto,audio,creat}].
   Són privades: no ixen en cap informe. En començar un curs nou s'esborren
   amb la resta de dades del grup. Ocupen espai en les còpies: per això les
   fotos es redueixen i l'àudio es limita.
   ============================================================================ */
const ANOT_TIPUS={positiva:{ico:"👍",nom:"Positiva"},millora:{ico:"👎",nom:"A millorar"},nota:{ico:"📝",nom:"Nota"}};
const ANOT_MAX_AUDIO_S=60;
let _anotEsborrany={alumnoId:"",text:"",tipus:"nota",fecha:"",foto:"",audio:""};
let _anotGravacio=null;
function _anotFotoValida(s){ return typeof s==="string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s); }
function _anotAudioValid(s){ return typeof s==="string" && /^data:audio\/[a-z0-9.+-]+(;codecs=[a-z0-9.,-]+)?;base64,[A-Za-z0-9+/=]+$/i.test(s); }
function anotacionsDe(g,alId){
  if(!Array.isArray(g.anotacions)) g.anotacions=[];
  return g.anotacions.filter(x=>x&&x.alumnoId===alId).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||(b.creat||0)-(a.creat||0));
}
function _anotEsb(alId){
  if(_anotEsborrany.alumnoId!==alId){ _anotAturarGravacio(true); _anotEsborrany={alumnoId:alId,text:"",tipus:"nota",fecha:"",foto:"",audio:""}; }
  return _anotEsborrany;
}
function _anotMida(s){ return s? Math.round(s.length*3/4/1024) : 0; }
function anotacionsBlocHTML(g,a){
  const llista=anotacionsDe(g,a.id), e=_anotEsb(a.id), totes=!!state.ui.anotTotes;
  const vist=totes? llista : llista.slice(0,5);
  const gravant=!!(_anotGravacio&&_anotGravacio.alumnoId===a.id);
  const tipusBtn=Object.entries(ANOT_TIPUS).map(([k,t])=>`<button type="button" class="chip${e.tipus===k?" on":""}" aria-pressed="${e.tipus===k}" onclick="anotTipus('${k}')">${t.ico} ${t.nom}</button>`).join("");
  const adjunts=[
    _anotFotoValida(e.foto)? `<span class="flex" style="gap:6px;align-items:center"><img src="${e.foto}" alt="Foto adjunta" style="height:48px;border-radius:6px;border:1px solid var(--line)" class="priv"><button type="button" class="ghost small" aria-label="Llevar la foto" onclick="anotLlevar('foto')">✕</button></span>` : "",
    _anotAudioValid(e.audio)? `<span class="flex" style="gap:6px;align-items:center"><audio controls src="${e.audio}" style="height:32px;max-width:220px"></audio><button type="button" class="ghost small" aria-label="Llevar l'àudio" onclick="anotLlevar('audio')">✕</button></span>` : ""
  ].filter(Boolean).join("");
  const item=x=>{
    const t=ANOT_TIPUS[x.tipus]||ANOT_TIPUS.nota;
    return `<li class="anotItem" style="border-top:1px solid var(--line);padding:6px 0;display:flex;gap:8px;align-items:flex-start">
      <span title="${esc(t.nom)}" aria-label="${esc(t.nom)}">${t.ico}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;color:var(--mut)">${esc(fmt2(x.fecha))}</div>
        ${x.text?`<div class="priv" style="font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(x.text)}</div>`:""}
        <div class="flex" style="gap:8px;flex-wrap:wrap;margin-top:${x.foto||x.audio?4:0}px">
          ${_anotFotoValida(x.foto)?`<a href="#" onclick="event.preventDefault();anotVeureFoto('${escJS(x.id)}')"><img src="${x.foto}" alt="Foto de l'anotació" class="priv" style="height:64px;border-radius:6px;border:1px solid var(--line)"></a>`:""}
          ${_anotAudioValid(x.audio)?`<audio controls src="${x.audio}" style="height:32px;max-width:240px"></audio>`:""}
        </div>
      </div>
      <button type="button" class="ghost small" aria-label="Esborrar l'anotació" title="Esborrar" onclick="anotEsborrar('${escJS(x.id)}')">🗑️</button>
    </li>`;
  };
  return `<div class="anotBloc" style="border:1px solid var(--line);border-radius:10px;padding:8px 10px">
    <div style="font-size:12px;font-weight:700;color:var(--mut);margin-bottom:6px">📝 Anotacions${llista.length?` (${llista.length})`:""}</div>
    <div class="flex" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${tipusBtn}
      <input type="date" class="in" aria-label="Data de l'anotació" style="padding:4px 8px;font-size:12.5px" value="${esc(e.fecha||fechaISOLocal())}" onchange="anotData(this.value)">
    </div>
    <textarea class="in priv" id="anotText" rows="2" style="width:100%;resize:vertical" aria-label="Text de l'anotació" placeholder="Què ha passat hui? (p. ex. «Ha explicat molt bé l'exercici a la pissarra»)" oninput="anotEscriure(this.value)">${esc(e.text)}</textarea>
    ${adjunts?`<div class="flex" style="gap:10px;flex-wrap:wrap;margin-top:6px">${adjunts}</div>`:""}
    <div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">
      <label class="ghost small" style="border:1px solid var(--line);cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:8px">📷 Foto
        <input type="file" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0" onchange="anotFoto(this)"></label>
      ${gravant
        ? `<button type="button" class="ghost small" style="border:1px solid var(--danger);color:var(--danger)" onclick="anotAturarGravacio()">⏹️ Aturar (<span id="anotSeg">0</span> s)</button>`
        : `<button type="button" class="ghost small" style="border:1px solid var(--line)" onclick="anotGravar()" title="Màxim ${ANOT_MAX_AUDIO_S} segons">🎙️ Àudio</button>`}
      <span style="flex:1"></span>
      <button type="button" class="btn small" onclick="anotDesar()">Desa l'anotació</button>
    </div>
    ${vist.length?`<ul style="list-style:none;margin:8px 0 0;padding:0">${vist.map(item).join("")}</ul>`:""}
    ${llista.length>5?`<button type="button" class="ghost small" style="margin-top:4px" onclick="state.ui.anotTotes=${!totes};save();render()">${totes?"Mostra només les últimes":`Mostra-les totes (${llista.length})`}</button>`:""}
  </div>`;
}
function _anotRepintar(){ render(); }
window.anotEscriure=v=>{ _anotEsborrany.text=v; };
window.anotTipus=k=>{ if(ANOT_TIPUS[k]){ _anotEsborrany.tipus=k; _anotRepintar(); } };
window.anotData=v=>{ _anotEsborrany.fecha=/^\d{4}-\d{2}-\d{2}$/.test(v)?v:""; };
window.anotLlevar=k=>{ _anotEsborrany[k]=""; _anotRepintar(); };
window.anotDesar=()=>{
  const g=grupoActual(), alId=state.ui.fichaAlumnoId; if(!g||!alId) return;
  const e=_anotEsb(alId), text=(e.text||"").trim();
  if(!text && !e.foto && !e.audio){ mostrarToast("Escriu alguna cosa o afig una foto o un àudio"); return; }
  if(!Array.isArray(g.anotacions)) g.anotacions=[];
  g.anotacions.push({id:uid(),alumnoId:alId,fecha:e.fecha||fechaISOLocal(),tipus:e.tipus,text,foto:_anotFotoValida(e.foto)?e.foto:"",audio:_anotAudioValid(e.audio)?e.audio:"",creat:Date.now()});
  _anotEsborrany={alumnoId:alId,text:"",tipus:e.tipus,fecha:e.fecha,foto:"",audio:""};
  save(); render(); mostrarToast("✓ Anotació desada");
};
window.anotEsborrar=async id=>{
  const g=grupoActual(); if(!g||!Array.isArray(g.anotacions)) return;
  const i=g.anotacions.findIndex(x=>x.id===id); if(i<0) return;
  if(!(await confirmar("Esborrar aquesta anotació?",{ok:"Esborrar",peligro:true}))) return;
  g.anotacions.splice(i,1); save(); render();
};
window.anotVeureFoto=id=>{
  const g=grupoActual(); const x=g&&(g.anotacions||[]).find(y=>y.id===id); if(!x||!_anotFotoValida(x.foto)) return;
  const w=window.open("","_blank"); if(!w) return;
  w.document.title="Foto"; const img=w.document.createElement("img"); img.src=x.foto; img.style.maxWidth="100%"; w.document.body.style.margin="0"; w.document.body.appendChild(img);
};
/* Foto: es redueix al costat llarg de 1024 px i es guarda en JPEG (unes desenes de kB). */
function anotReduirFoto(fitxer,max){
  max=max||1024;
  return new Promise((ok,ko)=>{
    const url=URL.createObjectURL(fitxer), img=new Image();
    img.onload=()=>{
      const f=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(img.naturalWidth*f)); c.height=Math.max(1,Math.round(img.naturalHeight*f));
      c.getContext("2d").drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg",0.7));
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); ko(new Error("imatge")); };
    img.src=url;
  });
}
window.anotFoto=async inp=>{
  const f=inp.files&&inp.files[0]; inp.value=""; if(!f) return;
  if(!/^image\//.test(f.type)){ mostrarToast("Això no és una imatge"); return; }
  try{ _anotEsborrany.foto=await anotReduirFoto(f); _anotRepintar(); mostrarToast(`✓ Foto afegida (${_anotMida(_anotEsborrany.foto)} kB)`); }
  catch(e){ mostrarAviso("No s'ha pogut llegir la imatge."); }
};
/* Àudio: MediaRecorder amb baixa qualitat de veu (unes 3 kB per segon). */
window.anotGravar=async()=>{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==="undefined"){ mostrarAviso("Aquest navegador no pot gravar àudio."); return; }
  const alId=state.ui.fichaAlumnoId; if(!alId) return;
  let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ mostrarAviso("No s'ha pogut usar el micròfon. Comprova que el navegador en té permís."); return; }
  const tipus=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t));
  let rec; try{ rec=new MediaRecorder(stream,Object.assign({audioBitsPerSecond:24000},tipus?{mimeType:tipus}:{})); }
  catch(e){ stream.getTracks().forEach(t=>t.stop()); mostrarAviso("No s'ha pogut començar la gravació."); return; }
  const trossos=[]; const inici=Date.now();
  _anotGravacio={alumnoId:alId,rec,stream,descartar:false,
    rellotge:setInterval(()=>{ const s=Math.round((Date.now()-inici)/1000); const el=document.getElementById("anotSeg"); if(el) el.textContent=s; if(s>=ANOT_MAX_AUDIO_S) anotAturarGravacio(); },500)};
  const G=_anotGravacio;
  rec.ondataavailable=ev=>{ if(ev.data&&ev.data.size) trossos.push(ev.data); };
  rec.onstop=()=>{
    clearInterval(G.rellotge); stream.getTracks().forEach(t=>t.stop());
    if(_anotGravacio===G) _anotGravacio=null;
    if(G.descartar||!trossos.length){ _anotRepintar(); return; }
    const blob=new Blob(trossos,{type:(rec.mimeType||tipus||"audio/webm").split(";")[0]});
    const fr=new FileReader();
    fr.onload=()=>{ const d=String(fr.result||""); if(_anotEsborrany.alumnoId===G.alumnoId && _anotAudioValid(d)){ _anotEsborrany.audio=d; mostrarToast(`✓ Àudio afegit (${_anotMida(d)} kB)`); } _anotRepintar(); };
    fr.readAsDataURL(blob);
  };
  rec.start(); _anotRepintar();
};
function _anotAturarGravacio(descartar){
  const G=_anotGravacio; if(!G) return;
  G.descartar=!!descartar; try{ if(G.rec.state!=="inactive") G.rec.stop(); }catch(e){}
}
window.anotAturarGravacio=()=>_anotAturarGravacio(false);
