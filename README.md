# Renuncia definitiva · Nos vamos todos

**Tu renuncia. La de todos.** Videojuego web 3D de exploración, rescate y boliche de oficina: libera a tres compañeros y salgan por el ascensor antes del cierre nocturno.

- **Repositorio:** https://github.com/ALONSORGT1/interfaces-3D-y-experiencia-de-usuario
- **GitHub Pages:** https://alonsorgt1.github.io/interfaces-3D-y-experiencia-de-usuario/
- **Versión:** v1.1. El juego se desarrolló y verificó localmente antes de su publicación inicial. Se conserva el historial original, sus fechas y sus etapas reales; la numeración no pretende representar diez entregas públicas sucesivas.

![Escenario y partida](docs/capturas/partida.png)

## Historia, misión y reglas

El director impide salir del corporativo. Cada fuga sortea uno de cinco contextos: horas extra, cierre de departamento, nómina borrada, capacitación obligatoria o guardia nocturna. Cambian los nombres y departamentos de tus compañeros y los encargos necesarios para ayudarlos.

- Completa **3–4 encargos por compañero**, rescata a los tres y llega al ascensor. Hay 9–12 encargos por fuga y un límite de **12 minutos**.
- El banco contiene **57 situaciones** sobre siete mecánicas: derribo, recogida, secuencia, terminal mantenido, entrega de carrito, sigilo y tiro desde una marca. No son 57 minijuegos diferentes. [Catálogo](docs/ENCARGOS.md).
- Lanza bolas con potencia regulable, aprovecha rebotes, empuja carritos y recoge bonos. Las bolas pesada y de rebote se desbloquean con los rescates.
- Evita a los auditores: la sospecha aumenta cuando te ven y disminuye al ocultarte. Las bolas pueden distraerlos. Dañar plantas o cafeteras penaliza puntos y aumenta sospecha.
- Los compañeros rescatados siguen al jugador sin bloquearlo. Puedes ordenarles esperar; durante entregas dejan espacio automáticamente.
- **Victoria:** completa los rescates y pulsa E frente a la cabina. El final aparece inmediatamente; la puntuación solo determina una medalla y no bloquea la salida.
- **Derrota:** tiempo agotado, sospecha al 100% o caída fuera del área segura. Puedes reintentar desde el último encargo; se conservan dificultad, combinación y progreso anterior, con al menos tres minutos disponibles.
- **Nueva fuga:** reinicia objetos, equipo, tiempo y progreso y sortea otra combinación. Los puntos de control son de la sesión; no persisten al cerrar la página.

Se elige **Tranquila, Normal o Auditoría extrema** antes de iniciar. La dificultad modifica blancos, tiempo de terminal, tolerancia de entrega, distancia de tiro y visión/velocidad de los auditores. Pausa, mapa, diálogos y pérdida de foco detienen la simulación.

## Controles de teclado y mouse

| Control | Acción |
| --- | --- |
| WASD / flechas | Caminar respecto a la cámara |
| Shift | Correr |
| J | Saltar |
| Arrastrar mouse / rueda | Girar y apuntar / ajustar distancia de cámara |
| F / Espacio / LANZAR | Lanzar bola |
| E | Hablar, recoger, empujar, recargar, activar o salir; mantener en terminales |
| Q | Cambiar tipo de bola desbloqueado |
| V | Alternar primera y tercera persona |
| H | Ordenar al equipo esperar o seguir |
| M | Abrir/cerrar mapa |
| P / Escape | Pausar o cerrar diálogo/mapa |
| Deslizador POTENCIA | Cambiar velocidad de lanzamiento |
| Botón ♫ | Activar/desactivar sonido |

## Implementación

**Tecnologías:** HTML, CSS propio y JavaScript con módulos; Three.js 0.180.0, Rapier 3D Compat 0.17.3 y Web Audio. No usa Bootstrap ni necesita compilación. Node sirve el proyecto y Playwright verifica el navegador; Python genera los recursos originales.

**Personaje y animaciones:** GLTFLoader carga `employee.glb`. AnimationMixer administra cuatro clips reales: `Idle`, `Walk`, `Run` y `Throw`, ligados a reposo, caminar, correr y lanzar/empujar. Hay compañeros, empleados, director y dos auditores. [Evidencia R2/R4](docs/R2-R4.md).

