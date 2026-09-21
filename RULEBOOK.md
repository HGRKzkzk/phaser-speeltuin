# Rulebook

Dit document beschrijft de spelregels. Visuele vormgeving, animaties en precieze toetskeuzes mogen veranderen zonder dat daarmee automatisch de regels veranderen.

## Begrippen

- **Spel:** de volledige poging van level 1 tot game over.
- **Level:** een speelveld tussen een nieuwe beginstand van de buitenbalken en een stage win.
- **Pad:** de zeven blokken tussen het midden en één schermrand.
- **Blok:** één onafhankelijke combinatie van een kleur en een richting.
- **Actief blok:** het enige blok waarop invoer op dat moment betrekking heeft.
- **Richtingsfase:** drie opeenvolgende paden met dezelfde horizontale richting.
- **Voortgangsbalk:** de gloeiende balk aan iedere buitenzijde van het speelveld.

## Kernlus

1. Een spel begint in level 1 met nul punten en twee balken op hun beginpositie.
2. De speler houdt de kleur van het actieve blok vast: rood of blauw.
3. Tegelijk drukt de speler de richting van dat blok in.
4. Een juiste combinatie verwijdert het blok, geeft een punt en beweegt de balk aan de actieve zijde naar het midden.
5. Een verkeerde combinatie kost een punt en beweegt diezelfde balk naar de buitenrand.
6. Na het laatste blok begint een nieuw pad.

## Balken, stage win en game over

- De linker- en rechterbalk bewaren onafhankelijk hun positie binnen het level.
- Alleen de balk aan de zijde van het huidige pad beweegt.
- Wanneer een balk de middenbalk raakt, is het level gewonnen.
- Bij een stage win blijft de totaalscore bewaard en begint het volgende level met beide balken op hun beginpositie.
- Wanneer een balk de buitenrand raakt, is het game over.
- Een volledig nieuw spel begint opnieuw in level 1 met nul punten.

## Kleuren en richtingen

- De kleuren zijn helder rood en helder blauw.
- Kleur geeft nooit een richting of schermzijde aan.
- Kleur en richting worden onafhankelijk van elkaar gekozen.
- De kleurinvoer mag als schermbrede verkleuring worden getoond.
- De eerste richtingsfase gebruikt boven en rechts en beweegt naar de rechterrand.
- De volgende richtingsfase gebruikt boven en links en beweegt naar de linkerrand.
- Daarna blijven de twee richtingsfasen elkaar afwisselen.

## Puntentelling

- Juist blok: 1 punt.
- Pad voltooid: 3 bonuspunten.
- Verkeerde combinatie: 1 punt eraf.
- Een score kan nooit lager worden dan nul.
- Alleen een juist blok verplaatst een balk naar binnen; de padbonus veroorzaakt geen extra balkstappen.

## Invarianten

Deze regels mogen niet bij toeval veranderen tijdens visueel of technisch onderhoud:

- Er is precies één actief blok tijdens het spelen.
- Alleen een gelijktijdig juiste kleur én richting speelt een blok weg.
- Een horizontale richting wijst altijd naar de actieve zijde.
- Binnen één pad verandert de richtingsset niet.
- Score en balkposities worden door de regelkern bepaald, niet door animaties.
- Een volgend level bewaart de score; een nieuw spel wist de score.

## Afstelbare waarden

Getallen zoals padlengte, fasegrootte, punten en het aantal balkstappen tot winst of verlies staan één keer in `src/game/config.ts`. Verander ze daar; kopieer ze niet naar scènes of tests.
