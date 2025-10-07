import { AdUnit } from './AdUnit';

// This is a placeholder slot ID - you'll need to replace it with your actual AdSense ad unit slot ID
const SIDEBAR_AD_SLOT = '2345678901';

/**
 * SidebarAd component for displaying a vertical ad in sidebars
 * Typically used in the sidebar of dashboard layouts
 */
export function SidebarAd() {
  return (
    <div className="my-4 w-full">
      <AdUnit 
        slot={SIDEBAR_AD_SLOT} 
        format="vertical"
        style={{ 
          display: 'block',
          minHeight: '280px',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}