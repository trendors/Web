import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-wrap" *ngIf="visible">
      <div class="dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p class="label" *ngIf="label">{{ label }}</p>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500&display=swap');

    .loader-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 1.2s ease-in-out infinite;
    }

    .dots span:nth-child(2) { animation-delay: .2s; }
    .dots span:nth-child(3) { animation-delay: .4s; }

    @keyframes pulse {
      0%, 80%, 100% { transform: scale(.6); opacity: .25; }
      40%            { transform: scale(1);  opacity: 1; }
    }

    .label {
      font-family: 'Syne', sans-serif;
      font-size: 11px;
      letter-spacing: .15em;
      text-transform: uppercase;
      color: rgba(255,255,255,.45);
      margin: 0;
    }
  `]
})
export class LoaderComponent {
  @Input() visible = true;
  @Input() label = '';
}