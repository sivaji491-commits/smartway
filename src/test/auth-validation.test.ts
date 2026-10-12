import { describe, expect, it } from 'vitest';
import { canAccessMaintenance, validateSignIn } from '../lib/auth-validation';

describe('Sign-in rules', () => {
  it('rejects missing email', () => expect(validateSignIn('', 'password')).not.toBeNull());
  it('rejects invalid email', () => expect(validateSignIn('invalid', 'password')).not.toBeNull());
  it('rejects missing password', () => expect(validateSignIn('person@example.com', '')).not.toBeNull());
  it('accepts complete credentials for backend verification', () => expect(validateSignIn('person@example.com', 'password')).toBeNull());
  it('denies unauthenticated maintenance access', () => expect(canAccessMaintenance(null)).toBe(false));
  it('allows backend-verified identity', () => expect(canAccessMaintenance({ id: 'verified-user' })).toBe(true));
});