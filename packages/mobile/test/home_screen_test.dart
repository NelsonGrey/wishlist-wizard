import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/home_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockFirebaseFirestoreService extends Mock implements FirebaseFirestoreService {}

class MockFirebaseFunctionsService extends Mock implements FirebaseFunctionsService {}

final _signedInUser = User(id: 'u1', email: 'mark@example.com', name: 'Mark', createdAt: DateTime(2026));

FirebaseWishlist _wishlist(String id, {bool isPublic = false}) => FirebaseWishlist(
      id: id,
      name: 'Wishlist $id',
      userId: 'u1',
      isPublic: isPublic,
      tags: const [],
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );

Widget wrapScreen({
  required FirebaseAuthService authService,
  required FirebaseFirestoreService firestoreService,
  required FirebaseFunctionsService functionsService,
}) {
  // MultiProvider must wrap MaterialApp, not sit inside `home:` -- routes
  // pushed via Navigator.push render into the Navigator's Overlay, which is
  // a sibling of `home`, not a descendant of a MultiProvider placed inside
  // it. Providers placed inside `home:` are invisible to any pushed screen.
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>(
        create: (_) => AuthProvider(authService: authService, functionsService: functionsService),
      ),
      ChangeNotifierProvider<FirebaseWishlistProvider>(
        create: (_) => FirebaseWishlistProvider(firestoreService: firestoreService, functionsService: functionsService),
      ),
      ChangeNotifierProvider<SubscriptionProvider>(
        create: (_) => SubscriptionProvider(functionsService: functionsService),
      ),
    ],
    child: const MaterialApp(
      home: HomeScreen(),
    ),
  );
}

