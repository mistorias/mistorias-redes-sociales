# ADR 0005: Tests de integración contra un servidor falso de Buffer

## Estado

Aceptada. El umbral de cobertura sigue abierto (ver Pendiente).

## Contexto

La integración se comunica con tres sistemas externos: la API GraphQL de Buffer,
el feed `/historias.json` de mistorias.pe y la API de GitHub (para abrir PRs).
Un test unitario con _mocks_ de funciones verifica que el código llama a su
propio cliente, no que Buffer entienda lo que se le manda: ahí es donde se
rompen las integraciones.

Buffer no ofrece un entorno de pruebas. Un test contra la API real agenda posts
reales en las redes de Mistorias, consume la cuota del plan gratuito y
necesitaría la llave en CI, en contra del
[ADR 0004](0004-credenciales-y-minimo-privilegio.md).

## Decisión

- **Framework: vitest**, el mismo de mistorias-web.
- **Tests de integración contra un servidor HTTP falso local** que se levanta en
  cada corrida. El código bajo prueba hace llamadas HTTP de verdad: solo cambia
  la URL base (`BUFFER_API_URL`, `SITE_FEED_URL`, `GITHUB_API_URL`), que se
  inyecta por configuración.
- **Respuestas grabadas, no inventadas.** El servidor devuelve _fixtures_
  copiadas de respuestas reales de Buffer, sin datos sensibles. Cubren al menos:
  agendar con éxito, error de validación, límite de requests (429), post
  `fallido` y post que sigue pendiente pasados los reintentos.
- **Smoke test de solo lectura**, con disparo manual (`workflow_dispatch`): con
  la llave real, lista los canales conectados y no crea nada. Detecta si Buffer
  cambió el contrato que las _fixtures_ asumen.
- La espera de cinco minutos se inyecta como parámetro, para que los tests no
  esperen de verdad.

## Consecuencias

- La CI corre sin la llave de Buffer y sin tocar las redes.
- Si Buffer cambia su API, los tests siguen en verde hasta que se corra el smoke
  test o falle una publicación real. Se mitiga validando en runtime cada
  respuesta (ver [docs/STANDARDS.md](../STANDARDS.md#específico-de-typescript)):
  una respuesta inesperada falla con un mensaje claro en lugar de registrar
  datos incorrectos.
- Las _fixtures_ se actualizan a mano cuando cambia el contrato; es trabajo
  explícito y visible en un PR.

## Pendiente

- Umbral de cobertura: se fija al escribir el primer código, con la referencia
  del 90% de mistorias-web.
