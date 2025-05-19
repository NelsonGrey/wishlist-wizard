import { AdUnit } from './AdUnit';

// This is a placeholder slot ID - you'll need to replace it with your actual AdSense ad unit slot ID
const INLINE_AD_SLOT = '1234567890';

/**
 * InlineAd component for displaying a horizontal ad that fits within content
 * Typically used between paragraphs or sections of content
 */
export function InlineAd() {
  return (
    <div className="my-6">
      <AdUnit 
        slot={INLINE_AD_SLOT} 
        format="horizontal"
        style={{ 
          display: 'block',
          maxWidth: '100%',
          minHeight: '90px', 
          overflow: 'hidden'
        }}
      />
    </div>
  );
}