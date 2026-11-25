# ADR 0003: Flujo de difusión automática en redes sociales

## Estado

Aceptada.

Los términos en cursiva (_Difusión_, _Borrador_, _Autoaprobación de la
difusión_, etc.) se definen en [CONTEXT.md](../../CONTEXT.md).

## Contexto

Hasta ahora los posts de cada semana los armaba el skill `publicar-en-redes`
(gancho = `summary`, cierre por red, UTM) en una conversación con IA. Es trabajo
mecánico: aplicar reglas fijas a lo que ya está escrito en el contenido. Hacerlo
con IA gasta tokens en algo que un script resuelve igual cada vez, y deja el
resultado fuera del repositorio, sin revisión ni historial.

Restricciones:

- **Se difunde solo lo que ya está publicado.** Una historia sale en redes
  cuando ya está en mistorias.pe (su _Publicación_, en el sentido de
  mistorias-web), no cuando entra a `mistorias-contenido`: entre ese merge y la
  etiqueta de versión pueden pasar días, y un enlace a una página que todavía no
  existe es un 404 frente a la audiencia.
- **Difundir parte de una decisión humana y deja un margen para arrepentirse.**
  Hacer disponible la propuesta de difusión es el acto humano. Nadie hace clic
  para aprobar después: queda una _Ventana de cancelación_ en la que se puede
  frenar la difusión.
- **Principio de mínimo privilegio** (ver
  [ADR 0004](0004-credenciales-y-minimo-privilegio.md)): ninguna pieza recibe
  más permiso del que su tarea necesita.

## Decisión

El skill `publicar-en-redes` se reemplaza por scripts deterministas en este
repo, encadenados por GitHub Actions, con una revisión del texto y una
autoaprobación con ventana de cancelación:

```mermaid
flowchart TD
  A[Publicación en mistorias.pe<br/>etiqueta de versión] --> B[/historias.json<br/>JSON Feed/]
  C[Cron horario<br/>en redes-sociales] -->|lee| B
  C -->|historia sin difusión| D[Script arma los textos<br/>plantilla por red + summary + UTM]
  D --> E[PR de propuesta de difusión<br/>difusiones/slug.json]
  E -->|revisión del texto y merge| F[Job difundir<br/>crea borradores en Buffer]
  F --> G{Ventana de cancelación<br/>60 s por defecto}
  G -->|se cancela la ejecución| X[Sin difusión<br/>se borran los borradores]
  G -->|se cumple| H[Relee los borradores<br/>y los agenda a +2 min]
  H --> I[Espera y consulta el estado]
  I -->|difundido / fallido| J[Job registrar<br/>PR de registro en mistorias-contenido<br/>stories/slug/difusion.json]
```

1. **Disparador: el feed del sitio.** mistorias-web publica `/historias.json` en
   formato JSON Feed (su ADR 0033), generado en el build. Un cron horario de
   este repo lo lee por HTTP. Como es el feed del sitio en producción, si el
   despliegue falla no se difunde nada, y la web no necesita ninguna credencial
   hacia este repo. Se descartaron `repository_dispatch` desde el despliegue de
   la web (le daría a la web permiso de escritura sobre este repo) y leer los
   _deployments_ de GitHub (acopla el script a cómo despliega la web).
