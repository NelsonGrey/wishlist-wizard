import { ProductExtractorAdapter } from './base-adapter.js';
import { AmazonAdapter } from './amazon-adapter.js';
import { TargetAdapter } from './target-adapter.js';
import { WalmartAdapter } from './walmart-adapter.js';

/**
 * Registry for managing product extractor adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, ProductExtractorAdapter> = new Map();

  constructor() {
    this.registerAdapter(new AmazonAdapter());
    this.registerAdapter(new TargetAdapter());
    this.registerAdapter(new WalmartAdapter());
  }

  /**
   * Register a new adapter
   */
  registerAdapter(adapter: ProductExtractorAdapter): void {
    // Register main domain
    this.adapters.set(adapter.domain, adapter);

    // Register alternative domains
    if (adapter.alternativeDomains) {
      adapter.alternativeDomains.forEach(domain => {
        this.adapters.set(domain, adapter);
      });
    }
  }

  /**
   * Get adapter for a specific domain
   */
  getAdapter(domain: string): ProductExtractorAdapter | null {
    return this.adapters.get(domain) || null;
  }

  /**
   * Get all registered adapters sorted by priority
   */
  getAllAdapters(): ProductExtractorAdapter[] {
    return Array.from(this.adapters.values())
      .filter((adapter, index, self) =>
        // Remove duplicates (same adapter might be registered for multiple domains)
        index === self.findIndex(a => a.domain === adapter.domain)
      )
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Find the best adapter for a given URL
   */
  findAdapterForUrl(url: string): ProductExtractorAdapter | null {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // Try exact domain match first
      let adapter = this.getAdapter(domain);
      if (adapter) {
        return adapter;
      }

      // Try without www prefix
      const domainWithoutWww = domain.replace(/^www\./, '');
      adapter = this.getAdapter(domainWithoutWww);
      if (adapter) {
        return adapter;
      }

      // Try with www prefix
      const domainWithWww = 'www.' + domainWithoutWww;
      adapter = this.getAdapter(domainWithWww);
      if (adapter) {
        return adapter;
      }

      return null;
    } catch (error) {
      console.warn('Invalid URL provided to findAdapterForUrl:', url);
      return null;
    }
  }
}

// Export singleton instance
export const adapterRegistry = new AdapterRegistry();