**Escenario:** `campus.glb`, 100 × 54 unidades y quince áreas conectadas, con escritorios, mesas, impresoras, sofás, plantas, mamparas y ascensor. Es quince veces el área de la oficina inicial. Usa madera, concreto, alfombra, pintura, vidrio y metal; doce mapas PBR locales compartidos (~1.16 MB), UVs a escala, luces ambientales, sombras suaves y reflejos. [Materiales y rendimiento](docs/RENOVACION-VISUAL.md).

La v1.1 cierra el edificio con un **techo de 7.2 m**, vigas, paneles acústicos y 25 lámparas suspendidas. Tres lámparas se apagan y encienden suavemente en ciclos de 28 segundos; el resto mantiene iluminación estable. La preferencia del sistema de movimiento reducido deja todas encendidas. El techo tiene collider y se oculta únicamente en la vista aérea del menú.

**Física y colisiones:** gravedad −9.81, paso fijo 1/60 s, cápsula con controlador, salto y colliders simples para suelo, paredes y mobiliario. Archivadores, sillas, carritos, plantas, cafetera y bolas usan cuerpos físicos. Las bolas tienen CCD para evitar atravesar sólidos. El ascensor bloquea con la puerta cerrada; los compañeros no bloquean las maniobras. Se comprueba el espacio antes de generar objetos.

**Mecánica, HUD y efectos:** potencia de 25–100, tres tipos de bola, impactos, rebotes, cadenas, bonos y penalizaciones. La franja superior indica misión, acción y tecla; el HUD muestra progreso, tiempo, sospecha, munición y puntos. Incluye mapa, guía al destino, diálogos, sonidos sintetizados, pantallas de inicio/victoria/derrota y reintento. La interfaz es adaptable, pero el juego requiere teclado y mouse; no tiene controles táctiles ni multijugador.

## Estructura básica

```text
index.html              Entrada, pantallas, HUD e import map
assets/css/             Estilos de la interfaz
assets/js/              Escena, jugador, física, objetos, misiones, IA de actores y UI
assets/models/          Escenario/personaje GLB y datos de colisión
assets/textures/pbr/     Texturas WebP y registro de procedencia
assets/licenses/        Licencias de dependencias y fuentes
tools/                  Servidor local y generadores de recursos
tests/                  Pruebas de misiones, controles y física
docs/                   Guía, créditos técnicos, capturas e informes
```

## Ejecución local

Desde la raíz, con Node instalado:

```sh
node tools/serve.cjs
```

Abre **http://127.0.0.1:4173/**. No se requiere instalar paquetes para jugar. Alternativa: `python -m http.server 4173 --bind 127.0.0.1`.

Se requiere un navegador con WebGL 2/WebAssembly y conexión para las bibliotecas CDN y Google Fonts. Modelos y texturas se sirven desde el proyecto. No abras `index.html` mediante `file://`.

## Verificación y publicación

```sh
npm ci
npx playwright install chromium
npm test
```

Las pruebas locales comprueban una subruta compatible con Pages, modelos, animaciones, controles, 399 combinaciones de encargo/ubicación/dificultad, una fuga completa, victoria, derrota, reintento, HUD y colisiones. Preparan posiciones y tiempos para repetir casos; no equivalen a una partida humana completa. Los informes locales anteriores están en [docs/verificacion.json](docs/verificacion.json).

Para ejecutar las mismas pruebas **sobre el sitio publicado**, en PowerShell:

```powershell
$env:TEST_URL = 'https://alonsorgt1.github.io/interfaces-3D-y-experiencia-de-usuario/'
$env:TEST_BROWSER = 'msedge' # Opcional si Edge está instalado
npm test
Remove-Item Env:TEST_URL
```

Los informes se guardan en `test-results/` con la URL comprobada. Esa carpeta está excluida de Git; los informes locales históricos no se presentan como pruebas de la web publicada.

