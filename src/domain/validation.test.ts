import { describe, expect, it } from 'vitest'
import { isValidDate, isValidEnergy, isValidText, normalizeDate, normalizeEnergy, normalizeText } from './validation'

describe('energievalidatie', () => {
  it.each([
    [Number.NaN, 50],
    [Number.POSITIVE_INFINITY, 50],
    [500, 100],
    [-25, 0],
    [42.6, 43],
    [75, 75],
  ])('normaliseert %s veilig naar %i', (value, expected) => {
    expect(normalizeEnergy(value)).toBe(expected)
  })

  it.each([0, 50, 100])('accepteert een geldige energiewaarde: %i', (value) => {
    expect(isValidEnergy(value)).toBe(true)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 101, 42.5, '50', null])(
    'weigert een ongeldige energiewaarde: %s',
    (value) => {
      expect(isValidEnergy(value)).toBe(false)
    },
  )
})

describe('datumvalidatie', () => {
  it.each(['2026-11-24', '2024-02-29'])('accepteert een geldige datum: %s', (value) => {
    expect(isValidDate(value)).toBe(true)
  })

  it.each(['', '24-11-2026', '2026-02-30', '2025-02-29', null, 20261124])(
    'weigert een ongeldige datum: %s',
    (value) => {
      expect(isValidDate(value)).toBe(false)
    },
  )

  it('gebruikt een veilige default voor een ongeldige datum', () => {
    expect(normalizeDate('geen datum', '2026-11-24')).toBe('2026-11-24')
    expect(normalizeDate('geen datum', 'ook ongeldig')).toBe('1970-01-01')
  })
})

describe('tekstvalidatie', () => {
  it('behoudt geldige vrije tekst ongewijzigd', () => {
    const text = '  Rust en ruimte\nzonder inhoud te verliezen  '
    expect(isValidText(text)).toBe(true)
    expect(normalizeText(text)).toBe(text)
  })

  it.each([null, undefined, 42, Number.NaN, {}, []])(
    'gebruikt een veilige default voor ongeldige tekst: %s',
    (value) => {
      expect(isValidText(value)).toBe(false)
      expect(normalizeText(value)).toBe('')
    },
  )
})
