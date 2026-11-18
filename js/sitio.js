/* Portfolio · reloj en vivo, terminal interactiva y ventana de demos */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Reloj y disponibilidad (hora de Argentina) ----------
  function reloj() {
    const ahora = new Date();
    const partes = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(ahora);
    const v = t => partes.find(p => p.type === t)?.value;
    const hora = Number(v('hour')), dia = v('weekday');
    $('reloj').textContent = `${v('hour')}:${v('minute')} en Argentina`;
    const habil = !/sáb|dom/.test(dia), manana = hora >= 8 && hora < 13;
    const est = $('estado');
    est.textContent = habil && manana ? 'disponible para hablar' : 'respondo en el día';
    est.classList.toggle('fuera', !(habil && manana));
  }
  reloj(); setInterval(reloj, 30000);

  // ---------- Demos ----------
  const DEMOS = {
    despensa: { archivo: 'despensa.py', pestanas: [['inicio', 'demos/despensa/index.html'], ['caja', 'demos/despensa/caja.html'], ['productos', 'demos/despensa/productos.html'], ['reportes', 'demos/despensa/reportes.html']] },
    bandeja: { archivo: 'bandeja.py — panel de revisión', pestanas: [['panel', 'demos/bandeja/index.html'], ['resumen semanal', 'demos/bandeja/resumen.txt']] },
    turnero: { archivo: 'turnero.html', pestanas: [['web del cliente', 'demos/turnero/index.html'], ['panel del local', 'demos/turnero/panel.html']] },
    campus: { archivo: 'campus.pwa', pestanas: [['app', 'https://fede-villon.github.io/CampusBackendDeveloper/']] },
  };
  let foco = null;
  function abrirDemo(nombre, pestana = 0) {
    const d = DEMOS[nombre]; if (!d) return false;
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
  document.addEventListener('click', e => { const b = e.target.closest('[data-demo]'); if (b) abrirDemo(b.dataset.demo); });
  $('demo-cerrar').addEventListener('click', cerrarDemo);
  $('demo-cerrar-puntos').addEventListener('click', cerrarDemo);
  $('velo').addEventListener('click', cerrarDemo);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('demo').hidden) cerrarDemo(); });

  // ---------- Terminal ----------
  const salida = $('salida'), entrada = $('comando');
  const historial = []; let pos = 0;
  const linea = (html, clase = '') => { const p = document.createElement('p'); if (clase) p.className = clase; p.innerHTML = html; salida.append(p); };
  const enlace = (texto, url) => `<a href="${url}" target="_blank" rel="noopener">${esc(texto)}</a>`;

  const COMANDOS = {
    help: () => [
      'Comandos disponibles:',
      '  whoami        quién soy, en dos líneas',
      '  proyectos     lo que hice, con demo',
      '  abrir &lt;nombre&gt; abre una demo (despensa, bandeja, turnero, campus)',
      '  stack         con qué trabajo',
      '  cv            descargar el CV en PDF',
      '  contacto      cómo escribirme',
      '  date          la hora acá',
      '  clear         limpiar la pantalla',
    ],
    whoami: () => ['Federico Villón. Estudio Ingeniería en Sistemas en la UTN y busco trabajo remoto part-time',
      'en soporte IT, datos o automatización. Me gusta entender cómo trabaja un negocio y armarle herramientas.'],
    proyectos: () => [
      'despensa/   stock, caja y reportes para almacenes            · <button class="enlace" data-demo="despensa">abrir demo</button>',
      'bandeja/    facturas leídas con IA local y verificadas         · <button class="enlace" data-demo="bandeja">abrir demo</button>',
      'turnero/    turnos online para barberías                       · <button class="enlace" data-demo="turnero">abrir demo</button>',
      'campus/     app para aprender backend jugando                  · <button class="enlace" data-demo="campus">abrir demo</button>',
    ],
    ls: () => COMANDOS.proyectos(),
    stack: () => ['soporte: PCs, Windows, redes, SSH · sistemas: Linux (Debian)', 'datos: SQL, Excel · desarrollo: Python, Flask, JavaScript · ia: agentes, Ollama'],
    cv: () => { const a = Object.assign(document.createElement('a'), { href: 'cv/CV-Federico-Villon.pdf', download: '' }); a.click(); return ['Descargando CV-Federico-Villon.pdf…']; },
    contacto: () => [
      'mail      ' + enlace('fedevillon110@gmail.com', 'mailto:fedevillon110@gmail.com'),
      'whatsapp  ' + enlace('+54 3447 55-2717', 'https://wa.me/5493447552717?text=Hola%20Federico%2C%20vi%20tu%20portfolio.'),
      'linkedin  ' + enlace('in/fedevillon', 'https://www.linkedin.com/in/fedevillon'),
      'github    ' + enlace('fede-villon', 'https://github.com/fede-villon'),
    ],
    date: () => [new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'full', timeStyle: 'short' })],
    clear: () => { salida.innerHTML = ''; return []; },
    sudo: args => args.join(' ').startsWith('contratar')
      ? ['[sudo] permiso concedido.', 'Me alegra. Escribime a ' + enlace('fedevillon110@gmail.com', 'mailto:fedevillon110@gmail.com') + ' y lo hablamos.']
      : ['Este incidente será reportado. (Probá: sudo contratar)'],
    abrir: args => {
      const n = (args[0] || '').replace(/\/$/, '').toLowerCase();
      return abrirDemo(n) ? [`Abriendo ${n}…`] : ['Uso: abrir despensa | bandeja | turnero | campus'];
    },
    cat: args => (args[0] || '').includes('contacto') ? COMANDOS.contacto() : ['cat: probá "cat contacto"'],
    exit: () => ['No hay salida: seguí bajando para ver los proyectos.'],
  };
  COMANDOS.ayuda = COMANDOS.help;

  function ejecutar(texto) {
    const limpio = texto.trim();
    if (!limpio) return;
    historial.push(limpio); pos = historial.length;
    linea(`<b>fede@portfolio:~$</b> ${esc(limpio)}`, 'eco');
    const [cmd, ...args] = limpio.split(/\s+/);
    const fn = COMANDOS[cmd.toLowerCase()];
    if (!fn) { linea(`${esc(cmd)}: comando no encontrado. Escribí <b>help</b> para ver la lista.`, 'error'); }
    else fn(args).forEach(l => linea(l));
    salida.scrollTop = salida.scrollHeight;
  }

  $('linea').addEventListener('submit', e => { e.preventDefault(); ejecutar(entrada.value); entrada.value = ''; });
  entrada.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && pos > 0) { e.preventDefault(); entrada.value = historial[--pos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pos = Math.min(historial.length, pos + 1); entrada.value = historial[pos] || ''; }
    else if (e.key === 'Tab') {
      const v = entrada.value.trim().toLowerCase();
      const op = Object.keys(COMANDOS).filter(c => c.startsWith(v));
      if (v && op.length === 1) { e.preventDefault(); entrada.value = op[0] + ' '; }
    }
  });
  $('terminal').addEventListener('click', e => { if (!e.target.closest('a, button')) entrada.focus({ preventScroll: true }); });

  // Una sola animación al cargar: se escribe "help" solo, para mostrar que la terminal funciona
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido) ejecutar('help');
  else {
    const demo = 'help'; let i = 0;
    setTimeout(function tipear() {
      if (document.activeElement === entrada) return;   // si el visitante ya escribe, no lo pisamos
      entrada.value = demo.slice(0, ++i);
      if (i < demo.length) setTimeout(tipear, 120);
      else setTimeout(() => { ejecutar(demo); entrada.value = ''; }, 350);
    }, 1600);
  }
})();
