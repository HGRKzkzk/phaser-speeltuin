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

## Kernlus

1. Een spel begint in level 1 met nul punten en twee balken op hun beginpositie.
2. De speler houdt de kleur van het actieve blok vast: rood of blauw.
3. Tegelijk drukt de speler de richting van dat blok in.
4. Een juiste combinatie verwijdert het blok, geeft een punt en beweegt de balk aan de actieve zijde naar het midden.
5. Een verkeerde combinatie kost een punt en beweegt diezelfde balk naar de buitenrand.
6. Na het laatste blok begint een nieuw pad.

## Balken, stage win en game over

- De linker- en rechterbalk bewaren onafhankelijk hun positie binnen het level.
- Ieder level heeft één actieve zijde; de balk aan die zijde is wit en reageert op de invoer van de speler.
- De balk aan de andere zijde is rood en beweegt uitsluitend door het verstrijken van tijd onafgebroken naar het midden.
- Wanneer de witte actieve balk de middenbalk raakt, is het level gewonnen.
- Wanneer de rode tijdsbalk de middenbalk raakt, is het game over.
- Bij een stage win blijft de totaalscore bewaard en begint het volgende level met beide balken op hun beginpositie.
- Het volgende level gebruikt de andere zijde en de bijbehorende horizontale richting.
- Wanneer een balk de buitenrand raakt, is het game over.
- Een volledig nieuw spel begint opnieuw in level 1 met nul punten.

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

- Een juist blok heeft 1 basispunt.
- De reactietijd bepaalt een kwaliteitsbonus; de actieve multiplier vermenigvuldigt basispunt en kwaliteitsbonus.
- Pad voltooid: 3 bonuspunten.
- Verkeerde combinatie: 1 punt eraf.
- Een score kan nooit lager worden dan nul.
- Alleen een juist blok verplaatst een balk naar binnen; de padbonus veroorzaakt geen extra balkstappen.

## Tijd, kwaliteit en combo

- Ieder actief blok krijgt een eigen reactietijd vanaf het moment waarop het actief wordt.
- De kwaliteitsniveaus zijn `STEADY`, `GOOD`, `GREAT` en `PERFECT`.
- Snelle opeenvolgende goede treffers bouwen een combo op.
- De multiplier wordt ×2 na 3 treffers, ×3 na 6, ×4 na 10 en ×5 na 15.
- Meer dan 900 milliseconden tussen twee goede treffers begint een nieuwe combo.
- Een fout verbreekt de combo onmiddellijk.
- De rode balk heeft 18 seconden nodig om het midden te bereiken; diezelfde grens bepaalt de tijdbonus bij een eerdere stage-win.
- Multiplier en kwaliteit beïnvloeden alleen de score; iedere goede treffer blijft precies één balkstap waard.
- Visuele effecten mogen met de multiplier meegroeien, maar nooit de leesbaarheid van het actieve blok aantasten.

## Invarianten

Deze regels mogen niet bij toeval veranderen tijdens visueel of technisch onderhoud:

- Er is precies één actief blok tijdens het spelen.
- Alleen een gelijktijdig juiste kleur én richting speelt een blok weg.
- Een horizontale richting wijst altijd naar de actieve zijde.
- Binnen één level verandert de actieve zijde niet.
- Score en balkposities worden door de regelkern bepaald, niet door animaties.
- Reactietijd wordt door de scène gemeten, maar kwaliteit, combo, multiplier en punten worden door de regelkern bepaald.
- De scène tekent de rode balk op basis van de verstreken tijd; de regelkern bepaalt wanneer die tijd game over veroorzaakt.
- Een volgend level bewaart de score; een nieuw spel wist de score.
- Affiniteit en aanbod worden door de regelkern geregistreerd, niet door de presentatie.

## Afstelbare waarden

Getallen zoals padlengte, punten en het aantal balkstappen tot winst of verlies staan één keer in `src/game/config.ts`. Verander ze daar; kopieer ze niet naar scènes of tests.
