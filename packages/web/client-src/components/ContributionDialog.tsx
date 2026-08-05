import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Users, DollarSign, Lock } from "lucide-react";
import "@/styles/progress.css";

// Initialize Stripe
const stripePublishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const MIN_CONTRIBUTION_AMOUNT = 0.5;
export const MAX_CONTRIBUTION_AMOUNT = 10000;

const formSchema = z.object({
  contributionAmount: z
    .number()
    .min(MIN_CONTRIBUTION_AMOUNT, "Minimum contribution is $0.50")
    .max(MAX_CONTRIBUTION_AMOUNT, "Maximum contribution is $10,000"),
  message: z.string().max(500, "Message cannot exceed 500 characters").optional(),
  isAnonymous: z.boolean().default(false),
});

type ContributionFormValues = z.infer<typeof formSchema>;

interface ContributionDialogProps {
  open: boolean;
  onClose: () => void;
  item: {
    id: number;
    title: string;
    price: string;
    imageUrl?: string;
    store?: string;
  };
  onContributionSuccess?: () => void;
}

// Inner component that uses Stripe Elements
interface Participant {
  id: string;
  name: string;
  amount: number;
  date: string;
  isAnonymous?: boolean;
  user?: {
    displayName?: string;
  };
  contributionAmount?: number;
}

interface PaymentIntentResponse {
  clientSecret: string;
  contributionId: string;
}

export function getContributionLimit(targetPrice: number, currentTotal: number): number {
  const remainingAmount = Math.max(0, targetPrice - currentTotal);
  if (remainingAmount === 0) {
    return 0;
  }

  return Math.min(MAX_CONTRIBUTION_AMOUNT, Number(remainingAmount.toFixed(2)));
}

