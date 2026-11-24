import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialDemoData } from './data/demo'
import type { AppData } from './types'

interface MockAuthState {
  session: { user: { id: string } } | null
  loading: boolean
  message: string
  sendMagicLink: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  auth: {
    current: null as MockAuthState | null,
  },
  loadRemoteData: vi.fn<(userId: string) => Promise<AppData>>(),
}))

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => mocks.auth.current,
}))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: null,
}))

vi.mock('./lib/data-store', async () => {
  const actual = await vi.importActual<typeof import('./lib/data-store')>('./lib/data-store')
  return {
    ...actual,
    loadRemoteData: mocks.loadRemoteData,
  }
})

import App from './App'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

function dataFor(userId: string): AppData {
  return {
    ...structuredClone(initialDemoData),
    activities: [
      ...structuredClone(initialDemoData.activities),
      {
        id: `private-${userId}`,
        name: `Privé ${userId}`,
        energyCost: 10,
        energyGain: 10,
        category: 'Rust',
        description: `Alleen zichtbaar voor ${userId}`,
        isCustom: true,
      },
    ],
  }
}

function setSession(userId: string | null): void {
  mocks.auth.current = {
    session: userId ? { user: { id: userId } } : null,
    loading: false,
    message: '',
    sendMagicLink: vi.fn(),
    signOut: vi.fn(),
  }
}

describe('accountisolatie', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.loadRemoteData.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('verbergt data van gebruiker A totdat data van gebruiker B geladen is', async () => {
    const user = userEvent.setup()
    const userA = deferred<AppData>()
    const userB = deferred<AppData>()
    mocks.loadRemoteData.mockImplementation((userId) => userId === 'A' ? userA.promise : userB.promise)
    setSession('A')

    const view = render(<App />)

    expect(screen.getByRole('heading', { name: /je gegevens worden geladen/i })).toBeInTheDocument()
    await act(() => {
      userA.resolve(dataFor('A'))
      return userA.promise
    })
    await user.click(screen.getAllByRole('button', { name: /bibliotheek/i })[0]!)
    expect(await screen.findByText('Privé A')).toBeInTheDocument()

    setSession('B')
    view.rerender(<App />)

    expect(screen.getByRole('heading', { name: /je gegevens worden geladen/i })).toBeInTheDocument()
    expect(screen.queryByText('Privé A')).not.toBeInTheDocument()

    await act(() => {
      userB.resolve(dataFor('B'))
      return userB.promise
    })
    expect(await screen.findByText('Privé B')).toBeInTheDocument()
    expect(screen.queryByText('Privé A')).not.toBeInTheDocument()
  })

  it('schrijft remote gebruikersdata na uitloggen niet naar demo-opslag', async () => {
    mocks.loadRemoteData.mockResolvedValue(dataFor('A'))
    setSession('A')

    const view = render(<App />)
    expect(await screen.findByRole('heading', { name: /hoe stroomt je energie vandaag/i })).toBeInTheDocument()

    setSession(null)
    view.rerender(<App />)
    await act(async () => Promise.resolve())

    expect(screen.getByRole('heading', { name: /welkom bij energiestroom/i })).toBeInTheDocument()
    expect(localStorage.getItem('energiestroom-demo-v1')).toBeNull()
  })
})
