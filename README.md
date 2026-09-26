# Renuncia definitiva · Nos vamos todos

**Tu renuncia. La de todos.**

A las 18:00, el director bloquea la salida para imponer otra noche de horas extra. Tu objetivo es rescatar a Lola, Beto y Nora, sacar las pruebas de lo que les deben, desactivar el sistema de turnos y conseguir la carta firmada. Después, todos se van por el ascensor de recepción.

Una campaña Web 3D en tercera persona con física, compañeros que siguen al jugador, auditores que patrullan, diálogos y seis capítulos. **La puntuación determina una medalla; no impide completar la historia.**

Estado: **versión local jugable y probada; publicación en GitHub Pages pendiente**. El proyecto y todo su historial Git se trasladaron a la carpeta `Examen Tema 1` indicada por el alumno. La vista previa local sirve esta misma carpeta.

![Inicio de la campaña](docs/capturas/inicio.png)

## Jugar

Desde la raíz del proyecto:

```sh
node tools/serve.cjs
```

Abre **http://127.0.0.1:4173/**. No necesitas instalar paquetes para ejecutar el juego. Alternativamente: `python -m http.server 4173 --bind 127.0.0.1`.

Se necesita teclado y mouse, un navegador con WebGL 2/WebAssembly y conexión a Internet para Three.js, Rapier y las fuentes. La interfaz se adapta a ventanas estrechas; esta versión no incluye controles táctiles. No abras `index.html` con `file://`.

## Historia y misión

| Capítulo | Qué haces | Qué cambia |
| --- | --- | --- |
| 1. Nadie se queda atrás | Habla con Lola y derriba seis archivadores en recepción | Lola te sigue; desbloqueas la bola pesada |
| 2. Las horas que nos deben | Abre el archivo con la bola y recoge la memoria USB con E | Guardas las pruebas; Beto te sigue; desbloqueas la bola de rebote |
| 3. Café para la resistencia | Lleva el carrito amarillo al círculo del generador y habla con Nora | La batería queda conectada y Nora se une |
| 4. Desconecta las horas extra | Derriba los tres servidores de TI | Desactivas el bloqueo de turnos |
| 5. Su última orden | Derriba tres oleadas de tres archivadores y recoge la carta firmada | El director autoriza la salida |
| 6. Nos vamos todos | Regresa al ascensor de recepción y pulsa E | Victoria inmediata con el equipo y las pruebas |

El HUD muestra **el paso actual**, su contador, la distancia y los compañeros reclutados. Un rombo dorado marca el destino, pequeñas marcas en el suelo indican una ruta y el minimapa permite orientarse. El mapa ampliado muestra la campaña completa.

**Victoria:** completa la historia, reúne a los tres compañeros y pulsa E en la salida con las pruebas, el generador conectado y la carta firmada. La pantalla final se abre en esa misma interacción. No espera a que se detengan los cuerpos físicos y no exige una puntuación mínima ni munición restante.

**Derrota:** se agotan los doce minutos, la sospecha llega al 100% o el personaje cae fuera del área segura. Se puede reintentar desde el principio del capítulo conservando el equipo y los objetivos de los capítulos anteriores. El reintento concede al menos tres minutos; no conserva la posición física exacta de cada objeto.

**Nueva campaña:** restablece actores, misiones, recursos, puntuación, tiempo y objetos. La potencia elegida se conserva. Pausar, abrir un diálogo, abrir el mapa o cambiar de ventana detiene la simulación y el reloj.

## Un mapa quince veces mayor

El suelo anterior medía 20 × 18 = 360 unidades². El nuevo suelo mide **100 × 54 = 5,400 unidades²: exactamente 15 veces el área**. Las dimensiones del personaje se mantienen: se amplió el espacio, no se escaló al jugador junto con el escenario.

Hay diez departamentos y cinco áreas del pasillo central: recepción, archivo muerto, archivo de evidencias, creatividad, sala de reuniones, cafetería, sistemas, logística, dirección, jardín y las cinco áreas públicas que los conectan. Las habitaciones tienen puertas reales y colliders alineados con su geometría. Las quince áreas están conectadas en la navegación.

![Mapa de la campaña](docs/capturas/mapa.png)

## Personajes, auditores y bolas

**Lola, Beto y Nora** tienen diálogo, condiciones de rescate y seguimiento físico. Usan una cuadrícula de navegación y controladores cinemáticos que respetan obstáculos. Otros cuatro empleados conversan y algunos se desplazan por sus departamentos. El director participa en la secuencia final. Dos auditores patrullan el pasillo central: diez personajes además del jugador.

