import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function requireAuth(): Promise<{
  user: User
  supabase: SupabaseClient
  companyId: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    throw new Error('UNAUTHORIZED')
  }

  return { user, supabase, companyId: profile.company_id }
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function serverErrorResponse(message = 'Internal Server Error') {
  return Response.json({ error: message }, { status: 500 })
}
