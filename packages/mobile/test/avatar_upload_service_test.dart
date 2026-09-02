import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/avatar_upload_service.dart';

void main() {
  group('AvatarUploadService.avatarExtension', () {
    test('reads the extension from the file name', () {
      expect(AvatarUploadService.avatarExtension('photo.png', null), 'png');
      expect(AvatarUploadService.avatarExtension('IMG_0001.HEIC', null), 'heic');
    });

    test('normalises jpeg to jpg', () {
      expect(AvatarUploadService.avatarExtension('a.jpeg', null), 'jpg');
      expect(AvatarUploadService.avatarExtension('a', 'image/jpeg'), 'jpg');
    });

    test('falls back to the mime subtype, then jpg', () {
      expect(AvatarUploadService.avatarExtension('blob', 'image/webp'), 'webp');
      expect(AvatarUploadService.avatarExtension('blob', null), 'jpg');
    });
  });
}
