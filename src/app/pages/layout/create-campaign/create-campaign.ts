// import { CommonModule } from '@angular/common';
// import { HttpClient } from '@angular/common/http';
// import { Component, inject, signal } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { Store } from '@ngrx/store';
// import { CampaignActions } from '../../../store/campaign/campaign.action';
// import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
// import { take } from 'rxjs';

// @Component({
//   selector: 'app-create-campaign',
//   imports: [CommonModule, FormsModule],
//   templateUrl: './create-campaign.html',
//   styleUrl: './create-campaign.scss',
// })
// export class CreateCampaign {

//   private store = inject(Store);
//   user$ = this.store.select(selectCurrentUser);

//   selectedType = signal<'paid' | 'free' | null>(null);
//   campaignTitle = signal('');
//   campaignDescription = signal('');
//   campaignCategory = signal('');
//   shareCount = signal(0);
//   selectedImages = signal<any[]>([]);
//   isSubmitting = signal(false);
//   isDragging = signal(false);
//   isFormValid: any;
//   totalBudget: any;

//   ngOnInit() {
//     this.user$.subscribe(user => {
//       if (!user) {
//         window.history.back();
//       }
//     }
//     );
//   }

//   currentPage = 0;
//   uploadedFiles: File[] = [];
//   uploadedFilesDisplay = '';
//   hashtags: string[] = [];
//   newTopic = '';
//   autoGenerate = true;
//   autoAssignTier = true;
//   selectedPlatforms: string[] = [];
//   selectedPlan?: any;
//   selectedAccess?: any;

//   formData: any = {
//     name: '',
//     description: '',
//     link: '',
//     language: 'English',
//     mediaType: 'Image',
//     startDate: '',
//     endDate: ''
//   };

//   platforms = [
//     { id: 'p-tw', name: 'Twitter', emoji: '𝕏' },
//     { id: 'p-ig', name: 'Instagram', emoji: '📸' },
//     { id: 'p-tt', name: 'TikTok', emoji: '🎵' },
//     { id: 'p-fb', name: 'Facebook', emoji: '👥' }
//   ];

//   plans: any[] = [
//     {
//       id: 's',
//       name: 'Starter',
//       displayName: 'Starter',
//       price: '₦30,000',
//       priceSuffix: 'mo',
//       posts: '100 posts included',
//       features: ['All tiers', 'Open campaigns', 'Basic analytics']
//     },
//     {
//       id: 'g',
//       name: 'Growth',
//       displayName: '★ Growth',
//       price: '₦50,000',
//       priceSuffix: 'mo',
//       posts: '200 posts included',
//       features: ['Custom rates', 'All access types', 'Full analytics']
//     },
//     {
//       id: 'e',
//       name: 'Enterprise',
//       displayName: 'Enterprise',
//       price: 'Custom',
//       posts: 'Unlimited posts',
//       features: ['Dedicated manager', 'Priority payout', 'Custom tiers']
//     }
//   ];

//   accessTypes: any[] = [
//     { id: 'o', name: 'Open', icon: '🌍', desc: 'Anyone can join and share' },
//     { id: 'i', name: 'Invite Only', icon: '📩', desc: 'You handpick who participates' },
//     { id: 'a', name: 'Application', icon: '📋', desc: 'Sharers apply, you approve' }
//   ];

//   payoutTiers: any[] = [
//     { name: 'Nano', range: '0 – 9,999 followers', amount: '₦500', color: 'var(--nano)' },
//     { name: 'Micro', range: '10,000 – 49,999 followers', amount: '₦2,000', color: 'var(--micro)' },
//     { name: 'Macro', range: '50,000 – 499,999 followers', amount: '₦10,000', color: 'var(--macro)' },
//     { name: 'Mega', range: '500,000+ followers', amount: '₦50,000', color: 'var(--mega)' }
//   ];

//   constructor() {
//     // Set default selections
//     this.selectedPlan = this.plans[1]; // Growth
//     this.selectedAccess = this.accessTypes[0]; // Open
//   }

//   // Navigation
//   next(): void {
//     if (this.currentPage < 3) {
//       this.currentPage++;
//     }
//   }

//   prev(): void {
//     if (this.currentPage > 0) {
//       this.currentPage--;
//     }
//   }

