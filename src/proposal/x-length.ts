// Largo de un texto según X, que no es el `length` de JavaScript (ADR 0003).
// Sigue las reglas de twitter-text (configuración v3):
// - cada enlace cuenta 23, sin importar su largo;
// - un emoji cuenta 2, aunque esté hecho de varios puntos de código;
// - el resto cuenta 1 si cae en los rangos latinos y de puntuación, y 2 si no.

export const X_MAX_LENGTH = 280;

const URL_LENGTH = 23;
const EMOJI_LENGTH = 2;
const URL = /https?:\/\/\S+/gu;
const EMOJI = /\p{Extended_Pictographic}/u;

const LIGHT_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

const codePointWeight = (codePoint: number): number =>
  LIGHT_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to)
    ? 1
    : 2;

const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });

const textLength = (text: string): number =>
  [...segmenter.segment(text)].reduce(
    (total, { segment }) =>
      total +
      (EMOJI.test(segment)
        ? EMOJI_LENGTH
        : [...segment].reduce(
            (sum, char) => sum + codePointWeight(char.codePointAt(0) ?? 0),
            0,
          )),
    0,
  );

export const xLength = (text: string): number => {
  const normalized = text.normalize("NFC");
  const urls = normalized.match(URL) ?? [];
  const rest = normalized.replace(URL, "");
  return urls.length * URL_LENGTH + textLength(rest);
};
