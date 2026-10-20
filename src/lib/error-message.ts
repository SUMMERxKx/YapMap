/** The text to show for a failed action: the error's own message, or `fallback` when it has none. */
export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}
