import { gameConfig } from './config'
import type { AdventureStory, JourneyMemory, JourneyRoute, JourneyState, LevelPerformance, LevelRules } from './types'

export function getLevelRules(route: JourneyRoute | null = null): LevelRules {
  if (route) {
    const { targetHits, timeLimitMs } = gameConfig.journey.routes[route]
    return { targetHits, timeLimitMs }
  }
  return { targetHits: gameConfig.progressForStageWin, timeLimitMs: gameConfig.timing.levelTimeLimitMs }
}

export const meetingStory: AdventureStory = {
  id: 'before-dark',
  kind: 'meeting',
  entryFragmentId: 'meeting',
  fragments: {
    meeting: {
      id: 'meeting',
      text: 'Bij de splitsing wacht Noor. “Mag ik met je mee? Achter die heuvel staat een schuilplaats.” Het licht zakt. Je belooft dat jullie er samen vóór het donker zullen zijn.',
      choices: [
        {
          id: 'lead',
          label: 'Loop met me mee',
          description: 'Je wijst naar de heuvel.',
          alignment: 'bold',
          next: 'route',
        },
        {
          id: 'together',
          label: 'We blijven samen',
          description: 'Je wacht tot Noor naast je staat.',
          alignment: 'wary',
          next: 'route',
        },
      ],
    },
    route: {
      id: 'route',
      text: 'De rode lijn is het naderende donker. Wit is jullie weg naar de schuilplaats. Over de vlakte zijn jullie er sneller, maar valt het licht eerder weg. Langs de beschutting is de weg langer en hebben jullie meer tijd.',
      choices: [
        {
          id: 'open',
          route: 'open',
          label: 'Over de vlakte',
          description: 'Korte weg. Minder blokken, sneller donker.',
          alignment: 'bold',
          next: 'end',
        },
        {
          id: 'sheltered',
          route: 'sheltered',
          label: 'Langs beschutting',
          description: 'Lange weg. Meer blokken, meer tijd.',
          alignment: 'wary',
          next: 'end',
        },
      ],
    },
  },
}

export function rememberArrival(
  route: JourneyRoute,
  performance: LevelPerformance,
  rules: LevelRules,
  timeReliefMs: number,
): JourneyMemory {
  const remainingMs = Math.min(rules.timeLimitMs, Math.max(0, rules.timeLimitMs - performance.elapsedMs + timeReliefMs))
  const difficult =
    performance.mistakes >= gameConfig.journey.difficultArrivalMistakes ||
    remainingMs <= rules.timeLimitMs * gameConfig.journey.closeArrivalFraction
  const fluent = performance.mistakes === 0 && performance.highestCombo >= gameConfig.journey.fluentArrivalStreak
  return { ...performance, route, remainingMs, tone: difficult ? 'persistent' : fluent ? 'fluent' : 'steady' }
}

export function createArrivalStory(memory: JourneyMemory): AdventureStory {
  const routeText = memory.route === 'open' ? 'De vlakte ligt achter jullie.' : 'De laatste bomen liggen achter jullie.'
  const arrivalText = {
    late: 'Het donker haalt jullie in. Jullie zoeken op de tast verder en bereiken later de schuilplaats. Noor doet de deur dicht. “We zijn er. Dat is voor nu genoeg.”',
    persistent:
      'Bij de schuilplaats moeten jullie op adem komen. Noor kijkt achterom. “Ik dacht even dat het niet zou lukken. Maar je bleef wel.”',
    fluent: 'Jullie bereiken de schuilplaats in een vloeiende pas. Noor glimlacht. “Doe jij dit vaker?”',
    steady:
      'Stap voor stap bereiken jullie de schuilplaats. Noor houdt de deur voor je open. “Fijn dat we samen gingen.”',
  }[memory.tone]
  const answerText = {
    late: '“Ik wilde vóór het donker binnen zijn,” zegt Noor. “Maar ik loop liever wat langer samen dan dat ik alleen vooruit moet.”',
    persistent:
      '“Ik vergat onderweg steeds dat ik ook even mocht struikelen,” zegt Noor. “Bij jou hoefde ik niet opnieuw te beginnen.”',
    fluent:
      '“Ik kende alleen de weg op de kaart,” zegt Noor. “Buiten voelt alles anders. Vandaag kon ik eindelijk om me heen kijken.”',
    steady: '“Alleen hoor ik vooral mijn eigen stappen,” zegt Noor. “Met jou erbij klonk de weg anders.”',
  }[memory.tone]
  return {
    id: 'shelter-arrival',
    kind: 'arrival',
    entryFragmentId: 'arrival',
    fragments: {
      arrival: {
        id: 'arrival',
        text: routeText + ' ' + arrivalText,
        choices: [
          {
            id: 'listen',
            label: 'Hoe was het voor jou?',
            description: 'Je gaat naast Noor zitten.',
            alignment: 'bold',
            next: 'listen',
          },
          {
            id: 'rest',
            label: 'Eerst even rust',
            description: 'Jullie hoeven even nergens heen.',
            alignment: 'wary',
            next: 'rest',
          },
        ],
      },
      listen: {
        id: 'listen',
        text: answerText,
        choices: [
          {
            id: 'continue-together',
            label: 'Samen verder',
            description: 'Na de rust pakken jullie de weg op.',
            alignment: 'bold',
            next: 'end',
          },
          {
            id: 'wait-together',
            label: 'Nog even zitten',
            description: 'Pas als jullie klaar zijn, gaan jullie verder.',
            alignment: 'wary',
            next: 'end',
          },
        ],
      },
      rest: {
        id: 'rest',
        text: 'Noor schuift een kruk naar je toe. Een tijdlang luisteren jullie naar de wind buiten. “De volgende weg hoeven we ook niet alleen te doen.”',
        choices: [
          {
            id: 'ready',
            label: 'Ik ben zover',
            description: 'Jullie trekken de deur achter je dicht.',
            alignment: 'bold',
            next: 'end',
          },
          {
            id: 'your-pace',
            label: 'Als jij zover bent',
            description: 'Noor knikt. Samen lopen jullie verder.',
            alignment: 'wary',
            next: 'end',
          },
        ],
      },
    },
  }
}

export function recallJourney(story: AdventureStory, memory: JourneyMemory | null): AdventureStory {
  if (!memory) return story
  const route = memory.route === 'open' ? 'over de vlakte' : 'langs de beschutting'
  const recall =
    memory.tone === 'late'
      ? '“We hoeven niet te rennen,” zegt Noor. Jullie vonden de vorige keer ook in het donker de weg.'
      : memory.tone === 'persistent'
        ? '“We komen er wel weer,” zegt Noor. Je denkt aan jullie aankomst bij de schuilplaats.'
        : `Sinds de tocht ${route} loopt Noor naast je. Ook nu kijken jullie samen welke weg er is.`
  const entry = story.fragments[story.entryFragmentId]
  return { ...story, fragments: { ...story.fragments, [entry.id]: { ...entry, text: recall + '\n\n' + entry.text } } }
}

export function getJourneyCaption(journey: JourneyState): string {
  if (journey.phase === 'travelling' && journey.route) {
    return `MET NOOR · ${gameConfig.journey.routes[journey.route].label.toUpperCase()} · VÓÓR HET DONKER`
  }
  if (journey.memory?.tone === 'late') return 'NOOR · Ook na het donker samen verder'
  if (journey.memory) {
    return journey.memory.tone === 'persistent' ? 'NOOR · “Je bleef wel.”' : 'NOOR · Samen verder'
  }
  return ''
}
