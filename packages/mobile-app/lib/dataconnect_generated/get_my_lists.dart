part of 'example.dart';

class GetMyListsVariablesBuilder {
  
  final FirebaseDataConnect _dataConnect;
  GetMyListsVariablesBuilder(this._dataConnect, );
  Deserializer<GetMyListsData> dataDeserializer = (dynamic json)  => GetMyListsData.fromJson(jsonDecode(json));
  
  Future<QueryResult<GetMyListsData, void>> execute() {
    return ref().execute();
  }

  QueryRef<GetMyListsData, void> ref() {
    
    return _dataConnect.query("GetMyLists", dataDeserializer, emptySerializer, null);
  }
}

@immutable
class GetMyListsLists {
  final String id;
  final String name;
  final String? description;
  final bool public;
  final Timestamp createdAt;
  final Timestamp updatedAt;
  GetMyListsLists.fromJson(dynamic json):
  
  id = nativeFromJson<String>(json['id']),
  name = nativeFromJson<String>(json['name']),
  description = json['description'] == null ? null : nativeFromJson<String>(json['description']),
  public = nativeFromJson<bool>(json['public']),
  createdAt = Timestamp.fromJson(json['createdAt']),
  updatedAt = Timestamp.fromJson(json['updatedAt']);
  @override
  bool operator ==(Object other) {
    if(identical(this, other)) {
      return true;
    }
    if(other.runtimeType != runtimeType) {
      return false;
    }

    final GetMyListsLists otherTyped = other as GetMyListsLists;
    return id == otherTyped.id && 
    name == otherTyped.name && 
    description == otherTyped.description && 
    public == otherTyped.public && 
    createdAt == otherTyped.createdAt && 
    updatedAt == otherTyped.updatedAt;
    
  }
  @override
  int get hashCode => Object.hash(id.hashCode, name.hashCode, description.hashCode, public.hashCode, createdAt.hashCode, updatedAt.hashCode);
  

  Map<String, dynamic> toJson() {
    Map<String, dynamic> json = {};
    json['id'] = nativeToJson<String>(id);
    json['name'] = nativeToJson<String>(name);
    if (description != null) {
      json['description'] = nativeToJson<String?>(description);
    }
    json['public'] = nativeToJson<bool>(public);
    json['createdAt'] = createdAt.toJson();
    json['updatedAt'] = updatedAt.toJson();
    return json;
  }

  GetMyListsLists({
    required this.id,
    required this.name,
    this.description,
    required this.public,
    required this.createdAt,
    required this.updatedAt,
  });
}

@immutable
class GetMyListsData {
  final List<GetMyListsLists> lists;
  GetMyListsData.fromJson(dynamic json):
  
  lists = (json['lists'] as List<dynamic>)
        .map((e) => GetMyListsLists.fromJson(e))
        .toList();
  @override
  bool operator ==(Object other) {
    if(identical(this, other)) {
      return true;
    }
    if(other.runtimeType != runtimeType) {
      return false;
    }

    final GetMyListsData otherTyped = other as GetMyListsData;
    return lists == otherTyped.lists;
    
  }
  @override
  int get hashCode => lists.hashCode;
  

  Map<String, dynamic> toJson() {
    Map<String, dynamic> json = {};
    json['lists'] = lists.map((e) => e.toJson()).toList();
    return json;
  }

  GetMyListsData({
    required this.lists,
  });
}

