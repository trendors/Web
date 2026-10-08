import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore } from '@ngrx/store/testing';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';

import { Posts } from './posts';
import { PostActions } from '../../../store/posts/post/posts.actions';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import {
  selectAllPosts,
  selectHasMorePosts,
  selectIsLoadingMore,
  selectIsLoadingPosts,
  selectPostsError,
} from '../../../store/posts/post/posts.selectors';
import { SocketService } from '../../../socket.service';
import { CampaignInfluencerService } from '../../../core/api';
import { Post } from '../../../core/models/posts/post.model';

describe('Posts', () => {
  let component: Posts;
  let fixture: ComponentFixture<Posts>;
  let store: MockStore;
  let dispatched: { type: string }[];

  const post = {
    id: 5,
    text: 'hello',
    likes: [{ id: 1, userId: 1, postId: 5 }],
    campaign: { id: 9, name: 'C', access: 'application' },
  } as unknown as Post;

  const campaignInfluencerApi = {
    campaignInfluencerControllerFindByUser: vi.fn(() => of({ data: [{ campaign: { id: 9 } }] })),
    campaignInfluencerControllerCreate: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
        provideRouter([]),
        provideAppMockStore({
          selectors: [
            { selector: selectCurrentUser, value: { id: 1, trendors_id: 'TR-1', user_name: 'ada' } },
            { selector: selectAllPosts, value: [post] },
            { selector: selectIsLoadingPosts, value: false },
            { selector: selectIsLoadingMore, value: false },
            { selector: selectHasMorePosts, value: true },
            { selector: selectPostsError, value: null },
          ],
        }),
        { provide: SocketService, useValue: { listenToNewPosts: () => EMPTY } },
        { provide: CampaignInfluencerService, useValue: campaignInfluencerApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatched = [];
    store.scannedActions$.subscribe((a) => dispatched.push(a));
    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the first page of the active tab into the store', () => {
    const load = dispatched.find((a) => a.type === PostActions.findAllPosts.type) as any;
    expect(load.query).toMatchObject({ page: 0, campaignType: 'open' });
  });

  it('should page through the store on load more', () => {
    component.onLoadMore();
    expect(dispatched.at(-1)?.type).toBe(PostActions.loadMorePosts.type);
  });

  it('should send the pre-click like state so a failure can be rolled back', () => {
    component.onLikePost(post);
    const like = dispatched.at(-1) as any;
    expect(like.type).toBe(PostActions.likePost.type);
    expect(like.wasLiked).toBe(true);
  });

  it('should mark campaigns the user already applied to, from the server', () => {
    expect(campaignInfluencerApi.campaignInfluencerControllerFindByUser).toHaveBeenCalledWith(1, false);
    expect(component.isAppliedByCurrentUser(post)).toBe(true);
  });
});
