import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bell, TrendingDown, DollarSign } from "lucide-react";

const formSchema = z.object({
  targetPrice: z.number().min(0.01, "Target price must be greater than $0.01").max(100000, "Target price cannot exceed $100,000"),
});

type PriceAlertFormValues = z.infer<typeof formSchema>;

interface PriceAlertDialogProps {
  open: boolean;
  onClose: () => void;
  item: {
    id: number;
    title: string;
    price: string;
    imageUrl?: string;
    store?: string;
  };
  onAlertCreated?: () => void;
}

export default function PriceAlertDialog({
  open,
  onClose,
  item,
  onAlertCreated
}: PriceAlertDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const itemDisplayTitle = String(item.title || 'item');

  const form = useForm<PriceAlertFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetPrice: 0,
    },
  });

  const currentPrice = parseFloat(item.price.replace(/[$,]/g, '')) || 0;
  const targetPrice = form.watch("targetPrice") || 0;

  const defaultTargetPrice = useMemo(() => {
    if (currentPrice <= 0) {
      return 0;
    }
    return Math.max(0.01, Number((currentPrice * 0.9).toFixed(2)));
  }, [currentPrice]);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      targetPrice: defaultTargetPrice,
    });
  }, [open, item.id, defaultTargetPrice, form]);

  const onSubmit = async (data: PriceAlertFormValues) => {
    if (currentPrice > 0 && data.targetPrice >= currentPrice) {
      form.setError("targetPrice", {
        type: "validate",
        message: "Target price should be below the current price.",
      });
      toast({
        title: "Choose a lower target",
        description: `Current price is $${currentPrice.toFixed(2)}. Set a lower threshold to receive a drop alert.`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      await apiRequest("/api/price-alerts", {
        method: "POST",
        body: {
          itemId: item.id,
          targetPrice: data.targetPrice,
        },
      });

      toast({
        title: "Price alert created!",
        description: `You'll be notified when "${item.title}" drops below $${data.targetPrice.toFixed(2)}.`,
      });

      onAlertCreated?.();
      onClose();
    } catch (error) {
      console.error("Error creating price alert:", error);
      toast({
        title: "Failed to create alert",
        description: "There was an error creating your price alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const suggestedPrices = [
    Math.max(0.01, currentPrice * 0.9), // 10% off
    Math.max(0.01, currentPrice * 0.8), // 20% off
    Math.max(0.01, currentPrice * 0.7), // 30% off
    Math.max(0.01, currentPrice - 10), // $10 off
  ].filter(price => price < currentPrice).slice(0, 4);

  const targetDelta = currentPrice > 0 && targetPrice > 0
    ? Number((currentPrice - targetPrice).toFixed(2))
    : 0;
  const targetDeltaPercent = currentPrice > 0 && targetDelta > 0
    ? Number(((targetDelta / currentPrice) * 100).toFixed(1))
    : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-label={`Create price alert for ${itemDisplayTitle}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-emerald-800" aria-hidden="true" />
            Create Price Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when the price drops below your target
          </DialogDescription>
        </DialogHeader>

        {/* Item Details */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/64x64/e2e8f0/64748b?text=Item";
                  }}
                />
              )}
              <div className="flex-1">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <div className="flex items-center mt-1">
                  <span className="text-lg font-semibold text-green-600">{item.price}</span>
                  {item.store && (
                    <span className="text-sm text-muted-foreground ml-2">from {item.store}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100000"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  {currentPrice > 0 && targetPrice > 0 && (
                    <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                      {targetDelta > 0
                        ? `Alert triggers after a $${targetDelta.toFixed(2)} (${targetDeltaPercent}%) drop.`
                        : "Choose a target below current price to trigger future drop alerts."}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Suggested Prices */}
            {suggestedPrices.length > 0 && (
              <div className="space-y-2">
                <FormLabel className="text-sm text-muted-foreground">Quick suggestions:</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrices.map((price, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Set target price to $${price.toFixed(2)}`}
                      onClick={() => form.setValue("targetPrice", price)}
                      className="text-xs"
                    >
                      ${price.toFixed(2)}
                      {price >= currentPrice * 0.9 && price < currentPrice && " (10% off)"}
                      {price >= currentPrice * 0.8 && price < currentPrice * 0.9 && " (20% off)"}
                      {price >= currentPrice * 0.7 && price < currentPrice * 0.8 && " (30% off)"}
                      {price < currentPrice - 5 && " ($10 off)"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {targetPrice > 0 && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-emerald-800" aria-hidden="true" />
                    <div className="text-sm text-emerald-900" role="status" aria-live="polite">
                      {targetPrice < currentPrice ? (
                        <>You&apos;ll be notified when the price drops below <strong>${targetPrice.toFixed(2)}</strong></>
                      ) : (
                        <>Current price (${currentPrice.toFixed(2)}) is already below your target</>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || targetPrice <= 0}
                aria-label={isCreating ? `Creating price alert for ${itemDisplayTitle}` : `Create price alert for ${itemDisplayTitle}`}
                className="w-full sm:w-auto"
              >
                {isCreating ? (
                  <>Creating Alert...</>
                ) : (
                  <>Create Price Alert</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}