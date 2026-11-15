// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-onboarding',
//   imports: [],
//   templateUrl: './onboarding.html',
//   styleUrl: './onboarding.scss',
// })
// export class Onboarding {

// }


import { CreateUserDto, UserService } from '../../core/api';
import { environment } from '../../../environments/environment';
import { Observable, finalize } from 'rxjs';

type AccountType = 'creator' | 'brand';
type StepId = 'welcome' | 'type' | 'details';


interface OnboardingData {
  accountType: AccountType | null;
  // creator
  firstName: string;
  lastName: string;
  // brand
  brandName: string;
  contactName: string;
  // shared
  phoneNumber: string;
  email: string;
  password: string;
}

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output, inject, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
   selector: 'app-onboarding',
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding implements OnInit {
 @Output() completed = new EventEmitter<OnboardingData>();

  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  // The app renders without zone.js: plain fields changed in an HTTP callback do not redraw on their own.
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  resendState: 'idle' | 'sending' | 'sent' | 'error' = 'idle';
  private readonly onboardingCompletedKey = 'trendors_onboarding_completed';

  isSaving = false;
  saveError = '';
  activationSent = false;
 
  data: OnboardingData = {
    accountType: null,
    firstName: '',
    lastName: '',
    brandName: '',
    contactName: '',
    phoneNumber: '',
    email: '',
    password: '',
  };
 
  private stepIndex = 0;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {

        if (isPlatformBrowser(this.platformId)) {
          const wantsNewAccount = this.route.snapshot.queryParamMap.has('signup');
          if (!wantsNewAccount && localStorage.getItem(this.onboardingCompletedKey) === 'true') {
            this.router.navigate(['/login']);
          }
        }


    // if (localStorage.getItem(this.onboardingCompletedKey) === 'true') {
    //   this.router.navigate(['/login']);
    // }


  }
 
  // The "goal" step only makes sense for creators — a brand is obviously
  // there to run campaigns, so their flow skips it.
  get steps(): StepId[] {
    return ['welcome', 'type', 'details'];
  }
 
  get currentStep(): StepId {
    return this.steps[this.stepIndex];
  }
 
  get progressPercent(): number {
    return ((this.stepIndex + 1) / this.steps.length) * 100;
  }
 
  get isLastStep(): boolean {
    return this.stepIndex === this.steps.length - 1;
  }
 
  get canContinue(): boolean {
    switch (this.currentStep) {
      case 'type':
        return this.data.accountType !== null;
      case 'details':
        if (this.data.accountType === 'brand') {
          return (
            this.data.brandName.trim().length > 0 &&
            this.data.contactName.trim().length > 0 &&
            this.data.email.trim().length > 0 &&
            this.data.password.length >= 8
          );
        }
        return (
          this.data.firstName.trim().length > 0 &&
          this.data.lastName.trim().length > 0 &&
          this.data.email.trim().length > 0 &&
          this.data.password.length >= 8
        );
      default:
        return true;
    }
  }
 
  selectAccountType(type: AccountType): void {
    this.data.accountType = type;
  }
 
  next(): void {
    if (!this.canContinue || this.isSaving) return;
    if (!this.isLastStep) {
      this.stepIndex++;
    } else {
      this.saveAndSendActivation();
    }
  }
 
  back(): void {
    if (this.stepIndex > 0) this.stepIndex--;
  }

  /** Ask for another activation link; the server answers the same whether or not the account exists. */
  resend(): void {
    if (this.resendState === 'sending') return;
    this.resendState = 'sending';
    this.http.post(`${environment.apiUrl}/user/resend-verification`, { email: this.data.email.trim() }).subscribe({
      next: () => { this.resendState = 'sent'; this.cdr.markForCheck(); },
      error: () => { this.resendState = 'error'; this.cdr.markForCheck(); },
    });
  }

  login(){
    this.router.navigate(['/login']);
  }

  saveUser(credentials?: {
    email?: string;
    password?: string;
    user_name?: string;
  }): Observable<any> {
    const email = credentials?.email || this.data.email;
    const password = credentials?.password || this.data.password;

    const payload: CreateUserDto = {
      user_name: credentials?.user_name || email.split('@')[0],
      phone_number: this.data.phoneNumber || undefined,
      email,
      password,
      first_name:
        this.data.accountType === 'brand'
          ? this.data.contactName
          : this.data.firstName,
      last_name: this.data.accountType === 'brand' ? undefined : this.data.lastName,
      brand_name: this.data.accountType === 'brand' ? this.data.brandName.trim() : undefined,
      profileType:
        this.data.accountType === 'brand'
          ? CreateUserDto.ProfileTypeEnum.Brand
          : CreateUserDto.ProfileTypeEnum.Influencer,
    };

    return this.userService.userControllerCreate(payload);
  }

  private saveAndSendActivation(): void {
    this.isSaving = true;
    this.saveError = '';

    this.saveUser()
      .pipe(finalize(() => { this.isSaving = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (response) => {
          if (response?.error) {
            this.saveError = response.message || 'Unable to create your account.';
            this.cdr.markForCheck();
            return;
          }

          localStorage.setItem(this.onboardingCompletedKey, 'true');
          this.activationSent = true;
          this.completed.emit(this.data);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.saveError =
            error?.error?.message || error?.message || 'Unable to create your account.';
          this.cdr.markForCheck();
        },
      });
  }
}