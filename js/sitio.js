/* Portfolio · animaciones, selector de proyectos tipo Alt+Tab, terminal y ventana de demos */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = () => matchMedia('(max-width: 900px)').matches;

  function avisar(texto) {
    const a = $('aviso'); a.textContent = texto; a.classList.add('visible');
    clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('visible'), 2400);
  }

  // ---------- Datos de los proyectos ----------
  const PROYECTOS = {
    despensa: {
      nombre: 'Despensa', lenguaje: 'Python · Flask · SQLite', repo: 'https://github.com/fede-villon/despensa', archivo: 'despensa.py',
      texto: 'Stock, caja y reportes para almacenes de barrio: alertas de faltantes y vencimientos, compras a proveedores, roles de dueño y cajero, y exportación a Excel.',
      parte: 'el análisis del negocio, el modelo de datos, las reglas de stock y la guía de soporte para cuando algo falla.',
      metricas: [[32, '', 'tests automáticos'], [10, '', 'pantallas en la demo']], chips: ['Python', 'Flask', 'SQL', 'pytest'],
      pestanas: [['inicio', 'demos/despensa/index.html'], ['caja', 'demos/despensa/caja.html'], ['productos', 'demos/despensa/productos.html'], ['reportes', 'demos/despensa/reportes.html']],
    },
    bandeja: {
      nombre: 'Bandeja', lenguaje: 'Python · IA local (Ollama)', repo: 'https://github.com/fede-villon/bandeja', archivo: 'bandeja.py',
      texto: 'Lee facturas y remitos de proveedores con un modelo de IA gratuito que corre en la PC, y avisa lo que no cierra: totales mal sumados, duplicados, aumentos de precio y proveedores desconocidos.',
      parte: 'los controles y la evaluación del modelo: lo medí y pasé de 89 % a 100 % de campos correctos. La IA lee, el código verifica.',
      metricas: [[100, ' %', 'campos leídos bien'], [32, '', 'tests automáticos']], chips: ['Python', 'Ollama', 'SQLite', 'Excel'],
      pestanas: [['panel de revisión', 'demos/bandeja/index.html'], ['resumen semanal', 'demos/bandeja/resumen.txt']],
    },
    turnero: {
      nombre: 'Turnero', lenguaje: 'HTML · CSS · JavaScript', repo: 'https://github.com/fede-villon/turnero', archivo: 'turnero.html',
      texto: 'Turnos online para barberías: la web donde el cliente reserva desde el celular y el panel del local con agenda, cobro, recordatorios por WhatsApp y números del negocio.',
      parte: 'el flujo de reserva pensado para el celular, el diseño y la lógica de horarios libres. Es una demo: los datos viven en el navegador.',
      metricas: [[15, '', 'tests de la agenda'], [2, '', 'apps: cliente y local']], chips: ['JavaScript', 'UX', 'responsive', 'WhatsApp'],
      pestanas: [['web del cliente', 'demos/turnero/index.html'], ['panel del local', 'demos/turnero/panel.html']],
    },
    campus: {
      nombre: 'Campus Backend Developer', lenguaje: 'PWA · JavaScript · Pyodide', repo: 'https://github.com/fede-villon/CampusBackendDeveloper', archivo: 'campus.pwa',
      texto: 'Una app para aprender backend jugando: misiones, niveles y ejercicios de Python que corren en el navegador. La armé para estudiar yo.',
      parte: 'la idea, el recorrido de niveles y los contenidos.',
      metricas: [[11, '', 'niveles'], [0, '', 'instalaciones necesarias']], chips: ['PWA', 'Pyodide', 'offline'],
      pestanas: [['app', 'https://fede-villon.github.io/CampusBackendDeveloper/']],
    },
  };
  const ORDEN = Object.keys(PROYECTOS);

  // ---------- Fondo y barra ----------
  addEventListener('pointermove', e => {
    document.documentElement.style.setProperty('--gx', e.clientX + 'px');
    document.documentElement.style.setProperty('--gy', e.clientY + 'px');
  }, { passive: true });
  const barra = $('barra');
  addEventListener('scroll', () => barra.classList.toggle('fija', scrollY > 30), { passive: true });

  // Sección activa en la barra
  const enlaces = [...document.querySelectorAll('.barra nav a[href^="#"]')];
  const obsSeccion = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) enlaces.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  enlaces.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) obsSeccion.observe(s); });

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
  (function rotar() {
    const el = $('rotador'), roles = ['soporte IT', 'análisis de datos', 'automatización con IA', 'páginas web'];
    if (reducido) return;
    let i = 0, j = roles[0].length, borrando = false;
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
  retrato.addEventListener('pointermove', e => {
    const r = retrato.getBoundingClientRect();
    retrato.style.setProperty('--mx', (e.clientX - r.left - 26) + 'px');
    retrato.style.setProperty('--my', (e.clientY - r.top - 26) + 'px');
  });
  // Sin mouse (celular): la luz recorre la cara sola
  if (!matchMedia('(hover: hover)').matches && !reducido) {
    let a = 0;
    setInterval(() => { a += .04; retrato.style.setProperty('--mx', (50 + Math.cos(a) * 30) + '%'); retrato.style.setProperty('--my', (40 + Math.sin(a * 1.3) * 22) + '%'); }, 40);
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

  function contar(el) {
    const fin = Number(el.dataset.n), suf = el.dataset.suf || '';
    if (reducido || fin === 0) { el.textContent = fin + suf; return; }
    const t0 = performance.now(), dur = 900;
    (function paso(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(fin * e) + suf;
      if (p < 1) requestAnimationFrame(paso);
    })(t0);
  }

  function detalle(clave) {
    const p = PROYECTOS[clave], d = $('detalle');
    d.innerHTML = `
      <div>
        <span class="lenguaje">${esc(p.lenguaje)}</span>
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.texto)}</p>
        <p class="honesto"><strong>Mi parte:</strong> ${esc(p.parte)}</p>
        <div class="acciones"><button class="btn principal" type="button" data-demo="${clave}">Abrir la demo</button>
          <a class="btn" href="${p.repo}" target="_blank" rel="noopener">Ver el código</a></div>
      </div>
      <div>
        <div class="metricas">${p.metricas.map(([n, suf, t]) => `<div class="metrica"><strong data-n="${n}" data-suf="${suf}">0${suf}</strong><span>${esc(t)}</span></div>`).join('')}</div>
        <ul class="chips">${p.chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>`;
    d.classList.remove('cambio'); void d.offsetWidth; d.classList.add('cambio');
    d.querySelectorAll('[data-n]').forEach(contar);
  }

  function seleccionar(i, { centrarScroll = false } = {}) {
    if (i === actual && $('detalle').innerHTML) return;
    actual = (i + ventanas.length) % ventanas.length;
    ventanas.forEach((w, j) => w.setAttribute('aria-selected', j === actual));
    pista.setAttribute('aria-activedescendant', ventanas[actual].id);
    detalle(ventanas[actual].dataset.p);
    if (movil()) { if (centrarScroll) ventanas[actual].scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }); return; }
    // Escritorio: la fila se corre para que la ventana elegida quede hacia el centro, como el Alt+Tab
    const anchoIn = 240, anchoAct = 330, gap = 22, n = ventanas.length;
    const total = anchoIn * (n - 1) + anchoAct + gap * (n - 1);
    const centro = actual * (anchoIn + gap) + anchoAct / 2;
    pista.style.transform = `translateX(${((total / 2 - centro) * .45).toFixed(0)}px)`;
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

  // Vistas previas en vivo: se cargan cuando la sección se acerca y se escalan al tamaño de la ventana
  const escalar = new ResizeObserver(es => es.forEach(e => {
    const f = e.target.querySelector('iframe'); if (f) f.style.transform = `scale(${e.contentRect.width / 1280})`;
  }));
  ventanas.forEach(w => escalar.observe(w.querySelector('.win-vista')));
  new IntersectionObserver((es, obs) => {
    if (es.some(e => e.isIntersecting)) { ventanas.forEach(w => { const f = w.querySelector('iframe'); f.src = f.dataset.src; }); obs.disconnect(); }
  }, { rootMargin: '400px' }).observe(pista);

  $('detalle').innerHTML = ''; seleccionar(0);

  // ---------- Ventana de demos ----------
  let foco = null;
  function abrirDemo(clave, pestana = 0) {
    const d = PROYECTOS[clave]; if (!d) return false;
    foco = document.activeElement;
    $('demo-nombre').textContent = `~/proyectos/${d.archivo}`;
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
    try { await navigator.clipboard.writeText('fedevillon110@gmail.com'); avisar('Mail copiado'); }
    catch (e) { avisar('fedevillon110@gmail.com'); }
  });

  // ---------- Terminal (momento clave) ----------
  const salida = $('salida'), entrada = $('comando');
  const historial = []; let pos = 0;
  const lineaT = (html, clase = '') => { const p = document.createElement('p'); if (clase) p.className = clase; p.innerHTML = html; salida.append(p); };
  const enlace = (t, u) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const ir = id => { document.getElementById(id).scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' }); };
  const COMANDOS = {
    help: () => ['whoami · proyectos · abrir &lt;despensa|bandeja|turnero|campus&gt; · stack · cv · contacto · clear'],
    whoami: () => ['Federico Villón. Estudiante de Sistemas (UTN). Busco remoto part-time en soporte IT, datos o automatización.'],
    proyectos: () => ORDEN.map(k => `${k.padEnd(9)} ${esc(PROYECTOS[k].texto.split(':')[0].split('.')[0])} · <button class="enlace" data-demo="${k}">abrir</button>`),
    ls: () => COMANDOS.proyectos(),
    abrir: a => abrirDemo((a[0] || '').toLowerCase()) ? ['abriendo…'] : ['uso: abrir despensa | bandeja | turnero | campus'],
    stack: () => { ir('stack'); return ['te llevo al stack ↓']; },
    cv: () => { Object.assign(document.createElement('a'), { href: 'cv/CV-Federico-Villon.pdf', download: '' }).click(); return ['descargando CV-Federico-Villon.pdf…']; },
    contacto: () => ['mail      ' + enlace('fedevillon110@gmail.com', 'mailto:fedevillon110@gmail.com'),
      'whatsapp  ' + enlace('+54 3447 55-2717', 'https://wa.me/5493447552717?text=Hola%20Federico%2C%20vi%20tu%20portfolio.'),
      'linkedin  ' + enlace('in/fedevillon', 'https://www.linkedin.com/in/fedevillon')],
    date: () => [new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' })],
    clear: () => { salida.innerHTML = ''; return []; },
    sudo: a => a.join(' ').startsWith('contratar') ? ['[sudo] permiso concedido. ' + enlace('Escribime', 'mailto:fedevillon110@gmail.com') + ' y lo hablamos.'] : ['Este incidente será reportado. (probá: sudo contratar)'],
  };
  COMANDOS.ayuda = COMANDOS.help;
  function ejecutar(texto) {
    const t = texto.trim(); if (!t) return;
    historial.push(t); pos = historial.length;
    lineaT(`<b>$</b> ${esc(t)}`, 'eco');
    const [c, ...a] = t.split(/\s+/), fn = COMANDOS[c.toLowerCase()];
    if (!fn) lineaT(`${esc(c)}: no existe. Escribí <b>help</b>.`, 'error'); else fn(a).forEach(l => lineaT(l));
    salida.scrollTop = salida.scrollHeight;
  }
  $('linea').addEventListener('submit', e => { e.preventDefault(); ejecutar(entrada.value); entrada.value = ''; });
  entrada.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && pos > 0) { e.preventDefault(); entrada.value = historial[--pos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pos = Math.min(historial.length, pos + 1); entrada.value = historial[pos] || ''; }
    else if (e.key === 'Tab') { const v = entrada.value.trim().toLowerCase(), op = Object.keys(COMANDOS).filter(c => c.startsWith(v)); if (v && op.length === 1) { e.preventDefault(); entrada.value = op[0] + ' '; } }
  });
  $('terminal').addEventListener('click', e => { if (!e.target.closest('a, button')) entrada.focus({ preventScroll: true }); });
})();
