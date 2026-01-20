import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// main.ts
import { provideTimeago } from 'ngx-timeago';



bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
