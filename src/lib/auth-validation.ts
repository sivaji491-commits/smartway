export function validateSignIn(email: string, password: string) {
  if (!email.trim()) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  return null;
}

export function canAccessMaintenance(user: { id: string } | null) {
  return Boolean(user?.id);
}