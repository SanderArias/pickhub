export const REQUIRED_SUB_VERIFICATION_SCOPES = ['channel:read:subscriptions'];

export function hasRequiredSubscriberScopes(granted: string[] | null | undefined): boolean {
  if (!granted || granted.length === 0) return false;
  const normalized = granted.map((s) => s.trim().toLowerCase());
  return REQUIRED_SUB_VERIFICATION_SCOPES.every((required) => normalized.includes(required));
}
