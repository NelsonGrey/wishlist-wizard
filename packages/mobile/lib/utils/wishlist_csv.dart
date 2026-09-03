import '../models/firebase_models.dart';

/// Serialises wishlist items to CSV text. Columns mirror the web app's
/// WishlistDetail export: Title, Store, Price, Currency, Priority, Status, URL.
String wishlistItemsToCsv(List<FirebaseWishlistItem> items) {
  const headers = [
    'Title',
    'Store',
    'Price',
    'Currency',
    'Priority',
    'Status',
    'URL',
  ];

  String status(FirebaseWishlistItem i) {
    if (i.isPurchased) return 'Purchased';
    if (i.isReserved) return 'Reserved';
    return 'Available';
  }

  final rows = <List<String>>[
    headers,
    for (final i in items)
      [
        i.name,
        i.store ?? '',
        i.price?.toStringAsFixed(2) ?? '',
        i.currency,
        i.priority.name,
        status(i),
        i.url ?? '',
      ],
  ];

  return rows.map((row) => row.map(_csvCell).join(',')).join('\r\n');
}

/// Quotes a cell when it contains a comma, quote, CR or LF; doubles inner
/// quotes — RFC 4180.
String _csvCell(String value) {
  if (value.contains(RegExp(r'[",\r\n]'))) {
    return '"${value.replaceAll('"', '""')}"';
  }
  return value;
}
