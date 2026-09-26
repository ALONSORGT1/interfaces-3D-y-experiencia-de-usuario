# Renuncia definitiva · Boliche de oficina

**Tu último día. Su peor lunes.**

Videojuego Web 3D en tercera persona. Recorre una oficina, busca el mejor ángulo y derriba las torres de pendientes del jefe con una bola de boliche. Mueve sillas, utiliza carritos como proyectiles secundarios y recoge bonos. Las plantas y la cafetera no tienen la culpa: dañarlas resta puntos.

**Estado: v0.9 — versión local jugable y probada; publicación pública pendiente.** El repositorio local conserva los commits reales de construcción. La aplicación no requiere compilación ni servidor de aplicación, solo alojamiento estático.

![Pantalla inicial de Renuncia definitiva](docs/capturas/inicio.png)

## Jugar localmente

Necesitas un navegador con WebGL 2 y WebAssembly, conexión a Internet para las dependencias CDN, teclado y mouse. La interfaz se adapta a pantallas estrechas, pero esta versión no incluye joystick táctil.

Desde esta carpeta, ejecuta una de estas opciones:

```sh
# Node.js; no hace falta instalar paquetes para jugar.
node tools/serve.cjs

# Alternativa con Python 3.
python -m http.server 4173 --bind 127.0.0.1
```

Abre **http://127.0.0.1:4173/** y pulsa **Presentar mi renuncia**. No abras `index.html` con `file://`: los módulos y modelos necesitan servirse por HTTP. Si el puerto está ocupado, detén el servidor anterior o configura `PORT` al ejecutar el servidor Node.

## Misión y reglas

- Hay **18 archivadores**, distribuidos en **tres torres** de seis piezas.
- Dispones de **ocho lanzamientos**. La primera bola ya está en tu mano.
- Ganas cuando derribas los 18 archivadores y consigues **al menos 1,800 puntos**.
- Después de lanzar, acércate a la **máquina rosa**, junto al punto inicial, y pulsa **E** para recargar. Recargar no aumenta los lanzamientos disponibles.
- Al agotarse los lanzamientos, la simulación espera a que la escena se estabilice durante 1.5 segundos, tras un mínimo de tres segundos desde el último tiro. Hay un límite de espera de 24 segundos para evitar bloqueos por objetos que siguen vibrando.
- Si quedan archivadores en pie, pierdes. Si derribaste todos y faltan puntos, puedes recoger los bonos existentes cuando basten para alcanzar la meta, o pulsar E fuera de otra interacción para terminar el turno. Si los bonos disponibles no bastan, se declara derrota.
- Una caída accidental fuera del escenario también termina la partida.
- Victoria y derrota ofrecen reinicio completo sin recargar la página. La potencia configurada se conserva entre intentos; los objetos, puntos, lanzamientos, penalizaciones y tiempo se reinician.

### Puntuación

| Evento | Puntos |
| --- | ---: |
| Archivador derribado o desplazado suficientemente | +100 |
| Cada derribo adicional en una cadena con menos de 1.8 s entre caídas | +25 |
| Derribo después de un rebote de la bola del lanzamiento actual en una pared | +50, una vez por lanzamiento |
| Bono recogido con E | +100 |
| Planta o cafetera derribada/desplazada | −150, una vez por objeto |

El contador **×N** muestra la longitud de la cadena; no multiplica todos los puntos. Un archivador cuenta al inclinarse más de aproximadamente 44°, bajar 0.32 unidades respecto a su posición estable o desplazarse horizontalmente más de 0.85. Los objetos protegidos se penalizan con los mismos criterios de caída y un desplazamiento horizontal de más de 0.7.

### Controles

| Control | Acción |
| --- | --- |
| WASD o flechas | Caminar respecto a la orientación de la cámara |
| Shift | Correr |
| Arrastrar el mouse sobre la escena | Girar cámara y dirección del lanzamiento |
| Rueda del mouse | Acercar/alejar cámara |
| F, espacio o botón LANZAR | Lanzar la bola |
| E | Recoger bono, recargar o empujar una silla/carrito cercano |
| P o Escape | Pausar/continuar |
| Deslizador POTENCIA | Cambiar la velocidad inicial real de la bola |
| Botón ? | Ayuda; pausa la partida mientras está abierta |
| Botón ♫ | Activar/desactivar sonidos originales sintetizados |

