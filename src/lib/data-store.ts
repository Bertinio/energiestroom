import { initialDemoData } from '../data/demo'
import type { Activity, ActivityCategory, AppData, DailyCheckIn, EveningReflection, PlannedActivity } from '../types'
import { supabase } from './supabase'

const storageKey = 'energiestroom-demo-v1'

export function loadLocalData(): AppData {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? (JSON.parse(saved) as AppData) : structuredClone(initialDemoData)
  } catch {
    return structuredClone(initialDemoData)
  }
}

export function saveLocalData(data: AppData): void {
  localStorage.setItem(storageKey, JSON.stringify(data))
}

export async function loadRemoteData(userId: string): Promise<AppData> {
  if (!supabase) throw new Error('Supabase is niet geconfigureerd.')
  const [activityResult, checkInResult, planResult, reflectionResult] = await Promise.all([
    supabase.from('activities').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('daily_check_ins').select('*').eq('user_id', userId).order('check_in_date'),
    supabase.from('planned_activities').select('*').eq('user_id', userId).order('planned_date'),
    supabase.from('evening_reflections').select('*').eq('user_id', userId).order('reflection_date'),
  ])
  const error = activityResult.error ?? checkInResult.error ?? planResult.error ?? reflectionResult.error
  if (error) throw error

  const customActivities: Activity[] = (activityResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    energyCost: row.energy_cost,
    energyGain: row.energy_gain,
    category: row.category as ActivityCategory,
    description: row.description,
    isCustom: true,
  }))

  return {
    activities: [...initialDemoData.activities, ...customActivities],
    checkIns: (checkInResult.data ?? []).map(
      (row): DailyCheckIn => ({
        id: row.id,
        date: row.check_in_date,
        energy: row.energy,
        asksEnergy: row.asks_energy,
        givesEnergy: row.gives_energy,
        createdAt: row.created_at,
      }),
    ),
    plans: (planResult.data ?? []).map(
      (row): PlannedActivity => ({
        id: row.id,
        activityId: row.activity_id,
        date: row.planned_date,
        completed: row.completed,
      }),
    ),
    reflections: (reflectionResult.data ?? []).map(
      (row): EveningReflection => ({
        id: row.id,
        date: row.reflection_date,
        gaveEnergy: row.gave_energy,
        costEnergy: row.cost_energy,
        feeling: row.feeling,
        createdAt: row.created_at,
      }),
    ),
  }
}

export async function saveCheckIn(userId: string, checkIn: DailyCheckIn): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('daily_check_ins').upsert(
    {
      user_id: userId,
      check_in_date: checkIn.date,
      energy: checkIn.energy,
      asks_energy: checkIn.asksEnergy,
      gives_energy: checkIn.givesEnergy,
    },
    { onConflict: 'user_id,check_in_date' },
  )
  if (error) throw error
}

export async function saveReflection(userId: string, reflection: EveningReflection): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('evening_reflections').upsert(
    {
      user_id: userId,
      reflection_date: reflection.date,
      gave_energy: reflection.gaveEnergy,
      cost_energy: reflection.costEnergy,
      feeling: reflection.feeling,
    },
    { onConflict: 'user_id,reflection_date' },
  )
  if (error) throw error
}

export async function savePlan(userId: string, activityId: string, date: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('planned_activities')
    .insert({ user_id: userId, activity_id: activityId, planned_date: date, completed: false })
  if (error) throw error
}
