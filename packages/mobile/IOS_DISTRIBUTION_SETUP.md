# iOS Distribution Setup (Ephemeral Keychain Guide)

This document describes how to run Fastlane locally without modifying your macOS login keychain.

Why use an ephemeral keychain?
- Importing certificates into your login keychain can affect other apps and system integrations.
- An ephemeral keychain isolates Fastlane/codesign operations to a temporary keychain that is removed when the build completes.

Helper script
---------------
We added `scripts/ephemeral_keychain_fastlane.sh` to help: it creates a temporary keychain, optionally imports a `.p12`, runs the provided command, and deletes the keychain.

Basic usage
-----------

Import a `.p12` and run Fastlane for TestFlight (example):

```bash
CERT_P12_PATH=./certs/distribution.p12 CERT_P12_PASSWORD=yourP12Pass \
  ./scripts/ephemeral_keychain_fastlane.sh "bundle exec fastlane beta"
```

Run Fastlane without importing a cert (useful if CI handles signing):

```bash
./scripts/ephemeral_keychain_fastlane.sh "fastlane sync_signing"
```

How it works
------------
- Creates a temporary keychain named like `fastlane_tmp_<ts>_<pid>.keychain-db`.
- Adds the temp keychain to the user's keychain list and makes it the default for the session.
- Optionally imports a `.p12` into the temp keychain and sets key partition list so `codesign` can access the private key.
- Runs the specified command (e.g., `fastlane` invocation).
- Restores the default keychain (best effort) and deletes the temporary keychain.

Notes and recommendations
-------------------------
- This approach keeps your login keychain untouched and is safe for local development.
- For release workflows, prefer running Fastlane on CI (use the ephemeral keychain there as well), or on a dedicated build machine.
 - Our CI workflow (`.github/workflows/ios-distribution.yml`) now prefers to run Fastlane through `scripts/ephemeral_keychain_fastlane.sh` on the self-hosted macOS runner. This avoids creating or modifying a shared login keychain in CI.
- If you use `match`, you can combine it with this helper by passing `--keychain_name`/`--keychain_password` options to `match` or by importing the `match`-retrieved `.p12` into the ephemeral keychain before invoking `match`.

Troubleshooting
---------------
- If codesign prompts for access, ensure the `security set-key-partition-list` step ran successfully; some macOS versions may require additional entitlements.
- If the script cannot find `security` or `codesign`, ensure Xcode command line tools are installed (`xcode-select --install`).

Alternatives
------------
- Use CI-only signing: never run signing on your personal machine.
- Run Fastlane inside a disposable macOS VM or containerized runner.

If you'd like, I can update `packages/mobile/setup-ios-distribution.sh` to reference this helper and provide example automated commands. Would you like that? 
