# Spike #11: la API de Buffer, probada sin publicar nada

Código desechable para responder las cuatro preguntas del
[issue #11](https://github.com/mistorias/mistorias-redes-sociales/issues/11). No
es la integración: cuando el spike responda, se borra o se reescribe con tests
([ADR 0005](../../docs/adr/0005-tests-de-integracion-con-servidor-falso.md)).

## Regla: ningún post puede llegar a la audiencia

El cliente (`client.ts`) rechaza la operación **antes de enviarla** si:

- es una mutación distinta de `createPost`, `editPost` o `deletePost`;
- usa `shareNow`, `shareNext` o `addToQueue` (salir ya o en el próximo hueco);
- usa un `mode` distinto de `customScheduled`, o lo usa sin `dueAt`;
- pone un `dueAt` a menos de 7 días.

Además:

- El borrador se crea con `saveToDraft: true` **y** con fecha a 30 días: si
  Buffer ignorara el borrador, el post quedaría a un mes, no en la cola de hoy.
- El texto dice «Prueba interna — no publicar».
- El post se borra en un `finally`, pase lo que pase. Los ids creados quedan en
  `salida/creados.json` y `pnpm spike:buffer limpiar` borra los que queden.
- `pnpm test:spike` prueba estas reglas.

Recomendado: usa un canal cuya cola esté **pausada** en Buffer mientras dura el
spike (_Pause Queue_), como segundo cinturón.

## Cómo correrlo

Necesitas acceso a `api.buffer.com` y la llave `clave-spike` en `BUFFER_API_KEY`
(en `.env` o en el entorno; ver `.env.example`). La misma llave sirve para todo:
el plan gratuito no permite una segunda.

1. `pnpm spike:buffer esquema` — introspección del esquema GraphQL. Guarda
   `salida/esquema.json` y un resumen con los campos de `Post`, `PostStatus` y
   las entradas de `createPost`, `editPost` y `deletePost`. Los demás pasos
   arman sus consultas con ese esquema, así no adivinan nombres de campos.
2. `pnpm spike:buffer canales` — lista organizaciones y canales. Copia el id de
   la organización a `BUFFER_ORGANIZATION_ID` y el de un canal a
   `BUFFER_SPIKE_CHANNEL_ID`.
3. `pnpm spike:buffer borrador-a-cola` — **pregunta 1**. Crea un borrador, lo
   relee, lo pasa a agendado con `editPost` (a 30 días), lo relee y lo borra.
   Responde si cambia de estado y si conserva el id.
4. `pnpm spike:buffer estados` — **pregunta 2**. Solo lee: trae hasta 3 posts
   existentes por cada valor de `PostStatus`, con todos sus campos.
5. `pnpm spike:buffer limite --consumir-cuota` — **pregunta 4**. Repite una
   lectura hasta recibir el límite. Gasta la cuota del día: córrelo al final.

Cada request y su respuesta (sin la llave) quedan en `salida/<fecha>/`, que git
ignora. Las cabeceras `RateLimit-*` y `Retry-After` se guardan en todas, así que
la pregunta 4 tiene datos aun sin el último paso.

## De la salida a las fixtures

`salida/` puede traer nombres de la cuenta o de los canales. Se revisa a mano y
lo útil se copia, sin datos sensibles, a las fixtures de los tests cuando exista
la integración.

## Supuestos del spike

- La API es GraphQL en `https://api.buffer.com` con `Authorization: Bearer`.
- Los nombres `createPost`, `editPost`, `deletePost`, `post`, `posts`,
  `channels` y `account.organizations` salen de la documentación pública. Si
  alguno no existe, el paso falla y el error queda en `salida/`; el resumen del
  esquema dice cuál usar.
- Si `editPost` no existe, la pregunta 1 queda respondida con un «no», y vale el
  camino alterno del ADR 0003: borrar y crear agendado.

## Respuestas

Se llenan en el issue al correr el spike.

1. Borrador a cola sin recrearlo, mismo id: _pendiente_.
2. Campos de estado (salió / falló, cuándo): _pendiente_.
3. Llaves: **una sola** en el plan gratuito, confirmado en la interfaz al
   intentar crear una segunda (Essentials permite 3). El permiso de **solo
   lectura existe**, pero con una sola llave hay que elegir: o escribe o solo
   lee. Como `difundir` necesita escribir, la única llave es de escritura y no
   queda llave de solo lectura para el smoke test. Decisión: el smoke test sigue
   en Actions con esa misma llave, y su código solo lee (ver ADR 0004).
4. Límite de requests (código, cabeceras, cifras reales): _pendiente_. La
   pantalla de Essentials anuncia 450 cada 15 min y 1800 cada 24 h; las del plan
   gratuito se leen de las cabeceras.
