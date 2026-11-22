/* Pruebas de navegador de la app (Cuaderno + Tutoría). Cada prueba recibe:
     t.url       dirección del servidor de pruebas (la app tal cual, como en GitHub Pages)
     t.contexto  navegador limpio (sin datos), solo para esa prueba
     t.ok(condición, descripción, detalle)   apunta una comprobación
   Se ejecutan con «npm test» (ver tests/README.md). */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { servir, nuevaPagina, esperar, cuadernoConGrupo, tutoriaConAlumnos, llenarLocalStorage, vaciarRelleno } from './utilidades.mjs';
import { rastrearTutoria } from './texto-hostil.mjs';
import { calcularHuella, selloActual, listaCache } from '../version/huella.mjs';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

export const PRUEBAS = [

  { nombre: 'calculo-notas', descripcion: 'Las pruebas del cálculo de notas (tests/calculo-notas.html) pasan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await p.goto(t.url + '/tests/calculo-notas.html'); await esperar(3000);
    const r = await p.evaluate(() => window.__resultadoPruebas);
    t.ok(r && r.total >= 30, `se han ejecutado ${r && r.total} casos`);
    t.ok(r && !r.fallos.length && !r.error, 'ningún caso falla', r && (r.fallos.join('; ') || r.error));
  } },

  { nombre: 'version-cache', descripcion: 'sw.js: la versión de la caché está sellada y la lista de archivos sin conexión está completa', async fn(t) {
    const sello = selloActual(RAIZ), huella = calcularHuella(RAIZ);
    t.ok(sello.huella === huella, 'la versión está sellada: ningún archivo ha cambiado sin subir CACHE_NAME',
      `Han cambiado archivos desde que se selló la versión ${sello.version}. Ejecuta «npm run sellar» y sube también sw.js.`);
    const lista = new Set(listaCache(RAIZ));
    const faltan = [...lista].filter(f => !fs.existsSync(path.join(RAIZ, f)));
    t.ok(!faltan.length, 'todos los archivos de la lista existen', faltan.join(', '));
    // Todo lo que cargan las páginas (scripts, estilos, iconos, fuentes) tiene que estar en la lista.
    const sinLista = [];
    for (const pag of ['index.html', 'tutoria/index.html', 'editor/index.html', 'tools/planificacion.html']) {
      const html = fs.readFileSync(path.join(RAIZ, pag), 'utf8'), dir = path.dirname(pag);
      for (const m of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"#?]+)"/g)) {
        if (/^(https?:|data:|#|mailto:)/.test(m[1])) continue;
        const f = path.normalize(path.join(dir, m[1])).replace(/\\/g, '/');
        if (!lista.has(f) && fs.existsSync(path.join(RAIZ, f)) && fs.statSync(path.join(RAIZ, f)).isFile()) sinLista.push(`${pag} → ${f}`);
      }
    }
    for (const css of ['editor/css/fuentes.css', 'tools/fonts/fuentes.css'])
      for (const m of fs.readFileSync(path.join(RAIZ, css), 'utf8').matchAll(/url\(([^)]+)\)/g)) {
        const f = path.normalize(path.join(path.dirname(css), m[1].replace(/["']/g, ''))).replace(/\\/g, '/'); if (!lista.has(f)) sinLista.push(`${css} → ${f}`);
      }
    t.ok(!sinLista.length, 'todo lo que cargan las páginas está en la lista de sw.js (funciona sin conexión)', sinLista.join('; '));
  } },

  { nombre: 'carga', descripcion: 'Todas las páginas cargan sin errores ni archivos que falten', async fn(t) {
    for (const ruta of ['/', '/tutoria/', '/editor/', '/tools/planificacion.html', '/guia_mejorada.html']) {
      const p = await nuevaPagina(t.contexto); const fallos = [];
      p.on('response', r => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url()); });
      await p.goto(t.url + ruta); await esperar(1500);
      t.ok(!p.errores.length && !fallos.length, `${ruta} carga limpia`, [...p.errores, ...fallos].join('; '));
      await p.close();
    }
  } },

  { nombre: 'tutoria-guardado', descripcion: 'Tutoría: alta de alumnado, guardado y recarga', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García López, Ana', 'Pérez Ruiz, Luis']);
    t.ok(await p.evaluate(() => /2 alumnes registrats/.test(document.body.innerText)), 'el contador dice «2 alumnes registrats»');
    t.ok(await p.evaluate(() => document.querySelector('table[id^="tbl-"] thead th:not(.cb-col)').textContent.includes('Alumno')), '«Alumno / a» es la primera columna');
    await p.reload(); await esperar(1500);
    t.ok((await p.evaluate(() => data['1º ESO'].A.map(a => a.nombre))).length === 2, 'tras recargar sigue el alumnado');
    for (const pest of ['Calendario', 'Informe Académico', 'Seguimientos', 'Informe Convivencia', 'Inicio']) {
      await p.locator(`.nivel-tab:has-text("${pest}")`).first().click(); await esperar(300);
    }
    t.ok(!p.errores.length, 'las pestañas generales se abren sin errores', p.errores.join('; '));
  } },

  { nombre: 'tutoria-manifiesto', descripcion: 'Tutoría solo declara su manifiesto fuera de la app instalada del Cuaderno', async fn(t) {
    // Dentro de la ventana de la app del Cuaderno, un manifiesto distinto hacía que Chrome
    // mostrara sin fin «Actualización de aplicación disponible».
    const contar = async (enApp) => {
      const ctx = await t.navegador.newContext();
      if (enApp) await ctx.addInitScript(() => { const o = window.matchMedia.bind(window); window.matchMedia = q => /display-mode: standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : o(q); });
      const p = await nuevaPagina(ctx); await p.goto(t.url + '/tutoria/'); await esperar(800);
      const n = await p.evaluate(() => document.querySelectorAll('link[rel="manifest"]').length); await ctx.close(); return n;
    };
    t.ok(await contar(false) === 1, 'en una pestaña normal se puede instalar (tiene manifiesto)');
    t.ok(await contar(true) === 0, 'dentro de la app del Cuaderno no declara manifiesto propio');
  } },

  { nombre: 'tutoria-apostrofo', descripcion: 'Tutoría: grupos y niveles con apóstrofo («PMAR d\'Alt», «FPB l\'Horta»)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', "PMAR d'Alt", ["D'Amico Ruiz, Pau"]);
    const visible = s => p.locator(s + ':visible').first();
    for (const [desc, accion] of [
      ['pestaña II Evaluación', () => p.locator('text=II Evaluación').first().click()],
      ['Columnas', () => visible('.col-manager-btn').click()],
      ['Del Cuaderno', () => visible('button:has-text("Del Cuaderno")').click()],
      ['⋯ Más → Equipo docente', async () => { await visible('details.mas-menu > summary').click(); await visible('.mas-menu-lista > button:has-text("Equipo docente")').click(); }],
    ]) {
      await p.evaluate(() => { selectNivel('1º ESO'); currentGrupos['1º ESO'] = "PMAR d'Alt"; renderMain(); }); await esperar(300);
      const antes = p.errores.length;
      try { await accion(); await esperar(400); t.ok(p.errores.length === antes, `botón «${desc}»`, p.errores.slice(antes).join('; ')); }
      catch (e) { t.ok(false, `botón «${desc}»`, e.message.split('\n')[0]); }
      await p.reload(); await esperar(1300);
    }
    await p.evaluate(() => { openAddNivelModal(); document.getElementById('addNivelNombre').value = "FPB l'Horta"; confirmAddNivel(); });
    await esperar(400);
    await p.locator('.nivel-tab', { hasText: "FPB l'Horta" }).first().click(); await esperar(400);
    t.ok(await p.evaluate(() => currentNivel === "FPB l'Horta"), 'la pestaña del nivel con apóstrofo funciona');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'tutoria-texto-hostil', descripcion: 'Tutoría: un nombre, grupo, materia u observación con HTML o comillas no se cuela como código', async fn(t) {
    const completo = process.env.RASTREO === 'completo';
    for (const modo of ['hostil', 'doble']) {
      // Cada modo en un navegador limpio: el primero deja datos y su ventana como «activa».
      const ctx = await t.navegador.newContext({ viewport: { width: 1366, height: 900 } });
      const p = await nuevaPagina(ctx); p.setDefaultTimeout(0);
      await p.goto(t.url + '/tutoria/'); await esperar(1500);
      const r = await rastrearTutoria(p, { modo, completo });
      t.ok(r.clics > (completo ? 1500 : 250) && !r.fallos.length, `[${modo}] el rastreo recorre las pantallas (${r.clics} pulsaciones)`, r.fallos.join('; '));
      if (modo === 'hostil') {
        t.ok(!r.inyectados.length, 'ningún texto se convierte en un elemento de la página o de un documento', r.inyectados.slice(0, 6).join('\n        '));
        t.ok(!r.ejecutados.length, 'ningún texto se ejecuta como código', r.ejecutados.slice(0, 6).join('\n        '));
      } else t.ok(!r.dobles.length, 'ningún texto se escapa dos veces (no se ve «&amp;» ni «&#39;»)', r.dobles.slice(0, 6).join('\n        '));
      t.ok(!p.errores.length, `[${modo}] sin errores de JavaScript`, p.errores.slice(0, 3).join('; '));
      await ctx.close();
    }
  } },

  { nombre: 'cuaderno-texto-hostil', descripcion: 'Cuaderno: los textos con HTML o comillas no se cuelan como código y los archivos con identificadores manipulados no se cargan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async () => {
      const P = tag => `Zq"'><img src=x onerror=top.__x(/${tag}/)>');top.__x(/${tag}_js/);('&#39;);top.__x(/${tag}_ent/);(&#39;`;
      const hits = {}; let donde = ''; window.__x = re => { hits[re.source + ' @ ' + donde] = 1; };
      const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.nombre = '1º A ' + P('grupo');
      g.alumnos.forEach((a, i) => { a.apellidos = 'Pérez ' + P('apellidos'); a.nombreP = 'Ana' + i + P('nombreP'); a.nombre = a.apellidos + ', ' + a.nombreP; a.observaciones = P('obs'); a.comentariosEval = [P('coment'), '', ''];
        a.nese = true; a.neseNivel = P('neseNivel'); a.familia = [{ parentesco: P('parentesco'), nombre: P('famNombre'), email: P('email') }, { parentesco: '', nombre: '', email: '' }]; });
      g.actividades = [{ id: 'e1', nombre: 'Examen ' + P('actividad'), tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, sda: P('sda'), criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } };
      g.bloques.forEach(b => { b.label += P('bloque'); });
      const hoy = agHoyStr();
      g.diario[hoy] = { nota: P('diario'), incidencias: P('incidencias'), unidadId: '' };
      g.asistencia[hoy] = { [g.alumnos[0].id]: { estado: 'retraso', nota: P('asistNota') } };
      g.convivencia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, tipo: 'AC', descripcion: P('conv'), medidas: P('medidas') });
      g.contactosFamilia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: hoy, medio: 'otro', asunto: P('asunto'), notas: P('famNotas') });
      state.eventos.push({ id: uid(), fecha: hoy, titulo: P('evento'), tipo: 'examen', grupoIds: [g.id], nota: P('eventoNota') });
      state.reuniones.push({ id: uid(), fecha: hoy, tipo: 'familia', titulo: P('reunion'), asistentes: P('asistentes'), temas: P('temas'), acuerdos: P('acuerdos'), grupoId: g.id, alumnoId: g.alumnos[0].id });
      state.centroNombre = P('centro'); state.profesorNombreGlobal = P('profesor');
      state.programaciones = [{ id: 'p1', nombre: P('prog'), catalogoKey: 'FiQ_2ESO', sdas: [{ id: 's1', titulo: P('sdaTitulo'), trimestre: 0, sesionesPrevistas: 6 }], actividades: [] }];
      migrarEstado(); state.ui.grupoId = g.id; save();
      const inyectados = () => [...document.querySelectorAll('img[onerror*="__x"]')].map(im => (im.getAttribute('onerror').match(/__x\(\/(\w+)\//) || [])[1] + ' @ ' + donde);
      const malos = new Set(); const mira = async d => { donde = d; _mostrarBienvenida = false; render(); await new Promise(r => setTimeout(r, 120)); inyectados().forEach(x => malos.add(x)); };
      for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) { state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; state.ui.tab = tab; await mira('pestaña ' + tab); }
      state.ui.resAl = g.alumnos[0].id; state.ui.tab = 'resultados'; await mira('informe del alumno');
      for (const m of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) { state.ui.appMode = m; await mira('modo ' + m); }
      state.ui.appMode = 'programacion'; state.ui.progTab = 'detalle'; state.ui.progId = 'p1'; await mira('programación abierta');
      buscarAbrir(); const inp = document.querySelector('.modal-overlay input'); if (inp) { inp.value = 'Zq'; inp.dispatchEvent(new Event('input', { bubbles: true })); } await mira('buscador');
      return { malos: [...malos], hits: Object.keys(hits) };
    });
    t.ok(!r.malos.length, 'ningún texto se convierte en un elemento de la página (20 pantallas y el buscador)', r.malos.slice(0, 6).join('; '));
    t.ok(!r.hits.length, 'ningún texto se ejecuta como código', r.hits.slice(0, 6).join('; '));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
    // Una copia con un identificador manipulado no se carga y lo que había sigue igual.
    const q = await nuevaPagina(t.contexto); await cuadernoConGrupo(q, t.url, { nombres: ['Propio, Dato'] });
    const imp = await q.evaluate(async () => {
      const mala = JSON.parse(JSON.stringify(state)); mala.grupos[0].nombre = 'Ajeno'; mala.grupos[0].alumnos[0].id = "x');window.__colado=1;('";
      window.__dialogosAuto = { confirmar: true };
      _procesarArchivoCopiaJSON(new File([JSON.stringify(mala)], 'copia-mala.json', { type: 'application/json' }));
      await new Promise(r => setTimeout(r, 600));
      const buena = JSON.parse(JSON.stringify(state)); buena.grupos[0].nombre = 'Importado bien';
      const antes = state.grupos[0].nombre, avisos = (window.__dialogosLog || []).join(' | ');
      _procesarArchivoCopiaJSON(new File([JSON.stringify(buena)], 'copia-buena.json', { type: 'application/json' }));
      await new Promise(r => setTimeout(r, 900));
      return { antes, avisos, despues: state.grupos[0].nombre, colado: !!window.__colado };
    });
    t.ok(imp.antes === '1º ESO A' && /identificadores/.test(imp.avisos) && !imp.colado, 'la copia con un identificador manipulado se rechaza con un aviso', JSON.stringify(imp));
    t.ok(imp.despues === 'Importado bien', 'una copia normal se sigue cargando', JSON.stringify(imp));
  } },

  { nombre: 'tutoria-actas-guardadas', descripcion: 'Tutoría: un acta guardada conserva su formato y no puede traer código dentro', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']);
    const r = await p.evaluate(() => {
      window.__colado = 0;
      const malo = '<p><strong>Acuerdo</strong> en <em>negrita</em></p><table><tr><td>Celda</td></tr></table>' +
        '<img src="x" onerror="window.__colado++"><script>window.__colado++<\/script><a href="javascript:window.__colado++">enlace</a>' +
        '<iframe srcdoc="<script>parent.__colado++<\/script>"></iframe><div onclick="window.__colado++" style="color:red">texto</div>';
      const limpio = _tHtmlSeguro(malo);
      const d = document.createElement('div'); d.innerHTML = limpio; document.body.appendChild(d);
      d.querySelectorAll('a,div').forEach(x => { try { x.click(); } catch (e) {} });
      return { limpio, formato: /<strong>Acuerdo<\/strong>/.test(limpio) && /<em>negrita<\/em>/.test(limpio) && /<table>/.test(limpio) && /style="color:red"/.test(limpio),
        peligroso: /onerror|onclick|<script|javascript:|<iframe/i.test(limpio) };
    });
    await esperar(300);
    const colado = await p.evaluate(() => window.__colado);
    t.ok(r.formato, 'se conservan negritas, cursivas, tablas y estilos', r.limpio);
    t.ok(!r.peligroso && colado === 0, 'se quitan scripts, eventos, enlaces javascript: y marcos', r.limpio + ' · ejecutado ' + colado);
    // De punta a punta: un acta guardada con código dentro se abre sin ejecutarlo.
    const ok = await p.evaluate(async () => {
      window.__colado = 0; window._actasData = window._actasData || {};
      window._actasData[_actaKey('1º ESO', 'A', 1)] = { html: '<p>Mi acta</p><img src="x" onerror="window.__colado++">', savedAt: new Date().toISOString() };
      openInforme('1º ESO', 'A', 1);
      await new Promise(r => setTimeout(r, 600));
      return { texto: (document.getElementById('informeContent') || {}).innerHTML || '', colado: window.__colado };
    });
    t.ok(/Mi acta/.test(ok.texto) && ok.colado === 0, 'un acta guardada con código dentro se abre sin ejecutarlo', JSON.stringify(ok).slice(0, 200));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'del-cuaderno', descripcion: 'Tutoría: «📥 Del Cuaderno» copia la lista sin duplicar y se puede deshacer', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['garcia lopez, ana']);
    await p.evaluate(() => abrirImportarDelCuaderno('1º ESO', 'A')); await esperar(500);
    await p.click('#importCuadernoOverlay button:has-text("Importar")'); await esperar(1200);
    const lista = await p.evaluate(() => data['1º ESO'].A.map(a => [a.nombre, (a.idsCuaderno || []).length]));
    t.ok(lista.length === 2, 'no duplica a quien ya estaba (por nombre, sin tildes ni mayúsculas)', JSON.stringify(lista));
    t.ok(lista.every(([, n]) => n === 1), 'todos quedan vinculados con su identificador del Cuaderno', JSON.stringify(lista));
    await p.evaluate(() => _undoPop()); await esperar(300);
    t.ok(await p.evaluate(() => data['1º ESO'].A.length) === 1, 'Ctrl+Z deshace la importación');
  } },

  { nombre: 'suspensos', descripcion: 'Tutoría: importar suspensos por identificador y por nombre parecido', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url, { nombres: ['García López, Ana', 'Pérez Ruiz, Luis'] });
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['García-López Benet, Ana', 'Pérez Ruiz, Luis', 'Sanz Martí, Íria María']);
    // Ana ya está vinculada por identificador aunque su nombre sea otro
    await p.evaluate(id => { data['1º ESO'].A[0].idsCuaderno = [id]; }, ids[0]);
    const archivo = { formato: 'cuaderno-a-tutoria', version: 1, materia: 'Geografía e Historia', curso: '1.º ESO', grupo: '1º ESO A', generado: new Date().toISOString(),
      alumnos: [{ id: ids[0], nombre: 'García López, Ana', notas: { 1: 3 } }, { id: ids[1], nombre: 'Pérez Ruiz, Luis', notas: { 1: 8 } }, { nombre: 'Sanz Marti, Iria', notas: { 1: 2 } }] };
    await p.evaluate(o => _tImpCuadernoModal(o, 'para-tutoria.json'), archivo); await esperar(500);
    const resumen = await p.locator('#impCResumen').innerText();
    t.ok(/Sanz Marti, Iria.*Sanz Martí, Íria María/s.test(resumen), 'propone «Sanz Martí, Íria María» para «Sanz Marti, Iria»', resumen);
    t.ok(await p.evaluate(() => document.querySelector('#impCResumen input[data-prop]').checked), 'la propuesta muy parecida viene marcada');
    await p.click('#impCOk'); await esperar(600);
    const pend = await p.evaluate(() => data['1º ESO'].A.map(a => a.pendientes1.length));
    t.ok(JSON.stringify(pend) === '[1,0,1]', 'suspensos: Ana (por identificador) y Íria (por parecido); Luis aprueba', JSON.stringify(pend));
  } },

  { nombre: 'dos-ventanas', descripcion: 'Una sola ventana guarda a la vez; relevo con «Usar esta ventana»', async fn(t) {
    const A = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(A, t.url, { nombres: ['Base, Uno'] });
    const B = await nuevaPagina(t.contexto); await B.goto(t.url + '/'); await esperar(1500);
    t.ok(await B.evaluate(() => UnaVentana.estado) === 'bloqueada', 'la segunda ventana queda bloqueada');
    const anadir = (p, n) => p.evaluate(n => { state.grupos[0].alumnos.push(normalizarAlumno({ id: uid(), nombre: n })); save(); }, n);
    await anadir(A, 'Ventana A, Ana'); await esperar(300); await anadir(B, 'Ventana B, Luis'); await esperar(800);
    const guardado = () => A.evaluate(() => JSON.parse(localStorage.getItem('geohist_multigrupo_v1')).grupos[0].alumnos.map(a => a.nombre));
    t.ok(JSON.stringify(await guardado()) === '["Base, Uno","Ventana A, Ana"]', 'la ventana bloqueada no pisa lo de la activa', JSON.stringify(await guardado()));
    await B.click('#unaVentanaUsar'); await esperar(3000);
    t.ok(await B.evaluate(() => UnaVentana.estado) === 'activa' && await A.evaluate(() => UnaVentana.estado) === 'bloqueada', 'el relevo cambia la ventana activa');
    t.ok((await B.evaluate(() => state.grupos[0].alumnos.length)) === 2, 'la nueva activa tiene los datos al día');
  } },

  { nombre: 'almacen-lleno', descripcion: 'Cuaderno: con localStorage lleno por otra app, se guarda y se abre desde IndexedDB sin avisos ni pérdidas', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await esperar(1000);
    await llenarLocalStorage(p);
    const anadir = n => p.evaluate(n => { state.grupos[0].alumnos.push(normalizarAlumno({ id: uid(), nombre: n })); save(); }, n);
    await anadir('Nuevo, Uno'); await esperar(900);
    let e = await p.evaluate(() => ({ ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null, aviso: !!document.getElementById('saveWarnBar'), idbOk: saveState.idbOk, lsOk: saveState.ok }));
    t.ok(!e.lsOk && e.idbOk && !e.aviso, 'se guarda en IndexedDB y no aparece ningún aviso de guardado', JSON.stringify(e));
    t.ok(!e.ls && e.marca, 'la copia antigua de localStorage se retira (no queda una versión vieja)', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    e = await p.evaluate(async () => ({ alumnos: state.grupos[0]?.alumnos.length, toast: (document.getElementById('toastGlobal') || {}).innerText || '', aviso: !!document.getElementById('saveWarnBar'), copias: (await idbAll('copias')).map(c => c.motivo) }));
    t.ok(e.alumnos === 4, 'al reabrir están todos los datos, también el último cambio', JSON.stringify(e));
    t.ok(!/recuperado/i.test(e.toast) && !e.aviso && !e.copias.some(m => /recuperar/i.test(m)), 'es un arranque normal: sin mensajes de recuperación ni copias de emergencia', JSON.stringify(e));
    await anadir('Nuevo, Dos'); await esperar(900); await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length) === 5, 'se sigue guardando y abriendo así las veces que haga falta');
    // En cuanto vuelve a haber sitio, localStorage recupera su copia rápida.
    await vaciarRelleno(p); await anadir('Nuevo, Tres'); await esperar(900);
    e = await p.evaluate(() => ({ ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null }));
    t.ok(e.ls && !e.marca, 'al liberarse espacio vuelve la copia rápida de localStorage', JSON.stringify(e));
    await p.reload(); await esperar(2000);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length) === 6 && !p.errores.length, 'y los datos siguen completos', p.errores.join('; '));
    // Caso límite: en localStorage queda una copia ANTERIOR (el último guardado no cupo) y además está lleno.
    const viejo = await p.evaluate(() => localStorage.getItem(KEY));
    await anadir('Nuevo, Cuatro'); await esperar(1200);
    await p.evaluate(v => Storage.prototype.setItem.call(localStorage, KEY, v), viejo); await llenarLocalStorage(p);
    await p.reload(); await esperar(3000);
    e = await p.evaluate(() => ({ alumnos: state.grupos[0]?.alumnos.length, ls: localStorage.getItem(KEY) !== null, marca: localStorage.getItem(KEY_EN_IDB) !== null }));
    t.ok(e.alumnos === 7 && !e.ls && e.marca, 'si localStorage se quedó con una copia anterior, manda la de IndexedDB (más reciente) y la vieja se retira', JSON.stringify(e));
    await p.reload(); await esperar(2500);
    t.ok(await p.evaluate(() => state.grupos[0]?.alumnos.length === 7 && !/recuperado/i.test((document.getElementById('toastGlobal') || {}).innerText || '')) && !p.errores.length, 'y la siguiente apertura vuelve a ser normal', p.errores.join('; '));
  } },

  { nombre: 'tutoria-almacen', descripcion: 'Tutoría: fotos y actas van a IndexedDB, localStorage queda ligero y nada se pierde aunque esté lleno', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']);
    const FOTO = 300000;
    await p.evaluate(n => { window._fotoData['1º ESO-A'] = { src: 'data:image/png;base64,' + 'A'.repeat(n), name: 'foto' }; markDirty(); }, FOTO);
    await esperar(1500);
    const leerIdb = () => p.evaluate(async () => { const r = await _tutIdbLeer(); const st = r ? JSON.parse(r.json) : null; return st ? { foto: ((st.fotoData || {})['1º ESO-A'] || {}).src?.length || 0, alumnos: (st.data['1º ESO'].A || []).length } : null; });
    let ls = await p.evaluate(() => { const raw = localStorage.getItem('evalies_data'), st = JSON.parse(raw); return { bytes: raw.length, foto: !!(st.fotoData && Object.keys(st.fotoData).length), enIDB: st.enIDB }; });
    t.ok(!ls.foto && ls.enIDB && ls.enIDB.imagenes && ls.bytes < 60000, 'la copia de localStorage no lleva la foto', JSON.stringify(ls));
    t.ok((await leerIdb())?.foto > FOTO, 'la foto está en IndexedDB');
    await p.reload(); await esperar(2000);
    t.ok(await p.evaluate(() => (window._fotoData['1º ESO-A'] || {}).src?.length || 0) > FOTO, 'al reabrir, la foto sigue ahí');
    // Datos guardados con la versión anterior (foto dentro de localStorage, nada en IndexedDB): se pasan solos.
    await p.evaluate(async () => { const st = buildState(true, true); delete st.enIDB; Storage.prototype.setItem.call(localStorage, 'evalies_data', JSON.stringify(st));
      const db = await _tutIdb(); await new Promise(ok => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('estado'); tx.oncomplete = ok; }); });
    await p.reload(); await esperar(2500);
    ls = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('evalies_data')); return { foto: !!(st.fotoData && Object.keys(st.fotoData).length), mem: (window._fotoData['1º ESO-A'] || {}).src?.length || 0 }; });
    t.ok(ls.mem > FOTO && !ls.foto && (await leerIdb())?.foto > FOTO, 'los datos de la versión anterior pasan a IndexedDB sin perder la foto', JSON.stringify(ls));
    // localStorage lleno por otra app: se sigue guardando.
    await llenarLocalStorage(p);
    await p.evaluate(() => { selectNivel('1º ESO'); currentGrupos['1º ESO'] = 'A'; renderMain(); openAddAlumno(); document.getElementById('mNombre').value = 'Segunda, Luisa'; addAlumno(); });
    await esperar(1500);
    t.ok(await p.evaluate(() => document.getElementById('autosaveLabel')?.textContent) === 'Guardado', 'con localStorage lleno el guardado sigue correcto');
    await p.reload(); await esperar(2500);
    const tras = await p.evaluate(() => ({ alumnos: data['1º ESO'].A.filter(a => a.nombre).length, foto: (window._fotoData['1º ESO-A'] || {}).src?.length || 0 }));
    t.ok(tras.alumnos === 2 && tras.foto > FOTO, 'y al reabrir están el alumnado nuevo y la foto', JSON.stringify(tras));
    await vaciarRelleno(p);
    // Una foto grande se reduce al cargarla y se guarda al momento.
    const red = await p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 3200; c.height = 2400; const g = c.getContext('2d');
      for (let i = 0; i < 400; i++) { g.fillStyle = `hsl(${i * 7},70%,${30 + i % 50}%)`; g.fillRect((i * 97) % 3200, (i * 53) % 2400, 400, 300); }
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      openFotoGaleria('1º ESO', 'A'); handleFotoFile(new File([blob], 'grande.png', { type: 'image/png' }));
      await new Promise(r => setTimeout(r, 2500));
      const src = window._fotoData['1º ESO-A'].src; const img = new Image(); await new Promise(r => { img.onload = r; img.src = src; });
      return { original: blob.size, guardada: src.length, ancho: img.naturalWidth, tipo: src.slice(0, 15) };
    });
    t.ok(red.ancho === 1800 && red.tipo === 'data:image/jpeg', 'una foto grande se reduce a 1800 px al cargarla', JSON.stringify(red));
    t.ok((await leerIdb())?.foto === red.guardada, 'y queda guardada sin tener que tocar nada más', JSON.stringify(red));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'version-del-curso', descripcion: 'Tutoría: «Guardar versión del curso» genera un .html que se abre sin servidor', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Instantánea, Alumna']);
    const descarga = p.waitForEvent('download');
    await p.evaluate(() => guardarVersionCurso());
    const ruta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'version-')), 'version.html'); await (await descarga).saveAs(ruta);
    const ctx2 = await t.navegador.newContext(); const q = await nuevaPagina(ctx2); const fallos = [];
    q.on('requestfailed', r => fallos.push(r.url()));
    await q.goto('file://' + ruta); await esperar(2000);
    const r = await q.evaluate(() => ({ app: typeof renderAll, datos: typeof data !== 'undefined' ? (data['1º ESO']?.A || []).map(a => a.nombre) : [], graficos: typeof Chart }));
    t.ok(r.app === 'function' && r.datos.includes('Instantánea, Alumna'), 'se abre con la app y los datos', JSON.stringify(r));
    t.ok(r.graficos === 'function', 'incluye la librería de gráficos');
    t.ok(!fallos.length && !q.errores.length, 'no le falta ningún archivo ni da errores', [...fallos, ...q.errores].join('; '));
    await ctx2.close();
  } },

  { nombre: 'sin-conexion', descripcion: 'Todo funciona sin conexión tras la primera visita', async fn(t) {
    // Servidor propio que se APAGA: así no hay red de verdad, tampoco para el service worker
    // (cortar la conexión solo en el navegador no afecta al service worker en todas las versiones).
    const srv = await servir(RAIZ);
    try {
      const p = await nuevaPagina(t.contexto); await p.goto(srv.url + '/');
      await p.evaluate(() => navigator.serviceWorker.ready); await esperar(3000);
      await cuadernoConGrupo(p, srv.url);
      await srv.cerrar();
      for (const ruta of ['/', '/tutoria/', '/editor/', '/editor/index.html', '/tools/planificacion.html', '/guia_mejorada.html']) {
        const q = await nuevaPagina(t.contexto); const fallos = [];
        q.on('response', r => { if (r.status() >= 400) fallos.push(r.status() + ' ' + r.url()); });
        q.on('requestfailed', r => fallos.push('sin respuesta: ' + r.url()));
        await q.goto(srv.url + ruta).catch(e => fallos.push(e.message.split('\n')[0])); await esperar(1200);
        t.ok(!fallos.length && !q.errores.length, `${ruta} sin conexión`, [...fallos, ...q.errores].join('; '));
        await q.close();
      }
      // La Planificación temporal, dentro del Cuaderno: carga y lleva sus letras incrustadas (no pide nada a internet).
      const fuera = []; p.on('request', r => { if (!r.url().startsWith(srv.url) && !/^(data|blob|about):/.test(r.url())) fuera.push(r.url()); });
      await p.reload(); await esperar(1500);
      const plan = await p.evaluate(async () => { _mostrarBienvenida = false;
        state.programaciones = [{ id: 'p1', nombre: 'Prueba', catalogoKey: 'FiQ_2ESO', sdas: [], actividades: [] }]; migrarEstado();
        state.ui.appMode = 'programacion'; state.ui.progTab = 'detalle'; state.ui.progId = 'p1'; state.ui.progDetTab = 'planificacion'; render();
        await new Promise(r => setTimeout(r, 2500));
        return { hay: !!document.querySelector('#planTempWrap iframe') }; });
      t.ok(plan.hay, 'la Planificación temporal se abre sin conexión dentro del Cuaderno', JSON.stringify(plan));
      const marco = p.frames().find(f => f !== p.mainFrame());
      const letras = marco ? await marco.evaluate(async () => { await document.fonts.ready; return ['700 20px Fraunces', '400 14px "Public Sans"', '500 12px "IBM Plex Mono"'].map(f => document.fonts.check(f)); }) : [];
      t.ok(letras.length === 3 && letras.every(Boolean), 'la Planificación usa sus letras propias sin conexión', JSON.stringify(letras));
      t.ok(!fuera.length, 'el Cuaderno no pide nada a servidores externos', fuera.slice(0, 3).join('; '));
    } finally { await srv.cerrar().catch(() => {}); }
  } },

  { nombre: 'copia-carpeta', descripcion: 'Copia automática en una carpeta: escribe, poda y ofrece la de otro dispositivo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Desde A, Alumna'] });
    // La «carpeta» es el almacenamiento privado de archivos del navegador (el selector real necesita a una persona).
    await p.evaluate(async () => { localStorage.setItem('cc_dispositivo', 'aaaaa');
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias', { create: true });
      for (let i = 1; i <= 12; i++) { const f = await dir.getFileHandle(`copia-cuaderno-auto-2026-01-${String(i).padStart(2, '0')}-aaaaa.json`, { create: true }); const w = await f.createWritable(); await w.write('{"grupos":[]}'); await w.close(); }
      _ccHandle = dir; await idbPut('kv', dir, 'carpetaCopias'); _ccEstado = 'activa'; });
    t.ok(await p.evaluate(() => ccEscribir()), 'escribe la copia de hoy');
    const n = await p.evaluate(async () => { let n = 0; for await (const _ of _ccHandle.entries()) n++; return n; });
    t.ok(n === 10, 'conserva las 10 más recientes de este dispositivo', 'hay ' + n);
    await p.evaluate(() => { localStorage.setItem('cc_dispositivo', 'bbbbb'); state._guardadoEn = Date.now() - 3600e3; localStorage.setItem(KEY, JSON.stringify(state)); });
    await p.reload(); await esperar(3500);
    t.ok(await p.evaluate(() => !!_ccMasReciente), 'otro dispositivo ve que hay una copia más reciente');
  } },

  { nombre: 'copia-carpeta-cifrada', descripcion: 'Copia automática en carpeta cifrada: el archivo es ilegible sin la contraseña y se abre con ella', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Secreto Confidencial, Alumna'] });
    const r = await p.evaluate(async () => {
      localStorage.setItem('cc_dispositivo', 'aaaaa');
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('copias-cifradas', { create: true });
      _ccHandle = dir; _ccEstado = 'activa';
      await ccEscribir();
      const leer = async () => (await (await dir.getFileHandle(_ccNombreHoy())).getFile()).text();
      const claro = await leer();
      const ok = await ccActivarCifrado('una contraseña larga');
      const cifrado = await leer(), sobre = JSON.parse(cifrado);
      const conPass = JSON.parse(await descifrarTexto(sobre, 'una contraseña larga'));
      let malaPass = false; try { await descifrarTexto(sobre, 'otra contraseña'); } catch (e) { malaPass = true; }
      const conClave = await ccIntentarDescifrar(sobre);
      // Otro dispositivo (otra clave guardada o ninguna) ve que hay una copia más reciente, por la fecha que va fuera del cifrado.
      localStorage.setItem('cc_dispositivo', 'bbbbb'); const fecha = sobre._guardadoEn; state._guardadoEn = fecha - 3600e3; _ccClave = null;
      await ccBuscarMasReciente();
      return { claroLegible: claro.includes('Secreto Confidencial'), ok, cifradoLegible: cifrado.includes('Secreto') || cifrado.includes('grupos'), formato: sobre.formato, fechaFuera: typeof fecha === 'number' && fecha > 0,
        conPass: conPass.grupos[0].alumnos[0].nombre, malaPass, conClave: conClave && conClave.grupos[0].alumnos[0].nombre, otroLoVe: !!_ccMasReciente && _ccMasReciente.fecha === fecha, sinClaveNoAbre: (await ccIntentarDescifrar(sobre)) === null };
    });
    t.ok(r.claroLegible && r.ok && !r.cifradoLegible && r.formato === 'cuaderno-profesor-cifrado', 'al activar el cifrado, la copia de la carpeta deja de ser legible', JSON.stringify(r));
    t.ok(r.conPass === 'Secreto Confidencial, Alumna' && r.malaPass, 'se abre con la contraseña y no con otra', JSON.stringify(r));
    t.ok(r.conClave === 'Secreto Confidencial, Alumna' && r.sinClaveNoAbre, 'este dispositivo la abre sin pedirla; otro, no', JSON.stringify(r));
    t.ok(r.fechaFuera && r.otroLoVe, 'otro dispositivo sigue viendo que hay una copia más reciente', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'nuevo-curso', descripcion: 'Empezar curso nuevo: archiva el curso entero y deja los grupos, las programaciones y el horario listos', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } }; g.bloques[0].peso = 70; g.bloques[1].peso = 30; g.umbrales.excelente = 90;
      g.diario['2026-10-01'] = { nota: 'Clase', incidencias: '', unidadId: '' }; g.asistencia['2026-10-01'] = { [g.alumnos[1].id]: { estado: 'retraso', nota: '' } };
      g.alumnos[0].observaciones = 'Observación del curso pasado'; g.alumnos[0].nese = true; g.alumnos[0].fechaNacimiento = '2013-05-02';
      state.programaciones = [{ id: 'p1', nombre: 'Prog 1º', catalogoKey: 'FiQ_2ESO', sdas: [{ id: 's1', titulo: 'SdA 1', trimestre: 0, sesionesPrevistas: 6 }], actividades: [] }]; g.programacionId = 'p1';
      state.horario.celdas['0-lun'] = { tipo: 'clase', materia: 'FiQ', nivelGrupo: '1º A', aula: '12', nota: '', grupoId: g.id };
      state.eventos = [{ id: 'ev1', fecha: '2026-11-02', titulo: 'Examen', tipo: 'examen', grupoIds: [g.id] }]; state.festivos = [{ id: 'f1', fechaInicio: '2026-10-09', fechaFin: '2026-10-09', etiqueta: '9 d\'Octubre' }];
      state.reuniones = [{ id: 'r1', fecha: '2026-10-05', tipo: 'familia', titulo: 'Reunión' }]; state.planesRefuerzo = [{ id: 'pr1', alumnoId: g.alumnos[0].id, estado: 'activo' }];
      state.cursoEscolarGlobal = '2026-2027'; _mostrarBienvenida = false; migrarEstado(); state.ui.grupoId = null; save(); render(); });
    await p.evaluate(() => exPut({ key: 'e1', exam: { titulo: 'Diseño del examen' } })); await p.evaluate(() => exPut({ key: 'prog:pa1', exam: { titulo: 'Plantilla' } }));
    await p.click('button:has-text("Començar curs nou")'); await esperar(300);
    t.ok(await p.inputValue('#ncCurso') === '2027-2028', 'propone el curso siguiente');
    await p.click('button:has-text("Preparar el archivo")'); await esperar(600);
    const antes = await p.evaluate(() => state.grupos[0].alumnos.length);
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('#ncConfirmar')]);
    const archivo = JSON.parse(fs.readFileSync(await descarga.path(), 'utf8'));
    t.ok(/^curso-2026-2027-cuaderno-\d{4}-\d\d-\d\d\.json$/.test(descarga.suggestedFilename()) && archivo.grupos[0].alumnos.length === 3 && archivo.grupos[0].notasCuant[ids[0]].e1 === 7 && archivo._examenesDiseno.length === 2,
      'el archivo descargado contiene el curso completo (alumnado, notas y diseños de examen)', descarga.suggestedFilename());
    await esperar(1200);
    const r = await p.evaluate(async () => { const g = state.grupos[0]; return { antes: 0, curso: state.cursoEscolarGlobal, grupo: g.nombre, alumnos: g.alumnos.length, acts: g.actividades.length, notas: Object.keys(g.notasCuant).length, diario: Object.keys(g.diario).length, asist: Object.keys(g.asistencia).length,
      pesos: g.bloques.map(b => b.peso).join('/'), umbral: g.umbrales.excelente, prog: g.programacionId, progs: state.programaciones.length, cursoProg: state.programaciones[0].cursoEscolar, horario: (state.horario.celdas['0-lun'] || {}).grupoId === g.id,
      eventos: state.eventos.length, festivos: state.festivos.length, reuniones: state.reuniones.length, planes: state.planesRefuerzo.length, disenos: (await exLeerTodos()).map(x => x.key).join(','), copias: (await idbAll('copias')).map(c => c.motivo).join(' | ') }; });
    t.ok(antes === 3 && r.curso === '2027-2028' && r.alumnos === 0 && r.acts === 0 && r.notas === 0 && r.diario === 0 && r.asist === 0 && r.eventos === 0 && r.festivos === 0 && r.reuniones === 0 && r.planes === 0,
      'se vacía lo que es de un solo curso', JSON.stringify(r));
    t.ok(r.grupo === '1º ESO A' && r.pesos === '70/30/20/5' && r.umbral === 90 && r.prog === 'p1' && r.progs === 1 && r.cursoProg === '2027-2028' && r.horario,
      'se conservan el grupo con su configuración, la programación y el horario', JSON.stringify(r));
    t.ok(r.disenos === 'prog:pa1' && /Antes de empezar el curso 2027-2028/.test(r.copias), 'quedan las plantillas de examen y una copia interna del curso anterior', JSON.stringify(r));
    // Deshacer devuelve el curso anterior.
    await p.evaluate(() => deshacer()); await esperar(400);
    t.ok(await p.evaluate(() => state.grupos[0].alumnos.length === 3 && state.cursoEscolarGlobal === '2026-2027'), '↶ Deshacer devuelve el curso anterior');
    await p.evaluate(() => rehacer()); await esperar(300);
    // Con «también su alumnado»: nombres sí, datos del curso no. Y si se cancela la descarga, no cambia nada.
    await p.evaluate(arch => { delete arch._examenesDiseno; cargarEstadoCompleto(arch); _mostrarBienvenida = false; render(); }, archivo); await esperar(300);
    await p.evaluate(() => { window.__guardarArchivoReal = guardarArchivo; guardarArchivo = async () => false; abrirNuevoCurso(); document.getElementById('ncAlumnado').checked = true; });
    await p.click('button:has-text("Preparar el archivo")'); await esperar(500);
    await p.click('#ncConfirmar'); await esperar(600);
    t.ok(await p.evaluate(() => state.grupos[0].actividades.length === 1 && state.cursoEscolarGlobal === '2026-2027'), 'si el archivo no se guarda, no se cambia nada');
    await p.evaluate(() => { guardarArchivo = async () => true; }); await p.click('#ncConfirmar'); await esperar(1200);
    const c = await p.evaluate(() => { const g = state.grupos[0], a = g.alumnos.find(x => x.fechaNacimiento); return { alumnos: g.alumnos.length, nac: a && a.fechaNacimiento, nese: a && a.nese, obs: g.alumnos.map(x => x.observaciones).join(''), notas: Object.keys(g.notasCuant).length }; });
    t.ok(c.alumnos === 3 && c.nac === '2013-05-02' && c.nese === true && c.obs === '' && c.notas === 0, 'con «también su alumnado» quedan los nombres, sin observaciones ni notas', JSON.stringify(c));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'sorteo-y-grupos', descripcion: 'Herramientas de clase: sorteo sin repetir y sin ausentes, y reparto en grupos igualados', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url, { nombres: ['A, Uno', 'B, Dos', 'C, Tres', 'D, Cuatro', 'E, Cinco', 'F, Seis', 'G, Siete'] });
    await p.evaluate(ids => { _mostrarBienvenida = false; const g = state.grupos[0]; g.asistencia[agHoyStr()] = { [ids[6]]: { estado: 'falta_no_justificada', nota: '' }, [ids[5]]: { estado: 'retraso', nota: '' } };
      state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; save(); render(); }, ids);
    await p.click('#cronoFab'); await p.click('[data-clase-tab="sorteo"]'); await esperar(200);
    const salen = [];
    for (let i = 0; i < 6; i++) { await p.click('button:has-text("Triar algú"), button:has-text("Una altra persona")'); await esperar(900); salen.push(await p.innerText('#claseElegido')); }
    t.ok(new Set(salen).size === 6, 'en seis sorteos salen las seis personas presentes, sin repetir', salen.join(' · '));
    t.ok(!salen.includes('Siete G') && salen.includes('Seis F'), 'quien falta hoy no entra en el sorteo; quien llega tarde, sí', salen.join(' · '));
    t.ok(/Queden 0 de 6 · 1 absent hui/.test(await p.innerText('#claseOtra')), 'indica cuántos quedan y cuántos faltan', await p.innerText('#claseOtra'));
    await p.click('button:has-text("Una altra persona")'); await esperar(900);
    t.ok(/Queden 5 de 6/.test(await p.innerText('#claseOtra')), 'cuando han salido todos, empieza otra vuelta');
    await p.click('[data-clase-tab="grupos"]'); await p.fill('#claseNum', '3'); await p.click('button:has-text("Fer grups")'); await esperar(200);
    let eq = await p.evaluate(() => claseEquipos.equipos);
    t.ok(eq.length === 3 && eq.every(e => e.length === 2) && new Set(eq.flat()).size === 6, 'tres grupos de dos, con todos los presentes una sola vez', JSON.stringify(eq));
    await p.selectOption('#claseOtra select[aria-label="Cómo repartir"]', 'tam'); await p.fill('#claseNum', '4'); await p.click('button:has-text("Repartir una altra vegada"), button:has-text("Fer grups")'); await esperar(200);
    eq = await p.evaluate(() => claseEquipos.equipos);
    t.ok(eq.length === 2 && eq.map(e => e.length).sort().join() === '3,3', '«de cuatro en cuatro» con seis personas da dos grupos igualados (3 y 3)', JSON.stringify(eq));
    const rep = await p.evaluate(() => { const al = Array.from({ length: 23 }, (_, i) => ({ id: 'x' + i })); return [claseRepartir(al, 'num', 5), claseRepartir(al, 'tam', 4), claseRepartir(al, 'num', 40), claseRepartir([], 'num', 3)].map(r => r.map(e => e.length).sort((a, b) => b - a).join('+')); });
    t.ok(rep[0] === '5+5+5+4+4' && rep[1] === '4+4+4+4+4+3' && rep[2] === Array(23).fill(1).join('+') && rep[3] === '', 'los tamaños nunca difieren en más de uno', JSON.stringify(rep));
    t.ok(await p.evaluate(() => JSON.stringify(state.grupos[0].alumnos.map(a => a.id))) === JSON.stringify(ids) && !p.errores.length, 'no toca los datos ni da errores', p.errores.join('; '));
  } },

  { nombre: 'modo-proyector', descripcion: 'Modo proyector: los nombres del alumnado y sus notas se difuminan en todas las pantallas', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Xilófono Quetzal, Wenceslao', 'Ñandú Kiwi, Brígida', 'Yunque Zafiro, Úrsula'] });
    await p.evaluate(() => { _mostrarBienvenida = false; const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.alumnos.forEach((a, i) => { g.notasCuant[a.id] = { e1: 3 + i * 2.5 }; g.notas[a.id] = { e1: { [cr]: 5 + i } }; a.familia[0] = { parentesco: 'Madre', nombre: 'Familiar Reconocible ' + i, email: 'familia' + i + '@correo.es' }; });
      g.convivencia.push({ id: uid(), alumnoId: g.alumnos[0].id, fecha: agHoyStr(), tipo: 'AC', descripcion: 'Incidencia' });
      state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; state.ui.tab = 'resultados'; save(); render(); });
    // Nombres (o trozos) que quedan legibles: textos y campos que los contienen y no están difuminados.
    const visibles = () => p.evaluate(() => {
      const marcas = /xil[oó]fono|quetzal|wenceslao|[ñn]and[uú]|kiwi|br[ií]gida|yunque|zafiro|[uú]rsula|familiar reconocible|@correo\.es/i, out = [];
      const oculto = el => !!el.closest('.priv') || !!el.closest('[data-sin-privacidad]') || el.closest('script,style');
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const pe = n.parentElement; if (!pe || !marcas.test(n.nodeValue)) continue; if (pe.tagName === 'OPTION') { if (pe.selected && !oculto(pe.parentElement)) out.push('opción: ' + n.nodeValue.trim().slice(0, 30)); continue; } if (!oculto(pe) && pe.getBoundingClientRect().width > 0) out.push(pe.tagName + ': ' + n.nodeValue.trim().slice(0, 40)); }
      document.querySelectorAll('input,textarea').forEach(el => { if (el !== document.activeElement && marcas.test(el.value || '') && !oculto(el) && el.getBoundingClientRect().width > 0) out.push('campo: ' + el.value.slice(0, 30)); });
      return out; });
    t.ok((await visibles()).length >= 3, 'sin el modo proyector los nombres se ven');
    await p.click('#proyectorBtn'); await esperar(200);
    const fallos = {};
    const mira = async (nombre) => { await esperar(250); const v = await visibles(); if (v.length) fallos[nombre] = v.slice(0, 4); };
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { state.ui.appMode = 'competencial'; state.ui.tab = tab; render(); }, tab); await mira('pestaña ' + tab); }
    await p.evaluate(() => { state.ui.tab = 'calificar'; state.ui.calViewMode = 'table'; render(); }); await mira('calificar (tabla)');
    await p.evaluate(() => { state.ui.tab = 'resultados'; state.ui.resAl = state.grupos[0].alumnos[0].id; render(); }); await mira('informe del alumno');
    for (const m of ['inicio', 'corrector', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) { await p.evaluate(m => { state.ui.appMode = m; render(); }, m); await mira('modo ' + m); }
    await p.evaluate(() => { buscarAbrir(); const i = document.querySelector('.modal-overlay input'); i.focus(); i.value = 'quetzal'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await mira('buscador');
    t.ok(!Object.keys(fallos).length, 'ningún nombre de alumno/a ni de su familia queda legible (20 pantallas y el buscador)', JSON.stringify(fallos));
    await p.keyboard.press('Escape');
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; state.ui.resAl = ''; render(); }); await esperar(200);
    const notas = await p.evaluate(() => {
      const filas = [...document.querySelectorAll('#tabContent table tbody tr')].slice(0, 3);
      return { filas: filas.length, notasOcultas: filas.every(tr => [...tr.querySelectorAll('td')].filter(td => /^\s*\d{1,2},\d\s*$/.test(td.textContent)).every(td => td.classList.contains('priv')) && [...tr.querySelectorAll('.pill')].every(x => x.classList.contains('priv'))),
        grupoVisible: !document.querySelector('.gpill.on').closest('.priv'), blur: getComputedStyle(document.querySelector('.priv')).filter }; });
    t.ok(notas.filas === 3 && notas.notasOcultas && /blur/.test(notas.blur), 'las notas de cada fila también se difuminan', JSON.stringify(notas));
    t.ok(notas.grupoVisible, 'el resto (grupo, actividades, botones) se sigue viendo');
    await p.click('#cronoFab'); await p.click('[data-clase-tab="sorteo"]'); await p.click('button:has-text("Triar algú")'); await esperar(900);
    t.ok(await p.evaluate(() => !document.getElementById('claseElegido').closest('.priv') && /Wenceslao|Brígida|Úrsula/.test(document.getElementById('claseElegido').textContent)), 'el sorteo sí muestra el nombre (está pensado para proyectarlo)');
    await p.reload(); await esperar(1500);
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.grupoId = state.grupos[0].id; state.ui.tab = 'resultados'; render(); }); await esperar(250);
    t.ok(await p.evaluate(() => document.body.getAttribute('data-proyector') === '1') && !(await visibles()).length, 'el modo se recuerda al reabrir la app');
    await p.click('#proyectorBtn'); await esperar(200);
    t.ok(await p.evaluate(() => !document.querySelector('.priv')) && (await visibles()).length >= 3, 'al desactivarlo todo vuelve a verse');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'bloqueo-pin', descripcion: 'Bloqueo con PIN: la app se abre tapada, solo entra el PIN correcto y el código de recuperación lo quita', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Dato Privado, Alumna'] });
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.appMode = 'inicio'; render(); abrirCopias(); }); await esperar(400);
    await p.click('button:has-text("Activar el PIN")'); await p.fill('#bqp1', '2468'); await p.fill('#bqp2', '2468'); await p.click('#bqpSi'); await esperar(1500);
    const aviso = await p.innerText('.dlg-msg');
    const codigo = (aviso.match(/[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}/) || [])[0];
    t.ok(!!codigo, 'al activarlo muestra un código de recuperación', aviso.slice(0, 120));
    await p.click('.dlg-si'); await esperar(200);
    t.ok(await p.evaluate(() => BloqueoPIN.activo && getComputedStyle(document.getElementById('bloqueoBtn')).display !== 'none' && !/2468/.test(localStorage.getItem('cuaderno_bloqueo_pin'))), 'queda activado, aparece el botón 🔒 y el PIN no se guarda en claro');
    await p.reload(); await esperar(1500);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada), 'recargar en la misma pestaña no vuelve a pedirlo');
    // Pestaña nueva (como al abrir la app): tapada hasta escribir el PIN.
    await p.evaluate(() => sessionStorage.clear()); await p.reload(); await esperar(1500);
    const tapada = () => p.evaluate(() => ({ bloqueada: BloqueoPIN.bloqueada, visibles: [...document.body.children].filter(e => e.id !== 'bloqueoOverlay' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0).map(e => e.tagName + '#' + e.id),
      seLee: (() => { const el = document.elementFromPoint(300, 300); return !!(el && el.closest('#bloqueoOverlay')); })() }));
    let e = await tapada();
    t.ok(e.bloqueada && !e.visibles.length && e.seLee, 'al abrir, la app está tapada y no se ve nada de ella', JSON.stringify(e));
    await p.fill('#bqCampo', '1111'); await p.click('.bq-btn'); await esperar(900);
    t.ok((await tapada()).bloqueada && /incorrecto/.test(await p.innerText('#bqError')), 'un PIN incorrecto no entra');
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(900);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && !document.getElementById('bloqueoOverlay') && state.grupos[0].alumnos[0].nombre === 'Dato Privado, Alumna'), 'con el PIN correcto se entra y los datos están intactos');
    await p.evaluate(() => { _mostrarBienvenida = false; render(); }); await p.click('#bloqueoBtn'); await esperar(300);
    t.ok((await tapada()).bloqueada, 'el botón 🔒 bloquea al momento');
    // Tutoría comparte el bloqueo.
    await p.goto(t.url + '/tutoria/'); await esperar(1500);
    t.ok((await tapada()).bloqueada, 'Tutoría también se abre tapada');
    for (let i = 0; i < 5; i++) { await p.fill('#bqCampo', '0000'); await p.click('.bq-btn'); await esperar(500); }
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(700);
    t.ok((await tapada()).bloqueada && /Espera/.test(await p.innerText('#bqError')), 'tras cinco intentos fallidos hay que esperar, aunque después se escriba el PIN bueno');
    // Olvidado: el código de recuperación quita el PIN sin tocar los datos.
    await p.reload(); await esperar(1500);
    await p.fill('#bqCampo', '2468'); await p.click('.bq-btn'); await esperar(700);
    t.ok((await tapada()).bloqueada && /Espera/.test(await p.innerText('#bqError')), 'recargar la página no salta la espera');
    await p.evaluate(() => { const i = JSON.parse(localStorage.getItem('cuaderno_bloqueo_intentos')); i.hasta = Date.now() - 1; Storage.prototype.setItem.call(localStorage, 'cuaderno_bloqueo_intentos', JSON.stringify(i)); });
    await p.reload(); await esperar(1500);   // (pasados los 30 s)
    await p.click('#bqOtro'); await p.fill('#bqCampo', 'AAAA-BBBB-CCCC'); await p.click('.bq-btn'); await esperar(900);
    t.ok((await tapada()).bloqueada, 'un código de recuperación inventado no sirve');
    await p.fill('#bqCampo', codigo.toLowerCase().replace(/-/g, ' ')); await p.click('.bq-btn'); await esperar(900);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && !BloqueoPIN.activo), 'el código de recuperación (aunque se escriba en minúsculas y con espacios) quita el PIN');
    await p.goto(t.url + '/'); await esperar(1500);
    t.ok(await p.evaluate(() => !BloqueoPIN.bloqueada && state.grupos[0].alumnos.length === 1) && !p.errores.length, 'y la app vuelve a abrirse sin PIN, con sus datos', p.errores.join('; '));
  } },

  { nombre: 'avisos-encima', descripcion: 'Los avisos y las ventanas de contraseña salen por encima de la ventana desde la que se abren', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const encima = sel => p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return 'no existe'; const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return top === el || el.contains(top) ? 'encima' : 'tapado por ' + (top && (top.className || top.tagName)); }, sel);
    await p.evaluate(async () => { _mostrarBienvenida = false; state.ui.appMode = 'inicio'; render(); await abrirCopias(); await copiaManualAhora(); }); await esperar(600);
    await p.click('#copiasCuerpo button:has-text("Restaurar")'); await esperar(400);
    t.ok(await encima('.dlg-si') === 'encima', '«Restaurar» en 🛟 Copias: la confirmación se ve y se puede pulsar', await encima('.dlg-si'));
    await p.click('.dlg-no'); await esperar(200);
    await p.click('#copiasCuerpo button:has-text("Exportar copia cifrada")'); await esperar(400);
    t.ok(await encima('#pwd1') === 'encima', '«Exportar copia cifrada»: la ventana de la contraseña se ve', await encima('#pwd1'));
    await p.click('#pwdNo'); await esperar(200);
    await p.click('#copiasCuerpo button:has-text("Activar el PIN")'); await esperar(300);
    t.ok(await encima('#bqp1') === 'encima', '«Activar el PIN»: la ventana del PIN se ve', await encima('#bqp1'));
  } },

  { nombre: 'banc-examens', descripcion: "Editor d'exàmens: «📚 Exàmens d'altres anys» mostra els exàmens del material per curs, amb el tema de l'activitat obert", async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { _mostrarBienvenida = false; const g = state.grupos[0]; g.catalogoKey = 'FiQ_3ESO';
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'FiQ_3ESO', sdas: [{ id: 's2', titulo: 'SdA 2', tema: 'Tema 2.- Estats de la matèria', trimestre: 0, criterios: [] }],
        actividades: [{ id: 'pa1', nombre: 'Examen tema 2', tipo: TIPOS[0], esExamen: true, criterios: [], sdaIds: ['s2'] }] }];
      migrarEstado(); g.programacionId = 'p1';
      const act = progCrearActividadEnGrupo(g, state.programaciones[0].actividades[0], 0); g.actividades.push(act);
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = act.id; state.ui.corTab = 'diseno'; save(); render(); });
    await esperar(1500);
    const marc = await p.evaluate(() => { window.__marc = document.getElementById('exFrame'); return !!window.__marc; });
    await p.click('#tabContent button:has-text("Exàmens d\'altres anys")'); await esperar(1500);
    const r = await p.evaluate(() => { const m = [...document.querySelectorAll('.modal-overlay')].pop(); if (!m) return {};
      const curs = m.querySelector('details[open]'), tema = curs && curs.querySelector('details[open]');
      return { curs: curs && curs.querySelector('summary').innerText, tema: tema && tema.querySelector('summary').innerText,
        enllacos: m.querySelectorAll('a[href^="docs/material/"]').length, adaptat: !!m.querySelector('a[href*="FiQ_3ESO/tema-02/"][href*="adaptat"]'),
        altres: /Química 2n Batxillerat/.test(m.innerText), mateixMarc: document.getElementById('exFrame') === window.__marc, teoria: !!m.querySelector('a[href*="dossier-repas"]') }; });
    t.ok(marc && /FiQ 3r ESO · \d+ exàmens/.test(r.curs || ''), 'el curs del grup ix primer i obert', JSON.stringify(r));
    t.ok(/Estats de la matèria.*tema d'aquest examen/.test(r.tema || ''), "el tema de l'activitat ix obert", JSON.stringify(r));
    t.ok(r.enllacos > 80 && r.adaptat && r.altres && !r.teoria, 'llista exàmens (també adaptats) de tots els cursos i res més', JSON.stringify(r));
    t.ok(r.mateixMarc, "obrir el banc no recarrega l'editor del disseny");
    const href = await p.evaluate(() => [...document.querySelectorAll('.modal-overlay a[href^="docs/material/"]')].pop().getAttribute('href'));
    const st = await p.evaluate(async h => (await fetch(h, { method: 'HEAD' })).status, href);
    t.ok(st === 200, 'els enllaços apunten a fitxers que existixen', href + ' ' + st);
    // «✏️ Obrir a l'editor»: l'examen passa al disseny com a preguntes editables
    const botons = await p.evaluate(() => document.querySelectorAll('.modal-overlay button[onclick^="exObrirMaterial"]').length);
    t.ok(botons > 80, "cada examen té el botó «✏️ Obrir a l'editor»", String(botons));
    await p.click('.modal-overlay details[open] details[open] button[onclick^="exObrirMaterial"]'); await esperar(1200);
    const ed = await p.evaluate(() => { const ex = document.getElementById('exFrame').contentWindow.__ee.get(); const est = document.getElementById('exFrame').contentWindow.__ee.estructura();
      return { titol: ex.body[0].type === 'title' && ex.body[0].title, preguntes: ex.body.filter(b => b.type === 'question').length,
        punts: est.nodos.reduce((a, n) => a + (n.max || 0), 0), modal: !!document.querySelector('.modal-overlay') }; });
    t.ok(ed.titol === 'Examen tema 2' && ed.preguntes >= 4 && ed.punts > 0 && !ed.modal, "l'examen s'obri en l'editor amb preguntes i punts, i conserva el títol de l'activitat", JSON.stringify(ed));
    t.ok(!p.errores.length, 'sense errors de JavaScript', p.errores.join(' | '));
    await p.close();
  } },

  { nombre: 'examen-adaptado', descripcion: 'Examen adaptado NESE: aviso, creación desde el Diseño, corrección con su rúbrica y paso por la Programación a otro grupo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    await p.evaluate(() => { _mostrarBienvenida = false; const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.alumnos[1].nese = true;
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'FiQ_2ESO', sdas: [], actividades: [{ id: 'pa1', nombre: 'Examen tema 1', tipo: TIPOS[0], esExamen: true, criterios: [{ critId: cr, peso: 100 }], sdaIds: [] }] }];
      migrarEstado(); g.programacionId = 'p1';
      const act = progCrearActividadEnGrupo(g, state.programaciones[0].actividades[0], 0); g.actividades.push(act);
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = act.id; state.ui.corTab = 'diseno'; save(); render(); });
    await esperar(800);
    const texto = () => p.evaluate(() => document.getElementById('tabContent').innerText);
    t.ok(/Alumne\/a NESE amb l'examen general:.*Beta, Bruno/s.test(await texto()), 'el Diseño avisa de que hay alumnado NESE sin versión adaptada');
    await p.click('#tabContent button:has-text("+ Examen alternatiu")'); await esperar(400);
    await p.check('input[name="altTipo"][value="nese"]'); await p.click('#altSi'); await esperar(1500);
    let r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], v = act.variantes[0];
      return { v: v && v.nombre, alumnos: (v ? v.alumnos : []).map(id => g.alumnos.find(a => a.id === id).nombre), editando: state.ui.corVarId === (v && v.id), tab: state.ui.corTab, aviso: !!document.querySelector('.cx-aviso-nese') }; });
    t.ok(r.v === 'Adaptada (NESE)' && r.alumnos.join() === 'Beta, Bruno' && r.editando && r.tab === 'diseno' && !r.aviso, 'desde el Diseño se crea el examen adaptado, con el alumnado NESE, y se abre para editarlo', JSON.stringify(r));
    // La rúbrica adaptada es distinta y Corregir la usa con Bruno.
    await p.evaluate(() => { const act = state.grupos[0].actividades[0]; cxItemsFlat(act.variantes[0].rubrica)[0].label = 'Pregunta adaptada'; cxItemsFlat(act.rubrica)[0].label = 'Pregunta general'; save(); });
    // Diseño adaptado propio, guardado como plantilla de la Programación (con su rúbrica).
    await p.evaluate(async () => { const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get(); ex.name = 'Examen adaptado de prueba'; w.__ee.cargar(ex); w.__ee.flush && w.__ee.flush(); });
    await esperar(400);
    await p.click('#tabContent button:has-text("Plantilla de la Programación")'); await esperar(800);
    r = await p.evaluate(async () => { const pa = state.programaciones[0].actividades[0], v = state.grupos[0].actividades[0].variantes[0];
      const d = await exGet('prog:pa1:' + v.progVarId);
      return { pv: (pa.variantes || []).map(x => x.nombre + ':' + cxItemsFlat(x.rubrica)[0].label), alumnosEnProg: (pa.variantes || []).some(x => x.alumnos), diseno: d && d.exam.name }; });
    t.ok(r.pv.join() === 'Adaptada (NESE):Pregunta adaptada' && !r.alumnosEnProg && r.diseno === 'Examen adaptado de prueba', 'la versión adaptada (rúbrica y diseño) queda en la Programación, sin alumnado', JSON.stringify(r));
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = state.grupos[0].alumnos[1].id; render(); }); await esperar(300);
    const bruno = await texto();
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    const ana = await texto();
    t.ok(/Pregunta adaptada/.test(bruno) && /Pregunta general/.test(ana) && !/Pregunta adaptada/.test(ana), 'al corregir, Bruno abre la rúbrica adaptada y Ana la general');
    // Guardar también la rúbrica: la Programación no duplica la versión.
    await p.evaluate(() => cxGuardarRubricaEnProgramacion(state.grupos[0].actividades[0].id)); await esperar(300);
    t.ok(await p.evaluate(() => state.programaciones[0].actividades[0].variantes.length === 1), 'guardar la rúbrica en la Programación no duplica la versión adaptada');
    // Otro grupo trae el examen: nace con la versión adaptada, su alumnado NESE y el diseño adaptado.
    r = await p.evaluate(async () => {
      const g2 = defGrupo('1º ESO B', 'FiQ_2ESO'); g2.programacionId = 'p1';
      g2.alumnos = ['Delta, Dani', 'Épsilon, Eva'].map(n => normalizarAlumno({ id: uid(), nombre: n })); g2.alumnos[1].nese = true;
      state.grupos.push(g2);
      const act = progCrearActividadEnGrupo(g2, state.programaciones[0].actividades[0], 0); g2.actividades.push(act);
      state.ui.grupoId = g2.id; state.ui.corExamId = act.id; state.ui.corVarId = act.variantes[0] && act.variantes[0].id; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow;
      return { v: (act.variantes || []).map(v => v.nombre + ':' + cxItemsFlat(v.rubrica)[0].label), alumnos: ((act.variantes[0] || {}).alumnos || []).map(id => g2.alumnos.find(a => a.id === id).nombre),
        rubEva: cxItemsFlat(cxRubricaDe(act, g2.alumnos[1].id))[0].label, rubDani: cxItemsFlat(cxRubricaDe(act, g2.alumnos[0].id))[0].label, diseno: w.__ee.get().name };
    });
    t.ok(r.v.join() === 'Adaptada (NESE):Pregunta adaptada' && r.alumnos.join() === 'Épsilon, Eva', 'en otro grupo el examen nace con la versión adaptada y su alumnado NESE', JSON.stringify(r));
    t.ok(r.rubEva === 'Pregunta adaptada' && r.rubDani === 'Pregunta general' && r.diseno === 'Examen adaptado de prueba', 'con la rúbrica y el diseño adaptados de la plantilla', JSON.stringify(r));
    // «Hace el general» y un NESE nuevo después.
    r = await p.evaluate(async () => { const g2 = state.grupos[1], act = g2.actividades[0];
      const nuevo = normalizarAlumno({ id: uid(), nombre: 'Zeta, Zoe' }); nuevo.nese = true; g2.alumnos.push(nuevo);
      state.ui.corVarId = ''; state.ui.corTab = 'editor'; render(); await new Promise(r => setTimeout(r, 200));
      const avisa = /Zeta, Zoe/.test((document.querySelector('.cx-aviso-nese') || {}).innerText || '');
      document.querySelector('.cx-aviso-nese button.btn').click(); await new Promise(r => setTimeout(r, 200));
      const anadida = act.variantes[0].alumnos.includes(nuevo.id);
      const otro = normalizarAlumno({ id: uid(), nombre: 'Omega, Olga' }); otro.nese = true; g2.alumnos.push(otro); render(); await new Promise(r => setTimeout(r, 200));
      [...document.querySelectorAll('.cx-aviso-nese button')].find(b => /general/.test(b.textContent)).click(); await new Promise(r => setTimeout(r, 200));
      return { avisa, anadida, sinAviso: !document.querySelector('.cx-aviso-nese'), rubOlga: cxItemsFlat(cxRubricaDe(act, otro.id))[0].label };
    });
    t.ok(r.avisa && r.anadida, 'un alumno marcado NESE más tarde aparece en el aviso y se añade con un toque', JSON.stringify(r));
    t.ok(r.sinAviso && r.rubOlga === 'Pregunta general', '«Hace el general» deja de avisar y se corrige con la general', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'modelo-b', descripcion: 'Modelo B: sigue al general, reparto A/B, rúbrica en el orden del B y enlace de una rúbrica hecha a mano', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani'].length ? { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani'] } : {});
    // Examen general con 4 preguntas (la 3.ª con dos subpreguntas) y su rúbrica importada del diseño.
    const r0 = await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0];
      g.actividades = [{ id: 'e1', nombre: 'Examen', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q = (id, txt, pts, hijos) => ({ id, type: 'question', title: '', text: txt, points: hijos ? '' : String(pts), children: hijos || [] });
      const sq = (id, txt, pts) => ({ id, type: 'subquestion', title: '', text: txt, points: String(pts), children: [] });
      ex.body = ex.body.filter(n => n.type === 'title').concat([q('q1', 'Define latitud', 2), q('q2', 'Define longitud', 2), q('q3', 'Mapa', 0, [sq('s31', 'Escala del mapa', 2), sq('s32', 'Leyenda del mapa', 2)]), q('q4', 'Explica el clima', 2)]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500));
      return (await exGet('e1')).exam.body.filter(n => n.type === 'question').length; });
    t.ok(r0 === 4, 'el examen general de prueba tiene 4 preguntas', String(r0));
    await p.click('#tabContent button:has-text("Importar a la rúbrica")'); await esperar(800);
    await p.evaluate(() => { const b = document.querySelector('.dlg-si'); if (b) b.click(); }); await esperar(600);
    // Modelo B: se crea barajado y con las mismas preguntas.
    t.ok(await p.evaluate(() => !!state.grupos[0].actividades[0].rubrica), 'la rúbrica se importa del diseño');
    await p.evaluate(() => { state.ui.corTab = 'diseno'; exVerB(); }); await esperar(2200);
    let r = await p.evaluate(async () => { const act = state.grupos[0].actividades[0], B = (await exGet('e1:B')).exam, G = (await exGet('e1')).exam;
      const qs = e => e.body.filter(n => n.type === 'question').map(n => n.id);
      return { hayModelo: !!mbModelo(act, 'B'), a: qs(G), b: qs(B), eyebrow: (B.body.find(n => n.type === 'title') || {}).eyebrow, numB: mbModelo(act, 'B') && mbModelo(act, 'B').num }; });
    t.ok(r.hayModelo && r.b.slice().sort().join() === r.a.slice().sort().join() && r.b.join() !== r.a.join(), 'el modelo B tiene las mismas preguntas en otro orden', JSON.stringify(r));
    t.ok(/Model B/.test(r.eyebrow || '') && r.numB && Object.keys(r.numB).length === 4, 'lleva «Modelo B» encima del título y guarda la numeración de cada pregunta', JSON.stringify(r));
    const ordenB = r.b;
    // Se cambia el general: el B lo sigue (nueva pregunta incluida) sin perder su orden.
    r = await p.evaluate(async () => { exSel(''); await new Promise(r => setTimeout(r, 2000));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      ex.body.find(n => n.id === 'q1').text = 'Define latitud (CAMBIADO)'; ex.body.push({ id: 'q5', type: 'question', title: '', text: 'Pregunta nueva', points: '1', children: [] });
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 1200));
      const B = (await exGet('e1:B')).exam;
      return { b: B.body.filter(n => n.type === 'question').map(n => n.id), texto: B.body.find(n => n.id === 'q1').text }; });
    t.ok(r.texto === 'Define latitud (CAMBIADO)' && r.b.includes('q5') && r.b.filter(id => id !== 'q5').join() === ordenB.join(), 'al cambiar el general, el modelo B se pone al día y conserva su orden', JSON.stringify(r));
    // En el B solo cuenta el orden: un cambio de texto allí no se guarda.
    r = await p.evaluate(async () => { window.__dialogosAuto = { confirmar: true }; exVerB(); await new Promise(r => setTimeout(r, 2200));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const qs = ex.body.filter(n => n.type === 'question'); const i0 = ex.body.indexOf(qs[0]), i1 = ex.body.indexOf(qs[1]); [ex.body[i0], ex.body[i1]] = [ex.body[i1], ex.body[i0]];
      ex.body.find(n => n.id === 'q2').text = 'TEXTO CAMBIADO EN EL B';
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 1200));
      const B = (await exGet('e1:B')).exam, act = state.grupos[0].actividades[0];
      return { ordenGuardado: mbModelo(act, 'B').orden._raiz, b: B.body.filter(n => n.type === 'question').map(n => n.id), texto: B.body.find(n => n.id === 'q2').text, aviso: (window.__dialogosLog || []).some(m => /només compta l.ORDRE/.test(m)) }; });
    t.ok(r.b.join() === r.ordenGuardado.join() && r.texto === 'Define longitud' && r.aviso, 'en el modelo B el orden manual se guarda y los cambios de texto no (con aviso)', JSON.stringify(r));
    // Reparto y corrección.
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; render(); }); await esperar(300);
    await p.click('button:has-text("Alternar A/B per llista")'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0]; return { deB: g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.nombre), botones: document.querySelectorAll('.mb-ab').length }; });
    t.ok(r.deB.join() === 'Beta, Bruno,Delta, Dani' && r.botones === 4, '«Alternar por lista» reparte A, B, A, B y cada alumno/a tiene su selector', JSON.stringify(r));
    await p.evaluate(() => { const g = state.grupos[0]; mbSetModelo(g.alumnos[2].id, 'B'); }); await esperar(200);
    const orden = () => p.evaluate(() => { const act = state.grupos[0].actividades[0], ids = [];
      (function w(l) { l.forEach(n => { if (n.fuenteId && /^q/.test(n.fuenteId) && !ids.includes(n.fuenteId)) ids.push(n.fuenteId); (n.items || []).forEach(it => { if (it.fuenteId && /^q/.test(it.fuenteId) && !ids.includes(it.fuenteId)) ids.push(it.fuenteId); }); w(n.subs || []); }); })(mbRubricaVista(act, state.ui.corAlId));
      return ids; });
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[1].id; render(); }); await esperar(300);
    const vistaB = await orden(), textoB = await p.evaluate(() => document.getElementById('tabContent').innerText);
    await p.evaluate(() => { state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }); await esperar(300);
    const vistaA = await orden(), textoA = await p.evaluate(() => document.getElementById('tabContent').innerText);
    const ordenFinal = await p.evaluate(() => mbModelo(state.grupos[0].actividades[0], 'B').orden._raiz);
    t.ok(vistaB.join() === ordenFinal.filter(id => id !== 'q5').join() && vistaA.join() === 'q1,q2,q3,q4',   // q5 se añadió al diseño después de importar la rúbrica
       'al corregir, el modelo B sale en el orden del B y el A en el suyo', JSON.stringify({ vistaA, vistaB, ordenFinal }));
    t.ok(/Model B/.test(textoB) && /model A: \d/.test(textoB) && !/Model B/.test(textoA), 'el B lleva «Modelo B» y el número de cada pregunta en el A', textoB.slice(0, 200));
    // Mismas puntuaciones, misma nota: corregir a Bruno con el B y comprobar su nota.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], al = g.alumnos[1];
      const sc = g.rubricScores[al.id] = g.rubricScores[al.id] || {}; sc[act.id] = {}; cxItemsFlat(act.rubrica).forEach(it => { sc[act.id][it.id] = Number(it.max); });
      cxRecalcAlumno(g, act, al.id); return g.notasCuant[al.id][act.id]; });
    t.ok(r === 10, 'con todo bien en el modelo B la nota es 10: la rúbrica es la misma', String(r));
    // Impresión en el orden del B.
    const imp = await p.evaluate(() => { const g = state.grupos[0]; return cxRubricaBodyHTML(g, g.actividades[0], g.alumnos[1], {}); });
    t.ok(/Model B/.test(imp), 'la rúbrica impresa del modelo B lo indica');
    // Plano de aula: damero.
    r = await p.evaluate(() => { const g = state.grupos[0]; g.plano.posiciones = { [g.alumnos[0].id]: { fila: 0, col: 0 }, [g.alumnos[1].id]: { fila: 0, col: 1 }, [g.alumnos[2].id]: { fila: 1, col: 0 }, [g.alumnos[3].id]: { fila: 1, col: 1 } };
      save(); render(); mbAlternarPlano(); return g.alumnos.filter(a => mbModeloDe(g.actividades[0], a.id) === 'B').map(a => a.nombre).sort(); });
    t.ok(r.join() === 'Beta, Bruno,Gamma, Gema', '«Alternar según el plano» reparte en damero (ni al lado ni delante el mismo modelo)', JSON.stringify(r));
    // Rúbrica hecha a mano (sin enlaces): se enlaza por el texto sin tocar lo corregido.
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0];
      const antes = JSON.stringify(g.rubricScores), ids = cxItemsFlat(act.rubrica).map(i => i.id).join();
      (function w(l) { l.forEach(n => { delete n.fuenteId; (n.items || []).forEach(it => { delete it.fuenteId; }); w(n.subs || []); }); })(act.rubrica);
      const sinEnlace = mbRubricaEnlazada(act);
      state.ui.corTab = 'diseno'; state.ui.corModelo = ''; render(); await new Promise(r => setTimeout(r, 2200));
      const boton = [...document.querySelectorAll('#tabContent button')].find(b => /Enllaçar la rúbrica/.test(b.textContent));
      await mbEnlazarRubrica(); await new Promise(r => setTimeout(r, 300));
      document.getElementById('mbSi').click(); await new Promise(r => setTimeout(r, 300));
      return { boton: !!boton, sinEnlace, enlazada: mbRubricaEnlazada(act), sinEnlazar: mbSinEnlazar(act), mismosIds: cxItemsFlat(act.rubrica).map(i => i.id).join() === ids, mismasNotas: JSON.stringify(g.rubricScores) === antes,
        bloqueQ3: (cxNodosFlat(act.rubrica).find(x => (x.n.items || []).some(it => it.fuenteId === 's31')) || {}).n.fuenteId }; });
    t.ok(r.boton && !r.sinEnlace && r.enlazada && r.sinEnlazar === 0 && r.bloqueQ3 === 'q3', 'una rúbrica sin enlazar se enlaza con el diseño (ítems y bloques)', JSON.stringify(r));
    t.ok(r.mismosIds && r.mismasNotas, 'enlazar no cambia ningún ítem ni lo ya corregido', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'modelos-abc', descripcion: 'Modelos A, B y C: tres órdenes distintos, máximo tres, reparto A/B/C (lista y plano), corrección en el orden del C, quitar un modelo y paso del formato antiguo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema', 'Delta, Dani', 'Eta, Eva', 'Zeta, Zoe'] });
    await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0];
      g.actividades = [{ id: 'e1', nombre: 'Examen', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q = (id, txt) => ({ id, type: 'question', title: '', text: txt, points: '2', children: [] });
      ex.body = ex.body.filter(n => n.type === 'title').concat([q('q1', 'Define latitud'), q('q2', 'Define longitud'), q('q3', 'Explica la escala'), q('q4', 'Explica el clima'), q('q5', 'Comenta el mapa')]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500)); });
    await p.click('#tabContent button:has-text("Importar a la rúbrica")'); await esperar(800);
    await p.evaluate(() => { const b = document.querySelector('.dlg-si'); if (b) b.click(); }); await esperar(600);
    await p.evaluate(() => { state.ui.corTab = 'diseno'; render(); }); await esperar(2000);
    await p.click('#tabContent button:has-text("+ Modelo B")'); await esperar(2200);
    await p.click('#tabContent button:has-text("+ Modelo C")'); await esperar(2200);
    let r = await p.evaluate(async () => { const act = state.grupos[0].actividades[0], qs = e => e.body.filter(n => n.type === 'question').map(n => n.id);
      const A = (await exGet('e1')).exam, B = (await exGet('e1:B')).exam, C = (await exGet('e1:C')).exam;
      return { letras: mbLista(act).map(m => m.letra), a: qs(A), b: qs(B), c: qs(C), eyC: (C.body.find(n => n.type === 'title') || {}).eyebrow, viendo: state.ui.corModelo,
        masModelos: [...document.querySelectorAll('#tabContent button')].some(b => /\+ Modelo/.test(b.textContent)) }; });
    t.ok(r.letras.join() === 'B,C' && r.viendo === 'C' && /Model C/.test(r.eyC), 'se crean los modelos B y C, y el C lleva «Modelo C» encima del título', JSON.stringify(r));
    t.ok(new Set([r.a.join(), r.b.join(), r.c.join()]).size === 3 && r.b.slice().sort().join() === r.a.join() && r.c.slice().sort().join() === r.a.join(), 'los tres modelos tienen las mismas preguntas en tres órdenes distintos', JSON.stringify(r));
    t.ok(!r.masModelos, 'con A, B y C ya no se ofrece crear otro modelo (máximo tres)');
    // Reparto A/B/C por lista.
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; render(); }); await esperar(300);
    await p.click('button:has-text("Alternar A/B/C per llista")'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0];
      return { rep: g.alumnos.map(a => mbModeloDe(act, a.id)).join(''), botones: [...document.querySelectorAll('.mb-ab')].map(x => x.querySelectorAll('button').length) }; });
    t.ok(r.rep === 'ABCABC' && r.botones.length === 6 && r.botones.every(n => n === 3), '«Alternar por lista» reparte A, B, C, A, B, C y cada alumno/a tiene el selector A/B/C', JSON.stringify(r));
    // Corregir a Gema (modelo C): la rúbrica sale en el orden del C; la nota no cambia.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], al = g.alumnos[2]; state.ui.corAlId = al.id; render();
      const vista = mbRubricaVista(act, al.id).flatMap(n => [n.fuenteId, ...(n.items || []).map(i => i.fuenteId)]).filter(id => /^q/.test(id || '')).filter((v, i, a) => a.indexOf(v) === i);
      const sc = g.rubricScores[al.id] = g.rubricScores[al.id] || {}; sc[act.id] = {}; cxItemsFlat(act.rubrica).forEach(it => { sc[act.id][it.id] = Number(it.max); });
      cxRecalcAlumno(g, act, al.id);
      return { vista, ordenC: mbModelo(act, 'C').orden._raiz, texto: document.getElementById('tabContent').innerText, nota: g.notasCuant[al.id][act.id],
        imp: cxRubricaBodyHTML(g, act, al, {}) }; });
    t.ok(r.vista.join() === r.ordenC.join() && /Model C/.test(r.texto) && /Model C/.test(r.imp), 'al corregir e imprimir, el modelo C sale en su orden y lo indica', JSON.stringify({ vista: r.vista, ordenC: r.ordenC }));
    t.ok(r.nota === 10, 'con todo bien en el modelo C la nota es 10: la rúbrica es la misma', String(r.nota));
    // Plano con tres modelos: ni el de al lado ni el de delante tienen el mismo.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0], pos = {};
      g.alumnos.forEach((a, i) => { pos[a.id] = { fila: Math.floor(i / 3), col: i % 3 }; }); g.plano.posiciones = pos; state.ui.corAlId = ''; save(); render(); mbAlternarPlano();
      const m = (f, c) => mbModeloDe(act, g.alumnos[f * 3 + c].id); const mal = [];
      for (let f = 0; f < 2; f++) for (let c = 0; c < 3; c++) { if (c < 2 && m(f, c) === m(f, c + 1)) mal.push(`${f},${c} lado`); if (f < 1 && m(f, c) === m(f + 1, c)) mal.push(`${f},${c} delante`); }
      return { mal, filas: [0, 1].map(f => [0, 1, 2].map(c => m(f, c)).join('')) }; });
    t.ok(!r.mal.length && r.filas[0].length === 3 && new Set(r.filas[0]).size === 3, '«Alternar según el plano» con tres modelos: ni al lado ni delante el mismo', JSON.stringify(r));
    // Quitar el B: su alumnado pasa al A y el C pasa a llamarse B (con su alumnado y su orden).
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0]; window.__dialogosAuto = { confirmar: true };
      const ordenC = mbModelo(act, 'C').orden._raiz.join(), deC = g.alumnos.filter(a => mbModeloDe(act, a.id) === 'C').map(a => a.id).join(), deB = g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.id);
      state.ui.corTab = 'diseno'; state.ui.corModelo = 'B'; render(); await new Promise(r => setTimeout(r, 2000));
      await exQuitarModelo(); await new Promise(r => setTimeout(r, 2000));
      return { letras: mbLista(act).map(m => m.letra).join(), ordenB: mbModelo(act, 'B').orden._raiz.join(), ordenC, nuevosB: g.alumnos.filter(a => mbModeloDe(act, a.id) === 'B').map(a => a.id).join(), deC,
        antiguosBenA: deB.every(id => mbModeloDe(act, id) === 'A'), disenoC: !!(await exGet('e1:C')), viendo: state.ui.corModelo }; });
    t.ok(r.letras === 'B' && r.ordenB === r.ordenC && r.nuevosB === r.deC && r.antiguosBenA && !r.disenoC && r.viendo === '', 'al quitar el modelo B, su alumnado pasa al A y el C pasa a ser el B', JSON.stringify(r));
    // Datos de la versión anterior (act.modeloB) pasan al formato nuevo sin perder nada.
    r = await p.evaluate(() => { const g = state.grupos[0], ids = g.alumnos.map(a => a.id);
      g.actividades.push({ id: 'e2', nombre: 'Viejo', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [],
        modeloB: { orden: { _raiz: ['q2', 'q1'] }, alumnos: [ids[1], ids[3]], numA: { q1: '1.', q2: '2.' }, numB: { q1: '2.', q2: '1.' }, examId: 'xB' } });
      migrarEstado(); const a = g.actividades.find(x => x.id === 'e2');
      return { sinViejo: !a.modeloB, b: mbModelo(a, 'B'), numA: a.modelos.numA, quien: ids.map(id => mbModeloDe(a, id)).join('') }; });
    t.ok(r.sinViejo && r.b && r.b.orden._raiz.join() === 'q2,q1' && r.b.examId === 'xB' && r.b.num.q1 === '2.' && r.numA.q1 === '1.' && r.quien === 'ABABAA', 'un modelo B de la versión anterior se conserva: orden, numeración y quién lo hace', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'examen-otro-dia', descripcion: 'Examen alternativo «otro día»: se crea para quien no vino, con fecha y en blanco, sin alumnado NESE; sale en la misma lista y se corrige con su rúbrica', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0]; g.alumnos[1].nese = true;
      g.actividades = [{ id: 'e1', nombre: 'Examen Unidad 1', tipo: TIPOS[0], trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [], escalarA10: true,
        rubrica: [{ id: 's1', title: 'Preguntas', items: [{ id: 'i1', label: 'Pregunta general', max: 10, links: [] }], subs: [] }] }];
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = 'e1'; state.ui.corTab = 'diseno'; save(); render();
      await new Promise(r => setTimeout(r, 1800));
      const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      ex.body = ex.body.filter(n => n.type === 'title').concat([{ id: 'q1', type: 'question', title: '', text: 'Pregunta del día del examen', points: '10', children: [] }]);
      w.__ee.cargar(ex); w.__ee.flush(); await new Promise(r => setTimeout(r, 500)); });
    await p.click('#tabContent button:has-text("+ Examen alternatiu")'); await esperar(400);
    let r = await p.evaluate(() => ({ nombre: document.getElementById('altNombre').value, fecha: document.getElementById('altFecha').value,
      marcados: [...document.querySelectorAll('#altAlumnos input:checked')].length }));
    t.ok(r.nombre === 'Un altre dia' && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) && r.marcados === 0, 'por defecto es «Otro día», con la fecha de hoy y sin nadie marcado (tampoco el alumnado NESE)', JSON.stringify(r));
    await p.fill('#altNombre', 'Unidad 1 · recuperación de falta'); await p.fill('#altFecha', '2026-11-20');
    await p.check('input[name="altInicio"][value="blanco"]');
    await p.check('#altAlumnos input[value="' + await p.evaluate(() => state.grupos[0].alumnos[0].id) + '"]');
    await p.click('#altSi'); await esperar(2200);
    r = await p.evaluate(async () => { const g = state.grupos[0], act = g.actividades[0], v = act.variantes[0], d = await exGet('e1:' + v.id);
      return { tipo: v.tipo, fecha: v.fecha, nombre: v.nombre, alumnos: v.alumnos.map(id => g.alumnos.find(a => a.id === id).nombre), editando: state.ui.corVarId === v.id,
        preguntas: d ? d.exam.body.filter(n => n.type === 'question').length : -1, avisoNese: /Beta, Bruno/.test((document.querySelector('.cx-aviso-nese') || {}).innerText || ''),
        ofreceAnadir: !!document.querySelector('.cx-aviso-nese select, .cx-aviso-nese button.btn[onclick*="cxAnadirNese"]') }; });
    t.ok(r.tipo === 'ausencia' && r.fecha === '2026-11-20' && r.nombre === 'Unidad 1 · recuperación de falta' && r.alumnos.join() === 'Alfa, Ana' && r.editando, 'se crea el examen alternativo para Ana, con su nombre y su fecha, y se abre para diseñarlo', JSON.stringify(r));
    t.ok(r.preguntas === 0, 'empieza en blanco (no copia las preguntas del general)', JSON.stringify(r));
    t.ok(r.avisoNese && !r.ofreceAnadir, 'el alumnado NESE no entra en el examen de otro día, y el aviso NESE no lo ofrece como versión adaptada', JSON.stringify(r));
    // Misma lista de corrección, con su rúbrica.
    r = await p.evaluate(() => { const g = state.grupos[0], act = g.actividades[0]; cxItemsFlat(act.variantes[0].rubrica)[0].label = 'Pregunta del otro día';
      state.ui.corTab = 'corregir'; state.ui.corAlId = ''; state.ui.corVarId = ''; render();
      const lista = document.getElementById('tabContent').innerText;
      state.ui.corAlId = g.alumnos[0].id; render(); const ana = document.getElementById('tabContent').innerText;
      state.ui.corAlId = g.alumnos[2].id; render(); const gema = document.getElementById('tabContent').innerText;
      return { filas: (lista.match(/Corregir/g) || []).length, badge: /Unidad 1 · recuperación de falta · 20\/11\/2026/.test(lista), ana: /Pregunta del otro día/.test(ana) && /otro día/.test(ana), gema: /Pregunta general/.test(gema) && !/Pregunta del otro día/.test(gema) }; });
    t.ok(r.badge && r.filas >= 3, 'Ana sale en la misma lista de corrección, con el nombre y la fecha de su examen', JSON.stringify(r));
    t.ok(r.ana && r.gema, 'Ana se corrige con la rúbrica del otro día y Gema con la general', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.join('; '));
  } },

  { nombre: 'que-me-falta', descripcion: 'Inicio: «Qué me falta» detecta notas a medias y comentarios pendientes', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['A, Uno', 'B, Dos', 'C, Tres', 'D, Cuatro'] });
    const txt = await p.evaluate(() => { const g = state.grupos[0], [A, B, C, D] = g.alumnos.map(a => a.id), cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen tema 1', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] },
                       { id: 't2', nombre: 'Sin corregir', trimestre: 0, bloqueId: 'b1', criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [A]: { e1: 7 }, [B]: { e1: 5 } }; g.marcas = { [C]: { e1: 'NP' } }; g.alumnos[0].comentariosEval = ['Bien', '', ''];
      state.ui.appMode = 'inicio'; save(); render(); return document.querySelector('.que-falta')?.innerText || ''; });
    t.ok(/Examen tema 1.*falta 1 nota.*D, Cuatro/s.test(txt), 'avisa de la nota que falta (sin contar NP)', txt);
    t.ok(!/Sin corregir/.test(txt), 'no avisa de actividades sin empezar a corregir');
    t.ok(/1 alumne amb nota i sense comentari/.test(txt), 'avisa del comentario pendiente', txt);
  } },

  { nombre: 'calificar', descripcion: 'Calificar (Tarjetas): Intro pasa al siguiente y las notas se guardan', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      state.ui.appMode = 'competencial'; state.ui.tab = 'calificar'; state.ui.calViewMode = 'cards'; save(); render(); });
    await esperar(400);
    await p.locator('[data-cal-col="cuant"]').first().fill('7,5'); await p.keyboard.press('Enter'); await esperar(200);
    t.ok(await p.evaluate(() => document.activeElement?.getAttribute('data-cal-al') === state.grupos[0].alumnos[1].id), 'Intro pasa al siguiente alumno');
    await p.keyboard.type('4'); await p.keyboard.press('Enter'); await esperar(200);
    const notas = await p.evaluate(() => state.grupos[0].alumnos.map(a => state.grupos[0].notasCuant[a.id]?.e1 ?? null));
    t.ok(JSON.stringify(notas) === '[7.5,4,null]', 'las notas se guardan', JSON.stringify(notas));
  } },

  { nombre: 'corregir-desplegable', descripcion: 'Corregir: la puntuación de cada ítem se elige en un desplegable de 0,05 en 0,05 y permite «No presentado»', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: state.ui.trim, bloqueId: 'b0', esExamen: true, criterios: [],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [{ id: 'i1', label: 'Ítem 1', max: 2, links: [] }, { id: 'i2', label: 'Ítem 2', max: 0.5, links: [] }], subs: [] }] }];
      g.rubricScores = { [A]: { e1: { i2: 0.33 } } };
      state.ui.appMode = 'corrector'; state.ui.corTab = 'corregir'; state.ui.corExamId = 'e1'; state.ui.corAlId = A; state.ui.corModoPreg = false; save(); render(); });
    await esperar(300);
    const sel = p.locator('select[aria-label^="Puntuación"]');
    t.ok(await sel.count() === 2, 'hay un desplegable por ítem', String(await sel.count()));
    const ops = await sel.first().evaluate(s => [...s.options].map(o => o.textContent));
    t.ok(ops.length === 43 && ops[0] === '—' && ops[1] === 'NP' && ops[2] === '0' && ops[3] === '0,05' && ops[4] === '0,1' && ops[42] === '2', 'va de 0 a 2 de 0,05 en 0,05 y tiene NP', ops.join(' '));
    t.ok(await sel.nth(1).inputValue() === '0.33', 'conserva una nota guardada que no cae en la rejilla (0,33)');
    await sel.first().selectOption('1.75'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[0].id].e1.i1; }) === 1.75, 'guarda la puntuación elegida (1,75)');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === '1.75', 'el desplegable muestra lo elegido tras redibujar');
    await p.locator('select[aria-label^="Puntuación"]').first().selectOption('NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return g.marcas[A].e1 === 'NP' && g.notasCuant[A].e1 === 0; }), '«NP» marca No presentado y la nota del examen es 0');
    t.ok(await p.locator('select[aria-label^="Puntuación"]').first().inputValue() === 'NP', 'con NP marcado el desplegable muestra NP');
    await p.locator('select[aria-label^="Puntuación"]').first().selectOption('1.5'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], A = g.alumnos[0].id; return !(g.marcas[A] || {}).e1 && g.rubricScores[A].e1.i1 === 1.5; }), 'elegir una puntuación quita la marca NP');
    await p.evaluate(() => { state.ui.corAlId = ''; state.ui.corModoPreg = true; state.ui.corPregSel = 'i1'; save(); render(); });
    await esperar(300);
    const filas = p.locator('select.ex-preg-in');
    t.ok(await filas.count() === 3, 'por pregunta: un desplegable por alumno/a');
    await filas.nth(1).selectOption('0.45'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[1].id].e1.i1; }) === 0.45, 'por pregunta: guarda la puntuación');
    await p.locator('select.ex-preg-in').nth(2).selectOption('NP'); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0], C = g.alumnos[2].id; return g.marcas[C].e1 === 'NP' && g.notasCuant[C].e1 === 0; }), 'por pregunta: NP marca No presentado (nota 0)');
    t.ok(await p.locator('select.ex-preg-in').nth(2).inputValue() === 'NP', 'por pregunta: la fila muestra NP');
    await filas.nth(1).selectOption(''); await esperar(200);
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return g.rubricScores[g.alumnos[1].id].e1.i1; }) === undefined, '«—» deja el ítem sin puntuar');
  } },

  { nombre: 'rubrica-resumida', descripcion: 'Imprimir rúbrica resumida: puntuaciones y anotaciones, sin el detalle de lo que había que contestar', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(() => {
      const g = state.grupos[0], [A, B] = g.alumnos.map(a => a.id);
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: state.ui.trim, bloqueId: 'b0', esExamen: true, criterios: [],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [{ id: 'i1', label: 'Explica la causa', desc: ['DETALLE-LARGO-DE-LA-RESPUESTA'], max: 2, links: [] }], subs: [] }] }];
      g.rubricScores = { [A]: { e1: { i1: 1.5 } }, [B]: { e1: { i1: 2 } } };
      g.examComentarios = { [A]: { e1: 'COMENTARIO-GENERAL', 'e1|i1': 'ANOTACION-PREGUNTA' } };
      cxRecalcAlumno(g, g.actividades[0], A); cxRecalcAlumno(g, g.actividades[0], B);
      const sal = {}; const orig = window.abrirVentanaInforme;
      window.abrirVentanaInforme = (titulo, html) => { sal.titulo = titulo; sal.html = html; };
      cxImprimirRubrica(A, 'e1'); sal.normal = sal.html;
      cxImprimirRubrica(A, 'e1', true); sal.res = sal.html; sal.tituloRes = sal.titulo;
      cxImprimirRubricasTodos('e1'); sal.todos = sal.html;
      cxImprimirRubricasTodos('e1', true); sal.todosRes = sal.html;
      window.abrirVentanaInforme = orig;
      return sal;
    });
    t.ok(r.normal.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'la rúbrica normal sigue incluyendo el detalle');
    t.ok(!r.res.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'la resumida no incluye el detalle de lo que había que contestar');
    t.ok(r.res.includes('Explica la causa') && r.res.includes('1,5') && r.res.includes('ANOTACION-PREGUNTA') && r.res.includes('COMENTARIO-GENERAL'), 'la resumida conserva pregunta, puntuación y anotaciones del profesor');
    t.ok(/resum/i.test(r.res) && /resumida/.test(r.tituloRes), 'se identifica como resumen');
    t.ok(r.res.length < r.normal.length + 1500 && r.res.includes('cx-total-box'), 'incluye el total');
    t.ok(r.todos.includes('Cadascun ocupa la seua pròpia pàgina'), 'imprimir todas (normal) mantiene la portada');
    t.ok(!r.todosRes.includes('Cada uno ocupa su propia página') && !r.todosRes.includes('DETALLE-LARGO-DE-LA-RESPUESTA'), 'todas resumidas: sin portada ni detalle');
    t.ok((r.todosRes.match(/class="cx-alumno"/g) || []).length === 2 && (r.todosRes.match(/break-before:page/g) || []).length === 1, 'todas resumidas: un bloque por alumno/a corregido y salto de página entre ellos');
  } },

  { nombre: 'rubrica-niveles', descripcion: 'Rúbrica por niveles de logro: crear, corregir pinchando casillas, afinar, cambiar valores y pesos, imprimir, plantillas y cambio de tipo', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const [A, B] = await cuadernoConGrupo(p, t.url);
    const cr = await p.evaluate(() => getCatalogo('FiQ_2ESO').ces[0].criterios.slice(0, 2).map(c => c.id));
    // Crear desde el formulario «Nuevo examen», con dos criterios marcados.
    await p.evaluate(cr => { state.ui.appMode = 'corrector'; state.ui.corTab = 'crear';
      state.ui.corForm = { nombre: 'Exposición oral', bloqueId: '', sda: '', fecha: '', plantillaId: '', criterios: cr, tipoRub: 'niveles' }; save(); render(); }, cr);
    await esperar(300);
    t.ok(await p.locator('input[name="cxfTipo"][value="niveles"]').isChecked(), 'el formulario ofrece el tipo «por niveles»');
    await p.locator('#cxfBtn').click(); await esperar(300);
    const r0 = await p.evaluate(() => { const a = state.grupos[0].actividades[0]; return { esExamen: a.esExamen, f: a.rubrica[0].formato, niv: a.rubrica[0].niveles.map(l => l.nombre + ':' + l.valor).join(','), cats: a.rubrica[0].items.map(i => i.max + '|' + i.links.map(l => l.critId).join('')), tab: state.ui.corTab }; });
    t.ok(r0.esExamen && r0.f === 'niveles' && r0.tab === 'editor', 'se crea un examen con rúbrica por niveles y se abre el editor');
    t.ok(r0.niv === 'Expert:4,Avançat:3,Aprenent:2,Novell:1', 'niveles por defecto 4-3-2-1', r0.niv);
    t.ok(r0.cats.length === 2 && r0.cats[0] === '5|' + cr[0] && r0.cats[1] === '5|' + cr[1], 'una categoría por criterio, 50 % cada una y vinculada', r0.cats.join(' '));
    t.ok(await p.locator('table.cxn-editor').count() === 1 && await p.locator('table.cxn-editor tbody textarea').count() === 2 * 5, 'el editor muestra la tabla (nombre + 4 casillas por categoría)');
    await p.locator('table.cxn-editor tbody tr').first().locator('td textarea').first().fill('Habla con un volumen adecuado TEXTO-EXPERTO');
    await p.locator('table.cxn-editor tbody tr').first().locator('td textarea').first().dispatchEvent('change');
    const ids = await p.evaluate(() => { const r = state.grupos[0].actividades[0].rubrica[0]; return { act: state.grupos[0].actividades[0].id, c1: r.items[0].id, c2: r.items[1].id, n: r.niveles.map(l => l.id) }; });
    t.ok(await p.evaluate(ids => state.grupos[0].actividades[0].rubrica[0].items[0].celdas[ids.n[0]], ids) === 'Habla con un volumen adecuado TEXTO-EXPERTO', 'se guarda el descriptor de la casilla');
    // Corregir pinchando casillas.
    await p.evaluate(A => { state.ui.corTab = 'corregir'; state.ui.corAlId = A; save(); render(); }, A); await esperar(300);
    const filas = p.locator('table.cxn-corr tbody tr');
    t.ok(await filas.count() === 2 && await p.locator('table.cxn-corr td.cxn-op button').count() === 8, 'al corregir sale la tabla con 2 × 4 casillas');
    await filas.nth(0).locator('td.cxn-op button').nth(1).click(); await esperar(200);
    await p.locator('table.cxn-corr tbody tr').nth(1).locator('td.cxn-op button').nth(0).click(); await esperar(200);
    const nota = () => p.evaluate(({ A, act }) => { const g = state.grupos[0]; return { n: g.notasCuant[A][act], c: g.notas[A][act], sc: g.rubricScores[A][act] }; }, { A, act: ids.act });
    let r = await nota();
    t.ok(r.sc[ids.c1] === 3.75 && r.sc[ids.c2] === 5 && r.n === 8.75, 'Avanzado (3/4 de 5) + Experto = 8,75', JSON.stringify(r));
    t.ok(r.c[cr[0]] === 7.5 && r.c[cr[1]] === 10, 'la nota de cada criterio sale de su categoría', JSON.stringify(r.c));
    t.ok(await p.locator('table.cxn-corr td.cxn-op.on').count() === 2 && await p.locator('table.cxn-corr td.cxn-op.on button[aria-pressed="true"]').count() === 2, 'las casillas elegidas se marcan (también para lectores de pantalla)');
    // Afinar con el desplegable.
    await p.locator('table.cxn-corr tbody tr').first().locator('select').selectOption('3.4'); await esperar(200);
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.4 && r.n === 8.4, 'afinar: 3,4 puntos', JSON.stringify(r));
    t.ok((await p.locator('.cxn-entre').first().textContent()).includes('entre Avançat i Aprenent') && await p.locator('td.cxn-op.parcial').count() === 2, 'una nota afinada se ve «entre» dos niveles');
    // Cambiar el valor de los niveles y el peso: lo corregido sigue en su nivel.
    await p.locator('table.cxn-corr tbody tr').first().locator('td.cxn-op button').nth(1).click(); await esperar(200);
    await p.evaluate(() => { state.ui.corTab = 'editor'; save(); render(); }); await esperar(200);
    await p.evaluate(ids => { cxnSetNivel(ids.n[0], 'valor', '10'); cxnSetNivel(ids.n[1], 'valor', '7'); cxnSetNivel(ids.n[3], 'valor', '0'); }, ids);
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.5 && r.sc[ids.c2] === 5 && r.n === 8.5, 'al cambiar los valores (10-7-2-0), Avanzado pasa a valer 7/10 y Experto sigue al máximo', JSON.stringify(r));
    await p.evaluate(ids => cxnSetPeso(ids.c1, '30'), ids);
    r = await nota();
    t.ok(r.sc[ids.c1] === 2.1 && r.n === 8.88, 'al cambiar el peso a 30 % la categoría sigue en Avanzado (2,1 de 3) y la nota se convierte a 10', JSON.stringify(r));
    t.ok((await p.locator('.pill').filter({ hasText: 'Suma de pesos' }).textContent()).includes('80 %'), 'el editor avisa de que los pesos suman 80 %');
    await p.evaluate(() => cxnIgualarPesos());
    r = await nota();
    t.ok(r.sc[ids.c1] === 3.5 && r.n === 8.5, 'repartir los pesos a partes iguales', JSON.stringify(r));
    // Imprimir.
    const imp = await p.evaluate(({ A, act }) => { const sal = {}; const o = window.abrirVentanaInforme; window.abrirVentanaInforme = (ti, h) => { sal.h = h; };
      cxImprimirRubrica(A, act); sal.n = sal.h; cxImprimirRubrica(A, act, true); sal.r = sal.h; window.abrirVentanaInforme = o; return sal; }, { A, act: ids.act });
    t.ok(imp.n.includes('cxn-imp-on') && imp.n.includes('TEXTO-EXPERTO') && (imp.n.match(/cxn-imp-on/g) || []).length >= 3, 'la rúbrica impresa marca la casilla de cada categoría');
    t.ok(imp.r.includes('cxn-imp-chip') && imp.r.includes('Avançat') && !imp.r.includes('TEXTO-EXPERTO'), 'la resumida dice el nivel sin los descriptores');
    // Corregir por categoría (todo el grupo).
    await p.evaluate(() => { state.ui.corTab = 'corregir'; state.ui.corAlId = ''; state.ui.corModoPreg = true; state.ui.corPregSel = ''; save(); render(); }); await esperar(300);
    t.ok(await p.locator('.cxn-mini-btn').count() === 12, 'por categoría: botones de nivel para cada alumno/a');
    await p.locator('.cxn-mini-btn').nth(4 + 2).click(); await esperar(200);
    t.ok(await p.evaluate(({ B, act, c1 }) => state.grupos[0].rubricScores[B][act][c1], { B, act: ids.act, c1: ids.c1 }) === 1, 'por categoría: pulsar «Aprendiz» guarda sus puntos (2/10 de 5)');
    await p.evaluate(() => { state.ui.corModoPreg = false; save(); render(); });
    // Estadísticas: reparto por niveles.
    await p.evaluate(() => { state.ui.cxVerEstadisticas = true; render(); }); await esperar(200);
    t.ok(await p.getByText('Repartiment per nivells').count() === 1, 'las estadísticas incluyen el reparto por niveles');
    // Plantilla reutilizable en otro examen.
    await p.evaluate(() => { window.pedirTexto = async () => 'Exposición oral'; window.confirmar = async () => true; window.mostrarAviso = () => {}; });
    await p.evaluate(act => cxGuardarComoPlantilla(act), ids.act); await esperar(100);
    await p.evaluate(act => cxGuardarComoPlantilla(act), ids.act); await esperar(100);
    t.ok(await p.evaluate(() => state.plantillasRubrica.filter(x => !x.fiq).length) === 1, 'guardar con el mismo nombre sustituye la plantilla en vez de duplicarla');
    await p.evaluate(() => { const pl = state.plantillasRubrica.find(x => !x.fiq); state.ui.corTab = 'crear'; state.ui.corForm = { nombre: 'Proyecto', bloqueId: '', sda: '', fecha: '', plantillaId: pl.id, criterios: [] }; save(); render(); });
    await esperar(200); await p.locator('#cxfBtn').click(); await esperar(300);
    const r2 = await p.evaluate(() => { const [a, b] = state.grupos[0].actividades; const sinId = n => JSON.stringify(n.map(l => ({ ...l, id: 0 }))); return { f: b.rubrica[0].formato, mismo: sinId(b.rubrica[0].niveles) === sinId(a.rubrica[0].niveles) && b.rubrica[0].niveles[0].id !== a.rubrica[0].niveles[0].id, txt: Object.values(b.rubrica[0].items[0].celdas).includes('Habla con un volumen adecuado TEXTO-EXPERTO'), otroId: b.rubrica[0].items[0].id !== a.rubrica[0].items[0].id }; });
    t.ok(r2.f === 'niveles' && r2.mismo && r2.txt && r2.otroId, 'un examen nuevo desde la plantilla copia niveles, valores y descriptores', JSON.stringify(r2));
    // Cambio de tipo: lo corregido se conserva.
    await p.evaluate(act => { state.ui.corExamId = act; state.ui.corTab = 'editor'; save(); render(); }, ids.act); await esperar(200);
    await p.evaluate(() => cxCambiarTipoRubrica()); await esperar(200);
    r = await nota();
    const r3 = await p.evaluate(() => { const a = state.grupos[0].actividades[0]; return { f: a.rubrica[0].formato || '', desc: (a.rubrica[0].items[0].desc || []).join(' ') }; });
    t.ok(!r3.f && r3.desc.includes('TEXTO-EXPERTO') && r.n === 8.5, 'pasar a «por puntos» conserva notas y guarda los descriptores', JSON.stringify(r3));
    await p.evaluate(() => cxCambiarTipoRubrica()); await esperar(200);
    r = await nota();
    t.ok(await p.evaluate(() => state.grupos[0].actividades[0].rubrica[0].formato) === 'niveles' && r.n === 8.5, 'y volver a «por niveles» también');
    // Accesibilidad del editor y de la corrección.
    const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    for (const [nom, fn, zona] of [['editor', () => { state.ui.corTab = 'editor'; render(); }, '.cxn-card'], ['corregir', () => { state.ui.corTab = 'corregir'; state.ui.corAlId = state.grupos[0].alumnos[0].id; render(); }, '#tabContent']]) {
      await p.evaluate(fn); await esperar(300); await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async zona => (await axe.run({ include: [[zona]] }, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + '×' + v.nodes.length + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')), zona);
      t.ok(!v.length, `accesibilidad (${nom})`, v.join('; '));
    }
  } },

  { nombre: 'rubrica-niveles-programacion', descripcion: 'Examen traído de la Programación: al abrirlo en el Corrector se puede elegir rúbrica por niveles', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(() => {
      const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios.slice(0, 3).map(c => c.id);
      const pa = { id: 'pa1', nombre: 'Proyecto de investigación', tipo: TIPO_EXAMEN, esExamen: true, criterios: cr.map(c => ({ critId: c, peso: 100 })) };
      const act = progCrearActividadEnGrupo(g, pa, state.ui.trim); save();
      const viejo = { id: 'old', nombre: 'Examen antiguo', trimestre: state.ui.trim, esExamen: true, bloqueId: g.bloques[0].id, criterios: [], rubrica: cxRubricaDesdeCriterios(cr.map(c => ({ critId: c, peso: 100 })), g.catalogoKey) };
      g.actividades.push(viejo);
      return { id: act.id, cr, pend: cxTipoPendiente(g, act), pendViejo: cxTipoPendiente(g, viejo) };
    });
    t.ok(r.pend && r.pendViejo, 'la rúbrica creada automáticamente queda pendiente de elegir tipo (también en exámenes traídos antes)');
    await p.evaluate(id => cxAbrirDesdeOtroModo(id), r.id); await esperar(300);
    t.ok(await p.evaluate(() => state.ui.corTab) === 'editor' && await p.getByText('¿Con qué tipo de rúbrica quieres corregir').count() === 1, '«Abrir en el Corrector» lleva al editor y pregunta el tipo');
    await p.getByRole('button', { name: '▦ Por niveles de logro' }).click(); await esperar(300);
    const r2 = await p.evaluate(id => { const g = state.grupos[0], a = g.actividades.find(x => x.id === id); return { f: a.rubrica[0].formato, cats: a.rubrica[0].items.map(i => i.links[0].critId), pend: cxTipoPendiente(g, a) }; }, r.id);
    t.ok(r2.f === 'niveles' && r2.cats.join() === r.cr.join() && !r2.pend, 'pasa a rúbrica por niveles con una categoría por criterio', JSON.stringify(r2));
    t.ok(await p.locator('table.cxn-editor').count() === 1 && await p.getByText('¿Con qué tipo de rúbrica quieres corregir').count() === 0, 'se ve la tabla y ya no pregunta');
    await p.evaluate(() => cxElegirTipoInicial('old', 'puntos'));
    t.ok(await p.evaluate(() => { const g = state.grupos[0]; return !cxTipoPendiente(g, g.actividades.find(a => a.id === 'old')); }), 'elegir «por puntos» deja de preguntar');
    await p.evaluate(() => { const g = state.grupos[0]; const pa = { id: 'pa2', nombre: 'Otro', tipo: TIPO_EXAMEN, esExamen: true, criterios: [{ critId: getCatalogo('FiQ_2ESO').ces[0].criterios[0].id, peso: 100 }] };
      const a = progCrearActividadEnGrupo(g, pa, state.ui.trim); g.rubricScores = { [g.alumnos[0].id]: { [a.id]: { [a.rubrica[0].items[0].id]: 5 } } }; window._a2 = a.id; });
    t.ok(await p.evaluate(() => !cxTipoPendiente(state.grupos[0], state.grupos[0].actividades.find(a => a.id === window._a2))), 'si ya hay alumnado corregido, no pregunta');
  } },

  { nombre: 'accesibilidad', descripcion: 'Accesibilidad WCAG 2 A/AA (axe-core) en las pantallas principales', async fn(t) {
    const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    // Sin animaciones: con ellas se medía el texto a medio aparecer y salían contrastes bajos que no son reales.
    const ctx = await t.navegador.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const p = await nuevaPagina(ctx);
    let contraste = 0; const bajos = [];   // (los avisos breves se excluyen: mientras se desvanecen son semitransparentes)
    const auditar = async (pant) => {
      await p.addScriptTag({ content: axe });
      const v = await p.evaluate(async () => (await axe.run({ exclude: [['#appToast'], ['#toastGlobal']] }, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => ({ id: v.id, n: v.nodes.length, donde: v.nodes.slice(0, 2).map(n => n.target.join(' ').slice(0, 70)) })));
      const otras = v.filter(x => x.id !== 'color-contrast');
      const cc = v.find(x => x.id === 'color-contrast'); if (cc) { contraste += cc.n; bajos.push(pant + ': ' + cc.donde.join(' | ')); }
      t.ok(!otras.length, `${pant}: sin errores de accesibilidad`, otras.map(x => x.id + '×' + x.n).join(', '));
    };
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen', trimestre: 0, bloqueId: 'b0', esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 7 } }; save(); });
    // Todas las pestañas del grupo y todos los modos (la pantalla de bienvenida está quitada: si no, se auditaría solo ella).
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.tab = tab; render(); }, tab); await esperar(300); await auditar('Cuaderno · ' + tab); }
    for (const modo of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) {
      await p.evaluate(m => { _mostrarBienvenida = false; state.ui.appMode = m; render(); }, modo); await esperar(300); await auditar('Cuaderno · modo ' + modo); }
    // Ventanas y paneles nuevos.
    await p.evaluate(() => { state.ui.appMode = 'inicio'; render(); abrirCopias(); }); await esperar(500); await auditar('Cuaderno · ventana Copias'); await p.evaluate(() => cerrarCopias());
    await p.evaluate(() => abrirNuevoCurso()); await esperar(300); await auditar('Cuaderno · Empezar curso nuevo'); await p.evaluate(() => ncCerrar());
    await p.evaluate(() => { cronoTogglePanel(); claseIrTab('sorteo'); claseSortear(); }); await esperar(900); await auditar('Cuaderno · Sorteo');
    await p.evaluate(() => { claseIrTab('grupos'); claseCrearGrupos(); }); await esperar(200); await auditar('Cuaderno · Grupos'); await p.evaluate(() => { claseIrTab('crono'); cronoTogglePanel(); });
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; render(); toggleProyector(); }); await esperar(300); await auditar('Cuaderno · modo proyector'); await p.evaluate(() => toggleProyector());
    await p.evaluate(async () => { await BloqueoPIN.configurar('1234', 5); BloqueoPIN.bloquear(); }); await esperar(300); await auditar('Bloqueo con PIN');
    await p.evaluate(() => { BloqueoPIN.quitar(); document.documentElement.classList.remove('app-bloqueada'); const o = document.getElementById('bloqueoOverlay'); if (o) o.remove(); });
    // Lo mismo en el tema oscuro.
    for (const tab of ['alumnos', 'plano', 'actividades', 'calificar', 'resultados', 'resumen', 'cobertura', 'asistencia', 'diario', 'convivencia', 'familias', 'ajustes']) {
      await p.evaluate(tab => { document.body.setAttribute('data-tema', 'oscuro'); _mostrarBienvenida = false; state.ui.appMode = 'competencial'; state.ui.grupoId = state.grupos[0].id; state.ui.tab = tab; render(); }, tab); await esperar(200); await auditar('Cuaderno (oscuro) · ' + tab); }
    for (const modo of ['inicio', 'corrector', 'programacion', 'memoria', 'nese', 'refuerzo', 'repeticion', 'reuniones']) {
      await p.evaluate(m => { state.ui.appMode = m; render(); }, modo); await esperar(200); await auditar('Cuaderno (oscuro) · modo ' + modo); }
    await p.evaluate(() => document.body.setAttribute('data-tema', 'claro'));
    await tutoriaConAlumnos(p, t.url, '1º ESO', 'A', ['Prueba, Ana']); await auditar('Tutoría · grupo');
    for (const e of ['__home__', '__calendario__', '__informe__', '__convivencia__', '__materias__']) { await p.evaluate(e => selectNivel(e), e); await esperar(300); await auditar('Tutoría · ' + e); }
    await p.goto(t.url + '/editor/'); await esperar(1200); await auditar('Editor de exámenes');
    t.ok(contraste === 0, `contraste: ningún texto por debajo de 4,5:1 (${contraste})`, bajos.slice(0, 6).join('\n        '));
    await ctx.close();
  } },

  { nombre: 'actualizacion', descripcion: 'Aviso «Hay una versión nueva · Actualizar»', async fn(t) {
    // Se trabaja sobre una copia de la app, porque la prueba cambia sw.js.
    const copia = fs.mkdtempSync(path.join(os.tmpdir(), 'cuaderno-'));
    fs.cpSync(RAIZ, copia, { recursive: true, filter: s => !/[\\/](\.git|node_modules)([\\/]|$)/.test(s) });
    const swRuta = path.join(copia, 'sw.js'), version = n => fs.writeFileSync(swRuta, fs.readFileSync(swRuta, 'utf8').replace(/CACHE_PREFIJO \+ '\d+'/, `CACHE_PREFIJO + '${n}'`));
    const srv = await servir(copia);
    try {
      version(900);
      const p = await nuevaPagina(t.contexto); await p.goto(srv.url + '/'); await esperar(2500); await p.reload(); await esperar(1500);
      version(901);
      await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await esperar(3000);
      t.ok(await p.evaluate(() => !!document.getElementById('avisoVersionNueva')), 'aparece el aviso al publicar una versión');
      const recarga = p.waitForNavigation({ timeout: 10000 }).then(() => true).catch(() => false);
      await p.click('#avisoVersionNueva button:has-text("Actualizar")');
      t.ok(await recarga, '«Actualizar» recarga la app');
      await esperar(1500);
      t.ok(JSON.stringify(await p.evaluate(() => caches.keys())) === '["cuaderno-v3-901"]', 'queda solo la caché de la versión nueva');
    } finally { await srv.cerrar(); fs.rmSync(copia, { recursive: true, force: true }); }
  } },
  { nombre: 'puntos-extra', descripcion: 'Puntos extra: se apuntan en Calificar y en Resultados, suben la nota, se ven en los informes y sobreviven a la papelera', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => {
      const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: cr, peso: 100 }] }];
      g.notasCuant = { [g.alumnos[0].id]: { e1: 6.5 }, [g.alumnos[1].id]: { e1: 9.5 } };
      state.ui.appMode = 'competencial'; state.ui.tab = 'calificar'; state.ui.calAct = 'e1'; save(); render();
    });
    // Calificar → ➕ Puntos extra
    await p.getByRole('button', { name: /Puntos extra/ }).first().click();
    const filas = p.locator('.modal-overlay tbody tr');
    t.ok(await filas.count() === 3, 'la ventana lista a todo el alumnado');
    await filas.nth(0).locator('[data-pts]').fill('1');
    await filas.nth(1).locator('[data-pts]').fill('1');
    await p.locator('#extraMotivoComun').fill(`Voluntaria <img src=x onerror=top.__x()> "exposición"`);
    await filas.nth(2).locator('[data-pts]').fill('abc');
    await p.locator('#extraSi').click();
    t.ok(await p.locator('.modal-overlay tbody tr').count() === 3, 'con un valor no válido avisa y no cierra');
    await p.locator('.dlg-overlay #dlgOk').click();
    await filas.nth(2).locator('[data-pts]').fill('');
    await p.locator('#extraSi').click(); await esperar(200);
    const r1 = await p.evaluate(ids => { const g = state.grupos[0], a = g.actividades[0];
      return { ex: g.extras, n0: notaActividad(g, ids[0], a), n1: notaActividad(g, ids[1], a), guardada: g.notasCuant[ids[0]].e1,
        pills: document.querySelectorAll('.extra-pill').length, colado: !!document.querySelector('img[onerror]') }; }, ids);
    t.ok(r1.ex[ids[0]].e1.pts === 1 && /Voluntaria/.test(r1.ex[ids[0]].e1.motivo), 'se guardan los puntos y el motivo común', JSON.stringify(r1.ex));
    t.ok(!r1.ex[ids[2]], 'quien no tiene puntos no guarda nada');
    t.ok(r1.n0 === 7.5 && r1.guardada === 6.5, 'la nota del examen sube 6,5 + 1 = 7,5 y la nota corregida no se toca', JSON.stringify(r1));
    t.ok(r1.n1 === 10, 'la nota nunca pasa de 10 (9,5 + 1 = 10)');
    t.ok(r1.pills === 2 && !r1.colado, 'Calificar muestra «+1 extra» y el motivo no se cuela como código');
    // Resultados → extra de la evaluación desde la ficha del alumno/a
    await p.evaluate(ids => { state.ui.tab = 'resultados'; state.ui.resAl = ids[0]; save(); render(); }, ids);
    const campo = p.locator('[data-extra="eval"][data-clave="0"] [data-extra-pts]');
    await campo.fill('0,5'); await campo.dispatchEvent('change'); await esperar(200);
    const r2 = await p.evaluate(ids => { const g = state.grupos[0];
      return { t: notaTrimestre(g, ids[0], 0), sin: notaTrimestreSinExtra(g, ids[0], 0), f: notaFinal(g, ids[0]),
        texto: document.getElementById('tabContent').textContent,
        inf: informeAlumnoBodyHTML(g, g.alumnos[0]), det: informeDetalladoBodyHTML(g, g.alumnos[0], 0) }; }, ids);
    t.ok(r2.sin === 7.5 && r2.t === 8, 'la evaluación suma el extra: 7,5 + 0,5 = 8', JSON.stringify([r2.sin, r2.t]));
    t.ok(r2.f === 8, 'la nota final recoge la evaluación con su extra');
    t.ok(/7,5 \+ 0,5 = 8,0/.test(r2.texto), 'Resultados explica la cuenta');
    t.ok(/inclou \+1 extra/.test(r2.inf) && /inclou \+0,5 extra/.test(r2.inf), 'el informe del alumno/a indica los extras');
    t.ok(/Punts extra/.test(r2.det) && /6,5 \+ 1 extra = <strong>7,5/.test(r2.det), 'el informe detallado desglosa los extras');
    // Papelera: borrar y restaurar al alumno/a y la actividad conserva los extras
    const r3 = await p.evaluate(async ids => { window.__dialogosAuto = { confirmar: true };
      await delAlumno(ids[0]); let g = grupoActual(); const borrado = !g.extras[ids[0]] && !g.extrasEval[ids[0]];
      restaurarAlumnoPapelera(0); g = grupoActual();
      const vuelve = g.extras[ids[0]]?.e1?.pts === 1 && g.extrasEval[ids[0]]?.['0']?.pts === 0.5;
      await delActividad('e1'); g = grupoActual(); const sinAct = !g.extras[ids[1]]?.e1;
      restaurarActividadPapelera(0); g = grupoActual();
      return { borrado, vuelve, sinAct, actVuelve: g.extras[ids[1]]?.e1?.pts === 1 }; }, ids);
    t.ok(r3.borrado && r3.vuelve, 'borrar y restaurar al alumno/a conserva sus extras', JSON.stringify(r3));
    t.ok(r3.sinAct && r3.actVuelve, 'borrar y restaurar la actividad conserva sus extras', JSON.stringify(r3));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'valencia', descripcion: 'Interfície en valencià: les pestanyes, els modes i els diàlegs es veuen traduïts', async fn(t) {
    await t.contexto.addInitScript(() => { try { localStorage.setItem('quadern_idioma', 'ca'); } catch (e) {} });
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const ES = /\b(Todavía|Añadir|Guardar actividad|Nueva actividad|alumnos con nota|Ningún|ninguna|Programación de Aula|Evaluación)\b/;
    const vistos = [];
    for (const tab of ['alumnos', 'actividades', 'calificar', 'resultados', 'asistencia', 'resumen', 'diario', 'cobertura', 'ajustes']) {
      await p.evaluate(tab => { state.ui.appMode = 'competencial'; state.ui.tab = tab; render(); }, tab); await esperar(200);
      const txt = await p.evaluate(() => document.body.innerText);
      const m = txt.match(ES); if (m) vistos.push(tab + ': ' + m[0]);
    }
    for (const m of ['inicio', 'programacion', 'refuerzo', 'repeticion', 'reuniones']) {
      await p.evaluate(m => { state.ui.appMode = m; render(); }, m); await esperar(200);
      const txt = await p.evaluate(() => document.body.innerText);
      const x = txt.match(ES); if (x) vistos.push(m + ': ' + x[0]);
    }
    t.ok(!vistos.length, 'cap text en castellà a les pantalles principals', vistos.join(' | '));
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.tab = 'actividades'; render(); }); await esperar(200);
    const txt = await p.evaluate(() => document.getElementById('tabContent').innerText);
    t.ok(/Exàmens i proves escrites/.test(txt) && /Nova activitat d'avaluació/.test(txt), 'Activitats en valencià', txt.slice(0, 200));
    t.ok(await p.evaluate(() => traduirText('Todavía no hay actividades en este periodo.') === 'Encara no hi ha activitats en este període.'), 'el diccionari tradueix textos exactes');
    t.ok(await p.evaluate(() => /^Vore l'evolució de Pérez, Ana en esta avaluació$/.test(traduirText('Ver la evolución de Pérez, Ana en esta evaluación'))), 'els patrons conserven les parts variables');
    t.ok(!p.errores.length, 'sense errors de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'documents-inici', descripcion: 'Biblioteca: pestanyes, PDF, cerca, enllaços propis i pestanyes noves', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { state.ui.appMode = 'biblioteca'; render(); }); await esperar(200);
    const r = await p.evaluate(async () => {
      bibCercar('dossier 2n');
      const cerca = document.querySelectorAll('#bibResultats a[href^="docs/reforc/dossier-alumnat-nese-fiq-2eso"]').length;
      const amagat = document.getElementById('bibPestanyes').style.display === 'none';
      bibCercar('dossier 4t');
      const rep4 = document.querySelectorAll('#bibResultats a[href^="docs/reforc/dossier-alumnat-repeticio-fiq-4eso"]').length;
      bibCercar('');
      const pdfsProg = document.querySelectorAll('a[href^="docs/programacions/PA_"]').length;
      docsTriarPestanya('pp');
      const pdfsPP = document.querySelectorAll('a[href^="docs/programacions/PP_"]').length;
      document.getElementById('docsTitol').value = 'Acta'; document.getElementById('docsUrl').value = 'javascript:alert(1)';
      docsAfegirEnllac('pp'); const rebutjat = !(state.documentsInici.enllacos.pp || []).length;
      document.querySelector('.dlg-overlay #dlgOk')?.click();
      document.getElementById('docsTitol').value = 'Acta'; document.getElementById('docsUrl').value = 'drive.google.com/a';
      docsAfegirEnllac('pp');
      window.__dialogosAuto = { texto: 'Actes' }; await docsNovaPestanya();
      return { cerca, amagat, rep4, pdfsProg, pdfsPP, rebutjat, enl: state.documentsInici.enllacos.pp, pest: state.documentsInici.pestanyes.map(x => x.nom), tab: state.ui.docsTab === state.documentsInici.pestanyes[0]?.id };
    });
    t.ok(r.cerca === 2 && r.amagat, 'la cerca troba els dossiers de 2n ESO i amaga les pestanyes', JSON.stringify(r));
    t.ok(r.rep4 === 2, 'la cerca troba el dossier de repetició de 4t (PDF i Word)', JSON.stringify(r));
    await p.evaluate(() => { state.ui.appMode = 'repeticion'; render(); }); await esperar(200);
    const nRep = await p.evaluate(() => document.querySelectorAll('#app a[href^="docs/reforc/dossier-alumnat-repeticio-fiq-"]').length);
    t.ok(nRep === 6, 'Repetició ofereix els 6 fitxers dels dossiers de l\'alumnat', String(nRep));
    t.ok(r.pdfsProg === 6 && r.pdfsPP === 2, 'Programacions mostra les 6 PA i Propostes les 2 PP', JSON.stringify(r));
    t.ok(r.rebutjat, 'no accepta enllaços que no siguen http(s)');
    t.ok(r.enl?.length === 1 && r.enl[0].url === 'https://drive.google.com/a', 'afig un enllaç propi i li posa https://');
    t.ok(r.pest[0] === 'Actes' && r.tab, 'crea una pestanya nova i la deixa oberta');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'informes-avaluacio', descripcion: 'Acta de la sessió, informes per a les famílies, fitxes de repàs per tema, dossiers i crèdits del material, recordatori de còpia', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alba Roig, Neus', 'Bosch Vidal, Pau <b>x</b>', 'Climent Mas, Joan'] });
    const r = await p.evaluate(async () => {
      const g = state.grupos[0];
      const prog = progDesDeDepartament('FiQ_3ESO'); state.programaciones = [prog]; g.programacionId = prog.id; g.catalogoKey = 'FiQ_3ESO';
      const tema = prog.sdas.find(s => /Tema 2\./.test(s.tema));
      const cr = Object.keys(catIndex('FiQ_3ESO').critMap)[0];
      g.actividades = [{ id: 'a1', nombre: 'Prova gasos', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: false, criterios: [{ critId: cr, peso: 100 }], temaId: tema.id }];
      g.notas = { [g.alumnos[0].id]: { a1: { [cr]: 8 } }, [g.alumnos[1].id]: { a1: { [cr]: 3 } }, [g.alumnos[2].id]: { a1: { [cr]: 4 } } };
      g.alumnos[1].nese = true; g.alumnos[1].comentariosEval[0] = 'Ha de treballar <i>més</i>';
      state.lastBackupAt = Date.now() - 5 * 86400000; state.cambiosSinCopia = 2; save();
      const txt = () => { const h = document.querySelector('#printOverlay .print-hoja'); return h && h.shadowRoot ? h.shadowRoot.textContent : ''; };
      const out = {};
      exportarActaSessio(0); out.acta = txt(); cerrarImprimible();
      exportarInformesFamiliaTots(0); out.fam = txt(); { const sh = document.querySelector('#printOverlay .print-hoja').shadowRoot; out.pagines = sh.querySelectorAll('.ia-full').length; out.colat = !!sh.querySelector('.ia i, .ia b'); } cerrarImprimible();
      exportarFitxesRepas(tema.id, 'suspesos'); out.fitxa = txt(); out.fitxes = document.querySelector('#printOverlay .print-hoja').shadowRoot.querySelectorAll('.ia-full').length; cerrarImprimible();
      materialDe('FiQ_3ESO'); materialDe('QUI_2BAT'); await new Promise(z => setTimeout(z, 800));
      out.dossier = _iaDossier(g, tema, false); out.dossierAdaptat = _iaDossier(g, tema, true);
      out.credits = materialCreditsHTML();
      state.ui.appMode = 'inicio'; render(); out.recordatori = !!document.querySelector('.copia-recordatori');
      copiaAjornar(); out.ajornat = !document.querySelector('.copia-recordatori');
      return out;
    });
    t.ok(/Acta de la sessió/.test(r.acta) && /1\/3/.test(r.acta) && /Bosch Vidal, Pau <b>x<\/b>/.test(r.acta), "l'acta ix amb el tema (1 de 3 aprovats) i els noms com a text", r.acta.slice(0, 300));
    t.ok(/NESE/.test(r.acta) && /Alumnat suspés \(2\)/.test(r.acta), "l'acta llista els suspesos i l'alumnat amb mesures");
    t.ok(r.pagines === 3 && /Ha de treballar <i>més<\/i>/.test(r.fam) && /Per recuperar/.test(r.fam), 'un informe per a la família per alumne/a, amb observacions i temes', String(r.pagines));
    t.ok(r.fitxes === 2 && /Què has de reforçar/.test(r.fitxa), 'fitxes de repàs només per a qui té el tema per davall de 5', String(r.fitxes));
    t.ok(!r.colat, 'cap text es cola com a codi');
    t.ok(r.dossier && /dossier-repas\.pdf$/.test(r.dossier.url) && r.dossierAdaptat && /adaptat/.test(r.dossierAdaptat.url), 'el tema té dossier de repàs i versió adaptada', JSON.stringify(r.dossier));
    t.ok(/Nelo Traver/.test(r.credits) && /Rafael Bueno/.test(r.credits), 'els crèdits nomenen els autors del material');
    t.ok(r.recordatori && r.ajornat, "Inici recorda la còpia als 3 dies i «Recorda-m'ho demà» l'amaga");
    const fitxers = ['docs/material/FiQ_3ESO/tema-02/dossier-repas.pdf', 'docs/material/FiQ_3ESO/tema-02/dossier-repas-adaptat.pdf'];
    const falten = fitxers.filter(f => !fs.existsSync(path.join(RAIZ, f)));
    t.ok(!falten.length, 'els PDF dels dossiers existeixen', falten.join(', '));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'editar-temes', descripcion: "Programació del grup: editar en quina avaluació va cada tema i recalcular les sessions amb l'horari, amb ajust a mà", async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alba Roig, Neus'] });
    const r = await p.evaluate(async () => {
      const g = state.grupos[0];
      const prog = progDesDeDepartament('FiQ_3ESO'); state.programaciones = [prog]; g.programacionId = prog.id; g.catalogoKey = 'FiQ_3ESO';
      g.fechasTrimestre = [{ inicio: '2026-09-07', fin: '2026-12-18' }, { inicio: '2027-01-07', fin: '2027-03-19' }, { inicio: '2027-03-22', fin: '2027-06-18' }];
      state.horario = state.horario || {}; state.horario.celdas = { '1-L': { tipo: 'clase', grupoId: g.id }, '2-X': { tipo: 'clase', grupoId: g.id }, '3-V': { tipo: 'clase', grupoId: g.id } };
      state.festivos = [{ id: 'f1', fechaInicio: '2026-10-09', fechaFin: '2026-10-09', etiqueta: '9 d\'Octubre' }];
      state.ui.appMode = 'competencial'; state.ui.grupoId = g.id; state.ui.tab = 'programa'; save(); render();
      const out = {};
      out.boto = !!Array.from(document.querySelectorAll('#tabContent button')).find(b => /Editar temes/.test(b.textContent));
      tempEditarObrir(); out.editor = /Editar temes i sessions/.test(document.getElementById('tabContent').textContent);
      out.disp0 = tempSessionsAval(g, 0).length;
      const suma = t => temesDeGrup(g).filter(s => s.trimestre === t).reduce((n, s) => n + (Number(s.sesionesPrevistas) || 0), 0);
      tempRecalcularTot(false); out.suma0 = suma(0);
      const primer = temesDeGrup(g).find(s => s.trimestre === 0);
      tempSetAval(primer.id, 1); out.mogut = primer.trimestre === 1; out.suma0b = suma(0); out.suma1 = suma(1); out.disp1 = tempSessionsAval(g, 1).length;
      const segon = temesDeGrup(g).find(s => s.trimestre === 0);
      tempSetSessions(segon.id, '3'); out.manual = segon.sesionesPrevistas === '3' && segon.sessionsManual; out.suma0c = suma(0);
      tempSetReserva('2'); out.suma0d = suma(0);
      out.dates = tempDatesTemes(g, prog)[segon.id];
      tempEditarCancel(); tempEditarObrir();
      const tercer = temesDeGrup(g).find(s => s.trimestre === 2);
      g.actividades = [{ id: 'a1', nombre: 'Prova', tipo: TIPOS[0], trimestre: 2, bloqueId: g.bloques[0].id, criterios: [], temaId: tercer.id }];
      g.diario = { '2027-04-05': { nota: 'classe', incidencias: '', unidadId: tercer.id } };
      const nTemes = prog.sdas.length; window.__dialogosAuto = { confirmar: true };
      await tempEliminar(tercer.id);
      out.eliminat = prog.sdas.length === nTemes - 1 && g.actividades[0].temaId === '' && g.diario['2027-04-05'].unidadId === '' && suma(2) === tempSessionsAval(g, 2).length;
      document.getElementById('tempNouNom_2').value = 'Tema 9.- Energia'; tempAfegir(2);
      const nou = prog.sdas.find(s => s.tema === 'Tema 9.- Energia');
      out.afegit = !!nou && nou.trimestre === 2 && Number(nou.sesionesPrevistas) > 0 && suma(2) === tempSessionsAval(g, 2).length;
      document.getElementById('tempNouNom_1').value = 'Tema 10.- Ones'; document.getElementById('tempNouSes_1').value = '4'; tempAfegir(1);
      const nou2 = prog.sdas.find(s => s.tema === 'Tema 10.- Ones');
      out.afegitMa = nou2 && nou2.sesionesPrevistas === '4' && nou2.sessionsManual;
      tempEditarCancel();
      out.desfet = prog.sdas.length === nTemes && g.actividades[0].temaId === tercer.id && g.diario['2027-04-05'].unidadId === tercer.id && !prog.sdas.some(s => /Tema (9|10)\.-/.test(s.tema));
      tempEditarObrir();
      const quart = temesDeGrup(g).find(s => s.trimestre === 1);
      tempSetAval(quart.id, 'altres');
      out.altres = quart.altres === true && !temesDeGrup(g).includes(quart) && temesAltresGrup(g).length === 1 && suma(1) === tempSessionsAval(g, 1).length
        && /Temes sense avaluació · no es fan \(1\)/.test(document.getElementById('tempAltres').textContent);
      tempRenomenar(quart.id, 'tema', 'Tema amagat'); out.renomAltres = quart.tema === 'Tema amagat' && quart.altres === true && document.querySelector('#tempAltres input[aria-label="Nom del tema"]').value === 'Tema amagat';
      const orfe = temesDeGrup(g).find(s => s.trimestre === 2); orfe.trimestre = undefined; render();
      out.orfe = temesSenseAvalGrup(g).includes(orfe) && /Sense avaluació assignada/.test(document.getElementById('tempAltres').textContent);
      tempSetAval(orfe.id, '0'); out.orfeRecuperat = orfe.trimestre === 0 && !temesSenseAvalGrup(g).includes(orfe);
      tempEditarTancar(); out.altresVista = /Temes sense avaluació · no es fan \(1\)/.test(document.getElementById('tabContent').textContent) && !temaSelectHTML(g, '').includes(quart.id);
      tempEditarObrir(); tempSetAval(quart.id, '2'); out.recuperat = !quart.altres && quart.trimestre === 2 && temesAltresGrup(g).length === 0;
      const t1 = temesDeGrup(g)[0]; const num = materialNumTema(t1);
      tempRenomenar(t1.id, 'tema', 'Mesures i unitats'); tempRenomenar(t1.id, 'titulo', 'Nova SdA');
      out.renomenat = t1.tema === 'Mesures i unitats' && t1.titulo === 'Nova SdA' && materialNumTema(t1) === num && !!num && temaNomCurt(temaPerId(g, t1.id)) === 'Mesures i unitats';
      tempSetSenseHorari(true); const lliureT = temesDeGrup(g).find(s => s.trimestre === 0);
      tempSetSessions(lliureT.id, '17'); const altreT = temesDeGrup(g).find(s => s.trimestre === 0 && s.id !== lliureT.id); const abans = altreT.sesionesPrevistas;
      tempSetReserva('5');
      out.lliure = prog.tempSenseHorari === true && lliureT.sesionesPrevistas === '17' && !lliureT.sessionsManual && altreT.sesionesPrevistas === abans
        && /Desvinculat de l'horari/.test(document.getElementById('tabContent').textContent) && !/🔄 Recalcular/.test(document.getElementById('tabContent').textContent);
      tempSetSenseHorari(false); out.revinculat = !prog.tempSenseHorari && lliureT.sesionesPrevistas === '17' && lliureT.sessionsManual === true && /🔄 Recalcular/.test(document.getElementById('tabContent').textContent);
      tempSetSenseHorari(true);
      tempEditarCancel(); out.altresDesfet = !prog.sdas.find(s => s.id === quart.id).altres; out.lliureDesfet = !prog.tempSenseHorari;
      tempEditarObrir(); tempEditarCancel(); out.cancel = temesDeGrup(g).find(s => s.id === primer.id).trimestre === 0 && !temesDeGrup(g).some(s => s.sessionsManual);
      out.tornat = !/Editar temes i sessions ·/.test(document.getElementById('tabContent').textContent);
      return out;
    });
    t.ok(r.boto && r.editor, 'la pestanya Programació té el botó «Editar temes i sessions» i obri l\'editor');
    t.ok(r.disp0 === 44, "les sessions de la 1a avaluació ixen de l'horari (3 a la setmana) traient el festiu", String(r.disp0));
    t.ok(r.suma0 === r.disp0 && r.suma0b === r.disp0 && r.suma1 === r.disp1, 'el recàlcul omple exactament les sessions de cada avaluació, també en moure un tema', JSON.stringify(r));
    t.ok(r.mogut && r.manual && r.suma0c === r.disp0 && r.suma0d === r.disp0 - 2, "l'ajust a mà es respecta i la reserva es descompta", JSON.stringify(r));
    t.ok(r.dates && r.dates.ini && r.dates.fi >= r.dates.ini, 'cada tema té dates previstes', JSON.stringify(r.dates));
    t.ok(r.cancel && r.tornat, 'Cancel·lar ho deixa com estava');
    t.ok(r.eliminat, 'eliminar un tema deixa les seues activitats i sessions del Diari sense tema i recalcula', JSON.stringify(r));
    t.ok(r.afegit && r.afegitMa, 'afegir un tema nou (automàtic o amb sessions a mà) i el recàlcul quadra', JSON.stringify(r));
    t.ok(r.desfet, 'Cancel·lar desfà també els temes afegits i eliminats');
    t.ok(r.renomenat, 'reanomenar un tema conserva el seu material i les activitats', JSON.stringify(r));
    t.ok(r.altres && r.altresVista && r.recuperat, "un tema en «Altres» no té sessions, ix plegat al final i es pot recuperar", JSON.stringify(r));
    t.ok(r.lliure && r.revinculat && r.lliureDesfet, "desvincular de l'horari deixa posar les sessions a mà sense recalcular, i tornar a vincular les conserva", JSON.stringify({l:r.lliure,rv:r.revinculat,ld:r.lliureDesfet}));
    t.ok(r.renomAltres && r.orfe && r.orfeRecuperat, 'els temes sense avaluació (Altres o sense trimestre) es poden reanomenar i passar a una avaluació', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'doble-qualificacio', descripcion: 'Les dues qualificacions: quantitativa per instruments i qualitativa per competències, en Ajustos, Resultats, fitxa, informes i acta', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], ces = getCatalogo('FiQ_2ESO').ces, c1 = ces[0].criterios[0].id, c2 = ces[1].criterios[0].id;
      g.actividades = [
        { id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: c1, peso: 100 }] },
        { id: 'l1', nombre: 'Pràctica 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[g.bloques.length - 1].id, criterios: [{ critId: c2, peso: 100 }] }];
      g.notasCuant = { [ids[0]]: { e1: 9 }, [ids[1]]: { e1: 3 } };
      g.notas = { [ids[0]]: { e1: { [c1]: 5 }, l1: { [c2]: 5 } }, [ids[1]]: { e1: { [c1]: 10 }, l1: { [c2]: 10 } } };
      state.ui.appMode = 'competencial'; state.ui.tab = 'ajustes'; save(); render();
      const amplaCol = () => [...document.querySelectorAll('.mqCol')].map(x => x.getBoundingClientRect().width);
      const out = { radio: !!document.querySelector('input[name="modoNota"][value="ambdues"]') };
      const abans = notaTrimestre(g, ids[0], 0);
      document.querySelector('input[name="modoNota"][value="ambdues"]').click();
      await new Promise(r => setTimeout(r, 100));
      out.mode = state.grupos[0].modoNota; out.pesosVisibles = document.querySelectorAll('[oninput^="setPesoCE"]').length > 0;
      const cols = [...document.querySelectorAll('.mqCol')];
      out.unSolMarcat = document.querySelectorAll('input[name="modoNota"]:checked').length === 1 && cols.length === 2
        && /blocs/i.test(cols[0].querySelector('h3').textContent) && /compet/i.test(cols[1].querySelector('h3').textContent)
        && Math.abs(cols[0].getBoundingClientRect().top - cols[1].getBoundingClientRect().top) < 2;
      const amplaDues = amplaCol()[0], qAbans = notaQualitativaCE(g, ids[1], 0);
      document.querySelector('[onclick="mqAmagar(\'blocs\')"]').click();
      await new Promise(r => setTimeout(r, 100));
      out.amagaBlocs = state.grupos[0].modoNota === 'ambdues' && document.querySelectorAll('.mqCol').length === 1 && !document.querySelector('[oninput^="setBloqueW"]')
        && amplaCol()[0] > amplaDues * 1.6 && notaTrimestre(g, ids[0], 0) === abans && notaQualitativaCE(g, ids[1], 0) === qAbans;
      document.querySelector('.mqMostrar').click();
      await new Promise(r => setTimeout(r, 100));
      out.amagaBlocs = out.amagaBlocs && state.grupos[0].modoNota === 'ambdues' && document.querySelectorAll('.mqCol').length === 2;
      out.mateixaNota = notaTrimestre(g, ids[0], 0) === abans;
      out.q0 = etiquetaQualitativaCE(g, ids[0], 0)?.etq; out.q1 = etiquetaQualitativaCE(g, ids[1], 0)?.etq; out.q2 = notaQualitativaCE(g, ids[2], 0);
      state.ui.tab = 'resultados'; state.ui.resAl = ''; save(); render();
      out.taula = [...document.querySelectorAll('#tabContent thead th')].map(x => x.textContent).join('|');
      state.ui.resAl = ids[1]; save(); render();
      out.fitxaRes = /Qualificació per competències \(qualitativa\)/.test(document.getElementById('tabContent').textContent);
      out.fitxa = fitxaResumHTML(g, g.alumnos[1]);
      out.inf = informeAlumnoBodyHTML(g, g.alumnos[1]); out.infF = informeFinalAlumnoBodyHTML(g, g.alumnos[1]);
      out.fam = informeFamiliaBodyHTML(g, g.alumnos[1], 0); out.acta = actaSessioBodyHTML(g, 0);
      let grup = ''; const orig = abrirVentanaInforme; abrirVentanaInforme = (tt, b) => { grup = b; }; exportarInformeGrupo('0'); abrirVentanaInforme = orig; out.grup = grup;
      g.modoNota = 'bloques'; save();
      out.ambInstr = informeAlumnoBodyHTML(g, g.alumnos[1]);
      return out;
    }, ids);
    t.ok(r.radio && r.mode === 'ambdues' && r.unSolMarcat, 'Ajustos: blocs a l\'esquerra i competències a la dreta en dues columnes; opció «Les dues»', JSON.stringify([r.radio, r.mode, r.unSolMarcat]));
    t.ok(r.amagaBlocs, 'amagar una columna és només visual: l\'altra ocupa tota l\'amplada i cap nota ni el mode canvien');
    t.ok(r.pesosVisibles, 'amb «Les dues» es poden posar els pesos de les CE');
    t.ok(r.mateixaNota, 'la nota numèrica no canvia: continua eixint dels instruments');
    t.ok(r.q0 === 'Suficient' && r.q1 === 'Excel·lent' && r.q2 == null, 'la qualitativa ix dels criteris (no de la nota de l\'examen)', JSON.stringify([r.q0, r.q1, r.q2]));
    t.ok(/qualitativa/.test(r.taula), 'Resultats: columnes de qualitativa en la taula de la classe', r.taula);
    t.ok(r.fitxaRes && /Per competències \(qualitativa\)/.test(r.fitxa) && /Excel·lent/.test(r.fitxa), 'Resultats i la fitxa de l\'alumne mostren la qualitativa');
    t.ok(/Per competències \(qualitativa\)/.test(r.inf) && /Excel·lent/.test(r.inf) && /Per competències \(qualitativa\)/.test(r.infF), 'informe individual i informe final amb les dues notes');
    t.ok(/Per competències \(qualitativa\):/.test(r.fam) && /Excel·lent/.test(r.fam), 'informe per a la família amb la qualitativa');
    t.ok(/Qualificació per competències \(qualitativa\)/.test(r.acta) && /<th style="width:80px">Per competències \(qualitativa\)<\/th>/.test(r.acta), 'acta de la sessió: distribució qualitativa i columna en els suspesos');
    t.ok(/Per competències \(qualitativa\)/.test(r.grup), 'informe de grup amb la columna qualitativa');
    t.ok(!/[Qq]ualitativa/.test(r.ambInstr), 'només per instruments no apareix cap qualitativa');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'informe-final-valencia', descripcion: 'Informe final de curs: textos en valencià i sense les activitats on l\'alumne/a és exempt (p. ex. el quadern NESE d\'un altre alumne/a)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(ids => {
      const g = state.grupos[0], c1 = getCatalogo(g.catalogoKey).ces[0].criterios[0].id;
      g.actividades = [
        { id: 'a1', nombre: 'Pràctica comuna', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, criterios: [{ critId: c1, peso: 100 }] },
        { id: 'q1', nombre: 'Quadern NESE · Una altra persona', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, criterios: [{ critId: c1, peso: 100 }] }];
      g.notas = { [ids[0]]: { a1: { [c1]: 7 } }, [ids[1]]: { a1: { [c1]: 6 }, q1: { [c1]: 8 } } };
      g.marcas = { [ids[0]]: { q1: 'EX' } };
      return { a: informeFinalAlumnoBodyHTML(g, g.alumnos.find(x => x.id === ids[0])), b: informeFinalAlumnoBodyHTML(g, g.alumnos.find(x => x.id === ids[1])) };
    }, ids);
    t.ok(/Curs complet/.test(r.a) && /Alumne\/a:/.test(r.a) && /Activitats i exàmens utilitzats/.test(r.a) && /Competències específiques treballades/.test(r.a), 'capçaleres en valencià');
    t.ok(!/Curso completo|Alumno\/a|Actividades y exámenes|Competencias|Faltas|Periodo|Comentario a la calificación|Desglose/.test(r.a), 'cap resta en castellà');
    t.ok(/Pràctica comuna/.test(r.a) && !/Una altra persona/.test(r.a), 'l\'activitat on és exempt no ix en el seu informe');
    t.ok(/Una altra persona/.test(r.b), 'sí que ix en l\'informe de qui la fa');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'resultats-desplegable-avaluacio', descripcion: 'Resultats · Tota la classe: el desplegable d\'avaluació canvia també la taula (no només els informes)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async () => {
      state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; state.ui.resAl = ''; state.ui.trim = 0; save(); render();
      const cap = () => [...document.querySelectorAll('#tabContent thead th')].map(x => x.textContent).join('|');
      const sel = document.getElementById('repGrupoSel');
      const abans = cap();
      sel.value = '1'; sel.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));
      const despres = cap(), trim = state.ui.trim, selVal = document.getElementById('repGrupoSel').value, dalt = document.querySelector('select[aria-label], header select')?.value;
      const s2 = document.getElementById('repGrupoSel'); s2.value = 'final'; s2.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 100));
      return { abans, despres, trim, selVal, finalSel: document.getElementById('repGrupoSel').value, trimFinal: state.ui.trim, capFinal: cap() };
    });
    t.ok(r.trim === 1 && r.selVal === '1' && /2a/i.test(r.despres) && !/2a/i.test(r.abans), 'triar «2a avaluació» canvia la taula a la 2a', JSON.stringify(r));
    t.ok(r.finalSel === 'final' && r.trimFinal === 1, '«Avaluació final» es queda triada');
    t.ok(/1a/i.test(r.capFinal) && /2a/i.test(r.capFinal) && /3a/i.test(r.capFinal) && /final/i.test(r.capFinal), 'amb «Avaluació final» la taula mostra 1a, 2a, 3a i la final', r.capFinal);
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'escala-competencies-itaca', descripcion: 'Escala qualitativa editable (NA/S/B/N/E), Resultats per blocs i per competències i nota ITACA a mà que va al CSV', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], ces = getCatalogo('FiQ_2ESO').ces, c1 = ces[0].criterios[0].id, c2 = ces[1].criterios[0].id;
      g.modoNota = 'ambdues';
      g.actividades = [{ id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: c1, peso: 100 }, { critId: c2, peso: 100 }],
        rubrica: [{ id: 's1', title: 'Pregunta 1', items: [], subs: [{ id: 's1a', title: 'a', items: [{ id: 'i1', label: '1a', max: 4, links: [{ critId: c1, peso: 100 }] }], subs: [] }, { id: 's1b', title: 'b', items: [{ id: 'i2', label: '1b', max: 6, links: [{ critId: c2, peso: 100 }] }], subs: [] }] }] }];
      g.rubricScores = { [ids[0]]: { e1: { i1: 2, i2: 6 } } };
      g.notasCuant = {}; g.notas = {};
      cxRecalcAlumno(g, g.actividades[0], ids[0]);
      const out = {};
      out.nota = g.notasCuant[ids[0]].e1; out.c1 = g.notas[ids[0]].e1[c1]; out.c2 = g.notas[ids[0]].e1[c2];
      out.def = [4.9, 5, 5.95, 6.5, 8.49, 8.5].map(v => nivellQual(g, v).abr).join(',');
      state.ui.appMode = 'competencial'; state.ui.tab = 'ajustes'; save(); render();
      out.card = !!document.getElementById('escalaQualCard');
      setEscalaQual(4, 'des', '9'); setEscalaQual(1, 'nota', '5');
      out.editat = nivellQual(g, 8.7).abr + '|' + nivellQual(g, 5.2).nota;
      out.pill = pillNivellQual(g, 5.2, '', true);
      state.ui.tab = 'resultados'; state.ui.resAl = ''; state.ui.trim = 0; state.ui.resVista = 'blocs'; save(); render();
      out.blocs = [...document.querySelectorAll('#tabContent thead th')].map(x => x.textContent).join('|');
      setResVista('ce');
      out.ce = [...document.querySelectorAll('#tabContent thead th')].map(x => x.textContent).join('|');
      out.ceCel = [...document.querySelectorAll('#tabContent tbody tr')][0].textContent;
      setResCEqual(false);
      out.ceNum = [...document.querySelectorAll('#tabContent tbody tr')][0].textContent;
      setResVista('notes');
      out.th = [...document.querySelectorAll('#tabContent thead th')].map(x => x.textContent).join('|');
      setNotaItaca(ids[0], 'final', '9');
      out.itaca = notaItaca(g, ids[0], 'final'); out.itacaT = notaItaca(g, ids[0], 0);
      out.marca = /✍️/.test(document.getElementById('tabContent').textContent);
      let csv = ''; const oB = window.Blob; window.Blob = function (parts) { csv = parts.join(''); return new oB(parts); };
      const oC = URL.createObjectURL; URL.createObjectURL = () => 'blob:x'; const oclick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = () => {};
      exportarCSVGrupo(); window.Blob = oB; URL.createObjectURL = oC; HTMLAnchorElement.prototype.click = oclick;
      out.csv = csv;
      setNotaItaca(ids[0], 'final', ''); out.buit = notaItacaManual(g, ids[0], 'final');
      return out;
    }, ids);
    t.ok(r.nota === 8 && r.c1 === 5 && r.c2 === 10, 'subpreguntes amb punts lligades a criteris: nota 8 i cada criteri amb les seues preguntes', JSON.stringify([r.nota, r.c1, r.c2]));
    t.ok(r.def === 'NA,S,S,B,N,E', 'escala per defecte 0-4,9 NA, 5-5,9 S, 6-6,9 B, 7-8,49 N, 8,5-10 E', r.def);
    t.ok(r.card && r.editat === 'N|5' && /S · 5/.test(r.pill), 'Ajustos: llindars i nota que apareix editables', JSON.stringify([r.card, r.editat, r.pill]));
    t.ok(/Global/.test(r.ce) && /CE/.test(r.ce) && /\bS\b|NA|B|N|E/.test(r.ceCel) && /\d,\d/.test(r.ceNum), 'Resultats per competències, qualitativa o numèrica', r.ce + ' / ' + r.ceCel + ' / ' + r.ceNum);
    t.ok(/%/.test(r.blocs), 'Resultats per blocs amb una columna per bloc', r.blocs);
    t.ok(/Final de curs/.test(r.th) && /ITACA/.test(r.th) && r.itaca === 9 && r.itacaT === 8 && r.marca, 'columna ITACA: a mà o, en blanc, la calculada', JSON.stringify([r.th, r.itaca, r.itacaT]));
    t.ok(/Nota ITACA final/.test(r.csv) && /;8;9(;|\n)/.test(r.csv), 'el CSV porta la nota ITACA', r.csv.split('\n').slice(0, 2).join(' / '));
    t.ok(r.buit == null, 'deixar-la en blanc torna a la calculada');
    t.ok(/notaQualNum[^>]*>\(5,2\)/.test(r.pill), 'al costat del nivell, la nota sobre 10 entre parèntesis en gris', r.pill);
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'banc-comentaris', descripcion: 'Banc de comentaris: frases per categoria, la de la nota primer, inserir amb el nom posat, editar i desar al banc', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], c1 = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [{ id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: c1, peso: 100 }] }];
      g.notasCuant = { [ids[0]]: { e1: 3 } }; g.notas = { [ids[0]]: { e1: { [c1]: 3 } } };
      state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; state.ui.trim = 0; state.ui.resAl = ids[0]; save(); render();
      const out = {};
      const boto = [...document.querySelectorAll('#tabContent button')].find(b => /Banc de comentaris/.test(b.textContent));
      out.boto = !!boto; boto.click(); await new Promise(r => setTimeout(r, 50));
      out.panell = !!document.querySelector('.bancPanell');
      out.primera = document.querySelector('.bancGrup').textContent;
      const ta = document.getElementById('resComentario'); ta.value = 'Inici.'; ta.dispatchEvent(new Event('change'));
      document.querySelector('.bancFrase').click(); await new Promise(r => setTimeout(r, 50));
      out.text = g.alumnos[0].comentariosEval[0]; out.ta = document.getElementById('resComentario').value;
      const n0 = state.bancComentaris.length;
      document.getElementById('resComentario').value = 'Ana ha millorat molt en els problemes.';
      const desa = [...document.querySelectorAll('.bancPanell button')].find(b => /Desa al banc/.test(b.textContent)); desa.click();
      await new Promise(r => setTimeout(r, 50));
      out.desada = state.bancComentaris.length === n0 + 1 && state.bancComentaris.at(-1).text === '{nom} ha millorat molt en els problemes.' && state.bancComentaris.at(-1).cat === 'millora';
      bancFiltre('lab'); out.filtre = document.querySelectorAll('.bancGrup').length === 1 && /Laboratori/.test(document.querySelector('.bancGrup').textContent);
      bancGestio(true); out.gestio = !!document.querySelector('[aria-label="Esborrar la frase"]');
      return out;
    }, ids);
    t.ok(r.boto && r.panell, 'Resultats: botó «Banc de comentaris» que obri el panell');
    t.ok(/Ha de millorar/.test(r.primera) && /segons la nota/.test(r.primera), 'amb un 3 apareixen primer les frases de «Ha de millorar»', r.primera.slice(0, 80));
    t.ok(/^Inici\. Ana encara no ha assolit els aprenentatges de la primera avaluació\.$/.test(r.text) && r.ta === r.text, 'la frase s\'afig al comentari amb el nom i l\'avaluació', r.text);
    t.ok(r.desada, '«Desa al banc» guarda el comentari amb {nom} en la categoria de la nota');
    t.ok(r.filtre && r.gestio, 'filtre per categoria i mode d\'edició del banc');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'grafiques', descripcion: 'Gràfiques d\'evolució en Resultats: grup (avaluacions, activitats, CE, altres grups) i alumne/a (línia amb la mitjana del grup)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], c1 = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      g.actividades = [
        { id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: c1, peso: 100 }] },
        { id: 'e2', nombre: 'Examen 2', tipo: TIPOS[0], trimestre: 1, bloqueId: g.bloques[0].id, esExamen: true, criterios: [{ critId: c1, peso: 100 }] }];
      g.notasCuant = { [ids[0]]: { e1: 8, e2: 9 }, [ids[1]]: { e1: 2, e2: 4 }, [ids[2]]: { e1: 5 } };
      g.notas = { [ids[0]]: { e1: { [c1]: 8 }, e2: { [c1]: 9 } }, [ids[1]]: { e1: { [c1]: 2 }, e2: { [c1]: 4 } }, [ids[2]]: { e1: { [c1]: 5 } } };
      const g2 = JSON.parse(JSON.stringify(g)); g2.id = 'g2'; g2.nombre = '2n ESO B'; state.grupos.push(g2);
      const abans = JSON.stringify([notaTrimestre(g, ids[0], 0), notaFinal(g, ids[1])]);
      state.ui.appMode = 'competencial'; state.ui.tab = 'resultados'; state.ui.trim = 0; state.ui.resAl = ''; state.ui.grafObert = {}; save(); render();
      const out = {};
      const det = document.querySelector('.grafCard'); out.tancat = det && !det.open && !det.querySelector('svg');
      det.open = true; await new Promise(r => setTimeout(r, 150));
      const d2 = document.querySelector('.grafCard');
      out.svgs = d2.querySelectorAll('svg.grSvg').length; out.text = d2.textContent;
      out.sus = d2.querySelectorAll('rect.grBarSus').length; out.mapa = d2.querySelectorAll('.grMapa tbody tr').length;
      out.persisteix = state.ui.grafObert.grup === true;
      state.ui.resAl = ids[1]; state.ui.grafObert.alumne = true; save(); render();
      const da = document.querySelector('.grafCard');
      out.alumne = !!da.querySelector('path.grLinAl') && !!da.querySelector('path.grLinGrup') && /Evolució de l'alumne/.test(da.textContent);
      out.mateix = JSON.stringify([notaTrimestre(g, ids[0], 0), notaFinal(g, ids[1])]) === abans;
      return out;
    }, ids);
    t.ok(r.tancat, 'la targeta ix plegada i no calcula res fins que s\'obri');
    t.ok(r.svgs >= 3 && r.persisteix, 'obrint-la: gràfiques per avaluació, per activitat i comparació de grups', String(r.svgs));
    t.ok(/1\/3 aprovats|2\/3 aprovats/.test(r.text) && /Examen 1/.test(r.text), 'resum de mitjana i aprovats per avaluació', r.text.slice(0, 300));
    t.ok(r.mapa >= 1, 'mapa de les competències específiques del grup');
    t.ok(/Comparació amb els altres grups/.test(r.text) && /2n ESO B/.test(r.text), 'compara amb l\'altre grup de la mateixa matèria');
    t.ok(r.alumne, 'alumne/a: línia de les seues notes i de la mitjana del grup');
    t.ok(r.mateix, 'les gràfiques no canvien cap nota');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'anotacions', descripcion: 'Anotacions ràpides en la fitxa: text amb data i tipus, foto reduïda, àudio, esborrar, mode projector i curs nou', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(id => { state.ui.appMode = 'competencial'; state.ui.tab = 'alumnos'; save(); render(); abrirFichaAlumno(id); }, ids[0]);
    await p.waitForSelector('.anotBloc');
    await p.click('.anotBloc .chip:has-text("Positiva")');
    await p.fill('#anotText', 'Ha explicat <b>molt bé</b> l\'exercici');
    await p.click('.anotBloc .chip:has-text("A millorar")');
    const conservaText = await p.inputValue('#anotText');
    await p.click('.anotBloc .chip:has-text("Positiva")');
    // Foto gran (2400×1600) generada al navegador
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i},70%,50%)`; x.fillRect((i * 37) % 2400, (i * 53) % 1600, 120, 90); } return c.toDataURL('image/png').split(',')[1]; });
    await p.setInputFiles('.anotBloc input[type=file]', { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await p.waitForSelector('.anotBloc img[alt="Foto adjunta"]');
    // Àudio: un micròfon fals amb un oscil·lador
    await p.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; }; });
    await p.click('.anotBloc button:has-text("Àudio")');
    await p.waitForSelector('.anotBloc button:has-text("Aturar")');
    await new Promise(r => setTimeout(r, 1200));
    await p.click('.anotBloc button:has-text("Aturar")');
    await p.waitForSelector('.anotBloc audio');
    await p.click('.anotBloc button:has-text("Desa l\'anotació")');
    await p.waitForSelector('.anotItem');
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], a = g.anotacions[0], out = {};
      out.n = g.anotacions.length; out.alumne = a.alumnoId === ids[0]; out.tipus = a.tipus; out.text = a.text; out.data = a.fecha === fechaISOLocal();
      const img = new Image(); img.src = a.foto; await img.decode(); out.foto = [a.foto.slice(0, 15), img.naturalWidth, img.naturalHeight, Math.round(a.foto.length * 3 / 4 / 1024)];
      out.audio = /^data:audio\//.test(a.audio);
      out.html = document.querySelector('.anotItem').innerHTML; out.injectat = !!document.querySelector('.anotItem b');
      out.priv = !!document.querySelector('.anotItem .priv');
      // una anotació manipulada no pinta res perillós
      g.anotacions.push({ id: 'x', alumnoId: ids[0], fecha: '2026-01-01', tipus: 'nota', text: '', foto: 'javascript:alert(1)', audio: 'data:text/html;base64,PHNjcmlwdD4=' }); render();
      out.manip = [...document.querySelectorAll('.anotItem img, .anotItem audio')].every(e => /^data:(image|audio)\//.test(e.getAttribute('src')));
      g.anotacions = g.anotacions.filter(x => x.id !== 'x');
      ncAplicar({ curso: '2027-2028', grupos: true, alumnado: true, programaciones: true, festivos: true });
      out.cursNou = state.grupos[0].anotacions.length === 0;
      return out;
    }, ids);
    t.ok(conservaText === 'Ha explicat <b>molt bé</b> l\'exercici', 'canviar el tipus no esborra el que s\'està escrivint');
    t.ok(r.n === 1 && r.alumne && r.tipus === 'positiva' && r.data && r.text === 'Ha explicat <b>molt bé</b> l\'exercici', 'es desa amb l\'alumne/a, el tipus i la data de hui', JSON.stringify(r).slice(0, 200));
    t.ok(r.foto[0] === 'data:image/jpeg' && r.foto[1] === 1024 && r.foto[2] === 683 && r.foto[3] < 400, 'la foto es redueix a 1024 px en JPEG', JSON.stringify(r.foto));
    t.ok(r.audio, 'l\'àudio gravat es guarda amb l\'anotació');
    t.ok(!r.injectat && r.priv, 'el text no es converteix en HTML i es difumina en mode projector');
    t.ok(r.manip, 'una foto o un àudio manipulats en una còpia no es pinten');
    t.ok(r.cursNou, 'en començar un curs nou les anotacions s\'esborren');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'fotos-alumnat', descripcion: "Foto de l'alumnat: es reduïx al navegador, s'assigna per nom de fitxer, es mostra al costat del nom i no deixa colar codi", async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url, { nombres: ['Pérez Martínez, Joan', 'García López, Maria', 'Pérez Soler, Marta'] });
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], out = {};
      state.ui.appMode = 'competencial'; state.ui.tab = 'asistencia'; save(); render();
      out.senseFotos = document.querySelectorAll('#tabContent .av-al').length;
      const c = document.createElement('canvas'); c.width = 1200; c.height = 1600; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 1200, 1600);
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      const foto = await fotoReduir(new File([blob], 'x.png', { type: 'image/png' }));
      const img = new Image(); img.src = foto; await img.decode();
      out.mida = [img.naturalWidth, img.naturalHeight]; out.jpeg = foto.startsWith('data:image/jpeg;base64,'); out.kb = foto.length / 1024;
      out.match = ['Perez Martinez, Joan.jpg', 'maria_garcia_lopez.png', 'GARCÍA LÓPEZ MARIA.jpeg', 'perez.jpg', 'Joan.jpg', 'desconegut.jpg'].map(n => (fotoAlumnePerFitxer(g, n) || {}).id || null);
      g.alumnos[0].foto = foto; save(); render();
      out.assist = [...document.querySelectorAll('#tabContent .av-al')].map(e => e.tagName).join(',');
      state.ui.tab = 'alumnos'; render(); out.llista = document.querySelectorAll('#tablaAlumnos img.av-al').length;
      out.copia = JSON.stringify(state).includes(foto);
      g.alumnos[1].foto = 'data:image/png;base64,AAA" onerror="window.__xss=1'; render();
      out.hostil = !document.querySelector('img.av-al[onerror]') && !window.__xss;
      fotosAlternarVisibles(); out.amagades = document.querySelectorAll('#tabContent .av-al').length; fotosAlternarVisibles();
      return out;
    }, ids);
    t.ok(r.senseFotos === 0, 'un grup sense cap foto no mostra avatars');
    t.ok(r.mida[0] === 128 && r.mida[1] === 128 && r.jpeg && r.kb < 30, 'la foto es retalla i es reduïx a 128×128 JPEG', JSON.stringify(r.mida) + ' ' + r.kb);
    t.ok(JSON.stringify(r.match) === JSON.stringify([ids[0], ids[1], ids[1], null, null, null]), 'importació en bloc: el nom del fitxer troba l\'alumne/a (sense accents, en qualsevol ordre) i no endevina', JSON.stringify(r.match));
    t.ok(r.assist === 'IMG,SPAN,SPAN,IMG,SPAN,SPAN' && r.llista === 1, 'la foto ix al costat del nom (Assistència i llista) i qui no en té mostra les inicials', r.assist);
    t.ok(r.copia, 'la foto va dins de la còpia de seguretat');
    t.ok(r.hostil, 'una foto manipulada en una còpia no es pinta com a codi');
    t.ok(r.amagades === 0, '«Amagar les fotos» les amaga en este dispositiu');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'autoavaluacio', descripcion: 'Autoavaluació i coavaluació amb rúbrica: passar el dispositiu, enllaç per al mòbil amb codi, copiar a la correcció', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => {
      const g = state.grupos[0]; state.ui.appMode = 'competencial'; state.ui.tab = 'actividades'; state.ui.trim = 0; save(); render();
      document.getElementById('segNom_laboratori').value = 'Pràctica 1: densitat'; segCrear('laboratori');
      state.ui.aaObert = true; save(); render();
    });
    await p.waitForSelector('.aaCard');
    // Passar el dispositiu: autoavaluació d'Ana
    await p.click('.aaCard button:has-text("Passar el dispositiu: autoavaluació")');
    await p.waitForSelector('#aaKiosc .aaNom');
    const senseNotes = await p.evaluate(() => !/\d,\d/.test(document.getElementById('aaKiosc').textContent));
    await p.click('#aaKiosc .aaNom >> nth=0');
    const nFiles = await p.locator('#aaKiosc .aaFila').count();
    const enviarDesactivat = await p.locator('#aaKiosc button:has-text("Envia")').isDisabled();
    for (let i = 0; i < nFiles; i++) await p.click(`#aaKiosc .aaFila >> nth=${i} >> .aaOp >> nth=${i % 2}`);
    await p.click('#aaKiosc button:has-text("Envia")');
    await p.waitForSelector('#aaKiosc :text("Gràcies")');
    await p.click('#aaKiosc button:has-text("Següent")');
    const marcat = await p.locator('#aaKiosc .aaNom >> nth=0').textContent();
    await p.evaluate(() => { window.__dialogosAuto = { confirmar: true }; });
    await p.click('#aaKiosc .aaSortir');
    await p.waitForSelector('#aaKiosc', { state: 'detached' });
    // Coavaluació: Luis avalua qui li ha tocat
    await p.click('.aaCard button:has-text("Passar el dispositiu: coavaluació")');
    await p.click('#aaKiosc .aaNom >> nth=1');
    for (let i = 0; i < nFiles; i++) await p.click(`#aaKiosc .aaFila >> nth=${i} >> .aaOp >> nth=0`);
    await p.click('#aaKiosc button:has-text("Envia")');
    await p.click('#aaKiosc .aaSortir');
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], act = g.actividades.find(a => a.seguiment === 'laboratori'), out = {};
      out.auto = act.autoaval && act.autoaval[ids[0]] && Object.keys(act.autoaval[ids[0]].n).length;
      out.notaAuto = aaNota(act, act.autoaval[ids[0]].n);
      const obj = act.coavalParelles[ids[1]]; out.parella = obj && obj !== ids[1];
      out.co = act.coaval[ids[1]] && act.coaval[ids[1]].obj === obj && aaNota(act, act.coaval[ids[1]].n) === 10;
      out.profAbans = g.notasCuant?.[ids[0]]?.[act.id] ?? null;
      state.ui.segAl = ids[0]; save(); render();
      document.querySelector('.aaCard button[onclick^="aaCopiar"]').click();
      out.profDespres = g.notasCuant?.[ids[0]]?.[act.id];
      out.taula = document.querySelector('.aaCard').textContent;
      out.url = await aaEnllacURL(g, act, 'auto'); out.urlCo = await aaEnllacURL(g, act, 'co');
      out.senseNoms = !g.alumnos.some(a => out.url.includes(encodeURIComponent(a.nombre)) || out.url.includes(a.nombre));
      out.k = aaEmpremta(act); out.files = cxItemsFlat(act.rubrica).length; out.actId = act.id;
      return out;
    }, ids);
    // Pàgina del mòbil
    const m = await t.contexto.newPage(); const errM = []; m.on('pageerror', e => errM.push(e.message));
    await m.goto(r.url); await m.waitForSelector('.op');
    await m.fill('#num', '3');
    const n = await m.locator('fieldset').count();
    for (let i = 0; i < n; i++) await m.click(`fieldset >> nth=${i} >> .op >> nth=1`);
    await m.click('#fet'); const codi = (await m.textContent('#codi')).trim();
    await m.goto(r.urlCo); await m.reload(); await m.waitForSelector('.op'); await m.fill('#num', '1');
    const objectiu = await m.textContent('#numAj');
    await m.close();
    const r2 = await p.evaluate(async ([ids, codi]) => {
      const g = state.grupos[0], act = g.actividades.find(a => a.seguiment === 'laboratori');
      window.__dialogosAuto = { texto: codi + '\nA-9-1111-ZZZZ' }; window.__dialogosLog = [];
      await aaEnganxarCodis(act.id);
      return { auto3: act.autoaval[ids[2]] && aaNota(act, act.autoaval[ids[2]].n), avis: window.__dialogosLog.join(' | ') };
    }, [ids, codi]);
    t.ok(senseNotes && enviarDesactivat, 'pantalla de l\'alumnat: només noms, sense notes; no s\'envia fins a triar totes les files');
    t.ok(r.auto === nFiles && r.notaAuto != null && /✓/.test(marcat), 'l\'autoavaluació es guarda i el nom queda marcat', JSON.stringify([r.auto, nFiles, marcat]));
    t.ok(r.parella && r.co, 'coavaluació: cadascú avalua un altre company/a (no a si mateix)');
    t.ok(r.profAbans == null && Math.abs(r.profDespres - r.notaAuto) < 0.051, '«Copiar a la meua correcció» posa els nivells de l\'autoavaluació en la nota', JSON.stringify([r.profAbans, r.profDespres, r.notaAuto]));
    t.ok(r.senseNoms, 'l\'enllaç per al mòbil no porta cap nom');
    t.ok(new RegExp('^A-3-\\d{' + r.files + '}-' + r.k + '$').test(codi), 'el mòbil dona un codi amb el número de llista, els nivells i l\'empremta', codi);
    t.ok(/número \d/.test(objectiu), 'coavaluació al mòbil: diu el número del company/a que s\'avalua', objectiu);
    t.ok(r2.auto3 != null && /d'una altra activitat/.test(r2.avis), 'en enganxar els codis s\'afigen i els d\'una altra activitat es rebutgen', JSON.stringify(r2));
    t.ok(!p.errores.length && !errM.length, 'sin errores de JavaScript', p.errores.concat(errM).slice(0, 3).join('; '));
  } },
  { nombre: 'posicio-alumnat', descripcion: "Alumnat: editar no torna dalt (ni en la llista ni en la fitxa), el cursor es queda a la fila i tocar l'alumne/a obri el seguiment (NESE → pantalla NESE i tornar)", async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const noms = Array.from({ length: 30 }, (_, i) => `Cognom${String(i).padStart(2, '0')} X, Nom${i}`);
    await cuadernoConGrupo(p, t.url, { nombres: noms });
    const r = await p.evaluate(() => {
      const g = state.grupos[0], out = {};
      state.ui.appMode = 'competencial'; state.ui.tab = 'alumnos'; save(); render();
      const caixa = () => document.querySelector('#tablaAlumnos').closest('.scroll');
      const fila = n => document.querySelectorAll('#tablaAlumnos tbody tr[data-id]')[n];
      window.scrollTo(0, 300); caixa().scrollTop = 500;
      // Edició en la llista
      const inp = fila(18).querySelector('input'); const id18 = fila(18).dataset.id;
      inp.focus({ preventScroll: true }); inp.value = 'Cognom18 Y'; inp.dispatchEvent(new Event('change'));
      out.llista = [scrollY, caixa().scrollTop];
      out.focus = document.activeElement && document.activeElement.closest('tr') && document.activeElement.closest('tr').dataset.id === id18;
      // Edició des de la fitxa
      const id20 = fila(20).dataset.id;
      abrirFichaAlumno(id20);
      const nom = document.querySelector('.modal-box input[onchange^="renombrarNombreP"]');
      nom.value = 'Zzz'; nom.dispatchEvent(new Event('change'));
      cerrarFichaAlumno();
      out.fitxa = [scrollY, caixa().scrollTop];
      out.focusFitxa = document.activeElement && document.activeElement.closest('tr') && document.activeElement.closest('tr').dataset.id === id20;
      // Seguiment: no NESE → fitxa amb el resum (les dades plegades)
      obrirSeguimentAlumne(id20);
      out.seguiment = !!document.querySelector('.modal-box') && !document.querySelector('.modal-box details[open]') && /Notes/.test(document.querySelector('.modal-box').textContent);
      cerrarFichaAlumno();
      // NESE amb pla → pantalla NESE i tornar al mateix lloc
      const a = g.alumnos.find(x => x.id === id20); a.nese = true;
      state.planesNESE = [{ id: 'pn1', grupoId: g.id, alumnoId: id20, alumnoNombre: a.nombre, tipo: 'curricular', ciclo: '4', filas: [] }];
      save(); render();
      window.scrollTo(0, 300); caixa().scrollTop = 500;
      const boto = [...fila(20).querySelectorAll('button')].find(b => /NESE/.test(b.textContent));
      out.boto = !!boto; boto.click();
      out.nese = [state.ui.appMode, state.ui.neTab, state.ui.neId];
      const tornar = [...document.querySelectorAll('#app button')].find(b => /Tornar a/.test(b.textContent));
      out.tornar = !!tornar; tornar.click();
      out.tornat = [state.ui.appMode, state.ui.tab, scrollY, caixa().scrollTop];
      // NESE sense pla → obri el formulari per a crear-lo
      state.planesNESE = []; save(); render();
      obrirSeguimentAlumne(id20);
      out.crear = state.ui.appMode === 'nese' && !!state.ui.neModalCrear && /Tornar a/.test(document.getElementById('app').textContent);
      neTornarAlGrup();
      return out;
    });
    t.ok(r.llista[0] === 300 && r.llista[1] === 500, 'editar un nom en la llista no mou la pantalla', JSON.stringify(r.llista));
    t.ok(r.focus, 'el cursor es queda en la mateixa fila');
    t.ok(r.fitxa[0] === 300 && r.fitxa[1] === 500 && r.focusFitxa, 'editar des de la fitxa i tancar-la deixa la llista on estava i el cursor en la fila', JSON.stringify(r.fitxa));
    t.ok(r.seguiment, 'el seguiment d\'un alumne/a no NESE obri la fitxa amb el resum');
    t.ok(r.boto && r.nese.join() === 'nese,detalle,pn1', 'un alumne/a NESE va directament a la pantalla del seu pla NESE', JSON.stringify(r.nese));
    t.ok(r.tornar && r.tornat.join() === 'competencial,alumnos,300,500', '«Tornar» porta a la llista al mateix lloc', JSON.stringify(r.tornat));
    t.ok(r.crear, 'un alumne/a NESE sense pla obri el formulari per a crear-lo');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'blocs-desactivar', descripcion: 'Blocs: es poden posar a 0 % i desactivar sense perdre res; els treballs i exposicions no van al bloc de l\'actitud', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    const ids = await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async ids => {
      const g = state.grupos[0], B = g.bloques;
      const lab = k => (B.find(b => b.id === segBlocsIds(g, k)[0]) || {}).label;
      const out = { treballs: lab('treballs'), actitud: lab('actitud'), lab: lab('laboratori') };
      g.actividades = [
        { id: 'e1', nombre: 'Examen 1', tipo: TIPOS[0], trimestre: 0, bloqueId: B[0].id, esExamen: true, criterios: [] },
        { id: 'q1', nombre: 'Quadern', tipo: TIPOS[0], trimestre: 0, bloqueId: B[1].id, esExamen: true, criterios: [] }];
      g.notasCuant = { [ids[0]]: { e1: 8, q1: 2 } };
      state.ui.appMode = 'competencial'; state.ui.tab = 'ajustes'; save(); render(); _invalidarCaches();
      out.abans = notaTrimestre(g, ids[0], 0);
      const caixa = () => document.querySelector('[onchange^="blocActivar(1,"]');
      out.hiHaCaixa = !!caixa() && caixa().checked;
      caixa().click(); await new Promise(r => setTimeout(r, 100)); _invalidarCaches();
      out.inactiu = state.grupos[0].bloques[1].inactiu === true && state.grupos[0].bloques[1].peso === 15;
      out.desactivat = notaTrimestre(g, ids[0], 0);
      out.text = document.getElementById('sumaBloquesAviso').textContent;
      out.marcat = caixa().checked;
      caixa().click(); await new Promise(r => setTimeout(r, 100)); _invalidarCaches();
      out.tornat = notaTrimestre(g, ids[0], 0);
      const inp = document.querySelector('[oninput^="setBloqueW(1,"]');
      inp.value = '0'; inp.dispatchEvent(new Event('input')); _invalidarCaches();
      out.zero = [state.grupos[0].bloques[1].peso, notaTrimestre(g, ids[0], 0)];
      const txt = 'MATERIA: Prova\nCURSO: 1r\n\nBLOQUES\nExàmens = 100\nDeures = 0\n\nCE1: Una | CCL\n1.1: Criteri u.\n';
      out.importa = validarCatalogo(parseCatalogoTexto(txt)).ok;
      return out;
    }, ids);
    t.ok(/investig/i.test(r.treballs) && /proactiv/i.test(r.actitud), 'Treballs i exposicions van al bloc de treball d\'investigació i l\'Actitud al de proactivitat', JSON.stringify(r));
    t.ok(r.hiHaCaixa, 'cada bloc té la casella «Compta en la nota» marcada');
    t.ok(Math.abs(r.abans - (8 * 60 + 2 * 15) / 75) < 1e-9, 'abans: exàmens 60 % i quadern 15 %', String(r.abans));
    t.ok(r.inactiu && !r.marcat && r.desactivat === 8, 'desactivat: no compta, però conserva el pes', JSON.stringify(r));
    t.ok(/Desactivat/.test(r.text), 'la suma diu quins blocs estan desactivats', r.text);
    t.ok(Math.abs(r.tornat - r.abans) < 1e-9, 'reactivat: la nota torna a ser la d\'abans');
    t.ok(r.zero[0] === 0 && r.zero[1] === 8, 'un bloc a 0 % no compta', JSON.stringify(r.zero));
    t.ok(r.importa === true, 'una plantilla de matèria pot tindre un bloc a 0 %');
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'separar-bloc-compartit', descripcion: 'Seguiment: Treballs es pot separar del bloc que comparteix amb Laboratori sense canviar la suma', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    const r = await p.evaluate(async () => {
      const g = state.grupos[0];
      const lab0 = segBlocsIds(g, 'laboratori')[0], tr0 = segBlocsIds(g, 'treballs')[0];
      const suma = () => Math.round(g.bloques.reduce((n, b) => n + pesoBloqueNota(b), 0) * 100) / 100;
      const out = { compartit: lab0 === tr0, suma0: suma(), pesLab0: g.bloques.find(b => b.id === lab0).peso };
      g.actividades.push({ id: 'tw1', nombre: 'Exposició', tipo: TIPOS[0], trimestre: 0, bloqueId: tr0, seguiment: 'treballs', esExamen: true, criterios: [] });
      state.ui.appMode = 'competencial'; state.ui.tab = 'actividades'; save(); render();
      await new Promise(r => setTimeout(r, 100));
      out.boto = !!document.querySelector('[onclick="segSepararBloc(\'treballs\')"]');
      window.__dialogosAuto = { texto: '5' };
      await segSepararBloc('treballs');
      const nou = g.bloques.find(b => b.id === segBlocsIds(g, 'treballs')[0]);
      out.nou = nou && [nou.label, nou.peso].join('|');
      out.pesLab = g.bloques.find(b => b.id === lab0).peso;
      out.labIgual = segBlocsIds(g, 'laboratori')[0] === lab0;
      out.act = g.actividades.find(a => a.id === 'tw1').bloqueId === (nou && nou.id);
      out.suma = suma();
      delete window.__dialogosAuto;
      // Desmarcar tots els blocs: l'apartat no compta; tornar a marcar-ne un i compartir-lo
      const al = g.alumnos[0].id; (g.notasCuant[al] = g.notasCuant[al] || {}).tw1 = 3;
      g.actividades.push({ id: 'ex1', nombre: 'Examen', tipo: TIPOS[0], trimestre: 0, bloqueId: segBlocsIds(g, 'examens')[0], esExamen: true, criterios: [] });
      g.notasCuant[al].ex1 = 9; _invalidarCaches();
      out.ambTreballs = notaTrimestre(g, al, 0);
      segTriarBloc('treballs', nou.id, false); _invalidarCaches();
      out.cap = [segBlocsIds(g, 'treballs').length, g.actividades.find(a => a.id === 'tw1').sinBloc === true, notaTrimestre(g, al, 0)];
      out.textCap = /No compta en cap bloc/.test(document.getElementById('tabContent').textContent);
      segTriarBloc('treballs', segBlocsIds(g, 'examens')[0], true); _invalidarCaches();
      out.compartit2 = [segBlocsIds(g, 'treballs').join() === segBlocsIds(g, 'examens').join(), !g.actividades.find(a => a.id === 'tw1').sinBloc, notaTrimestre(g, al, 0)];
      return out;
    });
    t.ok(r.compartit && r.boto, 'Treballs i Laboratori comparteixen bloc i hi ha el botó «Separar»', JSON.stringify(r));
    t.ok(r.nou === 'Treballs i exposicions|5' && r.pesLab === r.pesLab0 - 5 && r.labIgual, 'Treballs té bloc propi a 5 % i Laboratori perd eixe 5 %', JSON.stringify(r));
    t.ok(r.act, 'les activitats de Treballs passen al bloc nou');
    t.ok(r.suma === r.suma0, 'la suma dels blocs no canvia', JSON.stringify(r));
    t.ok(r.cap[0] === 0 && r.cap[1] && r.cap[2] === 9 && r.textCap && r.ambTreballs !== 9, 'es pot desmarcar l\'últim bloc: l\'apartat deixa de comptar', JSON.stringify(r));
    t.ok(r.compartit2[0] && r.compartit2[1] && r.compartit2[2] === 6, 'tornar a marcar un bloc (compartit amb Exàmens) el fa comptar de nou', JSON.stringify(r));
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'quadern-nese', descripcion: 'Pla NESE: seguiment del quadern de reforç (tasques fetes, nivell, criteris), progrés per CE, I/P/A i notes del grup', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    await p.evaluate(() => { const g = state.grupos[0]; g.alumnos[1].nese = true; state.ui.appMode = 'nese'; state.ui.neTab = 'lista'; save(); render();
      neAbrirModalCrear(g.id, g.alumnos[1].id); });
    await esperar(300);
    await p.click('#neCicloOpciones .chip[data-ciclo="5"]'); await p.evaluate(() => neCrearPlan()); await esperar(300);
    t.ok(await p.isVisible('#qnQuadern') && await p.inputValue('#qnDossierSel') === '2eso', 'el pla mostra el quadern i suggerix el dossier del curs del grup');
    t.ok(await p.evaluate(() => document.querySelectorAll('#qnQuadern .rf-dossier-alumnat a[href^="docs/reforc/dossier-alumnat-nese-fiq-2eso."]').length === 2), 'el pla enllaça el dossier NESE de l\'alumnat del seu curs (PDF i Word)');
    await p.evaluate(() => qnCarregar()); await esperar(300);
    let r = await p.evaluate(() => { const pl = state.planesNESE[0]; return { n: pl.quadern.tasques.length, t1: pl.quadern.tasques.filter(x => x.tema === 1).map(x => x.criteris.join('+')).join(' ') }; });
    t.ok(r.n === 46 && r.t1 === '7.2 7.1 6.1 7.2 2.2 9.3+7.1', 'es carreguen les 46 tasques del dossier de 2n amb els seus criteris', JSON.stringify(r));
    await p.evaluate(() => { const ts = state.planesNESE[0].quadern.tasques; qnSetFeta(ts[0].id, true); qnSet(ts[0].id, 'assol', 'AE'); qnSet(ts[5].id, 'assol', 'NA'); qnSet(ts[5].id, 'ajuda', true); qnSet(ts[5].id, 'nota', 'Li costa mesurar el volum'); });
    await esperar(300);
    r = await p.evaluate(() => { const pl = state.planesNESE[0], ts = pl.quadern.tasques, pr = qnProgres(pl, null); const ce7 = pr.ces.find(e => e.id === 'CE7'), c71 = pr.crit['7.1'];
      return { feta0: ts[0].feta && !!ts[0].data, feta5: ts[5].feta, ce7: ce7 && [ce7.fetes, ce7.total].join('/'), c71: c71 && [c71.fetes, c71.total, c71.mitjana, c71.ajuda].join('/'), text: document.getElementById('qnProgres').innerText, resum: qnResumCurt(pl) }; });
    t.ok(r.feta0 && r.feta5, 'marcar o valorar una tasca la deixa feta i amb data', JSON.stringify(r));
    t.ok(r.ce7 === '2/11' && r.c71 === '1/4/1/1' && /CE7/.test(r.text) && /CE9/.test(r.text), 'el progrés per CE i criteri compta les tasques fetes i el nivell', JSON.stringify(r));
    t.ok(/2\/46 tasques/.test(r.resum), 'resum curt per a la llista i la fitxa', r.resum);
    // Tasca pròpia
    await p.evaluate(() => qnObrirNova(true)); await esperar(200);
    await p.fill('#qnNTitol', 'Fitxa extra de densitat'); await p.selectOption('#qnNTema', '1'); await p.evaluate(() => qnNovaTemaCanviat());
    await p.check('#qnNCrits input[value="9.3"]'); await p.fill('#qnNAltres', '2.4'); await p.evaluate(() => qnAfegirTasca()); await esperar(200);
    r = await p.evaluate(() => { const ts = state.planesNESE[0].quadern.tasques, x = ts[ts.length - 1]; return [x.titol, x.tema, x.criteris.join('+'), x.propia].join('|'); });
    t.ok(r === 'Fitxa extra de densitat|1|9.3+2.4|true', 'es pot afegir una tasca pròpia amb criteris', r);
    // I/P/A i notes del grup
    await p.evaluate(() => qnProposarIPA(0)); await esperar(200);
    r = await p.evaluate(() => state.planesNESE[0].filas.filter(f => f.ce === 'CE7' || f.ce === 'CE9').map(f => f.ce + ':' + f.v1).join(' '));
    t.ok(/CE7:P/.test(r) && /CE9:I/.test(r), 'proposa I/P/A de la 1a avaluació per competència', r);
    await p.evaluate(async () => { window.__dialogosAuto = { confirmar: true }; await qnPassarAlGrup(0); }); await esperar(400);
    r = await p.evaluate(() => { const g = state.grupos[0], pl = state.planesNESE[0], a = g.actividades.find(x => x.quadernNese === pl.id); if (!a) return null;
      return { nom: a.nombre, crits: a.criterios.map(c => c.critId).sort().join('+'), nota: notaActividad(g, g.alumnos[1].id, a), ex: marcaDe(g, g.alumnos[0].id, a.id), n: g.actividades.length }; });
    t.ok(r && r.crits === '7.1+7.2+9.3' && Math.abs(r.nota - (10 + 2.5 + 2.5) / 3) < 0.01 && r.ex === 'EX' && r.n === 1, 'passa al grup una activitat per tema només per a l\'alumne/a NESE', JSON.stringify(r));
    await p.evaluate(async () => { await qnPassarAlGrup(0); }); await esperar(300);
    t.ok(await p.evaluate(() => state.grupos[0].actividades.length) === 1, 'tornar a passar-ho actualitza la mateixa activitat');
    r = await p.evaluate(() => qnInformeHTML(state.planesNESE[0], 'final'));
    t.ok(/Quadern de reforç/.test(r) && /Li costa mesurar/.test(r), 'l\'informe del pla inclou el quadern');
    r = await p.evaluate(() => { const g = state.grupos[0]; return fitxaResumHTML(g, g.alumnos[1]); });
    t.ok(/📒 2\/47 tasques/.test(r), 'la fitxa de l\'alumne/a mostra per on va el quadern', r.match(/NESE[^<]*/)?.[0]);
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'capcalera-centre', descripcion: 'Capçalera del centre: es puja una vegada, botó Sí/No en cada document (també en cada full per alumne), a l\'editor d\'exàmens i «Mostrar tots els criteris»', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno', 'Gamma, Gema'] });
    // Imatge de prova: un PNG xicotet fet amb canvas (apaïsat).
    await p.evaluate(() => { _mostrarBienvenida = false; const c = document.createElement('canvas'); c.width = 400; c.height = 50; const x = c.getContext('2d'); x.fillStyle = '#0a5'; x.fillRect(0, 0, 400, 50);
      state.capcalera = { src: c.toDataURL('image/png'), w: 400, h: 50, perDefecte: true, docs: {} }; state.ui.appMode = 'inicio'; save(); render(); });
    await esperar(300);
    t.ok(await p.evaluate(() => /Capçalera del centre/.test(document.getElementById('app').innerText) && !!document.querySelector('img[alt="Capçalera del centre"]')), 'Inici mostra la capçalera pujada amb els botons per a canviar-la');
    let r = await p.evaluate(() => { exportarInformesFamiliaTots(0); const sh = document.querySelector('#printOverlay .print-hoja').shadowRoot;
      return { n: sh.querySelectorAll('.doc-capcalera-centre').length, fulls: sh.querySelectorAll('.ia-full').length, boto: document.getElementById('prtCapcalera').textContent, desa: (_imprimibleActual.docHtml.match(/doc-capcalera-centre/g) || []).length }; });
    t.ok(r.boto === '🏫 Capçalera: Sí' && r.n === r.fulls && r.n === 3 && r.desa === 3, 'per defecte, un informe per alumne/a porta la capçalera dalt de cada full (i també en el fitxer que es guarda)', JSON.stringify(r));
    r = await p.evaluate(() => { document.getElementById('prtCapcalera').click(); const sh = document.querySelector('#printOverlay .print-hoja').shadowRoot;
      const o = { n: sh.querySelectorAll('.doc-capcalera-centre').length, boto: document.getElementById('prtCapcalera').textContent, desa: /doc-capcalera-centre/.test(_imprimibleActual.docHtml) }; cerrarImprimible();
      exportarInformesFamiliaTots(0); o.recorda = document.getElementById('prtCapcalera').textContent; cerrarImprimible();
      exportarActaSessio(0); o.acta = document.getElementById('prtCapcalera').textContent; o.actaN = document.querySelector('#printOverlay .print-hoja').shadowRoot.querySelectorAll('.doc-capcalera-centre').length; cerrarImprimible(); return o; });
    t.ok(r.n === 0 && r.boto === '🏫 Capçalera: No' && !r.desa && r.recorda === '🏫 Capçalera: No', 'el botó la lleva i la tria es recorda per a eixe tipus de document', JSON.stringify(r));
    t.ok(r.acta === '🏫 Capçalera: Sí' && r.actaN === 1, 'un altre tipus de document la continua portant', JSON.stringify(r));
    // Editor d'exàmens
    await p.evaluate(() => { const g = state.grupos[0], ces = getCatalogo('FiQ_2ESO').ces, cr = ces[0].criterios[0].id;
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'FiQ_2ESO', sdas: [], actividades: [{ id: 'pa1', nombre: 'Examen tema 1', tipo: TIPOS[0], esExamen: true, criterios: [{ critId: cr, peso: 100 }], sdaIds: [] }] }];
      migrarEstado(); g.programacionId = 'p1'; g.catalogoKey = 'FiQ_2ESO';
      const act = progCrearActividadEnGrupo(g, state.programaciones[0].actividades[0], 0); g.actividades.push(act);
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = act.id; state.ui.corTab = 'diseno'; save(); render(); });
    await esperar(1500);
    const fr = p.frameLocator('#exFrame');
    r = await p.evaluate(() => { const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get(); return { primer: ex.body[0].type + ':' + !!ex.body[0].centre, first: ex.header.first, boto: w.document.getElementById('btnCentre').textContent }; });
    t.ok(r.primer === 'image:true' && r.first === false && /✓/.test(r.boto), 'un examen nou ja porta la capçalera del centre dalt (i la de text passa a les pàgines següents)', JSON.stringify(r));
    await fr.locator('#btnCentre').click(); await esperar(300);
    r = await p.evaluate(() => { const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get(); return { te: ex.body.some(n => n.centre), first: ex.header.first, boto: w.document.getElementById('btnCentre').textContent }; });
    t.ok(!r.te && r.first === true && !/✓/.test(r.boto), 'el botó «🏫 Capçalera del centre» la lleva i torna la capçalera de text a la primera pàgina', JSON.stringify(r));
    await fr.locator('#btnCentre').click(); await esperar(300);
    t.ok(await p.evaluate(() => document.getElementById('exFrame').contentWindow.__ee.teCapcalera()), 'i la torna a posar');
    // Criteris: només els previstos, o tots.
    await p.evaluate(() => { const w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get(); const q = w.newNode('question'); ex.body.push(q); w.__ee.cargar(ex); w.selectNode(q.id); });
    await esperar(300);
    const nCrit = () => p.evaluate(() => document.getElementById('exFrame').contentWindow.document.querySelectorAll('#inspector input[type=checkbox]').length);
    const abans = await nCrit();
    await fr.locator('#inspector button:has-text("Mostrar tots els criteris")').click(); await esperar(200);
    const despres = await nCrit();
    t.ok(despres > abans + 3, 'en Criteris d\'avaluació, «Mostrar tots els criteris» obri tot el currículum', abans + ' → ' + despres);
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },
  { nombre: 'tornar', descripcion: 'Botó «← Tornar» de la barra superior: torna a la pantalla anterior (grup, secció, corrector…) en totes les pantalles', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno'] });
    const estat = () => p.evaluate(() => [state.ui.appMode, state.ui.tab, state.ui.corTab].join('/'));
    await p.evaluate(() => { _mostrarBienvenida = false; state.ui.appMode = 'inicio'; save(); render(); }); await esperar(200);
    await p.evaluate(() => { state.ui.appMode = 'competencial'; state.ui.grupoId = state.grupos[0].id; state.ui.tab = 'alumnos'; save(); render(); }); await esperar(200);
    await p.evaluate(() => { state.ui.tab = 'resultados'; save(); render(); }); await esperar(200);
    await p.evaluate(() => { state.ui.appMode = 'corrector'; state.ui.corTab = 'lista'; save(); render(); }); await esperar(300);
    t.ok(await p.isVisible('#btnTornar') && await p.isEnabled('#btnTornar'), 'el Corrector d\'exàmens té el botó «← Tornar» actiu');
    await p.click('#btnTornar'); await esperar(200);
    const a = await estat();
    await p.click('#btnTornar'); await esperar(200);
    const b = await estat();
    await p.click('#btnTornar'); await esperar(200);
    const c = await estat();
    t.ok(a === 'competencial/resultados/lista' && b === 'competencial/alumnos/lista' && /^inicio\//.test(c), 'torna pas a pas: Resultats → Alumnat → Inici', [a, b, c].join(' · '));
    t.ok(await p.isDisabled('#btnTornar'), 'quan no hi ha on tornar, el botó queda desactivat');
    for (const mode of ['programacion', 'reuniones', 'refuerzo', 'repeticion', 'nese', 'biblioteca', 'memoria', 'pendents']) {
      await p.evaluate(m => { state.ui.appMode = m; save(); render(); }, mode); await esperar(150);
      t.ok(await p.isVisible('#btnTornar') && await p.isEnabled('#btnTornar'), 'botó «← Tornar» a ' + mode);
    }
    t.ok(!p.errores.length, 'sin errores de JavaScript', p.errores.slice(0, 3).join('; '));
  } },

  { nombre: 'examen-alternatiu-auto', descripcion: 'Examen alternatiu: còpia amb altres dades numèriques i generat amb IA (resposta simulada), amb la rúbrica al dia', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url, { nombres: ['Alfa, Ana', 'Beta, Bruno'] });
    const cr = await p.evaluate(async () => { _mostrarBienvenida = false; const g = state.grupos[0], cr = getCatalogo('FiQ_2ESO').ces[0].criterios[0].id;
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'FiQ_2ESO', sdas: [], actividades: [{ id: 'pa1', nombre: 'Examen tema 1', tipo: TIPOS[0], esExamen: true, criterios: [{ critId: cr, peso: 100 }], sdaIds: [] }] }];
      migrarEstado(); g.programacionId = 'p1'; g.catalogoKey = 'FiQ_2ESO';
      const act = progCrearActividadEnGrupo(g, state.programaciones[0].actividades[0], 0); g.actividades.push(act);
      state.ui.appMode = 'corrector'; state.ui.grupoId = g.id; state.ui.corExamId = act.id; state.ui.corTab = 'diseno'; save(); render(); return cr; });
    await esperar(1500);
    // Examen general: dues preguntes amb dades, punts i criteri; rúbrica importada del disseny.
    await p.evaluate(async cr => { const g = state.grupos[0], act = g.actividades[0], w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q1 = w.newNode('question'); q1.id = 'q1'; q1.text = 'Un cotxe recorre 120 km en 2 h. Calcula la velocitat en m/s. Dada: g = 9,8 m/s<sup>2</sup>.'; q1.points = '6'; q1.crit = [cr];
      const q2 = w.newNode('question'); q2.id = 'q2'; q2.text = 'Dissolem 20 g de NaCl en 500 mL d\'aigua. Calcula la concentració en g/L (20 g).'; q2.points = '4'; q2.crit = [cr];
      ex.body.push(q1, q2); w.__ee.cargar(ex); w.__ee.flush();
      await new Promise(r => setTimeout(r, 400));
      if (!act.rubrica) act.rubrica = [];
      await cxImportarEstructura(g, act, exConReparto(w.__ee.estructura()), act); save(); }, cr);
    await esperar(400);
    // 1) Còpia amb altres dades numèriques
    await p.click('#tabContent button:has-text("+ Examen alternatiu")'); await esperar(400);
    await p.check('input[name="altInicio"][value="dades"]'); await p.click('#altSi'); await esperar(2200);
    let r = await p.evaluate(() => { const act = state.grupos[0].actividades[0], v = act.variantes[0], w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      const q = id => ex.body.find(n => n.id === id) || {};
      return { editant: state.ui.corVarId === v.id, t1: q('q1').text, t2: q('q2').text, punts: q('q1').points + '/' + q('q2').points,
        rub: cxItemsFlat(v.rubrica).map(i => i.fuenteId + ':' + i.max).join(), modal: ([...document.querySelectorAll('.modal-overlay')].pop() || {}).innerText || '' }; });
    const m2 = (r.t2.match(/(\d+) g de NaCl.*\((\d+) g\)/) || []);
    t.ok(r.editant && !/120 km/.test(r.t1) && /\d+ km en \d+ h/.test(r.t1) && /9,8 m\/s<sup>2<\/sup>/.test(r.t1), 'les dades canvien i la constant g es queda', r.t1);
    t.ok(m2[1] && m2[1] === m2[2] && m2[1] !== '20' && r.punts === '6/4', 'el mateix valor canvia igual dins de la pregunta; els punts no canvien', r.t2 + ' · ' + r.punts);
    t.ok(r.rub === 'q1:6,q2:4', 'la rúbrica de l\'alternatiu és la mateixa (mateixes preguntes i punts)', r.rub);
    t.ok(/Còpia amb altres dades/.test(r.modal) && /120 km/.test(r.modal), 'un resum ensenya les dades canviades', r.modal.slice(0, 200));
    await p.evaluate(() => [...document.querySelectorAll('.modal-overlay')].forEach(m => m.remove()));
    // «🔢 Altres dades» torna a canviar-les
    await p.click('#tabContent button:has-text("Altres dades")'); await esperar(600);
    const t1b = await p.evaluate(() => document.getElementById('exFrame').contentWindow.__ee.get().body.find(n => n.id === 'q1').text);
    t.ok(t1b !== r.t1 && /\d+ km en \d+ h/.test(t1b), '«🔢 Altres dades» en el disseny les torna a canviar', t1b);
    await p.evaluate(() => [...document.querySelectorAll('.modal-overlay')].forEach(m => m.remove()));
    // 2) Generat amb IA (resposta simulada), rúbrica nova
    let enviat = null;
    await p.route('https://api.anthropic.com/v1/messages', async route => {
      enviat = { h: route.request().headers(), b: JSON.parse(route.request().postData() || '{}') };
      const body = [{ id: 'q1', type: 'question', text: 'Una moto recorre 90 km en 1,5 h. Calcula la velocitat.', points: 5, crit: [cr] },
        { id: 'nou1', type: 'question', text: 'Explica què és la densitat <script>x</script>.', points: 5, crit: [cr, 'X.9'], children: [{ id: 'nou2', type: 'lines', count: 4 }] }];
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ body, resum: 'Preguntes noves més difícils.', solucions: [{ id: 'q1', text: '60 km/h' }] }) }] }) });
    });
    await p.evaluate(() => { state.ui.corVarId = ''; render(); }); await esperar(1200);
    await p.click('#tabContent button:has-text("+ Examen alternatiu")'); await esperar(400);
    await p.check('input[name="altInicio"][value="ia"]');
    await p.click('#altSi'); await esperar(300);
    t.ok(/clau/.test(await p.evaluate(() => document.getElementById('altIAEstat').textContent)), 'sense clau, demana la clau i no crea res');
    await p.fill('#altIAClau', 'sk-ant-prova'); await p.selectOption('#altIADif', 'dificil'); await p.check('input[name="altIARub"][value="nova"]');
    await p.click('#altSi'); await esperar(2500);
    r = await p.evaluate(() => { const act = state.grupos[0].actividades[0], v = act.variantes[1], w = document.getElementById('exFrame').contentWindow, ex = w.__ee.get();
      return { n: act.variantes.length, editant: state.ui.corVarId === (v && v.id), preguntes: ex.body.filter(n => n.type === 'question').map(n => n.text + '|' + n.points + '|' + (n.crit || []).join('+')),
        linies: ex.body.filter(n => n.type === 'question')[1]?.children?.[0]?.count, rub: v ? cxItemsFlat(v.rubrica).map(i => i.max).join() : '', rubGeneral: cxItemsFlat(act.rubrica).map(i => i.max).join(),
        clau: localStorage.getItem('cuaderno_ia_clau'), enCopia: JSON.stringify(state).includes('sk-ant-prova'), modal: ([...document.querySelectorAll('.modal-overlay')].pop() || {}).innerText || '' }; });
    t.ok(enviat && enviat.h['x-api-key'] === 'sk-ant-prova' && enviat.h['anthropic-dangerous-direct-browser-access'] === 'true' && /MÉS DIFÍCIL/.test(enviat.b.messages[0].content) && /120 km/.test(enviat.b.messages[0].content), 'envia l\'examen a la IA amb la clau i la dificultat triada');
    t.ok(enviat && !/Alfa|Beta/.test(JSON.stringify(enviat.b)), 'no envia res de l\'alumnat');
    t.ok(r.n === 2 && r.editant && r.preguntes.length === 2 && /moto/.test(r.preguntes[0]) && r.preguntes[1] === 'Explica què és la densitat x.|5|' + cr && r.linies === 4, 'l\'examen generat s\'obri en el disseny (HTML net, criteris vàlids)', JSON.stringify(r.preguntes));
    t.ok(r.rub === '5,5' && r.rubGeneral === '6,4', 'rúbrica nova a partir de les preguntes generades; la general no canvia', r.rub + ' / ' + r.rubGeneral);
    t.ok(r.clau === 'sk-ant-prova' && !r.enCopia, 'la clau es recorda en el navegador però no va en les dades (ni en les còpies)');
    t.ok(/generat amb IA/.test(r.modal) && /60 km\/h/.test(r.modal), 'el resum ensenya el que ha canviat i les solucions', r.modal.slice(0, 200));
    t.ok(!p.errores.length, 'sense errors de JavaScript', p.errores.slice(0, 3).join('; '));
  } },

  { nombre: 'activitat-propia', descripcion: 'Grup amb Programació: es pot crear una activitat pròpia, sense cap SdA (examen sense criteris o deures amb criteris)', async fn(t) {
    const p = await nuevaPagina(t.contexto);
    await cuadernoConGrupo(p, t.url);
    await p.evaluate(() => { const g = state.grupos[0];
      state.programaciones = [{ id: 'p1', nombre: 'Prog', catalogoKey: 'FiQ_2ESO', sdas: [{ id: 's1', titulo: 'SdA 1', trimestre: 0 }], actividades: [] }];
      migrarEstado(); g.programacionId = 'p1'; state.ui.grupoId = g.id; state.ui.appMode = 'competencial'; state.ui.tab = 'actividades'; save(); render(); });
    await esperar(600);
    t.ok(await p.isVisible('text=+ Activitat pròpia (sense SA)') && !(await p.$('#fN')), 'amb Programació es veu el selector i el botó d\'activitat pròpia');
    await p.click('text=+ Activitat pròpia (sense SA)'); await esperar(400);
    t.ok(await p.isVisible('#fN') && await p.isVisible('text=Activitat pròpia (sense Situació d\'Aprenentatge)'), 'el botó obri el formulari lliure');
    await p.selectOption('#fT', await p.evaluate(() => TIPO_EXAMEN)); await esperar(400);
    await p.fill('#fN', 'Control sorpresa');
    t.ok(!(await p.isDisabled('#fSave')), 'un examen es pot guardar sense criteris');
    await p.click('#fSave'); await esperar(400);
    let r = await p.evaluate(() => { const a = state.grupos[0].actividades.find(x => x.nombre === 'Control sorpresa'); return a && { ex: a.esExamen, sda: a.sda, n: a.criterios.length, form: !!document.getElementById('fN') }; });
    t.ok(r && r.ex && !r.sda && r.n === 0 && !r.form, 'es crea l\'examen sense SdA i el formulari es tanca', JSON.stringify(r));
    await p.click('text=+ Activitat pròpia (sense SA)'); await esperar(400);
    await p.selectOption('#fT', await p.evaluate(() => TIPOS[1])); await esperar(400);
    await p.fill('#fN', 'Deures tema 1');
    t.ok(await p.isDisabled('#fSave'), 'uns deures necessiten almenys un criteri');
    await p.click('.critbox input[type=checkbox] >> nth=0'); await esperar(400);
    await p.click('#fSave'); await esperar(400);
    r = await p.evaluate(() => { const a = state.grupos[0].actividades.find(x => x.nombre === 'Deures tema 1'); return a && { ex: a.esExamen, n: a.criterios.length }; });
    t.ok(r && !r.ex && r.n === 1, 'es creen els deures amb el criteri', JSON.stringify(r));
    // Eliminar des de la targeta del bloc d'exàmens, amb confirmació que avisa de les notes
    await p.evaluate(() => { const g = state.grupos[0], a = g.actividades.find(x => x.nombre === 'Control sorpresa');
      g.notasCuant[g.alumnos[0].id] = { ...(g.notasCuant[g.alumnos[0].id] || {}), [a.id]: 7 }; save(); render(); });
    await p.click('button[aria-label="Eliminar Control sorpresa"]'); await esperar(300);
    const msg = await p.evaluate(() => document.querySelector('.dlg-overlay .dlg-msg')?.innerText || '');
    t.ok(/Control sorpresa/.test(msg) && /notes d'esta activitat \(1 alumne avaluat\)/.test(msg), 'demana confirmació i avisa que s\'esborren les notes', msg);
    await p.click('.dlg-overlay .dlg-no'); await esperar(200);
    t.ok(await p.evaluate(() => state.grupos[0].actividades.some(x => x.nombre === 'Control sorpresa')), 'si cancel·les, no s\'elimina');
    await p.click('button[aria-label="Eliminar Control sorpresa"]'); await esperar(300);
    await p.click('.dlg-overlay .dlg-si'); await esperar(300);
    r = await p.evaluate(() => { const g = state.grupos[0]; return { hi: g.actividades.some(x => x.nombre === 'Control sorpresa'), pap: g.papelera.actividades.length, nota: Object.values(g.notasCuant).some(o => Object.values(o || {}).includes(7)) }; });
    t.ok(!r.hi && r.pap === 1 && !r.nota, 'en confirmar s\'elimina (amb les notes) i va a la paperera', JSON.stringify(r));
    t.ok(!p.errores.length, 'sense errors de JavaScript', p.errores.slice(0, 3).join('; '));
    await p.close();
  } },
];
