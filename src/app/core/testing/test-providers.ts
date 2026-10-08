import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY } from 'rxjs';
import { provideAppMockStore } from './mock-store';

/** Baseline providers every app component expects (router, store, actions, HTTP, animations). */
export function provideTestDefaults(): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideAppMockStore(),
    provideMockActions(() => EMPTY),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideNoopAnimations(),
  ];
}
