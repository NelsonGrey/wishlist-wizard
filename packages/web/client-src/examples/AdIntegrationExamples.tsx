/**
 * Strategic Ad Integration Examples
 * Shows how to implement advertising throughout the Wishlist Wizard app
 */

import React from 'react';
import { 
  HeaderBannerAd, 
  SidebarRectangleAd, 
  FooterBannerAd,
  InContentAd,
  MobileBannerAd,
  AdContainer,
  AdBlockerNotice
} from '../components/ads/AdSenseComponents';

// Example App Layout with Strategic Ad Placements
export const AppLayoutWithAds: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="app-layout">
      {/* Ad Blocker Detection Notice */}
      <AdBlockerNotice />
      
      {/* Header with Banner Ad */}
      <header className="app-header">
        <div className="header-content">
          <h1>Wishlist Wizard</h1>
          <nav>
            {/* Navigation items */}
          </nav>
        </div>
        
        {/* Header Banner Ad - High visibility */}
        <AdContainer title="Advertisement">
          <HeaderBannerAd slotId="1234567890" />
        </AdContainer>
        
        {/* Mobile Banner for smaller screens */}
        <MobileBannerAd slotId="1234567891" />
      </header>

      <main className="app-main">
        <div className="content-wrapper">
          {/* Main Content */}
          <div className="main-content">
            {children}
          </div>
          
          {/* Sidebar with Rectangle Ads */}
          <aside className="sidebar">
            <div className="sidebar-content">
              {/* Other sidebar content */}
              
              {/* Sidebar Rectangle Ad */}
              <AdContainer title="Sponsored">
                <SidebarRectangleAd slotId="1234567892" />
              </AdContainer>
              
              {/* Additional sidebar content */}
            </div>
          </aside>
        </div>
      </main>

      {/* Footer with Banner Ad */}
      <footer className="app-footer">
        <AdContainer>
          <FooterBannerAd slotId="1234567893" />
        </AdContainer>
        
        <div className="footer-content">
          <p>&copy; 2025 Wishlist Wizard. Supported by advertising.</p>
        </div>
      </footer>
    </div>
  );
};

// Example Wishlist Page with In-Content Ads
export const WishlistPageWithAds: React.FC<{
  wishlistItems: {
    id: string;
    image: string;
    title: string;
    description: string;
    price: number;
  }[];
}> = ({ wishlistItems }) => {
  return (
    <div className="wishlist-page">
      <h2>My Wishlist</h2>
      
      {wishlistItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {/* Wishlist Item */}
          <div className="wishlist-item">
            <img src={item.image} alt={item.title} />
            <div className="item-details">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="price">${item.price}</span>
            </div>
          </div>
          
          {/* Insert in-content ad every 3 items */}
          {(index + 1) % 3 === 0 && (
            <AdContainer title="Sponsored Product">
              <InContentAd slotId={`123456789${index}`} />
            </AdContainer>
          )}
        </React.Fragment>
      ))}
      
      {/* Final ad at the end of the list */}
      <AdContainer title="You might also like">
        <InContentAd slotId="1234567899" />
      </AdContainer>
    </div>
  );
};

// Example Product Detail Page with Strategic Ad Placement
export const ProductDetailWithAds: React.FC<{
  product: {
    image: string;
    title: string;
    description: string;
    price: number;
  };
}> = ({ product }) => {
  return (
    <div className="product-detail">
      <div className="product-info">
        <img src={product.image} alt={product.title} />
        <div className="product-details">
          <h1>{product.title}</h1>
          <p>{product.description}</p>
          <span className="price">${product.price}</span>
          
          <button className="add-to-wishlist">
            Add to Wishlist
          </button>
        </div>
      </div>
      
      {/* Related products ad - contextually relevant */}
      <div className="related-section">
        <h3>Related Products</h3>
        <AdContainer title="Sponsored">
          <InContentAd slotId="1234567894" />
        </AdContainer>
      </div>
      
      {/* Product reviews section */}
      <div className="reviews-section">
        <h3>Customer Reviews</h3>
        {/* Reviews content */}
        
        {/* Ad between reviews */}
        <AdContainer title="Advertisement">
          <InContentAd slotId="1234567895" />
        </AdContainer>
      </div>
    </div>
  );
};

