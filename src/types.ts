export const activityCategories = [
  'Rust',
  'Beweging',
  'Huishouden',
  'Werk',
  'Creativiteit',
  'Gezin',
  'Buiten',
  'Ontspanning',
] as const

export type ActivityCategory = (typeof activityCategories)[number]

export interface Activity {
  id: string
  name: string
  energyCost: number
  energyGain: number
  category: ActivityCategory
  description: string
  isCustom?: boolean
}

export interface DailyCheckIn {
  id: string
  date: string
  energy: number
  asksEnergy: string
  givesEnergy: string
  createdAt: string
}

export interface PlannedActivity {
  id: string
  activityId: string
  date: string
  completed: boolean
}

export interface EveningReflection {
  id: string
  date: string
  gaveEnergy: string
  costEnergy: string
  feeling: number
  createdAt: string
}

export interface AppData {
  activities: Activity[]
  checkIns: DailyCheckIn[]
  plans: PlannedActivity[]
  reflections: EveningReflection[]
}

export type AppPage = 'vandaag' | 'bibliotheek' | 'planner' | 'reflectie' | 'inzichten'
