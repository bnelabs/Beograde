// Deterministic Serbian Latin → Cyrillic transliteration. The trick is that
// "lj", "nj", "dž" are digraphs in Latin but single letters in Cyrillic. We
// replace longest-first to avoid collisions with the single-letter table.

const DIGRAPHS = [
  ['Lj', 'Љ'], ['LJ', 'Љ'], ['lj', 'љ'],
  ['Nj', 'Њ'], ['NJ', 'Њ'], ['nj', 'њ'],
  ['Dž', 'Џ'], ['DŽ', 'Џ'], ['dž', 'џ'],
];

const SINGLES = {
  'A':'А','B':'Б','V':'В','G':'Г','D':'Д','Đ':'Ђ','E':'Е','Ž':'Ж',
  'Z':'З','I':'И','J':'Ј','K':'К','L':'Л','M':'М','N':'Н','O':'О',
  'P':'П','R':'Р','S':'С','T':'Т','Ć':'Ћ','U':'У','F':'Ф','H':'Х',
  'C':'Ц','Č':'Ч','Š':'Ш',
  'a':'а','b':'б','v':'в','g':'г','d':'д','đ':'ђ','e':'е','ž':'ж',
  'z':'з','i':'и','j':'ј','k':'к','l':'л','m':'м','n':'н','o':'о',
  'p':'п','r':'р','s':'с','t':'т','ć':'ћ','u':'у','f':'ф','h':'х',
  'c':'ц','č':'ч','š':'ш',
};

const SINGLES_INVERSE = Object.fromEntries(
  Object.entries(SINGLES).map(([latn, cyrl]) => [cyrl, latn]),
);

// Cyrillic digraph codepoints that map back to Latin digraphs.
// Uppercase variants (Љ, Њ, Џ) need one-char lookahead to distinguish
// title-case ("Lj") from all-caps ("LJ") output.
const CYRL_DIGRAPH_UPPER = new Map([
  ['Љ', { allCaps: 'LJ', titleCase: 'Lj' }],
  ['Њ', { allCaps: 'NJ', titleCase: 'Nj' }],
  ['Џ', { allCaps: 'DŽ', titleCase: 'Dž' }],
]);
const CYRL_DIGRAPH_LOWER = new Map([
  ['љ', 'lj'],
  ['њ', 'nj'],
  ['џ', 'dž'],
]);

// Returns true if `c` is a cased letter whose uppercase form differs from its
// lowercase form (i.e. it's unambiguously an uppercase letter).
const isUpperLetter = (c) => c && c === c.toUpperCase() && c !== c.toLowerCase();

export function latnToCyrl(input) {
  let out = input;
  for (const [latn, cyrl] of DIGRAPHS) {
    out = out.replaceAll(latn, cyrl);
  }
  let result = '';
  for (const ch of out) {
    result += SINGLES[ch] ?? ch;
  }
  return result;
}

export function cyrlToLatn(input) {
  const chars = [...input];
  let result = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CYRL_DIGRAPH_UPPER.has(ch)) {
      // Peek at the next codepoint: if it's an uppercase letter emit ALL-CAPS,
      // otherwise emit title-case (covers end-of-string, punctuation, digits).
      const { allCaps, titleCase } = CYRL_DIGRAPH_UPPER.get(ch);
      result += isUpperLetter(chars[i + 1]) ? allCaps : titleCase;
    } else if (CYRL_DIGRAPH_LOWER.has(ch)) {
      result += CYRL_DIGRAPH_LOWER.get(ch);
    } else {
      result += SINGLES_INVERSE[ch] ?? ch;
    }
  }
  return result;
}

export function roundTripsCleanly(latn) {
  return cyrlToLatn(latnToCyrl(latn)) === latn;
}
