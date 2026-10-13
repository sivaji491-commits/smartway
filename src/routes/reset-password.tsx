import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brand } from '@/components/brand';
import { supabase } from '@/integrations/supabase/client';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/reset-password')({ head: () => pageMeta('Set a new password', 'Securely reset your IG Infra workspace password.'), component: ResetPassword });
function ResetPassword() {
  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery' || window.sessionStorage.getItem('nexora-recovery') === 'true';
    if (recovery) window.sessionStorage.setItem('nexora-recovery', 'true');
    supabase.auth.getUser().then(({ data, error }) => { setValid(recovery && Boolean(data.user) && !error); setChecking(false); });
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
    if (password !== confirm) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError('Unable to update your password. Please request a new reset link.'); return; }
      window.sessionStorage.removeItem('nexora-recovery');
      await supabase.auth.signOut(); setDone(true);
    } catch { setError('Connection failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="maintenance-page"><header className="app-header"><Brand /></header><main className="form-center px-6"><div className="login-form py-16"><h2>{done ? 'Password updated' : 'Set a new password'}</h2><p className="form-description">{checking ? 'Checking your reset link…' : done ? 'Your new password is ready. You can now sign in.' : valid ? 'Choose a new password for your workspace.' : 'This reset link is invalid or has expired. Please request a new one from the sign-in page.'}</p>{error && <div className="form-error" role="alert">{error}</div>}{valid && !done && <form onSubmit={submit}><div className="field"><label htmlFor="new-password">New password</label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></div><div className="field"><label htmlFor="confirm-password">Confirm password</label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div><Button type="submit" className="sign-in-button" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button></form>}<Button asChild variant="link" className="mt-4"><Link to="/auth">Return to sign in</Link></Button></div></main></div>;
}