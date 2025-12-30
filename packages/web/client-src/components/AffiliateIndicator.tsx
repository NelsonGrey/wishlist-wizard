import React from 'react';
import { Link, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AffiliateConversion {
  affiliateProgram?: string;
  commission?: number;
}

interface AffiliateIndicatorProps {
  metadata?: {
    affiliateConversion?: AffiliateConversion;
  };
  size?: 'sm' | 'md';
  showProgram?: boolean;
}

const AffiliateIndicator: React.FC<AffiliateIndicatorProps> = ({ 
  metadata, 
  size = 'sm',
  showProgram = false
}) => {
  const affiliateData = metadata?.affiliateConversion;
  
  if (!affiliateData) {
    return null;
  }

  const { affiliateProgram, commission } = affiliateData;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge 
              variant="secondary" 
              className={`${size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm'} bg-green-100 text-green-800 hover:bg-green-200`}
            >
              <Link className={`${size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
              Affiliate
            </Badge>
            
            {showProgram && affiliateProgram && (
              <Badge variant="outline" className={size === 'sm' ? 'text-xs' : 'text-sm'}>
                {affiliateProgram}
              </Badge>
            )}
            
            {commission && (
              <Badge variant="outline" className={size === 'sm' ? 'text-xs' : 'text-sm'}>
                <DollarSign className={`${size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'} mr-0.5`} />
                {commission}%
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p><strong>Affiliate Link</strong></p>
            <p>Program: {affiliateProgram}</p>
            {commission && <p>Commission: {commission}%</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Purchases through this link may earn a small commission
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AffiliateIndicator;