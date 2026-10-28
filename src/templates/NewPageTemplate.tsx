import React from 'react';
import { DefaultPageLayout } from '@/components/common/DefaultPageLayout';
import { Sparkles } from 'lucide-react';

export interface NewPageTemplateProps {
  isAdmin?: boolean;
  userEmail?: string | null;
}

/**
 * Standard New Page Template for IG Infra / Smartway:
 * Every new page created with DefaultPageLayout automatically inherits:
 * - The animated "ONE TIME WORK" element at the top-left
 * - Golden glowing gradient typography and border
 * - Dual revolving stars with 180° separation strictly inside the border
 * - Responsive card layout across mobile, tablet, laptop, and desktop
 */
export const NewPageTemplate: React.FC<NewPageTemplateProps> = ({
  isAdmin = false,
  userEmail,
}) => {
  return (
    <DefaultPageLayout
      title="New Feature Page"
      description="Manage and review details for this new business module."
      headerIcon={<Sparkles className="w-4 h-4 text-white" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          This page automatically displays the "ONE TIME WORK" animated highlight at the top-left by default.
        </p>
      </div>
    </DefaultPageLayout>
  );
};

export default NewPageTemplate;
