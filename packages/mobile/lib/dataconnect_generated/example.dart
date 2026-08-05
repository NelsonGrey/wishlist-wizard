library;

import 'package:firebase_data_connect/firebase_data_connect.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';

part 'upsert_user.dart';

part 'add_new_list.dart';

part 'get_my_lists.dart';

class ExampleConnector {
  UpsertUserVariablesBuilder upsertUser({required String displayName}) {
    return UpsertUserVariablesBuilder(dataConnect, displayName: displayName);
  }

  AddNewListVariablesBuilder addNewList() {
    return AddNewListVariablesBuilder(dataConnect);
  }

  GetMyListsVariablesBuilder getMyLists() {
    return GetMyListsVariablesBuilder(dataConnect);
  }

  static ConnectorConfig connectorConfig = ConnectorConfig(
    'us-central1',
    'example',
    'wishlist-wizard-react-project',
  );

  ExampleConnector({required this.dataConnect});
  static ExampleConnector get instance {
    return ExampleConnector(
      dataConnect: FirebaseDataConnect.instanceFor(
        connectorConfig: connectorConfig,
        sdkType: CallerSDKType.generated,
      ),
    );
  }

  FirebaseDataConnect dataConnect;
}
