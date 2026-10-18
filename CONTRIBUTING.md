# Guía de Contribución

Este documento explica el flujo de contribución a `mistorias-redes-sociales`. El repo tiene dos
tipos de contenido: plantillas/calendario en markdown (sin build ni tests) y código con tests (la
integración con Buffer). El repo es agnóstico a lo publicado: no guarda un registro de qué se
publicó efectivamente — eso se define por separado en `mistorias-contenido`.

## Antes de Comenzar

Lee estos documentos para alinear tu trabajo con los principios del proyecto:

- **[docs/STANDARDS.md](docs/STANDARDS.md)** — estándares de código, convenciones de commits y
  estándares de PR.
- **[docs/IDIOMA.md](docs/IDIOMA.md)** — qué idioma usar dónde.
- **[Mistorias Esencia de Marca](https://github.com/mistorias/mistorias-esencia-de-marca)** —
  principios de marca (empatía, transparencia, empoderamiento, claridad) que guían todo el trabajo.

## Requisitos Previos

### Node.js y nvm

La versión de Node.js se define en `.nvmrc` (verifica el archivo para la versión exacta).

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
[`markdownlint-cli2`](https://github.com/DavidAnson/markdownlint-cli2) con la configuración de
[`@github/markdownlint-github`](https://github.com/github/markdownlint-github) para el lint (ver
`.markdownlint-cli2.mjs` para los overrides puntuales y su justificación, incluyendo el ancho de
línea de 80 columnas).

```bash
pnpm format:markdown      # reformatea la prosa a 80 columnas
pnpm lint:markdown        # revisa todo el markdown del repo
```

`markdownlint-cli2 --fix` no sustituye la revisión manual: puede normalizar un error de fondo (por
ejemplo, un `+` de redacción que un wrap de línea deja al inicio de un renglón y que markdown
interpreta como viñeta) sin corregir la causa. Revisa el diff después de correr cualquiera de los
dos comandos.

## Flujo de Contribución (plantillas, calendario y registros)

1. Crea una rama descriptiva: `git checkout -b docs/descripcion-breve`, `feat/descripcion-breve` o
   `fix/descripcion-breve`.
2. Haz los cambios siguiendo [docs/STANDARDS.md](docs/STANDARDS.md) y
   [docs/IDIOMA.md](docs/IDIOMA.md).
3. Corre `pnpm format:markdown` y `pnpm lint:markdown`, y corrige lo que reporte.
4. Haz commits atómicos siguiendo
   [Conventional Commits en estilo preemptive](docs/STANDARDS.md#estándares-de-commits).
5. Abre un PR contra `main` con la [plantilla de PR](.github/pull_request_template.md), siguiendo
   los [estándares de PR](docs/STANDARDS.md#estándares-de-pull-requests).

## Código (integración con Buffer)

Lenguaje, runtime y gestor de paquetes ya están decididos — Node, TypeScript y pnpm. El manejo de
credenciales y el framework de testing siguen abiertos; se deciden al construir la integración. Esta
sección se completa entonces con cómo correr el script y sus tests en local, y cómo se configuran
las credenciales de la API de Buffer sin commitearlas.

## Decisiones Técnicas

Las decisiones arquitecturales de este repo viven en [`docs/adr/`](docs/adr/README.md), no en este
documento ni en el README.

Todo el trabajo se alinea con los
[principios de marca](https://github.com/mistorias/mistorias-esencia-de-marca) (empatía,
transparencia, empoderamiento, claridad), reflejados en [docs/STANDARDS.md](docs/STANDARDS.md).