Las teclas de movimiento no se capturan mientras editas un control de formulario. Haz clic en la escena para devolverle el foco. Al cambiar de ventana, la partida se pausa automáticamente.

## Diseño y física

La oficina y el empleado son **modelos GLB originales**, creados para este proyecto con `tools/generate_assets.py`. El GLB de la oficina contiene materiales y una textura de alfombra incrustada. El empleado incluye clips glTF articulados **Idle, Walk, Run y Throw**, reproducidos y mezclados mediante `AnimationMixer`; no utiliza un esqueleto humano descargado.

Rapier utiliza gravedad de −9.81 y un paso fijo de 1/60 s. El personaje tiene un cuerpo cinemático, collider de cápsula y Character Controller; el movimiento considera obstáculos y puede transmitir impulsos a cuerpos dinámicos. Su representación visual se sincroniza después de cada paso físico.

Los colliders estáticos se generan junto con la oficina y se guardan en `office-colliders.json`. Los lados abiertos de la maqueta tienen límites físicos; la cámara puede ver a través de esos límites invisibles. Para las paredes y muebles sólidos, el seguimiento reduce su distancia cuando una consulta de rayos detecta un obstáculo.

Hay archivadores, sillas, carritos, plantas, cafetera y bolas con cuerpos rígidos dinámicos, densidades, fricción y formas diferentes. Sillas y carritos usan colliders compuestos. Los proyectiles emplean detección continua de colisiones y una masa de 3.2. La potencia entre 25 y 100 determina una velocidad horizontal de `8 + potencia × 0.17` unidades por segundo: **12.25 a 25**. La guía punteada indica la dirección y el primer obstáculo; no predice todos los rebotes.

Cada lanzamiento genera una bola únicamente si su volumen de salida está libre y dentro del área válida. Antes de comprobarlo se actualizan las consultas espaciales, incluso si acaba de crearse otro objeto en el mismo fotograma. Los bonos aparecen al iniciar, al completar torres y durante la partida, con posiciones candidatas verificadas. Su flotación y rotación son intencionales para distinguirlos como objetos recogibles; no bloquean al jugador.

## Tecnologías y estructura

- HTML, CSS y JavaScript modular. Diseño responsivo propio, equivalente al uso opcional de Bootstrap.
- Three.js **0.180.0**, mediante CDN e import map; GLTFLoader y AnimationMixer.
- Rapier 3D Compat **0.17.3**, mediante CDN, con WebAssembly integrado en el paquete.
- Web Audio API para sonidos originales. No hay backend ni almacenamiento de datos personales.
- Git para el historial; compatible con GitHub Pages desde la raíz de `main`.

```text
index.html                 Pantallas y HUD; import map
assets/
  css/styles.css           Diseño y adaptación de tamaños
  js/main.js               Carga y recuperación de errores
  js/scene.js              Renderizador, luces, GLB, presentación
  js/physics.js            Rapier, colliders fijos, validación de espacio
  js/character.js          Personaje, cuatro animaciones, cámara
  js/input.js              Teclado, mouse, foco y pausa automática
  js/props.js              Objetos dinámicos, proyectiles, bonos
  js/game.js               Misión, estados, puntuación y ciclo físico
  js/ui.js                 HUD, mensajes, ayuda y pantallas finales
  js/audio.js              Sonidos sintetizados
  models/                  Dos GLB originales y colliders
  textures/                Icono original
  licenses/                Licencias de dependencias y tipografías
tools/generate_assets.py   Fuente reproducible de los modelos originales
tools/serve.cjs            Servidor estático local
tests/smoke.cjs            Pruebas de integración en navegador
docs/                     Guía del examen, informe y capturas
```

## Pruebas

La suite utiliza un navegador real con WebGL y Rapier. No simula las colisiones con funciones falsas. Combina controles de interfaz con escenarios de prueba preparados mediante `?test=1`; ese parámetro expone `window.__game` solo para desarrollo. Los escenarios preparados acortan desplazamientos o establecen condiciones límite y no sustituyen una partida completa realizada por el alumno.

```sh
npm ci
npx playwright install chromium
npm test
```

En Windows también puede utilizarse Edge ya instalado, definiendo `TEST_BROWSER=msedge`. El servidor de pruebas usa el puerto 4174 y la subruta `/renuncia-definitiva/` para detectar rutas incompatibles con Pages. Genera capturas y un informe en `test-results/`, excluido de Git. El informe conservado de la verificación local está en [docs/verificacion.json](docs/verificacion.json).