GitHub Pages se publica desde **Settings → Pages → Deploy from a branch → main → /(root)**. La entrada es `index.html`; se conserva `.nojekyll` y todas las rutas del juego son relativas. No se requiere un proceso de build. [Instrucciones oficiales](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### Desarrollo del proyecto

Las etapas siguientes corresponden al historial real. No se fabricaron commits v0.7/v0.8 ni se reescribieron fechas para llenar una secuencia. El historial local se publica junto en un único push inicial.

| Versión | Etapa | Evidencia funcional |
| --- | --- | --- |
| v0.1 | Estructura base | Escena Three.js e interfaz inicial (`c0e7293`) |
| v0.2 | Escenario y cámara | Oficina GLB, materiales y luces (`71687d8`) |
| v0.3 | Personaje y física | Cuatro clips, cámara y colisiones Rapier (`2d5ee00`) |
| v0.4 | Objetos interactivos | Torres, sillas, carritos y bonos (`64af334`) |
| v0.5 | Mecánica principal | Lanzamiento, potencia, puntos y estados (`f0a6f6f`) |
| v0.6 | Correcciones | Cámara, generación sin solapamientos y pruebas (`4aae253`) |
| v0.9 | Documentación inicial | Licencias, capturas y verificación local (`18520ba`) |
| v0.10 | Campaña y mapa ampliado | Corporativo 15×, compañeros y misiones (`626491d`) |
| v0.11 | Validación de campaña | Seguimiento y evidencia R2/R4 (`ec92dc0`) |
| v0.12 | Variedad y dificultad | 57 encargos, cámaras y equipo sin bloqueos (`bdc44f7`) |
| v0.13 | Renovación visual | Texturas PBR, iluminación y colisiones verificadas (`194c60c`) |
| v0.14 | Verificación de publicación | Pruebas reutilizables contra una URL y registro del destino |
| v1.0 | Entrega y publicación | README final, créditos, URLs y preparación para Pages |
| v1.1 | Techo e iluminación interior | Cubierta alta con colisión y luminarias suspendidas con ciclos suaves |

### Uso de Inteligencia Artificial

La IA asistió en programación, generación de modelos/animaciones, interfaz, navegación, materiales, pruebas y preparación de publicación. Ayudó a resolver problemas reportados por el alumno: mapa pequeño, objetivos poco visibles, demora en el final, compañeros que estorbaban y apariencia plana.

**Intervención humana confirmada:** el alumno eligió el concepto, jugó versiones, describió fallos y definió los cambios de historia, dificultad y diseño. No existe evidencia suficiente para atribuirle código o configuraciones escritos manualmente; los ajustes de esta sesión se realizaron con asistencia de IA. Las conclusiones personales corresponden al alumno.

**Correcciones posteriores:** el final pasó a depender de rescates y salida inmediata; los compañeros dejaron de bloquear maniobras; se corrigieron UVs que estiraban texturas, incompatibilidades al agrupar geometrías y penetración transitoria de bolas en el piso. Las pruebas también requirieron ubicar correctamente un caso de aterrizaje y distinguir deslizarse alrededor de una maceta de atravesarla.

**Aprendizajes técnicos documentados:** comprobar GLB/AnimationMixer en ejecución, separar apariencia y colliders, usar UVs métricas y texturas compartidas, probar contactos con física real y distinguir tiempo de CPU de FPS. Son conclusiones del proceso registrado, no una evaluación del aprendizaje personal del alumno.

## Recursos y créditos

Mapa, personaje, animaciones, objetos y sonidos se crearon para el proyecto con asistencia de IA; se incluyen generadores. No se descargaron modelos 3D externos.

| Recurso | Fuente | Licencia |
| --- | --- | --- |
| Three.js / GLTFLoader / utilidades | [Three.js contributors](https://github.com/mrdoob/three.js) | [MIT](assets/licenses/three-MIT.txt) |
| Rapier 3D | [Dimforge](https://github.com/dimforge/rapier.js) | [Apache 2.0](assets/licenses/rapier-Apache-2.0.txt) |
| DM Sans | [DM Sans Project Authors](https://github.com/googlefonts/dm-fonts) | [SIL OFL](assets/licenses/DM-Sans-OFL.txt) |
| Space Grotesk | [Florian Karsten / autores](https://github.com/floriankarsten/space-grotesk) | [SIL OFL](assets/licenses/Space-Grotesk-OFL.txt) |
| Texturas PBR | [Poly Haven](https://polyhaven.com): Wood Floor, White Plaster 02, Concrete Floor 02 y Dirty Carpet | [CC0](https://polyhaven.com/license) |
| Playwright (pruebas) | [Microsoft](https://github.com/microsoft/playwright) | Apache 2.0, incluida en el paquete |

[Procedencia y transformaciones de cada textura](assets/textures/pbr/sources.json). `tools/prepare_materials.py` requiere Python/Pillow y red para regenerarlas; jugar no necesita esa herramienta. `tools/build_campus.py` regenera los modelos con Python estándar. Se conservan los recursos de la oficina inicial como referencia histórica.