Los auditores detectan dentro de un cono de hasta 7.5 unidades, con visión cercana adicional. Una consulta física comprueba si una pared interrumpe su línea de visión. Estar a la vista aumenta la sospecha; ocultarse permite reducirla. Una bola lanzada genera una distracción cercana durante unos segundos. El cono naranja dibujado apunta en la misma dirección que la detección.

| Bola | Desbloqueo | Comportamiento |
| --- | --- | --- |
| Clásica | Desde el inicio | Masa 3.2, restitución 0.38; equilibrada |
| Pesada | Rescatar a Lola | Masa 6.2, restitución 0.15 y velocidad menor; mueve carritos y pilas |
| Rebote | Ayudar a Beto | Masa 2.8, restitución 0.88 y velocidad mayor; aprovecha paredes |

Empiezas con 12 bolas. La siguiente aparece en la mano tras un breve intervalo; ya no debes volver a una sola máquina después de cada tiro. **Siete máquinas rosas recargan hasta 16 bolas**. Completar capítulos y recoger bonos repone recursos. Si necesitas disparar y te quedas sin bolas, la ruta te guía a recargar; no desvía de la salida al terminar la historia.

## Controles

| Control | Acción |
| --- | --- |
| WASD o flechas | Caminar respecto a la cámara |
| Shift | Correr |
| Arrastrar el mouse | Girar cámara y apuntar |
| Rueda | Ajustar distancia de cámara |
| F, espacio o LANZAR | Lanzar la bola |
| E | Hablar, recoger pruebas/bonos/carta, empujar, recargar o salir según contexto |
| Q | Cambiar el tipo de bola desbloqueado |
| M | Abrir/cerrar el mapa y consultar capítulos |
| P o Escape | Pausar/continuar o cerrar el diálogo/mapa |
| Deslizador POTENCIA | Modificar la velocidad real de lanzamiento |
| ♫ | Activar/desactivar sonidos sintetizados originales |

## Puntuación opcional

- Objetivo derribado: **+100**.
- Cada derribo adicional en una cadena de menos de 1.8 s entre caídas: **+25**.
- Derribo tras un rebote de la bola del tiro actual en una pared: **+50**, una vez por tiro.
- Capítulo de preparación completado: **+200**.
- Bono: **+100 y dos bolas**.
- Planta o cafetera derribada: **−150**, una sola vez por objeto; aumenta ligeramente la sospecha.

La medalla final es oro desde 4,200, plata desde 3,000 y bronce por debajo. **Incluso una puntuación negativa permite ganar si se cumple la misión.** El indicador ×N representa la longitud de la cadena, no multiplica toda la puntuación.

## R2 y R4: evidencia explícita

**R2 se cumple:** `scene.js` crea un `GLTFLoader` y carga `assets/models/campus.glb` y `assets/models/employee.glb`. El escenario renderizado procede del GLB. Sus mallas estáticas se agrupan por material después de cargarlas para reducir llamadas de dibujo; se conservan geometría, materiales y textura incrustada.

**R4 se cumple:** `employee.glb` contiene cuatro animaciones glTF reales: `Idle`, `Walk`, `Run` y `Throw`. `character.js` crea `THREE.AnimationMixer`, convierte los clips cargados en acciones con `clipAction`, mezcla sus transiciones y reproduce el estado según reposo, caminar, correr o lanzar/empujar. Son animaciones de nodos articulados incluidas en el archivo.

Consulta [la comprobación detallada de R2 y R4](docs/R2-R4.md), que incluye los lugares del código y cómo observar cada estado.

## Física y arquitectura

Three.js 0.180.0 se importa por CDN e import map; Rapier 3D Compat 0.17.3 controla gravedad −9.81, colisiones, cuerpos rígidos y un paso fijo de 1/60 s. El personaje tiene cápsula cinemática y Character Controller; sillas, archivadores, servidores, carritos, plantas, cafetera y bolas responden a la física. Los proyectiles usan detección continua de colisiones.

La potencia 25–100 cambia la velocidad base `8 + potencia × 0.17`; cada tipo de bola aplica su multiplicador. La guía punteada indica dirección y primer obstáculo, no todos los rebotes futuros.

Las bolas se crean únicamente si su volumen de salida está libre. Los bonos usan posiciones candidatas comprobadas. Las oleadas del director comprueban el volumen completo de la nueva pila antes de generarla. Los bonos flotan intencionalmente como señal visual de objeto recogible. La batería del generador se fija al quedar dentro del círculo durante 0.25 s.

