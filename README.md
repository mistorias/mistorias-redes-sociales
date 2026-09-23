# mistorias-redes-sociales

Plantillas, calendario editorial y seguimiento de la ejecución semanal de redes sociales de Mistorias (Facebook, Instagram y X).

La estrategia y los criterios editoriales (audiencia, tono, qué se le pide al lector) están definidos en [`redes-sociales-plan.md`](https://github.com/mistorias/mistorias-esencia-de-marca/blob/main/redes-sociales-plan.md), en el repo `mistorias-esencia-de-marca`. Este repo aloja la ejecución: lo que se usa cada semana para publicar y lo que se registra después.

## Decisiones arquitecturales (ADR)

Las decisiones sobre cómo se construye y con qué herramientas se opera este repo viven en `docs/adr/`, no en este README:

- [ADR 0001 — Herramienta de publicación: Buffer](docs/adr/0001-herramienta-publicacion-buffer.md).
- **Pendiente:** ADR sobre el tech stack de la integración (lenguaje/runtime, manejo de credenciales, testing) para el script o skill que llamará a la API de Buffer. Se escribe antes de empezar esa integración.

## Pendiente de ejecución

Manual, requiere login de Mistorias (detalle en el ADR 0001):

- Crear la cuenta de Buffer y conectar Facebook, Instagram y X.
- Generar el API key.

Siguiente tarea de código, una vez exista el API key y esté resuelto el ADR de tech stack: el script/skill que toma la salida del skill `publicar-en-redes` (gancho + cierre por red + UTM) y crea el post en Buffer vía API.

## Qué va a haber aquí

- **Plantilla de publicación semanal** — la plantilla fija por red (imagen 16:9, gancho, cierre particular por red, enlace con UTM) descrita en la sección 8 del plan, lista para copiar y llenar cada semana.
- **Calendario editorial** — qué historia se publica cada semana y en qué fecha.
- **Seguimiento de intenciones con fecha** — el registro de quién anunció qué acción, dónde y con qué fecha de seguimiento (sección 13.6 del plan), y el formulario de resultados que se comparte en esa fecha.
- **Lineamientos de moderación de comentarios** — cuando se definan (pendiente 13.2 del plan).
- **`docs/adr/`** — decisiones arquitecturales de este repo (ver arriba).
- **Integración con Buffer** — script/skill de publicación vía API (ver arriba).

## Nota sobre datos sensibles

El registro de seguimiento de intenciones incluye nombres reales y, en algunos casos, detalles que permiten identificar a menores de edad (por ejemplo, un colegio específico). Este repo es público, así que esos datos **no deben vivir aquí**: van en un lugar privado aparte, con el consentimiento explícito que exige el plan antes de publicar cualquier resultado.
