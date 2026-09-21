# Rulebook

Dit document beschrijft de spelregels. Visuele vormgeving, animaties en precieze toetskeuzes mogen veranderen zonder dat daarmee automatisch de regels veranderen.

## Begrippen

- **Spel:** de volledige poging van level 1 tot game over.
- **Level:** een speelveld tussen een nieuwe beginstand van de buitenbalken en een stage win.
- **Pad:** de zeven blokken tussen het midden en één schermrand.
- **Blok:** één onafhankelijke combinatie van een kleur en een richting.
- **Actief blok:** het enige blok waarop invoer op dat moment betrekking heeft.
- **Voortgangsbalk:** de gloeiende balk aan iedere buitenzijde van het speelveld.
- **Affiniteit:** de blijvende registratie van aangeboden en correct gespeelde blokken per combinatie van zijde en kleur.
- **Tekstavontuur:** een korte onderbreking tussen twee levels met een tekstfragment en twee of drie keuzes.
- **Keuzewijzer:** de kleinere, lager geplaatste balk die tijdens een tekstavontuur heen en weer beweegt zolang Shift wordt vastgehouden, en aangeeft welke keuze spatie op dit moment zou bevestigen.

## Kernlus

1. Een spel begint in level 1 met nul punten en twee balken op hun beginpositie.
2. De speler houdt de kleur van het actieve blok vast: rood of blauw.
3. Tegelijk drukt de speler de richting van dat blok in.
4. Een juiste combinatie verwijdert het blok, geeft een punt en beweegt de balk aan de actieve zijde naar het midden.
5. Een verkeerde combinatie kost een punt en beweegt diezelfde balk naar de buitenrand.
6. Na het laatste blok begint een nieuw pad.

## Balken, stage win en game over

- De linker- en rechterbalk bewaren onafhankelijk hun positie binnen het level.
- Ieder level heeft één actieve zijde; alleen de balk aan die zijde beweegt.
- Wanneer een balk de middenbalk raakt, is het level gewonnen.
- Bij een stage win blijft de totaalscore bewaard en begint het volgende level met beide balken op hun beginpositie.
- Het volgende level gebruikt de andere zijde en de bijbehorende horizontale richting.
- Wanneer een balk de buitenrand raakt, is het game over.
- Een volledig nieuw spel begint opnieuw in level 1 met nul punten.

## Tekstavontuur

- Bij het begin van een spel en na ieder tekstavontuur wordt opnieuw willekeurig getrokken hoeveel levels er nog moeten volgen voordat het volgende tekstavontuur begint: 2, 3 of 4.
- Iedere stage-win telt dat aantal met één af.
- Staat dat aantal na een stage-win op nul, dan begint in plaats van het volgende level eerst een tekstavontuur.
- Een tekstavontuur toont één tekstfragment met twee of drie keuzes.
- De keuzewijzer beweegt zolang Shift wordt vastgehouden en staat stil zodra Shift wordt losgelaten.
- Een keuze wordt bevestigd door de spatiebalk in te drukken; de keuze waar de keuzewijzer op dat moment op wijst, is de gemaakte keuze.
- Na een gemaakte keuze begint direct het volgende level, met dezelfde levelwissel van zijde als daarbuiten.
- Een tekstavontuur wisselt nooit de score of het levelnummer; alleen de gemaakte keuze wordt vastgelegd.
- Een tekstavontuur heeft vooralsnog geen ander spelmechanisch gevolg dan die registratie; een latere regelwijziging moet een eventueel gevolg expliciet beschrijven.

## Kleuren en richtingen

- De kleuren zijn helder rood en helder blauw.
- Kleur geeft nooit een richting of schermzijde aan.
- Kleur voorspelt nooit de richting; de vier mogelijke kleur-richtingcombinaties worden per pad zo gelijkmatig mogelijk aangeboden.
- De kleurinvoer mag als schermbrede verkleuring worden getoond.
- Oneven levels gebruiken boven en rechts en bewegen met de rechterbalk.
- Even levels gebruiken boven en links en bewegen met de linkerbalk.

## Latente affiniteit

- Vanaf level 1 worden per kleur-zijdecombinatie zowel aangeboden als correct gespeelde blokken bijgehouden.
- De vier combinaties zijn rood-links, blauw-links, rood-rechts en blauw-rechts.
- Vier kleine lichtpunten mogen deze opbouw subtiel laten voelen zonder haar al volledig uit te leggen.
- Affiniteit blijft over levelovergangen heen bewaard en wordt alleen bij een volledig nieuw spel gewist.
- Affiniteit heeft vooralsnog geen spelmechanisch gevolg; een latere regelwijziging moet dat gevolg expliciet beschrijven.
- Een latere onthulling mag nieuwe mogelijkheden bieden, maar de speler niet met terugwerkende kracht straffen voor verborgen informatie.

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
- Binnen één level verandert de actieve zijde niet.
- Score en balkposities worden door de regelkern bepaald, niet door animaties.
- Een volgend level bewaart de score; een nieuw spel wist de score.
- Affiniteit en aanbod worden door de regelkern geregistreerd, niet door de presentatie.
- Tijdens een tekstavontuur wijst de keuzewijzer altijd op precies één keuze.
- Het aantal levels tot het volgende tekstavontuur wordt nooit tijdens een lopend level opnieuw getrokken, alleen bij het begin van een spel of na een tekstavontuur.
- De beweging van de keuzewijzer zelf is presentatie; alleen de uiteindelijk gemaakte keuze is spelstatus.

## Afstelbare waarden

Getallen zoals padlengte, punten, het aantal balkstappen tot winst of verlies en de mogelijke levelafstand tot een tekstavontuur staan één keer in `src/game/config.ts`. Verander ze daar; kopieer ze niet naar scènes of tests.
