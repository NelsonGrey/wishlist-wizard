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

## iOS CI

The iOS build workflow runs both:

1. `flutter test`
2. `flutter test integration_test/auth_smoke_test.dart -d <auto-detected-device>`

before building and distributing iOS artifacts.
