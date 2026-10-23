# ADR 0003: Flujo de difusión automática en redes sociales

## Estado

Aceptada.

Los términos en cursiva (_Difusión_, _Borrador_, _Aprobación de la difusión_,
etc.) se definen en [CONTEXT.md](../../CONTEXT.md).

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
- **Difundir es una decisión humana**, igual que publicar en mistorias-web. Se
  aprueba lo que de verdad va a salir, no solo un archivo de texto.
- **Principio de mínimo privilegio** (ver
  [ADR 0004](0004-credenciales-y-minimo-privilegio.md)): ninguna pieza recibe
  más permiso del que su tarea necesita.

## Decisión

El skill `publicar-en-redes` se reemplaza por scripts deterministas en este
repo, encadenados por GitHub Actions, con una revisión del texto y una
aprobación aparte de la difusión:

```mermaid
flowchart TD
  A[Publicación en mistorias.pe<br/>etiqueta de versión] --> B[/historias.json<br/>JSON Feed/]
  C[Cron horario<br/>en redes-sociales] -->|lee| B
  C -->|historia sin difusión| D[Script arma los textos<br/>plantilla por red + summary + UTM]
  D --> E[PR de propuesta de difusión<br/>difusiones/slug.json]
  E -->|revisión del texto y merge| F[Job borradores<br/>crea borradores en Buffer]
  F --> G{Aprobación de la difusión<br/>clic en GitHub}
  G -->|aprobada| H[Job agendar<br/>relee borradores y agenda a +2 min]
  G -->|rechazada| X[Sin difusión<br/>borradores se borran en Buffer]
  H --> I[Espera y consulta el estado]
  I -->|difundido / fallido| J[PR de registro en mistorias-contenido<br/>stories/slug/difusion.json]
```

1. **Disparador: el feed del sitio.** mistorias-web publica `/historias.json` en
   formato JSON Feed (su ADR 0033), generado en el build. Un cron horario de
   este repo lo lee por HTTP. Como es el feed del sitio en producción, si el
   despliegue falla no se difunde nada, y la web no necesita ninguna credencial
   hacia este repo. Se descartaron `repository_dispatch` desde el despliegue de
   la web (le daría a la web permiso de escritura sobre este repo) y leer los
   _deployments_ de GitHub (acopla el script a cómo despliega la web).
2. **Propuesta de difusión, sin IA.** Un script aplica plantillas fijas por red:
   el gancho es el `summary`, el cierre es el de cada red y el enlace lleva UTM
   (`utm_source=<red>&utm_medium=social&utm_campaign=<slug>`). Valida los
   límites de caracteres de cada red. El resultado queda en
   `difusiones/<slug>.json` y llega como **PR de propuesta de difusión**: ahí se
   revisa el texto y, si hace falta, se ajusta a mano. Si alguna vez una red
   necesita un texto que la plantilla no resuelve, se le puede pedir a Claude
   bajo demanda desde el PR; no es el camino por defecto.
3. **Borradores.** El merge de esa propuesta dispara el job `borradores`, que
   crea un _Borrador_ por red en Buffer y deja en el resumen del job el enlace a
   cada uno. Todavía no se agenda nada.
4. **Aprobación de la difusión.** El job `aprobacion` declara el _environment_
   `difusion`, que tiene revisor obligatorio y ningún secreto: queda en pausa
   hasta que una persona revisa los borradores en Buffer (con la vista previa de
   cada red, la imagen y la tarjeta del enlace) y da clic en _Approve
   deployment_. GitHub registra quién aprobó y cuándo. Rechazar el deployment, o
   no aprobarlo en 30 días (el plazo de GitHub), significa no difundir; los
   borradores se borran a mano en Buffer.
5. **Agendar.** El job `agendar` (`needs: aprobacion`) **relee cada borrador**
   en Buffer, por si alguien lo editó ahí, y lo pasa a agendado para **dos
   minutos después** de la aprobación: un margen corto para cancelarlo si algo
   se ve mal a último momento. No se usa el flujo de aprobación propio de Buffer
   (no está en el plan gratuito, y la aprobación ya ocurre en GitHub).
6. **Confirmar.** El mismo job espera esos dos minutos y consulta en Buffer el
   estado de cada post, con unos pocos reintentos hasta un tope de unos 15
   minutos. Luego abre el **PR de registro** en `mistorias-contenido`, con el
   _Registro de difusión_ en `stories/<slug>/difusion.json` (contrato en
   `docs/registro-de-difusion.md` de ese repo) y el estado `difundido` o
   `fallido`. Registra el texto releído de Buffer, que es el que salió. Un fallo
   no se reintenta solo: queda registrado y a la vista.
7. **Sin duplicados.** El cron no abre una propuesta si ya existe
   `difusiones/<slug>.json` o un PR abierto para ese slug. El job `agendar` no
   agenda en una red que ya tiene una entrada `difundido` en el registro.

## Consecuencias

- Difundir una historia no consume tokens de IA. Lo que cuesta revisar es el
  texto, en la propuesta, y el resultado final, en los borradores.
- Revisar el texto y autorizar la difusión son dos pasos separados: un merge
  hecho por costumbre deja borradores, no posts publicados.
- El texto queda versionado dos veces, con propósitos distintos: la propuesta
  aprobada aquí (lo que se pidió difundir) y el registro en
  `mistorias-contenido` (lo que Buffer confirmó). Este repo sigue sin guardar el
  registro de difusión.
- **Riesgo no verificado:** la interfaz web de Buffer pasa un borrador a la cola
  (_Add to Queue_ / _Schedule Post_), pero no se pudo confirmar que la **API**
  lo haga. Si no puede, el job `agendar` borra el borrador y crea el post
  agendado con el texto releído, y el `bufferId` que se registra es el del post
  final.
- mistorias-web tiene que publicar `/historias.json` y aceptar `difusion.json`
  dentro de la carpeta de una historia: hoy su gate de carpetas solo admite
  `principal.jpg` y rompería el build. Ese cambio va en mistorias-web y **se
  fusiona antes** que el primer registro.
- Consumo de la API: crear, releer y agendar cada borrador, más las consultas de
  estado, suman unas 20 llamadas por semana; muy por debajo de las 3000 cada 30
  días del plan gratuito.
- Un job en pausa esperando la aprobación no consume minutos de GitHub Actions;
  el que espera la confirmación ocupa hasta 15 minutos, sin costo en un repo
  público.
- La "pregunta de acción" que el skill construía en modo mayéutico deja de
  generarse cada semana: pasa a ser parte fija de la plantilla de cada red, y se
  cambia editando la plantilla.
