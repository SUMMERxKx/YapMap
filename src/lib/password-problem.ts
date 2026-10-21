import { PASSWORD_MIN_LENGTH } from '@/data/constants';

/** What's wrong with a new password and its confirmation, or null when both are fine. */
export function passwordProblem(password: string, confirmation: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password !== confirmation) {
    return "The passwords don't match.";
  }
  return null;
}
