import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:share_plus_platform_interface/share_plus_platform_interface.dart';
import 'package:url_launcher_platform_interface/link.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/firebase_wishlists_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockFirebaseFirestoreService extends Mock implements FirebaseFirestoreService {}

class MockFirebaseFunctionsService extends Mock implements FirebaseFunctionsService {}

class _FakeSharePlatform extends SharePlatform {
  ShareParams? lastParams;

  @override
  Future<ShareResult> share(ShareParams params) async {
    lastParams = params;
    return ShareResult('', ShareResultStatus.success);
  }
}

class _FakeUrlLauncher extends UrlLauncherPlatform {
  final List<String> launchedUrls = [];

  @override
  LinkDelegate? get linkDelegate => null;

  @override
  Future<bool> canLaunch(String url) async => true;

  @override
  Future<bool> launch(
    String url, {
    required bool useSafariVC,
    required bool useWebView,
    required bool enableJavaScript,
    required bool enableDomStorage,
    required bool universalLinksOnly,
    required Map<String, String> headers,
    String? webOnlyWindowName,
  }) async {
    launchedUrls.add(url);
    return true;
  }

  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async {
    launchedUrls.add(url);
    return true;
  }
}

final _signedInUser = User(id: 'u1', email: 'mark@example.com', name: 'Mark', createdAt: DateTime(2026));

FirebaseWishlist _wishlist(String id, {bool isPublic = false, CollaboratorRole myRole = CollaboratorRole.owner, String? shareId}) =>
    FirebaseWishlist(
      id: id,
      name: 'Wishlist $id',
      userId: 'u1',
      isPublic: isPublic,
      myRole: myRole,
      shareId: shareId,
      tags: const [],
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );

FirebaseWishlistItem _item(
  String id, {
  bool isPurchased = false,
  String? reservedBy,
  double? price,
}) => FirebaseWishlistItem(
      id: id,
      name: 'Item $id',
      price: price,
      wishlistId: 'w1',
      userId: 'u1',
      isPurchased: isPurchased,
      reservedBy: reservedBy,
      priority: Priority.medium,
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );

