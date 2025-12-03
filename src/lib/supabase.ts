import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = (url && anonKey) ? createClient(url, anonKey) : null

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey)
}

export function assertSupabaseEnv() {
  // Keep for server-side use; avoid throwing in client during import.
  return !!(url && anonKey)
}