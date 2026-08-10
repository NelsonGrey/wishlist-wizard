import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-errors";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserSearchResult {
  id: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type InvitableRole = "editor" | "commenter" | "viewer";

const ROLE_DESCRIPTIONS: Record<InvitableRole, string> = {
  editor: "Can add, edit, and remove items",
  commenter: "Can view and reserve/purchase items",
  viewer: "Can only view the wishlist",
};

interface InviteCollaboratorDialogProps {
  wishlistId: string | number;
  wishlistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

export default function InviteCollaboratorDialog({
  wishlistId,
  wishlistName,
  open,
  onOpenChange,
  onInvited,
}: InviteCollaboratorDialogProps) {
  const [mode, setMode] = useState<"email" | "search">("email");
  const [email, setEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [role, setRole] = useState<InvitableRole>("editor");
  const { toast } = useToast();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["/api/users/search", debouncedSearchQuery],
    queryFn: () =>
      apiRequest(`/api/users/search?q=${encodeURIComponent(debouncedSearchQuery)}`) as Promise<{
        users: UserSearchResult[];
      }>,
    enabled: mode === "search" && open && debouncedSearchQuery.length >= 2,
  });

  const inviteMutation = useMutation({
    mutationFn: async (variables: { email?: string; targetUserId?: string; label: string }) => {
      const result = (await apiRequest(`/api/wishlists/${wishlistId}/collaborators/invite`, {
        method: "POST",
        body: variables.targetUserId
          ? { targetUserId: variables.targetUserId, role }
          : { email: variables.email, role },
      })) as { status: "active" | "pending" };
      return { ...result, label: variables.label };
    },
    onSuccess: (result) => {
      setEmail("");
      setSearchQuery("");
      setRole("editor");
      onOpenChange(false);
      onInvited?.();
      toast({
        title: "Invitation sent",
        description:
          result.status === "active"
            ? `${result.label} now has access to "${wishlistName}".`
            : `${result.label} will get access to "${wishlistName}" once they sign up.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to invite collaborator."),
        variant: "destructive",
      });
    },
  });

  const inviteByEmail = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast({ title: "Error", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    inviteMutation.mutate({ email: normalizedEmail, label: normalizedEmail });
  };

  const inviteByUserId = (result: UserSearchResult) => {
    inviteMutation.mutate({
      targetUserId: result.id,
      label: result.displayName || (result.username ? `@${result.username}` : "This user"),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!inviteMutation.isPending) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent data-testid="invite-collaborator-dialog">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on &quot;{wishlistName}&quot; by email, or search for them by name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Tabs value={mode} onValueChange={(value) => setMode(value as "email" | "search")}>
            <TabsList className="w-full">
              <TabsTrigger value="email" className="flex-1" data-testid="invite-collaborator-mode-email">
                By Email
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1" data-testid="invite-collaborator-mode-search">
                Search by Name
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "email" ? (
            <div className="space-y-1.5">
              <Label htmlFor="invite-collaborator-email">Email</Label>
              <Input
                id="invite-collaborator-email"
                data-testid="invite-collaborator-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={inviteMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                If they don&apos;t have an account yet, they&apos;ll get access automatically when they sign up.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="invite-collaborator-search">Search by username or name</Label>
              <Input
                id="invite-collaborator-search"
                data-testid="invite-collaborator-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type at least 2 characters..."
                disabled={inviteMutation.isPending}
              />
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {debouncedSearchQuery.length < 2 ? null : isSearching ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">Searching...</p>
                ) : (searchResults?.users.length ?? 0) === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">No users found.</p>
                ) : (
                  searchResults!.users.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between rounded-md border p-2"
                      data-testid={`invite-collaborator-search-result-${result.id}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{result.displayName || result.username || "User"}</p>
                        {result.username && <p className="truncate text-xs text-muted-foreground">@{result.username}</p>}
                      </div>
                      <Button size="sm" disabled={inviteMutation.isPending} onClick={() => inviteByUserId(result)}>
                        Invite
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="invite-collaborator-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as InvitableRole)} disabled={inviteMutation.isPending}>
              <SelectTrigger id="invite-collaborator-role" data-testid="invite-collaborator-role-select">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_DESCRIPTIONS) as InvitableRole[]).map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)} — {ROLE_DESCRIPTIONS[roleOption]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={inviteMutation.isPending}
          >
            Cancel
          </Button>
          {mode === "email" && (
            <Button
              data-testid="invite-collaborator-submit"
              onClick={inviteByEmail}
              disabled={inviteMutation.isPending || !email.trim()}
            >
              {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
