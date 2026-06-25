import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./components/header/header";
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('trendors-web-frontend');
}
