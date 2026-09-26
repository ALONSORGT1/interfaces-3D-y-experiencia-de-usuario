# Guía de revisión y entrega de la campaña

## Requisitos técnicos

| ID | Evidencia |
| --- | --- |
| R1 | Three.js por CDN/import map; escenario, cámaras, luces y efectos |
| R2 | GLTFLoader carga `campus.glb` y `employee.glb`; ver `R2-R4.md` |
| R3 | Cámara en tercera persona, seguimiento, órbita, zoom y rayos contra obstáculos |
| R4 | AnimationMixer reproduce Idle, Walk, Run y Throw desde el GLB |
| R5 | Rapier: suelo, muros, muebles, límites y personajes con colliders |
| R6 | Archivadores, servidores, carritos, sillas, plantas, cafetera, bonos y bolas |
| R7 | Pilas de recepción/archivo y oleadas físicas del director |
| R8 | Lanzamientos con masa, velocidad, restitución y consecuencias visibles |
| R9 | Potencia real y tres tipos de bola desbloqueables |
| R10 | Generación comprobada de bolas, bonos y oleadas en volúmenes válidos |
| R11 | HUD, diálogos, mapa, estados y diseño responsivo propio |
| R12 | Historial Git original preservado y ampliado; **repositorio público pendiente** |
| R13 | Rutas relativas y subruta de Pages probada; **publicación real pendiente** |

## Reglas de negocio

- Inicio explícito, objetivo visible, progreso por capítulos y zonas con colisiones.
- Movimiento y animación ligados a acciones reales; cuerpos dinámicos con gravedad.
- Interacciones: hablar, recoger, empujar, recargar y lanzar.
- Generación validada de proyectiles y pilas, con parámetros que modifican la física.
- HUD con misión actual, contador, distancia, equipo, tiempo, sospecha, bolas y puntuación.
- Victoria al completar las cinco misiones previas y activar la salida con el equipo y las pruebas. Se muestra inmediatamente al interactuar; la puntuación es opcional.
- Derrota por tiempo, sospecha o caída. Reintento por capítulo o nueva campaña completa.
- Pausa, mapa y conversación detienen el mundo. La interfaz no requiere mirar la consola.
- RN-15 queda pendiente hasta validar todo desde una URL pública de GitHub Pages.

## Qué cambió respecto a la oficina inicial

El mapa pasó de 360 a 5,400 unidades². La campaña incorpora tres compañeros reclutables, otros empleados, el director y dos auditores. Hay seis objetivos sucesivos con diferentes acciones, recursos en varias zonas, bolas desbloqueables, mapa, rutas y puntos de control.

La regla anterior mezclaba derribar 18 objetos con alcanzar 1,800 puntos y resolver la física de la última bola. Eso permitía terminar el contador sin obtener un resultado. No se conservó telemetría de la partida reportada, por lo que no se atribuye su demora exacta de cinco minutos a una única causa. La nueva regla elimina esas dependencias: completar la historia y usar la salida resuelve el resultado en la misma interacción. Existe una prueba de victoria con puntos negativos y munición agotada.

## Validación manual antes de entregar

1. Juega la historia completa sin usar el modo de pruebas. Habla con los personajes y comprueba que entiendes el siguiente objetivo sin leer el código.
2. Verifica la carga de ambos GLB y observa los cuatro estados de animación.
3. Recorre habitaciones y pasillos, intenta atravesar sólidos y sigue a tus compañeros por una puerta.
4. Compara potencias y tipos de bola, empuja el carrito y recoge recursos.
5. Comprueba que los auditores detectan dentro de su cono y pierden visión detrás de una pared.
6. Completa todos los pasos y activa el ascensor: debe aparecer el final sin esperar derrumbes pendientes ni conseguir puntos extra.
7. Fuerza una derrota; verifica el punto de control y la opción de empezar una campaña nueva.
8. Confirma que el escenario es distinto del usado en tu práctica 1.5; esa práctica no se proporcionó para comparación.
9. Publica el repositorio, conserva sus commits, activa GitHub Pages y vuelve a probar Console y Network desde la URL pública.
10. Añade las URLs reales y tus conclusiones personales. No presentes la URL localhost como entrega pública.

Las pruebas automáticas usan navegador y física reales, pero preparan posiciones para acortar los desplazamientos y establecer casos límite. No equivalen a una evaluación humana de toda la experiencia. La versión está diseñada para teclado/mouse, sin multijugador ni controles táctiles. Los puntos de control viven en la sesión actual, no persisten al cerrar la página.
