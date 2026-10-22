// Tidies what people type before it is saved, matching the server's rules (see
// private.has_visible_text and private.is_clean_text in supabase/migrations). Emoji, accents
// and every alphabet are kept; what goes is what breaks how text looks on someone else's screen.

// Control characters other than tab and line breaks, and the direction overrides and isolates
// that flip how the text around them reads ("Bob" + U+202E + "gnp.exe" shows as "Bobexe.png").
const UNSAFE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

// Characters that draw nothing: zero-width spaces and joiners, direction marks, Hangul and
// Braille blanks, variation selectors and tag characters (U+E0000 to U+E007F, written here as
// their two UTF-16 halves). Only used to check for visible text, never removed, since joiners,
// selectors and tags are part of many emoji.
const INVISIBLE =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u2060-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0]|\uDB40[\uDC00-\uDC7F]/g;

// A letter with more than three accents piled on it ("Zalgo" text that spills over the lines
// around it) keeps its first three.
const PILED_ACCENTS = /([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{3})[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+/g;

/** One line, like a name or a title: line breaks and tabs become spaces, ends trimmed. */
export function cleanLine(text: string) {
  return text
    .replace(UNSAFE, '')
    .replace(PILED_ACCENTS, '$1')
    .replace(/[\t\r\n\u2028\u2029]+/g, ' ')
    .trim();
}

/** Several lines, like an intro or a message: at most one empty line in a row, ends trimmed. */
export function cleanLines(text: string) {
  return text
    .replace(/\r\n?|[\u2028\u2029]/g, '\n')
    .replace(UNSAFE, '')
    .replace(PILED_ACCENTS, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Whether the text shows anything: not only spaces, line breaks or invisible characters. */
export function hasVisibleText(text: string) {
  return text.replace(INVISIBLE, '').trim().length > 0;
}
