// Los temas de una historia vienen en kebab-case (`fenomeno-el-nino`) y se
// difunden como hashtags en camelCase (`#fenomenoElNino`). Ver ADR 0003.

const MAX_HASHTAGS = 2;

// Un hashtag válido solo tiene letras y dígitos (con tildes y eñe: son
// letras) y no es solo dígitos, porque las redes no lo enlazan.
const VALID_HASHTAG_BODY = /^[\p{L}\p{N}]+$/u;
const ONLY_DIGITS = /^\p{N}+$/u;

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

export const toHashtag = (theme: string): string | undefined => {
  const words = theme.split("-");
  if (words.some((word) => word === "")) return undefined;

  const [first = "", ...rest] = words;
  const body = first + rest.map(capitalize).join("");
  if (!VALID_HASHTAG_BODY.test(body) || ONLY_DIGITS.test(body)) {
    return undefined;
  }
  return `#${body}`;
};

export type HashtagPick = {
  readonly hashtags: readonly string[];
  // Un tema que no cumple se reporta en la propuesta, no se convierte a la
  // fuerza: quien revisa decide si corregirlo en el contenido.
  readonly rejected: readonly string[];
};

export const pickHashtags = (themes: readonly string[]): HashtagPick => {
  const hashtags: string[] = [];
  const rejected: string[] = [];
  for (const theme of themes) {
    if (hashtags.length === MAX_HASHTAGS) break;
    const hashtag = toHashtag(theme);
    if (hashtag) hashtags.push(hashtag);
    else rejected.push(theme);
  }
  return { hashtags, rejected };
};
