import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'beats.dart';

class CinematicDriver {
  CinematicDriver(this.tester, this.beats);

  final WidgetTester tester;
  final VideoBeats beats;
  OverlayEntry? _captionEntry;
  final ValueNotifier<String?> _caption = ValueNotifier(null);

  Future<void> installCaption() async {
    final overlay = tester.state<OverlayState>(find.byType(Overlay).first);
    _captionEntry = OverlayEntry(
      builder: (_) => ValueListenableBuilder<String?>(
        valueListenable: _caption,
        builder: (context, text, child) => text == null
            ? const SizedBox.shrink()
            : Positioned(
                left: 20,
                right: 20,
                bottom: 92,
                child: IgnorePointer(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: const Color(0xF2FFFDF7),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0x26065F46)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x33022C22),
                              blurRadius: 18,
                              offset: Offset(0, 7),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 10, 16, 10),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF59E0B),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Flexible(
                                child: Text(
                                  text,
                                  textAlign: TextAlign.left,
                                  style: const TextStyle(
                                    color: Color(0xFF064E3B),
                                    fontSize: 15,
                                    height: 1.25,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.1,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
    overlay.insert(_captionEntry!);
    await tester.pump();
  }

  Future<void> caption(String? text) async {
    _caption.value = text;
    await tester.pump();
  }

  Future<void> hold(Duration duration) => tester.pump(duration);

  Future<void> tapSlow(
    Finder finder, {
    Duration settle = const Duration(milliseconds: 1500),
  }) async {
    await tester.ensureVisible(finder);
    await tester.pump(const Duration(milliseconds: 350));
    await tester.tap(finder);
    await tester.pumpAndSettle(settle);
  }

  Future<void> typeSlow(Finder finder, String text, {int cps = 18}) async {
    await tester.tap(finder);
    await tester.pump();
    for (final rune in text.runes) {
      tester.testTextInput.updateEditingValue(
        TextEditingValue(
          text: '${_textFor(finder)}${String.fromCharCode(rune)}',
          selection: TextSelection.collapsed(
            offset: _textFor(finder).length + 1,
          ),
        ),
      );
      await tester.pump(Duration(milliseconds: (1000 / cps).round()));
    }
  }

  String _textFor(Finder finder) {
    final widget = tester.widget<TextField>(finder);
    return widget.controller?.text ?? '';
  }

  Future<void> scrollSlow(Finder scrollable, double dy, {int steps = 8}) async {
    for (var i = 0; i < steps; i++) {
      await tester.drag(scrollable, Offset(0, dy / steps));
      await tester.pump(const Duration(milliseconds: 110));
    }
    await tester.pumpAndSettle(const Duration(seconds: 2));
  }

  void dispose() {
    _captionEntry?.remove();
    _caption.dispose();
  }
}
