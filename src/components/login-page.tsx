import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, LockKeyhole, ShieldCheck, Zap, Layers, Globe, LoaderCircle, LogIn, Smartphone, Download, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brand } from '@/components/brand';
import { supabase } from '@/integrations/supabase/client';
import { validateSignIn } from '@/lib/auth-validation';
import { startUserLoginSession, EXPIRED_ACCOUNT_MESSAGE } from '@/lib/session-manager';
import { isUserAdminOrOwner } from '@/lib/permissions';
import { authenticateWorkspaceUser, syncWorkspaceUsers } from '@/lib/workspace-user-sync';
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

  // Mobile / PWA Home Screen Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clean up any previously stored dismiss flags so refresh always shows banner
      window.sessionStorage.removeItem('nexora_dismiss_install_banner');
      window.localStorage.removeItem('nexora_dismiss_install_banner');
    }

    const checkStandalone = () => {
      if (typeof window === 'undefined') return;
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Eagerly sync workspace users in background so mobile devices immediately receive latest users
    syncWorkspaceUsers().catch(() => {});

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleDismissInstall = () => {
    // Dismiss only for current view without storing in sessionStorage, so refresh shows it again
    setShowInstallBanner(false);
  };

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
      const authResult = await authenticateWorkspaceUser(trimmedId, password);

      if (!authResult.success) {
        setError(authResult.error || 'Your username/email or password is incorrect. Please try again.');
        return;
      }

      const matched = authResult.user;
      const isAdmin = Boolean(authResult.isAdmin);
      const userRole = matched?.role || (isAdmin ? 'Owner' : 'Member');
      const resolvedIdentifier = isAdmin 
        ? 'sivaji491@gmail.com' 
        : (matched?.username || matched?.email || trimmedId);

      // Verify that non-admin user has at least one permission assigned
      if (!isAdmin && (!matched?.permissions || matched.permissions.length === 0)) {
        await supabase.auth.signOut();
        setError('No page permissions have been assigned to this account. Please contact your administrator.');
        return;
      }

      // Initialize session timer upon successful authentication
      const sessionResult = startUserLoginSession(resolvedIdentifier, matched);
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

      // Background sync so session updates persist to cloud
      syncWorkspaceUsers().catch(() => {});

      await router.invalidate();
      await navigate({ to: '/maintenance', replace: true });
    } catch {
      setError('We could not connect. Check your internet connection and try again.');
    } finally { setBusy(false); }
  }

  return <main className="login-layout">
    <section className="visual-panel" aria-label="IG Infra workspace">
      <img className="visual-art" src={sculpture} alt="Sculptural blue and silver ribbons" width={1024} height={1536} />
      <div className="visual-shade" />
      <div className="panel-content">
        <div className="brand-label"><Brand /><div className="brand-divider" /><span>YOUR CONNECTED WORKSPACE</span></div>
        <div className="panel-message"><div className="eyebrow"><span className="tiny-line" /> BUILT FOR WHAT'S NEXT</div><h1>A smarter way<br /><span>here.</span></h1><p>Think Bigger. Grow Faster. Build Your Future.</p></div>
        <div className="panel-bottom"><div className="panel-values"><span><Layers /> Seamlessly connected</span><span><ShieldCheck /> Secure by design</span><span><Zap /> Built to move you forward</span></div><div className="panel-footer"><span>© {new Date().getUTCFullYear()} IG Infra. All rights reserved.</span><span><span className="status-dot" /> Your workspace, protected</span></div></div>
      </div>
    </section>
    <section className="form-panel" aria-label="Sign in">
      <div className="form-top"><Globe /><span>English (US)</span></div>
      <div className="form-center"><div className="login-form">
        {/* Install Application on Home Screen Banner */}
        {!isStandalone && showInstallBanner && (
          <div className="login-install-banner animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="login-install-banner-left">
              <div className="login-install-icon">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="login-install-text">
                <div className="login-install-title">
                  <span>Install IG Infra</span>
                </div>
                <p className="login-install-desc">
                  Install on your device for fast, full-screen workspace access.
                </p>
              </div>
            </div>
            <div className="login-install-actions">
              <Button
                type="button"
                size="sm"
                onClick={handleInstallClick}
                className="login-install-btn"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Install
              </Button>
              <button
                type="button"
                onClick={handleDismissInstall}
                className="login-install-close-btn"
                aria-label="Dismiss install banner"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step-by-Step Installation Modal Guide */}
        {showInstallGuide && (
          <div className="modal-backdrop" onClick={() => setShowInstallGuide(false)}>
            <div 
              className="invite-modal-card max-w-sm animate-in zoom-in-95 duration-200 p-5 space-y-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Install IG Infra on Home Screen</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-lg bg-secondary/60 border border-border space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>📱 Android (Chrome / Edge / Brave):</span>
                  </span>
                  <p>1. Tap the three dots (<strong>⋮</strong>) in the top-right corner.</p>
                  <p>2. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/60 border border-border space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>🍏 iPhone / iPad (Safari):</span>
                  </span>
                  <p>1. Tap the <strong>Share</strong> button (<Share2 className="w-3 h-3 inline text-primary mx-0.5" />) in Safari.</p>
                  <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9"
                onClick={() => setShowInstallGuide(false)}
              >
                Got It
              </Button>
            </div>
          </div>
        )}

        <div className="form-mark"><LogIn /></div>
        <h2>{recovery ? 'Reset your password' : 'Welcome back'}</h2>
        <p className="form-description">{recovery ? 'Enter your email and we’ll send you a reset link.' : 'Sign in to your IG Infra workspace to continue.'}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {sent ? <div className="form-success" role="status">If an account exists for this email, you’ll receive a password reset link. Check your inbox.</div> : <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="email">{recovery ? 'Email address' : 'Username or email'}</label><div className="input-wrap"><Mail /><Input className="auth-input" id="email" type={recovery ? 'email' : 'text'} autoComplete="username" placeholder={recovery ? 'you@company.com' : 'Username or email'} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div></div>
          {!recovery && <><div className="field"><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole /><Input className="auth-input" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /><Button variant="ghost" size="icon" className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></div><div className="form-options"><label className="remember-label"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me</label><Button type="button" variant="link" className="text-link h-auto p-0" onClick={() => { setRecovery(true); setError(null); }}>Forgot password?</Button></div></>}
          <Button className="sign-in-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" /> {recovery ? 'Sending link…' : 'Signing in…'}</> : <>{recovery ? 'Send reset link' : 'Sign in'}<ArrowRight /></>}</Button>
        </form>}
        {recovery ? <Button variant="link" className="mt-5 w-full text-xs" onClick={() => { setRecovery(false); setSent(false); setError(null); }}><ArrowLeft />Back to sign in</Button> : <><p className="security-note"><ShieldCheck />Your connection is secure and encrypted</p><div className="form-separator" /><p className="access-note">Access is available to invited team members.<br /><strong>Contact your workspace administrator to join.</strong></p></>}
      </div></div>
      <footer className="form-footer">IG Infra Workspace<span>·</span>A little more clarity. A lot more possibility.</footer>
    </section>
  </main>;
}