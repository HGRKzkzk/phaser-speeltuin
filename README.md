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

Reactietijd geeft iedere goede treffer de kwaliteit `STEADY`, `GOOD`, `GREAT` of `PERFECT`. Snelle opeenvolgende treffers bouwen een multiplier op van ×2 tot ×5. Een fout breekt de combo. Zonder treffers heeft de rode balk 18 seconden nodig om het midden te bereiken. Iedere goede treffer koopt minimaal 0,25 seconde terug; dit groeit met de multiplier tot 0,65 seconde bij ×5. Bij langzaam spel vervalt de combo en blijft de lijn netto oprukken. Een eerdere level-clear levert een tijdbonus op. De effecten groeien mee met de multiplier, maar witte balkvoortgang blijft altijd precies één stap per goed blok.

Een goed blok beweegt de witte balk aan de actieve zijde naar het midden en duwt de rode tijdsbalk een klein stukje terug. Een fout beweegt de witte balk naar de buitenrand. Aan de andere zijde kruipt de rode balk voortdurend naar het midden. Bereikt wit het midden eerst, dan win je het level en wisselt het volgende level van zijde. Bereikt rood het midden of wit de buitenrand, dan is het game over. Met de spatiebalk begin je opnieuw; je beste score wordt lokaal bewaard.

Rood en blauw bepalen alleen de kleur, niet de speelrichting. Bij het vasthouden van `A` of `D` krijgt het hele speelveld een subtiele gloed in de gekozen kleur. Vier kleine lichtpunten bouwen vanaf het begin mee met correct gespeelde blokken voor rood/blauw × links/rechts. Deze affiniteit blijft tussen levels bewaard, maar heeft nog geen spelmechanisch gevolg.

Na willekeurig 2, 3 of 4 levels wacht een tekstavontuur van een paar fragmenten voordat het volgende level begint. Houd `Shift` vast om de kleinere, lager geplaatste keuzewijzer heen en weer te laten bewegen tussen de keuzes; laat los om hem stil te zetten. Druk op de spatiebalk om de keuze te bevestigen waar de wijzer op dat moment op staat; welke keuze dat is, wordt slechts als klein, terughoudend puntje getoond, nooit als expliciete tekst op de keuze zelf. Iedere keuze leidt naar het volgende fragment van hetzelfde avontuur of beëindigt het; pas dan begint het volgende level.

Elke keuze in een tekstavontuur draagt een houding: gedurfd of behoedzaam, zonder dat de een beter is dan de ander. Vormen de keuzes vóór de laatste keuze van het avontuur samen een overwicht van de ene houding, dan levert een laatste keuze die daarvan afwijkt een bonus op — groter dan wat een gewone keuze zou opleveren. Volg je je eigen patroon, of is er geen duidelijk overwicht, dan blijft de score ongewijzigd. Geen enkele richting is dus verplicht of zelfs maar wenselijk; de beloning zit in het doorbreken van je eigen patroon, niet in een van de twee houdingen zelf.

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

## Productiebuild controleren

```bash
npm run build
```

De gebouwde bestanden komen in `dist/` en worden niet in Git opgeslagen.
