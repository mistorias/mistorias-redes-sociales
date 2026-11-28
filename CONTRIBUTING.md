# Guía de Contribución

Este documento explica el flujo de contribución a `mistorias-redes-sociales`. El
repo tiene dos tipos de contenido: plantillas/calendario en markdown (sin build
ni tests) y código con tests (la integración con Buffer). El repo es agnóstico a
lo publicado: no guarda un registro de qué se publicó efectivamente — eso se
define por separado en `mistorias-contenido`.

## Antes de Comenzar

Lee estos documentos para alinear tu trabajo con los principios del proyecto:

- **[docs/STANDARDS.md](docs/STANDARDS.md)** — estándares de código,
  convenciones de commits y estándares de PR.
- **[docs/IDIOMA.md](docs/IDIOMA.md)** — qué idioma usar dónde.
- **[Mistorias Esencia de Marca](https://github.com/mistorias/mistorias-esencia-de-marca)**
  — principios de marca (empatía, transparencia, empoderamiento, claridad) que
  guían todo el trabajo.

## Requisitos Previos

### Node.js y nvm

La versión de Node.js se define en `.nvmrc` (verifica el archivo para la versión
exacta).

Instala [nvm](https://github.com/nvm-sh/nvm), luego:

```bash
nvm install
nvm use
```

### Gestor de Paquetes (pnpm)

La versión de pnpm se define en el campo `packageManager` de `package.json`.

```bash
npm install -g pnpm
```

## Configuración Inicial

```bash
git clone https://github.com/mistorias/mistorias-redes-sociales.git
cd mistorias-redes-sociales
pnpm install
```

## Markdown: formato y lint

El repo usa [`prettier`](https://prettier.io/) para reflow de prosa y
[`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2) con la
configuración de
[`@github/markdownlint-github`](https://github.com/github/markdownlint-github)
para el lint (ver `.markdownlint-cli2.mjs` para los overrides puntuales y su
justificación, incluyendo el ancho de línea de 80 columnas).

```bash
pnpm format:markdown      # reformatea la prosa a 80 columnas
pnpm lint:markdown        # revisa todo el markdown del repo
```

`markdownlint-cli2 --fix` no sustituye la revisión manual: puede normalizar un
error de fondo (por ejemplo, un `+` de redacción que un wrap de línea deja al
inicio de un renglón y que markdown interpreta como viñeta) sin corregir la
causa. Revisa el diff después de correr cualquiera de los dos comandos.

## Flujo de Contribución (plantillas, calendario y registros)

1. Crea una rama descriptiva: `git checkout -b docs/descripcion-breve`,
   `feat/descripcion-breve` o `fix/descripcion-breve`.
2. Haz los cambios siguiendo [docs/STANDARDS.md](docs/STANDARDS.md) y
   [docs/IDIOMA.md](docs/IDIOMA.md).
3. Corre `pnpm format:markdown` y `pnpm lint:markdown`, y corrige lo que
   reporte.
4. Haz commits atómicos siguiendo
   [Conventional Commits en estilo preemptive](docs/STANDARDS.md#estándares-de-commits).
5. Abre un PR contra `main` con la
   [plantilla de PR](.github/pull_request_template.md), siguiendo los
   [estándares de PR](docs/STANDARDS.md#estándares-de-pull-requests).

## Código (integración con Buffer)

Node, TypeScript y pnpm
([ADR 0002](docs/adr/0002-tech-stack-integracion-buffer.md)). Los tests corren
con vitest contra un servidor HTTP falso, sin llaves ni red
([ADR 0005](docs/adr/0005-tests-de-integracion-con-servidor-falso.md)).

```bash
pnpm typecheck        # tipos en modo estricto
pnpm format:code      # formatea el TypeScript a 80 columnas
pnpm lint:code        # verifica el formato
pnpm test             # tests de integración
pnpm test:coverage    # tests con el umbral de 90%
```

El código vive en `src/` y sus tests en `tests/`, con las respuestas de los
servicios en `tests/fixtures/`. Las credenciales nunca van en el repo: ver
`.env.example` y el
[ADR 0004](docs/adr/0004-credenciales-y-minimo-privilegio.md).

## Decisiones Técnicas

Las decisiones arquitecturales de este repo viven en
[`docs/adr/`](docs/adr/README.md), no en este documento ni en el README.

Todo el trabajo se alinea con los
[principios de marca](https://github.com/mistorias/mistorias-esencia-de-marca)
(empatía, transparencia, empoderamiento, claridad), reflejados en
[docs/STANDARDS.md](docs/STANDARDS.md).
