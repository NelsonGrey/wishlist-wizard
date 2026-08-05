import React from 'react';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AffiliateDisclosureProps {
  variant?: 'compact' | 'detailed';
  className?: string;
}

const AffiliateDisclosure: React.FC<AffiliateDisclosureProps> = ({ 
  variant = 'compact', 
  className = '' 
}) => {
  if (variant === 'compact') {
    return (
      <div className={`text-xs text-muted-foreground p-2 border rounded ${className}`}>
        <Info className="inline h-3 w-3 mr-1" />
        This post contains affiliate links. We may earn a commission if you make a purchase.
      </div>
    );
  }

  return (
    <Alert className={className}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <h4 className="font-semibold">Affiliate Links Disclosure</h4>
          <p>
            Some links on this platform are affiliate links. This means we may earn a small
            commission if you click on these links and make a purchase, at no additional cost to you.
          </p>
          <p>
            We only recommend products we believe will be valuable to you. Our affiliate partnerships
            help support the platform and keep it free for all users.
          </p>
          <p className="text-sm">
            <strong>Supported Programs:</strong> Amazon Associates, Target Affiliates, Best Buy,
            Walmart, eBay Partner Network, Etsy, Home Depot, Macy&apos;s, Nordstrom, and Wayfair.
          </p>
          <p className="text-sm">
            For more information about our affiliate partnerships and how they work, please see our
            <a href="/app/privacy-settings" className="underline ml-1">Privacy Policy</a>.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default AffiliateDisclosure;