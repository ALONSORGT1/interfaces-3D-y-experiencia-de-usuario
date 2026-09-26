// Story objectives deliberately do not depend on score or random bonus drops.
export const CAMPAIGN = [
  {id:'lola',name:'Nadie se queda atrás',zone:'Recepción',kind:'rescue',point:[-36,10],color:'#d6a96d',npc:'lola',brief:'Lola quedó atrapada tras la barricada. Habla con ella y derriba los seis archivadores.',reward:'Lola se une · Bola pesada desbloqueada'},
  {id:'archive',name:'Las horas que nos deben',zone:'Archivo',kind:'evidence',point:[-20,-18],color:'#c6aa6b',npc:'beto',brief:'Beto guardó las pruebas de las horas extra. Derriba el archivo y recoge la memoria USB.',reward:'Beto se une · Bola de rebote desbloqueada'},
  {id:'cafe',name:'Café para la resistencia',zone:'Cafetería',kind:'delivery',point:[0,15],color:'#c88975',npc:'nora',brief:'Lleva el carrito amarillo al círculo del generador. Después habla con Nora.',reward:'Nora se une · El equipo ya está completo'},
  {id:'servers',name:'Desconecta las horas extra',zone:'Sistemas / TI',kind:'servers',point:[20,-19],color:'#8aabbc',brief:'Derriba los tres servidores antes de que vuelvan a asignarte otro turno.',reward:'El bloqueo de la salida queda desactivado'},
  {id:'director',name:'Su última orden',zone:'Dirección',kind:'boss',point:[40,-18],color:'#d1b469',brief:'Supera tres oleadas de burocracia. Después recoge la carta firmada en el escritorio.',reward:'Carta firmada · Salida autorizada'},
  {id:'exit',name:'Nos vamos todos',zone:'Recepción / salida',kind:'exit',point:[-44,23],color:'#aaca85',brief:'Regresa al ascensor y pulsa E. Tu equipo sale contigo. La puntuación solo decide la medalla.',reward:'Renuncia colectiva aceptada'},
];
export const NPCS = [
  {id:'lola',name:'LOLA',role:'Recepción',position:[-39,14],color:'#bd7669',line:'El director bloqueó el edificio para otra noche de horas extra. Tira esos archivos y salimos juntos.'},
  {id:'beto',name:'BETO',role:'Contabilidad',position:[-23,-20],color:'#7695b6',line:'No basta con renunciar: hay que llevarnos las pruebas. La memoria está al fondo del archivo.'},
  {id:'nora',name:'NORA',role:'Mantenimiento',position:[4,17],color:'#b891bc',line:'El generador necesita esa batería. Empuja el carrito amarillo hasta el círculo y yo me encargo del resto.'},
  {id:'director',name:'EL DIRECTOR',role:'Una última cosa…',position:[40,-25.5],color:'#566477',line:'¿Renunciar? Primero tendrán que terminar estos pendientes. Y estos. Y estos otros.'},
  {id:'extra1',name:'DANI',role:'Diseño',position:[-24,16],color:'#709f8f',line:'¿Una renuncia colectiva? Me apunto. Cuidado: los auditores patrullan el pasillo.'},
  {id:'extra2',name:'LUIS',role:'Logística',position:[24,16],color:'#ae9768',line:'Las bolas pesadas mueven carritos. Las de rebote son mejores para disparar alrededor de las esquinas.'},
  {id:'extra3',name:'SARA',role:'Reuniones',position:[3,-16],color:'#b78291',line:'Llevo tres reuniones sin agenda. Si desactivan los servidores, nadie podrá convocar otra.'},
  {id:'extra4',name:'OMAR',role:'Jardín',position:[40,17],color:'#7e9c65',line:'Desde aquí vi al director esconder la carta en su escritorio. La salida está en recepción.'},
];
export const BALL_MODES = [
  {id:'normal',name:'CLÁSICA',mass:3.2,restitution:.38,speed:1,color:'#c87869',description:'Equilibrada: control y derribos.'},
  {id:'heavy',name:'PESADA',mass:6.2,restitution:.15,speed:.82,color:'#657b8b',description:'Más masa para mover carritos y pilas.'},
  {id:'bounce',name:'REBOTE',mass:2.8,restitution:.88,speed:1.08,color:'#c4a355',description:'Rebota con fuerza en paredes y muebles.'},
];
