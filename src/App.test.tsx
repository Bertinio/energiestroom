import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Energiestroom', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('toont de rustige dagelijkse check-in', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /hoe stroomt je energie vandaag/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/huidige energie/i)).toHaveValue('50')
  })

  it.each([
    ['een leeg object', {}],
    ['null', null],
    ['ontbrekende arrays', { schemaVersion: 1, data: { activities: [] } }],
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
  ])('blijft bruikbaar bij corrupte opslag: %s', (_name, storedValue) => {
    localStorage.setItem('energiestroom-demo-v1', JSON.stringify(storedValue))

    render(<App />)

    expect(screen.getByRole('heading', { name: /hoe stroomt je energie vandaag/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/huidige energie/i)).toHaveValue('50')
  })

  it('navigeert naar de bibliotheek met voorbeeldactiviteiten', async () => {
    const user = userEvent.setup()
    render(<App />)
    const links = screen.getAllByRole('button', { name: /bibliotheek/i })
    await user.click(links[0]!)
    expect(screen.getByRole('heading', { name: /wat geeft en vraagt energie/i })).toBeInTheDocument()
    expect(screen.getByText('Rustige wandeling')).toBeInTheDocument()
    expect(screen.getByText('+15')).toBeInTheDocument()
  })

  it('blijft bruikbaar en waarschuwt wanneer opslag geblokkeerd is', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Opslag geblokkeerd', 'SecurityError')
    })

    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent(/lokale opslag is niet beschikbaar/i)
    await user.click(screen.getAllByRole('button', { name: /bibliotheek/i })[0]!)
    expect(screen.getByRole('heading', { name: /wat geeft en vraagt energie/i })).toBeInTheDocument()
  })

  it('blijft bruikbaar en waarschuwt bij volle opslag', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Opslag vol', 'QuotaExceededError')
    })

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/lokale opslagruimte is vol/i)
    await user.click(screen.getAllByRole('button', { name: /bibliotheek/i })[0]!)
    expect(screen.getByRole('heading', { name: /wat geeft en vraagt energie/i })).toBeInTheDocument()
  })
})
