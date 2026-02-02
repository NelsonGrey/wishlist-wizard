import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Link, 
  MousePointer, 
  ShoppingBag,
  Eye,
  Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

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

interface AffiliateProgram {
  name: string;
  domains: string[];
  commission?: number;
}

const AffiliateDashboard: React.FC = () => {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [programs, setPrograms] = useState<AffiliateProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleOpenDisclosure = async () => {
    try {
      const response = await apiRequest('/api/affiliate/disclosure', { method: 'GET' }) as { disclosure?: string };
      const disclosureText = response?.disclosure || 'Affiliate disclosure not available.';
      const popup = window.open('', '_blank', 'width=600,height=400');
      if (popup) {
        popup.document.write(`<pre style="white-space: pre-wrap; font-family: system-ui; padding: 16px;">${disclosureText}</pre>`);
        popup.document.close();
      }
    } catch (err) {
      console.error('Error loading disclosure:', err);
      setError('Failed to load affiliate disclosure');
    }
  };

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      setLoading(true);
      
      const [statsData, programsData] = await Promise.all([
        apiRequest('/api/affiliate/stats', { method: 'GET' }) as Promise<{ stats: AffiliateStats }>,
        apiRequest('/api/affiliate/programs', { method: 'GET' }) as Promise<{ programs: AffiliateProgram[] }>
      ]);
      
      setStats(statsData?.stats || null);
      setPrograms(programsData?.programs || []);
      
    } catch (err) {
      setError('Failed to load affiliate data');
      console.error('Error fetching affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Affiliate Disclosure */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This dashboard shows your affiliate link performance. When visitors click on affiliate links 
          from your wishlists and make purchases, you may earn commissions that help support the platform.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Links Converted</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Product URLs converted to affiliate links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Clicks on affiliate links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.estimatedRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Potential earnings from conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalConversions ? 
                Math.round((stats.totalClicks / stats.totalConversions) * 100) / 100 : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average clicks per converted link
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Programs */}
      {stats?.topPrograms && stats.topPrograms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPrograms.map((program, index) => (
                <div key={program.program} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{program.program}</p>
                      <p className="text-sm text-muted-foreground">
                        {program.conversions} conversions • {program.clicks} clicks
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(program.revenue)}</p>
                    <p className="text-sm text-muted-foreground">
                      {program.clicks > 0 ? 
                        `${Math.round((program.clicks / program.conversions) * 100) / 100}% CTR` : 
                        '0% CTR'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Programs */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Affiliate Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <div key={program.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{program.name}</h3>
                  {program.commission && (
                    <Badge variant="secondary">{program.commission}%</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-1">Supported domains:</p>
                  <div className="flex flex-wrap gap-1">
                    {program.domains.map((domain) => (
                      <Badge key={domain} variant="outline" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.location.href = '/wishlists'}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Convert Wishlist Links
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={handleOpenDisclosure}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Disclosure
            </Button>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> When you add items to your wishlists, we automatically 
              convert supported product URLs to affiliate links. When someone clicks these links 
              and makes a purchase, you earn a small commission at no extra cost to them.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateDashboard;