# Rulebook

Dit document beschrijft de spelregels. Visuele vormgeving, animaties en precieze toetskeuzes mogen veranderen zonder dat daarmee automatisch de regels veranderen.

## Begrippen

- **Spel:** de volledige poging van level 1 tot game over.
- **Level:** een speelveld tussen een nieuwe beginstand van de buitenbalken en een stage win of het verstrijken van de tijd.
- **Pad:** de zeven blokken tussen het midden en één schermrand.
- **Blok:** één onafhankelijke combinatie van een kleur en een richting.
- **Actief blok:** het enige blok waarop invoer op dat moment betrekking heeft.
- **Voortgangsbalk:** de gloeiende balk aan iedere buitenzijde van het speelveld.
- **Affiniteit:** de blijvende registratie van aangeboden en correct gespeelde blokken per combinatie van zijde en kleur.
- **Tekstavontuur:** een onderbreking tussen twee levels die uit een reeks fragmenten bestaat en pas eindigt wanneer een keuze daar expliciet toe leidt.
- **Fragment:** één stap binnen een tekstavontuur: een tekst met twee of drie keuzes, waarvan iedere keuze naar een volgend fragment leidt of het avontuur beëindigt.
- **Keuzewijzer:** de kleinere, lager geplaatste balk die tijdens een tekstavontuur heen en weer beweegt zolang Shift wordt vastgehouden, en aangeeft welke keuze spatie op dit moment zou bevestigen via een kleine, terughoudende aanwijzing.
- **Houding:** de gedurfde of behoedzame waarde van een keuze binnen een tekstavontuur; geen van beide is op zichzelf beter dan de andere.
- **Overwicht:** de houding die onder de keuzes vóór de laatste keuze van een tekstavontuur vaker voorkomt dan de andere; er is geen overwicht als de aantallen gelijk zijn.

## Kernlus

1. Een spel begint in level 1 met nul punten en twee balken op hun beginpositie.
2. De speler houdt de kleur van het actieve blok vast: rood of blauw.
3. Tegelijk drukt de speler de richting van dat blok in.
4. Een juiste combinatie verwijdert het blok, geeft een punt en beweegt de balk aan de actieve zijde naar het midden.
5. Een verkeerde combinatie kost een punt en beweegt diezelfde balk naar de buitenrand.
6. Na het laatste blok begint een nieuw pad.

## Balken, levelovergangen en game over

- De linker- en rechterbalk bewaren onafhankelijk hun positie binnen het level.
- Ieder level heeft één actieve zijde; de balk aan die zijde is wit en reageert op de invoer van de speler.
- De balk aan de andere zijde is rood en beweegt door het verstrijken van tijd onafgebroken naar het midden.
- Iedere correcte treffer duwt de rode tijdsbalk minimaal 250 milliseconden terug.
- Iedere multiplierstap voegt daar per treffer 100 milliseconden aan toe: van 250 milliseconden bij ×1 tot 650 milliseconden bij ×5.
- Langzaam spelen koopt minder tijd terug dan er verstrijkt; alleen een voldoende hoog raaktempo kan de rode balk blijvend voorblijven.
- Wanneer de witte actieve balk de middenbalk raakt, is het level gewonnen.
- Wanneer de rode tijdsbalk de middenbalk raakt, eindigt alleen het level (`stage-late`). De score blijft bewaard, er is geen tijdbonus, en het volgende level of tekstavontuur gaat gewoon door.
- Bij iedere levelovergang blijft de totaalscore bewaard en begint het volgende level met beide balken op hun beginpositie.
- Het volgende level gebruikt de andere zijde en de bijbehorende horizontale richting.
- Wanneer de witte balk de buitenrand raakt, is het game over.
- Een volledig nieuw spel begint opnieuw in level 1 met nul punten.
- Gewone levels vragen 21 netto treffers en geven 24 seconden basistijd. Een routekeuze kan voor één level een ander doel en een andere basistijd vastleggen.
- De witte balk bereikt zichtbaar het midden bij het doel van dat level; een fout blijft één voortgangsstap kosten en de buitenrand blijft de verliesgrens.