//   goTo(page: number): void {
//     this.currentPage = page;
//   }

//   // Character count
//   updateChar(event: Event, spanId: string, max: number): void {
//     const input = event.target as HTMLInputElement | HTMLTextAreaElement;
//     const span = document.getElementById(spanId);
//     if (span) {
//       span.textContent = input.value.length.toString();
//     }
//   }

//   // Date inputs
//   onDateFocus(event: FocusEvent): void {
//     const input = event.target as HTMLInputElement;
//     input.type = 'date';
//   }

//   onDateBlur(event: FocusEvent): void {
//     const input = event.target as HTMLInputElement;
//     if (!input.value) {
//       input.type = 'text';
//     }
//   }

//   // File handling
//   onDrop(event: DragEvent): void {
//     event.preventDefault();
//     const files = event.dataTransfer?.files;
//     if (files) {
//       this.handleFiles(files);
//     }
//   }

//   onDragOver(event: DragEvent): void {
//     event.preventDefault();
//   }

//   handleFiles(files: FileList): void {
//     this.uploadedFiles = Array.from(files).slice(0, 10);
//     this.uploadedFilesDisplay = this.uploadedFiles.map(f => f.name).join(', ');
//   }

//   // Topics/Hashtags
//   onTopicKeydown(event: KeyboardEvent): void {
//     if (event.key === 'Enter') {
//       event.preventDefault();
//       this.addTopic();
//     }
//   }

//   addTopic(): void {
//     if (!this.newTopic.trim() || this.hashtags.length >= 4) return;
//     let tag = this.newTopic.trim().replace(/^#/, '');
//     if (!tag) return;
//     tag = '#' + tag;
//     this.hashtags.push(tag);
//     this.newTopic = '';
//   }

//   removeTopic(index: number): void {
//     this.hashtags.splice(index, 1);
//   }

//   // Platform selection
//   onPlatformChange(event: Event): void {
//     const checkbox = event.target as HTMLInputElement;
//     if (checkbox.checked) {
//       this.selectedPlatforms.push(checkbox.value);
//     } else {
//       const index = this.selectedPlatforms.indexOf(checkbox.value);
//       if (index > -1) {
//         this.selectedPlatforms.splice(index, 1);
//       }
//     }
//   }

//   // Auto-generate toggle
//   onAutoGenerateChange(event: Event): void {
//     this.autoGenerate = (event.target as HTMLInputElement).checked;
//   }

//   // Plan selection
//   onPlanChange(plan: any): void {
//     this.selectedPlan = plan;
//   }

//   // Access type selection
//   onAccessChange(access: any): void {
//     this.selectedAccess = access;
//   }

//   // Auto-assign tier toggle
//   onAutoAssignChange(event: Event): void {
//     this.autoAssignTier = (event.target as HTMLInputElement).checked;
//   }

//   // Form field updates (add these to your inputs with (ngModel))
//   updateFormData(field: keyof FormData, value: string): void {
//     this.formData[field] = value;
//   }

//   // Launch campaign
//   launchCampaign(): void {
//     console.log('Campaign launched!', {
//       basics: this.formData,
//       content: {
//         files: this.uploadedFiles,
//         platforms: this.selectedPlatforms,
//         hashtags: this.hashtags,
//         autoGenerate: this.autoGenerate
//       },
//       plan: {
//         selectedPlan: this.selectedPlan,
//         accessType: this.selectedAccess,
//         autoAssignTier: this.autoAssignTier
//       }
//     });
//     // Add your API call here
//     alert('Campaign launched successfully!');
//   }

//   // handleFiles(files: File[]) {
//   //   const currentImages = this.selectedImages();

//   //   if (currentImages.length + files.length > 4) {
//   //     alert('Maximum 4 images allowed');
//   //     return;
//   //   }

//   //   files.forEach(file => {
//   //     if (file.size > 5 * 1024 * 1024) {
//   //       alert(`${file.name} is too large. Max 5MB per image.`);
//   //       return;
//   //     }

//   //     if (!file.type.startsWith('image/')) {
//   //       alert(`${file.name} is not an image file.`);
//   //       return;
//   //     }

