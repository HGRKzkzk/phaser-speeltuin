# Phaser-speeltuin

[![CI](https://github.com/HGRKzkzk/phaser-speeltuin/actions/workflows/ci.yml/badge.svg)](https://github.com/HGRKzkzk/phaser-speeltuin/actions/workflows/ci.yml)

Een kleine, lichte basis om op een Chromebook met [Phaser](https://phaser.io/), TypeScript en Vite te experimenteren.

De demo tekent alles met code, dus je hoeft geen afbeeldingen of andere assets te downloaden.

## Spelregels

Speel vanaf het midden zeven willekeurige blokken per pad weg:

- houd `A` vast voor een rood blok of `D` voor een blauw blok;
- druk tegelijk op de richting van het actieve blok;
- oneven levels gebruiken `↑` en `→`, even levels gebruiken `↑` en `←`;
- een goed blok levert 1 punt op;
- een voltooid pad levert 3 bonuspunten op;
- een verkeerde combinatie kost 1 punt, tot een minimum van 0.

Reactietijd geeft iedere goede treffer de kwaliteit `STEADY`, `GOOD`, `GREAT` of `PERFECT`. Snelle opeenvolgende treffers bouwen een multiplier op van ×2 tot ×5. Een fout breekt de combo. In gewone levels heeft de rode balk zonder treffers 24 seconden nodig om het midden te bereiken. Iedere goede treffer koopt minimaal 0,25 seconde terug; dit groeit met de multiplier tot 0,65 seconde bij ×5. Bij langzaam spel vervalt de combo en blijft de lijn netto oprukken. Een eerdere level-clear levert een tijdbonus op. De effecten groeien mee met de multiplier, maar witte balkvoortgang blijft altijd precies één stap per goed blok.

Een goed blok beweegt de witte balk aan de actieve zijde naar het midden en duwt de rode tijdsbalk een klein stukje terug. Een fout beweegt de witte balk naar de buitenrand. Aan de andere zijde kruipt de rode balk voortdurend naar het midden. Bereikt wit het midden eerst, dan win je het level en wisselt het volgende level van zijde. Bereikt rood het midden, dan eindigt het level zonder tijdbonus en ga je met behoud van punten verder. Alleen als wit de buitenrand raakt, is het game over. Met de spatiebalk begin je opnieuw; je beste score wordt lokaal bewaard.

Rood en blauw bepalen alleen de kleur, niet de speelrichting. Bij het vasthouden van `A` of `D` krijgt het hele speelveld een subtiele gloed in de gekozen kleur. Vier kleine lichtpunten bouwen vanaf het begin mee met correct gespeelde blokken voor rood/blauw × links/rechts. Deze affiniteit blijft tussen levels bewaard, maar heeft nog geen spelmechanisch gevolg.

Na het eerste level ontmoet je Noor, ook als de tijd op is. Jullie willen samen vóór het donker een schuilplaats bereiken. Je kiest de open vlakte (14 treffers, 16 seconden) of de beschutte route (28 treffers, 32 seconden). Bij de schuilplaats klemt de deur en klinkt getik. Luisteren en onderzoeken leveren verschillende aanwijzingen op; je kunt beide doen voordat je een aanpak kiest.

Die aanpak verandert precies één volgend lijnlevel. **Deur optillen** groepeert de kleuren per pad, zodat je minder vaak van kleur wisselt. **Scharnieren losmaken** groepeert de richtingen, zodat je minder vaak van pijl wisselt. Het aanbod van kleur-richtingcombinaties blijft gelijk. Je opent de deur, of vindt bij tijdsverloop een droge bank onder het afdak. Beide aflopen gaan via een rustmoment naar het volgende level met gewone blokken. Noor onthoudt de afloop in latere avonturen; een nieuwe run wist die herinnering.

Daarna wacht na willekeurig 2, 3 of 4 levels een van de bestaande tekstavonturen. Gebruik `←` en `→` om te selecteren en `Enter` om te bevestigen, of klik/tik op de keuze. Een duidelijke rand toont de selectie. Bij meerdere opties begint het fragment zonder selectie; bij één vervolgknop volstaat Enter. Spatie blijft als alternatief voor Enter werken. Tijdens het lezen staat de tijd stil.

Bij de **aanpak van de deur** kun je `←` of `→` ongeveer een halve seconde vasthouden, of de keuze met muis/vinger ingedrukt houden. Een lichtbalkje vult zich en een korte reactie van Noor verschijnt. Loslaten vóór voltooiing stopt de handeling. Buiten de knop bewegen of het venster verlaten breekt de poging ook af. Laat na een bevestiging eerst los voordat je verdergaat. Kort selecteren en Enter blijft mogelijk. De bewegende Shift-wijzer is vervallen; het vasthouden wordt alleen bij deze twee deurhandelingen uitgeprobeerd.

Tekstkeuzes leveren geen punten op en krijgen geen verborgen houding toegekend. Bij de nieuwe ontmoeting zit het gevolg in wat je ontdekt, hoe het volgende level speelt en waar jullie de nacht doorbrengen. De drie oudere avonturen blijven voorlopig beschikbaar; zij hebben nog niet dezelfde uitwerking als de deurontmoeting.

## Op je Chromebook installeren

Zet eerst **Linux-ontwikkelomgeving** aan via ChromeOS: **Instellingen → Geavanceerd → Ontwikkelaars → Linux-ontwikkelomgeving**.

Open daarna de Linux-terminal en voer uit:

```bash
sudo apt update
sudo apt install -y git curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
```

Haal vervolgens dit project binnen:

```bash
git clone https://github.com/HGRKzkzk/phaser-speeltuin.git
cd phaser-speeltuin
npm install
npm run dev
```

Open het lokale adres dat Vite toont, meestal <http://localhost:5173>.

Stop de ontwikkelserver met `Ctrl+C`. De volgende keer start je hem opnieuw met:

```bash
cd phaser-speeltuin
npm run dev
```

## Waar begin je met rommelen?

- `RULEBOOK.md`: de betekenis en vaste regels van het spel.
- `src/game/config.ts`: alle afstelbare getallen.
- `src/game/rules.ts`: de spelregels zonder Phaser of weergavecode.
- `src/game/journey.ts`: de ontmoeting met Noor, routeregels en herinneringen.
- `src/game/shelter.ts`: deuronderzoek, aanpak, afloop en groepering van blokken.
- `src/game/adventureSelection.ts`: directe selectie van tekstkeuzes.
- `src/game/choiceHold.ts`: opbouw, afbreken en loslaten van een vasthoudactie.
- `src/game/adventures.ts`: de verhaalfragmenten en keuzes van het tekstavontuur.
- `src/game/types.ts`: de gedeelde begrippen als TypeScript-types.
- `src/scenes/GameScene.ts`: toetsen, animaties en weergave.
- `src/main.ts`: de algemene Phaser-instellingen.
- `src/style.css`: de pagina rondom het spel.

Pas tempo, score of padlengte aan in `config.ts`. Pas een fundamentele spelregel eerst aan in `RULEBOOK.md` en daarna in `rules.ts`.

## Tests

```bash
npm test
```

De tests bewaken puntentelling, timing, kwaliteit, combo, balkvoortgang, levelovergangen, de gebalanceerde blokkenzak, latente affiniteit en het tekstavontuur.

## Linten en formatteren

```bash
npm run lint
npm run format
```

ESLint bewaakt veelvoorkomende TypeScript-fouten, Prettier houdt de stijl consistent. `npm run format:check` (gebruikt in CI) faalt als bestanden niet geformatteerd zijn zonder ze aan te passen.

## Productiebuild controleren

```bash
npm run build
```

De gebouwde bestanden komen in `dist/` en worden niet in Git opgeslagen.
