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
/**
 * Registry of all available adapters
 */
export declare const adapters: SiteAdapter[];
/**
 * Find an adapter that can handle the given URL
 * @param url - The page URL
 * @returns The matching adapter or undefined
 */
export declare function findAdapter(url: string): SiteAdapter | undefined;
export default adapters;
//# sourceMappingURL=index.d.ts.map