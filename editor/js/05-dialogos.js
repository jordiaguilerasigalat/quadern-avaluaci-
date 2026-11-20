/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · diálogos
   editor/js/05-dialogos.js
   ============================================================================ */
'use strict';
/* =====================================================================
   Diálogos
   ===================================================================== */
function openDialog(title, body, actions) {
  const d = $('#dlg'); d.textContent = '';
  d.append(h('div', { class: 'dh' }, h('h2', {}, title)), h('div', { class: 'db' }, body),
    h('div', { class: 'df' }, ...(actions || [{ label: 'Tancar' }]).map(a => h('button', { class: 'btn' + (a.primary ? ' primary' : ''), onclick: () => { if (!a.keep) d.close(); a.fn && a.fn(); } }, a.label))));
  if (!d.open) d.showModal();
}
const closeDialog = () => { const d = $('#dlg'); if (d.open) d.close(); };

function newExamDialog() {
  const card = (t, s, fn) => h('button', { class: 'card', onclick: () => { closeDialog(); fn(); } }, h('b', {}, t), h('span', {}, s));
  openDialog('Examen nou', h('div', {},
    h('p', { style: { margin: '0 0 10px', color: 'var(--ink-2)' } }, 'L\'examen actual queda guardat en aquest navegador; el trobaràs en «Obrir».'),
    h('div', { class: 'cards' },
      card('En blanc', 'Títol i dades de l\'alumne. Tu afiges els apartats.', () => loadExam(blankExam())),
      card('Còpia de l\'actual', 'Duplica aquest examen per a fer-ne una altra versió.', () => { const c = clone(S.exam); c.id = uid(); c.name += ' (copia)'; loadExam(sanitizeExam(c)); }))),
    [{ label: 'Cancel·lar' }]);
}
function openDialogList() {
  const idx = libIndex();
  const list = h('div', { class: 'list' });
  if (!idx.length) list.append(h('div', { class: 'note' }, 'Encara no hi ha exàmens guardats en aquest navegador.'));
  idx.forEach(it => {
    let armed = false;
    const del = h('button', { class: 'btn sm danger' }, 'Eliminar');
    del.onclick = () => { if (!armed) { armed = true; del.textContent = 'Segur?'; return; } deleteExamLocal(it.id); if (it.id === S.exam.id) { /* el actual se vuelve a guardar al editar */ } openDialogList(); };
    list.append(h('div', { class: 'item' }, h('div', { class: 'n' }, h('b', {}, it.name || 'Sense títol'), h('small', {}, new Date(it.updated).toLocaleString('es-ES'))),
      h('button', { class: 'btn sm primary', onclick: () => { const ex = loadExamLocal(it.id); closeDialog(); if (ex) loadExam(ex); else toast('No s\'ha pogut obrir aquest examen'); } }, 'Obrir'), del));
  });
  openDialog('Obrir examen', h('div', {}, list), [
    { label: 'Obrir un arxiu…', fn: () => $('#fileOpen').click() }, { label: 'Tancar' }]);
}
function exportHelp(go) {
  const cb = h('input', { type: 'checkbox' });
  const [W, H] = PAPERS[S.exam.page.size] || PAPERS.A4;
  openDialog('Exportar a PDF', h('div', {},
    h('p', { style: { margin: '0 0 8px' } }, 'S\'obrirà el quadre d\'impressió del navegador. Perquè el PDF isca idèntic a la previsualització, tria:'),
    h('ol', { style: { margin: '0 0 8px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('li', {}, h('b', {}, 'Destinació: '), 'Guardar com a PDF'),
      h('li', {}, h('b', {}, 'Mida del paper: '), `${S.exam.page.size} (${W} × ${H} mm)`),
      h('li', {}, h('b', {}, 'Marges: '), 'Cap'),
      h('li', {}, h('b', {}, 'Escala: '), '100 % (no «ajustar a la pàgina»)'),
      h('li', {}, h('b', {}, 'Opcions: '), 'desmarca «Capçaleres i peus de pàgina» i marca «Gràfics de fons»')),
    h('p', { style: { margin: 0, color: 'var(--ink-2)' } }, 'El PDF resultant és vectorial: el text es pot seleccionar i es veu nítid en imprimir.'),
    h('label', { class: 'chk', style: { marginTop: '6px' } }, cb, 'No tornar a mostrar aquest avís')),
    [{ label: 'Cancel·lar' }, { label: 'Continuar', primary: true, fn: () => { if (cb.checked) LS.set('ee.nohelp', true); go(); } }]);
}

