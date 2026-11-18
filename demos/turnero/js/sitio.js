/* Turnero · sitio público: cartel abierto/cerrado, pizarra, reserva con ticket en vivo */
(function () {
  const A = window.Agenda, D = window.Datos;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ahora = () => new Date();
  const CLAVE_YO = 'turnero-yo';
  let estado = D.cargar(ahora());
  const sel = { servicioId: 'corte', barberoId: 'cualquiera', fecha: null, hora: null };
  let ultimo = null;

  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const hoyISO = () => A.fechaISO(ahora());
  const cuando = f => f === hoyISO() ? 'hoy' : f === A.sumarDias(hoyISO(), 1) ? 'mañana' : A.fechaLarga(f);
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  const leerYo = () => { try { return JSON.parse(localStorage.getItem(CLAVE_YO) || 'null'); } catch (e) { return null; } };
  const guardarYo = v => { try { v ? localStorage.setItem(CLAVE_YO, JSON.stringify(v)) : localStorage.removeItem(CLAVE_YO); } catch (e) {} };
  const movil = () => matchMedia('(max-width: 860px)').matches;

  function toast(texto) {
    const t = $('toast'); t.textContent = texto; t.classList.add('visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('visible'), 3200);
  }

  // Cartel de neón: abierto o cerrado según el horario real del local
  function cartel() {
    const n = ahora(), min = n.getHours() * 60 + n.getMinutes();
    const franjasHoy = (estado.negocio.horarios[n.getDay()] || []).map(([i, f]) => [A.aMin(i), A.aMin(f)]);
    const abierta = franjasHoy.find(([i, f]) => min >= i && min < f);
    let detalle;
    if (abierta) detalle = `hasta las ${A.aHora(abierta[1])}`;
    else {
      const luego = franjasHoy.find(([i]) => i > min);
      if (luego) detalle = `abrimos hoy a las ${A.aHora(luego[0])}`;
      else {
        for (let i = 1; i <= 7; i++) {
          const f = A.sumarDias(hoyISO(), i), fr = estado.negocio.horarios[A.diaSemana(f)];
          if (fr && fr.length) { detalle = `abrimos ${i === 1 ? 'mañana' : DIAS_LARGOS[A.diaSemana(f)].toLowerCase()} a las ${fr[0][0]}`; break; }
        }
      }
    }
    $('neon').classList.toggle('cerrado', !abierta);
    $('neon-texto').textContent = abierta ? 'Abierto' : 'Cerrado';
    $('neon-detalle').textContent = detalle || '';
  }

  function pizarra() {
    $('pizarra-lista').innerHTML = estado.servicios.map(s =>
      `<li><span>${esc(s.nombre)} <span class="min">${s.duracion}′</span></span><span class="relleno"></span><span>${A.pesos(s.precio)}</span></li>`).join('');
    const p = A.proximoLibre(estado, 'corte', ahora());
    const texto = p ? `${cuando(p.fecha)} ${p.hora} con ${A.barbero(estado, p.barberoId).nombre}` : '';
    $('pizarra-libre').innerHTML = p
      ? `<span>Próximo turno libre: ${esc(texto)}</span><a href="#reservar" data-rapido="${p.fecha}|${p.hora}">Reservarlo</a>`
      : '<span>Sin lugares en las próximas dos semanas</span>';
    pizarra.libre = p ? 'Próximo libre: ' + texto : '';
    barraMovil();
  }

  function opciones() {
    $('op-servicios').innerHTML = estado.servicios.map(s => `
      <label class="opcion"><input type="radio" name="servicio" value="${s.id}" ${s.id === sel.servicioId ? 'checked' : ''}>
      <span><strong>${esc(s.nombre)}</strong><small>${s.duracion} min · ${A.pesos(s.precio)}</small></span></label>`).join('');
    const barberos = [{ id: 'cualquiera', nombre: 'Quien esté libre', detalle: 'Te damos el horario más cercano' }, ...estado.barberos];
    $('op-barberos').innerHTML = barberos.map(b => `
      <label class="opcion"><input type="radio" name="barbero" value="${b.id}" ${b.id === sel.barberoId ? 'checked' : ''}>
      <span><strong>${esc(b.nombre)}</strong><small>${esc(b.detalle)}</small></span></label>`).join('');
  }

  function dias() {
    const hoy = hoyISO();
    let html = '';
    for (let i = 0; i < 14; i++) {
      const f = A.sumarDias(hoy, i);
      const libres = A.horariosLibres(estado, f, sel.servicioId, sel.barberoId, ahora()).length;
      const d = A.deISO(f);
      const cupo = !libres ? 'cerrado' : libres <= 4 ? `${libres} libres` : 'disponible';
      html += `<button type="button" class="dia" role="radio" aria-checked="${f === sel.fecha}" data-fecha="${f}" ${libres ? '' : 'disabled'}
        aria-label="${DIAS_LARGOS[d.getDay()]} ${d.getDate()}, ${libres ? libres + ' horarios libres' : 'sin lugar'}">
        <small>${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIAS_CORTOS[d.getDay()]}</small><strong>${d.getDate()}</strong>
        <span class="cupo ${libres && libres <= 4 ? 'pocos' : ''}">${libres ? cupo : 'sin lugar'}</span></button>`;
    }
    $('op-dias').innerHTML = html;
  }

  function horas() {
    const cont = $('op-horas');
    if (!sel.fecha) { cont.innerHTML = '<p class="vacio">Elegí un día para ver los horarios.</p>'; return; }
    const libres = A.horariosLibres(estado, sel.fecha, sel.servicioId, sel.barberoId, ahora());
    if (!libres.length) { cont.innerHTML = '<p class="vacio">Ese día ya no quedan lugares. Probá con otro.</p>'; return; }
    const manana = libres.filter(l => A.aMin(l.hora) < 14 * 60), tarde = libres.filter(l => A.aMin(l.hora) >= 14 * 60);
    let i = 0;
    const boton = l => `<button type="button" class="hora" data-hora="${l.hora}" aria-pressed="${l.hora === sel.hora}" style="animation-delay:${Math.min(i++, 20) * 18}ms">${l.hora}</button>`;
    cont.innerHTML = (manana.length ? '<p class="franja-titulo">Mañana</p>' + manana.map(boton).join('') : '')
      + (tarde.length ? '<p class="franja-titulo">Tarde</p>' + tarde.map(boton).join('') : '');
  }

  function elegido() {
    if (!sel.fecha || !sel.hora) return null;
    return A.horariosLibres(estado, sel.fecha, sel.servicioId, sel.barberoId, ahora()).find(l => l.hora === sel.hora) || null;
  }

  function ticket() {
    if (ultimo) return;
    const s = A.servicio(estado, sel.servicioId), l = elegido();
    const f = $('form-reserva');
    const nombre = f.nombre.value.trim();
    const fila = (t, v) => `<dt>${t}</dt><dd class="${v ? '' : 'falta'}">${v ? esc(v) : 'a elegir'}</dd>`;
    $('ticket-datos').innerHTML = fila('Servicio', s.nombre) +
      fila('Barbero', l ? A.barbero(estado, l.barberoId).nombre : sel.barberoId !== 'cualquiera' ? A.barbero(estado, sel.barberoId).nombre : '') +
      fila('Día', sel.fecha ? capital(A.fechaLarga(sel.fecha)) : '') + fila('Hora', l ? l.hora : '') + fila('A nombre de', nombre);
    $('ticket-precio').textContent = A.pesos(s.precio);
    $('btn-reservar').disabled = !l;
    $('btn-reservar').textContent = l ? (nombre ? 'Confirmar turno' : 'Completá tus datos') : 'Elegí día y horario';
    document.querySelectorAll('.paso').forEach(p => {
      const listo = { servicio: true, barbero: true, horario: !!l, datos: nombre.length > 1 && f.telefono.value.replace(/\D/g, '').length >= 10 }[p.dataset.paso];
      p.classList.toggle('listo', listo);
    });
  }

  // Barra fija del celular: invita a reservar y, con un horario elegido, muestra el total y confirma
  function barraMovil() {
    const l = elegido(), s = A.servicio(estado, sel.servicioId);
    const listo = l && !ultimo;
    $('bm-titulo').textContent = listo ? `${s.nombre} · ${A.pesos(s.precio)}` : 'Reservá tu turno';
    $('barra-movil-libre').textContent = listo ? `${capital(cuando(sel.fecha))} ${l.hora} con ${A.barbero(estado, l.barberoId).nombre}` : (pizarra.libre || '');
    $('bm-accion').textContent = listo ? 'Confirmar' : 'Reservar';
    $('bm-accion').dataset.modo = listo ? 'confirmar' : 'ir';
    actualizarBarra();
  }
  let enPortada = true;
  function actualizarBarra() {
    const modo = $('bm-accion').dataset.modo;
    $('barra-movil').classList.toggle('visible', !ultimo && (modo === 'confirmar' || !enPortada));
  }

  function todo() { dias(); horas(); ticket(); barraMovil(); }

  function saludo() {
    const yo = leerYo();
    if (!yo) return;
    const f = $('form-reserva');
    f.nombre.value = yo.nombre; f.telefono.value = yo.telefonoTexto || '';
    $('saludo').textContent = `Hola de nuevo, ${yo.nombre.split(' ')[0]}. Tus datos ya están cargados.`;
    const s = A.servicio(estado, yo.servicioId), b = A.barbero(estado, yo.barberoId);
    if (s) {
      $('atajo').hidden = false;
      $('atajo').innerHTML = `<span>Lo de siempre: <strong>${esc(s.nombre)}${b ? ' con ' + esc(b.nombre) : ''}</strong></span>
        <button type="button" class="btn chico" id="btn-siempre">Usar</button>`;
    }
  }

  function local() {
    const n = estado.negocio;
    $('direccion').textContent = n.direccion;
    $('wa-consulta').href = A.linkWhatsApp(n.whatsapp, 'Hola! Quería hacer una consulta.');
    const hoy = A.diaSemana(hoyISO());
    $('horarios').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const fr = n.horarios[d] || [];
      return `<tr class="${d === hoy ? 'hoy' : ''}"><th scope="row">${DIAS_LARGOS[d]}</th><td>${fr.length ? fr.map(([a, b]) => `${a} a ${b}`).join(' y ') : 'Cerrado'}</td></tr>`;
    }).join('');
    $('equipo-lista').innerHTML = estado.barberos.map(b => {
      const d = b.dias.map(x => DIAS_CORTOS[x].toLowerCase());
      return `<div class="barbero"><div class="inicial" aria-hidden="true">${esc(b.nombre[0])}</div>
        <div><h3>${esc(b.nombre)}</h3><p>${esc(b.detalle)}</p><p>Atiende ${d.slice(0, -1).join(', ')} y ${d.at(-1)}</p>
        <button type="button" class="btn chico" data-con="${b.id}">Reservar con ${esc(b.nombre)}</button></div></div>`;
    }).join('');
  }

  function irA(id) { $(id).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }

  // ---------- Eventos ----------
  $('form-reserva').addEventListener('change', e => {
    if (e.target.name === 'servicio') sel.servicioId = e.target.value;
    else if (e.target.name === 'barbero') sel.barberoId = e.target.value;
    else return;
    if (sel.fecha && !elegido()) sel.hora = null;
    todo();
  });
  $('form-reserva').addEventListener('input', e => { if (e.target.name === 'nombre' || e.target.name === 'telefono') ticket(); });
  $('bm-accion').addEventListener('click', () => {
    if ($('bm-accion').dataset.modo !== 'confirmar') { irA('reservar'); return; }
    const f = $('form-reserva');
    if (f.nombre.value.trim().length < 2 || f.telefono.value.replace(/\D/g, '').length < 10) { irA('paso-datos'); setTimeout(() => (f.nombre.value ? f.telefono : f.nombre).focus({ preventScroll: true }), 350); toast('Completá tu nombre y WhatsApp'); return; }
    f.requestSubmit();
  });

  document.addEventListener('click', e => {
    const d = e.target.closest('.dia');
    if (d && !d.disabled) { sel.fecha = d.dataset.fecha; sel.hora = null; todo(); return; }
    const h = e.target.closest('.hora');
    if (h) {
      sel.hora = h.dataset.hora; horas(); ticket(); barraMovil();
      const f = $('form-reserva');
      if (!f.nombre.value) { if (movil()) irA('paso-datos'); setTimeout(() => f.nombre.focus({ preventScroll: true }), 350); }
      else if (movil()) irA('ticket');
      return;
    }
    const r = e.target.closest('[data-rapido]');
    if (r) { [sel.fecha, sel.hora] = r.dataset.rapido.split('|'); sel.servicioId = 'corte'; sel.barberoId = 'cualquiera'; opciones(); todo(); return; }
    const con = e.target.closest('[data-con]');
    if (con) { sel.barberoId = con.dataset.con; sel.hora = null; opciones(); todo(); irA('reservar'); return; }
    if (e.target.id === 'btn-siempre') {
      const yo = leerYo(); sel.servicioId = yo.servicioId; sel.barberoId = yo.barberoId || 'cualquiera'; sel.hora = null;
      opciones(); todo(); irA('paso-horario'); toast('Listo: elegí el día y el horario');
    }
  });

  $('form-reserva').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('error');
    estado = D.cargar(ahora());
    try {
      ultimo = A.reservar(estado, { ...sel, nombre: f.nombre.value, telefono: f.telefono.value, origen: 'web' }, ahora());
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false;
      ultimo = null; todo();
      if (movil()) irA('paso-datos');
      return;
    }
    D.guardar(estado);
    err.hidden = true;
    guardarYo(f.recordar.checked ? { nombre: f.nombre.value.trim(), telefonoTexto: f.telefono.value, servicioId: ultimo.servicioId, barberoId: sel.barberoId === 'cualquiera' ? null : ultimo.barberoId } : null);

    const s = A.servicio(estado, ultimo.servicioId), b = A.barbero(estado, ultimo.barberoId);
    const tk = $('ticket');
    $('ticket-n').textContent = '';
    tk.querySelector('.ticket-cabeza span').textContent = 'Turno confirmado';
    $('ticket-datos').innerHTML = `<dt>Servicio</dt><dd>${esc(s.nombre)}</dd><dt>Barbero</dt><dd>${esc(b.nombre)}</dd>
      <dt>Día</dt><dd>${capital(A.fechaLarga(ultimo.fecha))}</dd><dt>Hora</dt><dd>${ultimo.hora}</dd><dt>A nombre de</dt><dd>${esc(f.nombre.value.trim())}</dd>`;
    $('btn-reservar').hidden = true;
    const aviso = ultimo.fecha > A.sumarDias(hoyISO(), 1)
      ? 'El día anterior te escribimos por WhatsApp para confirmar.'
      : 'Si te surge algo, avisanos así le damos el lugar a otro.';
    $('conf-detalle').textContent = `Te esperamos en ${estado.negocio.direccion}. ${aviso}`;
    $('btn-avisar').href = A.linkWhatsApp(estado.negocio.whatsapp,
      `Hola! Reservé por la web: ${s.nombre.toLowerCase()} el ${A.fechaLarga(ultimo.fecha)} a las ${ultimo.hora} con ${b.nombre}. A nombre de ${f.nombre.value.trim()}.`);
    $('ticket-ok').hidden = false;
    $('politica').hidden = true;
    actualizarBarra();
    tk.insertAdjacentHTML('beforeend', '<span class="sello" id="sello" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>');
    tk.classList.remove('impreso'); void tk.offsetWidth; tk.classList.add('impreso');
    f.querySelectorAll('input, button').forEach(x => { x.disabled = true; });
    document.querySelectorAll('.paso').forEach(p => p.classList.add('listo'));
    pizarra(); dias();
    if (movil()) irA('ticket');
    toast('Turno reservado');
  });

  $('btn-calendario').addEventListener('click', () => {
    if (!ultimo) return;
    const url = URL.createObjectURL(new Blob([A.ics(estado, ultimo)], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'turno-filo-studio.ics' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('btn-otro').addEventListener('click', () => {
    ultimo = null; sel.fecha = sel.hora = null;
    const f = $('form-reserva');
    f.querySelectorAll('input, button').forEach(x => { x.disabled = false; });
    $('ticket').classList.remove('impreso');
    const sello = $('sello'); if (sello) sello.remove();
    $('ticket-n').textContent = '';
    $('ticket').querySelector('.ticket-cabeza span').textContent = 'Tu turno';
    $('ticket-ok').hidden = true; $('btn-reservar').hidden = false; $('politica').hidden = false;
    opciones(); todo(); irA('reservar');
  });

  // La barra aparece cuando la portada sale de pantalla
  new IntersectionObserver(en => { enPortada = en[0].isIntersecting; actualizarBarra(); }, { threshold: 0.05 })
    .observe(document.querySelector('.portada'));

  // Si en otra pestaña (el panel) cambian los turnos, se actualizan los horarios
  window.addEventListener('storage', e => { if (e.key === D.CLAVE && e.newValue) { estado = JSON.parse(e.newValue); D.guardar(estado); pizarra(); if (!ultimo) todo(); } });

  cartel(); setInterval(cartel, 60000);
  pizarra(); opciones(); local(); saludo(); todo();
})();
