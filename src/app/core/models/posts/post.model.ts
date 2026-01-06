import { User } from '../users/user.model';

export enum LoadType {
  GT = 'GT',
  LT = 'LT',
}

export interface LoadMoreOptions {
  type: LoadType;
  id: number;
}

export type OrderType = 'ASC' | 'DESC';

export interface GenericFilter {
  filter?: Record<string, any>;
  searchString?: string;
  loadMoreOptions?: LoadMoreOptions;
  limit?: number;
  page?: number;
  orderBy?: string;
  order?: OrderType;
  relations?: string[];
}

export enum Channel {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export interface Pagination {
  items_per_page: number;
  page: number;
  total_items: number;
  total_pages: number;
}

export interface Post {
  id: number;
  text: string;
  heading?: string;
  link?: string;
  generate_ai_rewrite?: boolean;
  trendorsId?: string;
  userName: string;
  userId?: number;
  channel?: Channel;
  url?: string;
  images?: string[];
  srcUrl?: string;
  srcName?: string;
  srcImgUrl?: string;
  isSponsored?: boolean;
  incentiveShareCount?: number;
  maxIncentiveShares?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date;

  user?: User;
  likes?: LikePost[];
  comments?: Comment[];
  shares?: Sharing[];
}

export interface LikePost {
  id: number;
  postId?: number;
  trendorsId: string;
  userId?: number;
  user?: User;
  post?: Post;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Comment {
  id: number;
  text: string;
  postId: number;
  trendorsId: string;
  userName?: string;
  userId: number;
  user?: User;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Sharing {
  id: number;
  postId?: number;
  sharers_trendorsId: string;
  sharers_userId?: string;
  tracking_code?: string;
  deviceId?: string;
  ipAddress?: string;
  rewardAmount: number;
  status: 'completed' | 'flagged' | 'reviewed' | 'rejected';
  paid: boolean;
  createdAt: string | Date;
}

export interface CreatePostDto {
  text: string;
  heading?: string;
  link?: string;
  generate_ai_rewrite?: boolean;
  trendorsId?: string;
  userName: string;
  userId?: number;
  channel?: Channel;
  url?: string;
  images?: string[];
  srcUrl?: string;
  srcName?: string;
  srcImgUrl?: string;
  isSponsored?: boolean;
  incentiveShareCount?: number;
  maxIncentiveShares?: number;
}

export type FetchPostDto = GenericFilter;

export interface LoadMoreDto {
  loadMoreOptions?: LoadMoreOptions;
  searchString?: string;
  limit?: number;
  relations?: string[];
}

export interface LikePostDto {
  postId?: number;
  trendorsId: string;
  userId?: number;
}

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  data?: T;
  error?: { code: string; message: string };
}

export interface PagedListData<T> {
  list: T[];
  pagination: Pagination;
}

export type FetchPostsResponse = ApiResponse<PagedListData<Post>>;
export type FetchPostResponse = ApiResponse<Post>;
export type CreateResponse = ApiResponse<Post>;