Se comprueban carga, cuatro clips, movimiento, cámara, límites y escritorios sólidos, lanzamiento y derribo, recarga, bonos, empuje, efecto de potencia, generación bloqueada por obstáculos, pausa, ayuda, victoria, derrota, reinicios, generación durante la partida, penalización única, recogida del último bono, interfaz estrecha y recuperación ante fallo de CDN. Consulta [la guía de validación](docs/GUIA-DEL-EXAMEN.md) para las comprobaciones manuales restantes.

![Partida en tercera persona](docs/capturas/partida.png)

## Publicar en GitHub Pages

**Todavía no se ha creado ni vinculado un repositorio remoto. No hay una URL pública verificada.**

1. Crea un repositorio público vacío en tu cuenta, por ejemplo `renuncia-definitiva`, sin inicializar otro README.
2. Desde esta carpeta vincula el remoto y sube el historial existente:

   ```sh
   git remote add origin https://github.com/TU-USUARIO/renuncia-definitiva.git
   git push -u origin main
   ```

3. En el repositorio, abre **Settings → Pages → Deploy from a branch → main → /(root)**.
4. Cuando finalice el despliegue, abre la URL que muestre GitHub Pages. No entregues la dirección `localhost`.
5. Prueba inicio, movimiento, lanzamiento, victoria, derrota y reinicio desde esa URL, y revisa Console y Network.
6. Registra aquí la URL real del repositorio y de la aplicación, y crea el commit final de producción después de verificarla. La versión v1.0 queda reservada para esa entrega publicada.

El archivo `.nojekyll` permite servir el proyecto estático directamente. Los archivos propios utilizan rutas relativas y respetan mayúsculas/minúsculas. La conexión a CDN sigue siendo necesaria para Three.js, Rapier y las tipografías.

## Créditos y recursos externos

| Recurso | Autor/fuente | Licencia |
| --- | --- | --- |
| Oficina, empleado, cuatro clips, textura incrustada, objetos y sonidos | Creados específicamente para este proyecto con asistencia de IA; fuentes incluidas | Recursos originales del proyecto, sin modelos de terceros |
| Three.js y GLTFLoader | [Three.js contributors](https://github.com/mrdoob/three.js) | [MIT](assets/licenses/three-MIT.txt) |
| Rapier 3D | [Dimforge](https://github.com/dimforge/rapier.js) | [Apache 2.0](assets/licenses/rapier-Apache-2.0.txt) |
| DM Sans | [DM Sans Project Authors](https://github.com/googlefonts/dm-fonts) | [SIL OFL 1.1](assets/licenses/DM-Sans-OFL.txt) |
| Space Grotesk | [Space Grotesk Project Authors / Florian Karsten](https://github.com/floriankarsten/space-grotesk) | [SIL OFL 1.1](assets/licenses/Space-Grotesk-OFL.txt) |
| Playwright, solo desarrollo | [Microsoft](https://github.com/microsoft/playwright) | Apache 2.0; licencia incluida en su paquete npm |

Referencias técnicas: [Character Controller de Rapier](https://rapier.rs/docs/user_guides/javascript/character_controller/), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) y [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).

## Uso de IA y reflexión del alumno

Se utilizó IA para plantear la arquitectura, escribir los módulos, generar recursos 3D originales, integrar física y animaciones, diseñar la interfaz y preparar pruebas y documentación. Durante esta construcción asistida se corrigieron la cámara obstruida por límites invisibles, la consulta espacial desactualizada al generar objetos y el tratamiento del último lanzamiento y de los bonos pendientes.

**La comprensión, revisión y conclusión personal del alumno todavía deben realizarse.** No se afirma que el alumno ya haya hecho ajustes manuales o aprendido algo que no ha confirmado. Antes de entregar, completa con tus palabras:

- Qué módulos revisaste y qué cambiaste manualmente.
- Cómo funciona el lanzamiento y por qué la potencia cambia su resultado.
- Cómo se detecta un derribo sin puntuar dos veces.
- Qué problema encontraste al probar y cómo lo resolviste.
- Qué aprendiste y qué mejorarías en una siguiente versión.

La [guía del examen](docs/GUIA-DEL-EXAMEN.md) relaciona los requisitos con los archivos y señala las verificaciones que faltan antes de la entrega pública.
