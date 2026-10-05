// Features that are built but switched off. Flip a flag to bring one back.
export const FEATURES = {
  // Selfie check after profile setup (src/app/verify-face.tsx). Off until there's a real
  // face-matching backend, see the "Backlog: selfie verification" issue.
  selfieVerification: false,
} as const;
