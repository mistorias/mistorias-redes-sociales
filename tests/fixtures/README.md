# Fixtures de los tests

Respuestas que el servidor falso devuelve en los tests de integración
([ADR 0005](../../docs/adr/0005-tests-de-integracion-con-servidor-falso.md)). Se
actualizan a mano cuando cambia el contrato, en un PR.

- `feed/historias.json`: el feed de la historia del 2026-11-19, armado con el
  generador de mistorias-web (`src/lib/feed/story-feed.ts`) y los datos de esa
  historia en mistorias-contenido. No es una respuesta grabada: el feed de
  producción todavía devuelve 404. El nombre del archivo de la imagen es
  ilustrativo.
- `github.json`: respuestas de la API REST de GitHub, una por clave, reducidas
  a los campos que el código lee y con la forma de la documentación de GitHub.
  No son respuestas grabadas.
