import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/auth_provider.dart';
import 'package:wishlist_wizard_mobile/screens/edit_profile_screen.dart';
import 'package:wishlist_wizard_mobile/services/avatar_upload_service.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

class MockAvatarUploadService extends Mock implements AvatarUploadService {}

final _user = User(id: 'u1', email: 'jo@example.com', createdAt: DateTime(2026));

void main() {
  late MockFirebaseAuthService authService;
  late MockFirebaseFunctionsService functionsService;
  late MockAvatarUploadService avatarService;

  setUp(() {
    authService = MockFirebaseAuthService();
    functionsService = MockFirebaseFunctionsService();
    avatarService = MockAvatarUploadService();

    when(() => authService.authStateChanges)
        .thenAnswer((_) => Stream<User?>.value(_user));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => _user);
    when(() => authService.reloadCurrentUser()).thenAnswer((_) async => _user);
    when(() => functionsService.ensureProfile()).thenAnswer((_) async {});
  });

  Widget build() => MaterialApp(
        home: ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            authService: authService,
            functionsService: functionsService,
          ),
          child: EditProfileScreen(
            functionsService: functionsService,
            avatarUploadService: avatarService,
          ),
        ),
      );

  testWidgets('loads and shows existing profile values', (tester) async {
    when(() => functionsService.getMyProfile()).thenAnswer(
      (_) async => {
        'displayName': 'Jo Rivers',
        'bio': 'Loves gadgets',
        'location': 'Denver',
        'interests': ['hiking', 'coffee'],
        'favoriteStores': ['REI'],
        'giftPreferences': {
          'sizes': {'clothing': 'M', 'shoes': 'US 9'},
          'categories': ['outdoor'],
        },
      },
    );

    await tester.pumpWidget(build());
    await tester.pumpAndSettle();

    expect(find.text('Jo Rivers'), findsOneWidget);
    expect(find.text('Loves gadgets'), findsOneWidget);
    expect(find.widgetWithText(Chip, 'hiking'), findsOneWidget);
    expect(find.widgetWithText(Chip, 'coffee'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.widgetWithText(Chip, 'REI'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.widgetWithText(Chip, 'REI'), findsOneWidget);
  });

  testWidgets('Save PATCHes the profile with the edited fields', (tester) async {
    when(() => functionsService.getMyProfile()).thenAnswer(
      (_) async => {
        'displayName': 'Jo',
        'bio': '',
        'location': '',
        'interests': <String>[],
        'favoriteStores': <String>[],
        'giftPreferences': {'sizes': {}, 'categories': <String>[]},
      },
    );
    when(() => functionsService.updateMyProfile(any()))
        .thenAnswer((i) async => i.positionalArguments.first as Map<String, dynamic>);

    await tester.pumpWidget(build());
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Display name'),
      'Josephine',
    );
    await tester.scrollUntilVisible(
      find.text('Save'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    final sent = verify(() => functionsService.updateMyProfile(captureAny()))
        .captured
        .single as Map<String, dynamic>;
    expect(sent['displayName'], 'Josephine');
    expect(sent['giftPreferences'], isA<Map>());
    verify(() => authService.reloadCurrentUser()).called(1);
  });
}
