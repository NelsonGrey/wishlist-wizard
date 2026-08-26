package com.wishlistwizard.app.android

import io.flutter.embedding.android.FlutterFragmentActivity

// FlutterFragmentActivity (not FlutterActivity) -- required by flutter_stripe,
// which needs the Support Fragment Manager for its native payment sheets.
// A strict superset of FlutterActivity; every other plugin keeps working.
class MainActivity : FlutterFragmentActivity()
