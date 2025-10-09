import { URL } from 'url';

interface AffiliateProgram {
  name: string;
  domains: string[];
  affiliateId: string;
  linkTemplate: string;
  extractProductId: (url: string) => string | null;
  commission?: number; // Percentage
  notes?: string;
}

interface AffiliateConversion {
  originalUrl: string;
  affiliateUrl: string;
  program: string;
  productId: string;
  commission?: number;
  timestamp: Date;
}

interface AffiliateStats {
  totalConversions: number;
  totalClicks: number;
  estimatedRevenue: number;
  topPrograms: Array<{
    program: string;
    conversions: number;
    clicks: number;
    revenue: number;
  }>;
}

class AffiliateService {
  private affiliatePrograms: AffiliateProgram[] = [];
  private conversions: Map<string, AffiliateConversion> = new Map();
  private clickStats: Map<string, number> = new Map();

  constructor() {
    this.initializeAffiliatePrograms();
  }

  private initializeAffiliatePrograms() {
    this.affiliatePrograms = [
      // Amazon Associates
      {
        name: 'Amazon Associates',
        domains: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.in', 'amazon.co.jp', 'amazon.com.au'],
        affiliateId: process.env.AMAZON_ASSOCIATE_ID || 'wishlistwiz-20',
        linkTemplate: '{originalUrl}?tag={affiliateId}&linkCode=ogi&th=1&psc=1',
        commission: 4,
        extractProductId: (url: string) => {
          const matches = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})|\/product\/([A-Z0-9]{10})/);
          return matches ? (matches[1] || matches[2] || matches[3]) : null;
        },
        notes: 'Amazon Associates program with varying commission rates by category'
      },

      // Target Affiliate Program
      {
        name: 'Target',
        domains: ['target.com'],
        affiliateId: process.env.TARGET_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://goto.target.com/c/{affiliateId}?u={encodedUrl}',
        commission: 3,
        extractProductId: (url: string) => {
          const matches = url.match(/\/p\/[^\/]+\/A-(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // Best Buy Affiliate
      {
        name: 'Best Buy',
        domains: ['bestbuy.com'],
        affiliateId: process.env.BESTBUY_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://www.bestbuy.com/site/{productId}?irclickid={affiliateId}&irgwc=1',
        commission: 2,
        extractProductId: (url: string) => {
          const matches = url.match(/\/site\/[^\/]+\/(\d+)\.p/);
          return matches ? matches[1] : null;
        }
      },

      // Walmart Affiliate
      {
        name: 'Walmart',
        domains: ['walmart.com'],
        affiliateId: process.env.WALMART_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://goto.walmart.com/c/{affiliateId}?u={encodedUrl}',
        commission: 2.5,
        extractProductId: (url: string) => {
          const matches = url.match(/\/ip\/[^\/]+\/(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // eBay Partner Network
      {
        name: 'eBay',
        domains: ['ebay.com', 'ebay.co.uk', 'ebay.ca', 'ebay.com.au'],
        affiliateId: process.env.EBAY_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://rover.ebay.com/rover/1/711-53200-19255-0/1?icep_id=114&ipn=icep&toolid=20004&campid={affiliateId}&mpre={encodedUrl}',
        commission: 2,
        extractProductId: (url: string) => {
          const matches = url.match(/\/itm\/(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // Etsy Affiliate
      {
        name: 'Etsy',
        domains: ['etsy.com'],
        affiliateId: process.env.ETSY_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://click.linksynergy.com/deeplink?id={affiliateId}&mid=39789&murl={encodedUrl}',
        commission: 4,
        extractProductId: (url: string) => {
          const matches = url.match(/\/listing\/(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // Home Depot Affiliate
      {
        name: 'Home Depot',
        domains: ['homedepot.com'],
        affiliateId: process.env.HOMEDEPOT_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://homedepot.sjv.io/c/{affiliateId}?u={encodedUrl}',
        commission: 3,
        extractProductId: (url: string) => {
          const matches = url.match(/\/p\/([^\/]+)\/(\d+)/);
          return matches ? matches[2] : null;
        }
      },

      // Macy's Affiliate
      {
        name: 'Macys',
        domains: ['macys.com'],
        affiliateId: process.env.MACYS_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://click.linksynergy.com/deeplink?id={affiliateId}&mid=13867&murl={encodedUrl}',
        commission: 3.5,
        extractProductId: (url: string) => {
          const matches = url.match(/\/shop\/product\/[^?]+\?ID=(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // Nordstrom Affiliate
      {
        name: 'Nordstrom',
        domains: ['nordstrom.com'],
        affiliateId: process.env.NORDSTROM_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://click.linksynergy.com/deeplink?id={affiliateId}&mid=1237&murl={encodedUrl}',
        commission: 4,
        extractProductId: (url: string) => {
          const matches = url.match(/\/s\/[^\/]+\/(\d+)/);
          return matches ? matches[1] : null;
        }
      },

      // Wayfair Affiliate
      {
        name: 'Wayfair',
        domains: ['wayfair.com'],
        affiliateId: process.env.WAYFAIR_AFFILIATE_ID || 'wishlistwizard',
        linkTemplate: 'https://www.wayfair.com/a/btw?btw_source=commission_junction&btw_medium=affiliate&btw_campaign={affiliateId}&btw_content=&url={encodedUrl}',
        commission: 3,
        extractProductId: (url: string) => {
          const matches = url.match(/\/pdp\/([^?]+)/);
          return matches ? matches[1] : null;
        }
      }
    ];
  }

  /**
   * Convert a regular product URL to an affiliate URL
   */
  convertToAffiliateLink(originalUrl: string): AffiliateConversion | null {
    try {
      const url = new URL(originalUrl);
      const domain = url.hostname.replace('www.', '');
      
      // Find matching affiliate program
      const program = this.affiliatePrograms.find(p => 
        p.domains.some(d => domain.includes(d) || d.includes(domain))
      );

      if (!program) {
        return null; // No affiliate program for this domain
      }

      // Extract product ID
      const productId = program.extractProductId(originalUrl);
      if (!productId) {
        return null; // Could not extract product ID
      }

      // Generate affiliate URL
      const affiliateUrl = this.generateAffiliateUrl(originalUrl, program);
      
      const conversion: AffiliateConversion = {
        originalUrl,
        affiliateUrl,
        program: program.name,
        productId,
        commission: program.commission,
        timestamp: new Date()
      };

      // Store conversion for tracking
      this.conversions.set(originalUrl, conversion);

      return conversion;
    } catch (error) {
      console.error('Error converting URL to affiliate link:', error);
      return null;
    }
  }

  private generateAffiliateUrl(originalUrl: string, program: AffiliateProgram): string {
    const encodedUrl = encodeURIComponent(originalUrl);
    
    let affiliateUrl = program.linkTemplate
      .replace('{affiliateId}', program.affiliateId)
      .replace('{encodedUrl}', encodedUrl)
      .replace('{originalUrl}', originalUrl);

    // Handle special cases
    if (program.name === 'Amazon Associates') {
      // For Amazon, we can append parameters directly to the original URL
      const url = new URL(originalUrl);
      url.searchParams.set('tag', program.affiliateId);
      url.searchParams.set('linkCode', 'ogi');
      url.searchParams.set('th', '1');
      url.searchParams.set('psc', '1');
      affiliateUrl = url.toString();
    }

    return affiliateUrl;
  }

  /**
   * Track a click on an affiliate link
   */
  trackClick(originalUrl: string): void {
    const currentClicks = this.clickStats.get(originalUrl) || 0;
    this.clickStats.set(originalUrl, currentClicks + 1);
  }

  /**
   * Get affiliate statistics
   */
  getAffiliateStats(): AffiliateStats {
    const programStats = new Map<string, { conversions: number; clicks: number; revenue: number }>();
    let totalConversions = 0;
    let totalClicks = 0;
    let estimatedRevenue = 0;

    // Calculate stats from conversions
    for (const [url, conversion] of this.conversions) {
      const clicks = this.clickStats.get(url) || 0;
      const estimatedItemRevenue = (clicks * 0.02 * (conversion.commission || 3)) / 100; // Rough estimate

      totalConversions++;
      totalClicks += clicks;
      estimatedRevenue += estimatedItemRevenue;

      const existing = programStats.get(conversion.program) || { conversions: 0, clicks: 0, revenue: 0 };
      programStats.set(conversion.program, {
        conversions: existing.conversions + 1,
        clicks: existing.clicks + clicks,
        revenue: existing.revenue + estimatedItemRevenue
      });
    }

    const topPrograms = Array.from(programStats.entries())
      .map(([program, stats]) => ({ program, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalConversions,
      totalClicks,
      estimatedRevenue,
      topPrograms
    };
  }

  /**
   * Get supported affiliate programs
   */
  getSupportedPrograms(): Array<{ name: string; domains: string[]; commission?: number }> {
    return this.affiliatePrograms.map(p => ({
      name: p.name,
      domains: p.domains,
      commission: p.commission
    }));
  }

  /**
   * Check if a URL can be converted to an affiliate link
   */
  canConvertUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      return this.affiliatePrograms.some(p => 
        p.domains.some(d => domain.includes(d) || d.includes(domain))
      );
    } catch {
      return false;
    }
  }

  /**
   * Batch convert multiple URLs
   */
  batchConvertUrls(urls: string[]): Array<{ originalUrl: string; conversion: AffiliateConversion | null }> {
    return urls.map(url => ({
      originalUrl: url,
      conversion: this.convertToAffiliateLink(url)
    }));
  }

  /**
   * Get conversion for a specific URL
   */
  getConversion(originalUrl: string): AffiliateConversion | null {
    return this.conversions.get(originalUrl) || null;
  }

  /**
   * Clean and normalize URLs before conversion
   */
  private cleanUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Generate a shareable affiliate link with additional tracking
   */
  generateShareableLink(originalUrl: string, userId?: number): string | null {
    const conversion = this.convertToAffiliateLink(originalUrl);
    if (!conversion) return null;

    // Add additional tracking parameters for our own analytics
    try {
      const url = new URL(conversion.affiliateUrl);
      if (userId) {
        url.searchParams.set('ww_user', userId.toString());
      }
      url.searchParams.set('ww_timestamp', Date.now().toString());
      
      return url.toString();
    } catch {
      return conversion.affiliateUrl;
    }
  }

  /**
   * Estimate potential revenue for a given price and program
   */
  estimateRevenue(price: number, programName: string): number {
    const program = this.affiliatePrograms.find(p => p.name === programName);
    if (!program || !program.commission) return 0;
    
    return (price * program.commission) / 100;
  }

  /**
   * Get affiliate disclosure text
   */
  getAffiliateDisclosure(): string {
    return "This post contains affiliate links. When you click on these links and make a purchase, we may earn a commission at no additional cost to you. This helps support our platform and allows us to continue providing free services.";
  }

  /**
   * Clear conversion history (for privacy/cleanup)
   */
  clearConversions(olderThanDays?: number): void {
    if (!olderThanDays) {
      this.conversions.clear();
      this.clickStats.clear();
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    for (const [url, conversion] of this.conversions) {
      if (conversion.timestamp < cutoffDate) {
        this.conversions.delete(url);
        this.clickStats.delete(url);
      }
    }
  }
}

export const affiliateService = new AffiliateService();
export default affiliateService;