void main() {
  late MockFirebaseAuthService authService;
  late MockFirebaseFirestoreService firestoreService;
  late MockFirebaseFunctionsService functionsService;
  late _FakeSharePlatform fakeShare;
  late _FakeUrlLauncher fakeLauncher;

  // Share.share() (used by _shareWishlist) routes through the package-level
  // SharePlus.instance, a static final that only reads SharePlatform.instance
  // once -- install one fake up front and reset it between tests instead of
  // recreating it (see social_share_service_test.dart for the same
  // constraint, discovered there first).
  fakeShare = _FakeSharePlatform();
  SharePlatform.instance = fakeShare;

  setUp(() {
    authService = MockFirebaseAuthService();
    firestoreService = MockFirebaseFirestoreService();
    functionsService = MockFirebaseFunctionsService();
    fakeShare.lastParams = null;
    fakeLauncher = _FakeUrlLauncher();
    UrlLauncherPlatform.instance = fakeLauncher;

    when(() => authService.authStateChanges).thenAnswer((_) => Stream<User?>.value(_signedInUser));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => _signedInUser);
    when(() => functionsService.ensureProfile()).thenAnswer((_) async {});
    when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
  });

  Widget wrapScreen(Widget child) {
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
      child: MaterialApp(home: child),
    );
  }

  group('FirebaseWishlistsScreen', () {
    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(wrapScreen(const FirebaseWishlistsScreen()));
      await tester.pumpAndSettle();
    }

    testWidgets('shows the empty state on My Wishlists', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
      await pumpScreen(tester);

      expect(find.text('No wishlists yet'), findsOneWidget);
    });

    testWidgets('shows an error state with a Retry button that reloads', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
      when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => throw Exception('offline'));
      await pumpScreen(tester);

      expect(find.textContaining('Failed to load wishlists'), findsOneWidget);

      when(() => firestoreService.getUserWishlists('u1')).thenAnswer((_) async => []);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Retry'));
      await tester.pumpAndSettle();

      expect(find.text('No wishlists yet'), findsOneWidget);
    });

    testWidgets('lists wishlists from the real-time stream', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([_wishlist('1'), _wishlist('2')]));
      await pumpScreen(tester);

      expect(find.text('Wishlist 1'), findsOneWidget);
      expect(find.text('Wishlist 2'), findsOneWidget);
      expect(find.text('Real-time Firebase sync active'), findsOneWidget);
    });

    testWidgets('tapping a wishlist navigates to its items screen', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([_wishlist('1')]));
      when(() => firestoreService.getWishlistItemsStream('1')).thenAnswer((_) => const Stream.empty());
      await pumpScreen(tester);

      await tester.tap(find.text('Wishlist 1'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(AppBar, 'Wishlist 1'), findsOneWidget);
    });

    testWidgets('creates a wishlist via the FAB dialog', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
      when(() => functionsService.createWishlist(any())).thenAnswer((_) async => {'id': 'new1'});
      await pumpScreen(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), 'Birthday');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle();

      // Not `find.text('Create Wishlist')` -- the empty-state's own CTA
      // button is labeled "Create Wishlist" too and stays in the tree
      // underneath, so that text alone doesn't distinguish "dialog closed"
      // from "dialog still open".
      expect(find.byType(AlertDialog), findsNothing);
      verify(() => functionsService.createWishlist(any(that: containsPair('name', 'Birthday')))).called(1);
    });

    testWidgets('shows an error snackbar when creation fails', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
      when(() => functionsService.createWishlist(any())).thenThrow(Exception('quota exceeded'));
      await pumpScreen(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), 'Birthday');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle();

      // findsWidgets, not findsOneWidget: SnackBar's transition mechanism
      // can leave an outgoing + incoming copy in the tree simultaneously.
      expect(find.textContaining('quota exceeded'), findsWidgets);
    });

    testWidgets('edits a wishlist via the popup menu', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([_wishlist('1')]));
      when(() => functionsService.updateWishlist(any(), any())).thenAnswer((_) async => {});
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();

      expect(find.text('Edit Wishlist'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), 'Renamed');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update'));
      await tester.pumpAndSettle();

      verify(() => functionsService.updateWishlist('1', any(that: containsPair('name', 'Renamed')))).called(1);
    });

    testWidgets('deletes a wishlist via the popup menu with confirmation', (tester) async {
      when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([_wishlist('1')]));
      when(() => functionsService.deleteWishlist(any())).thenAnswer((_) async {});
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(find.text('Delete Wishlist'), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Delete'));
      await tester.pumpAndSettle();

      verify(() => functionsService.deleteWishlist('1')).called(1);
    });

    group('Shared with Me', () {
      Future<void> switchToShared(WidgetTester tester) async {
        await tester.tap(find.text('Shared with Me'));
        await tester.pumpAndSettle();
      }

      testWidgets('loads and shows the empty state', (tester) async {
        when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
        when(() => functionsService.listSharedWishlists()).thenAnswer((_) async => []);
        await pumpScreen(tester);

        await switchToShared(tester);

        expect(find.text('Nothing shared with you yet'), findsOneWidget);
        verify(() => functionsService.listSharedWishlists()).called(1);
      });

      testWidgets('lists shared wishlists with the caller\'s role', (tester) async {
        when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
        when(() => functionsService.listSharedWishlists()).thenAnswer(
          (_) async => [
            {
              'id': 'shared1',
              'name': 'Team List',
              'userId': 'u2',
              'isPublic': false,
              'myRole': 'editor',
              'createdAt': DateTime(2026).toIso8601String(),
              'updatedAt': DateTime(2026).toIso8601String(),
            },
          ],
        );
        await pumpScreen(tester);

        await switchToShared(tester);

        expect(find.text('Team List'), findsOneWidget);
        expect(find.text('Editor access'), findsOneWidget);
      });

      testWidgets('leaving a shared wishlist calls removeCollaborator', (tester) async {
        when(() => firestoreService.getUserWishlistsStream('u1')).thenAnswer((_) => Stream.value([]));
        when(() => functionsService.listSharedWishlists()).thenAnswer(
          (_) async => [
            {
              'id': 'shared1',
              'name': 'Team List',
              'userId': 'u2',
              'isPublic': false,
              'myRole': 'editor',
              'createdAt': DateTime(2026).toIso8601String(),
              'updatedAt': DateTime(2026).toIso8601String(),
            },
          ],
        );
        when(() => functionsService.removeCollaborator(any(), any())).thenAnswer((_) async {});
        await pumpScreen(tester);
        await switchToShared(tester);

        await tester.tap(find.byTooltip('Leave this wishlist'));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(TextButton, 'Leave'));
        await tester.pumpAndSettle();

        verify(() => functionsService.removeCollaborator('shared1', 'u1')).called(1);
      });
    });
  });

  group('FirebaseWishlistItemsScreen', () {
    Future<void> pumpScreen(WidgetTester tester, {FirebaseWishlist? wishlist}) async {
      await tester.pumpWidget(wrapScreen(FirebaseWishlistItemsScreen(wishlist: wishlist ?? _wishlist('w1'))));
      await tester.pumpAndSettle();
    }

    testWidgets('shows the empty state when there are no items', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([]));
      await pumpScreen(tester);

      expect(find.text('No items yet'), findsOneWidget);
    });

    testWidgets('shows an error from the items stream', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.error(Exception('offline')));
      await pumpScreen(tester);

      expect(find.textContaining('Error loading items'), findsOneWidget);
    });

    testWidgets('lists items with price, and strikes through purchased ones', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer(
        (_) => Stream.value([_item('1', price: 19.99), _item('2', isPurchased: true)]),
      );
      await pumpScreen(tester);

      expect(find.text('Item 1'), findsOneWidget);
      expect(find.text('USD 19.99'), findsOneWidget);
      final purchasedTitle = tester.widget<Text>(find.text('Item 2'));
      expect(purchasedTitle.style?.decoration, TextDecoration.lineThrough);
    });

    testWidgets('owner sees the Collaborators action and full item menu', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([_item('1')]));
      await pumpScreen(tester, wishlist: _wishlist('w1', myRole: CollaboratorRole.owner));

      expect(find.byTooltip('Collaborators'), findsOneWidget);
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      expect(find.text('Edit'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('viewer sees no Collaborators action and no item menu', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([_item('1')]));
      await pumpScreen(tester, wishlist: _wishlist('w1', myRole: CollaboratorRole.viewer));

      expect(find.byTooltip('Collaborators'), findsNothing);
      expect(find.byType(PopupMenuButton<String>), findsNothing);
    });

    testWidgets('adds an item via the FAB dialog', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([]));
      when(() => functionsService.addWishlistItem(any())).thenAnswer((_) async => {'id': 'i1'});
      await pumpScreen(tester);

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Item name'), 'Lego Set');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Add'));
      await tester.pumpAndSettle();

      verify(() => functionsService.addWishlistItem(any(that: containsPair('title', 'Lego Set')))).called(1);
    });

    testWidgets('toggles an item to purchased via the popup menu', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([_item('1')]));
      when(() => functionsService.reserveWishlistItem(any())).thenAnswer((_) async => {});
      when(() => functionsService.purchaseWishlistItem(any())).thenAnswer((_) async => {});
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Mark purchased'));
      await tester.pumpAndSettle();

      verify(() => functionsService.purchaseWishlistItem('1')).called(1);
    });

    testWidgets('reserves an item via the popup menu', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([_item('1')]));
      when(() => functionsService.reserveWishlistItem(any())).thenAnswer((_) async => {});
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reserve'));
      await tester.pumpAndSettle();

      verify(() => functionsService.reserveWishlistItem('1')).called(1);
    });

    testWidgets('a reserved item hides the Reserve action', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1'))
          .thenAnswer((_) => Stream.value([_item('1', reservedBy: 'someone')]));
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      expect(find.text('Reserve'), findsNothing);
    });

    testWidgets('a reserved item shows Reserved status in the detail sheet', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1'))
          .thenAnswer((_) => Stream.value([_item('1', reservedBy: 'someone')]));
      await pumpScreen(tester);

      await tester.tap(find.text('Item 1'));
      await tester.pumpAndSettle();
      expect(find.text('Status: Reserved'), findsOneWidget);
    });

    testWidgets('a purchased item hides the Reserve action', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1'))
          .thenAnswer((_) => Stream.value([_item('1', isPurchased: true)]));
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      expect(find.text('Reserve'), findsNothing);
    });

    testWidgets('deletes an item via the popup menu', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([_item('1')]));
      when(() => functionsService.deleteWishlistItem(any())).thenAnswer((_) async {});
      await pumpScreen(tester);

      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      verify(() => functionsService.deleteWishlistItem('1')).called(1);
    });

    testWidgets('sharing without a shareId shows a message instead of sharing', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([]));
      await pumpScreen(tester, wishlist: _wishlist('w1', shareId: null));

      await tester.tap(find.byTooltip('Share wishlist'));
      await tester.pumpAndSettle();

      expect(find.text('This wishlist doesn\'t have a share link yet.'), findsOneWidget);
      expect(fakeShare.lastParams, isNull);
    });

    testWidgets('sharing with a shareId builds the public share link', (tester) async {
      when(() => firestoreService.getWishlistItemsStream('w1')).thenAnswer((_) => Stream.value([]));
      await pumpScreen(tester, wishlist: _wishlist('w1', shareId: 'abc123'));

      await tester.tap(find.byTooltip('Share wishlist'));
      await tester.pumpAndSettle();

      expect(fakeShare.lastParams!.text, contains('https://wishlist-wizard.web.app/shared/abc123'));
    });
  });
}
