// Builds the free picture library from two openly licensed sets (both MIT): Microsoft's Fluent Emoji
// (flat style) for colourful pictures and Tabler Icons for simple line icons. Only the pictures listed here
// go in, grouped the way people look for them. Output: src/templates/art-data.js (loaded only when needed).
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fluent = require('@iconify-json/fluent-emoji-flat/icons.json');
const tabler = require('@iconify-json/tabler/icons.json');

const CATS = {
  celebrate: 'party-popper confetti-ball balloon birthday-cake wrapped-gift partying-face sparkles fireworks sparkler clinking-glasses bottle-with-popping-cork ribbon crown star glowing-star trophy 1st-place-medal sports-medal military-medal rosette graduation-cap ring wedding bouquet two-hearts red-heart heart-with-ribbon sparkling-heart love-letter dove cupcake shortcake candle mirror-ball piata admission-tickets',
  seasons: 'christmas-tree santa-claus mrs-claus snowman snowflake bell pine-decoration jack-o-lantern ghost bat spider-web maple-leaf fallen-leaf leaf-fluttering-in-wind sunflower tulip cherry-blossom blossom rose hibiscus white-flower bouquet sun sun-with-face sun-behind-cloud rainbow cloud-with-rain umbrella-with-rain-drops beach-with-umbrella palm-tree crescent-moon full-moon night-with-stars egg rabbit-face hatching-chick baby-chick turkey red-paper-lantern fire evergreen-tree deciduous-tree four-leaf-clover herb seedling potted-plant cactus mushroom chestnut sheaf-of-rice ear-of-corn',
  faith: 'church latin-cross orthodox-cross folded-hands candle dove star-of-david menorah mosque star-and-crescent diya-lamp om prayer-beads baby-angel bell',
  food: 'hot-beverage teacup-without-handle teapot croissant bread baguette-bread cheese-wedge pizza hamburger spaghetti green-salad steaming-bowl pot-of-food shallow-pan-of-food fork-and-knife fork-and-knife-with-plate cooking wine-glass beer-mug clinking-beer-mugs cocktail-glass tropical-drink glass-of-milk cup-with-straw bubble-tea ice-cream soft-ice-cream doughnut cookie pie pancakes waffle cut-of-meat poultry-leg fish shrimp lobster red-apple green-apple grapes lemon strawberry watermelon cherries peach banana pineapple olive tomato carrot avocado broccoli potato garlic onion bell-pepper hot-pepper honey-pot chocolate-bar candy lollipop popcorn hot-dog taco burrito sandwich sushi bacon cooked-rice french-fries salt butter baby-bottle',
  animals: 'dog-face dog poodle guide-dog cat-face cat black-cat paw-prints rabbit hamster mouse-face bird parrot owl eagle swan duck chicken rooster baby-chick penguin butterfly honeybee lady-beetle snail turtle frog tropical-fish dolphin whale horse-face unicorn cow-face pig-face ewe goat deer fox bear teddy-bear panda koala lion tiger-face elephant giraffe zebra monkey-face hedgehog sloth otter t-rex',
  school: 'school books open-book notebook closed-book pencil crayon artist-palette paintbrush backpack abacus straight-ruler triangular-ruler globe-showing-europe-africa globe-showing-americas world-map microscope test-tube light-bulb graduation-cap teacher student laptop desktop-computer puzzle-piece magnifying-glass-tilted-left memo scroll bookmark-tabs alarm-clock spiral-calendar tear-off-calendar pushpin round-pushpin paperclip scissors megaphone loudspeaker telescope rocket atom-symbol',
  sport: 'soccer-ball basketball volleyball tennis american-football baseball rugby-football ping-pong badminton bowling flag-in-hole chequered-flag bicycle person-running person-swimming person-biking skis ice-skate flexed-biceps running-shoe goal-net chess-pawn game-die video-game kite yo-yo fishing-pole tent camping mountain snow-capped-mountain sunrise-over-mountains national-park sailboat canoe stadium',
  music: 'guitar violin trumpet saxophone drum accordion musical-keyboard banjo flute maracas musical-note musical-notes musical-score microphone studio-microphone headphone performing-arts clapper-board film-projector movie-camera ticket circus-tent ferris-wheel roller-coaster carousel-horse framed-picture camera camera-with-flash yarn thread sewing-needle dancing',
  people: 'waving-hand thumbs-up clapping-hands raising-hands open-hands heart-hands handshake folded-hands smiling-face-with-smiling-eyes grinning-face beaming-face-with-smiling-eyes star-struck smiling-face-with-heart-eyes partying-face smiling-face-with-sunglasses baby child girl boy older-person old-woman old-man people-hugging busts-in-silhouette bust-in-silhouette woman-cook man-cook health-worker farmer woman-teacher man-teacher woman-dancing man-dancing woman-singer man-singer artist construction-worker speech-balloon thought-balloon',
  business: 'office-building house house-with-garden houses shopping-cart shopping-bags convenience-store department-store money-bag coin euro-banknote dollar-banknote pound-banknote credit-card receipt chart-increasing bar-chart briefcase handshake telephone telephone-receiver mobile-phone envelope e-mail incoming-envelope postbox package delivery-truck automobile bus airplane globe-with-meridians key old-key locked hammer wrench hammer-and-wrench toolbox gear broom basket soap bed couch-and-lamp door label name-badge identification-card calendar hourglass-done mantelpiece-clock watch gem-stone hospital stethoscope pill adhesive-bandage tooth lotion-bottle nail-polish lipstick barber-pole dress t-shirt womans-hat high-heeled-shoe handbag sunglasses',
  signs: 'warning no-entry stop-sign prohibited no-smoking no-mobile-phones no-littering check-mark-button cross-mark information red-exclamation-mark red-question-mark right-arrow left-arrow up-arrow down-arrow up-right-arrow wheelchair-symbol restroom mens-room womens-room baby-symbol potable-water wireless recycling-symbol litter-in-bin-sign p-button sos-button new-button free-button ok-button cool-button up-button hundred-points',
};
const ICONS = 'phone mail map-pin world clock calendar user building home star heart check arrow-right arrow-left arrow-up arrow-down wifi shopping-cart truck gift coffee tools-kitchen-2 music camera leaf sun moon phone-call at printer car bike accessible parking ticket currency-euro currency-dollar currency-pound discount tag scissors cut school book pencil palette paw dog cat church cross candle bell confetti cake balloon glass-full beer pizza burger salad soup fish meat bread ice-cream cup flower plant tree snowflake christmas-tree sparkles trophy medal award certificate crown speakerphone info-circle alert-triangle ban circle-check circle-x clock-hour-4 hourglass lock key tools hammer briefcase brand-whatsapp brand-facebook brand-instagram'.split(' ');

