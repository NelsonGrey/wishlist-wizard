import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/fcm_service.dart';

void main() {
  // This file deliberately never constructs FCMManager(). Unlike
  // FirebaseAuthService/FirebaseFirestoreService (which guard real Firebase
  // SDK access behind an initialize-and-catch pattern), FCMManager's
  // `_firebaseMessaging = FirebaseMessaging.instance` runs as a field
  // initializer with no try/catch -- and FirebaseMessaging.instance calls
  // Firebase.app() internally, which throws synchronously ('no-app') when
  // no default app was ever initialized. So merely constructing FCMManager()
  // once in a `flutter test` process (no live Firebase) would throw and
  // take the whole file down. What's covered instead: FCMNotificationData
  // and FCMNotificationPreferences, both plain data classes with real,
  // pure logic that never touches FirebaseMessaging.instance -- and
  // RemoteMessage itself is a plain const-constructible class from
  // firebase_messaging_platform_interface, safe to build directly.
  group('FCMNotificationData.fromRemoteMessage', () {
    test('maps every known type string to its enum value', () {
      const cases = {
        'item_added': FCMNotificationType.itemAdded,
        'item_reserved': FCMNotificationType.itemReserved,
        'item_purchased': FCMNotificationType.itemPurchased,
        'price_alert': FCMNotificationType.priceAlert,
        'collaboration_invite': FCMNotificationType.collaborationInvite,
        'system_update': FCMNotificationType.systemUpdate,
      };

      for (final entry in cases.entries) {
        final message = RemoteMessage(data: {'type': entry.key});
        expect(FCMNotificationData.fromRemoteMessage(message).type, entry.value);
      }
    });

    test('falls back to systemUpdate for an unknown or missing type', () {
      final unknown = RemoteMessage(data: {'type': 'something-else'});
      final missing = RemoteMessage(data: const {});
      expect(FCMNotificationData.fromRemoteMessage(unknown).type, FCMNotificationType.systemUpdate);
      expect(FCMNotificationData.fromRemoteMessage(missing).type, FCMNotificationType.systemUpdate);
    });

    test('extracts the title/body from the RemoteMessage notification', () {
      final message = RemoteMessage(
        notification: const RemoteNotification(title: 'Price dropped!', body: 'Your item is now \$19.99'),
      );

      final data = FCMNotificationData.fromRemoteMessage(message);

      expect(data.title, 'Price dropped!');
      expect(data.body, 'Your item is now \$19.99');
    });

    test('falls back to default title/body when there is no notification payload', () {
      final message = RemoteMessage(data: const {});

      final data = FCMNotificationData.fromRemoteMessage(message);

      expect(data.title, 'Wishlist Wizard');
      expect(data.body, 'You have a new notification');
    });

    test('uses the message ID when present', () {
      final message = RemoteMessage(messageId: 'msg-123', data: const {});
      expect(FCMNotificationData.fromRemoteMessage(message).id, 'msg-123');
    });

    test('generates a fallback id when there is no message ID', () {
      final message = RemoteMessage(data: const {});
      expect(FCMNotificationData.fromRemoteMessage(message).id, isNotEmpty);
    });

    test('carries through the raw data payload', () {
      final message = RemoteMessage(data: {'type': 'price_alert', 'itemId': 'i1'});
      expect(FCMNotificationData.fromRemoteMessage(message).data, {'type': 'price_alert', 'itemId': 'i1'});
    });
  });

  group('FCMNotificationPreferences.defaultPreferences', () {
    test('enables every type except systemUpdate', () {
      final prefs = FCMNotificationPreferences.defaultPreferences();

      expect(prefs.enabled, isTrue);
      expect(prefs.types[FCMNotificationType.itemAdded], isTrue);
      expect(prefs.types[FCMNotificationType.priceAlert], isTrue);
      expect(prefs.types[FCMNotificationType.systemUpdate], isFalse);
      expect(prefs.sound, isTrue);
      expect(prefs.vibration, isTrue);
      expect(prefs.badge, isTrue);
      expect(prefs.quietHours, {'start': '22:00', 'end': '08:00'});
    });
  });

  group('FCMNotificationPreferences JSON round-trip', () {
    test('toJson/fromJson round-trips every field', () {
      final original = FCMNotificationPreferences(
        enabled: false,
        types: {
          FCMNotificationType.itemAdded: false,
          FCMNotificationType.priceAlert: true,
        },
        sound: false,
        vibration: true,
        badge: false,
        quietHours: {'start': '21:00', 'end': '07:00'},
        updatedAt: DateTime.utc(2026, 8, 27),
      );

      final restored = FCMNotificationPreferences.fromJson(original.toJson());

      expect(restored.enabled, false);
      expect(restored.types[FCMNotificationType.itemAdded], false);
      expect(restored.types[FCMNotificationType.priceAlert], true);
      expect(restored.sound, false);
      expect(restored.vibration, true);
      expect(restored.badge, false);
      expect(restored.quietHours, {'start': '21:00', 'end': '07:00'});
      expect(restored.updatedAt, DateTime.utc(2026, 8, 27));
    });

    test('fromJson fills in sensible defaults for missing fields', () {
      final restored = FCMNotificationPreferences.fromJson(const {});

      expect(restored.enabled, isTrue);
      expect(restored.types, isEmpty);
      expect(restored.sound, isTrue);
      expect(restored.vibration, isTrue);
      expect(restored.badge, isTrue);
      expect(restored.quietHours, {'start': '22:00', 'end': '08:00'});
    });
  });
}
