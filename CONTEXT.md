# Mistorias Redes Sociales

Ejecución de la difusión de las historias de Mistorias en Facebook, Instagram y
X. Este archivo define el lenguaje ubicuo del repositorio, en castellano
peruano, en el mismo formato que el
[CONTEXT.md de mistorias-web](https://github.com/mistorias/mistorias-web/blob/main/CONTEXT.md).
En el código, los términos van en inglés (ver [docs/IDIOMA.md](docs/IDIOMA.md));
cada entrada indica su nombre en el código cuando ya lo tiene.

## Lenguaje ubicuo

**Publicación**: Poner en producción el sitio con una etiqueta de versión. Es un
término de mistorias-web y aquí se usa solo en ese sentido: una historia
_publicada_ es la que ya está en mistorias.pe. _Avoid_: usarlo para un post en
redes (eso es una Difusión).

**Difusión**: Llevar una historia publicada a las redes sociales: el conjunto de
posts, uno por red, que la anuncian. En el código: `broadcast`. _Avoid_:
publicación, post (como término de dominio), anuncio.

**Red**: Cada red social donde se difunde: Facebook, Instagram o X. En el
código: `network`. _Avoid_: canal (en Buffer, "channel" es la cuenta conectada,
no la red), plataforma.

**Plantilla de red**: El texto fijo de cada red, que el script llena con los
datos de la historia. Cambiar el tono o la pregunta de acción de una red es
editar su plantilla. En el código: `template`.

**Gancho**: La primera línea de cada post. Es el `summary` de la historia, sin
cambios.

**Cierre**: Lo que va después del gancho y cambia por red: la pregunta de acción
y la invitación a leer.

**Enlace con UTM**: La URL de la historia con `utm_source=<red>`,
`utm_medium=social` y `utm_campaign=<slug>`, para que la analítica distinga de
qué red llegó cada visita.

**Propuesta de difusión**: El archivo `difusiones/<slug>.json` con los textos de
cada red, y el PR que lo trae. Hacer disponible ese PR (merge) aprueba el texto,
no la difusión. _Avoid_: PR 1, borrador (ese término es de Buffer).

**Borrador**: El post creado en Buffer que todavía no está en la cola. Se revisa
con la vista previa de cada red antes de aprobar. En el código: `draft`.

**Aprobación de la difusión**: El clic en _Approve deployment_ del environment
`difusion` en GitHub, después de revisar los borradores. Es el único acto que
autoriza que algo salga en redes. _Avoid_: merge, aprobación del PR.

**Agendado**: Un borrador que pasó a la cola de Buffer con fecha y hora: dos
minutos después de la aprobación. En el código: `scheduled`.

**Difundido**: Estado del post que Buffer confirmó como enviado a la red. Es
valor de dominio y se escribe así en los datos: `difundido`.

**Fallido**: Estado del post que Buffer no pudo enviar. No se reintenta solo.
Valor de dominio: `fallido`.

**Registro de difusión**: El archivo `stories/<slug>/difusion.json` en
mistorias-contenido, con lo que salió en cada red. Lo escribe solo el bot de
redes, por PR. En el código: `broadcastRecord`. _Avoid_: registro de
publicaciones.

**Feed de historias**: `/historias.json` en mistorias.pe, en formato JSON Feed.
Es el disparador de la difusión: una historia que aparece ahí sin registro de
difusión es candidata. En el código: `storyFeed`.

## Ejemplo de diálogo

**Dev:** Ya está disponible la propuesta de difusión de la historia de Dayana,
pero en Instagram no salió nada.

**Editor:** Correcto: hacer disponible la propuesta solo crea los borradores.
Falta la aprobación de la difusión.

**Dev:** Reviso los borradores en Buffer y apruebo el deployment en GitHub.

**Editor:** Sí. En dos minutos quedan agendados, y cuando Buffer confirme llega
el PR con el registro de difusión: `difundido` o `fallido` por cada red.
