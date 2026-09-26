# Renovación visual y física · v0.13

Se conserva la oficina de 100 × 54, el banco de 57 encargos, las dificultades, los compañeros, las cámaras y las animaciones. El cambio afecta materiales, ambientación y robustez de colisiones. El estilo es propio: una oficina tecnológica colorida, sin reproducir una sede real ni usar marcas gráficas de Google.

## Materiales

| Superficie | Tratamiento | Escala de la textura |
| --- | --- | --- |
| Pisos de madera, escritorios y mesas | Roble, normal suave y rugosidad satinada | 1.7 m por repetición |
| Pasillo | Concreto neutralizado y contraste moderado | 3 m |
| Alfombras y tapicería | Textura de tejido, alta rugosidad, colores por zona | 0.8 m |
| Paredes | Pintura mate sobre microrelieve de yeso | 2 m |
| Herrajes y marcos | Metalness hasta 0.9 y roughness 0.28 | Microrelieve suave |
| Mamparas y ventanas | Transparencia, reflejo del entorno y baja rugosidad | Sin transmisión costosa |
| Pantallas y luminarias | Materiales emisivos | Sin mapas adicionales |

Los UVs se calculan sobre las coordenadas transformadas, antes de combinar las mallas. Se usan RepeatWrapping en ambos ejes, filtrado trilineal con mipmaps y anisotropía hasta 8. Los materiales comparten doce texturas: no se carga una copia por objeto. Las caras delgadas no reciben una imagen estirada de extremo a extremo. Los bordes suaves del mobiliario se mantienen dentro de sus envolventes físicas.

**Peso total de mapas:** 1,156,110 bytes. Resolución de 1024² para madera/concreto y 512² para yeso/tejido. Los mapas de color usan sRGB; normal y rugosidad se interpretan como datos lineales.

## Iluminación y rendimiento

Luz hemisférica, una luz direccional con sombra suave de 1024², un entorno de reflexión generado una vez y dos luces próximas al jugador. Las demás luminarias son superficies emisivas. No hay sombras individuales por cada lámpara ni reflejos que vuelvan a renderizar toda la escena.

Se agrupa geometría estática por sector/material, mobiliario rígido por material y piezas del personaje por nodo animado. Las piezas animadas no se fusionan entre huesos/grupos; se conserva el control de AnimationMixer. El vidrio usa una sola pasada. Se liberan las geometrías agrupadas al retirar objetos dinámicos.

Muestra automatizada de 180 cuadros en este equipo, con vista amplia en primera persona:

- Mediana: 23.3 ms por cuadro (aproximadamente 43 FPS).
- Percentil 95: 29.4 ms.
- 227 llamadas de dibujo y 22,348 triángulos en el cuadro final.

Es una medida local de una vista concreta; hardware, resolución, navegador y carga de otras aplicaciones cambian el resultado. El informe de misiones mide además CPU de actualización/envío de render, que no debe confundirse con FPS.

## Colisiones y movimiento

- Rapier conserva gravedad de −9.81 y paso fijo de 1/60 s.
- Colliders sencillos de cajas para escritorios, mesas, almacenamiento, sofás y paredes; cilindros para las nuevas macetas.
- Cada mampara continua usa una envolvente única que cubre vidrio, base y postes. Evita costuras innecesarias en el movimiento.
- Piso, umbral y puertas del ascensor tienen colisiones. La puerta solo deja de bloquear cuando se abre.
- Predicción de contacto de 0.08, hasta cuatro subpasos CCD y frecuencia de contacto de 60 para reducir penetraciones transitorias de objetos que caen.
- Cápsula del jugador con barrido de movimiento, corrección de contacto, escalones de 18 cm y **salto con J**. Espacio sigue lanzando: no se cambió ese control existente.
- Tras golpear un techo se cancela la velocidad ascendente. El jugador puede aterrizar sobre una mesa; no la atraviesa.
- Los compañeros mantienen el comportamiento sin bloquear al jugador ni los carritos.

La geometría fina decorativa —hojas, papeles, señales y luz— no genera colliders individuales innecesarios. Los volúmenes estructurales, superficies transitables y mobiliario sólido sí tienen colisión; los adornos de un mueble se apoyan en sus volúmenes principales.

## Validación

`npm test` ejecuta las suites de encargos, controles y físicas/visuales. En esta revisión pasaron las 399 combinaciones de encargo, ubicación y dificultad, una fuga completa, animaciones y teclas reales, además de:

- 12 mapas PBR compartidos, UVs métricas repetidas, metal y vidrio diferenciados
- Cada volumen sólido declarado en el GLB queda cubierto por un collider o una envolvente compuesta
- 12 recorridos caminando/corriendo contra paredes, vidrio, escritorio, mesa, sofá y maceta; sin atravesarlos ni vibración vertical
- Salto J, gravedad y aterrizaje estable sobre el piso
- El jugador aterriza sobre una mesa sólida sin hundirse ni atravesarla
- El ascensor bloquea con las puertas cerradas y permite entrar al abrirse
- Bola con gravedad se asienta sobre el suelo; proyectil rápido no atraviesa la pared
- Las quince zonas siguen conectadas tras añadir mobiliario y mamparas
- Sin errores JavaScript o WebGL; muestra de tiempos de cuadro registrada

Las pruebas colocan al personaje y objetos en posiciones controladas para repetir contactos; la simulación, movimiento y proyectiles son reales. No equivalen a probar cada posible acción humana, pero verifican los casos concretos de la solicitud. Los informes están en `verificacion.json` y `verificacion-visual.json`.

## Procedencia y reproducción

Las texturas son escaneos de Poly Haven, publicados bajo [CC0](https://polyhaven.com/license). Fuentes:

- [Wood Floor](https://polyhaven.com/a/wood_floor).
- [White Plaster 02](https://polyhaven.com/a/white_plaster_02).
- [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02).
- [Dirty Carpet](https://polyhaven.com/a/dirty_carpet), neutralizada y aclarada para reutilizar su grano en alfombra y tapicería.

Se ajustó contraste/luminosidad de algunos mapas de color y se comprimieron a WebP. `assets/textures/pbr/sources.json` registra URLs originales, tamaños y resolución. No se descargaron modelos externos.

`tools/prepare_materials.py` reproduce la preparación de texturas (Python + Pillow, requiere red). `tools/build_campus.py` reproduce el GLB y las colisiones (biblioteca estándar). El juego utiliza los archivos ya incluidos y no descarga las texturas desde Poly Haven al jugar.
