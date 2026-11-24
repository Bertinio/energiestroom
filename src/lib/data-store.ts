import { initialDemoData } from '../data/demo'
import { activityCategories, type Activity, type ActivityCategory, type AppData, type DailyCheckIn, type EveningReflection, type PlannedActivity } from '../types'
import { supabase } from './supabase'

const storageKey = 'energiestroom-demo-v1'
const currentStorageSchemaVersion = 1

type StorageMigration = (value: unknown) => unknown

const storageMigrations: Record<number, StorageMigration> = {
  0: (data) => ({ schemaVersion: 1, data }),
}

function fallbackData(): AppData {
  return structuredClone(initialDemoData)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isEnergyValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
}

function isDate(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isTimestamp(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value))
}

function isActivity(value: unknown): value is Activity {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isEnergyValue(value.energyCost)
    && isEnergyValue(value.energyGain)
    && isString(value.category)
    && activityCategories.includes(value.category as ActivityCategory)
    && isString(value.description)
    && (value.isCustom === undefined || typeof value.isCustom === 'boolean')
}

function isDailyCheckIn(value: unknown): value is DailyCheckIn {
  return isRecord(value)
    && isString(value.id)
    && isDate(value.date)
    && isEnergyValue(value.energy)
    && isString(value.asksEnergy)
    && isString(value.givesEnergy)
    && isTimestamp(value.createdAt)
}

function isPlannedActivity(value: unknown): value is PlannedActivity {
  return isRecord(value)
    && isString(value.id)
    && isString(value.activityId)
    && isDate(value.date)
    && typeof value.completed === 'boolean'
}

function isEveningReflection(value: unknown): value is EveningReflection {
  return isRecord(value)
    && isString(value.id)
    && isDate(value.date)
    && isString(value.gaveEnergy)
    && isString(value.costEnergy)
    && isEnergyValue(value.feeling)
    && isTimestamp(value.createdAt)
}

function isAppData(value: unknown): value is AppData {
  return isRecord(value)
    && Array.isArray(value.activities)
    && value.activities.every(isActivity)
    && Array.isArray(value.checkIns)
    && value.checkIns.every(isDailyCheckIn)
    && Array.isArray(value.plans)
    && value.plans.every(isPlannedActivity)
    && Array.isArray(value.reflections)
    && value.reflections.every(isEveningReflection)
}

function getSchemaVersion(value: unknown): number | null {
  if (!isRecord(value) || !Object.hasOwn(value, 'schemaVersion')) return 0
  return Number.isInteger(value.schemaVersion) && (value.schemaVersion as number) >= 0
    ? value.schemaVersion as number
    : null
}

function migrateStoredData(value: unknown): AppData | null {
  let migrated = value
  let version = getSchemaVersion(migrated)
  if (version === null || version > currentStorageSchemaVersion) return null

  while (version < currentStorageSchemaVersion) {
    const migration = storageMigrations[version]
    if (!migration) return null
    migrated = migration(migrated)
    const nextVersion = getSchemaVersion(migrated)
    if (nextVersion !== version + 1) return null
    version = nextVersion
  }

  if (!isRecord(migrated) || migrated.schemaVersion !== currentStorageSchemaVersion) return null
  return isAppData(migrated.data) ? migrated.data : null
}

export function loadLocalData(): AppData {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return fallbackData()
    return migrateStoredData(JSON.parse(saved)) ?? fallbackData()
  } catch {
    return fallbackData()
  }
}

export function saveLocalData(data: AppData): void {
  localStorage.setItem(storageKey, JSON.stringify({
    schemaVersion: currentStorageSchemaVersion,
    data,
  }))
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
