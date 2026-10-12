import { useState, type FormEvent } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, LockKeyhole, ShieldCheck, Zap, Layers, Globe, LoaderCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brand } from '@/components/brand';
import { supabase } from '@/integrations/supabase/client';
import { validateSignIn } from '@/lib/auth-validation';
import { startUserLoginSession, EXPIRED_ACCOUNT_MESSAGE } from '@/lib/session-manager';
import { isUserAdminOrOwner } from '@/lib/permissions';
import sculpture from '@/assets/workspace-sculpture.jpg';

export function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const reason = window.localStorage.getItem('nexora_last_disabled_reason');
      if (reason === 'SESSIONTIMEEXPIRED') {
        window.localStorage.removeItem('nexora_last_disabled_reason');
        return EXPIRED_ACCOUNT_MESSAGE;
      } else if (reason === 'ADMIN_DISABLED') {
        window.localStorage.removeItem('nexora_last_disabled_reason');
        return 'Your account has been disabled. Please contact your administrator to restore access.';
      }
    }
    return null;
  });
  const [recovery, setRecovery] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const identifier = email.trim();
    if (recovery) {
      const validation = validateSignIn(identifier, 'recovery');
      if (validation) { setError(validation); return; }
    } else if (identifier.includes('@')) {
      const validation = validateSignIn(identifier, password);
      if (validation) { setError(validation); return; }
    } else {
      if (!identifier) { setError('Enter your username or email address.'); return; }
      if (!password) { setError('Enter your password.'); return; }
    }
    setBusy(true);
    try {
      if (recovery) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: `${window.location.origin}/reset-password` });
        if (resetError) { setError('Unable to send a reset link right now. Please try again shortly.'); return; }
        setSent(true);
        return;
      }

      const trimmedId = identifier.trim();
      const lowerId = trimmedId.toLowerCase();
      const isAdminCredentials = 
        (lowerId === 'sivaji491@gmail.com' || lowerId === 'sivaji') && password === 'Vijashya@2828';
      const isThisAdmin = isAdminCredentials || isUserAdminOrOwner(trimmedId, 'sivaji491@gmail.com');

      // Check if user is DISABLED in workspace store (applies ONLY to regular users, NEVER to Admin)
      if (typeof window !== 'undefined') {
        const storedUsersRaw = window.localStorage.getItem('nexora_workspace_users');
        if (storedUsersRaw) {
          try {
            const storedUsers = JSON.parse(storedUsersRaw);
            const matched = Array.isArray(storedUsers) && storedUsers.find(
              (u: any) => {
                if (!u) return false;
                const matchUser = (u.username && u.username.toLowerCase() === lowerId) ||
                                  (u.name && u.name.toLowerCase() === lowerId);
                const matchEmail = u.email && u.email.toLowerCase() === lowerId;
                return matchUser || matchEmail;
              }
            );

            // Auto-heal admin if previously marked disabled
            if (matched && isUserAdminOrOwner(matched, 'sivaji491@gmail.com')) {
              matched.status = 'ACTIVE';
              matched.disableReason = null;
              matched.disabledAt = null;
              matched.loginDuration = 'Unlimited';
              matched.sessionExpireTime = null;
              window.localStorage.setItem('nexora_workspace_users', JSON.stringify(storedUsers));
            } else if (!isThisAdmin && matched && matched.status === 'DISABLED') {
              setError(
                matched.disableReason === 'SESSIONTIMEEXPIRED'
                  ? EXPIRED_ACCOUNT_MESSAGE
                  : 'Your account has been disabled. Please contact your administrator to restore access.'
              );
              setBusy(false);
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      let authError: any = null;
      let userRole = 'Member';
      let resolvedIdentifier = trimmedId;

      if (isAdminCredentials) {
        // Admin user (sivaji491@gmail.com / sivaji with Vijashya@2828):
        // Has permanent access anytime, no timer, and never disabled.
        userRole = 'Owner';
        resolvedIdentifier = 'sivaji491@gmail.com';
        const adminAuth = await supabase.auth.signInWithPassword({ 
          email: 'preview@nexora.example', 
          password: 'Nexora!Work2026#48' 
        });
        if (adminAuth.error) {
          authError = adminAuth.error;
        } else {
          authError = null;
        }
      } else {
        const supabaseRes = await supabase.auth.signInWithPassword({ email: trimmedId, password });
        authError = supabaseRes.error;

        if (typeof window !== 'undefined') {
          const storedUsersRaw = window.localStorage.getItem('nexora_workspace_users');
          if (storedUsersRaw) {
            try {
              const storedUsers = JSON.parse(storedUsersRaw);
              const matched = Array.isArray(storedUsers) && storedUsers.find(
                (u: any) => {
                  if (!u) return false;
                  const matchUser = (u.username && u.username.toLowerCase() === lowerId) ||
                                    (u.name && u.name.toLowerCase() === lowerId);
                  const matchEmail = u.email && u.email.toLowerCase() === lowerId;
                  return (matchUser || matchEmail) && u.password === password;
                }
              );
              if (matched) {
                const isAdminMatched = isUserAdminOrOwner(matched, 'sivaji491@gmail.com');
                if (!isAdminMatched && matched.status === 'DISABLED') {
                  setError(
                    matched.disableReason === 'SESSIONTIMEEXPIRED'
                      ? EXPIRED_ACCOUNT_MESSAGE
                      : 'Your account has been disabled. Please contact your administrator to restore access.'
                  );
                  setBusy(false);
                  return;
                }
                if (!isAdminMatched && matched.status === 'Suspended') {
                  setError('This account has been suspended. Please contact your workspace administrator.');
                  setBusy(false);
                  return;
                }
                userRole = matched.role || (isAdminMatched ? 'Owner' : 'Member');
                resolvedIdentifier = matched.username || matched.email || trimmedId;
                const fallback = await supabase.auth.signInWithPassword({ 
                  email: 'preview@nexora.example', 
                  password: 'Nexora!Work2026#48' 
                });
                if (!fallback.error) {
                  authError = null;
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        if (authError && (lowerId === 'sivaji491@gmail.com' || lowerId === 'sivaji') && password === 'Vijashya@2828') {
          const fallback = await supabase.auth.signInWithPassword({ 
            email: 'preview@nexora.example', 
            password: 'Nexora!Work2026#48' 
          });
          if (!fallback.error) {
            authError = null;
            userRole = 'Owner';
            resolvedIdentifier = 'sivaji491@gmail.com';
          }
        }
      }

      if (authError) {
        setError(authError.code === 'invalid_credentials' ? 'Your username/email or password is incorrect. Please try again.' : authError.code === 'email_not_confirmed' ? 'Please confirm your email address before signing in.' : 'Unable to sign in right now. Please try again shortly.');
        return;
      }
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) { setError('We could not verify your session. Please sign in again.'); return; }

      // Initialize session timer only upon successful authentication
      const sessionResult = startUserLoginSession(resolvedIdentifier);
      if (!sessionResult.success) {
        await supabase.auth.signOut();
        setError(sessionResult.error || EXPIRED_ACCOUNT_MESSAGE);
        return;
      }

      window.sessionStorage.setItem('nexora-session-only', remember ? 'false' : 'true');
      window.localStorage.setItem('nexora-session-only', remember ? 'false' : 'true');
      window.localStorage.setItem('nexora-user-email', resolvedIdentifier);
      window.localStorage.removeItem('nexora-preview-user-email');
      window.localStorage.removeItem('nexora_last_disabled_reason');
      window.localStorage.setItem('nexora-user-role', userRole);
      await router.invalidate();
      await navigate({ to: '/maintenance', replace: true });
    } catch {
      setError('We could not connect. Check your internet connection and try again.');
    } finally { setBusy(false); }
  }

  return <main className="login-layout">
    <section className="visual-panel" aria-label="Nexora workspace">
      <img className="visual-art" src={sculpture} alt="Sculptural blue and silver ribbons" width={1024} height={1536} />
      <div className="visual-shade" />
      <div className="panel-content">
        <div className="brand-label"><Brand /><div className="brand-divider" /><span>YOUR CONNECTED WORKSPACE</span></div>
        <div className="panel-message"><div className="eyebrow"><span className="tiny-line" /> BUILT FOR WHAT'S NEXT</div><h1>A smarter way<br />to work starts<br /><span>here.</span></h1><p>One connected workspace. Clearer decisions.<br />More possibilities for your team.</p></div>
        <div className="panel-bottom"><div className="panel-values"><span><Layers /> Seamlessly connected</span><span><ShieldCheck /> Secure by design</span><span><Zap /> Built to move you forward</span></div><div className="panel-footer"><span>© {new Date().getUTCFullYear()} Nexora. All rights reserved.</span><span><span className="status-dot" /> Your workspace, protected</span></div></div>
      </div>
    </section>
    <section className="form-panel" aria-label="Sign in">
      <div className="form-top"><Globe /><span>English (US)</span></div>
      <div className="form-center"><div className="login-form">
        <div className="form-mark"><LogIn /></div>
        <h2>{recovery ? 'Reset your password' : 'Welcome back'}</h2>
        <p className="form-description">{recovery ? 'Enter your email and we’ll send you a reset link.' : 'Sign in to your Nexora workspace to continue.'}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {sent ? <div className="form-success" role="status">If an account exists for this email, you’ll receive a password reset link. Check your inbox.</div> : <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="email">{recovery ? 'Email address' : 'Username or email'}</label><div className="input-wrap"><Mail /><Input className="auth-input" id="email" type={recovery ? 'email' : 'text'} autoComplete="username" placeholder={recovery ? 'you@company.com' : 'Username or email'} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div></div>
          {!recovery && <><div className="field"><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole /><Input className="auth-input" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><Button variant="ghost" size="icon" className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div><div className="form-options"><label className="remember-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me</label><Button type="button" variant="link" className="text-link h-auto p-0" onClick={() => { setRecovery(true); setError(null); }}>Forgot password?</Button></div></>}
          <Button className="sign-in-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" /> {recovery ? 'Sending link…' : 'Signing in…'}</> : <>{recovery ? 'Send reset link' : 'Sign in'}<ArrowRight /></>}</Button>
        </form>}
        {recovery ? <Button variant="link" className="mt-5 w-full text-xs" onClick={() => { setRecovery(false); setSent(false); setError(null); }}><ArrowLeft />Back to sign in</Button> : <><p className="security-note"><ShieldCheck />Your connection is secure and encrypted</p><div className="form-separator" /><p className="access-note">Access is available to invited team members.<br /><strong>Contact your workspace administrator to join.</strong></p></>}
      </div></div>
      <footer className="form-footer">Nexora Workspace<span>·</span>A little more clarity. A lot more possibility.</footer>
    </section>
  </main>;
}