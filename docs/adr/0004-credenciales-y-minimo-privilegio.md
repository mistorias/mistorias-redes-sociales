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

### Credencial de Buffer: Personal Access

Mistorias difunde solo en sus propios canales, así que se usa **Personal
Access**. OAuth agregaría una redirección, un _refresh token_ que renovar y una
aplicación que registrar, sin aportar nada a una sola organización.

| Dónde                     | Cómo                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GitHub                    | Secret `BUFFER_API_KEY` del _environment_ `buffer` de este repo                                                |
| Jobs que la leen          | Solo `borradores` y `agendar`, que declaran `environment: buffer`; el cron y el job `aprobacion` no la ven     |
| Desarrollo local          | `.env` (ya ignorado por `.gitignore`); `.env.example` documenta la variable sin valor                          |
| Tests de integración y CI | No la necesitan: corren contra un servidor falso ([ADR 0005](0005-tests-de-integracion-con-servidor-falso.md)) |

El código lee la llave de `process.env.BUFFER_API_KEY` y falla con un mensaje
claro si no está; nunca la imprime ni la incluye en un error.

### Bot de GitHub: una App propia, distinta de la de contenido

Los PRs los abre una **GitHub App nueva** (el bot de redes), distinta de la que
mistorias-web usa para actualizar el contenido (`CONTENT_BOT_*`):

| Permiso                   | Valor                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| Instalada en              | Solo `mistorias-redes-sociales` y `mistorias-contenido`          |
| Permisos de repositorio   | `contents: write`, `pull_requests: write`; nada más              |
| Credenciales en este repo | Variable `SOCIAL_BOT_CLIENT_ID`, secret `SOCIAL_BOT_PRIVATE_KEY` |
| Token                     | De instalación, generado en cada job; vence en una hora          |

Es una App distinta porque el job que la usa también tiene la llave de Buffer, y
con ella puede difundir en redes. Si se comprometiera el bot de contenido, no
llegaría a las redes; si se comprometiera el bot de redes, no llegaría a
mistorias-web. Ninguno de los dos hace merge: el flujo solo abre PRs, y el merge
queda en manos de una persona. Conviene que la protección de `main` de los dos
repos donde escribe el bot lo exija también.

### La aprobación es un environment sin secretos

La _Aprobación de la difusión_
([ADR 0003](0003-flujo-de-difusion-automatica.md)) vive en un segundo
environment, `difusion`, que tiene revisor obligatorio y **ningún secreto**. El
job `agendar` depende de él (`needs: aprobacion`) y es el que entra a `buffer`.
Así la llave vive en un solo lugar y se rota en uno solo, y aprobar no le da a
nadie acceso a ella. Mientras haya una sola persona en el equipo, `difusion`
necesita _Prevent self-review_ apagado; si no, nadie podría aprobar.

### Lo que no tiene credenciales

- El cron que lee `/historias.json` usa HTTP público, sin secretos.
- El job `aprobacion` solo espera el clic; no lee secretos.
- mistorias-web no recibe ninguna credencial hacia este repo.

### Rotación

Si la llave se filtra, o una vez al año:

1. Generar una nueva Personal Access key en Buffer y revocar la anterior.
2. Reemplazar el secret `BUFFER_API_KEY` del environment `buffer`.
3. Lanzar a mano el smoke test de solo lectura para confirmar que la llave nueva
   responde.

Para la App: generar una nueva clave privada, reemplazar
`SOCIAL_BOT_PRIVATE_KEY` y borrar la clave anterior en la configuración de la
App.

## Consecuencias

- Una llave filtrada desde un `.env` local afecta solo a Buffer, y se revoca sin
  tocar GitHub.
- Hay dos Apps que mantener en lugar de una. Es el costo de que difundir en
  redes y actualizar el contenido queden aislados entre sí.
- Hay dos environments (`buffer` y `difusion`) que configurar a mano en GitHub;
  el README los lista como pendientes de ejecución.
- Los límites del plan gratuito de Buffer (1 Personal Access key; 100 requests
  cada 15 minutos y 3000 cada 30 días) salen de fuentes secundarias: no se pudo
  abrir developers.buffer.com al escribir este ADR. Hay que confirmarlos en la
  consola de Buffer al generar la llave y corregir este párrafo si difieren.