## De belofte aan Noor

- Na het eerste level (gewonnen of te laat) volgt altijd de ontmoeting met Noor, vóór een willekeurig avontuur.
- Je belooft samen vóór het donker de schuilplaats te bereiken. Beide antwoorden op de ontmoeting leiden naar dezelfde routekeuze.
- Over de open vlakte vraagt het volgende level 14 netto treffers met 16 seconden basistijd; langs de beschutting vraagt het 28 netto treffers met 32 seconden basistijd.
- Beide routes hebben dezelfde verhouding tussen basistijd en benodigde treffers. De langere route biedt meer gelegenheid voor combo-opbouw, maar vraagt ook langer concentratie.
- De keuzes benoemen vooraf kortere weg/sneller donker en langere weg/meer tijd. Tijdens het level zijn route, reisgenoot en doel zichtbaar.
- De route-instellingen staan bij de start van het level vast en bepalen zowel winst, tijdverlies, tijdbonus als de getekende balkposities.
- Per level worden fouten, hoogste combo (aantal treffers) en verstreken speeltijd geregistreerd. Bij het einde van de route wordt ook de resterende tijd bewaard in een herinnering.
- Na het routelevel volgt altijd een aankomstgesprek. Is de rode lijn in het midden, dan komen jullie na het donker aan met een eigen reactie van Noor; ook zonder correcte treffers gaat het verhaal verder. Veel fouten of weinig resterende tijd geven een moeizame aankomst; foutloos spelen met een sterke combo geeft een vloeiende aankomst; anders komen jullie gestaag aan. De grenzen staan in de centrale configuratie.
- Alle aankomsten bieden een gesprek en een rustmoment. Ze zijn geen morele beoordeling en leveren geen extra scorebonus op.
- De ontmoeting, routekeuze en aankomst kennen geen afwijkingsbonus voor het kiezen van een andere houding.
- Tijdens gesprekken loopt geen actieve levelklok. Pas na de routekeuze of het laatste aankomstantwoord begint de klok van het volgende level.
- Na de aankomst gelden weer de gewone levelregels. Noor en de herinnering blijven zichtbaar en klinken door in het begin van latere avonturen.
- Bij game over stopt de poging zonder aankomst. Een nieuw spel wist ook Noor, de route en de herinnering.

## Tekstavontuur

- Bij het begin van een spel en na ieder tekstavontuur wordt opnieuw willekeurig getrokken hoeveel levels er nog moeten volgen voordat het volgende tekstavontuur begint: 2, 3 of 4.
- De vaste ontmoeting en aankomst van Noor gaan voor op deze teller. Na de aankomst loopt de gewone afwisseling verder.
- Ieder afgerond level (gewonnen of te laat) telt dat aantal precies één keer met één af.
- Staat dat aantal na een afgerond level op nul, dan begint in plaats van het volgende level eerst een tekstavontuur.
- Een tekstavontuur begint bij het eerste fragment van een willekeurig gekozen avontuur en toont daarna telkens één fragment met twee of drie keuzes.
- De keuzewijzer beweegt zolang Shift wordt vastgehouden en staat stil zodra Shift wordt losgelaten.
- Een keuze wordt bevestigd door de spatiebalk in te drukken; de keuze waar de keuzewijzer op dat moment op wijst, is de gemaakte keuze.
- Welke keuze de keuzewijzer op dat moment aanwijst, wordt slechts als kleine, terughoudende aanwijzing getoond; nooit als een expliciete tekstuele instructie op de keuze zelf.
- Een gemaakte keuze leidt naar het volgende fragment van hetzelfde avontuur, of beëindigt het avontuur; nooit allebei tegelijk.
- Elke keuze in een tekstavontuur draagt een houding: gedurfd of behoedzaam.
- Is er onder de keuzes vóór de laatste keuze van het avontuur een overwicht, en wijkt de houding van de laatste keuze daarvan af, dan levert dat een bonus van `adventure.defianceBonus` punten op.
- Volgt de laatste keuze het overwicht, of is er geen overwicht, dan levert de laatste keuze geen bonus op.
- In de gewone avonturen is deze bonus de enige directe score-invloed; het levelnummer wisselt niet tijdens het doorlopen ervan. De Noor-verhaallus gebruikt gevolgen voor het lijnlevel en gesprek, zonder deze bonus.
- Zodra het avontuur eindigt, wordt de eventuele bonus toegekend en begint direct het volgende level, met dezelfde levelwissel van zijde als daarbuiten.

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
- De combo vergroot naast de score ook de afstand tot de rode tijdslijn: ×1 koopt 250 ms per treffer, ×2 350 ms, ×3 450 ms, ×4 550 ms en ×5 650 ms.
- Zonder goede treffers heeft de rode balk in een gewoon level 24 seconden nodig om het midden te bereiken. Een gekozen route gebruikt de eigen basistijd.
- De actuele positie van de rode balk bepaalt ook de tijdbonus bij een eerdere stage-win. Tijd alleen veroorzaakt nooit game over; snel spelen beloont, langzaam spelen blokkeert het verhaal niet.
- Kwaliteit beïnvloedt alleen de score; de multiplier verhoogt zowel de score als de teruggewonnen tijd. Iedere goede treffer blijft precies één stap van de witte balk waard.
- Visuele effecten mogen met de multiplier meegroeien, maar nooit de leesbaarheid van het actieve blok aantasten.

