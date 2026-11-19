/* Portfolio · animaciones, selector de proyectos tipo Alt+Tab, terminal y ventana de demos */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = () => matchMedia('(max-width: 900px)').matches;
  // Idioma: el elegido antes, o el del navegador
  let idioma = (() => { try { const g = localStorage.getItem('idioma'); if (g) return g; } catch (e) {} return /^en/i.test(navigator.language || '') ? 'en' : 'es'; })();
  if (/[?&]lang=en/.test(location.search)) idioma = 'en';
  const T = (es, en) => idioma === 'en' ? en : es;

  function avisar(texto) {
    const a = $('aviso'); a.textContent = texto; a.classList.add('visible');
    clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('visible'), 2400);
  }

  // ---------- Datos de los proyectos ----------
  const PROYECTOS = {
    despensa: {
      nombre: 'Despensa', tecnologia: 'Python · Flask · SQLite', archivo: 'despensa',
      texto: 'Un sistema para que un almacén o kiosco controle su mercadería y sus ventas desde la computadora del mostrador, sin cuadernos ni planillas sueltas.',
      puntos: ['Caja con lector de código de barras y distintos medios de pago', 'Avisos de productos por reponer y por vencer', 'Compras a proveedores que suman stock solas', 'Reportes de ventas y ganancia, exportables a Excel'],
      pestanas: [['inicio', 'demos/despensa/index.html'], ['caja', 'demos/despensa/caja.html'], ['productos', 'demos/despensa/productos.html'], ['reportes', 'demos/despensa/reportes.html']],
    },
    bandeja: {
      nombre: 'Bandeja', tecnologia: 'Python · IA · SQLite', archivo: 'bandeja',
      texto: 'Lee automáticamente las facturas y remitos que llegan de los proveedores, los carga en una base de datos y avisa solo lo que hay que revisar.',
      puntos: ['Detecta totales mal sumados y facturas repetidas', 'Avisa cuando un proveedor sube un precio', 'Panel para aprobar o rechazar cada comprobante', 'Resumen semanal por mail con Excel adjunto'],
      pestanas: [['panel de revisión', 'demos/bandeja/index.html'], ['resumen semanal', 'demos/bandeja/resumen.txt']],
    },
    turnero: {
      nombre: 'Turnero', tecnologia: 'HTML · CSS · JavaScript', archivo: 'turnero',
      texto: 'Turnos online para barberías: el cliente reserva desde el celular en menos de un minuto y el local maneja su día desde un panel.',
      puntos: ['Solo muestra horarios realmente libres', 'Recordatorios por WhatsApp con el mensaje armado', 'Agenda por barbero con cobro en dos toques', 'Números del negocio: ingresos, ausencias y ocupación'],
      pestanas: [['web del cliente', 'demos/turnero/index.html'], ['panel del local', 'demos/turnero/panel.html']],
    },
  };
  const ORDEN = ['turnero', 'despensa', 'bandeja'];
  const PROYECTOS_EN = {
    despensa: { texto: 'A system for a grocery store or kiosk to track stock and sales from the counter computer, with no notebooks or scattered spreadsheets.',
      puntos: ['Checkout with barcode scanner and multiple payment methods', 'Alerts for products running low or about to expire', 'Supplier purchases that update stock automatically', 'Sales and profit reports, exportable to Excel'],
      pestanas: ['home', 'checkout', 'products', 'reports'] },
    bandeja: { tecnologia: 'Python · AI · SQLite', texto: 'Automatically reads the invoices and delivery notes suppliers send, loads them into a database and flags only what needs a human check.',
      puntos: ['Catches wrong totals and duplicate invoices', 'Warns when a supplier raises a price', 'Dashboard to approve or reject each document', 'Weekly email summary with an Excel attachment'],
      pestanas: ['review dashboard', 'weekly summary'] },
    turnero: { texto: 'Online booking for barbershops: customers book from their phone in under a minute and the shop runs its day from a dashboard.',
      puntos: ['Only shows truly available time slots', 'WhatsApp reminders with the message ready to send', 'Schedule per barber, with checkout in two taps', 'Business numbers: revenue, no-shows and occupancy'],
      pestanas: ['customer site', 'shop dashboard'] },
  };
  const P = clave => { const p = PROYECTOS[clave], e = PROYECTOS_EN[clave]; if (idioma !== 'en') return p;
    return { ...p, ...e, pestanas: p.pestanas.map(([t, u], i) => [e.pestanas[i] || t, u]) }; };

  // ---------- Fondo y barra ----------
  // la variable va solo en el fondo (no en toda la página) y una vez por cuadro
  const fondo = document.querySelector('.fondo'); let gx = 0, gy = 0, pendienteFondo = false;
  addEventListener('pointermove', e => {
    gx = e.clientX; gy = e.clientY;
    if (pendienteFondo) return; pendienteFondo = true;
    requestAnimationFrame(() => { pendienteFondo = false; fondo.style.setProperty('--gx', gx + 'px'); fondo.style.setProperty('--gy', gy + 'px'); });
  }, { passive: true });
  const barra = $('barra');
  let fija = null; addEventListener('scroll', () => { const f = scrollY > 30; if (f !== fija) { fija = f; barra.classList.toggle('fija', f); } }, { passive: true });

  // Sección activa en la barra
  const RUTAS = { inicio: '~', proyectos: '~/proyectos', stack: '~/servicios', trayectoria: '~/trayectoria', contacto: '~/contacto' };
  const RUTAS_EN = { inicio: '~', proyectos: '~/projects', stack: '~/services', trayectoria: '~/experience', contacto: '~/contact' };
  const enlaces = [...document.querySelectorAll('.barra nav a[href^="#"]')];
  const secciones = ['inicio', ...enlaces.map(a => a.getAttribute('href').slice(1))].map(id => $(id)).filter(Boolean);
  let seccionActual = null;
  function marcarSeccion() {
    const corte = innerHeight * .45;
    let s = secciones[0];
    secciones.forEach(x => { if (x.getBoundingClientRect().top <= corte) s = x; });
    if (s === seccionActual) return;
    seccionActual = s;
    enlaces.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + s.id));
    $('ruta').textContent = (idioma === 'en' ? RUTAS_EN : RUTAS)[s.id] || '~';
  }
  addEventListener('scroll', marcarSeccion, { passive: true }); marcarSeccion();

  // ---------- Reloj ----------
  function reloj() {
    const p = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    $('reloj').textContent = `${p.find(x => x.type === 'hour').value}:${p.find(x => x.type === 'minute').value} (UTC−3)`;
  }
  reloj(); setInterval(reloj, 30000);

  // ---------- Nombre que se "decodifica" al cargar ----------
  (function decodificar() {
    const h1 = $('nombre'), texto = h1.textContent, signos = '!<>-_\\/[]{}=+*^?#01';
    if (reducido) return;
    // cada palabra queda junta (no se corta en medio), y cada letra se anima por separado
    h1.innerHTML = texto.split(' ').map(p => `<span class="palabra">${[...p].map(c => `<span class="l" aria-hidden="true">${c}</span>`).join('')}</span>`).join(' ');
    const letras = [...h1.querySelectorAll('.l')];
    letras.forEach((l, i) => {
      const final = l.textContent, fin = 380 + i * 55;
      const t0 = performance.now();
      (function paso(t) {
        if (t - t0 >= fin) { l.textContent = final; l.classList.remove('cifrada'); return; }
        l.textContent = signos[Math.floor(Math.random() * signos.length)];
        l.classList.add('cifrada');
        setTimeout(() => requestAnimationFrame(paso), 45);
      })(t0);
    });
  })();

  // ---------- Roles que se escriben y borran ----------
  const rotar = {}; (function () {
    const el = $('rotador'), ROLES = { es: ['páginas web', 'automatizaciones', 'soluciones tecnológicas'], en: ['websites', 'automations', 'tech solutions'] };
    let roles = ROLES[idioma], i = 0, j = roles[0].length, borrando = false;
    rotar.cambiar = () => { roles = ROLES[idioma]; i = 0; borrando = false; j = roles[0].length; el.textContent = roles[0]; };
    if (reducido) return;
    setTimeout(function tick() {
      const r = roles[i];
      if (!borrando && j === r.length) { borrando = true; return setTimeout(tick, 1800); }
      if (borrando && j === 0) { borrando = false; i = (i + 1) % roles.length; }
      j += borrando ? -1 : 1;
      el.textContent = roles[i].slice(0, j) || '​';
      setTimeout(tick, borrando ? 35 : 70);
    }, 2400);
  })();

  // ---------- Retrato: la luz sigue al mouse ----------
  const retrato = $('retrato');
  let pad = parseFloat(getComputedStyle(retrato).paddingLeft), lx = 0, ly = 0, pendienteLuz = false;
  const luz = (x, y) => {
    lx = x; ly = y; if (pendienteLuz) return; pendienteLuz = true;
    requestAnimationFrame(() => {
      pendienteLuz = false;
      retrato.style.setProperty('--mx', (lx - pad) + 'px'); retrato.style.setProperty('--my', (ly - pad) + 'px');
      retrato.style.setProperty('--rx', lx + 'px'); retrato.style.setProperty('--ry', ly + 'px');
    });
  };
  retrato.addEventListener('pointermove', e => { const r = retrato.getBoundingClientRect(); luz(e.clientX - r.left, e.clientY - r.top); });

  // Marco de la foto: caracteres sueltos, como los de la foto, en todo el fondo
  function rellenar() {
    const pre = $('relleno'), med = document.createElement('span');
    med.textContent = 'MMMMMMMMMM'; pre.textContent = ''; pre.appendChild(med);
    const ancho = med.getBoundingClientRect().width / 10, alto = parseFloat(getComputedStyle(pre).lineHeight);
    const cols = Math.ceil(retrato.clientWidth / ancho) + 1, filas = Math.ceil(retrato.clientHeight / alto) + 1;
    const juego = '..::-~=+*', cx = cols / 2, cy = filas * .42;
    let semilla = 7; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    let txt = '';
    for (let y = 0; y < filas; y++) {
      for (let x = 0; x < cols; x++) {
        // más denso cerca de la foto, más ralo hacia los bordes
        const d = Math.hypot((x - cx) / cols, (y - cy) / filas);
        txt += azar() < .78 - d * .75 ? juego[Math.floor(azar() * juego.length)] : ' ';
      }
      txt += '\n';
    }
    pre.textContent = txt; $('relleno-luz').textContent = txt;
  }
  rellenar();
  let tRelleno; addEventListener('resize', () => { clearTimeout(tRelleno); tRelleno = setTimeout(() => { pad = parseFloat(getComputedStyle(retrato).paddingLeft); rellenar(); }, 200); });

  // Sin mouse (celular): la luz recorre la cara sola
  if (!matchMedia('(hover: hover)').matches && !reducido) {
    let a = 0;
    let visibleRetrato = true;
    new IntersectionObserver(es => { visibleRetrato = es[0].isIntersecting; }).observe(retrato);
    setInterval(() => { if (!visibleRetrato) return; a += .04; luz(retrato.clientWidth * (.5 + Math.cos(a) * .3), retrato.clientHeight * (.4 + Math.sin(a * 1.3) * .22)); }, 40);
  }

  // ---------- Aparición al hacer scroll ----------
  const obsRevelar = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obsRevelar.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll('[data-revelar]').forEach((el, i) => {
    if (el.parentElement && el.parentElement.classList.contains('stack')) el.style.setProperty('--retraso', (i % 3) * .08 + 's');
    obsRevelar.observe(el);
  });

  // Línea de tiempo que se dibuja según el scroll
  const linea = $('linea-tiempo');
  function avanceLinea() {
    const r = linea.getBoundingClientRect(), vh = innerHeight;
    const av = Math.min(1, Math.max(0, (vh * .7 - r.top) / r.height));
    linea.style.setProperty('--avance', av.toFixed(3));
  }
  addEventListener('scroll', avanceLinea, { passive: true }); avanceLinea();

  // Tarjetas del stack: el borde se ilumina donde está el mouse
  document.querySelectorAll('.tarjeta').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--tx', (e.clientX - r.left) + 'px'); t.style.setProperty('--ty', (e.clientY - r.top) + 'px');
  }));

  // ---------- Proyectos: selector tipo Alt+Tab ----------
  const pista = $('pista'), ventanas = [...pista.querySelectorAll('.win')];
  let actual = 0, bloqueo = 0;

  function detalle(clave) {
    const p = P(clave), d = $('detalle');
    d.innerHTML = `
      <div>
        <span class="tecnologia">${esc(p.tecnologia)}</span>
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.texto)}</p>
        <div class="acciones"><button class="btn principal" type="button" data-demo="${clave}">${T('Abrir la demo', 'Open the demo')}</button></div>
      </div>
      <div>
        <h4>${T('Qué hace', 'What it does')}</h4>
        <ul>${p.puntos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`;
    d.classList.remove('cambio'); void d.offsetWidth; d.classList.add('cambio');
  }

  function seleccionar(i, { centrarScroll = false } = {}) {
    if (i === actual && $('detalle').innerHTML) return;
    actual = (i + ventanas.length) % ventanas.length;
    ventanas.forEach((w, j) => w.setAttribute('aria-selected', j === actual));
    pista.setAttribute('aria-activedescendant', ventanas[actual].id);
    detalle(ventanas[actual].dataset.p);
    if (movil()) { if (centrarScroll) ventanas[actual].scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }); return; }
    // Escritorio: la fila se corre para que la ventana elegida quede hacia el centro, como el Alt+Tab
    const ancho = ventanas[0].offsetWidth, gap = 22, n = ventanas.length;
    const total = ancho * n + gap * (n - 1), centro = actual * (ancho + gap) + ancho / 2;
    // se corre hacia la elegida, pero sin que ninguna ventana se salga del espacio disponible
    const holgura = Math.max(0, (pista.parentElement.clientWidth - total) / 2 - 24);
    const corrimiento = Math.max(-holgura, Math.min(holgura, (total / 2 - centro) * .5));
    pista.style.transform = `translateX(${corrimiento.toFixed(0)}px)`;
    bloqueo = performance.now() + 450;
  }

  ventanas.forEach((w, i) => {
    w.addEventListener('pointerenter', () => { if (!movil() && performance.now() > bloqueo) seleccionar(i); });
    w.addEventListener('click', () => {
      if (movil() && i !== actual) { seleccionar(i, { centrarScroll: true }); return; }   // en celular: primer toque elige, segundo abre
      abrirDemo(w.dataset.p);
    });
  });
  pista.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seleccionar(actual + (e.key === 'ArrowRight' ? 1 : -1), { centrarScroll: true }); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDemo(ventanas[actual].dataset.p); }
  });
  // En celular, la ventana que queda en el centro del carrusel es la elegida
  pista.addEventListener('scroll', () => {
    if (!movil()) return;
    clearTimeout(pista.t);
    pista.t = setTimeout(() => {
      const c = pista.getBoundingClientRect().left + pista.clientWidth / 2;
      let mejor = 0, dist = Infinity;
      ventanas.forEach((w, i) => { const r = w.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - c); if (d < dist) { dist = d; mejor = i; } });
      if (mejor !== actual) seleccionar(mejor);
    }, 120);
  }, { passive: true });

  // Botones de los atajos y teclas cuando la sección de proyectos está a la vista
  $('ant').addEventListener('click', () => seleccionar(actual - 1));
  $('sig').addEventListener('click', () => seleccionar(actual + 1));
  $('entrar').addEventListener('click', () => abrirDemo(ventanas[actual].dataset.p));
  addEventListener('keydown', e => {
    if (!$('demo').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    marcarSeccion(); if (seccionActual !== $('proyectos')) return;
    const t = e.target; if (t.closest && (t.closest('input, textarea, a, button') || t === pista)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seleccionar(actual + (e.key === 'ArrowRight' ? 1 : -1), { centrarScroll: true }); }
    else if (e.key === 'Enter') { e.preventDefault(); abrirDemo(ventanas[actual].dataset.p); }
  });

  $('detalle').innerHTML = ''; seleccionar(0);

  // ---------- Ventana de demos ----------
  let foco = null;
  function abrirDemo(clave, pestana = 0) {
    if (!PROYECTOS[clave]) return false; const d = P(clave);
    foco = document.activeElement;
    $('demo-nombre').textContent = `${T('~/proyectos/', '~/projects/')}${d.archivo}`;
    const tabs = $('demo-pestanas');
    tabs.hidden = d.pestanas.length < 2;
    tabs.innerHTML = d.pestanas.map(([t], i) => `<button role="tab" aria-selected="${i === pestana}" data-i="${i}">${esc(t)}</button>`).join('');
    tabs.onclick = e => { const b = e.target.closest('button'); if (b) irA(d, Number(b.dataset.i)); };
    irA(d, pestana);
    $('velo').hidden = $('demo').hidden = false;
    document.body.style.overflow = 'hidden';
    $('demo-cerrar').focus();
    return true;
  }
  function irA(d, i) {
    $('demo-marco').src = d.pestanas[i][1];
    $('demo-pestana').href = d.pestanas[i][1];
    $('demo-pestanas').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-selected', j === i));
  }
  function cerrarDemo() {
    $('velo').hidden = $('demo').hidden = true;
    $('demo-marco').src = 'about:blank';
    document.body.style.overflow = '';
    if (foco) foco.focus();
  }
  document.addEventListener('click', e => { const b = e.target.closest('button[data-demo]'); if (b) abrirDemo(b.dataset.demo); });
  $('demo-cerrar').addEventListener('click', cerrarDemo);
  $('demo-cerrar-puntos').addEventListener('click', cerrarDemo);
  $('velo').addEventListener('click', cerrarDemo);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('demo').hidden) cerrarDemo(); });

  // ---------- Copiar el mail ----------
  $('copiar').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('fedevillon110@gmail.com'); avisar(T('Mail copiado', 'Email copied')); }
    catch (e) { avisar('fedevillon110@gmail.com'); }
  });

  // ---------- Terminal (momento clave) ----------
  const salida = $('salida'), entrada = $('comando');
  const historial = []; let pos = 0;
  const lineaT = (html, clase = '') => { const p = document.createElement('p'); if (clase) p.className = clase; p.innerHTML = html; salida.append(p); };
  const enlace = (t, u) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const ir = id => { document.getElementById(id).scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' }); };
  const COMANDOS = {
    help: () => [T('whoami · proyectos · abrir &lt;turnero|despensa|bandeja&gt; · stack · cv · contacto · idioma &lt;es|en&gt; · clear',
      'whoami · projects · open &lt;turnero|despensa|bandeja&gt; · stack · cv · contact · lang &lt;es|en&gt; · clear')],
    whoami: () => [T('Federico Villón. Estudiante de Sistemas (UTN). Hago páginas web, automatizaciones y soluciones tecnológicas.',
      'Federico Villón. Information Systems student (UTN, Argentina). I build websites, automations and tech solutions.')],
    proyectos: () => ORDEN.map(k => `${k.padEnd(9)} ${esc(P(k).texto.split(':')[0].split('.')[0])} · <button class="enlace" data-demo="${k}">${T('abrir', 'open')}</button>`),
    abrir: a => abrirDemo((a[0] || '').toLowerCase()) ? [T('abriendo…', 'opening…')] : [T('uso: abrir turnero | despensa | bandeja', 'usage: open turnero | despensa | bandeja')],
    stack: () => { ir('stack'); return [T('te llevo a «Qué hago» ↓', 'taking you to “What I do” ↓')]; },
    cv: () => { const f = T('CV-Federico-Villon.pdf', 'CV-Federico-Villon-EN.pdf'); Object.assign(document.createElement('a'), { href: 'cv/' + f, download: '' }).click(); return [T('descargando ', 'downloading ') + f + '…']; },
    contacto: () => ['mail      ' + enlace('fedevillon110@gmail.com', 'mailto:fedevillon110@gmail.com'),
      'whatsapp  ' + enlace('+54 3447 55-2717', 'https://wa.me/5493447552717?text=Hola%20Federico%2C%20vi%20tu%20portfolio.'),
      'linkedin  ' + enlace('in/fedevillon', 'https://www.linkedin.com/in/fedevillon')],
    idioma: a => {
      const l = (a[0] || '').toLowerCase().replace('us', 'en').replace('english', 'en').replace(/^(español|espanol|spanish)$/, 'es');
      if (l !== 'es' && l !== 'en') return [T('uso: idioma es | idioma en', 'usage: lang es | lang en')];
      ponerIdioma(l); return [T('listo: la página está en español', 'done: the page is now in English')];
    },
    date: () => [new Date().toLocaleString(T('es-AR', 'en-US'), { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' })],
    clear: () => { salida.innerHTML = ''; return []; },
    sudo: a => /^(contratar|hire)/.test(a.join(' ')) ? [T('[sudo] permiso concedido. ', '[sudo] permission granted. ') + enlace(T('Escribime', 'Email me'), 'mailto:fedevillon110@gmail.com') + T(' y lo hablamos.', ' and let’s talk.')] : [T('Este incidente será reportado. (probá: sudo contratar)', 'This incident will be reported. (try: sudo hire)')],
  };
  Object.assign(COMANDOS, { ls: () => COMANDOS.proyectos(), projects: () => COMANDOS.proyectos(), open: a => COMANDOS.abrir(a), contact: () => COMANDOS.contacto(),
    lang: a => COMANDOS.idioma(a), language: a => COMANDOS.idioma(a), english: () => COMANDOS.idioma(['en']), 'español': () => COMANDOS.idioma(['es']), espanol: () => COMANDOS.idioma(['es']) });
  COMANDOS.ayuda = COMANDOS.help;
  function ejecutar(texto) {
    const t = texto.trim(); if (!t) return;
    historial.push(t); pos = historial.length;
    lineaT(`<b>$</b> ${esc(t)}`, 'eco');
    const [c, ...a] = t.split(/\s+/), fn = COMANDOS[c.toLowerCase()];
    if (!fn) lineaT(T(`${esc(c)}: no existe. Escribí <b>help</b>.`, `${esc(c)}: command not found. Type <b>help</b>.`), 'error'); else fn(a).forEach(l => lineaT(l));
    salida.scrollTop = salida.scrollHeight;
  }
  $('linea').addEventListener('submit', e => { e.preventDefault(); ejecutar(entrada.value); entrada.value = ''; });
  entrada.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && pos > 0) { e.preventDefault(); entrada.value = historial[--pos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pos = Math.min(historial.length, pos + 1); entrada.value = historial[pos] || ''; }
    else if (e.key === 'Tab') { const v = entrada.value.trim().toLowerCase(), op = Object.keys(COMANDOS).filter(c => c.startsWith(v)); if (v && op.length === 1) { e.preventDefault(); entrada.value = op[0] + ' '; } }
  });
  $('terminal').addEventListener('click', e => { if (!e.target.closest('a, button')) entrada.focus({ preventScroll: true }); });

  // ---------- Idioma (es / en) ----------
  // Se traduce cada texto de la página buscándolo en este diccionario; el original queda guardado para volver.
  const EN = {
    'Proyectos': 'Projects', 'Qué hago': 'What I do', 'Trayectoria': 'Experience', 'Contacto': 'Contact',
    'Disponible para nuevos proyectos': 'Available for new projects', 'Hago': 'I build',
    'Estudio Ingeniería en Sistemas en la UTN. Armo herramientas para negocios: que vendan más, pierdan menos tiempo y no dependan de cuadernos ni planillas sueltas.':
      'I study Information Systems Engineering at UTN (Argentina). I build tools that help businesses sell more, waste less time and stop relying on notebooks and scattered spreadsheets.',
    'Ver proyectos': 'See projects', 'Contactarme': 'Contact me', 'Base': 'Based in', 'Hora': 'Local time', 'Idiomas': 'Languages',
    'Español · inglés técnico escrito': 'Spanish · written technical English', 'probá': 'try',
    'Pensados para negocios reales, con demo para probar.': 'Built for real businesses, each with a demo you can try.',
    'cambiar': 'switch', 'abrir demo': 'open demo', 'deslizá para cambiar': 'swipe to switch', 'tocá para abrir': 'tap to open',
    '~/servicios': '~/services', 'ls -l ~/servicios': 'ls -l ~/services', '~/trayectoria': '~/experience',
    'desarrollo-web/': 'web-development/', 'automatizaciones/': 'automation/', 'soporte-tecnico/': 'tech-support/',
    'sistemas-y-redes/': 'systems-and-networks/', 'bases-de-datos/': 'databases/', 'edicion-de-video/': 'video-editing/',
    'Sitios y sistemas web a medida: desde la página de un negocio hasta paneles de gestión con usuarios, datos y reportes.':
      'Custom websites and web systems: from a small business site to management dashboards with users, data and reports.',
    'Procesos que se hacen solos: leer documentos, ordenar información, hacer el seguimiento de clientes y armar reportes, con controles para que el resultado sea confiable.':
      'Processes that run on their own: reading documents, organizing information, following up with clients and building reports, with checks so the results can be trusted.',
    'Diagnóstico y solución de problemas de PCs, notebooks y software, y atención a usuarios con explicaciones claras.':
      'Diagnosing and fixing problems with PCs, laptops and software, and helping users with clear explanations.',
    'Instalación y configuración de equipos y redes, y administración de un servidor Linux: usuarios, permisos y acceso remoto.':
      'Setting up computers and networks, and managing a Linux server: users, permissions and remote access.',
    'Tablas, consultas y reportes para que un negocio sepa qué vende, cuánto gana y qué le falta.':
      'Tables, queries and reports so a business knows what it sells, what it earns and what it is missing.',
    'Videos para redes y puntos de venta, a pedido de cada cliente.': 'Videos for social media and in-store screens, made to order for each client.',
    'agentes de ia · scripts · integraciones': 'ai agents · scripts · integrations', 'edición · contenido para redes': 'editing · social media content',
    'HEAD → hoy': 'HEAD → today', '2026 – hoy': '2026 – present', '2024 – hoy': '2024 – present',
    'Desarrollador web y automatización': 'Web & automation developer', 'freelance · remoto': 'freelance · remote',
    'Sitios y paneles de gestión para negocios, y automatización de la búsqueda y el seguimiento de clientes. Atiendo y doy soporte a cada cliente.':
      'Websites and management dashboards for businesses, plus automated client prospecting and follow-up. I support each client directly.',
    'Ingeniería en Sistemas de Información': 'Information Systems Engineering',
    'Primer año aprobado completo: programación en Python, algoritmos, arquitectura de computadoras y bases de datos.':
      'First year fully passed: Python programming, algorithms, computer architecture and databases.',
    'Desarrollo con Inteligencia Artificial': 'AI-assisted development',
    'Agentes de IA, automatización de procesos y desarrollo asistido por IA.': 'AI agents, process automation and AI-assisted development.',
    'Editor de video': 'Video editor',
    'Videos para redes y puntos de venta de comercios. Trato directo con clientes y entregas con fecha.':
      'Videos for social media and in-store screens for local shops. Direct contact with clients and on-time delivery.',
    'Escribime': 'Get in touch', 'Para un proyecto, una consulta o una propuesta de trabajo. Respondo en el día.': 'For a project, a question or a job offer. I reply the same day.',
    'copiar': 'copy', 'Hecho en Concepción del Uruguay · 2026': 'Made in Concepción del Uruguay · 2026',
    '$ echo "gracias por pasar"': '$ echo "thanks for stopping by"', 'abrir en pestaña nueva ↗': 'open in new tab ↗', 'Cerrar': 'Close',
    // atributos
    'escribí un comando: help, proyectos, contacto…': 'type a command: help, projects, contact…', 'Copiar el mail': 'Copy email',
    'Descargar CV': 'Download CV', 'Cerrar demo': 'Close demo', 'Foto de Federico Villón': 'Photo of Federico Villón',
    'Proyecto anterior': 'Previous project', 'Proyecto siguiente': 'Next project', 'Abrir la demo elegida': 'Open the selected demo',
    'Vista previa de Turnero': 'Turnero preview', 'Vista previa de Despensa': 'Despensa preview', 'Vista previa de Bandeja': 'Bandeja preview',
    'Secciones': 'Sections', 'Presentación': 'Introduction', 'Terminal interactiva': 'Interactive terminal',
  };
  const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt'];
  const originales = new Map();   // nodo o "nodo|atributo" → texto en español
  const saltar = el => el.closest('script, style, pre, #salida, #nombre, #rotador, #detalle, #ruta, #reloj, .win-nombre');
  function traducir() {
    const camina = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = camina.nextNode());) {
      if (!n.nodeValue.trim() || saltar(n.parentElement)) continue;
      if (!originales.has(n)) originales.set(n, n.nodeValue);
      const es = originales.get(n), clave = es.trim();
      n.nodeValue = idioma === 'en' && EN[clave] ? es.replace(clave, EN[clave]) : es;
    }
    document.querySelectorAll(ATRIBUTOS.map(a => `[${a}]`).join(',')).forEach(el => ATRIBUTOS.forEach(a => {
      if (!el.hasAttribute(a)) return;
      if (!originales.has(el)) originales.set(el, {});
      const o = originales.get(el); if (!(a in o)) o[a] = el.getAttribute(a);
      el.setAttribute(a, idioma === 'en' && EN[o[a]] ? EN[o[a]] : o[a]);
    }));
  }
  const META = { es: [document.title, document.querySelector('meta[name=description]').content],
    en: ['Federico Villón · Websites and automation', 'Information Systems student (UTN, Argentina). Websites, automations and tech solutions for businesses. Projects with live demos.'] };
  function ponerIdioma(l) {
    idioma = l;
    try { localStorage.setItem('idioma', l); } catch (e) {}
    document.documentElement.lang = l;
    [document.title, document.querySelector('meta[name=description]').content] = META[l];
    $('idioma').dataset.activo = l;
    document.querySelectorAll('a[href^="cv/CV-Federico-Villon"]').forEach(a => { a.href = l === 'en' ? 'cv/CV-Federico-Villon-EN.pdf' : 'cv/CV-Federico-Villon.pdf'; });
    traducir();
    if (rotar.cambiar) rotar.cambiar();
    seccionActual = null; marcarSeccion();
    const sel = ventanas[actual]; $('detalle').innerHTML = ''; detalle(sel.dataset.p);
  }
  $('idioma').addEventListener('click', () => ponerIdioma(idioma === 'es' ? 'en' : 'es'));
  if (idioma === 'en') ponerIdioma('en'); else $('idioma').dataset.activo = 'es';
})();
