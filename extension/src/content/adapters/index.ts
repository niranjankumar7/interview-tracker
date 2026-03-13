/**
 * Adapters index
 * Exports all ATS platform adapters
 */

export { SiteAdapter, ExtractedJobData, AdapterTestCase, AdapterTestResult, RegistryEntry } from './types';
export { GreenhouseAdapter, greenhouseAdapter } from './greenhouse-adapter';
export { LeverAdapter, leverAdapter } from './lever-adapter';
export { AshbyAdapter } from './ashby-adapter';
export { SmartRecruitersAdapter } from './smartrecruiters-adapter';
export { LinkedInAdapter } from './linkedin-adapter';
export { GenericAdapter, genericAdapter } from './generic-adapter';

import { SiteAdapter } from './types';
import { GreenhouseAdapter } from './greenhouse-adapter';
import { LeverAdapter } from './lever-adapter';
import { AshbyAdapter } from './ashby-adapter';
import { SmartRecruitersAdapter } from './smartrecruiters-adapter';
import { LinkedInAdapter } from './linkedin-adapter';
import { GenericAdapter } from './generic-adapter';

/**
 * Registry of all available adapters
 */
export const adapters: SiteAdapter[] = [
  new GreenhouseAdapter(),
  new LeverAdapter(),
  new AshbyAdapter(),
  new SmartRecruitersAdapter(),
  new LinkedInAdapter(),
  new GenericAdapter(),
];

/**
 * Find an adapter that can handle the given URL
 * @param url - The page URL
 * @returns The matching adapter or undefined
 */
export function findAdapter(url: string): SiteAdapter | undefined {
  return adapters.find(adapter => {
    // Create a minimal document for URL-only check
    const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    const doc = parser?.parseFromString('<html><body></body></html>', 'text/html');
    return adapter.canHandle(url, doc || document);
  });
}

export default adapters;