## Invarianten

Deze regels mogen niet bij toeval veranderen tijdens visueel of technisch onderhoud:

- Er is precies één actief blok tijdens het spelen.
- Alleen een gelijktijdig juiste kleur én richting speelt een blok weg.
- Een horizontale richting wijst altijd naar de actieve zijde.
- Binnen één level verandert de actieve zijde niet.
- Score en balkposities worden door de regelkern bepaald, niet door animaties.
- Reactietijd wordt door de scène gemeten, maar kwaliteit, combo, multiplier en punten worden door de regelkern bepaald.
- De scène tekent de rode balk op basis van de verstreken tijd; de regelkern bepaalt wanneer die tijd het level zonder bonus afrondt.
- Teruggewonnen tijd wordt door de regelkern bijgehouden en bij ieder nieuw level op nul gezet.
- De regelkern bewaart route, levelinstellingen en speelresultaat; de scène leest deze voor presentatie en bepaalt geen verhaaluitkomst.
- Herinneringen veranderen nooit de gedeelde bronverhalen en blijven bewaard als de levelstatistieken bij de volgende start worden gewist.
- Een volgend level bewaart de score; een nieuw spel wist de score.
- Affiniteit en aanbod worden door de regelkern geregistreerd, niet door de presentatie.
- Tijdens een tekstavontuur wijst de keuzewijzer altijd op precies één keuze.
- Het aantal levels tot het volgende tekstavontuur wordt nooit tijdens een lopend level opnieuw getrokken, alleen bij het begin van een spel of na een tekstavontuur.
- De beweging van de keuzewijzer zelf is presentatie; alleen de uiteindelijk gemaakte keuze is spelstatus.
- Het huidige fragment van een tekstavontuur is spelstatus; welk fragment na een keuze volgt, ligt vast in het avontuur zelf, niet in de presentatie.
- De aanwijzing van de keuzewijzer blijft klein en mag de aangewezen keuze nooit met tekst benoemen.
- De afwijkingsbonus hangt alleen af van de houdingen binnen hetzelfde avontuur, nooit van eerdere avonturen of van de speler zijn algehele voortgang.
- Geen van beide houdingen wordt door de regels als wenselijk, verplicht of fout aangemerkt; de bonus beloont het afwijken van het eigen patroon, niet een van de twee houdingen zelf.

## Afstelbare waarden

Getallen zoals padlengte, punten, het aantal balkstappen tot winst of verlies, route-instellingen, aankomstgrenzen, de mogelijke levelafstand tot een tekstavontuur en de afwijkingsbonus staan één keer in `src/game/config.ts`. Verander ze daar; kopieer ze niet naar scènes of tests.