//   //     const reader = new FileReader();
//   //     reader.onload = (e) => {
//   //       const newImage: any = {
//   //         file,
//   //         url: e.target?.result as string
//   //       };
//   //       this.selectedImages.update(images => [...images, newImage]);
//   //     };
//   //     reader.readAsDataURL(file);
//   //   });
//   // }

//   removeImage(index: number) {
//     this.selectedImages.update(images =>
//       images.filter((_, i) => i !== index)
//     );
//   }

//   triggerFileInput() {
//     document.getElementById('imageInput')?.click();
//   }

//   // Form Submission
//   async createCampaign() {
//     if (!this.isFormValid) return;

//     this.isSubmitting.set(true);

//     const formData = new FormData();
//     formData.append('title', this.campaignTitle());
//     formData.append('description', this.campaignDescription());
//     formData.append('category', this.campaignCategory());
//     formData.append('type', this.selectedType()!);
//     formData.append('creator_id', (await this.user$.pipe(take(1)).toPromise())?.id.toString() || '');
//     formData.append('name', `${(await this.user$.pipe(take(1)).toPromise())?.first_name || 'default_id'}` + `_${(await this.user$.pipe(take(1)).toPromise())?.last_name || 'default_id'}`);

//     if (this.selectedType() === 'paid') {
//       formData.append('shareCount', this.shareCount().toString());
//       formData.append('totalBudget', this.totalBudget.toString());
//     }

//     this.selectedImages().forEach((img) => {
//       formData.append('files', img.file);
//     });

//     try {

//       this.store.dispatch(CampaignActions.createCampaign({ dto: formData, files: this.selectedImages().map(img => img.file) }));

//     } catch (error: any) {
//       console.log(error)
//       alert(`❌ Error: ${error.message || 'Failed to create campaign'}`);
//     } finally {
//       this.isSubmitting.set(false);
//     }
//   }

//   cancel() {
//     window.history.back();
//   }
// }


import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CampaignFile {
  file: File;
  preview: string | null;
  icon: string;
  size: string;
}

interface Step {
  label: string;
  sub: string;
}

interface Plan {
  value: string;
  name: string;
  price: string;
  posts: string;
  label: string;
  features: string[];
}

interface Tier {
  name: string;
  range: string;
  amount: string;
  color: string;
}

@Component({
  selector: 'app-create-campaign',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-campaign.html',
  styleUrl: './create-campaign.scss',
})
export class CreateCampaign {

  // ── STEP STATE ─────────────────────────────────────────────────────────────
  currentStep = 0;
  totalSteps = 4;

  steps: Step[] = [
    { label: 'Basics',      sub: 'Name, dates, link' },
    { label: 'Content',     sub: 'Media & platforms' },
    { label: 'Plan & Access', sub: 'Subscription & sharers' },
    { label: 'Review',      sub: 'Confirm & launch' },
  ];

  get progressPct(): number {
    return Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
  }

  get nextLabel(): string {
    return this.currentStep === this.totalSteps - 2 ? 'Review →' : 'Continue →';
  }

