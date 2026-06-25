import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-social-verify',
  imports: [ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe, CommonModule, FormsModule,],
  templateUrl: './social-verify.html',
  styleUrl: './social-verify.scss',
})
export class SocialVerify {
  activeVerify: 'twitter' | 'instagram' | 'tiktok' | null = null;
  verifyMethod: 'oauth' | 'dm' = 'oauth';
  dmHandle = '';
  dmCode = '';
  dmSent = false;

  officialHandles: Record<string, string> = {
    twitter: '@YourAppOfficial',
    instagram: '@yourapp.official',
    tiktok: '@yourappofficial',
  };



  twitter = { verified: false, handle: 'johndoe', followers: 12400 };
  instagram = { verified: false, handle: '', followers: 0 };
  tiktok = { verified: false, handle: '', followers: 0 };

  

  get connectedCount() {
    return [this.twitter, this.instagram, this.tiktok]
      .filter(p => p.verified).length;
  }

  openVerify(platform: 'twitter' | 'instagram' | 'tiktok') {
    this.activeVerify = platform;
    this.verifyMethod = 'oauth';
    this.dmHandle = '';
    this.dmCode = '';
    this.dmSent = false;
  }

  closeVerify() { this.activeVerify = null; }

  requestDM() { this.dmSent = true; }

  connectOAuth() { /* trigger OAuth flow */ }

  verifyDMCode() { /* call API to verify code */ }

  disconnect(platform: string) { /* call API */ }
}
