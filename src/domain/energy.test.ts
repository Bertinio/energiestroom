import { describe, expect, it } from 'vitest'
import { demoActivities } from '../data/demo'
import { fitsEnergyLevel, getEnergyStatus, netEnergy } from './energy'

describe('energiestatus', () => {
  it.each([
    [0, 'Leeg'],
    [15, 'Leeg'],
    [16, 'Laag'],
    [35, 'Laag'],
    [36, 'Oké'],
    [60, 'Oké'],
    [61, 'Goed'],
    [85, 'Goed'],
    [86, 'Vol'],
    [100, 'Vol'],
  ])('zet %i om naar %s', (energy, status) => {
    expect(getEnergyStatus(energy)).toBe(status)
  })
})

describe('plannerfilter', () => {
  it('verbergt administratie bij lage energie', () => {
    const admin = demoActivities.find((activity) => activity.id === 'admin')
    expect(admin).toBeDefined()
    expect(fitsEnergyLevel(admin!, 20)).toBe(false)
  })

  it('laat een herstellende activiteit altijd zien', () => {
    const film = demoActivities.find((activity) => activity.id === 'film')
    expect(film).toBeDefined()
    expect(fitsEnergyLevel(film!, 0)).toBe(true)
  })

  it('berekent de voorbeeldwaarden als netto energie', () => {
    expect(netEnergy(demoActivities.find((activity) => activity.id === 'walk')!)).toBe(15)
    expect(netEnergy(demoActivities.find((activity) => activity.id === 'admin')!)).toBe(-20)
    expect(netEnergy(demoActivities.find((activity) => activity.id === 'film')!)).toBe(10)
    expect(netEnergy(demoActivities.find((activity) => activity.id === 'cooking')!)).toBe(5)
  })
})