// Example Settings Page with Privacy Controls
export const SettingsPageWithAds: React.FC = () => {
  return (
    <div className="settings-page">
      <h2>Settings</h2>
      
      <div className="settings-tabs">
        {/* Account settings */}
        <div className="settings-tab">
          <h3>Account</h3>
          {/* Account settings content */}
        </div>
        
        {/* Privacy & Ads settings */}
        <div className="settings-tab">
          <h3>Privacy & Ads</h3>
          <p>
            Wishlist Wizard is free and supported by advertising. 
            You can control your ad experience here.
          </p>
          
          <div className="ad-settings">
            <h4>Ad Preferences</h4>
            <label>
              <input type="checkbox" defaultChecked />
              Show personalized ads based on my interests
            </label>
            <p className="help-text">
              Personalized ads help us show you more relevant products and 
              keep Wishlist Wizard free for everyone.
            </p>
            
            <label>
              <input type="checkbox" defaultChecked />
              Show ads from trusted partners
            </label>
            <p className="help-text">
              We work with reputable advertisers to ensure quality ad experiences.
            </p>
          </div>
          
          {/* Example of showing current ad status */}
          <div className="ad-status">
            <h4>Current Ad Status</h4>
            <p>✅ Ads are helping keep Wishlist Wizard free</p>
            <p>📊 Personalized ads are enabled</p>
            <p>🔒 Your privacy preferences are respected</p>
          </div>
        </div>
        
        {/* Other settings */}
        <div className="settings-tab">
          <h3>Notifications</h3>
          {/* Notification settings */}
        </div>
      </div>
      
      {/* Support message with ad explanation */}
      <div className="support-message">
        <h3>Supporting Wishlist Wizard</h3>
        <p>
          Wishlist Wizard is completely free thanks to our advertising partners. 
          Your ad views help us maintain and improve the service for everyone.
        </p>
        
        <div className="support-stats">
          <div className="stat">
            <strong>100%</strong>
            <span>Free to use</span>
          </div>
          <div className="stat">
            <strong>0</strong>
            <span>Hidden fees</span>
          </div>
          <div className="stat">
            <strong>24/7</strong>
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example Revenue Optimization Hook
export const useAdRevenueOptimization = () => {
  const [adPerformance, setAdPerformance] = React.useState({
    clickThroughRate: 0,
    impressions: 0,
    revenue: 0
  });

  // Track ad performance
  const trackAdClick = (adId: string) => {
    // Analytics tracking
    console.log(`Ad clicked: ${adId}`);
    
    // Update performance metrics
    setAdPerformance(prev => ({
      ...prev,
      clickThroughRate: prev.clickThroughRate + 0.01
    }));
  };

  const trackAdImpression = (adId: string) => {
    // Analytics tracking
    console.log(`Ad impression: ${adId}`);
    
    // Update performance metrics
    setAdPerformance(prev => ({
      ...prev,
      impressions: prev.impressions + 1
    }));
  };

  return {
    adPerformance,
    trackAdClick,
    trackAdImpression
  };
};

// Example Ad Placement Guidelines
export const AD_PLACEMENT_GUIDELINES = {
  // Optimal ad positions based on user engagement
  positions: {
    header: {
      priority: 'high',
      visibility: 'excellent',
      userDisruption: 'low',
      recommendedSize: 'leaderboard',
      notes: 'Prime real estate, high visibility without disrupting UX'
    },
    sidebar: {
      priority: 'medium',
      visibility: 'good',
      userDisruption: 'minimal',
      recommendedSize: 'rectangle',
      notes: 'Consistent visibility, good for targeted ads'
    },
    inContent: {
      priority: 'high', 
      visibility: 'excellent',
      userDisruption: 'medium',
      recommendedSize: 'responsive',
      notes: 'High engagement but needs careful spacing'
    },
    footer: {
      priority: 'low',
      visibility: 'fair',
      userDisruption: 'minimal',
      recommendedSize: 'banner',
      notes: 'Low visibility but unobtrusive'
    }
  },
  
  // Best practices
  bestPractices: [
    'Never show more than 3 ads per page load',
    'Ensure 30% content-to-ad ratio minimum',
    'Space in-content ads at least 3 items apart',
    'Always label ads as "Advertisement" or "Sponsored"',
    'Respect user privacy preferences',
    'Test ad placements with real users',
    'Monitor ad performance and user feedback',
    'Ensure ads load asynchronously to not block content'
  ],
  
  // Revenue optimization strategies
  optimization: {
    targeting: 'Use contextual targeting based on wishlist items',
    placement: 'A/B test ad positions for optimal performance', 
    frequency: 'Cap ad frequency to prevent user fatigue',
    quality: 'Partner with high-quality, relevant advertisers',
    performance: 'Monitor CTR, viewability, and user satisfaction',
    privacy: 'Always prioritize user privacy and consent'
  }
};