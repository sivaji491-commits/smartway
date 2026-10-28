import React from 'react';
import { cn } from '@/lib/utils';
import { OneTimeWorkHighlight, OneTimeWorkContext } from './OneTimeWorkHighlight';

export interface DefaultPageLayoutProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  cardClassName?: string;
  headerIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  showOneTimeWork?: boolean;
}

/**
 * DefaultPageLayout: Standard page layout for all current and future pages.
 * Automatically renders the animated "ONE TIME WORK" element at the top-left
 * side by default, ensuring every newly created page inherits the exact same
 * appearance, glow, border, and 180-degree two-star orbit.
 */
export const DefaultPageLayout: React.FC<DefaultPageLayoutProps> = ({
  title,
  description,
  children,
  className,
  cardClassName,
  headerIcon,
  headerActions,
  showOneTimeWork = true,
}) => {
  return (
    <div className={cn("w-full max-w-[940px] mx-auto space-y-2 sm:space-y-2.5 animate-in fade-in duration-300 font-['Inter',system-ui,sans-serif]", className)}>
      {/* 1. Top-Left Animated "ONE TIME WORK" Highlight (Default for all pages) */}
      {showOneTimeWork && (
        <div className="flex items-center justify-start self-start pb-0.5" data-testid="default-page-highlight-wrapper">
          <OneTimeWorkHighlight forceRender={true} />
        </div>
      )}

      {/* 2. Page Content Card with Deduplication Context */}
      <OneTimeWorkContext.Provider value={true}>
        <div className={cn("bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-4 space-y-3 w-full", cardClassName)}>
          {/* Header Row (if title, description, or actions provided) */}
          {(title || description || headerActions) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3">
                {headerIcon && (
                  <div className="w-[36px] h-[36px] rounded-[8px] bg-[#142D50] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    {headerIcon}
                  </div>
                )}
                <div>
                  {title && (
                    <h1 className="text-[17px] sm:text-[18px] font-bold text-[#0f2942] tracking-tight leading-snug">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-normal leading-normal mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {headerActions && (
                <div className="flex items-center gap-2 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          )}

          {/* Children / Page Content */}
          {children}
        </div>
      </OneTimeWorkContext.Provider>
    </div>
  );
};

export const PageContainer = DefaultPageLayout;