```text
index.html                    Pantallas, diálogos, HUD e import map
assets/css/                   Identidad visual y HUD de campaña
assets/js/main.js             Carga y recuperación ante errores
assets/js/scene.js            GLTFLoader, escenario, luces y cámara inicial
assets/js/physics.js          Rapier, colliders y validación de espacios
assets/js/character.js        Movimiento físico y AnimationMixer del jugador
assets/js/input.js            Teclado, mouse, foco y pausa
assets/js/props.js            Objetos, bolas, bonos y oleadas
assets/js/campaign.js         Historia, personajes y tipos de bola
assets/js/navigation.js       Rutas de compañeros y guía al objetivo
assets/js/crowd.js            Actores, seguimiento y auditores
assets/js/game.js             Estados, capítulos, física, puntos y checkpoints
assets/js/ui.js               Diálogos, minimapa y resultados
assets/js/audio.js            Sonidos originales mediante Web Audio
assets/models/                Campus/empleado GLB y datos del mapa
assets/licenses/              Licencias externas
tools/build_campus.py         Generador reproducible del escenario ampliado
tools/generate_assets.py      Escritor GLB y generador del personaje
tools/serve.cjs               Servidor local sin instalación adicional
tests/smoke.cjs               Pruebas reales en navegador
docs/                        Capturas, verificación y guía del examen
```

Para regenerar los modelos: `python tools/build_campus.py`. Usa solo la biblioteca estándar de Python. `office.glb` y sus datos antiguos se conservan como referencia de la versión inicial; el juego actual carga `campus.glb`.

## Verificación

```sh
npm ci
npx playwright install chromium
npm test
```

En Windows puede usarse Edge instalado con `TEST_BROWSER=msedge`. La suite sirve una subruta `/renuncia-definitiva/` para comprobar rutas compatibles con GitHub Pages. Utiliza navegador real, GLTFLoader, AnimationMixer y Rapier. Recorre los capítulos con colisiones reales; prepara posiciones para acortar los traslados y utiliza escenarios específicos para tiempo, puntos negativos y puntos de control. No sustituye una partida manual del alumno.

El informe vigente está en [docs/verificacion.json](docs/verificacion.json). Se incluyen pruebas de área 15×, conexión de los departamentos, diálogos, seguimiento físico, derribos, batería, auditores, mapa, tipos de bola, final inmediato, reinicio y ausencia de errores críticos. Las capturas del juego están en `docs/capturas/`.

![Partida en tercera persona](docs/capturas/partida.png)

## Publicación y entrega

El historial Git de la primera versión se preservó completo y se añadieron los commits de esta ampliación. **El remoto y la URL pública de GitHub Pages siguen pendientes.**

1. Crea un repositorio público vacío y vincúlalo desde esta carpeta con `git remote add origin URL-REAL-DEL-REPOSITORIO`.
2. Sube el historial con `git push -u origin main`.
3. En GitHub: Settings → Pages → Deploy from a branch → main → /(root).
4. Prueba la URL publicada, incluyendo modelos, movimiento, victoria, derrota y reinicio. Registra esa URL y la del repositorio en este README.
5. Completa las conclusiones personales del examen y conserva una versión final identificada.

El proyecto utiliza rutas relativas y `.nojekyll`. Consulta [la guía del examen](docs/GUIA-DEL-EXAMEN.md) para distinguir los requisitos implementados de la validación pública pendiente.

## Créditos y uso de IA

El mapa, el personaje, las animaciones, los objetos, la textura incrustada y los sonidos se crearon específicamente para este proyecto con asistencia de IA; se incluyen sus fuentes. No se descargaron modelos de terceros.

| Dependencia | Autor/fuente | Licencia |
| --- | --- | --- |
| Three.js, GLTFLoader y utilidades | [Three.js contributors](https://github.com/mrdoob/three.js) | [MIT](assets/licenses/three-MIT.txt) |
| Rapier 3D | [Dimforge](https://github.com/dimforge/rapier.js) | [Apache 2.0](assets/licenses/rapier-Apache-2.0.txt) |
| DM Sans | [DM Sans Project Authors](https://github.com/googlefonts/dm-fonts) | [SIL OFL](assets/licenses/DM-Sans-OFL.txt) |
| Space Grotesk | [Space Grotesk Project Authors / Florian Karsten](https://github.com/floriankarsten/space-grotesk) | [SIL OFL](assets/licenses/Space-Grotesk-OFL.txt) |
| Playwright, desarrollo | [Microsoft](https://github.com/microsoft/playwright) | Apache 2.0, incluida en el paquete |

La IA ayudó con arquitectura, programación, modelos, interfaz, navegación y pruebas. La ampliación responde a la revisión del alumno: propósito poco claro, soledad, mapa pequeño y falta de retroalimentación final. Se sustituyó el bloqueo por puntuación por una progresión narrativa explícita y una salida inmediata.

Antes de entregar, el alumno debe probar y explicar los módulos, registrar los ajustes que haga personalmente y redactar sus propias conclusiones. No se presentan como realizadas esas actividades personales que todavía no ha confirmado.
