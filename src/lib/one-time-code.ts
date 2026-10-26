// Pull the emailed code out of whatever was copied: just the code, or a whole sentence or
// email around it. A run of exactly that many digits wins; otherwise the digits alone, if
// there are exactly that many (a code copied with spaces or dashes in it).

export function codeFromText(text: string, length: number) {
  const run = text.match(/\d+/g)?.find((digits) => digits.length === length);
  if (run) return run;
  const digits = text.replace(/\D/g, '');
  return digits.length === length ? digits : null;
}
