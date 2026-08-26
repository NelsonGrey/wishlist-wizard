import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/notifications_screen.dart';

class MockAuthProvider extends Mock implements AuthProvider {}

class MockFirebaseWishlistProvider extends Mock implements FirebaseWishlistProvider {}

final _testUser = User(
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: DateTime(2026, 1, 1),
);

FirebaseNotification _buildNotification({
  required String id,
  bool isRead = false,
  String title = 'Price drop',
  String message = 'An item on your wishlist dropped in price.',
}) {
  return FirebaseNotification(
    id: id,
    userId: 'user-1',
    title: title,
    message: message,
    type: NotificationType.priceDrop,
    isRead: isRead,
    createdAt: DateTime(2026, 1, 1),
  );
}

Widget wrapScreen(AuthProvider authProvider, FirebaseWishlistProvider wishlistProvider) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
      ChangeNotifierProvider<FirebaseWishlistProvider>.value(value: wishlistProvider),
    ],
    child: const MaterialApp(home: NotificationsScreen()),
  );
}

void main() {
  late MockAuthProvider authProvider;
  late MockFirebaseWishlistProvider wishlistProvider;

  setUp(() {
    authProvider = MockAuthProvider();
    wishlistProvider = MockFirebaseWishlistProvider();
    when(() => authProvider.user).thenReturn(_testUser);
  });

  testWidgets('shows empty state when there are no notifications', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1'))
        .thenAnswer((_) => Stream.value(<FirebaseNotification>[]));

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    expect(find.text('No notifications yet'), findsOneWidget);
  });

  testWidgets('renders notifications and filter counts', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1')).thenAnswer(
      (_) => Stream.value([
        _buildNotification(id: 'n1', isRead: false, title: 'Unread one'),
        _buildNotification(id: 'n2', isRead: true, title: 'Read one'),
      ]),
    );

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    expect(find.text('Unread one'), findsOneWidget);
    expect(find.text('Read one'), findsOneWidget);
    // All / Unread / Read counts.
    expect(find.text('2'), findsOneWidget);
    expect(find.text('1'), findsNWidgets(2));
  });

  testWidgets('filtering to Unread hides read notifications', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1')).thenAnswer(
      (_) => Stream.value([
        _buildNotification(id: 'n1', isRead: false, title: 'Unread one'),
        _buildNotification(id: 'n2', isRead: true, title: 'Read one'),
      ]),
    );

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Unread'));
    await tester.pumpAndSettle();

    expect(find.text('Unread one'), findsOneWidget);
    expect(find.text('Read one'), findsNothing);
  });

  testWidgets('mark all as read calls the provider and only shows when unread exist', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1')).thenAnswer(
      (_) => Stream.value([_buildNotification(id: 'n1', isRead: false)]),
    );
    when(() => wishlistProvider.markAllNotificationsAsRead('user-1'))
        .thenAnswer((_) async => true);

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    expect(find.text('Mark all as read'), findsOneWidget);
    await tester.tap(find.text('Mark all as read'));
    await tester.pumpAndSettle();

    verify(() => wishlistProvider.markAllNotificationsAsRead('user-1')).called(1);
  });

  testWidgets('no mark-all-read button when everything is already read', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1')).thenAnswer(
      (_) => Stream.value([_buildNotification(id: 'n1', isRead: true)]),
    );

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    expect(find.text('Mark all as read'), findsNothing);
  });

  testWidgets('deleting a notification calls the provider', (tester) async {
    when(() => wishlistProvider.getNotificationsStream('user-1')).thenAnswer(
      (_) => Stream.value([_buildNotification(id: 'n1')]),
    );
    when(() => wishlistProvider.deleteNotification('n1')).thenAnswer((_) async => true);

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.delete_outline));
    await tester.pumpAndSettle();

    verify(() => wishlistProvider.deleteNotification('n1')).called(1);
  });

  testWidgets('prompts login when there is no signed-in user', (tester) async {
    when(() => authProvider.user).thenReturn(null);

    await tester.pumpWidget(wrapScreen(authProvider, wishlistProvider));
    await tester.pumpAndSettle();

    expect(find.text('Please log in to view notifications'), findsOneWidget);
  });
}
