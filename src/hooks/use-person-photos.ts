import { useEffect, useState } from 'react';

import * as api from '@/data/api';
import type { NearbyPerson } from '@/data/types';

/**
 * A person's extra photos as display URLs. Lists only sign profile pictures, so these
 * are signed here, when someone actually opens the profile.
 */
export function usePersonPhotos(person: NearbyPerson): string[] {
  const [signed, setSigned] = useState<{ key: string; urls: string[] }>({ key: '', urls: [] });
  // A new array arrives with every nearby refresh; the joined paths only change with the photos.
  const pathsKey = person.photoPaths.join('|');

  useEffect(() => {
    if (pathsKey === '') return;
    let cancelled = false;
    api.signPhotos(pathsKey.split('|')).then(
      (urls) => {
        if (!cancelled) setSigned({ key: pathsKey, urls });
      },
      () => {
        // Offline: the profile shows without its extra photos.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  // Your own profile (and anything else already signed) comes with its URLs.
  if (person.photos.length > 0) return person.photos;
  if (signed.key !== pathsKey) return [];
  return signed.urls;
}
