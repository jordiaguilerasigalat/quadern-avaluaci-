/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · archivos, PDF, control de calidad, versiones y banco de bloques
   editor/js/07-archivos-y-calidad.js
   ============================================================================ */
'use strict';
/* ---------- Archivos y PDF ---------- */
function slug(s) { return (s || 'examen').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'examen'; }
function saveFile() {
  const blob = new Blob([JSON.stringify({ app: 'editor-de-examenes', v: 1, exam: S.exam })], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: slug(S.exam.name) + '.examen.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Arxiu descarregat. Amb «Obrir» pots recuperar-lo en qualsevol ordinador.');
}
async function openFile(file) {
  try {
    const j = JSON.parse(await file.text());
    const ex = sanitizeExam(j.exam || j); ex.id = uid();
    loadExam(ex); toast('Examen obert: ' + ex.name);
  } catch (e) { toast('Aquest arxiu no és un examen vàlid'); }
}
function exportPdf() { runQualityGate('PDF', exportPdfDirect); }
async function exportPdfDirect() {
  if (!S.exam.body.length) return toast('Afig contingut a l\'examen abans d\'exportar');
  clearTimeout(renderTimer); await renderPreview();
  const go = () => {
    const old = document.title; document.title = S.exam.name || 'Examen';
    const back = () => { document.title = old; removeEventListener('afterprint', back); };
    addEventListener('afterprint', back);
    setTimeout(() => window.print(), 60);
  };
  if (LS.get('ee.nohelp', false)) go(); else exportHelp(go);
}

/* =====================================================================
   Control de calidad, versiones de recuperación y banco de bloques
   ===================================================================== */
function auditExam() {
  const findings = [], nodes = [];
  eachNode(S.exam.body || [], n => nodes.push(n));
  const add = (severity, title, detail, nodeId = null) => findings.push({ severity, title, detail, nodeId });
  if (!S.exam.body || !S.exam.body.length) add('error', 'L\'examen està buit', 'Afig almenys un bloc abans d\'exportar.');
  for (const n of nodes) {
    const name = TYPES[n.type]?.name || n.type;
    if (n.type === 'title' && !String(n.title || '').trim()) add('warning', 'Títol buit', 'El bloc de títol no conté cap títol.', n.id);
    if (n.type === 'question' && !String(n.title || '').trim() && !plainOf(n.text || '').trim()) add('warning', 'Pregunta sense enunciat', 'Afig un enunciat o un títol a la pregunta.', n.id);
    if (n.type === 'subquestion' && !plainOf(n.text || '').trim()) add('warning', 'Subpregunta buida', 'Comprova si falta el text d\'aquesta subpregunta.', n.id);
    if (n.type === 'text' && !plainOf(n.text || '').trim()) add('warning', 'Bloc de text buit', 'El bloc no conté text.', n.id);
    if (n.type === 'section' && !String(n.title || '').trim() && !plainOf(n.text || '').trim() && !(n.children || []).length) add('warning', 'Apartat buit', 'No hi ha títol, text ni blocs dins de l\'apartat.', n.id);
    if (n.type === 'image' && !n.src) add('warning', 'Imatge sense arxiu', 'El bloc d\'imatge no té cap imatge carregada.', n.id);
    if (n.type === 'table') {
      const rows = n.table?.cells || [], widths = rows.map(r => r.length);
      if (!rows.length) add('warning', 'Taula buida', 'La taula no té files.', n.id);
      else if (new Set(widths).size > 1) add('error', 'Taula irregular', 'Les files no tenen el mateix nombre de columnes; revisa o torna a apegar les dades.', n.id);
      if (rows.length && rows.every(r => r.every(c => !String(c ?? '').trim()))) add('warning', 'Taula sense contingut', 'Totes les cel·les estan buides.', n.id);
      if (n.table?.header && rows.length < 2) add('warning', 'Taula amb només capçalera', 'La taula té capçalera, però no files de contingut.', n.id);
    }
    if (n.type === 'box' && !String(n.title || '').trim() && !plainOf(n.text || '').trim()) add('warning', 'Requadre buit', 'El requadre no té títol ni text.', n.id);
    if (n.type === 'spacer' && num(n.height, 0) > 80) add('warning', 'Espai vertical gran', `${name}: ${num(n.height)} mm poden deixar molt d'espai en blanc.`, n.id);
  }
  const scored = nodes.some(n => String(n.points ?? '').trim() !== '' && isFinite(num(n.points, NaN)));
  if (scored) {
    const total = sumPoints(S.exam.body), expected = num(S.exam.num?.total, 10);
    if (Math.abs(total - expected) > 0.01) add('warning', 'La puntuació no coincideix', `La suma calculada és ${fmtNum(total)} i el total configurat és ${fmtNum(expected)}. Comprova si falta o sobra puntuació.`);
  }
  if (S.overflow > 0) add('warning', 'Blocs que desborden una pàgina', `La previsualització detecta ${S.overflow} bloc${S.overflow === 1 ? '' : 's'} més alt${S.overflow === 1 ? '' : 's'} que l'espai disponible. Revisa el bloc afectat i els seus marges.`);
  $$('#pages .atom img').filter(im => !im.complete || !im.naturalWidth).forEach(im => {
    const atom = im.closest('.atom');
    add('warning', 'Imatge que no s\'ha pogut carregar', 'Comprova que la imatge estiga incrustada correctament en l\'examen abans d\'exportar.', atom?.dataset.node || null);
  });
  return findings;
}
function showAuditDialog(findings, title, onContinue = null) {
  const body = h('div', {}, h('p', { style: { marginTop: 0 } }, findings.length ? `S'han detectat ${findings.length} incidènci${findings.length === 1 ? 'a' : 'es'}. Revisa els avisos abans de repartir l'examen.` : 'No s\'han detectat incidències en el contingut o la paginació.' ));
  if (findings.length) {
    const list = h('div', { class: 'audit-list' });
    findings.forEach(f => {
      const row = h('div', { class: 'audit-item ' + f.severity });
      row.append(h('span', { class: 'mark' }, f.severity === 'error' ? '✖' : '⚠'), h('div', { class: 'message' }, h('strong', {}, f.title), h('div', {}, f.detail)));
      if (f.nodeId) row.append(h('button', { class: 'btn sm', onclick: () => { closeDialog(); setView('side'); selectNode(f.nodeId, { scrollPreview: true }); } }, 'Anar al bloc'));
      list.append(row);
    });
    body.append(list);
  } else body.append(h('div', { class: 'note' }, 'La validació és automàtica, però no substitueix la revisió docent final, especialment d\'esquemes, imatges i puntuacions.'));
  const hasErrors = findings.some(f => f.severity === 'error');
  const actions = [{ label: 'Tancar' }];
  if (onContinue && !hasErrors) actions.push({ label: 'Continuar igualment', primary: true, fn: onContinue });
  openDialog(title, body, actions);
}
async function runQualityGate(target, onContinue = null) {
  if (S.exam) { clearTimeout(renderTimer); await renderPreview(); }
  const findings = auditExam();
  if (!findings.length) {
    if (onContinue) onContinue(); else toast('Validació completada: no s\'han detectat incidències.');
    return;
  }
  showAuditDialog(findings, `Revisió abans d'exportar a ${target}`, onContinue);
}

