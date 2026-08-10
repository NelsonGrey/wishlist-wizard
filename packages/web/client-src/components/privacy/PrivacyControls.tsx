import { useState } from 'react';
import { Shield, Globe, Users, Lock, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  usePrivacySettings,
  useUpdatePrivacySettings,
  useUpdateAccessList,
  useDeletePrivacySettings,
  type PrivacySettings
} from '@/hooks/use-privacy';

interface PrivacyControlsProps {
  entityType: 'wishlist' | 'item';
  entityId: number;
  entityName: string;
  showAsBadge?: boolean; // If true, shows as a badge with icon, otherwise as a button
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, color: 'text-green-600', disabled: false },
  { value: 'friends', label: 'Friends Only', icon: Users, color: 'text-emerald-700', disabled: false },
  { value: 'private', label: 'Private', icon: Lock, color: 'text-red-600', disabled: false },
  { value: 'custom', label: 'Custom Access', icon: UserCheck, color: 'text-emerald-800', disabled: false }
];

export default function PrivacyControls({
  entityType,
  entityId,
  entityName,
  showAsBadge = false
}: PrivacyControlsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch current privacy settings
  const { data: privacySettings } = usePrivacySettings(entityType, entityId);

  // Mutations
  const updatePrivacyMutation = useUpdatePrivacySettings();
  const updateAccessListMutation = useUpdateAccessList();
  const deletePrivacyMutation = useDeletePrivacySettings();

  const handlePrivacyUpdate = (updates: Partial<PrivacySettings>) => {
    updatePrivacyMutation.mutate({
      entityType,
      entityId,
      visibilityLevel: updates.visibilityLevel,
      customAccessList: updates.customAccessList,
      expirationDate: updates.expirationDate ? new Date(updates.expirationDate) : undefined,
      allowComments: updates.allowComments,
      allowReservations: updates.allowReservations,
      requireApproval: updates.requireApproval
    }, {
      onSuccess: () => {
        toast({
          title: "Privacy settings updated",
          description: `Privacy settings for ${entityName} have been saved.`
        });
      },
      onError: (error) => {
        toast({
          title: "Error updating privacy",
          description: error instanceof Error ? error.message : "Failed to update privacy settings",
          variant: "destructive"
        });
      }
    });
  };

  const handleAccessListUpdate = (userIds: string[]) => {
    updateAccessListMutation.mutate({
      entityType,
      entityId,
      userIds
    }, {
      onSuccess: () => {
        toast({
          title: "Access list updated",
          description: "The custom access list has been updated."
        });
      },
      onError: (error) => {
        toast({
          title: "Error updating access list",
          description: error instanceof Error ? error.message : "Failed to update access list",
          variant: "destructive"
        });
      }
    });
  };

  const handleResetToDefault = () => {
    deletePrivacyMutation.mutate({
      entityType,
      entityId
    }, {
      onSuccess: () => {
        toast({
          title: "Privacy settings reset",
          description: `Privacy settings for ${entityName} have been reset to default.`
        });
        setIsDialogOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Error resetting privacy",
          description: error instanceof Error ? error.message : "Failed to reset privacy settings",
          variant: "destructive"
        });
      }
    });
  };

  const getVisibilityOption = (value: string) => {
    return VISIBILITY_OPTIONS.find(option => option.value === value);
  };

  const currentVisibility = privacySettings?.visibilityLevel || 'public';
  const visibilityOption = getVisibilityOption(currentVisibility);
  const VisibilityIcon = visibilityOption?.icon || Globe;

  if (showAsBadge) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-muted/50 flex items-center space-x-1"
          >
            <VisibilityIcon className={`h-3 w-3 ${visibilityOption?.color}`} />
            <span className="text-xs">{visibilityOption?.label}</span>
          </Badge>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy Settings</span>
            </DialogTitle>
            <DialogDescription>
              Control who can see and interact with {entityName}
            </DialogDescription>
          </DialogHeader>

          <PrivacySettingsForm
            privacySettings={privacySettings}
            entityType={entityType}
            entityName={entityName}
            onUpdate={handlePrivacyUpdate}
            onAccessListUpdate={handleAccessListUpdate}
            onReset={handleResetToDefault}
            onClose={() => setIsDialogOpen(false)}
            isLoading={updatePrivacyMutation.isPending || updateAccessListMutation.isPending || deletePrivacyMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center space-x-1">
          <Shield className="h-4 w-4" />
          <span>Privacy</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Privacy Settings</span>
          </DialogTitle>
          <DialogDescription>
            Control who can see and interact with {entityName}
          </DialogDescription>
        </DialogHeader>

        <PrivacySettingsForm
          privacySettings={privacySettings}
          entityType={entityType}
          entityName={entityName}
          onUpdate={handlePrivacyUpdate}
          onAccessListUpdate={handleAccessListUpdate}
          onReset={handleResetToDefault}
          onClose={() => setIsDialogOpen(false)}
          isLoading={updatePrivacyMutation.isPending || updateAccessListMutation.isPending || deletePrivacyMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

interface PrivacySettingsFormProps {
  privacySettings?: PrivacySettings;
  entityType: string;
  entityName: string;
  onUpdate: (updates: Partial<PrivacySettings>) => void;
  onAccessListUpdate: (userIds: string[]) => void;
  onReset: () => void;
  onClose: () => void;
  isLoading: boolean;
}

function PrivacySettingsForm({
  privacySettings,
  onUpdate,
  onAccessListUpdate,
  onReset,
  onClose,
  isLoading
}: PrivacySettingsFormProps) {
  const [customAccessList, setCustomAccessList] = useState<string[]>(
    privacySettings?.customAccessList || []
  );

  const handleVisibilityChange = (value: string) => {
    onUpdate({ visibilityLevel: value as 'public' | 'friends' | 'private' | 'custom' });
  };

  const handlePermissionChange = (key: keyof PrivacySettings, value: boolean) => {
    onUpdate({ [key]: value });
  };

  const handleExpirationChange = (date: string) => {
    onUpdate({ expirationDate: date || undefined });
  };

  const handleAddUser = (userId: string) => {
    const newList = [...customAccessList, userId];
    setCustomAccessList(newList);
    onAccessListUpdate(newList);
  };

  const handleRemoveUser = (userId: string) => {
    const newList = customAccessList.filter(id => id !== userId);
    setCustomAccessList(newList);
    onAccessListUpdate(newList);
  };

  return (
    <div className="space-y-6">
      {/* Visibility Level */}
      <div>
        <Label className="text-base font-medium">Visibility Level</Label>
        <Select
          value={privacySettings?.visibilityLevel || 'public'}
          onValueChange={handleVisibilityChange}
          disabled={isLoading}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${option.color}`} />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Access List */}
      {privacySettings?.visibilityLevel === 'custom' && (
        <div>
          <Label className="text-base font-medium mb-2 block">Custom Access List</Label>
          <div className="space-y-2">
            {customAccessList.map((userId) => (
              <div key={userId} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">User {userId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveUser(userId)}
                  disabled={isLoading}
                >
                  Remove
                </Button>
              </div>
            ))}
            {customAccessList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users have custom access yet
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Direct user lookup for custom access is not available yet.
          </p>
        </div>
      )}

      {/* Interaction Permissions */}
      <div>
        <Label className="text-base font-medium mb-3 block">Interaction Permissions</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-comments" className="text-sm">Allow Comments</Label>
            <Switch
              id="allow-comments"
              checked={privacySettings?.allowComments ?? true}
              onCheckedChange={(checked) => handlePermissionChange('allowComments', checked)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-reservations" className="text-sm">Allow Reservations</Label>
            <Switch
              id="allow-reservations"
              checked={privacySettings?.allowReservations ?? true}
              onCheckedChange={(checked) => handlePermissionChange('allowReservations', checked)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="require-approval" className="text-sm">Require Approval</Label>
            <Switch
              id="require-approval"
              checked={privacySettings?.requireApproval ?? false}
              onCheckedChange={(checked) => handlePermissionChange('requireApproval', checked)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Expiration Date */}
      <div>
        <Label htmlFor="expiration-date" className="text-base font-medium">
          Expiration Date (Optional)
        </Label>
        <Input
          id="expiration-date"
          type="datetime-local"
          value={privacySettings?.expirationDate ?
            new Date(privacySettings.expirationDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleExpirationChange(e.target.value)}
          className="mt-2"
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onReset}
          disabled={isLoading}
        >
          Reset to Default
        </Button>
        <Button onClick={onClose} disabled={isLoading}>
          Close
        </Button>
      </div>
    </div>
  );
}