const fl = {}, missing = [];
const cats = {};
for (const [cat, list] of Object.entries(CATS)) {
  cats[cat] = [];
  for (const name of [...new Set(list.split(/\s+/))]) {
    let ic = fluent.icons[name];
    if (!ic && fluent.aliases?.[name]) ic = fluent.icons[fluent.aliases[name].parent];
    if (!ic) { missing.push(name); continue; }
    fl[name] = [ic.width || fluent.width || 32, ic.height || fluent.height || 32, ic.body];
    cats[cat].push(name);
  }
}
const tb = {};
for (const name of ICONS) {
  const ic = tabler.icons[name] || (tabler.aliases?.[name] && tabler.icons[tabler.aliases[name].parent]);
  if (!ic) { missing.push('i:' + name); continue; }
  tb[name] = [ic.width || tabler.width || 24, ic.height || tabler.height || 24, ic.body];
}
cats.icons = Object.keys(tb).map((n) => 'i:' + n);
const out = `// Generated by tools/make-art.mjs from Fluent Emoji Flat (MIT, Microsoft) and Tabler Icons (MIT).\nexport const PICTURES = ${JSON.stringify(fl)};\nexport const ICONS = ${JSON.stringify(tb)};\nexport const CATEGORIES = ${JSON.stringify(cats)};\n`;
fs.writeFileSync('src/templates/art-data.js', out);
console.log('pictures', Object.keys(fl).length, 'icons', Object.keys(tb).length, 'bytes', out.length, 'missing', missing.join(' '));
