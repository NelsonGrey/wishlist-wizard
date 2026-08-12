# Inert unless a future release build enables minifyEnabled -- these silence
# known-safe R8 warnings from the Stripe Android SDK's push-provisioning
# classes (Google/Apple Wallet card provisioning, unused by this app).
# See flutter_stripe's README "Android Requirements" section.
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivity$g
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Args
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter$Error
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningActivityStarter
-dontwarn com.stripe.android.pushProvisioning.PushProvisioningEphemeralKeyProvider
