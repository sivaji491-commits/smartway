import { ShieldAlert, ArrowLeft, LogOut, Lock, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessDeniedViewProps {
  pageName?: string;
  userEmail?: string | null;
  onNavigateToAuthorized?: (() => void) | undefined;
  authorizedPageName?: string | null;
  onSignOut?: (() => void | Promise<void>) | undefined;
  isSigningOut?: boolean;
  signOutError?: string | null;
}

export function AccessDeniedView({
  pageName,
  userEmail,
  onNavigateToAuthorized,
  authorizedPageName,
  onSignOut,
  isSigningOut = false,
  signOutError = null,
}: AccessDeniedViewProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[420px] animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg text-center">
        {/* Security Shield Icon */}
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-3">
          <Lock className="w-3 h-3" />
          <span>Access Restricted</span>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          {pageName ? `Access Denied: ${pageName}` : 'No Page Access Granted'}
        </h2>

        {/* Descriptive Message */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          {pageName ? (
            <>
              Your account does not have permission to view or access the <strong>{pageName}</strong> module.
              Navigation permissions are strictly enforced based on your administrator settings.
            </>
          ) : (
            <>
              Your account has not been assigned permissions for any active workspace modules.
              Please contact your administrator to grant page permissions.
            </>
          )}
        </p>

        {/* User Identity Pill */}
        {userEmail && (
          <div className="mb-6 py-2 px-3 bg-secondary rounded-lg border border-border inline-block max-w-full truncate text-[11px] font-mono text-muted-foreground">
            Signed in as: <span className="font-semibold text-foreground">{userEmail}</span>
          </div>
        )}

        {/* Sign Out Error Alert */}
        {signOutError && (
          <div role="alert" className="text-xs text-red-400 bg-red-950/60 border border-red-500/30 rounded px-3 py-1.5 leading-snug mb-3 text-center">
            {signOutError}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onNavigateToAuthorized && authorizedPageName && (
            <Button 
              onClick={onNavigateToAuthorized}
              disabled={isSigningOut}
              className="w-full sm:w-auto h-9 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Go to {authorizedPageName}
            </Button>
          )}
          {onSignOut && (
            <Button 
              variant="outline" 
              onClick={onSignOut}
              disabled={isSigningOut}
              className="w-full sm:w-auto h-9 text-xs font-semibold"
            >
              {isSigningOut ? (
                <LoaderCircle className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
              )}
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
