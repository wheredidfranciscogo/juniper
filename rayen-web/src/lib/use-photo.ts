/**
 * Resolve a stored photo reference to something an <img> can use.
 *
 * `plant.photos[].uri` is an `idb:` reference, not a URL, so it has to be read out of
 * IndexedDB and wrapped in an object URL before it can be displayed. Object URLs pin
 * their Blob in memory until revoked, and a grid of plants mounts and unmounts these
 * constantly while scrolling, so the revoke on cleanup is load-bearing rather than
 * tidiness — without it, browsing a garden of photographed plants leaks every image.
 */

import * as React from 'react';

import { isStoredPhoto, loadPhoto } from './photos';

export function usePhotoURL(uri: string | undefined): string | undefined {
  const [url, setUrl] = React.useState<string | undefined>(
    // A plain url (data:, http:, blob:) needs no resolving and is usable immediately,
    // which also avoids a frame of fallback illustration for imported gardens.
    uri && !isStoredPhoto(uri) ? uri : undefined,
  );

  React.useEffect(() => {
    if (!uri) {
      setUrl(undefined);
      return;
    }
    if (!isStoredPhoto(uri)) {
      setUrl(uri);
      return;
    }

    let objectUrl: string | undefined;
    let cancelled = false;

    loadPhoto(uri).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri]);

  return url;
}
