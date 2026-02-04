import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-campaign',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-campaign.html',
  styleUrl: './create-campaign.scss',
})
export class CreateCampaign {

  // Signals
  selectedType = signal<'paid' | 'free' | null>(null);
  campaignTitle = signal('');
  campaignDescription = signal('');
  campaignCategory = signal('');
  shareCount = signal(0);
  selectedImages = signal<any[]>([]);
  isSubmitting = signal(false);
  isDragging = signal(false);

  constructor(private http: HttpClient) {}

  // Computed values
  get titleCharCount() {
    return this.campaignTitle().length;
  }

  get descCharCount() {
    return this.campaignDescription().length;
  }

  get totalBudget() {
    return this.shareCount() * 1000;
  }

  get isFormValid() {
    const title = this.campaignTitle().trim();
    const description = this.campaignDescription().trim();
    const hasImages = this.selectedImages().length > 0;
    const hasType = this.selectedType() !== null;
    
    let isValid = title && description && hasImages && hasType;
    
    if (this.selectedType() === 'paid') {
      isValid = isValid && this.shareCount() >= 10;
    }
    
    return isValid;
  }

  get showPreview() {
    return this.campaignTitle().trim() || 
           this.campaignDescription().trim() || 
           this.selectedImages().length > 0;
  }

  // Campaign Type Selection
  selectCampaignType(type: 'paid' | 'free') {
    this.selectedType.set(type);
  }

  // File Handling
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  handleFiles(files: File[]) {
    const currentImages = this.selectedImages();
    
    if (currentImages.length + files.length > 4) {
      alert('Maximum 4 images allowed');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Max 5MB per image.`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: any = {
          file,
          url: e.target?.result as string
        };
        this.selectedImages.update(images => [...images, newImage]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    this.selectedImages.update(images => 
      images.filter((_, i) => i !== index)
    );
  }

  triggerFileInput() {
    document.getElementById('imageInput')?.click();
  }

  // Form Submission
  async createCampaign() {
    if (!this.isFormValid) return;

    this.isSubmitting.set(true);

    const formData = new FormData();
    formData.append('title', this.campaignTitle());
    formData.append('description', this.campaignDescription());
    formData.append('category', this.campaignCategory());
    formData.append('type', this.selectedType()!);

    if (this.selectedType() === 'paid') {
      formData.append('shareCount', this.shareCount().toString());
      formData.append('totalBudget', this.totalBudget.toString());
    }

    this.selectedImages().forEach((img) => {
      formData.append('images', img.file);
    });

    try {
      const response = await this.http.post('/api/campaigns', formData).toPromise();
      
      alert(`✅ Campaign created successfully!${
        this.selectedType() === 'paid' 
          ? ` Total: ₦${this.totalBudget.toLocaleString()}` 
          : ''
      }`);
      
      // Navigate to campaigns list
      // this.router.navigate(['/campaigns']);
      
    } catch (error: any) {
      alert(`❌ Error: ${error.message || 'Failed to create campaign'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel() {
    // Navigate back
    // this.router.navigate(['/campaigns']);
    window.history.back();
}
}