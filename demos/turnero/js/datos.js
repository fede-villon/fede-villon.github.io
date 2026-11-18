/*
 * Turnero · datos de la demo. Se guardan en el navegador (localStorage), así la
 * web pública y el panel comparten la misma agenda: lo que se reserva en la web
 * aparece en el panel. Si el navegador no deja guardar, funciona igual en memoria.
 */
(function (raiz, fabrica) {
  const api = fabrica(raiz.Agenda || (typeof require === 'function' ? require('./agenda.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Datos = api;
})(typeof self !== 'undefined' ? self : this, function (A) {
  const CLAVE = 'turnero-demo-v3';

  const NEGOCIO = {
    nombre: 'filo studio',
    direccion: 'Av. Alberdi 1180, Rosario',
    whatsapp: '5493415550100',
    horarios: {                       // 0 domingo … 6 sábado
      2: [['09:30', '13:00'], ['16:00', '20:30']], 3: [['09:30', '13:00'], ['16:00', '20:30']],
      4: [['09:30', '13:00'], ['16:00', '20:30']], 5: [['09:30', '13:00'], ['16:00', '21:00']],
      6: [['09:00', '14:00']], 1: [['16:00', '20:30']],
    },
  };
  const SERVICIOS = [
    { id: 'corte', nombre: 'Corte', duracion: 30, precio: 12000 },
    { id: 'corte-barba', nombre: 'Corte y barba', duracion: 45, precio: 16000 },
    { id: 'barba', nombre: 'Barba y perfilado', duracion: 20, precio: 7000 },
    { id: 'nino', nombre: 'Corte kids', duracion: 30, precio: 9000 },
    { id: 'diseno', nombre: 'Diseño y líneas', duracion: 15, precio: 4000 },
  ];
  const BARBEROS = [
    { id: 'nico', nombre: 'Nico', detalle: 'Degradés, taper y mullet', dias: [1, 2, 3, 4, 5, 6] },
    { id: 'lauti', nombre: 'Lauti', detalle: 'Barba, diseños y freestyle', dias: [2, 3, 4, 5, 6] },
  ];
  const NOMBRES = ['Juan Pérez', 'Thiago Gómez', 'Lucas Fernández', 'Bauti Romero', 'Facundo Díaz', 'Benja Sosa',
    'Matías Álvarez', 'Valentino Torres', 'Santiago Ruiz', 'Franco Medina', 'Joaquín Herrera', 'Tomás Castro',
    'Emiliano Ríos', 'Bruno Acosta', 'Leandro Molina', 'Ezequiel Ortiz', 'Pablo Benítez', 'Nahuel Godoy'];

  // Generador pseudoaleatorio con semilla: la demo sale igual cada vez.
  function azar(semilla) {
    let s = semilla >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function sembrar(ahora = new Date()) {
    const r = azar(20261118);
    const elegir = arr => arr[Math.floor(r() * arr.length)];
    const estado = {
      negocio: NEGOCIO, servicios: SERVICIOS.map(s => ({ ...s })), barberos: BARBEROS.map(b => ({ ...b })),
      clientes: NOMBRES.map((n, i) => ({
        id: 'c' + (i + 1), nombre: n, telefono: '549341' + String(5550200 + i * 37).padStart(7, '0'),
        notas: i === 2 ? 'Taper bajo, máquina 1 a los costados' : i === 7 ? 'Alérgico a la loción con alcohol' : '',
      })),
      turnos: [], ausencias: [], cobrosSueltos: [],
    };
    const hoy = A.fechaISO(ahora);
    const pesos = [5, 2, 3, 1, 1];   // el corte es lo más pedido
    const servicioAzar = () => { let x = r() * 12, i = 0; while ((x -= pesos[i]) > 0) i++; return SERVICIOS[Math.min(i, 4)]; };
    let n = 0;
    // 4 semanas hacia atrás (atendidos y algún ausente) y 6 días hacia adelante (confirmados)
    for (let d = -28; d <= 6; d++) {
      const fecha = A.sumarDias(hoy, d);
      for (const b of estado.barberos) {
        for (const [ini, fin] of A.franjas(estado, b.id, fecha)) {
          for (let m = ini; m < fin; ) {
            const s = servicioAzar();
            const ocupar = d < 0 ? r() < 0.72 : d === 0 ? r() < 0.6 : r() < 0.45 - d * 0.05;
            if (m + s.duracion > fin) break;
            if (ocupar) {
              const pasado = d < 0 || (d === 0 && m + s.duracion <= ahora.getHours() * 60 + ahora.getMinutes());
              const ausente = pasado && r() < 0.07;
              const t = {
                id: 's' + (++n), fecha, hora: A.aHora(m), servicioId: s.id, barberoId: b.id,
                clienteId: elegir(estado.clientes).id, origen: r() < 0.6 ? 'web' : 'panel', creado: null,
                estado: pasado ? (ausente ? 'ausente' : 'asistio') : 'confirmado',
                cobro: pasado && !ausente ? { medio: elegir(['efectivo', 'efectivo', 'transferencia', 'debito']), monto: s.precio } : null,
              };
              estado.turnos.push(t);
              m += s.duracion;
            } else {
              m += 15;
            }
          }
        }
      }
    }
    // Un cliente que hace mucho que no viene (para la lista de "recuperar clientes")
    estado.turnos = estado.turnos.filter(t => t.clienteId !== 'c18' || t.fecha < A.sumarDias(hoy, -24));
    return estado;
  }

  let memoria = null;
  function cargar(ahora) {
    if (memoria) return memoria;
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado) { memoria = JSON.parse(guardado); return memoria; }
    } catch (e) { /* sin almacenamiento: seguimos en memoria */ }
    memoria = sembrar(ahora);
    guardar(memoria);
    return memoria;
  }
  function guardar(estado) {
    memoria = estado;
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ }
  }
  function reiniciar(ahora) {
    try { localStorage.removeItem(CLAVE); } catch (e) {}
    memoria = null;
    return cargar(ahora);
  }

  return { CLAVE, sembrar, cargar, guardar, reiniciar };
});
