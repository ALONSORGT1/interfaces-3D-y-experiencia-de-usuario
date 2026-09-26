# Guía de revisión y entrega

Esta guía distingue lo implementado y probado localmente de la evidencia pública que aún falta. No sustituye las conclusiones personales del alumno.

## Requisitos técnicos

| ID | Implementación | Evidencia / revisión |
| --- | --- | --- |
| R1 | Three.js por CDN e import map | `index.html`, `scene.js`; escena real renderizada |
| R2 | Oficina y personaje cargados desde GLB | `scene.js`, `assets/models`; materiales y alfombra con textura incrustada |
| R3 | Seguimiento en tercera persona, órbita y zoom | `character.js`, `input.js`; rayos para evitar obstáculos de cámara |
| R4 | Idle, Walk, Run y Throw en AnimationMixer | Cuatro clips glTF originales; `character.js` |
| R5 | Rapier: gravedad, colliders y rigid bodies | `physics.js`; personaje con cápsula y Character Controller |
| R6 | Más de cuatro tipos de objetos | Archivadores, sillas, carritos, plantas, cafetera y bolas |
| R7 | Tres agrupaciones derribables | Seis cuerpos rígidos por torre; 18 objetivos |
| R8 | Bola a distancia con impacto físico | `game.js`, `props.js`; impulso inicial y CCD |
| R9 | Potencia funcional | 25–100 cambia la velocidad real; prueba compara extremos |
| R10 | Bolas y bonos generados durante el juego | Volumen de salida y candidatos libres comprobados; prueba de obstáculo |
| R11 | HUD y diseño responsivo propio | HTML/CSS; botones, ayuda, slider y mensajes; prueba a 390 px |
| R12 | Repositorio e historial | Historial Git local real; **falta subirlo a un repositorio público** |
| R13 | Preparado para GitHub Pages | Subruta probada y `.nojekyll`; **falta despliegue y validación pública** |

## Reglas de negocio

| Reglas | Dónde y cómo se cumplen |
| --- | --- |
| RN-01, 02 | Pantalla inicial, botón explícito y misión visible; `Game.start/reset` |
| RN-03 | Suelo, muros, escritorio y límites físicos; pruebas de avance contra sólidos |
| RN-04 | Movimiento relativo a cámara y selección de clips según acción |
| RN-05 | Paso físico fijo, materiales físicos diferentes y objetos dinámicos |
| RN-06 | Lanzar, empujar, recoger y recargar; contextos de E |
| RN-07, 08 | Lanzamiento visible, colisiones y slider conectado a velocidad |
| RN-09 | Comprobación de límites y solapamientos antes de generar |
| RN-10 | Puntos, objetivos, tiros, cadena y barra de progreso |
| RN-11 | 18 objetivos y al menos 1,800 puntos; pantalla de victoria |
| RN-12 | Tiros agotados sin misión cumplida, o caída; pantalla de derrota |
| RN-13 | Reinicio elimina objetos creados, reconstruye torres y restablece variables |
| RN-14 | HUD, mensajes, ayuda y controles; pausa al perder foco |
| RN-15 | Rutas verificadas localmente bajo un prefijo de repositorio; **validación en URL pública pendiente** |

## Antes de entregar

- Juega tú una partida completa usando únicamente teclado y mouse. Las pruebas automatizadas también preparan escenarios para verificar casos límite; no sustituyen tu revisión.
- Confirma que esta oficina es distinta del escenario de tu práctica 1.5. No se proporcionó esa práctica para compararla.
- Cambia potencia y posición: observa cómo afectan a un tiro contra cada torre.
- Intenta atravesar muros, escritorios, archivadores y límites.
- Empuja un carrito hacia una torre; recoge un bono y recarga en la máquina.
- Provoca una penalización y comprueba que no se repite por el mismo objeto.
- Fuerza victoria y derrota; reinicia desde ambas pantallas.
- Lee `game.js`, `character.js` y `physics.js` hasta poder explicar sus decisiones.
- Completa los ajustes manuales y conclusiones personales en el README y en tu plataforma de entrega.
- Crea el repositorio público, conserva los commits y publica `main` desde la raíz en GitHub Pages.
- Verifica en la URL pública los archivos GLB, scripts, textura y fuentes; revisa Console y Network.
- Añade las URLs reales al README. Verifica esa versión, crea el commit final y entrega esas mismas URLs.

## Alcance de esta versión

Un escenario, tres torres, un personaje, ocho tiros y una misión completa. No incluye multijugador, editor, guardado de partidas ni controles táctiles. El sonido viene apagado y se activa por elección del jugador. Los modelos glTF usan animación de nodos articulados, no un rig humano con skinning; `AnimationMixer` reproduce los cuatro clips reales.

La guía de puntos marca dirección y obstáculo, no una trayectoria física futura exacta. Los cuerpos rígidos pueden seguir oscilando después de un golpe; por eso la resolución del último tiro combina un intervalo de estabilización con un límite de espera.

El proyecto necesita Internet para las librerías fijadas en el import map. Si falla la carga, la interfaz informa del problema y permite reintentar. La versión se ha probado en Edge/Chromium; aún corresponde verificarla en el navegador y equipo de evaluación.
