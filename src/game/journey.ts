import { gameConfig } from './config'
import { shelterCaption } from './shelter'
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
      text: 'Bij de splitsing staat Noor met een kaart ondersteboven. “Zo klopt de heuvel tenminste.” Ze zoekt dezelfde schuilplaats als jij. Jullie spreken af samen vóór het donker aan te komen.',
      choices: [
        {
          id: 'routes',
          label: 'Bekijk de routes',
          description: 'Noor draait de kaart nog een kwartslag.',
          next: 'route',
        },
      ],
    },
    route: {
      id: 'route',
      text: 'Over de vlakte zijn jullie er sneller, maar valt het licht eerder weg. Langs de beschutting is de weg langer en hebben jullie meer tijd.',
      choices: [
        {
          id: 'open',
          route: 'open',
          label: 'Over de vlakte',
          description: 'Korte weg. Minder blokken, sneller donker.',
          next: 'end',
        },
        {
          id: 'sheltered',
          route: 'sheltered',
          label: 'Langs beschutting',
          description: 'Lange weg. Meer blokken, meer tijd.',
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

export { createShelterStory as createArrivalStory } from './shelter'

export function recallJourney(
  story: AdventureStory,
  memory: JourneyMemory | null,
  shelter: JourneyState['shelter'] = null,
): AdventureStory {
  if (!memory) return story
  const route = memory.route === 'open' ? 'over de vlakte' : 'langs de beschutting'
  const recall = shelter
    ? shelter.result === 'late'
      ? 'Noor klopt het stof van haar jas. “Volgende keer een bank met een rugleuning.”'
      : 'Noor vouwt haar kaart op. “Als de volgende deur klemt: eerst het scharnier bekijken.”'
    : memory.tone === 'late'
      ? '“We hoeven niet te rennen,” zegt Noor. Jullie vonden de vorige keer ook in het donker de weg.'
      : memory.tone === 'persistent'
        ? '“We komen er wel weer,” zegt Noor. Je denkt aan jullie aankomst bij de schuilplaats.'
        : `Sinds de tocht ${route} loopt Noor naast je. Ook nu kijken jullie samen welke weg er is.`
  const entry = story.fragments[story.entryFragmentId]
  return { ...story, fragments: { ...story.fragments, [entry.id]: { ...entry, text: recall + '\n\n' + entry.text } } }
}

export function getJourneyCaption(journey: JourneyState): string {
  if (journey.shelter) return shelterCaption(journey.shelter)
  if (journey.phase === 'travelling' && journey.route) {
    return `MET NOOR · ${gameConfig.journey.routes[journey.route].label.toUpperCase()} · VÓÓR HET DONKER`
  }
  if (journey.memory?.tone === 'late') return 'NOOR · Ook na het donker samen verder'
  if (journey.memory) {
    return journey.memory.tone === 'persistent' ? 'NOOR · “Je bleef wel.”' : 'NOOR · Samen verder'
  }
  return ''
}
