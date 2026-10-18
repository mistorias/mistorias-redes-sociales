# ADR 0002: Tech stack de la integración con Buffer — lenguaje y runtime

## Estado

Aceptada parcialmente: el lenguaje, el runtime y el gestor de paquetes quedan decididos. El manejo
de credenciales y el framework de testing siguen abiertos (ver Pendiente).

## Contexto

El [ADR 0001](0001-herramienta-publicacion-buffer.md) dejó pendiente, en su sección de
Consecuencias, un ADR aparte sobre el tech stack del script o skill que llama a la API de Buffer:
lenguaje/runtime, manejo de credenciales y testing.

## Decisión

Node + TypeScript, en la medida en que lo que ofrezca Buffer para su API (GraphQL, según el
ADR 0001) lo permita sin fricción. Gestor de paquetes: pnpm.

pnpm quedó resuelto antes que el resto del stack porque fue necesario para instalar el linter de
markdown del repo (ver `.markdownlint-cli2.mjs` y [CONTRIBUTING.md](../../CONTRIBUTING.md)) — ese
`package.json` es el mismo que va a usar el script de Buffer.

## Consecuencias

- El script/skill vive en el ecosistema Node, igual que
  [mistorias-web](https://github.com/mistorias/mistorias-web) (también Node y TypeScript), aunque no
  comparte repo ni dependencias con él. mistorias-web usa pnpm; acá se eligió igual, sin que una
  decisión dependiera de la otra.
- Puede aplicar los mismos lineamientos de tipado que mistorias-web (modo estricto, evitar `any`,
  preferir `type` sobre `interface`) sin inventar un estándar nuevo — ver
  [docs/STANDARDS.md](../STANDARDS.md#estándares-de-código).
- La elección de librería para llamar a la API de Buffer (cliente HTTP genérico vs. un SDK si Buffer
  publica uno) y de librería para validar en runtime su respuesta se resuelve al construir la
  integración, no acá.

## Pendiente

Se decide en el camino, a medida que avance la integración:

- Manejo de credenciales — cómo se almacena e inyecta el API key de Buffer sin commitearlo
- Framework y umbral de testing/coverage
