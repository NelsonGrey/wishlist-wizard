import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Crown,
  MessageSquare,
  Trash2
} from "lucide-react";

interface GroupGiftDetailsProps {
  itemId: number;
  item: {
    title: string;
    price: string;
    imageUrl?: string;
    store?: string;
  };
  onClose?: () => void;
}

interface GiftParticipant {
  id: number;
  userId: number;
  contributionAmount: number;
  message?: string;
  isAnonymous: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  user?: {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface GiftStats {
  totalContributed: number;
  participantCount: number;
  isReadyToPurchase: boolean;
  isPurchased: boolean;
}

export default function GroupGiftDetails({ itemId, item, onClose }: GroupGiftDetailsProps) {
  const [showMarkReadyDialog, setShowMarkReadyDialog] = useState(false);
  const [showMarkPurchasedDialog, setShowMarkPurchasedDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gift participants
  const { data: participants, isLoading: isLoadingParticipants } = useQuery<GiftParticipant[]>({
    queryKey: [`/api/gifts/${itemId}/participants`],
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch gift stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<GiftStats>({
    queryKey: [`/api/group-payments/${itemId}/stats`],
    staleTime: 30 * 1000,
  });

  // Mark gift as ready mutation
  const markReadyMutation = useMutation({
    mutationFn: () => apiRequest(`/api/gifts/${itemId}/ready`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Gift marked as ready",
        description: "The group gift has been marked as ready to purchase.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/group-payments/${itemId}/stats`] });
      setShowMarkReadyDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to mark gift as ready",
        description: "There was an error marking the gift as ready.",
        variant: "destructive",
      });
    },
  });

  // Mark gift as purchased mutation
  const markPurchasedMutation = useMutation({
    mutationFn: (data: { purchaseDetails?: string }) =>
      apiRequest(`/api/gifts/${itemId}/purchased`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Gift marked as purchased",
        description: "The group gift has been marked as purchased.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/group-payments/${itemId}/stats`] });
      setShowMarkPurchasedDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to mark gift as purchased",
        description: "There was an error marking the gift as purchased.",
        variant: "destructive",
      });
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/gifts/${itemId}/participants`, {
        method: "DELETE",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      toast({
        title: "Participant removed",
        description: "The participant has been removed from the group gift.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/gifts/${itemId}/participants`] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-payments/${itemId}/stats`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove participant",
        description: "There was an error removing the participant.",
        variant: "destructive",
      });
    },
  });

  const targetPrice = parseFloat(item.price.replace(/[$,]/g, '')) || 0;
  const totalContributed = stats?.totalContributed || 0;
  const progressPercentage = targetPrice > 0 ? Math.min(100, (totalContributed / targetPrice) * 100) : 0;
  const remainingAmount = Math.max(0, targetPrice - totalContributed);

  const handleMarkReady = () => {
    markReadyMutation.mutate();
  };

  const handleMarkPurchased = () => {
    markPurchasedMutation.mutate({});
  };

  const handleRemoveParticipant = (userId: number) => {
    removeParticipantMutation.mutate(userId);
  };

  if (isLoadingParticipants || isLoadingStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gift Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Group Gift Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                Target: ${targetPrice.toFixed(2)} • Raised: ${totalContributed.toFixed(2)}
              </p>
              <div className="mt-2">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {progressPercentage.toFixed(1)}% funded
                  {remainingAmount > 0 && ` • $${remainingAmount.toFixed(2)} remaining`}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {stats?.isPurchased ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Purchased
              </Badge>
            ) : stats?.isReadyToPurchase ? (
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Ready to Purchase
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Collecting Contributions
              </Badge>
            )}
            <Badge variant="outline">
              {participants?.length || 0} Contributors
            </Badge>
          </div>

          {/* Action Buttons */}
          {!stats?.isPurchased && (
            <div className="flex gap-2 pt-2">
              {!stats?.isReadyToPurchase && totalContributed >= targetPrice && (
                <Button
                  onClick={() => setShowMarkReadyDialog(true)}
                  disabled={markReadyMutation.isPending}
                  size="sm"
                >
                  Mark as Ready to Purchase
                </Button>
              )}
              {stats?.isReadyToPurchase && (
                <Button
                  onClick={() => setShowMarkPurchasedDialog(true)}
                  disabled={markPurchasedMutation.isPending}
                  size="sm"
                  variant="default"
                >
                  Mark as Purchased
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2" />
            Contributors ({participants?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants && participants.length > 0 ? (
            <div className="space-y-4">
              {participants.map((participant, index) => (
                <div key={participant.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.user?.avatarUrl} />
                        <AvatarFallback>
                          {participant.isAnonymous
                            ? "?"
                            : participant.user?.displayName?.[0] || participant.user?.username?.[0] || "U"
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {participant.isAnonymous
                            ? "Anonymous Contributor"
                            : participant.user?.displayName || participant.user?.username || "Unknown User"
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${participant.contributionAmount.toFixed(2)}
                          {participant.status === 'pending' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Pending
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.message && (
                        <div className="text-right">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(participant.userId)}
                        disabled={removeParticipantMutation.isPending}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {participant.message && (
                    <div className="mt-2 ml-11 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs text-muted-foreground italic">
                        "{participant.message}"
                      </p>
                    </div>
                  )}
                  {index < participants.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No contributors yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to contribute to this group gift!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Ready Dialog */}
      <AlertDialog open={showMarkReadyDialog} onOpenChange={setShowMarkReadyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Gift as Ready to Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              This will notify all contributors that the gift is ready to be purchased.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkReady}>
              Mark as Ready
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Purchased Dialog */}
      <AlertDialog open={showMarkPurchasedDialog} onOpenChange={setShowMarkPurchasedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Gift as Purchased</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the gift as purchased and notify all contributors.
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPurchased}>
              Mark as Purchased
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}