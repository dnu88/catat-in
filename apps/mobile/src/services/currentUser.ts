import { supabase } from '../lib/supabase'

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('User not authenticated')
  }
  return data.user.id
}
