import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/scan_item_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

class MockFirebaseFirestoreService extends Mock
    implements FirebaseFirestoreService {}

final _fakeUser = User(
  id: 'u1',
  email: 'user@example.com',
  createdAt: DateTime.now(),
);

Widget wrapScreen({
  required FirebaseAuthService authService,
  required FirebaseFunctionsService functionsService,
  required FirebaseFirestoreService firestoreService,
}) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            authService: authService,
            functionsService: functionsService,
          ),
        ),
        ChangeNotifierProvider<FirebaseWishlistProvider>(
          create: (_) => FirebaseWishlistProvider(
            firestoreService: firestoreService,
            functionsService: functionsService,
          ),
        ),
      ],
      child: ScanItemScreen(functionsService: functionsService),
    ),
  );
}

void main() {
  late MockFirebaseAuthService authService;
  late MockFirebaseFunctionsService functionsService;
  late MockFirebaseFirestoreService firestoreService;

  setUp(() {
    authService = MockFirebaseAuthService();
    functionsService = MockFirebaseFunctionsService();
    firestoreService = MockFirebaseFirestoreService();
    when(() => authService.authStateChanges)
        .thenAnswer((_) => Stream.value(_fakeUser));
    when(() => functionsService.ensureProfile()).thenAnswer((_) async {});
  });

  testWidgets('shows a scan button and manual barcode field', (tester) async {
    await tester.pumpWidget(wrapScreen(
      authService: authService,
      functionsService: functionsService,
      firestoreService: firestoreService,
    ));
    await tester.pumpAndSettle();

    expect(find.byTooltip('Scan barcode'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Barcode'), findsOneWidget);
  });

  testWidgets('rejects looking up an empty barcode', (tester) async {
    await tester.pumpWidget(wrapScreen(
      authService: authService,
      functionsService: functionsService,
      firestoreService: firestoreService,
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Look Up'));
    await tester.pump();

    verifyNever(() => functionsService.lookupBarcode(any()));
    expect(find.text('Enter a barcode first'), findsOneWidget);
  });

  testWidgets('a found product fills in name and store', (tester) async {
    when(() => functionsService.lookupBarcode('012345678905')).thenAnswer(
      (_) async => {
        'found': true,
        'product': {'title': 'Wireless Headphones', 'store': 'Acme'},
      },
    );

    await tester.pumpWidget(wrapScreen(
      authService: authService,
      functionsService: functionsService,
      firestoreService: firestoreService,
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Barcode'), '012345678905');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Look Up'));
    await tester.pumpAndSettle();

    verify(() => functionsService.lookupBarcode('012345678905')).called(1);
    expect(find.widgetWithText(TextFormField, 'Wireless Headphones'), findsOneWidget);
    // The looked-up store fills the Store field, not Notes.
    expect(find.widgetWithText(TextFormField, 'Acme'), findsOneWidget);
    final storeField = tester.widget<TextFormField>(
      find.widgetWithText(TextFormField, 'Acme'),
    );
    expect(storeField.controller?.text, 'Acme');
    expect(find.text('Product found — details filled in below'), findsOneWidget);
  });

  testWidgets('the add form exposes Store and a Priority dropdown', (
    tester,
  ) async {
    await tester.pumpWidget(wrapScreen(
      authService: authService,
      functionsService: functionsService,
      firestoreService: firestoreService,
    ));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byType(DropdownButtonFormField<Priority>),
      200,
      scrollable: find.byType(Scrollable).first,
    );

    expect(find.widgetWithText(TextFormField, 'Store (optional)'), findsOneWidget);
    expect(find.text('Medium'), findsOneWidget); // default priority
  });

  testWidgets('shows a message when no product is found', (tester) async {
    when(() => functionsService.lookupBarcode('000000000000'))
        .thenAnswer((_) async => {'found': false});

    await tester.pumpWidget(wrapScreen(
      authService: authService,
      functionsService: functionsService,
      firestoreService: firestoreService,
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextFormField, 'Barcode'), '000000000000');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Look Up'));
    await tester.pumpAndSettle();

    expect(find.text('No product found for that barcode'), findsOneWidget);
  });
}
