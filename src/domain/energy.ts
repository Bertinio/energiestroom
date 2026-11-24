import type { Activity } from '../types'
import { normalizeEnergy } from './validation'

export type EnergyStatus = 'Leeg' | 'Laag' | 'Oké' | 'Goed' | 'Vol'

export function clampEnergy(value: unknown): number {
  return normalizeEnergy(value)
}

export function getEnergyStatus(value: number): EnergyStatus {
  const energy = clampEnergy(value)
  if (energy <= 15) return 'Leeg'
  if (energy <= 35) return 'Laag'
  if (energy <= 60) return 'Oké'
  if (energy <= 85) return 'Goed'
  return 'Vol'
}

export function netEnergy(activity: Activity): number {
  return normalizeEnergy(activity.energyGain, 0) - normalizeEnergy(activity.energyCost, 0)
}

export function fitsEnergyLevel(activity: Activity, energy: number): boolean {
  const available = clampEnergy(energy)
  const energyCost = normalizeEnergy(activity.energyCost, 0)
  if (energyCost === 0) return true
  const maximumCost = Math.max(10, Math.round(available * 0.55))
  return energyCost <= maximumCost
}

export function getGentleSuggestion(energy: number): string {
  const status = getEnergyStatus(energy)
  if (status === 'Leeg') return 'Vandaag mag herstel genoeg zijn. Kies iets kleins of juist helemaal niets.'
  if (status === 'Laag') return 'Bescherm wat er is. Een rustige activiteit kan al passend zijn.'
  if (status === 'Oké') return 'Er is wat ruimte. Kies één ding dat klopt met wat je nu nodig hebt.'
  if (status === 'Goed') return 'Je hebt ruimte, zonder die te hoeven vullen. Bewaar gerust iets voor later.'
  return 'Je voelt veel ruimte. Blijf ook luisteren naar je grenzen terwijl je kiest.'
}
