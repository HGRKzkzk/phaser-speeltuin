# Phaser-speeltuin

Een kleine, lichte basis om op een Chromebook met [Phaser](https://phaser.io/), TypeScript en Vite te experimenteren.

De demo tekent alles met code, dus je hoeft geen afbeeldingen of andere assets te downloaden.

## Spelregels

Een ronde duurt 17 seconden. Speel vanaf het midden zeven willekeurige blokken weg om de actieve rand te bereiken:

- houd `A` vast voor een rood blok of `D` voor een blauw blok;
- druk tegelijk op de richting van het actieve blok;
- de eerste drie reeksen gebruiken `↑` en `→`, de volgende drie `↑` en `←`; daarna wisselt dit opnieuw;
- een goed blok levert 1 punt op;
- de rand bereiken levert 3 bonuspunten op;
- een verkeerde combinatie kost 1 punt, tot een minimum van 0.

Na afloop druk je op de spatiebalk om onmiddellijk een nieuwe ronde te beginnen. Je beste score wordt lokaal in de browser bewaard.

Rood en blauw bepalen alleen de kleur, niet de speelrichting. Bij het vasthouden van `A` of `D` krijgt het hele speelveld een subtiele gloed in de gekozen kleur. Het aantal reeksen voor een richtingswissel staat bovenaan `GameScene.ts` in `DIRECTION_SWITCH_EVERY`.

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

- `src/scenes/GameScene.ts`: het speelveld en de beweging.
- `src/main.ts`: de algemene Phaser-instellingen.
- `src/style.css`: de pagina rondom het spel.

Pas bijvoorbeeld in `GameScene.ts` de rondetijd, kleuren, score of het aantal blokken aan.

## Productiebuild controleren

```bash
npm run build
```

De gebouwde bestanden komen in `dist/` en worden niet in Git opgeslagen.
