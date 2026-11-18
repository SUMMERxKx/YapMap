// The web pages and contact address the app links to. The pages are the documents in
// docs/legal/, published by the owner at these addresses before the first store upload
// (docs/STORE_SUBMISSION.md). Change WEBSITE if they move; the app stores need the same
// addresses in their listings.

const WEBSITE = 'https://yap.samarxkx.dev';

export const SUPPORT_EMAIL = 'support@samarxkx.dev';

export const LINKS = {
  privacy: `${WEBSITE}/privacy`,
  terms: `${WEBSITE}/terms`,
  support: `mailto:${SUPPORT_EMAIL}`,
} as const;
