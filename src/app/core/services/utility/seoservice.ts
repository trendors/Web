import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(private meta: Meta, private title: Title) {}

  setTwitterCard(post: { title: string, desc: string, image: string, url: string }) {
    // 1. Set the browser tab title
    this.title.setTitle(post.title);

    // 2. Set Twitter-specific tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    // this.meta.updateTag({ name: 'twitter:title', content: post.title });
    // this.meta.updateTag({ name: 'twitter:description', content: post.desc });
    this.meta.updateTag({ name: 'twitter:image', content: post.image });

    // 3. Set Open Graph tags (Fallbacks for Facebook/LinkedIn/Twitter)
    this.meta.updateTag({ property: 'og:title', content: post.title });
    this.meta.updateTag({ property: 'og:image', content: post.image });
    this.meta.updateTag({ property: 'og:url', content: post.url });
  }
}