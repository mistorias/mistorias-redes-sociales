# ADR 0004: Credenciales de Buffer y principio de mínimo privilegio

## Estado

Aceptada.

## Contexto

El [ADR 0002](0002-tech-stack-integracion-buffer.md) dejó abierto cómo se
almacena e inyecta la credencial de Buffer sin commitearla. El flujo del
[ADR 0003](0003-flujo-de-difusion-automatica.md) suma una segunda necesidad: un
Action de este repo tiene que abrir PRs aquí y en `mistorias-contenido`, y el
`GITHUB_TOKEN` no sirve para ninguna de las dos cosas: no escribe en otro repo,
y un PR creado con él no dispara CI.

La regla que ordena las decisiones es el **principio de mínimo privilegio**:
cada pieza recibe solo el permiso que su tarea necesita, por el tiempo que lo
necesita, y nada más. Si una pieza se compromete, el daño queda acotado a lo que
esa pieza podía hacer.

Buffer ofrece dos tipos de credencial:

- **Personal Access** (API key): la llave de la propia cuenta, para scripts y
  automatizaciones que difunden en los canales de esa misma cuenta.
- **App Clients** (OAuth): para que una aplicación de terceros actúe sobre
  cuentas _de otras personas_, que la autorizan con un flujo de login,
  redirección y tokens que se renuevan.

## Decisión

**Una credencial por función.** Cada job recibe una sola credencial, guardada en
un _environment_ que solo admite despliegues desde `main`, de modo que ningún
otro workflow ni rama pueda leerla. `GITHUB_TOKEN` queda en `contents: read` en
todos los jobs, y cada workflow declara `permissions` explícitos.

| Job                 | Credencial                                                                                               | Environment      |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ---------------- |
| `proponer` (cron)   | App **propuestas**: variable `SOCIAL_PROPOSALS_BOT_CLIENT_ID`, secret `SOCIAL_PROPOSALS_BOT_PRIVATE_KEY` | `propuestas`     |
| `difundir`          | `BUFFER_API_KEY` (escritura)                                                                             | `buffer`         |
| `registrar`         | App **registro**: variable `SOCIAL_RECORD_BOT_CLIENT_ID`, secret `SOCIAL_RECORD_BOT_PRIVATE_KEY`         | `registro`       |
| Smoke test (manual) | `BUFFER_READ_ONLY_API_KEY` (solo lectura)                                                                | `buffer-lectura` |

Cada pieza ve solo lo que necesita: el cron que propone no toca Buffer ni
`mistorias-contenido`; el job que difunde no puede abrir PRs; el que registra no
puede publicar en redes; y el smoke test no puede escribir en Buffer. No hay
environment de aprobación: la difusión se autoaprueba
([ADR 0003](0003-flujo-de-difusion-automatica.md)).

### Credencial de Buffer: Personal Access

Mistorias difunde solo en sus propios canales, así que se usa **Personal
Access**. OAuth agregaría una redirección, un _refresh token_ que renovar y una
aplicación que registrar, sin aportar nada a una sola organización.

La llave de escritura la lee solo `difundir`, desde
`process.env.BUFFER_API_KEY`; falla con un mensaje claro si falta y nunca la
imprime ni la incluye en un error. En local, `.env` (ya ignorado por
`.gitignore`) y `.env.example` documenta la variable sin valor. Los tests de
integración y la CI no la necesitan: corren contra un servidor falso
([ADR 0005](0005-tests-de-integracion-con-servidor-falso.md)).

El smoke test de solo lectura usa una **llave distinta**, con permiso de solo
lectura. **Sin verificar:** que Buffer ofrezca llaves con permisos acotados y
más de una llave en el plan gratuito
([spike #11](https://github.com/mistorias/mistorias-redes-sociales/issues/11)).
Si no las ofrece, el smoke test se corre solo en local con `.env`, nunca en
Actions, y el environment `buffer-lectura` no se crea.

### Bots de GitHub: dos Apps, distintas de la de contenido

Los PRs los abren dos **GitHub Apps nuevas**, distintas de la que mistorias-web
usa para actualizar el contenido (`CONTENT_BOT_*`):

| App            | Instalada solo en          | Permisos de repositorio                   |
| -------------- | -------------------------- | ----------------------------------------- |
| **propuestas** | `mistorias-redes-sociales` | `contents: write`, `pull_requests: write` |
| **registro**   | `mistorias-contenido`      | `contents: write`, `pull_requests: write` |

El token de instalación se genera en cada job y vence en una hora; el job
`registrar` lo genera al final, cuando ya tiene el resultado. Son dos Apps y no
una porque una sola clave privada podría emitir tokens para ambos repos: si se
comprometiera la clave del cron, no llegaría a `mistorias-contenido`, y si se
comprometiera la del registro, no llegaría a este repo. Ninguna hace merge: el
flujo solo abre PRs. Conviene que la protección de `main` de los dos repos donde
escriben lo exija también.

### Variable de la ventana de cancelación

`BROADCAST_CANCEL_WINDOW_SECONDS` es una **variable** de repositorio, no un
secret: no es sensible y conviene verla en la configuración. Vacía o ausente
vale 60; el job `difundir` falla si no es un entero entre 10 y 3600.

### Lo que no tiene credenciales

- El cron lee `/historias.json` por HTTP público, sin secretos.
- mistorias-web no recibe ninguna credencial hacia este repo.

### Rotación

Cada credencial se rota sola, sin tocar las demás, si se filtra o una vez al
año:

- **Llave de Buffer:** generar una nueva Personal Access key, revocar la
  anterior, reemplazar el secret del environment correspondiente y lanzar a mano
  el smoke test para confirmar que responde.
- **App:** generar una nueva clave privada, reemplazar el secret de su
  environment y borrar la clave anterior en la configuración de la App.

## Consecuencias

- Una llave filtrada desde un `.env` local afecta solo a Buffer, y se revoca sin
  tocar GitHub.
- Hay más piezas que configurar a mano: dos Apps y tres o cuatro environments.
  El README las lista como pendientes de ejecución. Es el costo de que ninguna
  credencial alcance más de lo que su job necesita.
- Los límites del plan gratuito de Buffer (1 Personal Access key; 100 requests
  cada 15 minutos y 3000 cada 30 días) salen de fuentes secundarias: no se pudo
  abrir developers.buffer.com al escribir este ADR. El spike #11 los confirma.
