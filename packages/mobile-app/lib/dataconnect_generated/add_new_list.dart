part of 'example.dart';

class AddNewListVariablesBuilder {
  
  final FirebaseDataConnect _dataConnect;
  AddNewListVariablesBuilder(this._dataConnect, );
  Deserializer<AddNewListData> dataDeserializer = (dynamic json)  => AddNewListData.fromJson(jsonDecode(json));
  
  Future<OperationResult<AddNewListData, void>> execute() {
    return ref().execute();
  }

  MutationRef<AddNewListData, void> ref() {
    
    return _dataConnect.mutation("AddNewList", dataDeserializer, emptySerializer, null);
  }
}

@immutable
class AddNewListListInsert {
  final String id;
  AddNewListListInsert.fromJson(dynamic json):
  
  id = nativeFromJson<String>(json['id']);
  @override
  bool operator ==(Object other) {
    if(identical(this, other)) {
      return true;
    }
    if(other.runtimeType != runtimeType) {
      return false;
    }

    final AddNewListListInsert otherTyped = other as AddNewListListInsert;
    return id == otherTyped.id;
    
  }
  @override
  int get hashCode => id.hashCode;
  

  Map<String, dynamic> toJson() {
    Map<String, dynamic> json = {};
    json['id'] = nativeToJson<String>(id);
    return json;
  }

  const AddNewListListInsert({
    required this.id,
  });
}

@immutable
class AddNewListData {
  final AddNewListListInsert list_insert;
  AddNewListData.fromJson(dynamic json):
  
  list_insert = AddNewListListInsert.fromJson(json['list_insert']);
  @override
  bool operator ==(Object other) {
    if(identical(this, other)) {
      return true;
    }
    if(other.runtimeType != runtimeType) {
      return false;
    }

    final AddNewListData otherTyped = other as AddNewListData;
    return list_insert == otherTyped.list_insert;
    
  }
  @override
  int get hashCode => list_insert.hashCode;
  

  Map<String, dynamic> toJson() {
    Map<String, dynamic> json = {};
    json['list_insert'] = list_insert.toJson();
    return json;
  }

  const AddNewListData({
    required this.list_insert,
  });
}

