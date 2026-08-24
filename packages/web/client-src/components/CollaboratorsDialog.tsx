import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-errors";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InviteCollaboratorDialog, { type InvitableRole } from "@/components/InviteCollaboratorDialog";

interface Collaborator {
  userId: string;
  role: InvitableRole;
  email: string | null;
  displayName: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: InvitableRole;
}

interface CollaboratorsResponse {
  collaborators: Collaborator[];
  pendingInvites: PendingInvite[];
}

interface CollaboratorsDialogProps {
  wishlistId: string | number;
  wishlistName: string;
  isOwner: boolean;
  currentUserId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CollaboratorsDialog({
  wishlistId,
  wishlistName,
  isOwner,
  currentUserId,
  open,
  onOpenChange,
}: CollaboratorsDialogProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { toast } = useToast();

  const queryKey = [`/api/wishlists/${wishlistId}/collaborators`];

  const { data, isLoading } = useQuery<CollaboratorsResponse>({
    queryKey,
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: InvitableRole }) =>
      apiRequest(`/api/wishlists/${wishlistId}/collaborators/${targetUserId}`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: invalidate,
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update role."),
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (targetUserId: string) =>
      apiRequest(`/api/wishlists/${wishlistId}/collaborators/${targetUserId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Collaborator removed" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to remove collaborator."),
        variant: "destructive",
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Not signed in");
      return apiRequest(`/api/wishlists/${wishlistId}/collaborators/${currentUserId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/shared-with-me'] });
      toast({ title: "You left this wishlist" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to leave wishlist."),
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => apiRequest(`/api/invites/${inviteId}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to revoke invite."),
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="collaborators-dialog">
          <DialogHeader>
            <DialogTitle>Collaborators</DialogTitle>
            <DialogDescription>
              {isOwner
                ? `Manage who can access "${wishlistName}".`
                : `People who can access "${wishlistName}".`}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {(data?.collaborators.length ?? 0) === 0 && (
                  <p className="text-sm text-gray-500">No collaborators yet.</p>
                )}
                {data?.collaborators.map((collaborator) => (
                  <div
                    key={collaborator.userId}
                    data-testid={`collaborator-row-${collaborator.userId}`}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {collaborator.displayName || collaborator.email || collaborator.userId}
                      </p>
                      {collaborator.displayName && collaborator.email && (
                        <p className="truncate text-xs text-gray-500">{collaborator.email}</p>
                      )}
                    </div>
                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={collaborator.role}
                          onValueChange={(role) =>
                            updateRoleMutation.mutate({ targetUserId: collaborator.userId, role: role as InvitableRole })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="commenter">Commenter</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-600"
                          aria-label="Remove collaborator"
                          onClick={() => removeMutation.mutate(collaborator.userId)}
                          disabled={removeMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium capitalize text-gray-500">{collaborator.role}</span>
                    )}
                  </div>
                ))}
              </div>

              {isOwner && (data?.pendingInvites.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-400">Pending Invites</p>
                  {data?.pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      data-testid={`pending-invite-row-${invite.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-700">{invite.email}</p>
                        <p className="text-xs capitalize text-gray-400">{invite.role} • awaiting signup</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        aria-label="Revoke invite"
                        onClick={() => revokeInviteMutation.mutate(invite.id)}
                        disabled={revokeInviteMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {isOwner ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsInviteDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Collaborator
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending || !currentUserId}
                >
                  {leaveMutation.isPending ? "Leaving..." : "Leave This Wishlist"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isOwner && (
        <InviteCollaboratorDialog
          wishlistId={wishlistId}
          wishlistName={wishlistName}
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          onInvited={invalidate}
        />
      )}
    </>
  );
}
