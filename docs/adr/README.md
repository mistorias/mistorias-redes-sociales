# Decisiones Arquitecturales (ADR)

Índice de los ADR de este repo. El contenido completo de cada decisión, su
contexto y sus consecuencias viven en su propio archivo — esta tabla es solo
para ubicarlos.

| ADR                                                     | Decisión                                                                                          | Estado                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [0001](0001-herramienta-publicacion-buffer.md)          | Herramienta de publicación en redes sociales: Buffer                                              | Aceptada                                                                              |
| [0002](0002-tech-stack-integracion-buffer.md)           | Tech stack de la integración con Buffer: lenguaje, runtime y gestor de paquetes                   | Aceptada parcialmente — manejo de credenciales y framework de testing siguen abiertos |
| [0003](0003-flujo-de-publicacion-automatica.md)         | Flujo de publicación automática: feed del sitio, textos por plantilla sin IA, dos PRs de revisión | Aceptada                                                                              |
| [0004](0004-credenciales-y-minimo-privilegio.md)        | Credenciales de Buffer (Personal Access) y bot propio bajo el principio de mínimo privilegio      | Aceptada                                                                              |
| [0005](0005-tests-de-integracion-con-servidor-falso.md) | Tests de integración contra un servidor falso de Buffer                                           | Aceptada — umbral de cobertura abierto                                                |
