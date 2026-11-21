/* ============================================================================
   Cuaderno del profesor · Informes y exportaciones (CSV)
   js/informes/exportaciones.js
   ============================================================================ */

/* =================================================================
   Informes y Exportaciones
   ================================================================= */
window.exportarCSVGrupo = () => {
   const grupo = grupoActual();
   const idx = catIndex(grupo.catalogoKey);
   const trim = state.ui.trim;
   const ccKeys = Object.keys(COMP_CLAVE).filter(cc => idx.cat.ces.some(ce => ce.cc.includes(cc)));
   
   const q = s => '"'+String(s??"").replace(/"/g,'""')+'"';
   let csv = `Alumne;Nota ${TRIMESTRES[trim]} (mitjana);Nota ${TRIMESTRES[trim]} (acta);Qualificacio ${TRIMESTRES[trim]};Nota final (mitjana);Nota final (acta);Qualificacio final`;
   const qual = teQualitativaCE(grupo);
   if(qual) csv += `;Per competencies (qualitativa) ${TRIMESTRES[trim]};Per competencies (qualitativa) final`;
   csv += `;Nota ITACA ${TRIMESTRES[trim]};Nota ITACA final`;
   ccKeys.forEach(k => csv += `;${k}`);
   csv += "\n";

   grupo.alumnos.forEach(a => {
      const t = notaTrimestre(grupo, a.id, trim);
      const f = notaFinal(grupo, a.id);
      const etqT = etiquetaNota(t, grupo);
      const etqF = etiquetaNota(f, grupo);
      csv += `${q(a.nombre)};${t==null?'':t.toFixed(2).replace('.',',')};${t==null?'':notaActa(t,grupo)};${etqT?etqT.etq:''};${f==null?'':f.toFixed(2).replace('.',',')};${f==null?'':notaActa(f,grupo)};${etqF?etqF.etq:''}`;
      if(qual){ const qT=etiquetaQualitativaCE(grupo,a.id,trim), qF=etiquetaQualitativaCE(grupo,a.id,"final"); csv += `;${qT?qT.etq:''};${qF?qF.etq:''}`; }
      { const iT=notaItaca(grupo,a.id,trim), iF=notaItaca(grupo,a.id,"final"); const ff=x=>x==null?'':String(x).replace('.',','); csv += `;${ff(iT)};${ff(iF)}`; }
      ccKeys.forEach(k => {
         const val = scoreCC(grupo, a.id, k);
         const nv = nivel(grupo, val);
         csv += `;${nv?nv.etq:'-'}`;
      });
      csv += "\n";
   });

   const blob = new Blob(["\ufeff" + csv], {type: "text/csv;charset=utf-8;"});
   const u = URL.createObjectURL(blob); 
   const a = document.createElement("a");
   a.href = u; 
   a.download = `notas-${grupo.nombre.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-trim${trim+1}.csv`; 
   a.click(); 
   URL.revokeObjectURL(u);
};

