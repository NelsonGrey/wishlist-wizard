# Wishlist Wizard Mobile

Flutter mobile application for Wishlist Wizard.

## Automated Testing

### Unit and widget tests

Run all unit/widget tests:

```bash
flutter test
```

### Mobile UAT smoke tests

Run the integration UAT smoke suite:

```bash
flutter test integration_test/auth_smoke_test.dart
```

Run the same suite on a specific physical device or simulator:

```bash
flutter test integration_test/auth_smoke_test.dart -d <DEVICE_ID>
```

Convenience Make targets:

```bash
make uat-smoke
make uat-smoke-device DEVICE_ID=<DEVICE_ID>
```

## iOS Release

The `iOS Mobile Release` workflow builds and ships the Flutter iOS app on the self-hosted macOS runner.

- `build_all` runs the release build without uploading
- `testflight` runs the release build, then uploads to TestFlight
- The workflow runs `flutter test` and the mobile smoke test when tests are enabled
