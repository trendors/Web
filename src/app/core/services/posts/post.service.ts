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
  FetchPostResponse,
} from '../../models/posts/post.model';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  // private apiUrl = 'http://localhost:3000/posts';
   private apiUrl = `${environment.apiUrl}/posts`

  findAll(query: FetchPostDto): Observable<FetchPostsResponse> {
    const payload = {
      ...query,
      relations: query.relations ?? ['user', 'likes', 'comments', 'shares'],
    };
    return this.http.post<FetchPostsResponse>(`${this.apiUrl}/findAll`, payload);
  }

  findOne(id:any):Observable<FetchPostResponse> {
    return this.http.get<FetchPostResponse>(`${this.apiUrl}/${id}`)
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
    console.log("is this called")
    return this.http.post<LikeResponse>(`${this.apiUrl}/like`, dto);
  }

  

  uploadImage(postId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch(`${this.apiUrl}/${postId}/upload/posts`, formData);
  }
}
