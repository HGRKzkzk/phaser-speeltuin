import { gameConfig } from './config'
import type { AdventureChoice, AdventureStory, GameBlock, JourneyMemory, ShelterMemory } from './types'

const approaches: AdventureChoice[] = [
  {
    id: 'lift',
    label: 'Deur optillen',
    description: 'Houd langer dezelfde kleur vast; de pijlen blijven wisselen.',
    shelterApproach: 'lift',
    next: 'end',
  },
  {
    id: 'hinges',
    label: 'Scharnieren losmaken',
    description: 'Herhaal langer dezelfde pijl; de kleuren blijven wisselen.',
    shelterApproach: 'hinges',
    next: 'end',
  },
]

export function createShelterStory(memory: JourneyMemory): AdventureStory {
  const arrival = {
    fluent: 'Noor komt naast je tot stilstand. “Nou. Nog genoeg licht om mijn kaart verkeerd op te vouwen.”',
    steady: 'Noor trekt een platgevouwen kaart uit haar jas. De schuilplaats staat precies in de vouw.',
    persistent: 'Noor vist een steentje uit haar schoen. “Die reist al sinds de heuvel gratis mee.”',
    late: 'In het donker vinden jullie de schuilplaats op het geluid: tik, tik, tik. Noor houdt haar oor tegen de deur.',
  }[memory.tone]
  return {
    id: 'shelter-door',
    kind: 'arrival',
    entryFragmentId: 'arrival',
    fragments: {
      arrival: {
        id: 'arrival',
        text: `${arrival} De deur zit vast. Binnen tikt iets. “Er is iemand,” zegt Noor. Ze klopt drie keer. Het antwoord komt veel te snel.`,
        choices: [
          {
            id: 'listen',
            label: 'Luister bij de kier',
            description: 'Waar komt dat antwoord vandaan?',
            next: 'listen',
          },
          { id: 'inspect', label: 'Onderzoek de deur', description: 'Wat houdt hem tegen?', next: 'inspect' },
        ],
      },
      listen: {
        id: 'listen',
        text: 'Bij elke windvlaag tikt er metaal tegen glas. Door de kier zie je een lepel aan een touwtje. “Iemand met één lepel,” zegt Noor. Dan ziet ze de kromme deur hangen.',
        choices: [
          {
            id: 'inspect-too',
            label: 'Bekijk de onderkant',
            description: 'Nu nog uitzoeken waarom hij klemt.',
            next: 'both',
          },
          {
            id: 'plan',
            label: 'Maak een plan',
            description: 'De deur hangt scheef in zijn scharnieren.',
            next: 'approach',
          },
        ],
      },
      inspect: {
        id: 'inspect',
        text: 'Onder de deur zit een verse kras. Het bovenste scharnier is verroest; de deur zakt op de drempel. Noor duwt. De kras wordt langer. “Goed. Duwen hebben we onderzocht.”',
        choices: [
          { id: 'listen-too', label: 'Luister toch even', description: 'En dat getik dan?', next: 'both' },
          { id: 'plan', label: 'Maak een plan', description: 'Optillen of het scharnier loswerken?', next: 'approach' },
        ],
      },
      both: {
        id: 'both',
        text: 'Een lepel tikt tegen het raam als de wind eraan trekt. Geen bewoner dus. En geen slot: de deur hangt scheef. Noor bergt haar kaart op. “Die lepel heeft ons wel de weg gewezen.”',
        choices: [
          { id: 'plan', label: 'Aan de slag', description: 'Kies hoe jullie de deur aanpakken.', next: 'approach' },
        ],
      },
      approach: {
        id: 'approach',
        text: 'Je kunt de deur omhoog houden terwijl Noor hem draait, of samen de scharnieren loswerken. “Jij kiest,” zegt ze. “Ik heb mijn duw al gedaan.”',
        choices: approaches,
      },
    },
  }
}

export function createShelterOutcome(shelter: ShelterMemory): AdventureStory {
  const text =
    shelter.result === 'late'
      ? shelter.approach === 'lift'
        ? 'De deur zakt weer op de drempel. Jullie laten los. Onder het afdak staat een droge bank; Noor schuift haar tas opzij. Door het raam tikt de lepel nog steeds. “Die slaapt zeker binnen.”'
        : 'Het scharnier piept, maar geeft niet genoeg mee. Jullie stoppen voor vannacht en vinden een droge bank onder het afdak. Noor luistert naar de lepel. “Morgen neem ik olie mee. Geen kaart.”'
      : shelter.approach === 'lift'
        ? 'Je houdt de deur hoog genoeg. Noor draait hem langs de drempel en schuift een houten wig eronder. Binnen hangt een lepel voor het raam. Op tafel ligt een briefje: “Graag optillen.” Noor draait het naar de deur.'
        : 'Het scharnier komt los met een lange piep. Noor zwaait de deur open en zet er een wig onder. Binnen hangt een lepel voor het raam. Op tafel ligt een briefje: “Graag optillen.” “Of onderhouden,” zegt ze.'
  return {
    id: 'shelter-result',
    kind: 'shelter-result',
    entryFragmentId: 'result',
    fragments: {
      result: {
        id: 'result',
        text,
        choices: [
          { id: 'rest', label: 'Blijf voor de nacht', description: 'Morgen gaat de reis verder.', next: 'morning' },
        ],
      },
      morning: {
        id: 'morning',
        text:
          shelter.result === 'late'
            ? 'In de ochtend deelt Noor het laatste stuk brood. Achter jullie houdt de lepel op met tikken: de wind is gaan liggen. Jullie pakken je spullen van de bank en volgen het pad.'
            : 'In de ochtend zet Noor de wig stevig terug onder de deur. “Voor de volgende duwer.” Jullie delen het laatste stuk brood en volgen het pad.',
        choices: [
          {
            id: 'continue',
            label: 'Samen op weg',
            description: 'Het volgende level heeft weer gewone blokken.',
            next: 'end',
          },
        ],
      },
    },
  }
}

// Reorder the same balanced bag: both colors and both directions stay present.
export function groupShelterBlocks(blocks: GameBlock[], grouping?: 'color' | 'direction'): GameBlock[] {
  if (!grouping || blocks.length === 0) return blocks
  const first = blocks[0][grouping]
  return [
    ...blocks.filter((block) => block[grouping] === first),
    ...blocks.filter((block) => block[grouping] !== first),
  ]
}

export function shelterCaption(shelter: ShelterMemory): string {
  if (shelter.result) return shelter.result === 'late' ? 'NOOR · De nacht onder het afdak' : 'NOOR · De deur staat open'
  return gameConfig.shelter.approaches[shelter.approach].caption
}
