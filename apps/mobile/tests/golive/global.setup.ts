import type { FullConfig } from '@playwright/test';

import { getGoLiveCredentials, loadGoLiveEnv, optionalBool } from './env';
import { cleanupGoLiveUserData, createSupabaseAdmin, ensureGoLiveUser } from './supabase-admin';

async function globalSetup(_config: FullConfig) {
  loadGoLiveEnv();
  const credentials = getGoLiveCredentials();
  const admin = createSupabaseAdmin();
  const user = await ensureGoLiveUser(admin, credentials.email, credentials.password);

  if (!optionalBool('KASWISE_GOLIVE_SKIP_CLEANUP')) {
    await cleanupGoLiveUserData(admin, user.id);
  }

  process.env.KASWISE_GOLIVE_USER_ID = user.id;
}

export default globalSetup;
