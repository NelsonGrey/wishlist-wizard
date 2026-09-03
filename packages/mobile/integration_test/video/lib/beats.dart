import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

class VideoBeats {
  final Stopwatch _clock = Stopwatch();
  final List<Map<String, Object>> _marks = [];

  void start() {
    _marks.clear();
    _clock
      ..reset()
      ..start();
  }

  void mark(String id) {
    if (!_clock.isRunning) start();
    final elapsed = _clock.elapsedMilliseconds;
    _marks.add({'id': id, 'tStartMs': elapsed});
    debugPrint('WW_BEAT|$id|$elapsed');
  }

  Future<void> flush(String persona) async {
    final documents = await getApplicationDocumentsDirectory();
    final directory = Directory('${documents.path}/ww-video');
    await directory.create(recursive: true);
    await File(
      '${directory.path}/$persona.beats.json',
    ).writeAsString('${const JsonEncoder.withIndent('  ').convert(_marks)}\n');
  }
}