void main() {
  late MockFirebaseAuthService authService;
  late MockFirebaseFirestoreService firestoreService;
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    authService = MockFirebaseAuthService();
    firestoreService = MockFirebaseFirestoreService();
    functionsService = MockFirebaseFunctionsService();

    when(() => authService.authStateChanges).thenAnswer((_) => Stream<User?>.value(_signedInUser));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => _signedInUser);
    // SubscriptionProvider.loadSubscriptionData() is never triggered by
    // HomeScreen itself, but stub it anyway since its tier getter (default
    // 'free') gates the banner ad section that always renders.
    when(() => functionsService.billingStatus()).thenAnswer((_) async => {});
    when(() => functionsService.billingPlans()).thenAnswer((_) async => {});
    // Stubbed for real, not just to avoid a crash: the Notifications icon
    // pushes NotificationsScreen, which reads this stream directly.
    when(() => firestoreService.getUserNotificationsStream(any())).thenAnswer((_) => const Stream.empty());
    // AuthProvider calls this fire-and-forget on every sign-in; leaving it
    // unstubbed means it falls through to the real singleton's network
    // call, which leaves a pending timer after the widget tree is
    // disposed and fails the test framework's invariant checks (see the
    // constructor comment on AuthProvider itself).
    when(() => functionsService.ensureProfile()).thenAnswer((_) async {});
  });

  Future<void> pumpHome(WidgetTester tester) async {
    await tester.pumpWidget(wrapScreen(
      authService: authService,
      firestoreService: firestoreService,
      functionsService: functionsService,
    ));
    await tester.pumpAndSettle();
  }

  // HomeScreen's content (welcome banner, quick stats, recent wishlists,
  // quick actions) extends below the default test viewport's fold --
  // SingleChildScrollView only lets find()/tap() reach content that's
  // actually scrolled into view, same as a real user on a real device.
  Future<void> scrollTo(WidgetTester tester, Finder finder) {
    // .first: the nested ListView.builder for recent wishlists is itself
    // technically a second Scrollable (even with NeverScrollableScrollPhysics),
    // so the bare type finder matches more than one -- the outer
    // SingleChildScrollView is the one that actually needs scrolling.
    return tester.scrollUntilVisible(finder, 200, scrollable: find.byType(Scrollable).first);
  }

  testWidgets('shows a welcome message with the signed-in user\'s name', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
    await pumpHome(tester);

    expect(find.text('Mark'), findsOneWidget);
  });

  testWidgets('derives a first name from the email when the user has no name', (tester) async {
    final noNameUser = User(id: 'u1', email: 'mark@example.com', createdAt: DateTime(2026));
    when(() => authService.authStateChanges).thenAnswer((_) => Stream<User?>.value(noNameUser));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => noNameUser);
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);

    await pumpHome(tester);

    // The greeting shows the email local-part, title-cased -- not the raw address.
    expect(find.text('Welcome back,'), findsOneWidget);
    expect(find.text('Mark'), findsOneWidget);
    expect(find.text('mark@example.com'), findsNothing);
  });

  testWidgets('shows the empty state when there are no wishlists', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
    await pumpHome(tester);

    expect(find.text('No wishlists yet'), findsOneWidget);
    expect(find.text('0'), findsWidgets); // both quick-stat counts
  });

  testWidgets('shows a wishlist load error', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => throw Exception('network down'));
    await pumpHome(tester);
    await scrollTo(tester, find.textContaining('Failed to load wishlists'));

    expect(find.textContaining('Failed to load wishlists'), findsOneWidget);
  });

  testWidgets('shows quick stats and up to 3 recent wishlists, capping a longer list', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer(
      (_) async => [
        _wishlist('1', isPublic: true),
        _wishlist('2'),
        _wishlist('3'),
        _wishlist('4'),
      ],
    );
    await pumpHome(tester);

    expect(find.text('4'), findsOneWidget); // total wishlists stat
    expect(find.text('1'), findsOneWidget); // shared (public) stat
    await scrollTo(tester, find.text('Wishlist 3'));
    expect(find.text('Wishlist 1'), findsOneWidget);
    expect(find.text('Wishlist 2'), findsOneWidget);
    expect(find.text('Wishlist 3'), findsOneWidget);
    expect(find.text('Wishlist 4'), findsNothing); // capped at 3
  });

  testWidgets('tapping a recent wishlist navigates to its items screen', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => [_wishlist('1')]);
    when(() => firestoreService.getWishlistItemsStream('1')).thenAnswer((_) => const Stream.empty());
    await pumpHome(tester);
    await scrollTo(tester, find.text('Wishlist 1'));

    await tester.tap(find.text('Wishlist 1'));
    await tester.pumpAndSettle();

    expect(find.text('Wishlist 1'), findsOneWidget); // now the items screen's AppBar title
    expect(find.text('No wishlists yet'), findsNothing); // home screen is gone
  });

  testWidgets('Notifications icon navigates to the notifications screen', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
    await pumpHome(tester);

    await tester.tap(find.byTooltip('Notifications'));
    await tester.pumpAndSettle();

    expect(find.text('Notifications'), findsWidgets); // AppBar title on the pushed screen
  });

  testWidgets('Browse quick action navigates to the Browse Products screen', (tester) async {
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
    await pumpHome(tester);
    await scrollTo(tester, find.text('Browse'));

    await tester.tap(find.text('Browse'));
    await tester.pumpAndSettle();

    expect(find.text('Browse Products'), findsOneWidget);
    expect(find.text('Browse Products Screen'), findsOneWidget);
  });

  group('Create Wishlist dialog', () {
    setUp(() {
      when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
    });

    testWidgets('opens from the FAB and Cancel closes it', (tester) async {
      await pumpHome(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      expect(find.text('Create New Wishlist'), findsOneWidget);

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(find.text('Create New Wishlist'), findsNothing);
    });

    testWidgets('does nothing when Create is tapped with an empty name', (tester) async {
      await pumpHome(tester);
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle();

      expect(find.text('Create New Wishlist'), findsOneWidget); // dialog still open
      verifyNever(() => functionsService.createWishlist(any()));
    });

    testWidgets('creates the wishlist and shows a success snackbar', (tester) async {
      when(() => functionsService.createWishlist(any())).thenAnswer((_) async => {'id': 'new1'});
      await pumpHome(tester);
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), 'Birthday List');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle();

      expect(find.text('Create New Wishlist'), findsNothing);
      expect(find.text('Wishlist created!'), findsOneWidget);
      verify(() => functionsService.createWishlist(
            any(that: containsPair('name', 'Birthday List')),
          )).called(1);
    });
  });
}
