import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/utils/wishlist_csv.dart';

FirebaseWishlistItem _item({
  String name = 'Widget',
  String? store,
  double? price,
  String currency = 'USD',
  Priority priority = Priority.medium,
  bool isPurchased = false,
  String? reservedBy,
  String? url,
}) => FirebaseWishlistItem(
      id: '1',
      name: name,
      store: store,
      price: price,
      currency: currency,
      priority: priority,
      isPurchased: isPurchased,
      reservedBy: reservedBy,
      url: url,
      wishlistId: 'w1',
      userId: 'u1',
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
    );

void main() {
  test('emits the web-parity header row', () {
    final csv = wishlistItemsToCsv([]);
    expect(csv, 'Title,Store,Price,Currency,Priority,Status,URL');
  });

  test('serialises a row with status and formatted price', () {
    final csv = wishlistItemsToCsv([
      _item(
        name: 'Headphones',
        store: 'SoundCo',
        price: 199.9,
        priority: Priority.high,
        url: 'https://x.test/h',
      ),
    ]);
    final rows = csv.split('\r\n');
    expect(rows, hasLength(2));
    expect(
      rows[1],
      'Headphones,SoundCo,199.90,USD,high,Available,https://x.test/h',
    );
  });

  test('status reflects purchased / reserved / available', () {
    final csv = wishlistItemsToCsv([
      _item(name: 'A', isPurchased: true),
      _item(name: 'B', reservedBy: 'someone'),
      _item(name: 'C'),
    ]);
    final rows = csv.split('\r\n');
    expect(rows[1], startsWith('A,'));
    expect(rows[1], contains(',Purchased,'));
    expect(rows[2], contains(',Reserved,'));
    expect(rows[3], contains(',Available,'));
  });

  test('quotes cells containing commas or quotes (RFC 4180)', () {
    final csv = wishlistItemsToCsv([
      _item(name: 'Mug, "Large"', store: 'A,B'),
    ]);
    final row = csv.split('\r\n')[1];
    expect(row, startsWith('"Mug, ""Large""","A,B",'));
  });
}
