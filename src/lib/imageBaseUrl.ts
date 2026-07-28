import { createContext, useContext } from 'react';

/**
 * The CDN that actually serves listing photos.
 *
 * Carried by context rather than props because the consumers sit at opposite
 * ends of the tree — a virtualized card deep inside the rail and the detail
 * panel — and neither path should have to thread a config value through.
 */
const ImageBaseUrlContext = createContext<string | undefined>(undefined);

export const ImageBaseUrlProvider = ImageBaseUrlContext.Provider;

export function useImageBaseUrl(): string | undefined {
  return useContext(ImageBaseUrlContext);
}
