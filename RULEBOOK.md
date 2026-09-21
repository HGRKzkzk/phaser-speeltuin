# Rulebook

Dit document beschrijft de spelregels. Visuele vormgeving, animaties en precieze toetskeuzes mogen veranderen zonder dat daarmee automatisch de regels veranderen.

## Begrippen

- **Ronde:** één speelsessie van 17 seconden.
- **Pad:** de zeven blokken tussen het midden en één schermrand.
- **Blok:** één onafhankelijke combinatie van een kleur en een richting.
- **Actief blok:** het enige blok waarop invoer op dat moment betrekking heeft.
- **Richtingsfase:** drie opeenvolgende paden met dezelfde horizontale richting.

## Kernlus

1. Een ronde begint met nul punten en een nieuw pad.
2. De speler houdt de kleur van het actieve blok vast: rood of blauw.
3. Tegelijk drukt de speler de richting van dat blok in.
4. Een juiste combinatie verwijdert het blok en activeert het volgende blok richting de rand.
5. Na het laatste blok is de rand bereikt en begint onmiddellijk een nieuw pad.
6. Na 17 seconden eindigt de ronde en verschijnt de score.

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

## Einde en herstart

- Na 17 seconden wordt geen nieuwe invoer meer verwerkt.
- Het eindscherm toont de score en de lokaal bewaarde beste score.
- De speler kan direct een nieuwe ronde starten.

## Invarianten

Deze regels mogen niet bij toeval veranderen tijdens visueel of technisch onderhoud:

- Er is precies één actief blok.
- Alleen een gelijktijdig juiste kleur én richting speelt een blok weg.
- Een horizontale richting wijst altijd naar de doelrand.
- Binnen één pad verandert de richtingsset niet.
- Een nieuwe ronde begint altijd met nul punten en nul voltooide paden.

## Afstelbare waarden

Getallen zoals rondeduur, padlengte, fasegrootte en punten staan één keer in `src/game/config.ts`. Verander ze daar; kopieer ze niet naar scènes of tests.
