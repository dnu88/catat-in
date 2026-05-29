import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { optionalBool, requiredEnv } from './env';

type TestUser = {
  id: string;
  email: string;
};

const SAFE_EMAIL_PATTERN = /(golive|go-live|smoke|e2e|qa|test)/i;

export function assertSafeGoLiveEmail(email: string) {
  if (SAFE_EMAIL_PATTERN.test(email)) return;
  if (optionalBool('KASWISE_GOLIVE_ALLOW_UNSAFE_EMAIL')) return;

  throw new Error(
    `Refusing to clean live data for ${email}. Use a dedicated email containing golive/smoke/e2e/qa/test, or set KASWISE_GOLIVE_ALLOW_UNSAFE_EMAIL=true intentionally.`,
  );
}

export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) requiredEnv('SUPABASE_URL');
  if (!key) requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url || '', key || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<TestUser | null> {
  let page = 1;
  const perPage = 100;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found?.email) return { id: found.id, email: found.email };
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

export async function ensureGoLiveUser(admin: SupabaseClient, email: string, password: string): Promise<TestUser> {
  assertSafeGoLiveEmail(email);

  const existing = await findUserByEmail(admin, email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { purpose: 'kaswise-golive-smoke' },
    });
    if (error) throw error;
    return { id: data.user.id, email: data.user.email || email };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: 'kaswise-golive-smoke' },
  });
  if (error) throw error;
  if (!data.user.email) throw new Error(`Supabase created user ${data.user.id} without email`);
  return { id: data.user.id, email: data.user.email };
}

function isMissingTableOrColumn(error: { code?: string } | null) {
  return Boolean(error && ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code || ''));
}

async function deleteWhereUser(admin: SupabaseClient, table: string, userId: string) {
  const { error } = await admin.from(table).delete().eq('user_id', userId);
  if (error && !isMissingTableOrColumn(error)) throw error;
}

async function deleteWhereCreatedBy(admin: SupabaseClient, table: string, userId: string) {
  const { error } = await admin.from(table).delete().eq('created_by', userId);
  if (error && !isMissingTableOrColumn(error)) throw error;
}

export async function cleanupGoLiveUserData(admin: SupabaseClient, userId: string) {
  const { data: transactions, error: txSelectError } = await admin
    .from('transactions')
    .select('id')
    .or(`user_id.eq.${userId},created_by.eq.${userId}`);
  if (txSelectError && !isMissingTableOrColumn(txSelectError)) throw txSelectError;

  const transactionIds = (transactions || []).map((row: { id: string }) => row.id);
  if (transactionIds.length > 0) {
    const { error } = await admin
      .from('transaction_envelope_allocations')
      .delete()
      .in('transaction_id', transactionIds);
    if (error && !isMissingTableOrColumn(error)) throw error;
  }

  await deleteWhereUser(admin, 'transactions', userId);
  await deleteWhereCreatedBy(admin, 'transactions', userId);
  await deleteWhereUser(admin, 'budget_envelopes', userId);
  await deleteWhereCreatedBy(admin, 'budget_envelopes', userId);
  await deleteWhereUser(admin, 'budgets', userId);
  await deleteWhereCreatedBy(admin, 'budgets', userId);
  await deleteWhereUser(admin, 'bills', userId);
  await deleteWhereCreatedBy(admin, 'bills', userId);
  await deleteWhereUser(admin, 'wallets', userId);
  await deleteWhereCreatedBy(admin, 'wallets', userId);
}

export async function readGoLiveState(admin: SupabaseClient, userId: string) {
  const [{ data: wallets }, { data: transactions }, { data: envelopes }] = await Promise.all([
    admin.from('wallets').select('*').eq('user_id', userId),
    admin.from('transactions').select('*').eq('user_id', userId),
    admin.from('budget_envelopes').select('*').eq('user_id', userId),
  ]);

  const transactionIds = (transactions || []).map((row: { id: string }) => row.id);
  const { data: allocations } = transactionIds.length > 0
    ? await admin.from('transaction_envelope_allocations').select('*').in('transaction_id', transactionIds)
    : { data: [] };

  return {
    wallets: wallets || [],
    transactions: transactions || [],
    envelopes: envelopes || [],
    allocations: allocations || [],
  };
}
