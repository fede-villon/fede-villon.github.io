/*
 * Turnero · lógica de agenda (sin DOM). La usan el sitio, el panel y los tests.
 * Horas en minutos desde las 00:00; fechas como texto AAAA-MM-DD.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Agenda = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const PASO = 15;               // grilla de horarios cada 15 minutos
  const ANTICIPACION = 30;       // no se reserva para dentro de menos de 30 minutos
  const ACTIVOS = ['confirmado', 'asistio'];

  const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const aHora = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const fechaISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const deISO = s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
  const sumarDias = (s, n) => { const d = deISO(s); d.setDate(d.getDate() + n); return fechaISO(d); };
  const diaSemana = s => deISO(s).getDay();   // 0 = domingo

  const servicio = (estado, id) => estado.servicios.find(s => s.id === id);
  const barbero = (estado, id) => estado.barberos.find(b => b.id === id);
  const duracion = (estado, t) => (servicio(estado, t.servicioId) || { duracion: 30 }).duracion;

  /** Franjas en que trabaja un barbero ese día: [[inicio, fin], ...] en minutos. */
  function franjas(estado, barberoId, fecha) {
    const b = barbero(estado, barberoId);
    const dia = diaSemana(fecha);
    if (!b || !b.dias.includes(dia)) return [];
    if ((estado.ausencias || []).some(a => a.barberoId === barberoId && a.fecha === fecha)) return [];
    return (estado.negocio.horarios[dia] || []).map(([i, f]) => [aMin(i), aMin(f)]);
  }

  function ocupado(estado, barberoId, fecha) {
    return estado.turnos
      .filter(t => t.barberoId === barberoId && t.fecha === fecha && ACTIVOS.includes(t.estado))
      .map(t => [aMin(t.hora), aMin(t.hora) + duracion(estado, t)]);
  }

  const pisa = (a, b) => a[0] < b[1] && b[0] < a[1];

  /**
   * Horarios libres para un servicio. barberoId puede ser 'cualquiera'.
   * Devuelve [{hora, barberoId}] ordenado; con 'cualquiera' cada hora aparece una vez
   * (se asigna al barbero con menos turnos ese día, para repartir el trabajo).
   */
  function horariosLibres(estado, fecha, servicioId, barberoId, ahora) {
    const s = servicio(estado, servicioId);
    if (!s) return [];
    const hoy = fechaISO(ahora);
    if (fecha < hoy) return [];
    const minimo = fecha === hoy ? ahora.getHours() * 60 + ahora.getMinutes() + ANTICIPACION : 0;
    const candidatos = barberoId === 'cualquiera' ? estado.barberos.map(b => b.id) : [barberoId];
    const carga = id => ocupado(estado, id, fecha).length;
    const porHora = new Map();
    for (const id of candidatos) {
      const ocupados = ocupado(estado, id, fecha);
      for (const [ini, fin] of franjas(estado, id, fecha)) {
        for (let m = Math.ceil(ini / PASO) * PASO; m + s.duracion <= fin; m += PASO) {
          if (m < minimo) continue;
          const tramo = [m, m + s.duracion];
          if (ocupados.some(o => pisa(o, tramo))) continue;
          const previo = porHora.get(m);
          if (!previo || carga(id) < carga(previo)) porHora.set(m, id);
        }
      }
    }
    return [...porHora.entries()].sort((a, b) => a[0] - b[0]).map(([m, id]) => ({ hora: aHora(m), barberoId: id }));
  }

  /** Primer horario libre en los próximos `dias` días. */
  function proximoLibre(estado, servicioId, ahora, dias = 14) {
    const hoy = fechaISO(ahora);
    for (let i = 0; i < dias; i++) {
      const fecha = sumarDias(hoy, i);
      const libres = horariosLibres(estado, fecha, servicioId, 'cualquiera', ahora);
      if (libres.length) return { fecha, ...libres[0] };
    }
    return null;
  }

  /** Valida y crea un turno. Lanza Error con un mensaje para el usuario si no se puede. */
  function reservar(estado, datos, ahora) {
    const { fecha, hora, servicioId, nombre } = datos;
    const telefono = normalizarTelefono(datos.telefono || '');
    if (!nombre || nombre.trim().length < 2) throw new Error('Escribí tu nombre.');
    if (!telefono) throw new Error('Revisá el WhatsApp: tiene que tener código de área, por ejemplo 341 555 1234.');
    const libres = horariosLibres(estado, fecha, servicioId, datos.barberoId || 'cualquiera', ahora);
    const elegido = libres.find(l => l.hora === hora);
    if (!elegido) throw new Error('Ese horario se acaba de ocupar. Elegí otro.');
    let cliente = estado.clientes.find(c => c.telefono === telefono);
    if (!cliente) {
      cliente = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre: nombre.trim(), telefono, notas: '' };
      estado.clientes.push(cliente);
    }
    const turno = {
      id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fecha, hora, servicioId, barberoId: elegido.barberoId, clienteId: cliente.id,
      estado: 'confirmado', origen: datos.origen || 'web', cobro: null, creado: ahora.toISOString(),
    };
    estado.turnos.push(turno);
    return turno;
  }

  /** Devuelve el teléfono como 549 + área + número (formato de wa.me), o '' si no es válido. */
  function normalizarTelefono(texto) {
    let d = String(texto).replace(/\D/g, '');
    if (d.startsWith('549')) d = d.slice(3);
    else if (d.startsWith('54')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    // Con el 15 de celular quedan 12 dígitos (área + 15 + número): se saca.
    if (d.length === 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    return d.length === 10 ? '549' + d : '';
  }

  const telefonoLegible = t => t ? `${t.slice(3, 6)} ${t.slice(6, 9)}-${t.slice(9)}` : '';

  function linkWhatsApp(telefono, texto) {
    return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
  }

  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fechaLarga(s) { const d = deISO(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; }

  function textoRecordatorio(estado, t) {
    const c = estado.clientes.find(x => x.id === t.clienteId);
    const s = servicio(estado, t.servicioId);
    const b = barbero(estado, t.barberoId);
    return `Hola ${c ? c.nombre.split(' ')[0] : ''}! Te recordamos tu turno en ${estado.negocio.nombre}: ` +
      `${fechaLarga(t.fecha)} a las ${t.hora} con ${b ? b.nombre : 'nosotros'} (${s ? s.nombre.toLowerCase() : 'turno'}). ` +
      `Si no podés venir, avisanos por acá así le damos el lugar a otro. ¡Gracias!`;
  }

  /** Archivo .ics para agendar el turno en el calendario del celular. */
  function ics(estado, t) {
    const s = servicio(estado, t.servicioId);
    const ini = deISO(t.fecha); const m = aMin(t.hora);
    ini.setHours(Math.floor(m / 60), m % 60);
    const fin = new Date(ini.getTime() + (s ? s.duracion : 30) * 60000);
    const f = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Turnero//ES', 'BEGIN:VEVENT', `UID:${t.id}@turnero`,
      `DTSTART:${f(ini)}`, `DTEND:${f(fin)}`, `SUMMARY:${s ? s.nombre : 'Turno'} · ${estado.negocio.nombre}`,
      `LOCATION:${estado.negocio.direccion}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  /** Números de un período (fechas inclusive). */
  function metricas(estado, desde, hasta) {
    const delPeriodo = estado.turnos.filter(t => t.fecha >= desde && t.fecha <= hasta && t.estado !== 'cancelado');
    const atendidos = delPeriodo.filter(t => t.estado === 'asistio');
    const ausentes = delPeriodo.filter(t => t.estado === 'ausente');
    const ingresos = atendidos.reduce((s, t) => s + (t.cobro ? t.cobro.monto : 0), 0);
    let disponible = 0, reservado = 0;
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
      for (const b of estado.barberos) {
        disponible += franjas(estado, b.id, f).reduce((s, [i, fi]) => s + fi - i, 0);
        reservado += ocupado(estado, b.id, f).reduce((s, [i, fi]) => s + fi - i, 0);
      }
    }
    const porServicio = {};
    const porMedio = {};
    for (const t of atendidos) {
      porServicio[t.servicioId] = (porServicio[t.servicioId] || 0) + 1;
      if (t.cobro) porMedio[t.cobro.medio] = (porMedio[t.cobro.medio] || 0) + t.cobro.monto;
    }
    const cerrados = atendidos.length + ausentes.length;
    return {
      turnos: delPeriodo.length, atendidos: atendidos.length, ausentes: ausentes.length, ingresos,
      ausentismo: cerrados ? ausentes.length / cerrados : 0,
      ocupacion: disponible ? reservado / disponible : 0,
      ticket: atendidos.length ? ingresos / atendidos.length : 0,
      porServicio, porMedio,
    };
  }

  /** Clientes con su historial, ordenados por días sin venir (los que hace más que no vienen, primero). */
  function resumenClientes(estado, hoy) {
    return estado.clientes.map(c => {
      const suyos = estado.turnos.filter(t => t.clienteId === c.id);
      const visitas = suyos.filter(t => t.estado === 'asistio').sort((a, b) => a.fecha < b.fecha ? 1 : -1);
      const proximo = suyos.filter(t => t.estado === 'confirmado' && t.fecha >= hoy).sort((a, b) => (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1)[0] || null;
      const ultima = visitas[0] ? visitas[0].fecha : null;
      const dias = ultima ? Math.round((deISO(hoy) - deISO(ultima)) / 86400000) : null;
      return {
        ...c, visitas: visitas.length, ultima, diasSinVenir: dias, proximo,
        gastado: visitas.reduce((s, t) => s + (t.cobro ? t.cobro.monto : 0), 0),
        ausencias: suyos.filter(t => t.estado === 'ausente').length,
      };
    }).sort((a, b) => (b.diasSinVenir ?? -1) - (a.diasSinVenir ?? -1));
  }

  const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');

  return {
    PASO, ANTICIPACION, aMin, aHora, fechaISO, deISO, sumarDias, diaSemana, fechaLarga, franjas,
    horariosLibres, proximoLibre, reservar, normalizarTelefono, telefonoLegible, linkWhatsApp,
    textoRecordatorio, ics, metricas, resumenClientes, pesos, servicio, barbero, duracion,
  };
});
