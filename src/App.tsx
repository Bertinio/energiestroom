import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  BarChart3,
  BatteryMedium,
  BookOpen,
  CalendarDays,
  Check,
  Leaf,
  LogOut,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { fitsEnergyLevel, getEnergyStatus, getGentleSuggestion, netEnergy } from './domain/energy'
import { useAuth } from './hooks/useAuth'
import { loadLocalData, loadRemoteData, saveCheckIn, saveLocalData, savePlan, saveReflection } from './lib/data-store'
import { isSupabaseConfigured } from './lib/supabase'
import type { Activity, AppData, AppPage, DailyCheckIn, EveningReflection } from './types'

const today = format(new Date(), 'yyyy-MM-dd')

const navItems: Array<{ id: AppPage; label: string; icon: typeof Sun }> = [
  { id: 'vandaag', label: 'Vandaag', icon: Sun },
  { id: 'bibliotheek', label: 'Bibliotheek', icon: BookOpen },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'reflectie', label: 'Avond', icon: Moon },
  { id: 'inzichten', label: 'Inzichten', icon: BarChart3 },
]

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

function EnergyBadge({ activity }: { activity: Activity }) {
  const net = netEnergy(activity)
  return <span className={`energy-badge ${net >= 0 ? 'positive' : 'negative'}`}>{net >= 0 ? '+' : ''}{net}</span>
}

function TodayPage({
  data,
  onSave,
}: {
  data: AppData
  onSave: (checkIn: DailyCheckIn) => Promise<void>
}) {
  const existing = data.checkIns.find((item) => item.date === today)
  const [energy, setEnergy] = useState(existing?.energy ?? 50)
  const [asksEnergy, setAsksEnergy] = useState(existing?.asksEnergy ?? '')
  const [givesEnergy, setGivesEnergy] = useState(existing?.givesEnergy ?? '')
  const [saved, setSaved] = useState(false)

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    await onSave({
      id: existing?.id ?? crypto.randomUUID(),
      date: today,
      energy,
      asksEnergy,
      givesEnergy,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    })
    setSaved(true)
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">{format(new Date(), 'EEEE d MMMM', { locale: nl })}</p>
        <h1>Hoe stroomt je energie vandaag?</h1>
        <p>Een moment om te voelen. Er is geen goed of fout antwoord.</p>
      </header>
      <form onSubmit={(event) => void submit(event)} className="page-stack">
        <Card className="energy-card">
          <div className="energy-heading">
            <BatteryMedium aria-hidden="true" />
            <div><span className="energy-number">{energy}</span><span className="energy-total"> / 100</span></div>
            <span className="status-pill">{getEnergyStatus(energy)}</span>
          </div>
          <input
            aria-label="Huidige energie"
            type="range"
            min="0"
            max="100"
            value={energy}
            onChange={(event) => { setEnergy(Number(event.target.value)); setSaved(false) }}
          />
          <div className="range-labels"><span>Leeg</span><span>Vol</span></div>
        </Card>
        <Card>
          <label htmlFor="asks">Wat vraagt vandaag energie van je?</label>
          <textarea id="asks" value={asksEnergy} onChange={(event) => setAsksEnergy(event.target.value)} placeholder="Bijvoorbeeld: veel afspraken, weinig slaap…" />
          <label htmlFor="gives">Wat zou je vandaag energie kunnen geven?</label>
          <textarea id="gives" value={givesEnergy} onChange={(event) => setGivesEnergy(event.target.value)} placeholder="Bijvoorbeeld: buitenlucht, stilte, iets maken…" />
          <button className="primary-button" type="submit">{saved ? <Check /> : <Leaf />}{saved ? 'Bewaard' : 'Bewaar dit moment'}</button>
        </Card>
      </form>
      <Card className="suggestion">
        <Sparkles aria-hidden="true" />
        <div><h2>Een zachte gedachte</h2><p>{getGentleSuggestion(energy)}</p></div>
      </Card>
    </div>
  )
}

