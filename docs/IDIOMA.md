# Idioma

Regla corta: **el código, cuando exista, se escribe en inglés; todo lo que
explica o ejecuta el trabajo del equipo se escribe en castellano peruano.**

## Código: inglés (pendiente de escribirse)

Este repo todavía no tiene código escrito — ver
[docs/STANDARDS.md](STANDARDS.md#estándares-de-código) para la pieza planeada
(el script de Buffer). Cuando exista, sus identificadores (variables, funciones,
tipos, constantes), nombres de archivos y módulos, y los mensajes de error se
escriben en inglés, sin mezclar idiomas dentro de un mismo identificador:
`publishPost` sí, `publicarPost` no.

## Plantillas y calendario: castellano peruano

La plantilla de publicación semanal y el calendario editorial se escriben en
castellano peruano. No son "contenido de marca" en el sentido de mistorias-web
(eso vive en `mistorias-contenido` y en `mistorias-esencia-de-marca`), pero sí
son lenguaje de cara al equipo que ejecuta la publicación cada semana, y en el
caso de la plantilla, el insumo directo de lo que se publica en castellano para
la audiencia peruana.

## Comentarios y documentación: castellano peruano

Los comentarios, los mensajes de commit, las descripciones de PR y los
documentos del repositorio (README, ADRs, este archivo) se escriben en
castellano peruano. Los comentarios explican el _por qué_, no el _qué_ (ver
[docs/STANDARDS.md](STANDARDS.md#estándares-de-código)).

## Identificadores mezclados

Cuando exista código: un identificador no mezcla idiomas. Los nombres que vienen
de la API de Buffer, de HTTP o de una librería se escriben como son
(`accessToken`, `profileId`), no se traducen.

## Referencias

- [mistorias-web/docs/IDIOMA.md](https://github.com/mistorias/mistorias-web/blob/main/docs/IDIOMA.md)
  — versión de referencia, con la excepción de componentes Astro que no aplica a
  este repo
- [docs/STANDARDS.md](STANDARDS.md) — estándares de código, commits y PRs
