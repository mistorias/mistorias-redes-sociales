<!-- markdownlint-disable-file MD041 -->
<!--
Título: Conventional Commits en estilo preemptive, igual que los commits.
Si el cambio rompe compatibilidad, va marcado con `!` tras el tipo
(`feat!: ...`), igual que en el commit que lo introduce.
Borra los comentarios y las secciones que no apliquen.
El título del PR hace de encabezado principal; por eso este archivo
empieza con un comentario y no con un `#` de nivel 1 (ver MD041 arriba).
-->

## Qué

<!-- Una línea: qué cambia. -->

## Por qué

<!-- El problema que resuelve o el requerimiento que cumple. Enlaza issue o discusión. -->

## Cómo verificar

- [ ] `pnpm lint:markdown` pasa sin errores
- [ ] <!-- Pasos concretos: qué leer, qué revisar, o qué test correr -->

## Comprobaciones

### Alcance

- [ ] Hace una sola cosa y se lee de corrido; si es grande, se explica por qué no se dividió

### Seguridad

- [ ] Si el cambio toca la integración con Buffer: no incluye API keys ni credenciales en el diff

## Relacionado

<!-- Closes #XX -->
