export const COLLABORATION_ACTIVITY_NOTIFICATION_TYPES = [
  'item_added',
  'item_reserved',
  'item_purchased',
  'wishlist_shared',
  'collaboration_invite',
  'collaborator_added',
] as const;

export type CollaborationActivityNotificationType =
  (typeof COLLABORATION_ACTIVITY_NOTIFICATION_TYPES)[number];

export type CollaborationActivityEvent = {
  type: CollaborationActivityNotificationType;
  title: string;
  content: string;
  createdAt: unknown;
};

const COLLABORATION_ACTIVITY_NOTIFICATION_TYPE_SET = new Set<string>(
  COLLABORATION_ACTIVITY_NOTIFICATION_TYPES,
);

export function isCollaborationActivityNotificationType(
  value: unknown,
): value is CollaborationActivityNotificationType {
  if (typeof value !== 'string') {
    return false;
  }

  return COLLABORATION_ACTIVITY_NOTIFICATION_TYPE_SET.has(value.toLowerCase());
}

export function toCollaborationActivityEvent(
  notification: Record<string, unknown>,
): CollaborationActivityEvent | null {
  if (!isCollaborationActivityNotificationType(notification.type)) {
    return null;
  }

  return {
    type: notification.type.toLowerCase() as CollaborationActivityNotificationType,
    title: typeof notification.title === 'string' && notification.title.trim().length > 0
      ? notification.title
      : 'Collaboration update',
    content: typeof notification.content === 'string' && notification.content.trim().length > 0
      ? notification.content
      : 'A collaborator activity update is available.',
    createdAt: notification.createdAt,
  };
}