2. **Propuesta de difusión, sin IA.** Un script arma el texto de cada red de
   [CONTEXT.md](../../CONTEXT.md) (Facebook, Instagram y X) a partir de su
   _Plantilla de red_. La plantilla de cada red sale del plan de redes sociales.
   Los huecos se llenan así:
   - `<RESUMEN_HISTORIA>`: el `summary` de la historia. Va primero.
   - `<LINK>`: el enlace a la historia con UTM
     (`?utm_source=<red>&utm_medium=social&utm_campaign=<slug>`), que arma el
     script. La plantilla ya no escribe los UTM a mano.
   - `<TITULO_PRIMERA_NOTICIA>`: el título de la primera noticia de la sección
     «Noticias principales» de la historia, que es el primer texto en negrita.
     El feed estándar no lo trae: mistorias-web lo agrega en su extensión
     `_mistorias` (`primeraNoticia`), que su
     [ADR 0033](https://github.com/mistorias/mistorias-web/blob/main/docs/adr/0033-feed-de-historias-para-redes.md)
     permite.
   - Hashtags: a partir de los **temas** de la historia, que el feed entrega en
     `items[].tags`. Cada tema está en kebab-case (`fenomeno-el-nino`) y el
     script lo pasa a camelCase con `#` al frente (`#fenomenoElNino`). Un
     hashtag válido solo tiene letras y dígitos, sin espacios ni signos, y no
     es solo dígitos; un tema que no cumpla se reporta, no se convierte a la
     fuerza. Van como máximo **dos** hashtags, los primeros temas del feed, en
     todas las redes.

   La plantilla de Facebook es la base, y Instagram usa la misma, con
   `utm_source=instagram` en el enlace:

   ```text
   <RESUMEN_HISTORIA>

   🤩 Ya está disponible la última historia en <LINK>

   ➡️ Noticia de la semana: <TITULO_PRIMERA_NOTICIA>

   #tag1 #tag2
   ```

   **X tiene su propia variante**, con estas reglas:
   - Sin la línea de la noticia de la semana.
   - Sin líneas en blanco entre párrafos.
   - Hashtags: los dos primeros temas, pero solo los que quepan en 280
     caracteres. Si solo cabe uno, va uno; si ninguno cabe, no va ninguno. Un
     hashtag no se corta a la mitad.
   - El conteo es el de X, no `length` de JavaScript: cada enlace cuenta 23
     caracteres, sin importar su largo, y los emojis cuentan 2.
   - El enlace se acorta con el acortador de Buffer. El canal de X lo tiene
     activado (`buff.ly`); Facebook e Instagram no. El script no llama a ningún
     acortador: Buffer acorta al **crear** el post, sea borrador o agendado, y
     el texto que devuelve ya trae el enlace corto. Ese enlace redirige (302) a
     la URL completa con sus UTM, que no se pierden. Probado con la última
     historia.

   **Imagen.** Cada difusión lleva el `principal.jpg` de la historia. Buffer no
   tiene una operación para subir archivos: recibe la **URL pública** de la
   imagen (`assets.image.url` de `createPost`) y su texto alternativo, que la
   API exige (`metadata.altText`).
   - La URL es la de la imagen que la web ya publicó, `items[].image` del feed:
     un JPG de 1200×630. No se usa la de `mistorias-contenido`, porque solo se
     difunde lo que ya está publicado.
   - El texto alternativo es el `imageAlt` de la historia. El feed estándar no
     lo trae: mistorias-web lo agrega en `_mistorias` (`imageAlt`).
   - Una historia sin imagen no se propone: el script falla y no abre el PR.
     Instagram no publica sin imagen, y las tres redes salen con la misma.
   - La URL y el texto alternativo quedan en `difusiones/<slug>.json`, para
     revisarlos en el PR de propuesta.
   - Probado con el spike: un borrador en X con la URL publicada se creó con la
     imagen (JPEG, 1200×630) y su texto alternativo, y luego se borró.

   El resultado queda en `difusiones/<slug>.json` y llega como **PR de propuesta
   de difusión**: ahí se revisa el texto y, si hace falta, se ajusta a mano. Si
   alguna vez una red necesita un texto que la plantilla no resuelve, se le
   puede pedir a Claude bajo demanda desde el PR; no es el camino por defecto.
3. **Borradores y ventana.** El merge de esa propuesta dispara el job
   `difundir`. Primero valida la configuración; luego crea un _Borrador_ por red
   en Buffer y deja en el resumen del job el enlace a cada uno, el enlace a la
   ejecución y la hora en que cierra la _Ventana de cancelación_. Todavía no se
   agenda nada.
4. **Autoaprobación o cancelación.** La ventana dura lo que diga la variable de
   repositorio `BROADCAST_CANCEL_WINDOW_SECONDS`, y 60 segundos si no existe o
   está vacía. Si no es un entero entre 10 y 3600, el job falla **antes** de
   tocar Buffer. Para **cancelar** se cancela la ejecución en Actions (_Cancel
   workflow_ o `gh run cancel`): un paso `if: cancelled()` borra los borradores
   y no sale nada. No hay job ni environment de aprobación. Quién hizo
   disponible la propuesta y quién canceló queda en el PR y en la ejecución, y
   no se agrega al registro.
5. **Agendar.** Cumplida la ventana, el mismo job **relee cada borrador** en
   Buffer, por si alguien lo editó ahí, y lo pasa a agendado para **dos minutos
   después**. El texto de X que devuelve Buffer ya trae el enlace acortado: ese
   es el que sale, y el que se registra. No se usa el flujo de aprobación propio de Buffer: no está en el
   plan gratuito y la decisión ya ocurrió en GitHub.
6. **Confirmar y registrar.** El job espera esos dos minutos y consulta en
   Buffer el estado de cada post, con unos pocos reintentos hasta un tope de
   unos 15 minutos. Sube el resultado como artefacto y el job `registrar` (otro
   environment, otra credencial; ver
   [ADR 0004](0004-credenciales-y-minimo-privilegio.md)) abre el **PR de
   registro** en `mistorias-contenido`, con el _Registro de difusión_ en
   `stories/<slug>/difusion.json` (contrato en `docs/registro-de-difusion.md` de
   ese repo) y el estado `difundido` o `fallido`. Registra el texto releído de
   Buffer, que es el que salió. Si se canceló `difundir`, `registrar` no corre.
   Un fallo no se reintenta solo: queda registrado y a la vista.
7. **Sin duplicados.** El cron no abre una propuesta si ya existe
   `difusiones/<slug>.json` o un PR abierto para ese slug; por eso una difusión
   cancelada no se vuelve a proponer sola. Para difundirla después se vuelve a
   correr esa ejecución (_Re-run all jobs_). El job `difundir` no agenda en una
   red que ya tiene una entrada `difundido` en el registro.

## Consecuencias

- Difundir una historia no consume tokens de IA. Lo que cuesta revisar es el
  texto, en la propuesta.
- **Ya nadie hace clic.** Si se hace disponible la propuesta y no se mira, la
  difusión sale. La ventana es el único margen, por eso la propuesta no se
  fusiona sola (sin _auto-merge_) y la ventana no se acorta por debajo de 10
  segundos.
- El texto queda versionado dos veces, con propósitos distintos: la propuesta
  aprobada aquí (lo que se pidió difundir) y el registro en
  `mistorias-contenido` (lo que Buffer confirmó). Este repo sigue sin guardar el
  registro de difusión.
- **Sin verificar** (spike en
  [#11](https://github.com/mistorias/mistorias-redes-sociales/issues/11)):
  - La API pasa un borrador a la cola con el mismo id (confirmado en #11), así
    que no hace falta el camino alterno de borrar y crear el agendado.
  - La imagen solo se probó en un borrador, no en una publicación real. En el
    borrador, Buffer conserva la URL de origen; falta confirmar que la descarga
    al publicar y que la URL sigue disponible hasta entonces. En Instagram, la
    proporción 1200×630 (1,905:1) queda al borde del mínimo de 1,91:1 del feed,
    y se verifica antes de la primera difusión.
  - El paso `if: cancelled()` tras una cancelación manual tiene unos minutos de
    gracia en GitHub; hay que comprobarlo con una ejecución cancelada real. Si
    falla, los borradores quedan inertes (un borrador no se publica) y se borran
    a mano.
- mistorias-web tiene que publicar `/historias.json` y aceptar `difusion.json`
  dentro de la carpeta de una historia: hoy su gate de carpetas solo admite
  `principal.jpg` y rompería el build. Ese cambio va en mistorias-web y **se
  fusiona antes** que el primer registro.
- El feed de mistorias-web ya trae los dos datos que las plantillas necesitan
  fuera del estándar: el título de la primera noticia
  (`_mistorias.primeraNoticia`) y el texto alternativo de la imagen
  (`_mistorias.imageAlt`)
  ([mistorias-web#264](https://github.com/mistorias/mistorias-web/issues/264)).
  Está publicado en GitHub Pages; en `mistorias.pe/historias.json` devuelve 404
  hasta que se despliegue a producción, que es el feed que lee el cron.
- Consumo de la API: crear, releer y agendar cada borrador, más las consultas de
  estado, suman unas 20 llamadas por semana; muy por debajo de las 3000 cada 30
  días del plan gratuito.
- El job `difundir` ocupa la ventana más hasta 15 minutos de confirmación, sin
  costo en un repo público.
- La "pregunta de acción" que el skill construía en modo mayéutico deja de
  generarse cada semana: pasa a ser parte fija de la plantilla de cada red, y se
  cambia editando la plantilla.