function LibraryPage({ activities }: { activities: Activity[] }) {
  const categories = [...new Set(activities.map((activity) => activity.category))]
  const [category, setCategory] = useState<string>('Alles')
  const shown = category === 'Alles' ? activities : activities.filter((item) => item.category === category)
  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Activiteitenbibliotheek</p><h1>Wat geeft en vraagt energie?</h1><p>Gebruik dit als inspiratie, niet als takenlijst.</p></header>
      <div className="chip-row">
        {['Alles', ...categories].map((item) => <button className={category === item ? 'chip active' : 'chip'} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="activity-grid">
        {shown.map((activity) => (
          <Card key={activity.id} className="activity-card">
            <div className="activity-top"><span className="category">{activity.category}</span><EnergyBadge activity={activity} /></div>
            <h2>{activity.name}</h2><p>{activity.description}</p>
            <div className="energy-detail"><span>vraagt {activity.energyCost}</span><span>geeft {activity.energyGain}</span></div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PlannerPage({
  data,
  onPlan,
}: {
  data: AppData
  onPlan: (activityId: string) => Promise<void>
}) {
  const energy = data.checkIns.find((item) => item.date === today)?.energy ?? 50
  const fitting = data.activities.filter((activity) => fitsEnergyLevel(activity, energy))
  const plannedIds = data.plans.filter((plan) => plan.date === today).map((plan) => plan.activityId)
  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Energieplanner</p><h1>Wat past bij vandaag?</h1><p>Je ziet alleen activiteiten die passen bij je huidige energie van {energy}/100. Rust kiezen is ook een plan.</p></header>
      <Card className="rest-card"><Leaf /><div><h2>Bewust niets plannen</h2><p>Ruimte laten kan precies zijn wat je nodig hebt.</p></div></Card>
      <div className="activity-grid">
        {fitting.map((activity) => {
          const planned = plannedIds.includes(activity.id)
          return (
            <Card key={activity.id} className="activity-card">
              <div className="activity-top"><span className="category">{activity.category}</span><EnergyBadge activity={activity} /></div>
              <h2>{activity.name}</h2><p>{activity.description}</p>
              <button disabled={planned} className="quiet-button" onClick={() => void onPlan(activity.id)}>{planned ? <Check /> : <Plus />}{planned ? 'Past in je dag' : 'Leg zachtjes klaar'}</button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ReflectionPage({ data, onSave }: { data: AppData; onSave: (reflection: EveningReflection) => Promise<void> }) {
  const existing = data.reflections.find((item) => item.date === today)
  const [gave, setGave] = useState(existing?.gaveEnergy ?? '')
  const [cost, setCost] = useState(existing?.costEnergy ?? '')
  const [feeling, setFeeling] = useState(existing?.feeling ?? 50)
  const [saved, setSaved] = useState(false)
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    await onSave({ id: existing?.id ?? crypto.randomUUID(), date: today, gaveEnergy: gave, costEnergy: cost, feeling, createdAt: existing?.createdAt ?? new Date().toISOString() })
    setSaved(true)
  }
  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Avondreflectie</p><h1>Hoe was je dag voor je energie?</h1><p>Terugkijken zonder oordeel. Een paar woorden is genoeg.</p></header>
      <form onSubmit={(event) => void submit(event)} className="page-stack">
        <Card>
          <label htmlFor="gave">Wat gaf je energie?</label><textarea id="gave" value={gave} onChange={(event) => setGave(event.target.value)} placeholder="Een moment, persoon of activiteit…" />
          <label htmlFor="cost">Wat kostte je energie?</label><textarea id="cost" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="Iets dat zwaar of veel voelde…" />
        </Card>
        <Card>
          <label htmlFor="feeling">Hoe voel je je nu?</label>
          <div className="feeling-value">{feeling} <small>/ 100</small></div>
          <input id="feeling" type="range" min="0" max="100" value={feeling} onChange={(event) => setFeeling(Number(event.target.value))} />
          <div className="range-labels"><span>Uitgeput</span><span>Ruim</span></div>
          <button className="primary-button" type="submit">{saved ? <Check /> : <Moon />}{saved ? 'Reflectie bewaard' : 'Bewaar mijn reflectie'}</button>
        </Card>
      </form>
    </div>
  )
}

function InsightsPage({ data }: { data: AppData }) {
  const recent = [...data.checkIns].slice(-7)
  const average = recent.length ? Math.round(recent.reduce((sum, item) => sum + item.energy, 0) / recent.length) : null
  const mostRestorative = [...data.activities].sort((a, b) => netEnergy(b) - netEnergy(a))[0]
  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Inzichten</p><h1>Patronen die je rustig mag bekijken</h1><p>Geen oordeel of doel, alleen kleine aanwijzingen uit wat je noteerde.</p></header>
      {recent.length === 0 ? <Card className="empty-state"><BarChart3 /><h2>Je inzichten groeien vanzelf</h2><p>Na een paar check-ins verschijnen hier kalme patronen per dag en activiteit.</p></Card> : (
        <>
          <div className="insight-grid">
            <Card><p className="eyebrow">Recente dagen</p><strong className="insight-number">{average}</strong><p>gemiddelde energie, als zachte momentopname</p></Card>
            <Card><p className="eyebrow">Herstellende optie</p><strong>{mostRestorative?.name}</strong><p>heeft in de bibliotheek de grootste geschatte energiewinst</p></Card>
          </div>
          <Card>
            <h2>Energie per dag</h2>
            <div className="bars">{recent.map((item) => <div className="bar-item" key={item.id}><div className="bar" style={{ height: `${Math.max(8, item.energy)}%` }} /><span>{format(new Date(`${item.date}T12:00:00`), 'EEE', { locale: nl })}</span></div>)}</div>
          </Card>
        </>
      )}
    </div>
  )
}

function AuthPanel({ onSend, message, loading }: { onSend: (email: string) => Promise<void>; message: string; loading: boolean }) {
  const [email, setEmail] = useState('')
  return (
    <Card className="auth-card">
      <Leaf className="brand-mark" />
      <h1>Welkom bij Energiestroom</h1>
      <p>Log veilig in met een link in je e-mail. Geen wachtwoord nodig.</p>
      <form onSubmit={(event) => { event.preventDefault(); void onSend(email) }}>
        <label htmlFor="email">E-mailadres</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jij@voorbeeld.nl" />
        <button className="primary-button" disabled={loading} type="submit">Stuur mijn inloglink</button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </Card>
  )
}

export default function App() {
  const auth = useAuth()
  const [page, setPage] = useState<AppPage>('vandaag')
  const [data, setData] = useState<AppData>(() => loadLocalData())
  const [dark, setDark] = useState(() => localStorage.getItem('energiestroom-theme') === 'dark')
  const userId = auth.session?.user.id

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('energiestroom-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!userId) return
    void loadRemoteData(userId).then(setData)
  }, [userId])

  useEffect(() => {
    if (!userId) saveLocalData(data)
  }, [data, userId])

  const currentPage = useMemo(() => {
    if (page === 'vandaag') return <TodayPage data={data} onSave={async (checkIn) => {
      setData((current) => ({ ...current, checkIns: [...current.checkIns.filter((item) => item.date !== today), checkIn] }))
      if (userId) await saveCheckIn(userId, checkIn)
    }} />
    if (page === 'bibliotheek') return <LibraryPage activities={data.activities} />
    if (page === 'planner') return <PlannerPage data={data} onPlan={async (activityId) => {
      const plan = { id: crypto.randomUUID(), activityId, date: today, completed: false }
      setData((current) => ({ ...current, plans: [...current.plans, plan] }))
      if (userId) await savePlan(userId, activityId, today)
    }} />
    if (page === 'reflectie') return <ReflectionPage data={data} onSave={async (reflection) => {
      setData((current) => ({ ...current, reflections: [...current.reflections.filter((item) => item.date !== today), reflection] }))
      if (userId) await saveReflection(userId, reflection)
    }} />
    return <InsightsPage data={data} />
  }, [data, page, userId])

  if (isSupabaseConfigured && !auth.loading && !auth.session) {
    return <main className="auth-shell"><AuthPanel onSend={auth.sendMagicLink} message={auth.message} loading={auth.loading} /></main>
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><Leaf /></span><div><strong>Energiestroom</strong><small>ruimte voor wat past</small></div></div>
        <nav aria-label="Hoofdnavigatie">{navItems.map((item) => <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-actions">
          <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? 'Lichte modus' : 'Donkere modus'}>{dark ? <Sun /> : <Moon />}</button>
          {auth.session && <button className="icon-button" onClick={() => void auth.signOut()} aria-label="Uitloggen"><LogOut /></button>}
          {!isSupabaseConfigured && <span className="demo-label">Lokale demo</span>}
        </div>
      </aside>
      <div className="main-column">
        <header className="mobile-header">
          <div className="mobile-brand"><Leaf /><strong>Energiestroom</strong></div>
          <div className="mobile-actions">
            <button className="icon-button" onClick={() => setDark((value) => !value)} aria-label={dark ? 'Lichte modus' : 'Donkere modus'}>{dark ? <Sun /> : <Moon />}</button>
            {auth.session && <button className="icon-button" onClick={() => void auth.signOut()} aria-label="Uitloggen"><LogOut /></button>}
          </div>
        </header>
        <main className="content">{currentPage}</main>
      </div>
      <nav className="bottom-nav" aria-label="Hoofdnavigatie">{navItems.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
    </div>
  )
}

