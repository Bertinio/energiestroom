import { initialDemoData } from '../data/demo'
import { isValidDate, isValidEnergy, isValidText, normalizeDate, normalizeEnergy, normalizeText } from '../domain/validation'
import { activityCategories, type Activity, type ActivityCategory, type AppData, type DailyCheckIn, type EveningReflection, type PlannedActivity } from '../types'
import { supabase } from './supabase'

const storageKey = 'energiestroom-demo-v1'
const currentStorageSchemaVersion = 1

type StorageMigration = (value: unknown) => unknown

export type StorageIssueKind = 'invalid-data' | 'quota-exceeded' | 'unavailable'

export interface StorageIssue {
  kind: StorageIssueKind
  message: string
}

interface StorageReadResult {
  value: string | null
  issue: StorageIssue | null
}

export interface LocalDataLoadResult {
  data: AppData
  issue: StorageIssue | null
}

const storageMigrations: Record<number, StorageMigration> = {
  0: (data) => ({ schemaVersion: 1, data }),
}

function unavailableStorageIssue(): StorageIssue {
  return {
    kind: 'unavailable',
    message: 'Lokale opslag is niet beschikbaar. Je kunt de app blijven gebruiken, maar wijzigingen verdwijnen mogelijk wanneer je dit tabblad sluit.',
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException
    && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)
}

export function readLocalStorage(key: string): StorageReadResult {
  try {
    return { value: window.localStorage.getItem(key), issue: null }
  } catch {
    return { value: null, issue: unavailableStorageIssue() }
  }
}

export function writeLocalStorage(key: string, value: string): StorageIssue | null {
  try {
    window.localStorage.setItem(key, value)
    return null
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        kind: 'quota-exceeded',
        message: 'De lokale opslagruimte is vol. Je kunt verder werken, maar nieuwe wijzigingen worden mogelijk niet bewaard na een reload.',
      }
    }
    return unavailableStorageIssue()
  }
}

function fallbackData(): AppData {
  return structuredClone(initialDemoData)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return isValidText(value) && !Number.isNaN(Date.parse(value))
}

function isActivity(value: unknown): value is Activity {
  return isRecord(value)
    && isValidText(value.id)
    && isValidText(value.name)
    && isValidEnergy(value.energyCost)
    && isValidEnergy(value.energyGain)
    && isValidText(value.category)
    && activityCategories.includes(value.category as ActivityCategory)
    && isValidText(value.description)
    && (value.isCustom === undefined || typeof value.isCustom === 'boolean')
}

function isDailyCheckIn(value: unknown): value is DailyCheckIn {
  return isRecord(value)
    && isValidText(value.id)
    && isValidDate(value.date)
    && isValidEnergy(value.energy)
    && isValidText(value.asksEnergy)
    && isValidText(value.givesEnergy)
    && isTimestamp(value.createdAt)
}

function isPlannedActivity(value: unknown): value is PlannedActivity {
  return isRecord(value)
    && isValidText(value.id)
    && isValidText(value.activityId)
    && isValidDate(value.date)
    && typeof value.completed === 'boolean'
}

function isEveningReflection(value: unknown): value is EveningReflection {
  return isRecord(value)
    && isValidText(value.id)
    && isValidDate(value.date)
    && isValidText(value.gaveEnergy)
    && isValidText(value.costEnergy)
    && isValidEnergy(value.feeling)
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

export function loadLocalDataResult(): LocalDataLoadResult {
  const stored = readLocalStorage(storageKey)
  if (stored.issue) return { data: fallbackData(), issue: stored.issue }
  if (!stored.value) return { data: fallbackData(), issue: null }

  try {
    const data = migrateStoredData(JSON.parse(stored.value))
    if (data) return { data, issue: null }
  } catch {
    // Invalid JSON uses the same safe recovery path as an invalid schema.
  }

  return {
    data: fallbackData(),
    issue: {
      kind: 'invalid-data',
      message: 'Je opgeslagen gegevens konden niet veilig worden gelezen. Er is hersteld naar de demogegevens.',
    },
  }
}

export function loadLocalData(): AppData {
  return loadLocalDataResult().data
}

export function saveLocalData(data: AppData): StorageIssue | null {
  return writeLocalStorage(storageKey, JSON.stringify({
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
  const safeDate = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('daily_check_ins').upsert(
    {
      user_id: userId,
      check_in_date: normalizeDate(checkIn.date, safeDate),
      energy: normalizeEnergy(checkIn.energy),
      asks_energy: normalizeText(checkIn.asksEnergy),
      gives_energy: normalizeText(checkIn.givesEnergy),
    },
    { onConflict: 'user_id,check_in_date' },
  )
  if (error) throw error
}

export async function saveReflection(userId: string, reflection: EveningReflection): Promise<void> {
  if (!supabase) return
  const safeDate = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('evening_reflections').upsert(
    {
      user_id: userId,
      reflection_date: normalizeDate(reflection.date, safeDate),
      gave_energy: normalizeText(reflection.gaveEnergy),
      cost_energy: normalizeText(reflection.costEnergy),
      feeling: normalizeEnergy(reflection.feeling),
    },
    { onConflict: 'user_id,reflection_date' },
  )
  if (error) throw error
}

export async function savePlan(userId: string, activityId: string, date: string): Promise<void> {
  if (!supabase) return
  const safeDate = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('planned_activities')
    .insert({
      user_id: userId,
      activity_id: normalizeText(activityId),
      planned_date: normalizeDate(date, safeDate),
      completed: false,
    })
  if (error) throw error
}
