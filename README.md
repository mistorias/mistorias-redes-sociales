# mistorias-redes-sociales

Plantillas, calendario editorial y seguimiento de la ejecución semanal de redes sociales de
Mistorias (Facebook, Instagram y X).

La estrategia y los criterios editoriales (audiencia, tono, qué se le pide al lector) están
definidos en
[`redes-sociales-plan.md`](https://github.com/mistorias/mistorias-esencia-de-marca/blob/main/redes-sociales-plan.md),
en el repo `mistorias-esencia-de-marca`. Este repo aloja la ejecución: lo que se usa cada semana
para publicar. Es agnóstico a lo publicado — no guarda un registro de qué salió efectivamente en
cada red; eso se define por separado en `mistorias-contenido`.

Para contribuir, ver [CONTRIBUTING.md](CONTRIBUTING.md) y los estándares en
[docs/STANDARDS.md](docs/STANDARDS.md) y [docs/IDIOMA.md](docs/IDIOMA.md).

## Decisiones arquitecturales (ADR)

Las decisiones sobre cómo se construye y con qué herramientas se opera este repo viven en
[`docs/adr/`](docs/adr/README.md), no en este README.

## Pendiente de ejecución

Hecho: cuenta de Buffer creada, con Facebook, Instagram y X conectados (detalle en el
[ADR 0001](docs/adr/0001-herramienta-publicacion-buffer.md)).

Manual, requiere login de Mistorias:

- Generar el API key de Buffer.

Siguiente tarea de código, una vez exista el API key: el script/skill en Node + TypeScript (ver
[ADR 0002](docs/adr/0002-tech-stack-integracion-buffer.md)) que toma la salida del skill
`publicar-en-redes` (gancho + cierre por red + UTM) y crea el post en Buffer vía API.

## Qué va a haber aquí

- **Plantilla de publicación semanal** — la plantilla fija por red (imagen 16:9, gancho, cierre
  particular por red, enlace con UTM) descrita en la sección 8 del plan, lista para copiar y llenar
  cada semana.
- **Calendario editorial** — qué historia se publica cada semana y en qué fecha.
- **Lineamientos de moderación de comentarios** — cuando se definan (pendiente 13.2 del plan).
- **`docs/adr/`** — decisiones arquitecturales de este repo (ver arriba).
- **Integración con Buffer** — script/skill de publicación vía API (ver arriba).
