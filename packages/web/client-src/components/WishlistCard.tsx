import { useState } from "react";
import { useLocation } from "wouter";
import { Edit, Share2, MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wishlist as DbWishlist } from "@wishlist-wizard/shared";
import PrivacyControls from "@/components/privacy/PrivacyControls";
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
  itemCount: number;
};

interface WishlistCardProps {
  wishlist: Wishlist;
  onRefresh: () => void;
  onSelect?: (wishlist: Wishlist) => void;
  selected?: boolean;
}

export default function WishlistCard({ wishlist, onRefresh, onSelect, selected = false }: WishlistCardProps) {
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
  const { toast } = useToast();

  const parsedOccasionDate = wishlist.occasionDate ? new Date(wishlist.occasionDate) : null;
  const occasionDate = parsedOccasionDate && !Number.isNaN(parsedOccasionDate.getTime()) ? parsedOccasionDate : null;
  const eventDateDisplay = occasionDate
    ? occasionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const hasRecurringSchedule = Boolean(occasionDate && wishlist.recurrence && wishlist.recurrence !== 'none');

  const getNextOccurrenceDate = () => {
    if (!occasionDate || !wishlist.recurrence || wishlist.recurrence === 'none') return null;
    const now = new Date();
    const next = new Date(occasionDate);

    if (wishlist.recurrence === 'yearly') {
      next.setFullYear(now.getFullYear());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return next;
    }

    if (wishlist.recurrence === 'monthly') {
      next.setFullYear(now.getFullYear(), now.getMonth());
      if (next < now) next.setMonth(now.getMonth() + 1);
      return next;
    }

    return next;
  };

  const nextOccurrenceDate = getNextOccurrenceDate();

  // Update wishlist mutation
  const updateWishlistMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/wishlists/${wishlist.id}`, {
        method: 'PATCH',
        body: {
          name: newName,
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wishlist.",
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete wishlist.",
        variant: "destructive",
      });
    }
  });

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
    const shareUrl = `${window.location.origin}/shared/${wishlist.shareId}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        toast({
          title: "Link copied",
          description: "Wishlist link copied to clipboard",
        });
      },
      () => {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      }
    );
  };

  const formattedDate = new Date(wishlist.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <>
      <Card className={`hover:shadow-md transition ${selected ? 'ring-2 ring-primary/40' : ''}`}>
        <CardContent className="p-0">
          <div className="p-5 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{wishlist.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-500">
                    {wishlist.itemCount} {wishlist.itemCount === 1 ? 'item' : 'items'} • Created {formattedDate}
                  </p>
                  <PrivacyControls
                    entityType="wishlist"
                    entityId={wishlist.id}
                    entityName={wishlist.name}
                    showAsBadge={true}
                  />
                </div>
                {(wishlist.occasion || hasRecurringSchedule) && (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Share wishlist"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
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
          {onSelect && (
            <Button
              variant={selected ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => onSelect(wishlist)}
            >
              {selected ? 'Selected' : 'Select'}
            </Button>
          )}
          <Button 
            variant="link" 
            className="text-primary hover:text-indigo-700 flex-1"
            onClick={() => setLocation(`/wishlist/${wishlist.id}`)}
          >
            View Details
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wishlist</DialogTitle>
            <DialogDescription>
              Update wishlist details.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Wishlist name"
          />
          <Input
            value={newOccasion}
            onChange={(e) => setNewOccasion(e.target.value)}
            placeholder="Event (optional)"
          />
          <Input
            type="date"
            value={newOccasionDate}
            onChange={(e) => setNewOccasionDate(e.target.value)}
            aria-label="Event Date"
            placeholder="Event Date (optional)"
          />
          <Select value={newRecurrence} onValueChange={setNewRecurrence}>
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
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateWishlistMutation.isPending}
            >
              {updateWishlistMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wishlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{wishlist.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteWishlistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
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
