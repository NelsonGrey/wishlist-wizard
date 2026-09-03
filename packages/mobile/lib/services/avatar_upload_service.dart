import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

/// Picks an image and uploads it as the user's avatar to
/// `avatars/{uid}/avatar.<ext>` (same path + Storage rules as the web app's
/// `uploadAvatar`), returning the public download URL.
class AvatarUploadService {
  AvatarUploadService({ImagePicker? picker, FirebaseStorage? storage})
      : _picker = picker ?? ImagePicker(),
        _storage = storage ?? FirebaseStorage.instance;

  final ImagePicker _picker;
  final FirebaseStorage _storage;

  /// Returns the new photo URL, or null if the user cancelled the picker.
  Future<String?> pickAndUpload(
    String uid, {
    ImageSource source = ImageSource.gallery,
  }) async {
    final picked = await _picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1024,
      maxHeight: 1024,
    );
    if (picked == null) return null;

    final ext = avatarExtension(picked.name, picked.mimeType);
    final ref = _storage.ref('avatars/$uid/avatar.$ext');
    final bytes = await picked.readAsBytes();
    await ref.putData(
      bytes,
      SettableMetadata(contentType: picked.mimeType ?? 'image/$ext'),
    );
    return ref.getDownloadURL();
  }

  /// Best-effort image extension from the file name, falling back to the
  /// MIME subtype, then 'jpg'.
  @visibleForTesting
  static String avatarExtension(String fileName, String? mimeType) {
    final dot = fileName.lastIndexOf('.');
    if (dot != -1 && dot < fileName.length - 1) {
      final ext = fileName.substring(dot + 1).toLowerCase();
      if (RegExp(r'^[a-z0-9]{2,4}$').hasMatch(ext)) {
        return ext == 'jpeg' ? 'jpg' : ext;
      }
    }
    final sub = mimeType?.split('/').last.toLowerCase();
    if (sub != null && sub.isNotEmpty) return sub == 'jpeg' ? 'jpg' : sub;
    return 'jpg';
  }
}
