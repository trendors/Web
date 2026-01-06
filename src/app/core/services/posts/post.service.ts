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
} from '../../models/posts/post.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/posts';

  findAll(query: FetchPostDto): Observable<ApiResponse<PagedListData<Post>>> {
    const payload = {
      ...query,
      relations: query.relations ?? ['user', 'likes', 'comments', 'shares'],
    };
    return this.http.post<ApiResponse<PagedListData<Post>>>(`${this.apiUrl}/findAll`, payload);
  }

  loadMore(query: LoadMoreDto): Observable<ApiResponse<PagedListData<Post>>> {
    const payload = {
      ...query,
      relations: query.relations ?? ['user', 'likes', 'comments', 'shares'],
    };
    return this.http.post<ApiResponse<PagedListData<Post>>>(`${this.apiUrl}/loadMore`, payload);
  }

  create(dto: CreatePostDto): Observable<ApiResponse<Post>> {
    return this.http.post<ApiResponse<Post>>(`${this.apiUrl}`, dto);
  }

  likePost(dto: LikePostDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/like`, dto);
  }
}
