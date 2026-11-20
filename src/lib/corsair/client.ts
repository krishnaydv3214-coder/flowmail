import { createClient } from '@corsair-dev/app';

const apiKey = process.env.CORSAIR_API_KEY || '';
const instanceId = process.env.NEXT_PUBLIC_CORSAIR_INSTANCE_ID || '';

// We are in real mode if both a valid developer key (ch_...) and an instance ID are present.
export const isMock = !apiKey || !instanceId;

let _client: ReturnType<typeof createClient> | null = null;

function getCorsairClient() {
  if (!_client) {
    if (isMock) return null;
    _client = createClient({ apiKey });
  }
  return _client;
}

/**
 * Get a tenant-scoped Corsair handle for the given userId.
 * Returns null if running in mock mode.
 */
export function getTenant(userId: string) {
  const client = getCorsairClient();
  if (!client || !instanceId) return null;
  return client.instance(instanceId).tenant(userId);
}
