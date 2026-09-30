# Release builds minify by default (AGP's own default, not something this
# project turns on explicitly) -- these silence known-safe R8 errors from
# the Stripe Android SDK's push-provisioning classes (Google/Apple Wallet
# card provisioning, unused by this app). See flutter_stripe's README
# "Android Requirements" section.
#
# Wildcarded rather than the previous per-class list: R8 failed release
# builds outright ("Missing class ...PushProvisioningActivity$f") on a
# class one Kotlin-compiler suffix away from the ones already listed here
# after nothing more than a routine flutter_stripe version bump -- these
# synthetic nested-class names shift with the SDK's own internal Kotlin
# compilation, not with anything this app does, so pinning to today's
# exact set just guarantees the next bump breaks the same way again.
-dontwarn com.stripe.android.pushProvisioning.**
