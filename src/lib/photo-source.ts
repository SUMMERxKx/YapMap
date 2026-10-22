/**
 * The image source for a photo URL. A signed URL's token changes whenever it is signed
 * again, so the cache key leaves the token out: the same photo then always comes from
 * the image cache instead of being downloaded again.
 */
export function photoSource(uri: string) {
  const [withoutToken] = uri.split('?');
  return { uri, cacheKey: withoutToken };
}
