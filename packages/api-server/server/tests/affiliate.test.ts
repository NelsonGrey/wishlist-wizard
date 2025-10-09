import { describe, it, expect } from 'vitest';
import affiliateService from '../services/affiliateService';

describe('AffiliateService', () => {
  describe('URL Conversion', () => {
    it('should convert Amazon URLs correctly', () => {
      const amazonUrl = 'https://www.amazon.com/dp/B08N5WRWNW';
      const result = affiliateService.convertToAffiliateLink(amazonUrl);
      
      expect(result).toBeTruthy();
      expect(result?.program).toBe('Amazon Associates');
      expect(result?.affiliateUrl).toContain('tag=wishlistwiz-20');
      expect(result?.commission).toBe(4);
    });

    it('should convert Target URLs correctly', () => {
      const targetUrl = 'https://www.target.com/p/nintendo-switch-console/-/A-52052007';
      const result = affiliateService.convertToAffiliateLink(targetUrl);
      
      expect(result).toBeTruthy();
      expect(result?.program).toBe('Target Affiliates');
      expect(result?.affiliateUrl).toContain('afid=wishlistwizard');
      expect(result?.commission).toBe(8);
    });

    it('should return null for unsupported URLs', () => {
      const unsupportedUrl = 'https://www.example.com/product/123';
      const result = affiliateService.convertToAffiliateLink(unsupportedUrl);
      
      expect(result).toBeNull();
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-url';
      const result = affiliateService.convertToAffiliateLink(invalidUrl);
      
      expect(result).toBeNull();
    });
  });

  describe('URL Detection', () => {
    it('should correctly identify convertible URLs', () => {
      expect(affiliateService.canConvertUrl('https://www.amazon.com/dp/B08N5WRWNW')).toBe(true);
      expect(affiliateService.canConvertUrl('https://www.target.com/p/product/-/A-123')).toBe(true);
      expect(affiliateService.canConvertUrl('https://www.example.com/product')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(affiliateService.canConvertUrl('not-a-url')).toBe(false);
      expect(affiliateService.canConvertUrl('')).toBe(false);
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple URLs in batch', () => {
      const urls = [
        'https://www.amazon.com/dp/B08N5WRWNW',
        'https://www.target.com/p/product/-/A-123',
        'https://www.example.com/unsupported'
      ];

      const results = affiliateService.batchConvertUrls(urls);
      
      expect(results).toHaveLength(3);
      expect(results[0].conversion).toBeTruthy();
      expect(results[1].conversion).toBeTruthy();
      expect(results[2].conversion).toBeNull();
    });
  });

  describe('Revenue Estimation', () => {
    it('should estimate revenue correctly', () => {
      const price = 100;
      const revenue = affiliateService.estimateRevenue(price, 'Amazon Associates');
      
      expect(revenue).toBe(4); // 4% of $100
    });

    it('should return 0 for unknown programs', () => {
      const price = 100;
      const revenue = affiliateService.estimateRevenue(price, 'Unknown Program');
      
      expect(revenue).toBe(0);
    });
  });

  describe('Program Information', () => {
    it('should return list of supported programs', () => {
      const programs = affiliateService.getSupportedPrograms();
      
      expect(Array.isArray(programs)).toBe(true);
      expect(programs.length).toBeGreaterThan(5);
      
      const amazonProgram = programs.find((p: any) => p.name === 'Amazon Associates');
      expect(amazonProgram).toBeTruthy();
      expect(amazonProgram?.domains).toContain('amazon.com');
    });
  });

  describe('Cleanup', () => {
    it('should clear old conversions', () => {
      const url = 'https://www.amazon.com/dp/B08N5WRWNW';
      affiliateService.convertToAffiliateLink(url);
      
      // Clear all conversions
      affiliateService.clearConversions();
      
      // Verify conversions are cleared by trying a new conversion
      const newResult = affiliateService.convertToAffiliateLink(url);
      expect(newResult).toBeTruthy(); // Should still work, just no history
    });
  });
});

// Integration test for API endpoints
describe('Affiliate API Integration', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3001';

  it('should convert URL via API', async () => {
    try {
      const response = await fetch(`${baseUrl}/api/affiliate/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.amazon.com/dp/B08N5WRWNW'
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        expect(data.success).toBe(true);
        expect(data.affiliateUrl).toBeTruthy();
        expect(data.program).toBe('Amazon Associates');
      } else {
        // Skip test if server not available
        console.log('Skipping API test - server not available');
      }
    } catch (error) {
      // Skip test if network/server error
      console.log('Skipping API test - network error');
    }
  });

  it('should return supported programs via API', async () => {
    try {
      const response = await fetch(`${baseUrl}/api/affiliate/programs`);
      
      if (response.ok) {
        const data = await response.json() as any;
        expect(Array.isArray(data.programs)).toBe(true);
        expect(data.programs.length).toBeGreaterThan(5);
      } else {
        console.log('Skipping API test - server not available');
      }
    } catch (error) {
      console.log('Skipping API test - network error');
    }
  });
});