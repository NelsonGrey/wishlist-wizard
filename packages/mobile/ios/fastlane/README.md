fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios load_asc_api_key

```sh
[bundle exec] fastlane ios load_asc_api_key
```

Load ASC API Key information to use in subsequent lanes

### ios flutter_deps

```sh
[bundle exec] fastlane ios flutter_deps
```

Install Flutter dependencies

### ios flutter_test

```sh
[bundle exec] fastlane ios flutter_test
```

Run Flutter tests

### ios build_debug

```sh
[bundle exec] fastlane ios build_debug
```

Build Flutter iOS app in debug mode

### ios build_release

```sh
[bundle exec] fastlane ios build_release
```

Build Flutter iOS app in release mode

### ios sync_signing

```sh
[bundle exec] fastlane ios sync_signing
```

Helper to purge App Store assets from the match repo (nuke) without revoking on Apple Developer Portal

Sync code signing certificates and provisioning profiles

### ios build_appstore

```sh
[bundle exec] fastlane ios build_appstore
```

Build and sign iOS app for App Store distribution

### ios build_testflight

```sh
[bundle exec] fastlane ios build_testflight
```

Build and sign iOS app for TestFlight distribution

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Upload to TestFlight

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
