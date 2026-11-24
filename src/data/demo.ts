import type { AppData } from '../types'

export const demoActivities: AppData['activities'] = [
  {
    id: 'walk',
    name: 'Rustige wandeling',
    energyCost: 5,
    energyGain: 20,
    category: 'Buiten',
    description: 'Even naar buiten, zonder doel of tempo.',
  },
  {
    id: 'admin',
    name: 'Administratie',
    energyCost: 20,
    energyGain: 0,
    category: 'Werk',
    description: 'Een afgebakend administratief taakje.',
  },
  {
    id: 'film',
    name: 'Film kijken',
    energyCost: 0,
    energyGain: 10,
    category: 'Ontspanning',
    description: 'Iets vertrouwds kijken en uitrusten.',
  },
  {
    id: 'cooking',
    name: 'Rustig koken',
    energyCost: 10,
    energyGain: 15,
    category: 'Huishouden',
    description: 'Een eenvoudige maaltijd maken op je eigen tempo.',
  },
  {
    id: 'breathing',
    name: 'Vijf minuten ademen',
    energyCost: 0,
    energyGain: 8,
    category: 'Rust',
    description: 'Zitten, ademen en even nergens heen hoeven.',
  },
  {
    id: 'drawing',
    name: 'Vrij tekenen',
    energyCost: 5,
    energyGain: 12,
    category: 'Creativiteit',
    description: 'Maken zonder dat het iets hoeft te worden.',
  },
  {
    id: 'stretch',
    name: 'Zacht bewegen',
    energyCost: 5,
    energyGain: 10,
    category: 'Beweging',
    description: 'Een paar rustige rekbewegingen.',
  },
  {
    id: 'tea-together',
    name: 'Samen thee drinken',
    energyCost: 5,
    energyGain: 10,
    category: 'Gezin',
    description: 'Een klein moment samen, zonder agenda.',
  },
]

export const initialDemoData: AppData = {
  activities: demoActivities,
  checkIns: [],
  plans: [],
  reflections: [],
}
