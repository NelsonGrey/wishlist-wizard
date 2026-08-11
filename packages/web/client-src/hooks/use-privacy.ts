import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Types
export interface PrivacySettings {
  id: string;
  userId: string;
  entityType: 'wishlist' | 'item' | 'user_profile';
  entityId: string;
  visibilityLevel: 'public' | 'friends' | 'private' | 'custom';
  // Firebase user UIDs — the backend (router.ts) always normalizes this
  // list via .map(String)/String(userId) regardless of what's stored, so
  // string is correct here despite the misleading number[] this used to be
  // typed as (a leftover from the pre-Firebase integer-ID schema).
  customAccessList: string[];
  expirationDate?: string;
  allowComments: boolean;
  allowReservations: boolean;
  requireApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyCheckResult {
  hasAccess: boolean;
  requiresApproval: boolean;
  isOwner: boolean;
}

export interface UserDefaultPrivacy {
  defaultWishlistVisibility: string;
  defaultItemVisibility: string;
  allowComments: boolean;
  allowReservations: boolean;
  requireApproval: boolean;
}

// Hook to get privacy settings for an entity
export const usePrivacySettings = (entityType: string, entityId: string) => {
  return useQuery<PrivacySettings | undefined>({
    queryKey: ['privacy-settings', entityType, entityId],
    queryFn: () => apiRequest(`/api/privacy/settings/${entityType}/${entityId}`) as Promise<PrivacySettings>,
    enabled: !!entityType && !!entityId
  });
};

// Hook to update privacy settings
export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: {
      entityType: string;
      entityId: string;
      visibilityLevel?: string;
      customAccessList?: string[];
      expirationDate?: Date;
      allowComments?: boolean;
      allowReservations?: boolean;
      requireApproval?: boolean;
    }) => {
      return apiRequest('/api/privacy/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['privacy-settings', variables.entityType, variables.entityId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-entities-privacy']
      });
    }
  });
};

// Hook to update custom access list
export const useUpdateAccessList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      userIds
    }: {
      entityType: string;
      entityId: string;
      userIds: string[]
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}/access-list`, {
        method: 'PUT',
        body: JSON.stringify({ userIds })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['privacy-settings', variables.entityType, variables.entityId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-entities-privacy']
      });
    }
  });
};

// Hook to add user to access list
export const useAddToAccessList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      userId
    }: {
      entityType: string;
      entityId: string;
      userId: string
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}/access-list/add`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['privacy-settings', variables.entityType, variables.entityId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-entities-privacy']
      });
    }
  });
};

// Hook to remove user from access list
export const useRemoveFromAccessList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      userId
    }: {
      entityType: string;
      entityId: string;
      userId: string
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}/access-list/${userId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['privacy-settings', variables.entityType, variables.entityId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-entities-privacy']
      });
    }
  });
};

// Hook to delete privacy settings (reset to default)
export const useDeletePrivacySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId
    }: {
      entityType: string;
      entityId: string
    }) => {
      return apiRequest(`/api/privacy/settings/${entityType}/${entityId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['privacy-settings', variables.entityType, variables.entityId]
      });
      queryClient.invalidateQueries({
        queryKey: ['user-entities-privacy']
      });
    }
  });
};

// Hook to check access to an entity
export const useCheckPrivacyAccess = () => {
  return useMutation({
    mutationFn: (params: {
      entityType: string;
      entityId: string;
      interactionType?: 'view' | 'comment' | 'reserve';
    }) => {
      return apiRequest('/api/privacy/check-access', {
        method: 'POST',
        body: JSON.stringify(params)
      }) as Promise<PrivacyCheckResult>;
    }
  });
};

// Hook to get user's default privacy settings
export const useDefaultPrivacySettings = () => {
  return useQuery({
    queryKey: ['user-default-privacy'],
    queryFn: () => apiRequest('/api/privacy/defaults') as Promise<UserDefaultPrivacy>
  });
};

// Hook to update user's default privacy settings
export const useUpdateDefaultPrivacySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaults: UserDefaultPrivacy) => {
      return apiRequest('/api/privacy/defaults', {
        method: 'PUT',
        body: JSON.stringify(defaults)
      }) as Promise<UserDefaultPrivacy>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-default-privacy'] });
    }
  });
};

// Hook to get bulk privacy settings for multiple entities
export const useBulkPrivacySettings = (entities: Array<{ entityType: string; entityId: string }>) => {
  return useQuery({
    queryKey: ['bulk-privacy-settings', entities],
    queryFn: async () => {
      const results: Map<string, PrivacySettings> = new Map();

      // Fetch privacy settings for each entity
      await Promise.all(
        entities.map(async (entity) => {
          try {
            const settings = await apiRequest(
              `/api/privacy/settings/${entity.entityType}/${entity.entityId}`
            ) as PrivacySettings;
            const key = `${entity.entityType}:${entity.entityId}`;
            results.set(key, settings);
          } catch (error) {
            // Entity doesn't have privacy settings
          }
        })
      );

      return results;
    },
    enabled: entities.length > 0
  });
};