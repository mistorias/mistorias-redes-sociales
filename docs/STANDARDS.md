# Estándares de Desarrollo

Este archivo documenta los estándares de código, commits y pull requests de este repo. Están
alineados con los de
[mistorias-web](https://github.com/mistorias/mistorias-web/blob/main/docs/STANDARDS.md); lo que
cambia acá es el alcance, porque el tech stack de este repo está decidido solo parcialmente (ver
[ADR 0002](adr/0002-tech-stack-integracion-buffer.md)) y porque buena parte del contenido es
plantillas y calendario, no código.

## Marca y Lineamientos Editoriales

Todo el trabajo debe alinearse con la
[esencia de marca de Mistorias](https://github.com/mistorias/mistorias-esencia-de-marca):

- **Empatía** — personas antes que datos
- **Transparencia** — contexto claro, fuentes visibles
- **Empoderamiento** — comprensión que habilita la acción
- **Claridad** — lo complejo se vuelve entendible

Esto se traduce en plantillas, registros y código **centrados en las personas**, **transparentes**,
**que empoderan a quienes contribuyen** y **claros**.

## Idioma

El idioma en que se escribe cada cosa está definido en [docs/IDIOMA.md](IDIOMA.md).

## Estándares de Código

Este repo aloja plantillas y calendario editorial en markdown, más una pieza de código en Node +
TypeScript ([ADR 0002](adr/0002-tech-stack-integracion-buffer.md)): el script o skill que llama a la
API de Buffer para publicar lo que arma el skill `publicar-en-redes`. Lleva tests — no es código
hipotético a futuro, es parte del alcance del repo. Este repo es agnóstico a lo publicado: no guarda
un registro de qué se publicó efectivamente; eso se define en una sesión aparte en
`mistorias-contenido`.

Ese código sigue los mismos principios de mistorias-web:

1. **Principios SOLID**
   - Responsabilidad Única — cada módulo tiene una sola razón para cambiar
   - Abierto/Cerrado — abierto a extensión, cerrado a modificación
   - Sustitución de Liskov — los subtipos deben poder sustituir a sus tipos base
   - Segregación de Interfaces — varias interfaces específicas en vez de una general
   - Inversión de Dependencias — depender de abstracciones, no de implementaciones concretas

2. **Código Limpio**
   - Nombres significativos que revelan la intención
   - Funciones pequeñas y enfocadas (que hagan una sola cosa bien)
   - Los comentarios explican el _por qué_, no el _qué_ (el código ya muestra el qué)
   - DRY: no te repitas — extrae los patrones que se repiten, evitando caer en abstracciones
     prematuras (ver [Sin Abstracciones Prematuras](#sin-abstracciones-prematuras))
   - Sin optimización prematura

3. **Arquitectura Limpia**
   - Separación de responsabilidades (lógica de negocio, manejo de credenciales, llamada a la API de
     Buffer)
   - Las dependencias apuntan hacia adentro (nunca hacia afuera)
   - La lógica de negocio central es independiente de la librería HTTP o del SDK que se use para
     llamar a Buffer
   - Diseñado para ser testeable

4. **Alta Cohesión, Bajo Acoplamiento**
   - La funcionalidad relacionada se agrupa junta
   - Dependencias mínimas entre módulos
   - Contratos claros entre capas

5. **Programación Funcional Siempre Que Sea Posible**
   - Preferir inmutabilidad y funciones puras
   - Evitar efectos secundarios en los límites del sistema
   - Preferir composición antes que herencia
   - Aplicar estos principios siempre que el contexto lo permita; si el lenguaje elegido o su
     ecosistema exige un enfoque imperativo, se documenta el motivo

6. **Desarrollo Guiado por Pruebas (TDD)**
   - El test se escribe siempre primero: nunca después ni junto con la implementación. Se empieza
     con un test que falla (rojo primero); esto garantiza que el test no tenga falsos positivos ni
     falsos negativos
   - Se implementa lo mínimo necesario para que el test pase, nada más
   - Si se quiere agregar más código o funcionalidad, primero se debe crear un test que lo cubra
   - Ciclo Rojo → Verde → Refactor
   - Las expectativas de un test se escriben a mano, como valores literales: nunca se calculan con
     el código que se prueba ni con otras funciones de negocio

### Específico de TypeScript

- Usar modo estricto
- Preferir `type` sobre `interface`, salvo que se necesite comportamiento tipo clase
- Evitar `any` — usar `unknown` si es necesario, y luego acotar el tipo
- Validar en runtime la respuesta de la API de Buffer en vez de confiar en el tipo declarado (igual
  que mistorias-web hace con Zod para sus datos externos); la librería concreta se elige al
  construir la integración

### Pendiente del ADR de tech stack

Lo siguiente sigue abierto (ver [ADR 0002](adr/0002-tech-stack-integracion-buffer.md), sección
Pendiente) y se documenta acá cuando se decida:

- Framework de testing y umbral de cobertura (en mistorias-web es 90%, medido en cada corrida; ver
  su
  [Control de cobertura](https://github.com/mistorias/mistorias-web/blob/main/docs/STANDARDS.md#control-de-cobertura)
  como referencia, no como número ya decidido para este repo)
- Cómo se manejan las credenciales de la API de Buffer sin commitearlas

### Formato de Markdown

Las líneas, de prosa y de código, se envuelven a 80 columnas: el equipo también lee el repo desde el
celular, donde una línea más ancha que la pantalla obliga a desplazarse de lado. El ancho vive en
`.prettierrc.json`, así que aplica igual a markdown y al código TypeScript que venga. `pnpm format:markdown` hace el reflow con prettier y `pnpm lint:markdown` lo verifica;
tablas y bloques de código quedan fuera de ese límite porque reformatearlos los vuelve ilegibles.
Ver `.markdownlint-cli2.mjs` para el resto de los overrides sobre la config de
`@github/markdownlint-github`, cada uno con su justificación en comentario.

### Sin Abstracciones Prematuras

Tres líneas de código similares son preferibles a una función auxiliar creada antes de tiempo. Si un
patrón se repite en distintos dominios, se extrae. Si está aislado, se deja tal cual.

---

## Estándares de Commits

### Conventional Commits

Todos los commits siguen [Conventional Commits](https://www.conventionalcommits.org/) en castellano.

Formato:

```text
<tipo>(<alcance>): <asunto en presente>

<cuerpo explicando el por qué y el qué>
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

`feat` se reserva para lo que el lector o quien ejecuta la publicación semanal puede hacer o ver de
nuevo (por ejemplo, una plantilla nueva o el script de Buffer). Un cambio que solo documenta una
decisión o un registro usa `docs`.

- ✅ `docs: el ADR 0001 registra la elección de Buffer como herramienta de publicación`
- ❌ `feat: agregar ADR de Buffer` (no hay nada nuevo que el equipo pueda hacer; además no está en
  estilo preemptive)

### Atomic Commits

Cada commit representa un cambio lógico y autocontenido:

- No mezclar cambios sin relación (por ejemplo, una plantilla nueva y una corrección del calendario)
- Un cambio por commit, o uno pequeño si el cambio es grande
- No commitear contenido a medio llenar

Esta práctica también aplica al agente de IA que trabaja sobre este repositorio: hacer commits
atómicos genera puntos de checkpoint, de modo que se pueda revertir a cualquiera de los distintos
puntos de progreso si algo sale mal.

### Preemptive Commits

Los commits describen el **resultado** del cambio en presente, en tercera persona, enfocándose en
qué gana quien lee el repo o quien ejecuta la publicación semanal.

Ejemplos:

- ✅ `docs: el equipo dispone de la plantilla semanal de publicación por red`
- ❌ `add plantilla semanal` (muy pasivo, no está en castellano ni en formato conventional commits)
- ✅ `chore: el script de Buffer lee las credenciales desde variables de entorno`
- ❌ `fix credenciales` (muy genérico)

---

## Estándares de Pull Requests

### Descripción del PR

Todo PR debe incluir:

1. **Qué cambió** — un resumen en una línea del cambio
2. **Por qué cambió** — el problema que resuelve o el requerimiento del plan que cumple
3. **Cómo verificarlo** — pasos para revisar el cambio (leer la plantilla, revisar el registro,
   correr el script una vez exista, etc.)
4. **Issue relacionado** — enlace al issue si aplica (ej. `Closes #19`)

La plantilla vive en [`.github/pull_request_template.md`](../.github/pull_request_template.md) y
GitHub la carga sola al abrir un PR.

### Antes de Solicitar Revisión

- `pnpm format:markdown` y `pnpm lint:markdown` pasan sin errores (ver
  [CONTRIBUTING.md](../CONTRIBUTING.md))
- Los commits son atómicos y siguen Conventional Commits
- La rama está actualizada respecto a `main`
- Si el cambio toca el script de Buffer: sus tests pasan y no hay credenciales ni API keys en el
  diff

### Título del PR

Debe seguir el formato de Conventional Commits, en estilo preemptive:

```text
docs: el equipo dispone de la plantilla semanal de publicación por red (issue #XX)
feat: el script de Buffer publica el post armado por publicar-en-redes (issue #YY)
```

Un cambio que rompe compatibilidad se marca con `!` tras el tipo (`feat!: ...`) en el título de cada
commit que lo introduce, y el título del PR lo hereda.

---

## Referencias

- [Mistorias Esencia de Marca](https://github.com/mistorias/mistorias-esencia-de-marca) — principios
  de marca, lineamientos editoriales
- [mistorias-web/docs/STANDARDS.md](https://github.com/mistorias/mistorias-web/blob/main/docs/STANDARDS.md)
  — versión de referencia de estos estándares, con las secciones de código ya resueltas para ese
  stack
- [README.md](../README.md) — propósito del repo
- [CONTRIBUTING.md](../CONTRIBUTING.md) — flujo de contribución
- [docs/IDIOMA.md](IDIOMA.md) — qué idioma usar dónde
- [docs/adr/](adr/) — decisiones arquitectónicas, incluyendo el ADR pendiente de tech stack
