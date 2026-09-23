# mistorias-redes-sociales

Plantillas, calendario editorial y seguimiento de la ejecución semanal de redes sociales de Mistorias (Facebook, Instagram y X).

La estrategia y los criterios editoriales (audiencia, tono, qué se le pide al lector) están definidos en [`redes-sociales-plan.md`](https://github.com/mistorias/mistorias-esencia-de-marca/blob/main/redes-sociales-plan.md), en el repo `mistorias-esencia-de-marca`. Este repo aloja la ejecución: lo que se usa cada semana para publicar y lo que se registra después.

## Herramienta de publicación: Buffer

Se eligió [Buffer](https://buffer.com) (plan gratuito) para publicar en las tres redes. Razón: es la única opción gratuita evaluada (junto a Metricool y Publer) con API pública en su plan free (GraphQL, 1 API key, 3000 requests/30 días), lo que permite alimentarla por código en vez de pegar el post a mano cada semana en la interfaz web. Detalle completo de la evaluación en la sección 13.4 del plan.

**Pendiente (manual, requiere login de Mistorias):**
- Crear la cuenta de Buffer.
- Conectar la Página de Facebook.
- Conectar la cuenta de Instagram profesional (debe estar vinculada a la Página de Facebook — requisito de Meta, no de Buffer).
- Conectar la cuenta de X.
- Generar el API key desde la configuración de la cuenta.

**Pendiente (siguiente tarea de código):** una vez exista el API key, documentar aquí el script/skill que toma la salida del skill `publicar-en-redes` (gancho + cierre por red + UTM) y crea el post en Buffer vía API.

## Qué va a haber aquí

- **Plantilla de publicación semanal** — la plantilla fija por red (imagen 16:9, gancho, cierre particular por red, enlace con UTM) descrita en la sección 8 del plan, lista para copiar y llenar cada semana.
- **Calendario editorial** — qué historia se publica cada semana y en qué fecha.
- **Seguimiento de intenciones con fecha** — el registro de quién anunció qué acción, dónde y con qué fecha de seguimiento (sección 13.6 del plan), y el formulario de resultados que se comparte en esa fecha.
- **Lineamientos de moderación de comentarios** — cuando se definan (pendiente 13.2 del plan).
- **Integración con Buffer** — script/skill de publicación vía API (ver arriba).

## Nota sobre datos sensibles

El registro de seguimiento de intenciones incluye nombres reales y, en algunos casos, detalles que permiten identificar a menores de edad (por ejemplo, un colegio específico). Este repo es público, así que esos datos **no deben vivir aquí**: van en un lugar privado aparte, con el consentimiento explícito que exige el plan antes de publicar cualquier resultado.