  goTo(step: number): void {
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next(): void {
    if (this.currentStep < this.totalSteps - 1) this.goTo(this.currentStep + 1);
  }

  prev(): void {
    if (this.currentStep > 0) this.goTo(this.currentStep - 1);
  }

  // ── FORM: BASICS ───────────────────────────────────────────────────────────
  campaignName = '';
  description  = '';
  link         = '';
  language     = 'English';
  mediaType    = 'Image';
  startDate    = '';
  endDate      = '';

  languages  = ['English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa'];
  mediaTypes = ['Image', 'Video', 'Text Only'];

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // ── FORM: CONTENT ──────────────────────────────────────────────────────────
  files: CampaignFile[] = [];
  isDragging = false;

  platforms = [
    { id: 'tw', emoji: '𝕏',  name: 'Twitter',   selected: false },
    { id: 'ig', emoji: '📸', name: 'Instagram', selected: false },
    { id: 'tt', emoji: '🎵', name: 'TikTok',    selected: false },
    { id: 'fb', emoji: '👥', name: 'Facebook',  selected: false },
  ];

  get selectedPlatforms(): string[] {
    return this.platforms.filter(p => p.selected).map(p => p.name);
  }

  autoGenerate = true;
  topics: string[] = [];
  topicInput = '';

  addTopic(): void {
    let v = this.topicInput.trim();
    if (!v || this.topics.length >= 4) { this.topicInput = ''; return; }
    if (!v.startsWith('#')) v = '#' + v;
    if (!this.topics.includes(v)) this.topics.push(v);
    this.topicInput = '';
  }

  removeTopic(i: number): void {
    this.topics.splice(i, 1);
  }

  onTopicKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTopic();
    }
  }

  // File upload
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) this.addFiles(event.dataTransfer.files);
  }

  private addFiles(fileList: FileList): void {
    const incoming = Array.from(fileList);
    const combined = [...this.files.map(f => f.file), ...incoming].slice(0, 10);
    this.files = combined.map(f => this.buildCampaignFile(f));
  }

  private buildCampaignFile(f: File): CampaignFile {
    const isImage = f.type.startsWith('image/');
    return {
      file: f,
      preview: isImage ? URL.createObjectURL(f) : null,
      icon: f.type.startsWith('video/') ? '🎬' : f.type === 'application/pdf' ? '📄' : '📎',
      size: this.fmtSize(f.size),
    };
  }

  removeFile(i: number): void {
    this.files.splice(i, 1);
  }

  private fmtSize(b: number): string {
    if (b < 1024) return b + 'B';
    if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
    return (b / 1048576).toFixed(1) + 'MB';
  }

  // ── FORM: PLAN & ACCESS ────────────────────────────────────────────────────
  plans: Plan[] = [
    {
      value: 'Starter',
      name: 'Starter',
      price: '₦30,000',
      posts: '100 posts included',
      label: 'Starter — ₦30,000/mo',
      features: ['All tiers', 'Open campaigns', 'Basic analytics'],
    },
    {
      value: 'Growth',
      name: '★ Growth',
      price: '₦50,000',
      posts: '200 posts included',
      label: 'Growth — ₦50,000/mo',
      features: ['Custom rates', 'All access types', 'Full analytics'],
    },
    {
      value: 'Enterprise',
      name: 'Enterprise',
      price: 'Custom',
      posts: 'Unlimited posts',
      label: 'Enterprise — Custom',
      features: ['Dedicated manager', 'Priority payout', 'Custom tiers'],
    },
  ];

  selectedPlan = 'Growth';

  get activePlan(): Plan {
    return this.plans.find(p => p.value === this.selectedPlan) ?? this.plans[1];
  }

  accessTypes = [
    { value: 'Open',        icon: '🌍', title: 'Open',        desc: 'Anyone can join and share' },
    { value: 'Invite Only', icon: '📩', title: 'Invite Only', desc: 'You handpick who participates' },
    { value: 'Application', icon: '📋', title: 'Application', desc: 'Sharers apply, you approve' },
  ];

  selectedAccess = 'Open';
  autoAssignTier = true;

  tiers: Tier[] = [
    { name: 'Nano',  range: '0 – 9,999 followers',         amount: '₦500',    color: '#0ea5e9' },
    { name: 'Micro', range: '10,000 – 49,999 followers',   amount: '₦2,000',  color: '#8b5cf6' },
    { name: 'Macro', range: '50,000 – 499,999 followers',  amount: '₦10,000', color: '#f59e0b' },
    { name: 'Mega',  range: '500,000+ followers',          amount: '₦50,000', color: '#ef4444' },
  ];

  // ── LAUNCH ─────────────────────────────────────────────────────────────────
  onLaunch(): void {
    const payload = {
      name:           this.campaignName,
      description:    this.description,
      link:           this.link,
      language:       this.language,
      mediaType:      this.mediaType,
      startDate:      this.startDate,
      endDate:        this.endDate,
      platforms:      this.selectedPlatforms,
      topics:         this.topics,
      autoGenerate:   this.autoGenerate,
      files:          this.files.map(f => f.file.name),
      plan:           this.selectedPlan,
      access:         this.selectedAccess,
      autoAssignTier: this.autoAssignTier,
    };
    console.log('Campaign payload:', payload);
    // TODO: call your API service here
    alert('Campaign launched! Check console for payload.');
  }
}