import { AdUnit } from './AdUnit';

// This is a placeholder slot ID - you'll need to replace it with your actual AdSense ad unit slot ID
const RESPONSIVE_AD_SLOT = '3456789012';

/**
 * ResponsiveAd component for displaying ads that adapt to container size
 * Ideal for responsive layouts and different screen sizes
 */
export function ResponsiveAd() {
  return (
    <div className="my-6 w-full">
      <AdUnit 
        slot={RESPONSIVE_AD_SLOT}
        format="auto"
        responsive={true}
        style={{
          display: 'block',
          minHeight: '100px',
          width: '100%'
        }}
      />
    </div>
  );
}