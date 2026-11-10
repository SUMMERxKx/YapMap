// Pull the emailed code out of whatever was copied: just the code, or a whole sentence or
// email around it. The code must be one group of exactly that many digits, either unbroken
// or split once in the middle by a space or a dash (1234 5678, 1234-5678).

export function codeFromText(text: string, length: number) {
  const half = Math.floor(length / 2);
  // Built only from the code length, never from the copied text.
  // eslint-disable-next-line security/detect-non-literal-regexp
  const group = new RegExp(`(?:^|\\D)(\\d{${half}})[ -]?(\\d{${length - half}})(?!\\d)`);
  const match = text.match(group);
  return match ? match[1] + match[2] : null;
}
