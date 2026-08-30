# Release builds run with minifyEnabled -- these silence known-safe R8
# "missing class" errors from the Stripe Android SDK's push-provisioning
# classes (Google/Apple Wallet card provisioning, unused by this app).
# See flutter_stripe's README "Android Requirements" section. Wildcarded
# (rather than the exact class list the README suggests) because the
# SDK's synthetic/inner classes here (e.g. PushProvisioningActivity$f)
# vary by SDK version and aren't worth chasing one at a time.
-dontwarn com.stripe.android.pushProvisioning.**
