import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialDemoData } from '../data/demo'
import { loadLocalData, loadLocalDataResult, saveLocalData } from './data-store'

const storageKey = 'energiestroom-demo-v1'

describe('lokale dataopslag', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['een leeg object', {}],
    ['null', null],
    [
      'ontbrekende arrays',
      {
        schemaVersion: 1,
        data: {
          activities: [],
        },
      },
    ],
    [
      'verkeerde datatypes',
      {
        schemaVersion: 1,
        data: {
          activities: 'geen array',
          checkIns: [],
          plans: {},
          reflections: [],
        },
      },
    ],
  ])('valt veilig terug op demo-data voor %s', (_name, storedValue) => {
    localStorage.setItem(storageKey, JSON.stringify(storedValue))

    expect(loadLocalData()).toEqual(initialDemoData)
  })

  it('valt veilig terug op demo-data voor corrupte JSON', () => {
    localStorage.setItem(storageKey, '{niet-geldige-json')

    expect(loadLocalData()).toEqual(initialDemoData)
  })

  it('migreert geldige onversioneerde data uit schema v0', () => {
    const legacyData = structuredClone(initialDemoData)
    legacyData.checkIns.push({
      id: 'legacy-check-in',
      date: '2026-11-24',
      energy: 42,
      asksEnergy: 'Drukte',
      givesEnergy: 'Rust',
      createdAt: '2026-11-24T12:00:00.000Z',
    })
    localStorage.setItem(storageKey, JSON.stringify(legacyData))

    expect(loadLocalData()).toEqual(legacyData)
  })

  it('bewaart nieuwe data met de huidige schemaversie', () => {
    saveLocalData(initialDemoData)

    expect(JSON.parse(localStorage.getItem(storageKey) ?? '')).toEqual({
      schemaVersion: 1,
      data: initialDemoData,
    })
  })

  it('valt veilig terug voor een onbekende toekomstige schemaversie', () => {
    localStorage.setItem(storageKey, JSON.stringify({
      schemaVersion: 2,
      data: initialDemoData,
    }))

    expect(loadLocalData()).toEqual(initialDemoData)
  })

  it('valt terug op demo-data wanneer getItem geblokkeerd is', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Opslag geblokkeerd', 'SecurityError')
    })

    const result = loadLocalDataResult()

    expect(result.data).toEqual(initialDemoData)
    expect(result.issue).toMatchObject({ kind: 'unavailable' })
  })

  it('meldt QuotaExceededError zonder te gooien', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Opslag vol', 'QuotaExceededError')
    })

    expect(saveLocalData(initialDemoData)).toMatchObject({ kind: 'quota-exceeded' })
  })

  it('meldt andere setItem-fouten als niet-beschikbare opslag', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Opslag geblokkeerd', 'SecurityError')
    })

    expect(saveLocalData(initialDemoData)).toMatchObject({ kind: 'unavailable' })
  })
})
