import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CreatePostDto,
  FetchPostDto,
  LoadMoreDto,
  ApiResponse,
  PagedListData,
  Post,
  LikePostDto,
  FetchPostsResponse,
  SaveOneResponse,
  LikeResponse,
} from '../../models/posts/post.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private apiUrl = 'https://trendors-main-service.onrender.com';

  findAll(query: FetchPostDto): Observable<FetchPostsResponse> {
    const payload = {
      ...query,
      relations: query.relations ?? ['user', 'likes', 'comments', 'shares'],
    };
    return this.http.post<FetchPostsResponse>(`${this.apiUrl}/findAll`, payload);
  }

  loadMore(query: LoadMoreDto): Observable<FetchPostsResponse> {
    const payload = {
      ...query,
      relations: query.relations ?? ['user', 'likes', 'comments', 'shares'],
    };
    return this.http.post<FetchPostsResponse>(`${this.apiUrl}/loadMore`, payload);
  }

  create(dto: CreatePostDto): Observable<SaveOneResponse> {
    return this.http.post<SaveOneResponse>(`${this.apiUrl}`, dto);
  }

  likePost(dto: LikePostDto): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.apiUrl}/like`, dto);
  }
}
