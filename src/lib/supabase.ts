import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          user_id: string
          name: string
          energy_cost: number
          energy_gain: number
          category: string
          description: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
        Relationships: []
      }
      daily_check_ins: {
        Row: {
          id: string
          user_id: string
          check_in_date: string
          energy: number
          asks_energy: string
          gives_energy: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_check_ins']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['daily_check_ins']['Insert']>
        Relationships: []
      }
      planned_activities: {
        Row: {
          id: string
          user_id: string
          activity_id: string
          planned_date: string
          completed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['planned_activities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['planned_activities']['Insert']>
        Relationships: []
      }
      evening_reflections: {
        Row: {
          id: string
          user_id: string
          reflection_date: string
          gave_energy: string
          cost_energy: string
          feeling: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['evening_reflections']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['evening_reflections']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient<Database> | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