function ContributionForm({
  item,
  onClose,
  onContributionSuccess
}: Omit<ContributionDialogProps, 'open'>) {
  const [isProcessing, setIsProcessing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentTotal, setCurrentTotal] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contributionAmount: 0,
      message: "",
      isAnonymous: false,
    },
  });

  const onSubmit = async (data: ContributionFormValues) => {
    if (!stripe || !elements) {
      toast({
        title: "Payment system not ready",
        description: "Please wait for the payment system to load.",
        variant: "destructive",
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({
        title: "Payment method required",
        description: "Please enter your payment information.",
        variant: "destructive",
      });
      return;
    }

    if (data.contributionAmount > maxAllowedContribution) {
      toast({
        title: "Contribution exceeds allowed range",
        description: `Enter an amount between $${MIN_CONTRIBUTION_AMOUNT.toFixed(2)} and $${maxAllowedContribution.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // First, create a payment intent
      const paymentIntentRes = await apiRequest("/api/group-payments/payment-intent", {
        method: "POST",
        body: {
          itemId: item.id,
          amount: data.contributionAmount,
          message: data.message || "",
          isAnonymous: data.isAnonymous,
        },
      }) as PaymentIntentResponse;

      const { clientSecret, contributionId } = paymentIntentRes;

      // Confirm the payment with Stripe
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Confirm contribution in backend
      await apiRequest('/api/group-payments/confirm', {
        method: 'POST',
        body: {
          contributionId
        }
      });

      toast({
        title: "Contribution successful!",
        description: `Thank you for contributing $${data.contributionAmount.toFixed(2)} to "${item.title}".`,
      });

      onContributionSuccess?.();
      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "There was an error processing your payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const targetPrice = parseFloat(item.price.replace(/[$,]/g, '')) || 0;
  const remainingAmount = Math.max(0, targetPrice - currentTotal);
  const maxAllowedContribution = getContributionLimit(targetPrice, currentTotal);
  const canContribute = maxAllowedContribution >= MIN_CONTRIBUTION_AMOUNT;
  const contributionAmount = form.watch("contributionAmount") || 0;
  const newTotal = currentTotal + contributionAmount;
  const progressPercentage = Math.min(100, (newTotal / targetPrice) * 100);


    if (!canContribute) {
      toast({
        title: "Contribution unavailable",
        description: "This group gift is fully funded or below the minimum contribution threshold.",
        variant: "destructive",
      });
      return;
    }
  // Update progress bar width when currentTotal or targetPrice changes
  useEffect(() => {
    if (progressBarRef.current) {
      const progressPercentage = Math.min(100, (currentTotal / targetPrice) * 100);
      progressBarRef.current.style.setProperty('--progress-width', `${progressPercentage}%`);
    }
  }, [currentTotal, targetPrice]);

  // Load current group gift summary
  useEffect(() => {
    let isMounted = true;
    const loadSummary = async () => {
      try {
        setIsLoadingParticipants(true);
        const summary = await apiRequest(`/api/group-payments/item/${item.id}`, { method: 'GET' }) as {
          totalAmount?: number;
          participants?: Participant[];
        };

        if (!isMounted) return;
        setCurrentTotal(summary?.totalAmount || 0);
        setParticipants(summary?.participants || []);
      } catch (error) {
        console.error('Failed to load group gift summary:', error);
      } finally {
        if (isMounted) {
          setIsLoadingParticipants(false);
        }
      }
    };

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [item.id]);

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" aria-label={`Contribute to ${item.title}`}>
      <DialogHeader>
        <DialogTitle className="flex items-center">
          <Heart className="h-5 w-5 mr-2 text-red-500" aria-hidden="true" />
          Contribute to Gift
        </DialogTitle>
        <DialogDescription>
          Help make &quot;{item.title}&quot; a reality by contributing to this group gift.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
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

        {/* Progress Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Users className="h-4 w-4 mr-2" aria-hidden="true" />
              Group Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Raised: ${currentTotal.toFixed(2)}</span>
              <span>Goal: ${targetPrice.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2" ref={progressBarRef}>
              <div className="contribution-progress-bar" />
            </div>
            <div className="text-sm text-muted-foreground">
              {remainingAmount > 0 ? (
                <>${remainingAmount.toFixed(2)} still needed</>
              ) : (
                <>Goal reached! 🎉</>
              )}
            </div>

            {isLoadingParticipants && (
              <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                Loading contributor activity...
              </p>
            )}

            {/* Participants */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Contributors ({participants.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {participants.slice(0, 5).map((participant, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {participant.isAnonymous ? "Anonymous" : participant.user?.displayName || "Someone"}
                      {participant.contributionAmount && ` ($${participant.contributionAmount})`}
                    </Badge>
                  ))}
                  {participants.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{participants.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contribution Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contributionAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Contribution</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.50"
                        max={String(maxAllowedContribution)}
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground" data-testid="contribution-amount-hint">
                    {canContribute
                      ? `Allowed range: $${MIN_CONTRIBUTION_AMOUNT.toFixed(2)} - $${maxAllowedContribution.toFixed(2)}`
                      : 'Additional contributions are disabled for this gift.'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message with your contribution..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Make my contribution anonymous
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <div className="space-y-2">
              <FormLabel>Payment Method</FormLabel>
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lock className="h-4 w-4 text-green-600" aria-hidden="true" />
                    <span className="text-sm font-medium">Secure Payment</span>
                  </div>
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                      },
                    }}
                    className="p-3 border rounded-md"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            {contributionAmount > 0 && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-emerald-900 mb-2">Contribution Summary</h4>
                  <div className="space-y-1 text-sm text-emerald-800">
                    <div className="flex justify-between">
                      <span>Your contribution:</span>
                      <span>${contributionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New total:</span>
                      <span>${newTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Progress after contribution:</span>
                      <span>{Math.min(100, progressPercentage).toFixed(1)}%</span>
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
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isProcessing ||
                  !stripe ||
                  !canContribute ||
                  contributionAmount < MIN_CONTRIBUTION_AMOUNT ||
                  contributionAmount > maxAllowedContribution
                }
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>Contribute ${contributionAmount.toFixed(2)}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </div>
    </DialogContent>
  );
}

export default function ContributionDialog(props: ContributionDialogProps) {
  if (!stripePromise) {
    return (
      <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Payments unavailable</DialogTitle>
            <DialogDescription>
              Group contributions are temporarily unavailable because Stripe is not configured for this environment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={props.onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <Elements stripe={stripePromise}>
        <ContributionForm {...props} />
      </Elements>
    </Dialog>
  );
}