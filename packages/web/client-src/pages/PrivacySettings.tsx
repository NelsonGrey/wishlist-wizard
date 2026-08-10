import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Lock,
  Users,
  Eye,
  UserPlus,
  UserMinus,
  Settings,
  Shield,
  Globe,
  UserCheck,
  AlertTriangle,
  Check,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type PrivacySettings
} from '@/hooks/use-privacy';

interface EntityWithPrivacy {
  id: number;
  name: string;
  type: 'wishlist' | 'item';
  privacySettings?: PrivacySettings;
  ownerId: number;
  isOwner: boolean;
}

interface WishlistResponse {
  id: number;
  name: string;
  userId: number;
}

interface ItemResponse {
  id: number;
  title: string;
  wishlist?: {
    userId: number;
  };
}

const VISIBILITY_OPTIONS = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone with the link can view',
    icon: Globe,
    color: 'text-green-600',
    disabled: false
  },
  {
    value: 'friends',
    label: 'Friends Only',
    description: 'Only people you\'ve connected with can view',
    icon: Users,
    color: 'text-emerald-700',
    disabled: false
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view',
    icon: Lock,
    color: 'text-red-600',
    disabled: false
  },
  {
    value: 'custom',
    label: 'Custom Access',
    description: 'Only specific people you choose',
    icon: UserCheck,
    color: 'text-emerald-800',
    disabled: false
  }
];

const PrivacySettingsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEntity, setSelectedEntity] = useState<EntityWithPrivacy | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedUserSearchQuery, setDebouncedUserSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'wishlist' | 'item'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedUserSearchQuery(userSearchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [userSearchQuery]);

  // GET /api/users/search (searchUsers, packages/functions/src/api/userProfile.ts)
  // — for granting a specific user custom access to a wishlist/item.
  const { data: userSearchResults, isFetching: isSearchingUsers } = useQuery<{
    users: Array<{ id: string; username: string | null; displayName: string | null; photoURL: string | null }>;
  }>({
    queryKey: ['/api/users/search', debouncedUserSearchQuery],
    queryFn: () => apiRequest(`/api/users/search?q=${encodeURIComponent(debouncedUserSearchQuery)}`) as Promise<{
      users: Array<{ id: string; username: string | null; displayName: string | null; photoURL: string | null }>;
    }>,
    enabled: showAddUserDialog && debouncedUserSearchQuery.length >= 2,
  });

  // Fetch user's entities with privacy settings
  const { data: entities, isLoading: entitiesLoading } = useQuery<EntityWithPrivacy[]>({
    queryKey: ['user-entities-privacy'],
    queryFn: async (): Promise<EntityWithPrivacy[]> => {
      const [wishlistsRes, itemsRes] = await Promise.all([
        apiRequest('/api/wishlists') as Promise<WishlistResponse[]>,
        apiRequest('/api/wishlist-items') as Promise<ItemResponse[]>
      ]);

      const entities: EntityWithPrivacy[] = [
        ...wishlistsRes.map((w: WishlistResponse) => ({
          id: w.id,
          name: w.name,
          type: 'wishlist' as const,
          ownerId: w.userId,
          isOwner: true // Assuming current user owns these
        })),
        ...itemsRes.map((i: ItemResponse) => ({
          id: i.id,
          name: i.title,
          type: 'item' as const,
          ownerId: i.wishlist?.userId || 0,
          isOwner: true // Assuming current user owns these
        }))
      ];

      // Fetch privacy settings for each entity
      const entitiesWithPrivacy = await Promise.all(
        entities.map(async (entity) => {
          try {
            const privacyRes = await (apiRequest(
              `/api/privacy/settings/${entity.type}/${entity.id}`
            ) as Promise<PrivacySettings>);
            return { ...entity, privacySettings: privacyRes };
          } catch (error) {
            // No privacy settings exist yet
            return entity;
          }
        })
      );

      return entitiesWithPrivacy;
    }
  });

  // Update privacy settings mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      settings
    }: {
      entityType: string;
      entityId: number;
      settings: Partial<PrivacySettings>
    }) => {
      return apiRequest('/api/privacy/settings', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          ...settings
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entities-privacy'] });
      toast({
        title: "Privacy settings updated",
        description: "Your privacy settings have been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating privacy settings",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Update custom access list mutation
  const updateAccessListMutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      userIds
    }: {
      entityType: string;
      entityId: number;
      userIds: string[]
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}/access-list`, {
        method: 'PUT',
        body: JSON.stringify({ userIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entities-privacy'] });
      toast({
        title: "Access list updated",
        description: "The custom access list has been updated."
      });
    }
  });

  // Delete privacy settings mutation
  const deletePrivacyMutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId
    }: {
      entityType: string;
      entityId: number
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-entities-privacy'] });
      toast({
        title: "Privacy settings reset",
        description: "Privacy settings have been reset to default."
      });
    }
  });

  // Filter entities based on search and type
  const filteredEntities = entities?.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || entity.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  // Handle privacy settings update
  const handlePrivacyUpdate = (entity: EntityWithPrivacy, settings: Partial<PrivacySettings>) => {
    updatePrivacyMutation.mutate({
      entityType: entity.type,
      entityId: entity.id,
      settings
    });
  };

  // Handle access list update
  const handleAccessListUpdate = (entity: EntityWithPrivacy, userIds: string[]) => {
    updateAccessListMutation.mutate({
      entityType: entity.type,
      entityId: entity.id,
      userIds
    });
  };

  // Handle reset to default
  const handleResetToDefault = (entity: EntityWithPrivacy) => {
    deletePrivacyMutation.mutate({
      entityType: entity.type,
      entityId: entity.id
    });
  };

  // Get visibility option by value
  const getVisibilityOption = (value: string) => {
    return VISIBILITY_OPTIONS.find(option => option.value === value);
  };

  if (entitiesLoading) {
    return (
      <div data-testid="privacy-settings-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="privacy-settings-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
      <div className="mb-8">
        <h1 data-testid="privacy-settings-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-2">Privacy Settings</h1>
        <p className="text-muted-foreground">
          Control who can see your wishlists, items, and profile information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Manage Entities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Globe className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {entities?.filter(e => e.privacySettings?.visibilityLevel === 'public').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Public Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-emerald-800" />
                  <div>
                    <p className="text-2xl font-bold">
                      {entities?.filter(e => e.privacySettings?.visibilityLevel === 'friends').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Friends Only</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Lock className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {entities?.filter(e => e.privacySettings?.visibilityLevel === 'private').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Private Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-8 w-8 text-emerald-800" />
                  <div>
                    <p className="text-2xl font-bold">
                      {entities?.filter(e => e.privacySettings?.visibilityLevel === 'custom').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Custom Access</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Quick Actions</CardTitle>
              <CardDescription>Common privacy management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('entities')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Individual Items
                </Button>

                <Button variant="outline" asChild>
                  <Link href="/app/settings?tab=privacy">
                    <Shield className="h-4 w-4 mr-2" />
                    Set Default Privacy
                  </Link>
                </Button>

                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Privacy Audit Log
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                Privacy Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Public wishlists can be found by anyone with the link</li>
                <li>• Friends-only items require users to be connected with you</li>
                <li>• Private items are only visible to you</li>
                <li>• Custom access allows you to specify exactly who can view each item</li>
                <li>• You can set expiration dates for temporary sharing</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Entities Tab */}
        <TabsContent value="entities" className="space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search wishlists and items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={(value: 'all' | 'wishlist' | 'item') => setFilterType(value)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="wishlist">Wishlists</SelectItem>
                    <SelectItem value="item">Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Entities List */}
          <div className="space-y-4">
            {filteredEntities.map((entity) => {
              const visibilityOption = getVisibilityOption(
                entity.privacySettings?.visibilityLevel || 'public'
              );
              const VisibilityIcon = visibilityOption?.icon || Globe;

              return (
                <Card key={`${entity.type}-${entity.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          entity.type === 'wishlist' ? 'bg-emerald-100' : 'bg-green-100'
                        }`}>
                          {entity.type === 'wishlist' ? (
                            <Settings className="h-4 w-4 text-emerald-800" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{entity.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {entity.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <VisibilityIcon className={`h-3 w-3 ${visibilityOption?.color}`} />
                          <span>{visibilityOption?.label}</span>
                        </Badge>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEntity(entity as EntityWithPrivacy)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEntities.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create some wishlists and items to manage their privacy settings'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Entity Privacy Settings Dialog */}
      {selectedEntity && (
        <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy Settings for {selectedEntity.name}</span>
              </DialogTitle>
              <DialogDescription>
                Control who can see and interact with this {selectedEntity.type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Visibility Level */}
              <div>
                <Label className="text-base font-medium">Visibility Level</Label>
                <RadioGroup
                  value={selectedEntity.privacySettings?.visibilityLevel || 'public'}
                  onValueChange={(value) =>
                    handlePrivacyUpdate(selectedEntity, { visibilityLevel: value as 'public' | 'friends' | 'private' | 'custom' })
                  }
                  className="mt-3"
                >
                  {VISIBILITY_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem 
                          value={option.value} 
                          id={`entity-${option.value}`} 
                          disabled={option.disabled}
                        />
                        <Icon className={`h-5 w-5 ${option.color}`} />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`entity-${option.value}`} 
                            className={`font-medium ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {option.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Custom Access List */}
              {selectedEntity.privacySettings?.visibilityLevel === 'custom' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Custom Access List</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddUserDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {selectedEntity.privacySettings.customAccessList?.map((userId) => (
                      <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <span>User {userId}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove custom access user ${userId}`}
                          onClick={() => {
                            const newList = selectedEntity.privacySettings!.customAccessList!.filter(id => id !== userId);
                            handleAccessListUpdate(selectedEntity, newList);
                          }}
                        >
                          <UserMinus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}

                    {(!selectedEntity.privacySettings.customAccessList || selectedEntity.privacySettings.customAccessList.length === 0) && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No users have custom access yet</p>
                        <p className="text-sm">Add specific users to grant them access</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interaction Permissions */}
              <div>
                <Label className="text-base font-medium mb-3 block">Interaction Permissions</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="entity-comments">Allow Comments</Label>
                      <p className="text-sm text-muted-foreground">Let others comment on this {selectedEntity.type}</p>
                    </div>
                    <Switch
                      id="entity-comments"
                      checked={selectedEntity.privacySettings?.allowComments ?? true}
                      onCheckedChange={(checked) =>
                        handlePrivacyUpdate(selectedEntity, { allowComments: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="entity-reservations">Allow Reservations</Label>
                      <p className="text-sm text-muted-foreground">Let others reserve this {selectedEntity.type}</p>
                    </div>
                    <Switch
                      id="entity-reservations"
                      checked={selectedEntity.privacySettings?.allowReservations ?? true}
                      onCheckedChange={(checked) =>
                        handlePrivacyUpdate(selectedEntity, { allowReservations: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="entity-approval">Require Approval</Label>
                      <p className="text-sm text-muted-foreground">Require your approval for interactions</p>
                    </div>
                    <Switch
                      id="entity-approval"
                      checked={selectedEntity.privacySettings?.requireApproval ?? false}
                      onCheckedChange={(checked) =>
                        handlePrivacyUpdate(selectedEntity, { requireApproval: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <Label htmlFor="expiration-date" className="text-base font-medium">
                  Expiration Date (Optional)
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Set when this sharing should automatically expire
                </p>
                <Input
                  id="expiration-date"
                  type="datetime-local"
                  value={selectedEntity.privacySettings?.expirationDate ?
                    new Date(selectedEntity.privacySettings.expirationDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    handlePrivacyUpdate(selectedEntity, {
                      expirationDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => handleResetToDefault(selectedEntity)}
                disabled={deletePrivacyMutation.isPending}
              >
                Reset to Default
              </Button>
              <Button onClick={() => setSelectedEntity(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add User to Access List Dialog */}
      <Dialog
        open={showAddUserDialog}
        onOpenChange={(open) => {
          setShowAddUserDialog(open);
          if (!open) {
            setUserSearchQuery('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Access List</DialogTitle>
            <DialogDescription>
              Grant specific users access to view this {selectedEntity?.type}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="user-search">Search Users</Label>
              <Input
                id="user-search"
                placeholder="Enter a username or name..."
                className="mt-1"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {debouncedUserSearchQuery.length < 2 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </p>
              ) : isSearchingUsers ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Searching...</p>
              ) : (userSearchResults?.users.length ?? 0) === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
              ) : (
                userSearchResults!.users.map((result) => {
                  const alreadyAdded = selectedEntity?.privacySettings?.customAccessList?.includes(result.id);
                  return (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{result.displayName || result.username || 'User'}</p>
                          {result.username && <p className="text-xs text-muted-foreground">@{result.username}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? 'outline' : 'default'}
                        disabled={alreadyAdded || !selectedEntity}
                        onClick={() => {
                          if (!selectedEntity) return;
                          const currentList = selectedEntity.privacySettings?.customAccessList || [];
                          handleAccessListUpdate(selectedEntity, [...currentList, result.id]);
                        }}
                      >
                        {alreadyAdded ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacySettingsPage;
