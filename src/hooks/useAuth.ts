import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  message: string
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function sendMagicLink(email: string): Promise<void> {
    if (!supabase) {
      setMessage('Demo-modus is actief; er wordt geen e-mail verstuurd.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) throw error
    setMessage('Controleer je e-mail voor een veilige inloglink.')
  }

  async function signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
  }

  return { session, loading, message, sendMagicLink, signOut }
}
