import { createReducer, on } from "@ngrx/store";
import { Post } from "../../../core/models/posts/post.model";
import { PostActions } from "./posts.actions";

export interface PostsState {
    items: Post[];
    totalCount: number;
    loading: boolean;
    error: string | null;
}

export const initialState: PostsState = {
    items: [],
    totalCount: 0,
    loading: false,
    error: null
};

export const postsReducer = createReducer(
    initialState,

    on(PostActions.loadFeed, (state) => ({ 
        ...state, 
        loading: true, 
        error: null 
    })),
    on(PostActions.loadFeedSuccess, (state, { posts, count }) => ({
        ...state,
        items: posts,
        totalCount: count,
        loading: false
    })),
    on(PostActions.loadFeedFailure, (state, { error }) => ({
        ...state,
        loading: false,
        error
    })),
    on(PostActions.createPost, (state) => ({ ...state, loading: true })),
    on(PostActions.createPostSuccess, (state) => ({ ...state, loading: false })),
)