async function openVersionsDialog() {
  const wrap = h('div', {}, h('p', { style: { marginTop: 0 } }, 'Les versions es guarden localment en aquest navegador. Es creen còpies de recuperació durant el desat automàtic, com a molt cada dos minuts, i pots crear una versió manual en qualsevol moment.'));
  const list = h('div', { class: 'list' }); wrap.append(list);
  const refresh = async () => {
    list.textContent = '';
    const versions = (await eeDbAll('versions')).filter(v => v.examId === S.exam.id).sort((a,b) => b.at-a.at);
    if (!versions.length) list.append(h('div', { class: 'note' }, 'Encara no hi ha versions anteriors. Prem «Crear una versió ara» per a guardar un punt de restauració.'));
    versions.forEach(v => {
      const time = new Date(v.at).toLocaleString('ca-ES');
      list.append(h('div', { class: 'item' }, h('div', { class: 'n' }, h('b', {}, time), h('small', {}, `${v.reason === 'Autoguardado anterior' ? 'Desat automàtic anterior' : v.reason} · ${v.name}`)),
        h('button', { class: 'btn sm primary', onclick: async () => {
          if (!confirm(`Vols restaurar la versió del ${time}? Es conservarà una còpia de l'estat actual abans de restaurar.`)) return;
          await createRecoverySnapshot(S.exam, 'Còpia abans de restaurar', true);
          const restored = sanitizeExam(clone(v.exam)); closeDialog(); loadExam(restored); toast('Versió restaurada.');
        } }, 'Restaurar'),
        h('button', { class: 'btn sm danger', onclick: async () => { await eeDbDelete('versions', v.key); await refresh(); } }, 'Eliminar')));
    });
  };
  openDialog('Versions i recuperació', wrap, [
    { label: 'Crear una versió ara', primary: true, keep: true, fn: async () => {
      const ok = await createRecoverySnapshot(S.exam, 'Versió manual', true);
      toast(ok ? 'Versió manual guardada.' : 'No s\'ha pogut guardar la versió. Comprova l\'emmagatzematge del navegador.'); await refresh();
    } }, { label: 'Tancar' }
  ]);
  await refresh();
}
function nodeSnippetName(n) {
  return String(n.title || n.eyebrow || n.caption || TYPES[n.type]?.name || 'Bloc').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Bloc reutilitzable';
}
async function importReusableBank(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.snippets) ? parsed.snippets : (parsed.node ? [parsed] : []));
    if (!incoming.length) throw new Error('L\'arxiu no conté blocs reconeixibles.');
    let added = 0;
    for (const raw of incoming) {
      const sourceNode = raw.node || raw;
      if (!sourceNode || !TYPES[sourceNode.type]) continue;
      const safeNode = sanitizeExam({ body: [clone(sourceNode)] }).body[0];
      const snippet = { id: uid(), name: String(raw.name || nodeSnippetName(safeNode)).slice(0, 120), type: safeNode.type, created: Date.now() + added, node: safeNode };
      if (await eeDbPut('snippets', snippet)) added++;
    }
    if (!added) throw new Error('No s\'ha trobat cap bloc vàlid.');
    toast(`S'ha${added === 1 ? '' : 'n'} importat ${added} bloc${added === 1 ? '' : 's'} al banc.`);
    openReusableLibrary();
  } catch (err) { toast('No s\'ha pogut importar el banc: ' + (err?.message || 'arxiu no vàlid')); }
}
async function openReusableLibrary() {
  const wrap = h('div', {}, h('p', { style: { marginTop: 0 } }, 'Guarda una pregunta, apartat, taula, imatge o bloc complet amb els seus subblocs i format. El banc és local d\'aquest navegador; per a compartir-lo amb companys, usa Guardar arxiu o exporta l\'examen on l\'inserisques.'));
  const actionsTop = h('div', { class: 'bank-actions' });
  actionsTop.append(h('button', { class: 'btn primary', disabled: !S.sel, onclick: async () => {
    const found = S.sel && findNode(S.exam.body, S.sel); if (!found) return toast('Selecciona primer un bloc en l\'estructura.');
    const suggested = nodeSnippetName(found.node), name = prompt('Nom per a guardar aquest bloc:', suggested);
    if (!name || !name.trim()) return;
    const snippet = { id: uid(), name: name.trim(), type: found.node.type, created: Date.now(), node: clone(found.node) };
    const ok = await eeDbPut('snippets', snippet);
    if (ok) { toast('Bloc guardat en el banc.'); await refresh(); } else toast('No s\'ha pogut guardar el bloc.');
  } }, 'Guardar el bloc seleccionat'),
  h('button', { class: 'btn', onclick: async () => {
    const snippets = (await eeDbAll('snippets')).sort((a,b) => (a.created || 0)-(b.created || 0));
    if (!snippets.length) return toast('El banc està buit.');
    const blob = new Blob([JSON.stringify({ app: 'editor-de-examenes-banco', v: 1, exported: Date.now(), snippets }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'banco-bloques-examenes.json' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Banc exportat. Pots compartir el JSON amb el departament.');
  } }, 'Exportar el banc'),
  h('button', { class: 'btn', onclick: () => { closeDialog(); $('#fileSnippetOpen').click(); } }, 'Importar un banc'));
  wrap.append(actionsTop);
  const list = h('div', { class: 'list' }); wrap.append(list);
  const refresh = async () => {
    list.textContent = '';
    const snippets = (await eeDbAll('snippets')).sort((a,b) => (b.created || 0)-(a.created || 0));
    if (!snippets.length) list.append(h('div', { class: 'note' }, 'El banc està buit. Selecciona un bloc de l\'examen i guarda\'l ací.'));
    snippets.forEach(sn => list.append(h('div', { class: 'item' },
      h('div', { class: 'n' }, h('b', {}, sn.name), h('small', {}, `${TYPES[sn.type]?.name || sn.type} · ${new Date(sn.created).toLocaleDateString('ca-ES')}`)),
      h('button', { class: 'btn sm primary', onclick: () => {
        const node = cloneWithNewIds(sn.node);
        const found = S.sel && findNode(S.exam.body, S.sel);
        if (found) found.list.splice(found.index + 1, 0, node); else S.exam.body.push(node);
        S.sel = node.id; closeDialog(); change({ tree: true, insp: true, now: true }); toast('Bloc inserit en l\'examen.');
      } }, 'Inserir'),
      h('button', { class: 'btn sm danger', onclick: async () => { if (confirm(`Vols eliminar «${sn.name}» del banc?`)) { await eeDbDelete('snippets', sn.id); await refresh(); } } }, 'Eliminar'))));
  };
  openDialog('Banc de blocs reutilitzables', wrap, [{ label: 'Tancar' }]);
  await refresh();
}

