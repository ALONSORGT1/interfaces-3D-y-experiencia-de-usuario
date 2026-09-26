// 57 authored situations. Mechanics are reusable; objectives and parameters are data.
export const DIFFICULTIES = {
  relaxed: {
    name: "Tranquila",
    targets: 2,
    hold: 2,
    radius: 2.3,
    sight: 5.5,
    speed: 1.5,
    suspicion: 7,
    recovery: 6,
    precision: 4,
  },
  normal: {
    name: "Normal",
    targets: 3,
    hold: 3,
    radius: 1.8,
    sight: 7.5,
    speed: 2.1,
    suspicion: 13,
    recovery: 3.5,
    precision: 6,
  },
  expert: {
    name: "Auditoría extrema",
    targets: 4,
    hold: 4,
    radius: 1.3,
    sight: 10,
    speed: 2.8,
    suspicion: 20,
    recovery: 2,
    precision: 8,
  },
};
const rows = [
  [
    "hit",
    "Salida sepultada",
    "Han archivado hasta la puerta. Abre un hueco entre los expedientes.",
  ],
  [
    "collect",
    "La credencial prestada",
    "Sin credencial no hay ascensor. Recupera el pase olvidado.",
  ],
  [
    "sequence",
    "El teléfono rojo",
    "La centralita exige activar sus extensiones en orden.",
  ],
  [
    "hold",
    "Correo de despedida",
    "Deja programado el mensaje antes de que corten la red.",
  ],
  [
    "delivery",
    "Valija de emergencia",
    "El carrito contiene las llaves: llévalo al punto de entrega.",
  ],
  [
    "stealth",
    "Registro sin testigos",
    "Cruza los controles marcados sin que un auditor te vea.",
  ],
  [
    "precision",
    "El sello inalcanzable",
    "Golpea los expedientes desde la marca azul, al otro lado del pasillo.",
  ],
  [
    "hit",
    "Reclamaciones acumuladas",
    "Las quejas llevan meses apiladas. Haz que por fin se caigan.",
  ],
  [
    "collect",
    "El último recibo",
    "Busca los recibos que prueban las horas extra.",
  ],
  [
    "sequence",
    "Desvío de llamadas",
    "Primero recepción, luego centralita y por último salida: sigue las luces.",
  ],
  [
    "hold",
    "Borrar el turno fantasma",
    "Mantén E en el terminal para cancelar el turno inventado.",
  ],
  [
    "delivery",
    "Paquetes devueltos",
    "Entrega las cajas que el director pretendía hacerte cargar esta noche.",
  ],
  [
    "stealth",
    "Fotocopia clandestina",
    "Recoge las copias en los puntos marcados sin ser visto.",
  ],
  [
    "precision",
    "Fuera de mi escritorio",
    "Desde la marca de tiro, derriba la pila sin acercarte.",
  ],
  [
    "hit",
    "Muro de formularios",
    "La salida de tu compañero está bloqueada por trámites.",
  ],
  [
    "collect",
    "Llaves del casillero",
    "Las llaves quedaron repartidas entre los puestos vacíos.",
  ],
  [
    "sequence",
    "Apagar la centralita",
    "Desconecta las extensiones siguiendo la numeración.",
  ],
  [
    "hold",
    "Renuncia por duplicado",
    "El sistema imprime despacio. Mantén E hasta obtener tu copia.",
  ],
  [
    "delivery",
    "Objetos personales",
    "Ayuda a llevar sus pertenencias hasta el área segura.",
  ],
  [
    "collect",
    "Nómina invisible",
    "Alguien eliminó las horas extra: recupera las copias de respaldo.",
  ],
  [
    "hit",
    "Auditoría de papel",
    "Derriba los archivadores que esconden el expediente original.",
  ],
  [
    "hold",
    "Copia de seguridad",
    "Permanece en el terminal mientras exportas los datos.",
  ],
  [
    "sequence",
    "Tres claves contables",
    "Introduce las claves en los terminales numerados.",
  ],
  [
    "precision",
    "Presupuesto por los aires",
    "Lanza desde la marca azul y tumba los presupuestos falsos.",
  ],
  [
    "stealth",
    "Testigo protegido",
    "Recorre los puntos de encuentro sin atraer a seguridad.",
  ],
  [
    "delivery",
    "Disco de respaldo",
    "Mueve el carrito de respaldo al área de transferencia.",
  ],
  [
    "collect",
    "Facturas duplicadas",
    "Localiza las facturas que explican el desvío del dinero.",
  ],
  [
    "hit",
    "Expedientes blindados",
    "El armario se atascó. Libera los documentos a bolazos.",
  ],
  [
    "hold",
    "Firma digital",
    "Mantén E mientras tu compañero valida la denuncia.",
  ],
  [
    "sequence",
    "Conciliación imposible",
    "Revisa los registros en el orden que marca la guía.",
  ],
  [
    "precision",
    "El balance no cuadra",
    "Desde la marca azul, derriba las columnas de cifras.",
  ],
  [
    "stealth",
    "Pasillo de las pruebas",
    "Transporta las pruebas entre puntos sin ser detectado.",
  ],
  [
    "delivery",
    "Archivo sobre ruedas",
    "Entrega la caja de originales en el círculo amarillo.",
  ],
  [
    "collect",
    "La cuenta secreta",
    "Reúne los fragmentos del número de cuenta.",
  ],
  [
    "hit",
    "Cierre de trimestre",
    "Tumba la montaña de pendientes que bloquea la investigación.",
  ],
  [
    "hold",
    "Envío al sindicato",
    "No sueltes E hasta que los documentos estén enviados.",
  ],
  [
    "sequence",
    "Romper la contraseña",
    "Activa los nodos numerados para abrir el registro.",
  ],
  [
    "stealth",
    "Copias fuera de horario",
    "Pasa de una estación a otra sin que te vean copiar.",
  ],
  [
    "delivery",
    "Batería de repuesto",
    "El ascensor necesita energía. Entrega la batería amarilla.",
  ],
  [
    "hold",
    "Reiniciar el generador",
    "Mantén E en el panel para recuperar la corriente.",
  ],
  [
    "sequence",
    "Fusibles cruzados",
    "Restablece los fusibles en el orden indicado.",
  ],
  [
    "collect",
    "Kit de reparación",
    "Recoge las herramientas que faltan para reparar la salida.",
  ],
  [
    "hit",
    "Repuestos atrancados",
    "Abre paso al almacén derribando las cajas de repuestos.",
  ],
  [
    "precision",
    "Interruptor remoto",
    "Desde la marca azul, derriba el bloqueo que no puedes alcanzar.",
  ],
  [
    "stealth",
    "Inspección discreta",
    "Comprueba los puntos de mantenimiento sin levantar sospechas.",
  ],
  [
    "delivery",
    "Café de emergencia",
    "Lleva los suministros al punto de reunión del equipo.",
  ],
  [
    "hold",
    "Puerta desconectada",
    "Mantén E mientras se vuelve a conectar el motor de salida.",
  ],
  [
    "sequence",
    "Ruta de ventilación",
    "Abre las válvulas siguiendo las luces numeradas.",
  ],
  [
    "collect",
    "Manual perdido",
    "Recupera las páginas del manual antes de tocar el panel.",
  ],
  [
    "hit",
    "Atasco de impresora",
    "Los pendientes impresos bloquearon el acceso. Despeja la pila.",
  ],
  [
    "precision",
    "Turno cancelado",
    "Lanza desde la marca azul contra el archivo de guardias nocturnas.",
  ],
  [
    "stealth",
    "Apagón controlado",
    "Activa las estaciones discretamente antes del corte de luz.",
  ],
  [
    "delivery",
    "Motor auxiliar",
    "Acerca el motor de repuesto al círculo de montaje.",
  ],
  [
    "hold",
    "Prueba de ascensor",
    "Mantén E hasta terminar la comprobación de seguridad.",
  ],
  [
    "sequence",
    "Cambio de circuito",
    "Conecta la línea auxiliar siguiendo la numeración.",
  ],
  [
    "collect",
    "Tornillos de la libertad",
    "Recupera las piezas necesarias para abrir la puerta.",
  ],
  [
    "hit",
    "Horas extra trituradas",
    "Derriba la última pila de órdenes antes de irte.",
  ],
];
export const MISSION_BANK = rows.map(([kind, name, story], i) => ({
  id: `encargo-${String(i + 1).padStart(2, "0")}`,
  kind,
  name,
  story,
  role: Math.floor(i / 19),
  variant: i % 3,
}));
export const STORIES = [
  {
    title: "Ni una hora más",
    opening:
      "La dirección anunció otra noche sin paga. Tu equipo decide que esta vez saldrán juntos.",
    ending:
      "La renuncia colectiva llegó antes que el próximo turno. Hoy nadie regaló otra noche.",
  },
  {
    title: "El cierre sorpresa",
    opening:
      "Mañana cierran el departamento sin avisar. Reúnan sus pertenencias y documentos antes del cierre nocturno.",
    ending:
      "Salieron con lo suyo antes del cierre del departamento. La despedida la decidieron ustedes.",
  },
  {
    title: "La nómina borrada",
    opening:
      "Las horas extra desaparecieron del sistema. Ayuda al equipo a recuperar lo necesario antes de que los auditores cierren el edificio.",
    ending:
      "El equipo ya está fuera y puede contar su versión. Ningún informe borrará las noches que trabajaron.",
  },
  {
    title: "Simulacro de obediencia",
    opening:
      "La capacitación obligatoria se convirtió en encierro. Preparen la salida mientras los auditores vigilan los pasillos.",
    ending:
      "La capacitación terminó con una lección inesperada: un equipo unido también sabe decir basta.",
  },
  {
    title: "La última guardia",
    opening:
      "Les asignaron otra guardia nocturna sin preguntar. Cada compañero tiene algo pendiente: ayúdalos y terminen el turno juntos.",
    ending:
      "Por primera vez el turno terminó a tiempo. Las luces se quedaron encendidas; ustedes no.",
  },
];
export const NAMES = [
  "Alex",
  "Mar",
  "Diego",
  "Valeria",
  "Iris",
  "Hugo",
  "Luna",
  "Mateo",
  "Sofía",
  "Leo",
  "Renata",
  "Iván",
  "Camila",
  "Bruno",
  "Elena",
  "Gael",
  "Julia",
  "Noé",
];
export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makePlan(seed) {
  const rng = random(seed),
    shuffle = (a) =>
      a
        .map((v) => ({ v, n: rng() }))
        .sort((a, b) => a.n - b.n)
        .map((x) => x.v);
  const names = shuffle(NAMES).slice(0, 3),
    tasks = [];
  for (let role = 0; role < 3; role++) {
    const pool = shuffle(MISSION_BANK.filter((m) => m.role === role)),
      chosen = [],
      kinds = new Set();
    const count = 3 + (rng() < 0.5 ? 1 : 0);
    for (const m of pool)
      if (!kinds.has(m.kind) && chosen.length < count) {
        chosen.push(m.id);
        kinds.add(m.kind);
      }
    tasks.push(chosen);
  }
  const rooms = [
    [
      [-40, 13, "Recepción"],
      [-40, -15, "Archivo muerto"],
    ],
    [
      [-20, -15, "Archivo"],
      [-20, 14, "Creatividad"],
    ],
    [
      [0, 14, "Cafetería"],
      [20, 14, "Logística"],
      [20, -15, "Sistemas"],
    ],
  ];
  const locations = rooms.map(
    (options) => options[Math.floor(rng() * options.length)],
  );
  return {
    seed,
    names,
    tasks,
    locations,
    story: STORIES[Math.floor(rng() * STORIES.length)],
  };
}
