import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Energiestroom', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('toont de rustige dagelijkse check-in', () => {
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
})
