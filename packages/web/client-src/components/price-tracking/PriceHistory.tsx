import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

// Type for price history data point
type PriceHistoryPoint = {
  date: string;
  price: number;
  store?: string;
};

interface PriceHistoryProps {
  itemId: number;
}

export default function PriceHistory({ itemId }: PriceHistoryProps) {
  // Fetch price history data
  const { data: priceHistory, isLoading, isError } = useQuery<PriceHistoryPoint[]>({
    queryKey: [`/api/items/${itemId}/price-history`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Skip if no price history data available
  if (priceHistory && priceHistory.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Price History</CardTitle>
          <CardDescription>
            Not enough price data available yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-2" />
            Price tracking will begin with the next price change
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Price History</CardTitle>
          <CardDescription>
            Loading price data...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Price History</CardTitle>
          <CardDescription>
            Error loading price data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            Unable to retrieve price history
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for the chart
  const chartData = priceHistory?.map((point: PriceHistoryPoint) => ({
    date: new Date(point.date),
    price: typeof point.price === 'number' ? point.price : parseFloat(point.price as unknown as string),
    formattedPrice: `$${point.price}`,
  })) || [];

  // Calculate price trends
  const firstPrice = chartData[0]?.price || 0;
  const latestPrice = chartData[chartData.length - 1]?.price || 0;
  const priceDifference = latestPrice - firstPrice;
  const percentChange = firstPrice > 0 
    ? ((priceDifference) / firstPrice) * 100 
    : 0;
  
  // Determine if price is increasing or decreasing
  const isPriceIncreasing = priceDifference > 0;
  const isPriceDecreasing = priceDifference < 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Price History</CardTitle>
            <CardDescription>
              Tracking price changes over time
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center">
              {isPriceIncreasing && (
                <>
                  <TrendingUp className="h-4 w-4 mr-1 text-destructive" />
                  <span className="font-medium text-destructive">
                    +{Math.abs(percentChange).toFixed(1)}%
                  </span>
                </>
              )}
              {isPriceDecreasing && (
                <>
                  <TrendingDown className="h-4 w-4 mr-1 text-green-600" />
                  <span className="font-medium text-green-600">
                    -{Math.abs(percentChange).toFixed(1)}%
                  </span>
                </>
              )}
              {!isPriceIncreasing && !isPriceDecreasing && (
                <span className="text-muted-foreground">No change</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Since {isValidDate(chartData[0]?.date) ? format(chartData[0].date, 'MMM d, yyyy') : '—'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => isValidDate(date) ? format(date as Date, 'MMM d') : ''}
                tick={{ fontSize: 12 }}
                minTickGap={15}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                labelFormatter={(date) => isValidDate(date) ? format(date as Date, 'MMM d, yyyy h:mm a') : ''}
                formatter={(value) => [`$${value}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, stroke: '#4F46E5', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}