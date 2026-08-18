import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-application-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.scss',
})
export class ApplicationDetail {
  // @Input() application: any | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submitLink = new EventEmitter<{ id: string; link: string }>();

  readonly dialogRef = inject(MatDialogRef<ApplicationDetail>);
  readonly application = inject<any>(MAT_DIALOG_DATA);

  ngOnInit(): void {
    console.log(this.application, "see these applications");
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  postLink = '';

  onSubmit(): void {
    if (!this.application || !this.postLink.trim()) return;
    this.submitLink.emit({ id: this.application.id, link: this.postLink.trim() });
    this.postLink = '';
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

}
