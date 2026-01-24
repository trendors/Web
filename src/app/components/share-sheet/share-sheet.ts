import { Component, Inject, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Observable } from 'rxjs';
import { UtilService } from '../../core/services/utility/utility.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe } from '@angular/common';



@Component({
  selector: 'app-share-sheet',
  imports: [
    MatListModule, MatIconModule, AsyncPipe
],
  templateUrl: './share-sheet.html',
  styleUrl: './share-sheet.scss',
})
export class ShareSheet {
  private utilService = inject(UtilService);

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: { post: any },
    private bottomSheetRef: MatBottomSheetRef<ShareSheet>) { }

  selectedVersionId = 1;

 shareVersions$!: Observable<any[]>;

  ngOnInit() {
    this.fetchAireWrite()
  }

  selectVersion(id: number) {
    this.selectedVersionId = id;
  }

  fetchAireWrite() {
    let text = this.data.post.text
    this.shareVersions$ = this.utilService.fetchAiRewrite(text);
  }

  copyLink() { }

  shareTo(url?: string) { }

  close() { }

}
