import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddMovieToListData {
  listMovie_insert: ListMovie_Key;
}

export interface AddMovieToListVariables {
  listId: UUIDString;
  movieId: UUIDString;
  position: number;
  note?: string | null;
}

export interface AddNewListData {
  list_insert: List_Key;
}

export interface AddReviewData {
  review_upsert: Review_Key;
}

export interface AddReviewVariables {
  movieId: UUIDString;
  watchId: UUIDString;
  rating: number;
  review?: string | null;
}

export interface CreateMovieData {
  movie_insert: Movie_Key;
}

export interface CreateMovieVariables {
  title: string;
  year: number;
  summary?: string | null;
  genres?: string[] | null;
}

export interface DeleteReviewData {
  review_delete?: Review_Key | null;
}

export interface DeleteReviewVariables {
  movieId: UUIDString;
}

export interface GetMoviesInListData {
  list?: {
    movies_via_ListMovie: ({
      id: UUIDString;
      title: string;
      year: number;
      summary?: string | null;
    } & Movie_Key)[];
  };
}

export interface GetMoviesInListVariables {
  listId: UUIDString;
}

export interface GetMyListsData {
  lists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    public: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & List_Key)[];
}

export interface ListMovie_Key {
  listId: UUIDString;
  movieId: UUIDString;
  __typename?: 'ListMovie_Key';
}

export interface List_Key {
  id: UUIDString;
  __typename?: 'List_Key';
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  displayName: string;
  email?: string | null;
  photoUrl?: string | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watch_Key {
  id: UUIDString;
  __typename?: 'Watch_Key';
}

interface CreateMovieRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMovieVariables): MutationRef<CreateMovieData, CreateMovieVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMovieVariables): MutationRef<CreateMovieData, CreateMovieVariables>;
  operationName: string;
}
export const createMovieRef: CreateMovieRef;

export function createMovie(vars: CreateMovieVariables): MutationPromise<CreateMovieData, CreateMovieVariables>;
export function createMovie(dc: DataConnect, vars: CreateMovieVariables): MutationPromise<CreateMovieData, CreateMovieVariables>;

interface UpsertUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertUserVariables): MutationRef<UpsertUserData, UpsertUserVariables>;
  operationName: string;
}
export const upsertUserRef: UpsertUserRef;

export function upsertUser(vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;
export function upsertUser(dc: DataConnect, vars: UpsertUserVariables): MutationPromise<UpsertUserData, UpsertUserVariables>;

interface AddReviewRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddReviewVariables): MutationRef<AddReviewData, AddReviewVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddReviewVariables): MutationRef<AddReviewData, AddReviewVariables>;
  operationName: string;
}
export const addReviewRef: AddReviewRef;

export function addReview(vars: AddReviewVariables): MutationPromise<AddReviewData, AddReviewVariables>;
export function addReview(dc: DataConnect, vars: AddReviewVariables): MutationPromise<AddReviewData, AddReviewVariables>;

interface DeleteReviewRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteReviewVariables): MutationRef<DeleteReviewData, DeleteReviewVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteReviewVariables): MutationRef<DeleteReviewData, DeleteReviewVariables>;
  operationName: string;
}
export const deleteReviewRef: DeleteReviewRef;

export function deleteReview(vars: DeleteReviewVariables): MutationPromise<DeleteReviewData, DeleteReviewVariables>;
export function deleteReview(dc: DataConnect, vars: DeleteReviewVariables): MutationPromise<DeleteReviewData, DeleteReviewVariables>;

interface AddNewListRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<AddNewListData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<AddNewListData, undefined>;
  operationName: string;
}
export const addNewListRef: AddNewListRef;

export function addNewList(): MutationPromise<AddNewListData, undefined>;
export function addNewList(dc: DataConnect): MutationPromise<AddNewListData, undefined>;

interface GetMyListsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyListsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyListsData, undefined>;
  operationName: string;
}
export const getMyListsRef: GetMyListsRef;

export function getMyLists(): QueryPromise<GetMyListsData, undefined>;
export function getMyLists(dc: DataConnect): QueryPromise<GetMyListsData, undefined>;

interface AddMovieToListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  operationName: string;
}
export const addMovieToListRef: AddMovieToListRef;

export function addMovieToList(vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;
export function addMovieToList(dc: DataConnect, vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface GetMoviesInListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMoviesInListVariables): QueryRef<GetMoviesInListData, GetMoviesInListVariables>;
  operationName: string;
}
export const getMoviesInListRef: GetMoviesInListRef;

export function getMoviesInList(vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;
export function getMoviesInList(dc: DataConnect, vars: GetMoviesInListVariables): QueryPromise<GetMoviesInListData, GetMoviesInListVariables>;

