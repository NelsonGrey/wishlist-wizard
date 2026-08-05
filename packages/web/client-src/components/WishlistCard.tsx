import { useState } from "react";
import { useLocation } from "wouter";
import { Edit, Share2, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-errors";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import PrivacyControls from "@/components/privacy/PrivacyControls";
import { getNextOccurrenceDate, parseOccasionDate } from "@/lib/wishlist-dates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extended type for UI purposes that includes computed fields
type Wishlist = Omit<DbWishlist, 'id' | 'userId' | 'beneficiaryId'> & {
  id: string | number;
  userId: string | number;
  beneficiaryId?: string | number | null;
  recipient?: {
    type?: 'self' | 'person' | 'group';
    name?: string;
    members?: string[];
  } | null;
  recipientName?: string | null;
  itemCount: number;
};

interface WishlistCardProps {
  wishlist: Wishlist;
  onRefresh: () => void;
}

export default function WishlistCard({ wishlist, onRefresh }: WishlistCardProps) {
  const [, setLocation] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(wishlist.name);
  const [newOccasion, setNewOccasion] = useState(wishlist.occasion || '');
  const [newOccasionDate, setNewOccasionDate] = useState(
    wishlist.occasionDate ? new Date(wishlist.occasionDate).toISOString().slice(0, 10) : ''
  );
  const [newRecurrence, setNewRecurrence] = useState((wishlist.recurrence as string) || 'none');
  const [newReminderDays, setNewReminderDays] = useState(
    typeof wishlist.reminderDays === 'number' ? wishlist.reminderDays : 7
  );
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const occasionDate = parseOccasionDate(wishlist.occasionDate);
  const eventDateDisplay = occasionDate
    ? occasionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const hasRecurringSchedule = Boolean(occasionDate && wishlist.recurrence && wishlist.recurrence !== 'none');
  const recipientName = wishlist.recipient?.name || wishlist.recipientName || 'Myself';
  const recipientType = wishlist.recipient?.type || 'self';
  const recipientMembers = Array.isArray(wishlist.recipient?.members) ? wishlist.recipient?.members : [];

  const nextOccurrenceDate = getNextOccurrenceDate(occasionDate, wishlist.recurrence);

  // Update wishlist mutation
  const updateWishlistMutation = useMutation({
    mutationFn: async () => {
      const normalizedName = newName.trim();
      if (!normalizedName) {
        throw new Error('Wishlist name cannot be empty.');
      }

      await apiRequest(`/api/wishlists/${wishlist.id}`, {
        method: 'PATCH',
        body: {
          name: normalizedName,
          occasion: newOccasion.trim() || null,
          occasionDate: newOccasionDate ? new Date(`${newOccasionDate}T12:00:00`).toISOString() : null,
          recurrence: newRecurrence,
          reminderDays: newRecurrence === 'none' ? null : newReminderDays,
        }
      });
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      onRefresh();
      toast({
        title: "Wishlist updated",
        description: "Your wishlist has been renamed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update wishlist.", {
          conflictCodes: ['wishlist_conflict'],
          conflictMessage: 'This wishlist was updated elsewhere. Refresh and try again.',
        }),
        variant: "destructive",
      });
    }
  });

  // Delete wishlist mutation
  const deleteWishlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/wishlists/${wishlist.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      onRefresh();
      toast({
        title: "Wishlist deleted",
        description: "Your wishlist has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete wishlist.", {
          conflictCodes: ['wishlist_conflict'],
          conflictMessage: 'This wishlist was updated elsewhere. Refresh and try again.',
        }),
        variant: "destructive",
      });
    }
  });

  const isMutating = updateWishlistMutation.isPending || deleteWishlistMutation.isPending;

  const handleEditClick = () => {
    setNewName(wishlist.name);
    setNewOccasion(wishlist.occasion || '');
    setNewOccasionDate(wishlist.occasionDate ? new Date(wishlist.occasionDate).toISOString().slice(0, 10) : '');
    setNewRecurrence((wishlist.recurrence as string) || 'none');
    setNewReminderDays(typeof wishlist.reminderDays === 'number' ? wishlist.reminderDays : 7);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (isMutating) {
      return;
    }

    if (newName.trim() === "") {
      toast({
        title: "Error",
        description: "Wishlist name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateWishlistMutation.mutate();
  };

  const handleShare = () => {
    if (isSharing) {
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${wishlist.shareId}`;
    setIsSharing(true);

    const fallbackCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (!successful) {
        throw new Error('Unable to copy to clipboard');
      }
    };

    const copyPromise = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(shareUrl).catch(() => {
          fallbackCopy();
        })
      : Promise.resolve().then(() => fallbackCopy());

    copyPromise.then(
      () => {
        toast({
          title: "Link copied",
          description: "Wishlist link copied to clipboard",
        });
      },
      () => {
        toast({
          title: "Error",
          description: "Failed to copy link. Please copy the URL from your browser address bar.",
          variant: "destructive",
        });
      }
    ).finally(() => {
      setIsSharing(false);
    });
  };

  const formattedDate = new Date(wishlist.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const numericWishlistId = typeof wishlist.id === 'number' ? wishlist.id : Number(wishlist.id);
  const hasNumericWishlistId = Number.isFinite(numericWishlistId);

  return (
    <>
      <Card data-testid={`wishlist-card-${wishlist.id}`} className="hover:shadow-md transition">
        <CardContent className="p-0">
          <div className="p-5 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{wishlist.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-500">
                    {wishlist.itemCount} {wishlist.itemCount === 1 ? 'item' : 'items'} • Created {formattedDate}
                  </p>
                  {hasNumericWishlistId && (
                    <PrivacyControls
                      entityType="wishlist"
                      entityId={numericWishlistId}
                      entityName={wishlist.name}
                      showAsBadge={true}
                    />
                  )}
                </div>
                {(wishlist.occasion || hasRecurringSchedule) && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p>
                      Recipient: {recipientName}
                      {recipientType === 'group' && recipientMembers.length > 0 ? ` (${recipientMembers.length} members)` : ''}
                    </p>
                    {wishlist.occasion && <p>Event: {wishlist.occasion}</p>}
                    {eventDateDisplay && <p>Event Date: {eventDateDisplay}</p>}
                    {nextOccurrenceDate && (
                      <p>
                        Next {wishlist.recurrence} event: {nextOccurrenceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid={`wishlist-share-${wishlist.id}`}
                      variant="ghost"
                      size="icon"
                      onClick={handleShare}
                      disabled={isMutating || isSharing}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Share wishlist"
                    >
                      <Share2 className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share wishlist</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          data-testid={`wishlist-menu-${wishlist.id}`}
                          variant="ghost"
                          size="icon"
                          disabled={isMutating}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="More options"
                        >
                          <MoreVertical className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>More options</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem data-testid={`wishlist-edit-action-${wishlist.id}`} onClick={handleEditClick}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid={`wishlist-delete-action-${wishlist.id}`} onClick={handleDeleteClick} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          <div className="p-4 text-sm text-gray-600 space-y-2">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span className="font-medium text-gray-900">{wishlist.itemCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Visibility</span>
              <span className="font-medium text-gray-900">{wishlist.isPublic ? 'Public' : 'Private'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Collaboration</span>
              <span className="font-medium text-gray-900">{wishlist.isCollaborative ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t flex items-center gap-2">
          <Button
            data-testid={`wishlist-view-${wishlist.id}`}
            variant="link"
            className="text-emerald-700 hover:text-emerald-800 flex-1"
            disabled={isMutating}
            onClick={() => setLocation(`/app/wishlist/${wishlist.id}`)}
          >
            View Details
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!updateWishlistMutation.isPending) {
            setIsEditDialogOpen(open);
          }
        }}
      >
        <DialogContent data-testid={`wishlist-edit-dialog-${wishlist.id}`}>
          <DialogHeader>
            <DialogTitle>Edit Wishlist</DialogTitle>
            <DialogDescription>
              Update wishlist details.
            </DialogDescription>
          </DialogHeader>
          <Input
            data-testid={`wishlist-edit-name-input-${wishlist.id}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Wishlist name"
            disabled={updateWishlistMutation.isPending}
          />
          <Input
            value={newOccasion}
            onChange={(e) => setNewOccasion(e.target.value)}
            placeholder="Event (optional)"
            disabled={updateWishlistMutation.isPending}
          />
          <Input
            type="date"
            value={newOccasionDate}
            onChange={(e) => setNewOccasionDate(e.target.value)}
            aria-label="Event Date"
            placeholder="Event Date (optional)"
            disabled={updateWishlistMutation.isPending}
          />
          <Select value={newRecurrence} onValueChange={setNewRecurrence} disabled={updateWishlistMutation.isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Recurrence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Does not repeat</SelectItem>
              <SelectItem value="yearly">Repeats yearly</SelectItem>
              <SelectItem value="monthly">Repeats monthly</SelectItem>
            </SelectContent>
          </Select>
          {newRecurrence !== 'none' && (
            <Input
              type="number"
              min={0}
              max={90}
              value={newReminderDays}
              onChange={(e) => setNewReminderDays(Number(e.target.value))}
              placeholder="Reminder days"
              disabled={updateWishlistMutation.isPending}
            />
          )}
          <DialogFooter>
            <Button
              data-testid={`wishlist-edit-cancel-${wishlist.id}`}
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              data-testid={`wishlist-edit-save-${wishlist.id}`}
              onClick={handleSaveEdit}
              disabled={updateWishlistMutation.isPending}
            >
              {updateWishlistMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteWishlistMutation.isPending) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <DialogContent data-testid={`wishlist-delete-dialog-${wishlist.id}`}>
          <DialogHeader>
            <DialogTitle>Delete Wishlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{wishlist.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              data-testid={`wishlist-delete-cancel-${wishlist.id}`}
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              data-testid={`wishlist-delete-confirm-${wishlist.id}`}
              variant="destructive"
              onClick={() => deleteWishlistMutation.mutate()}
              disabled={deleteWishlistMutation.isPending}
            >
              {deleteWishlistMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
