import markdownIt from "markdown-it";
import { init } from "@github/markdownlint-github";

const markdownItFactory = () => markdownIt({ html: true });

// Overrides sobre la config de @github/markdownlint-github:
// - line-length: 100 columnas en vez de las 80 por defecto, para que se
//   lea bien en terminal al desarrollar. No se revisan tablas ni bloques
//   de código: reformatearlos para que entren en el ancho los vuelve
//   ilegibles. `pnpm format:markdown` (prettier) hace el reflow de la
//   prosa; este límite es la red que avisa si algo quedó sin reflow.
// - ul-style: el paquete fuerza asterisco dentro de su bloque de
//   accesibilidad, pero el carácter del marcador no cambia el HTML que
//   recibe un lector de pantalla (sigue siendo <li>). Usamos guion porque
//   es lo que ya se escribe en todo el repo.
const options = {
  config: init({
    "line-length": { line_length: 100, code_blocks: false, tables: false },
    "ul-style": { style: "dash" },
  }),
  customRules: ["@github/markdownlint-github"],
  markdownItFactory,
  outputFormatters: [
    ["markdownlint-cli2-formatter-pretty", { appendLink: true }],
  ],
};

export default options;
