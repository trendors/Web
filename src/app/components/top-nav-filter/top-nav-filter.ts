import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-top-nav-filter',
  imports: [MatIconModule,
    MatCardModule,
    MatInputModule,],
  templateUrl: './top-nav-filter.html',
  styleUrl: './top-nav-filter.scss',
})
export class TopNavFilter {
   // 1. Data Source
  categories: string[] = ['Design', 'Technology', 'Marketing', 'Business', 'Lifestyle', 'Coding', 'Art', 'Health', 'Travel', 'Food'];

  // 2. Filter States
  onlyPaid: boolean = false;
  selectedCats: Set<string> = new Set(); // Using a Set makes toggling extremely fast

  // 3. Toggle the Paid Filter
  togglePaid() {
    this.onlyPaid = !this.onlyPaid;
    this.applyFilters();
  }

  // 4. Toggle Categories (Multi-select)
  toggleCategory(cat: string) {
    if (this.selectedCats.has(cat)) {
      this.selectedCats.delete(cat);
    } else {
      this.selectedCats.add(cat);
    }
    this.applyFilters();
  }

  // 5. Apply the Logic
  applyFilters() {
    const filters = {
      isPaid: this.onlyPaid,
      categories: Array.from(this.selectedCats) // Convert Set back to Array for the API
    };

    console.log('Current Filters Applied:', filters);
    
    // Here you would call your service, e.g.:
    // this.postService.getFilteredPosts(filters).subscribe(...);
  }
}
