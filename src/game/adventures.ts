import type { AdventureScenario } from './types'
import type { RandomSource } from './random'

// Eerste, korte set verhaalfragmenten. Vrij uit te breiden of te vervangen.
export const adventureScenarios: AdventureScenario[] = [
  {
    id: 'silent-corridor',
    text: 'De gang achter de rand is stil. Ergens verderop hoor je een zacht getik dat niet bij de muren past.',
    choices: [
      { id: 'follow', label: 'Volg het getik', description: 'Je loopt de duisternis in, op het geluid af.' },
      { id: 'retreat', label: 'Keer terug', description: 'Je laat het getik voor wat het is en zoekt de uitgang.' },
    ],
  },
  {
    id: 'locked-door',
    text: 'Een deur zonder klink blokkeert de weg. In het hout zit een sleutelgat op ooghoogte.',
    choices: [
      { id: 'peek', label: 'Kijk door het gat', description: 'Je gluurt naar wat er aan de andere kant is.' },
      { id: 'force', label: 'Duw de deur open', description: 'Je zet je schouder ertegen.' },
      { id: 'leave', label: 'Loop door', description: 'De deur kan wachten.' },
    ],
  },
  {
    id: 'two-lights',
    text: 'Twee lichtjes gloeien in de verte, één rood en één blauw, geen van beide feller dan het ander.',
    choices: [
      { id: 'red-light', label: 'Ga naar het rode licht', description: 'Het rode licht flakkert rustig.' },
      { id: 'blue-light', label: 'Ga naar het blauwe licht', description: 'Het blauwe licht brandt gestaag.' },
    ],
  },
  {
    id: 'echoing-voice',
    text: 'Een stem herhaalt een zin die je niet helemaal verstaat, alsof hij door water heen klinkt.',
    choices: [
      { id: 'answer', label: 'Antwoord hardop', description: 'Je roept iets terug de leegte in.' },
      { id: 'listen', label: 'Blijf luisteren', description: 'Je wacht tot de zin zich herhaalt.' },
      { id: 'ignore', label: 'Negeer de stem', description: 'Je zet je route voort alsof je niets hoorde.' },
    ],
  },
  {
    id: 'narrow-bridge',
    text: 'Een smalle brug overspant een kloof die dieper lijkt dan het licht kan reiken.',
    choices: [
      { id: 'cross-fast', label: 'Steek snel over', description: 'Je rent zonder omlaag te kijken.' },
      { id: 'cross-slow', label: 'Steek voorzichtig over', description: 'Je test elke plank voor je erop stapt.' },
    ],
  },
]

export function pickAdventureScenario(random: RandomSource): AdventureScenario {
  const index = Math.floor(random() * adventureScenarios.length)
  return adventureScenarios[index]
}
