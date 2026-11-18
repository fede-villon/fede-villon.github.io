/* Turnero · panel del dueño */
(function () {
  const A = window.Agenda, D = window.Datos;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ahora = () => new Date();
  const hoyISO = () => A.fechaISO(ahora());
  let estado = D.cargar(ahora());
  let dia = hoyISO();
  let periodo = 7;

  const INICIO = 9 * 60, FIN = 21 * 60, PX = 1.6;            // la grilla va de 9 a 21, 1,6 px por minuto
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito' };
  const ESTADOS = { confirmado: 'Confirmado', asistio: 'Atendido', ausente: 'No vino', cancelado: 'Cancelado' };
  const cliente = id => estado.clientes.find(c => c.id === id);
  const guardar = () => { D.guardar(estado); todo(); };
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
  let recien = null;   // turno recién creado o modificado: se resalta en la agenda
  function toast(texto) {
    const t = $('toast'); t.textContent = texto; t.classList.add('visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('visible'), 3000);
  }

  // ---------- Agenda del día ----------
  function agenda() {
    $('titulo-dia').textContent = capital(dia === hoyISO() ? 'hoy, ' + A.fechaLarga(dia).split(' ').slice(1).join(' ') : A.fechaLarga(dia));
    const delDia = estado.turnos.filter(t => t.fecha === dia && t.estado !== 'cancelado');
    const m = A.metricas(estado, dia, dia);
    const pendientes = delDia.filter(t => t.estado === 'confirmado').length;
    $('resumen-dia').innerHTML = `<span><strong>${delDia.length}</strong> turnos</span><span><strong>${pendientes}</strong> por atender</span>` +
      `<span><strong>${A.pesos(m.ingresos)}</strong> cobrado</span><span><strong>${Math.round(m.ocupacion * 100)} %</strong> de la agenda ocupada</span>`;

    const cont = $('agenda');
    cont.style.setProperty('--cols', estado.barberos.length);
    cont.style.setProperty('--h', 15 * PX + 'px');
    const alto = (FIN - INICIO) * PX;
    let html = '<div class="esquina"></div>' + estado.barberos.map(b => {
      const n = delDia.filter(t => t.barberoId === b.id).length;
      return `<div class="col-cabeza">${esc(b.nombre)}<small>${A.franjas(estado, b.id, dia).length ? n + ' turnos' : 'No trabaja'}</small></div>`;
    }).join('');
    html += `<div class="horas-col" style="height:${alto}px">`;
    for (let h = INICIO; h < FIN; h += 60) html += `<span class="marca-hora" style="top:${(h - INICIO) * PX}px">${A.aHora(h)}</span>`;
    html += '</div>';
    const minAhora = ahora().getHours() * 60 + ahora().getMinutes();
    for (const b of estado.barberos) {
      html += `<div class="columna" style="height:${alto}px">`;
      // zonas cerradas: lo que queda fuera de las franjas de trabajo
      let cursor = INICIO;
      for (const [i, f] of [...A.franjas(estado, b.id, dia), [FIN, FIN]]) {
        if (i > cursor) html += `<div class="cerrado" style="top:${(cursor - INICIO) * PX}px;height:${(i - cursor) * PX}px"></div>`;
        cursor = Math.max(cursor, f);
      }
      // Huecos libres (desde ahora en adelante): un clic abre "Nuevo turno" en ese horario
      const ocup = delDia.filter(x => x.barberoId === b.id).map(x => [A.aMin(x.hora), A.aMin(x.hora) + A.duracion(estado, x)]).sort((p, q) => p[0] - q[0]);
      const desdeMin = dia < hoyISO() ? Infinity : dia === hoyISO() ? Math.ceil((minAhora + 1) / 15) * 15 : 0;
      for (const [fi, ff] of A.franjas(estado, b.id, dia)) {
        let c = Math.max(fi, desdeMin);
        for (const [oi, of] of [...ocup.filter(o => o[1] > c && o[0] < ff), [ff, ff]]) {
          const c0 = Math.ceil(c / 15) * 15;   // los turnos arrancan en horarios redondos
          if (oi - c0 >= 15) html += `<button type="button" class="hueco" data-hueco="${b.id}|${A.aHora(c0)}|${oi - c0}" style="top:${(c0 - INICIO) * PX + 1}px;height:${(oi - c0) * PX - 2}px">+ ${A.aHora(c0)} · ${oi - c0} min libres</button>`;
          c = Math.max(c, of);
        }
      }
      for (const t of delDia.filter(x => x.barberoId === b.id)) {
        const ini = A.aMin(t.hora), dur = A.duracion(estado, t), c = cliente(t.clienteId), s = A.servicio(estado, t.servicioId);
        html += `<button type="button" class="turno ${t.estado} ${t.origen === 'web' && t.estado === 'confirmado' ? 'web' : ''} ${t.id === recien ? 'recien' : ''}" data-turno="${t.id}"
          style="top:${(ini - INICIO) * PX + 1}px;height:${dur * PX - 2}px" aria-label="${t.hora} ${esc(c?.nombre)}, ${esc(s?.nombre)}, ${ESTADOS[t.estado]}">
          <strong>${t.hora} ${esc(c?.nombre)}</strong>${dur >= 30 ? `<span>${esc(s?.nombre)}${t.estado === 'ausente' ? ' · no vino' : ''}</span>` : ''}</button>`;
      }
      if (dia === hoyISO() && minAhora > INICIO && minAhora < FIN) html += `<div class="ahora" style="top:${(minAhora - INICIO) * PX}px" aria-hidden="true"></div>`;
      html += '</div>';
    }
    cont.innerHTML = html;
    proximo();
  }

  // Tarjeta con el próximo cliente del día y las acciones de un toque
  function proximo() {
    const el = $('proximo');
    const min = ahora().getHours() * 60 + ahora().getMinutes();
    const t = dia !== hoyISO() ? null : estado.turnos
      .filter(x => x.fecha === dia && x.estado === 'confirmado' && A.aMin(x.hora) + A.duracion(estado, x) > min)
      .sort((p, q) => p.hora < q.hora ? -1 : 1)[0];
    if (!t) { el.hidden = true; return; }
    const c = cliente(t.clienteId), s = A.servicio(estado, t.servicioId), b = A.barbero(estado, t.barberoId);
    const falta = A.aMin(t.hora) - min;
    el.hidden = false;
    el.innerHTML = `<span class="cuando">${t.hora}</span>
      <div><small>${falta > 0 ? `Próximo cliente, en ${falta >= 60 ? Math.floor(falta / 60) + ' h ' : ''}${falta % 60} min` : 'En el sillón ahora'}</small>
        <strong>${esc(c.nombre)}</strong><small>${esc(s.nombre)} con ${esc(b.nombre)} · ${A.pesos(s.precio)}</small>
        ${c.notas ? `<span class="nota-chica">${esc(c.notas)}</span>` : ''}</div>
      <div class="acciones"><button class="btn principal chico" type="button" data-turno="${t.id}">Cobrar</button>
        <button class="btn chico" type="button" data-accion="ausente" data-id="${t.id}">No vino</button></div>`;
  }

  // ---------- Lateral: detalle de un turno ----------
  function abrirLateral(titulo, cuerpo) {
    $('lateral-titulo').textContent = titulo;
    $('lateral-cuerpo').innerHTML = cuerpo;
    $('lateral').hidden = $('fondo').hidden = false;
    $('btn-cerrar').focus();
  }
  function cerrarLateral() { $('lateral').hidden = $('fondo').hidden = true; }

  function verTurno(id) {
    const t = estado.turnos.find(x => x.id === id);
    const c = cliente(t.clienteId), s = A.servicio(estado, t.servicioId), b = A.barbero(estado, t.barberoId);
    const hist = A.resumenClientes(estado, hoyISO()).find(x => x.id === c.id);
    let acciones = '';
    if (t.estado === 'confirmado') {
      acciones = `
        <form class="form" data-accion="cobrar" data-id="${t.id}">
          <div class="fila">
            <label>Medio de pago<select name="medio">${Object.entries(MEDIOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
            <label>Monto<input name="monto" type="number" min="0" step="100" value="${s.precio}" required></label>
          </div>
          <button class="btn verde" type="submit">Cobrar y marcar atendido</button>
        </form>
        <div class="acciones" style="margin-top:12px">
          <a class="btn chico" target="_blank" rel="noopener" href="${A.linkWhatsApp(c.telefono, A.textoRecordatorio(estado, t))}">Recordatorio por WhatsApp</a>
          <button class="btn chico" type="button" data-accion="ausente" data-id="${t.id}">No vino</button>
          <button class="btn chico peligro" type="button" data-accion="cancelar" data-id="${t.id}">Cancelar turno</button>
        </div>`;
    } else {
      acciones = `<div class="acciones">${t.cobro ? `<p>Cobrado ${A.pesos(t.cobro.monto)} en ${MEDIOS[t.cobro.medio].toLowerCase()}.</p>` : ''}
        <button class="btn chico" type="button" data-accion="deshacer" data-id="${t.id}">Volver a confirmado</button></div>`;
    }
    abrirLateral(`${t.hora} · ${c.nombre}`, `
      <p><span class="estado-chip ${t.estado}">${ESTADOS[t.estado]}</span> ${t.origen === 'web' ? '· reservó por la web' : '· cargado en el local'}</p>
      <dl class="ficha">
        <dt>Servicio</dt><dd>${esc(s.nombre)} (${s.duracion} min)</dd>
        <dt>Barbero</dt><dd>${esc(b.nombre)}</dd>
        <dt>Día</dt><dd>${capital(A.fechaLarga(t.fecha))}</dd>
        <dt>WhatsApp</dt><dd>${A.telefonoLegible(c.telefono)}</dd>
        <dt>Visitas</dt><dd>${hist.visitas}${hist.ultima ? ` · última hace ${hist.diasSinVenir} días` : ''}</dd>
        ${hist.ausencias ? `<dt>Faltó</dt><dd>${hist.ausencias} ${hist.ausencias === 1 ? 'vez' : 'veces'}</dd>` : ''}
      </dl>
      ${c.notas ? `<p class="nota">${esc(c.notas)}</p>` : ''}
      ${acciones}`);
  }

  function nuevoTurno(inicial = {}) {
    const opcionesClientes = [...estado.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    abrirLateral('Nuevo turno', `
      <form class="form" data-accion="crear">
        <label>Servicio<select name="servicioId">${estado.servicios.map(s => `<option value="${s.id}" ${inicial.servicioId === s.id ? 'selected' : ''}>${esc(s.nombre)} · ${s.duracion} min</option>`).join('')}</select></label>
        <label>Barbero<select name="barberoId"><option value="cualquiera">El primero libre</option>${estado.barberos.map(b => `<option value="${b.id}" ${inicial.barberoId === b.id ? 'selected' : ''}>${esc(b.nombre)}</option>`).join('')}</select></label>
        <label>Día<input name="fecha" type="date" value="${dia}" min="${hoyISO()}" required></label>
        <label>Horario<select name="hora" required></select></label>
        <label>Cliente<select name="clienteId"><option value="">Cliente nuevo…</option>${opcionesClientes}</select></label>
        <div class="fila" data-nuevo>
          <label>Nombre<input name="nombre"></label>
          <label>WhatsApp<input name="telefono" type="tel" placeholder="341 555 1234"></label>
        </div>
        <p class="error" hidden></p>
        <button class="btn principal" type="submit">Guardar turno</button>
      </form>`);
    horasDelForm(inicial.hora);
  }

  function horasDelForm(preferida) {
    const f = document.querySelector('[data-accion="crear"]');
    if (!f) return;
    const libres = A.horariosLibres(estado, f.fecha.value, f.servicioId.value, f.barberoId.value, ahora());
    f.hora.innerHTML = libres.length
      ? libres.map(l => `<option value="${l.hora}">${l.hora}${f.barberoId.value === 'cualquiera' ? ' · ' + A.barbero(estado, l.barberoId).nombre : ''}</option>`).join('')
      : '<option value="">Sin horarios libres ese día</option>';
    if (preferida && libres.some(l => l.hora === preferida)) f.hora.value = preferida;
    f.querySelector('[data-nuevo]').hidden = !!f.clienteId.value;
  }

  // ---------- Recordatorios ----------
  function recordatorios() {
    const manana = A.sumarDias(hoyISO(), 1);
    const lista = estado.turnos.filter(t => t.fecha === manana && t.estado === 'confirmado').sort((a, b) => a.hora < b.hora ? -1 : 1);
    const faltan = lista.filter(t => !t.recordado).length;
    $('cont-rec').textContent = faltan || '';
    $('lista-rec').innerHTML = lista.length ? lista.map(t => {
      const c = cliente(t.clienteId), s = A.servicio(estado, t.servicioId), b = A.barbero(estado, t.barberoId);
      return `<div class="item-rec ${t.recordado ? 'enviado' : ''}">
        <span class="hora-grande">${t.hora}</span>
        <div><strong>${esc(c.nombre)}</strong><small>${esc(s.nombre)} con ${esc(b.nombre)} · ${A.telefonoLegible(c.telefono)}</small></div>
        <a class="btn ${t.recordado ? '' : 'verde'} chico" target="_blank" rel="noopener" data-recordado="${t.id}"
          href="${A.linkWhatsApp(c.telefono, A.textoRecordatorio(estado, t))}">${t.recordado ? 'Enviado · reenviar' : 'Enviar por WhatsApp'}</a>
      </div>`;
    }).join('') : `<p class="vacio">No hay turnos para mañana (${A.fechaLarga(manana)}).</p>`;
  }

  // ---------- Clientes ----------
  function clientes() {
    const soloPerdidos = $('solo-perdidos').checked;
    const lista = A.resumenClientes(estado, hoyISO()).filter(c => !soloPerdidos || (c.diasSinVenir > 30 && !c.proximo));
    $('tabla-clientes').innerHTML = `<thead><tr><th>Cliente</th><th>WhatsApp</th><th class="num">Visitas</th><th>Última visita</th>
      <th>Próximo turno</th><th class="num">Gastado</th><th class="num">Faltó</th><th></th></tr></thead><tbody>` +
      (lista.length ? lista.map(c => {
        const perdido = c.diasSinVenir > 30 && !c.proximo;
        const texto = `Hola ${c.nombre.split(' ')[0]}! Hace un tiempo que no te vemos por ${estado.negocio.nombre}. Si querés, reservá tu turno acá o respondé este mensaje y te lo agendamos.`;
        return `<tr><td>${esc(c.nombre)}${c.notas ? ' 📝' : ''}</td><td>${A.telefonoLegible(c.telefono)}</td><td class="num">${c.visitas}</td>
          <td class="${perdido ? 'alerta' : ''}">${c.ultima ? `hace ${c.diasSinVenir} días` : '—'}</td>
          <td>${c.proximo ? `${A.fechaLarga(c.proximo.fecha).split(' ').slice(0, 2).join(' ')} ${c.proximo.hora}` : '—'}</td>
          <td class="num">${A.pesos(c.gastado)}</td><td class="num">${c.ausencias || ''}</td>
          <td>${perdido ? `<a class="btn chico" target="_blank" rel="noopener" href="${A.linkWhatsApp(c.telefono, texto)}">Invitar a volver</a>` : ''}</td></tr>`;
      }).join('') : '<tr><td colspan="8" class="vacio">Ningún cliente cumple el filtro.</td></tr>') + '</tbody>';
  }

  // ---------- Números ----------
  function numeros() {
    const hasta = hoyISO(), desde = A.sumarDias(hasta, -(periodo - 1));
    const m = A.metricas(estado, desde, hasta);
    document.querySelectorAll('#periodos button').forEach(b => b.setAttribute('aria-checked', Number(b.dataset.dias) === periodo));
    $('metricas').innerHTML = [
      ['Ingresos', A.pesos(m.ingresos), `${m.atendidos} clientes atendidos`],
      ['Ticket promedio', A.pesos(m.ticket), 'por cliente'],
      ['Agenda ocupada', Math.round(m.ocupacion * 100) + ' %', 'de las horas disponibles'],
      ['No vinieron', Math.round(m.ausentismo * 100) + ' %', `${m.ausentes} turnos perdidos`],
    ].map(([t, v, d]) => `<div class="metrica"><span>${t}</span><strong>${v}</strong><small>${d}</small></div>`).join('');

    const dias = [];
    for (let f = periodo === 1 ? A.sumarDias(hasta, -6) : desde; f <= hasta; f = A.sumarDias(f, 1)) dias.push([f, A.metricas(estado, f, f).ingresos]);
    const max = Math.max(1, ...dias.map(d => d[1]));
    $('barras').innerHTML = dias.map(([f, v]) => `<div class="col ${f === hasta ? 'hoy' : ''}" title="${capital(A.fechaLarga(f))}: ${A.pesos(v)}">
      <div class="b" style="height:${(v / max) * 100}%"></div><small>${A.deISO(f).getDate()}</small></div>`).join('');
    $('barras').setAttribute('role', 'img');
    $('barras').setAttribute('aria-label', 'Ingresos por día: ' + dias.map(([f, v]) => `${A.deISO(f).getDate()}: ${A.pesos(v)}`).join(', '));

    const filas = (obj, nombre, formato) => {
      const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
      const orden = Object.entries(obj).sort((a, b) => b[1] - a[1]);
      return orden.length ? orden.map(([k, v]) => `<div class="fila-barra"><span>${esc(nombre(k))}</span><span>${formato(v)}</span>
        <div class="pista"><i style="width:${(v / total) * 100}%"></i></div></div>`).join('') : '<p class="ayuda">Sin datos en el período.</p>';
    };
    $('servicios-top').innerHTML = filas(m.porServicio, k => A.servicio(estado, k)?.nombre || k, v => `${v}`);
    $('medios').innerHTML = filas(m.porMedio, k => MEDIOS[k] || k, A.pesos);
  }

  // ---------- Navegación y eventos ----------
  function mostrar(vista) {
    document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.vista === vista));
    document.querySelectorAll('.vista').forEach(v => { v.hidden = v.id !== 'vista-' + vista; });
  }
  function todo() { agenda(); recordatorios(); clientes(); numeros(); }

  document.addEventListener('click', e => {
    const tab = e.target.closest('[role=tab]'); if (tab) { mostrar(tab.dataset.vista); return; }
    const nav = e.target.closest('[data-dia]');
    if (nav) { const n = Number(nav.dataset.dia); dia = n === 0 ? hoyISO() : A.sumarDias(dia, n); agenda(); return; }
    const t = e.target.closest('[data-turno]'); if (t) { verTurno(t.dataset.turno); return; }
    const hu = e.target.closest('[data-hueco]');
    if (hu) {
      const [barberoId, hora, libres] = hu.dataset.hueco.split('|');
      // el servicio que se ofrece primero es el más pedido que entre en el hueco
      const entra = ['corte', 'barba', 'rapado', 'nino', 'corte-barba'].map(id => A.servicio(estado, id)).find(x => x && x.duracion <= Number(libres));
      nuevoTurno({ barberoId, hora, servicioId: entra ? entra.id : undefined });
      return;
    }
    const per = e.target.closest('[data-dias]'); if (per) { periodo = Number(per.dataset.dias); numeros(); return; }
    const rec = e.target.closest('[data-recordado]');
    if (rec) { estado.turnos.find(x => x.id === rec.dataset.recordado).recordado = true; D.guardar(estado); setTimeout(recordatorios, 300); return; }
    const acc = e.target.closest('button[data-accion]');
    if (acc) {
      const turno = estado.turnos.find(x => x.id === acc.dataset.id);
      if (acc.dataset.accion === 'cancelar' && !confirm('¿Cancelar este turno? El horario queda libre para otro cliente.')) return;
      turno.estado = { ausente: 'ausente', cancelado: 'cancelado', cancelar: 'cancelado', deshacer: 'confirmado' }[acc.dataset.accion];
      if (turno.estado === 'confirmado') turno.cobro = null;
      recien = turno.id;
      guardar();
      toast({ ausente: 'Marcado como ausente', cancelado: 'Turno cancelado: el horario quedó libre', confirmado: 'Turno vuelto a confirmado' }[turno.estado]);
      if (turno.estado === 'cancelado') cerrarLateral(); else verTurno(turno.id);
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target; e.preventDefault();
    if (f.dataset.accion === 'cobrar') {
      const t = estado.turnos.find(x => x.id === f.dataset.id);
      t.estado = 'asistio';
      t.cobro = { medio: f.medio.value, monto: Number(f.monto.value) || 0 };
      recien = t.id;
      guardar(); cerrarLateral();
      toast(`Cobrado ${A.pesos(t.cobro.monto)} · ${cliente(t.clienteId).nombre}`);
    } else if (f.dataset.accion === 'crear') {
      const err = f.querySelector('.error');
      try {
        const c = f.clienteId.value ? cliente(f.clienteId.value) : null;
        const t = A.reservar(estado, {
          fecha: f.fecha.value, hora: f.hora.value, servicioId: f.servicioId.value, barberoId: f.barberoId.value,
          nombre: c ? c.nombre : f.nombre.value, telefono: c ? c.telefono : f.telefono.value, origen: 'panel',
        }, ahora());
        dia = t.fecha; recien = t.id; guardar(); cerrarLateral();
        toast(`Turno guardado: ${t.hora} con ${A.barbero(estado, t.barberoId).nombre}`);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.closest('[data-accion="crear"]') && ['servicioId', 'barberoId', 'fecha', 'clienteId'].includes(e.target.name)) horasDelForm();
    if (e.target.id === 'solo-perdidos') clientes();
  });
  $('btn-nuevo').addEventListener('click', () => nuevoTurno());
  $('btn-cerrar').addEventListener('click', cerrarLateral);
  $('fondo').addEventListener('click', cerrarLateral);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('lateral').hidden) cerrarLateral();
    const escribiendo = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (!escribiendo && $('lateral').hidden && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); mostrar('agenda'); nuevoTurno(); }
    if (!escribiendo && $('lateral').hidden && !$('vista-agenda').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { dia = A.sumarDias(dia, e.key === 'ArrowLeft' ? -1 : 1); agenda(); }
  });
  // Recordatorio marcado como enviado: aviso
  document.addEventListener('click', e => { if (e.target.closest('[data-recordado]')) toast('Recordatorio marcado como enviado'); });
  // La línea de "ahora" y el próximo cliente se actualizan cada minuto
  setInterval(() => { if (dia === hoyISO()) agenda(); }, 60000);
  $('btn-reiniciar').addEventListener('click', () => {
    if (confirm('¿Volver a los datos iniciales de la demo? Se borran los turnos que agregaste.')) { estado = D.reiniciar(ahora()); dia = hoyISO(); todo(); }
  });
  // Si se reserva en la web (otra pestaña), el panel se actualiza solo
  window.addEventListener('storage', e => { if (e.key === D.CLAVE) { estado = JSON.parse(e.newValue || 'null') || D.reiniciar(ahora()); D.guardar(estado); todo(); } });

  todo();
})();
