import { Component, Input } from '@angular/core';
import { SlicePipe } from '@angular/common';
@Component({
  selector: 'app-new-posts-notifier',
  imports: [SlicePipe],
  templateUrl: './new-posts-notifier.html',
  styleUrl: './new-posts-notifier.scss',
})
export class NewPostsNotifier {
 @Input() pendingPosts: any[] = []; 
}
