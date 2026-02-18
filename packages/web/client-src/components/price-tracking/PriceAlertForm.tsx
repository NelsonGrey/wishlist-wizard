import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BellRing, DollarSign } from "lucide-react";

interface PriceAlertFormProps {
  itemId: number;
  currentPrice: string;
  currentNumericPrice: number;
  onSuccess?: () => void;
}

export default function PriceAlertForm({
  itemId,
  currentPrice,
  currentNumericPrice,
  onSuccess
}: PriceAlertFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Create schema for price alert form
  const formSchema = z.object({
    targetPrice: z
      .number()
      .positive("Target price must be positive")
      .max(currentNumericPrice, "Target price must be lower than current price"),
  });

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetPrice: Math.round((currentNumericPrice * 0.9) * 100) / 100, // Default to 10% off
    },
  });

  // Mutation for creating price alert
  const createPriceAlertMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("/api/price-alerts", {
        method: "POST",
        body: {
          itemId,
          targetPrice: data.targetPrice,
          expiresAt: format(addMonths(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss'Z'"), // Default expiry of 3 months
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Price alert created",
        description: `We'll notify you when the price drops to $${form.getValues().targetPrice}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
      
      // Reset form and hide it
      form.reset();
      setShowForm(false);
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to create price alert",
        description: "There was an error creating your price alert.",
        variant: "destructive",
      });
      console.error("Error creating price alert:", error);
    },
  });

  // Handle form submission
  function onSubmit(values: z.infer<typeof formSchema>) {
    createPriceAlertMutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <BellRing className="h-5 w-5 mr-2 text-emerald-800" />
          Price Alert
        </CardTitle>
        <CardDescription>
          Get notified when the price drops below your target
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {!showForm ? (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowForm(true)}
          >
            Set up price alert
          </Button>
        ) : (
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
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="pl-8" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Current price: {currentPrice}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createPriceAlertMutation.isPending}
                >
                  {createPriceAlertMutation.isPending ? "Creating..." : "Create Alert"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                  disabled={createPriceAlertMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}