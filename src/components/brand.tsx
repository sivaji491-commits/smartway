import igInfraLogo from '@/assets/ig-infra-logo.png';

export interface BrandProps {
  className?: string;
  imgClassName?: string;
  onLogoClick?: () => void;
}

export function Brand({ className, imgClassName, onLogoClick }: BrandProps = {}) {
  const handleLogoClick = (e: React.MouseEvent) => {
    if (onLogoClick) {
      e.preventDefault();
      onLogoClick();
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/maintenance')) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'home');
        window.history.replaceState({}, '', url.toString());
        window.dispatchEvent(new Event('popstate'));
      } else {
        window.location.href = '/maintenance?tab=home';
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 select-none py-0.5 ${className || ''}`}>
      <button
        type="button"
        onClick={handleLogoClick}
        className="flex items-center justify-center shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-sm hover:opacity-90 transition-opacity bg-transparent border-0 p-0"
        title="Go to Home"
        aria-label="IG Infra Developers - Go to Home"
      >
        <img
          src={igInfraLogo}
          alt="IG Infra Developers"
          className={`h-[62px] sm:h-[64px] w-auto max-w-[110px] sm:max-w-[115px] object-contain shrink-0 drop-shadow-xs transition-all cursor-pointer ${imgClassName || ''}`}
        />
      </button>
      <span className="font-bold text-base text-white tracking-tight whitespace-nowrap">
        Business Plan
      </span>
    </div>
  );
}
