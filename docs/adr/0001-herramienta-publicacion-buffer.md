# ADR 0001: Herramienta de publicación en redes sociales — Buffer

## Estado

Aceptada.

## Contexto

La sección 8 del [plan de redes sociales](https://github.com/mistorias/mistorias-esencia-de-marca/blob/main/redes-sociales-plan.md) exige "componer una vez, publicar en tres": el gancho es idéntico en Facebook, Instagram y X, pero el cierre varía por red y se escribe a mano cada semana. Eso descarta un autopiloto por RSS (dlvr.it, contemplado en una versión anterior del plan): no existe una fuente RSS que ya contenga el cierre diferenciado por red.

Restricciones fijadas antes de evaluar herramientas:

- **Presupuesto cero.** Solo se considera una herramienta paga si ninguna alternativa gratuita cubre Facebook + Instagram + X.
- **Configuración como código.** El skill `publicar-en-redes` ya arma gancho + cierre por red + UTM; se busca que esa salida alimente la herramienta de publicación por API, no que alguien la pegue a mano en una interfaz web cada semana.

## Opciones evaluadas

| Herramienta | Cubre FB + IG + X gratis | Límite del plan free vs. 1 post/semana | API en el plan free |
|---|---|---|---|
| **Buffer** | Sí | 10 posts en cola/canal — nunca se acerca | Sí (GraphQL, 1 API key, 3000 requests/30 días) |
| Metricool | Sí (+ GBP, LinkedIn) | Similar, sin apretar | No — solo desde el plan Advanced (~US$53/mes) |
| Publer | Sí | Agendado ilimitado en la cuenta primaria | No garantizada en free |

Las tres cubren las tres redes sin costo y muy por encima del volumen real (~4 posts/mes), así que el límite de cola no desempata nada.

## Decisión

Buffer, plan gratuito.

El criterio de desempate fue la API pública en el plan gratuito: Buffer es la única de las tres que la ofrece sin pagar. Eso permite que la integración con el skill `publicar-en-redes` se construya sin costo, dentro de un límite (3000 requests/30 días) muy por encima del uso real.

## Consecuencias

- La integración se puede escribir y operar con presupuesto cero.
- Instagram requiere que la cuenta profesional esté vinculada a una Página de Facebook — requisito de Meta, no de Buffer; aplica igual con cualquier herramienta de terceros.
- Buffer no incluye analítica de comunidad más allá de lo básico. El paso 5 del plan (métricas de comunidad, hoy abierto) sigue sin resolverse por esta elección; Metricool sí la incluía en su free, pero se descartó por no tener API gratuita.
- Queda un ADR aparte pendiente: el tech stack de la integración (lenguaje/runtime, manejo de credenciales, testing) que llamará a la API de Buffer.

## Pendiente de ejecución

Manual, requiere login de Mistorias:

- Crear la cuenta de Buffer.
- Conectar la Página de Facebook.
- Conectar la cuenta de Instagram profesional (vinculada a esa Página).
- Conectar la cuenta de X.
- Generar el API key desde la configuración de la cuenta.
