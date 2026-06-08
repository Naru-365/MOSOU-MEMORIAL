'use client';

import { useCloudSync } from '@/lib/cloud-sync';

/** Mounts the cloud-sync side effect once. Renders nothing. */
export function CloudSyncProvider() {
  useCloudSync();
  return null;
}
