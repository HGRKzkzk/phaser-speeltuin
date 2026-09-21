import type { AdventureStory } from './types'
import type { RandomSource } from './random'

// Elk avontuur is een vertakte reeks fragmenten. Een keuze verwijst naar het
// volgende fragment via zijn id, of naar 'end' om het avontuur te beëindigen.
// Iedere keuze draagt ook een houding (gedurfd of behoedzaam); zie RULEBOOK.md
// voor hoe die houdingen bij de laatste keuze van een avontuur worden gewogen.
export const adventureStories: AdventureStory[] = [
  {
    id: 'silent-corridor',
    entryFragmentId: 'start',
    fragments: {
      start: {
        id: 'start',
        text: 'De gang achter de rand is stil. Ergens verderop hoor je een zacht getik dat niet bij de muren past.',
        choices: [
          { id: 'follow', label: 'Volg het getik', description: 'Je loopt op het geluid af.', alignment: 'bold', next: 'tapping-source' },
          { id: 'retreat', label: 'Keer terug', description: 'Je laat het getik voor wat het is.', alignment: 'wary', next: 'cold-draft' },
        ],
      },
      'tapping-source': {
        id: 'tapping-source',
        text: 'Het getik wordt harder en regelmatiger, alsof iets meetelt. Een zijgang splitst zich af, koeler dan de rest.',
        choices: [
          { id: 'side-passage', label: 'Duik de zijgang in', description: 'Smal, maar het lijkt korter.', alignment: 'wary', next: 'narrow-crawl' },
          { id: 'press-on', label: 'Volg het getik recht door', description: 'Rechttoe, rechtaan op de bron af.', alignment: 'bold', next: 'tapping-room' },
        ],
      },
      'cold-draft': {
        id: 'cold-draft',
        text: 'Een koude tocht duwt tegen je gezicht, uit een richting die je nog niet had opgemerkt.',
        choices: [
          { id: 'follow-draft', label: 'Volg de tocht', description: 'De kou wijst je ergens heen.', alignment: 'bold', next: 'narrow-crawl' },
          { id: 'stand-still', label: 'Blijf stilstaan en luister', description: 'Misschien komt er meer.', alignment: 'wary', next: 'tapping-room' },
        ],
      },
      'narrow-crawl': {
        id: 'narrow-crawl',
        text: 'De ruimte wordt smaller. Je moet je zijwaarts wringen om verder te komen.',
        choices: [
          { id: 'push-through', label: 'Wring je erdoorheen', description: 'Het gaat net.', alignment: 'bold', next: 'end' },
          { id: 'back-out', label: 'Kruip terug', description: 'Er is vast een andere weg.', alignment: 'wary', next: 'end' },
        ],
      },
      'tapping-room': {
        id: 'tapping-room',
        text: 'Het getik komt uit een kamer waar niets lijkt te bewegen, en toch voelt de lucht er dicht.',
        choices: [
          { id: 'enter', label: 'Stap de kamer in', description: 'Het getik stopt niet vanzelf.', alignment: 'bold', next: 'end' },
          { id: 'leave', label: 'Loop de kamer voorbij', description: 'Sommige dingen blijven beter dicht.', alignment: 'wary', next: 'end' },
        ],
      },
    },
  },
  {
    id: 'locked-door',
    entryFragmentId: 'start',
    fragments: {
      start: {
        id: 'start',
        text: 'Een deur zonder klink blokkeert de weg. In het hout zit een sleutelgat op ooghoogte.',
        choices: [
          { id: 'peek', label: 'Kijk door het sleutelgat', description: 'Eerst maar eens kijken.', alignment: 'wary', next: 'glimpse' },
          { id: 'force', label: 'Zet je schouder tegen de deur', description: 'Soms werkt duwen gewoon.', alignment: 'bold', next: 'give-way' },
        ],
      },
      glimpse: {
        id: 'glimpse',
        text: 'Achter het gat zie je een kamer vol stof, en een gestalte die niet beweegt maar ook niet weg is.',
        choices: [
          { id: 'knock', label: 'Klop zacht op het hout', description: 'Misschien reageert er iets.', alignment: 'bold', next: 'silence-answers' },
          { id: 'step-back', label: 'Doe een stap terug', description: 'Beter van een afstand kijken.', alignment: 'wary', next: 'give-way' },
        ],
      },
      'give-way': {
        id: 'give-way',
        text: 'De deur geeft mee, langzaam, met een geluid alsof hij dat liever niet had gedaan.',
        choices: [
          { id: 'enter-slow', label: 'Ga voorzichtig naar binnen', description: 'Stap voor stap.', alignment: 'bold', next: 'silence-answers' },
          { id: 'wedge', label: 'Zet iets tussen de deur', description: 'Voor het geval je snel terug moet.', alignment: 'wary', next: 'dust-settles' },
        ],
      },
      'silence-answers': {
        id: 'silence-answers',
        text: 'Er komt geen reactie, maar de stilte verandert net genoeg om te merken dat er geluisterd wordt.',
        choices: [
          { id: 'wait', label: 'Wacht af', description: 'Geduld kan lonen.', alignment: 'bold', next: 'end' },
          { id: 'retreat', label: 'Trek je terug', description: 'Dit voelt niet aan als wachten waard.', alignment: 'wary', next: 'end' },
        ],
      },
      'dust-settles': {
        id: 'dust-settles',
        text: 'Het stof in de kamer daalt weer neer nu de deur stilstaat. Niets lijkt zich iets van je aan te trekken.',
        choices: [
          { id: 'search', label: 'Doorzoek de kamer', description: 'Er moet hier iets te vinden zijn.', alignment: 'bold', next: 'end' },
          { id: 'leave-open', label: 'Laat de deur open en loop door', description: 'Je onthoudt de plek voor later.', alignment: 'wary', next: 'end' },
        ],
      },
    },
  },
  {
    id: 'two-lights',
    entryFragmentId: 'start',
    fragments: {
      start: {
        id: 'start',
        text: 'Twee lichtjes gloeien in de verte, één rood en één blauw, geen van beide feller dan het ander.',
        choices: [
          { id: 'red', label: 'Ga naar het rode licht', description: 'Het flakkert rustig.', alignment: 'bold', next: 'red-glow' },
          { id: 'blue', label: 'Ga naar het blauwe licht', description: 'Het brandt gestaag.', alignment: 'wary', next: 'blue-glow' },
        ],
      },
      'red-glow': {
        id: 'red-glow',
        text: 'Het rode licht flakkert rustig, in een ritme dat bijna een adem lijkt.',
        choices: [
          { id: 'approach', label: 'Kom dichterbij', description: 'Het ritme trekt je aan.', alignment: 'bold', next: 'warmth' },
          { id: 'circle', label: 'Loop er omheen', description: 'Eerst maar eens kijken van alle kanten.', alignment: 'wary', next: 'warmth' },
        ],
      },
      'blue-glow': {
        id: 'blue-glow',
        text: 'Het blauwe licht brandt gestaag, zonder ook maar een moment te trillen.',
        choices: [
          { id: 'approach', label: 'Kom dichterbij', description: 'De stilte ervan is geruststellend.', alignment: 'bold', next: 'chill' },
          { id: 'circle', label: 'Loop er omheen', description: 'Het licht lijkt van alle kanten gelijk.', alignment: 'wary', next: 'chill' },
        ],
      },
      warmth: {
        id: 'warmth',
        text: 'De lucht om het licht is warmer dan verwacht, bijna ongemakkelijk.',
        choices: [
          { id: 'stay', label: 'Blijf bij het licht', description: 'De warmte is niet onprettig.', alignment: 'bold', next: 'end' },
          { id: 'move-on', label: 'Loop door', description: 'Genoeg gezien.', alignment: 'wary', next: 'end' },
        ],
      },
      chill: {
        id: 'chill',
        text: 'De kou bij het licht kruipt door je kleren, scherper dan de rest van de duisternis.',
        choices: [
          { id: 'stay', label: 'Blijf bij het licht', description: 'De kou went misschien.', alignment: 'bold', next: 'end' },
          { id: 'move-on', label: 'Loop door', description: 'Deze kou hoef je niet te wennen.', alignment: 'wary', next: 'end' },
        ],
      },
    },
  },
]

export function pickAdventureStory(random: RandomSource): AdventureStory {
  const index = Math.floor(random() * adventureStories.length)
  return adventureStories[index]
}
