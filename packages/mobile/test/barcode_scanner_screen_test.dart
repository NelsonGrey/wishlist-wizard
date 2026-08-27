import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/screens/barcode_scanner_screen.dart';

void main() {
  // BarcodeScannerScreen wraps mobile_scanner's real camera pipeline
  // directly -- MobileScannerController and the detection callback both
  // go straight to the platform camera, with no injectable seam (the
  // MobileScanner widget's onDetect is wired to a private method that
  // calls Navigator.pop(context, code) itself). Under `flutter test`
  // (no camera hardware) the widget renders a pending/loading state
  // rather than erroring or resolving, so the scan-detected pop flow and
  // the camera-unavailable fallback UI aren't reachable from a unit
  // test. Tapping the flashlight toggle was also tried, but
  // MobileScannerController.toggleTorch() throws
  // MobileScannerException(controllerUninitialized) as an unhandled
  // Future error (the button's onPressed is fire-and-forget, so it's not
  // catchable via tester.takeException()) -- a real invariant of the
  // underlying library when the camera never started, not an app bug,
  // and not cleanly testable here without Zone-level error trapping.
  // What's covered: the screen chrome that doesn't depend on a live
  // camera feed.
  testWidgets('renders the scanner scaffold with a title and flashlight toggle', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: BarcodeScannerScreen()));
    await tester.pump();

    expect(find.text('Scan Barcode'), findsOneWidget);
    expect(find.byTooltip('Toggle flashlight'), findsOneWidget);
  });
}
