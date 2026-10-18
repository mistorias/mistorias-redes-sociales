# ADR 0002: Tech stack de la integración con Buffer — lenguaje y runtime

## Estado

Aceptada. Los dos pendientes que dejó abiertos se resolvieron en ADR aparte (ver
Pendiente).

## Contexto

El [ADR 0001](0001-herramienta-publicacion-buffer.md) dejó pendiente, en su
sección de Consecuencias, un ADR aparte sobre el tech stack del script o skill
que llama a la API de Buffer: lenguaje/runtime, manejo de credenciales y
testing.

## Decisión

Node + TypeScript, en la medida en que lo que ofrezca Buffer para su API
(GraphQL, según el ADR 0001) lo permita sin fricción. Gestor de paquetes: pnpm.

pnpm quedó resuelto antes que el resto del stack porque fue necesario para
instalar el linter de markdown del repo (ver `.markdownlint-cli2.mjs` y
[CONTRIBUTING.md](../../CONTRIBUTING.md)) — ese `package.json` es el mismo que
va a usar el script de Buffer.

## Consecuencias

- El script/skill vive en el ecosistema Node, igual que
  [mistorias-web](https://github.com/mistorias/mistorias-web) (también Node y
  TypeScript), aunque no comparte repo ni dependencias con él. mistorias-web usa
  pnpm; acá se eligió igual, sin que una decisión dependiera de la otra.
- Puede aplicar los mismos lineamientos de tipado que mistorias-web (modo
  estricto, evitar `any`, preferir `type` sobre `interface`) sin inventar un
  estándar nuevo — ver
  [docs/STANDARDS.md](../STANDARDS.md#estándares-de-código).
- La elección de librería para llamar a la API de Buffer (cliente HTTP genérico
  vs. un SDK si Buffer publica uno) y de librería para validar en runtime su
  respuesta se resuelve al construir la integración, no acá.

## Pendiente

Resuelto en otros ADR:

- Manejo de credenciales: ver
  [ADR 0004](0004-credenciales-y-minimo-privilegio.md).
- Framework de testing: vitest, con tests de integración contra un servidor
  falso. Ver [ADR 0005](0005-tests-de-integracion-con-servidor-falso.md), donde
  sigue abierto el umbral de cobertura.
