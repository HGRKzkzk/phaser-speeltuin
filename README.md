# Phaser-speeltuin

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

Een goed blok beweegt de gloeiende balk aan de actieve zijde naar het midden. Een fout beweegt die balk naar de buitenrand. Raakt een balk het midden, dan win je het level, neem je de score mee en wisselt het volgende level van zijde. Raakt een balk de buitenrand, dan is het game over. Met de spatiebalk begin je opnieuw; je beste score wordt lokaal bewaard.

Rood en blauw bepalen alleen de kleur, niet de speelrichting. Bij het vasthouden van `A` of `D` krijgt het hele speelveld een subtiele gloed in de gekozen kleur. Vier kleine lichtpunten bouwen vanaf het begin mee met correct gespeelde blokken voor rood/blauw × links/rechts. Deze affiniteit blijft tussen levels bewaard, maar heeft nog geen spelmechanisch gevolg.

Na willekeurig 2, 3 of 4 levels wacht een kort tekstavontuur voordat het volgende level begint. Houd `Shift` vast om de kleinere, lager geplaatste keuzewijzer heen en weer te laten bewegen tussen de keuzes; laat los om hem stil te zetten. Druk op de spatiebalk om de keuze te bevestigen waar de wijzer op dat moment op staat. De keuze wordt vastgelegd maar heeft nog geen ander spelmechanisch gevolg; score en level blijven ongewijzigd door de keuze zelf.

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

De tests bewaken de puntentelling, balkvoortgang, levelovergangen, de gebalanceerde blokkenzak, de latente affiniteit en het tekstavontuur.

## Productiebuild controleren

```bash
npm run build
```

De gebouwde bestanden komen in `dist/` en worden niet in Git opgeslagen.
