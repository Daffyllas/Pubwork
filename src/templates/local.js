// Local occasions: two for each language, shown first to people who use Pubwork in that language.
import { infoRows, confetti, bunting } from './common.js';

const invite = (k, art, title, who, o = {}) => {
  const { W, H, s } = k;
  k.rect(0, 0, W, H, { fill: 'light' });
  if (o.frame !== false) k.rect(7, 7, W - 14, H - 14, { fill: 'none', stroke: 'secondary', sw: 0.8 });
  k.art(art, W / 2 - 22, 18, 44, 44);
  k.text(12, 66, W - 24, 10, s(o.kicker), { size: 12, align: 'center', caps: true, tracking: 3 });
  k.text(12, 76, W - 24, 30, s(title), { size: o.size ?? 38, font: 'heading', color: 'primary', align: 'center', lh: 1 });
  k.text(12, 108, W - 24, 18, s(who), { size: 24, font: 'heading', align: 'center', bold: true });
  k.text(18, 132, W - 36, 40, [{ t: s('local.date'), bold: true, size: 14 }, { t: s(o.place ?? 'local.place') }, { t: s(o.after ?? 'local.after'), italic: true, before: 5 }], { size: 12.5, align: 'center', lh: 1.35 });
  k.text(18, H - 20, W - 36, 10, s('local.rsvp'), { size: 11, align: 'center', color: 'primary' });
};
const poster = (k, art, title, sub, body, o = {}) => {
  const { W, H, s } = k;
  k.rect(0, 0, W, H, { fill: o.bg ?? 'dark' });
  if (o.bunting) bunting(k, 6, { n: 12, h: 18 });
  if (o.confetti) confetti(k, [6, 20, W - 12, H * 0.4], { n: 34, seed: o.seed ?? 9 });
  k.art(art, W / 2 - 40, H * 0.08, 80, 80);
  k.text(14, H * 0.38, W - 28, 50, s(title), { size: o.size ?? 64, font: 'heading', color: o.titleColor ?? 'secondary', align: 'center', lh: 0.95, bold: true });
  k.text(18, H * 0.57, W - 36, 30, s(sub), { size: 18, color: o.textColor ?? 'light', align: 'center', lh: 1.3 });
  infoRows(k, 34, H * 0.7, W - 68, [['i:calendar', s('local.date')], ['i:clock', s('local.time')], ['i:map-pin', s('local.place')]], { size: 16, gap: 12, color: o.textColor ?? 'light', iconColor: 'secondary' });
  k.text(18, H - 26, W - 36, 14, s(body), { size: 13, color: o.textColor ?? 'light', align: 'center', italic: true });
};

export const local = [
  { id: 'en-halloween', cat: 'local', langs: ['en'], name: 'halloween.name', scheme: 'sunshine', fonts: 'bold', build: (k) => poster(k, 'jack-o-lantern', 'halloween.title', 'halloween.sub', 'halloween.body', { confetti: true }) },
  { id: 'en-thanksgiving', cat: 'local', langs: ['en'], name: 'thanks2.name', scheme: 'earth', fonts: 'traditional', size: 'half', build: (k) => invite(k, 'turkey', 'thanks2.title', 'thanks2.who', { kicker: 'thanks2.kicker' }) },
  { id: 'es-comunion', cat: 'local', langs: ['es'], name: 'comunion.name', scheme: 'ocean', fonts: 'elegant', size: 'half', build: (k) => invite(k, 'dove', 'comunion.title', 'comunion.who', { kicker: 'comunion.kicker', place: 'comunion.place' }) },
  { id: 'es-reyes', cat: 'local', langs: ['es'], name: 'reyes.name', scheme: 'royal', fonts: 'bold', build: (k) => poster(k, 'crown', 'reyes.title', 'reyes.sub', 'reyes.body', { confetti: true }) },
  { id: 'de-einschulung', cat: 'local', langs: ['de'], name: 'schule.name', scheme: 'candy', fonts: 'friendly', size: 'half', build: (k) => invite(k, 'backpack', 'schule.title', 'schule.who', { kicker: 'schule.kicker' }) },
  { id: 'de-martin', cat: 'local', langs: ['de'], name: 'martin.name', scheme: 'navy', fonts: 'traditional', build: (k) => poster(k, 'red-paper-lantern', 'martin.title', 'martin.sub', 'martin.body') },
  { id: 'fr-voisins', cat: 'local', langs: ['fr'], name: 'voisins.name', scheme: 'coral', fonts: 'friendly', build: (k) => poster(k, 'houses', 'voisins.title', 'voisins.sub', 'voisins.body', { bunting: true, bg: 'light', titleColor: 'primary', textColor: 'dark' }) },
  { id: 'fr-galette', cat: 'local', langs: ['fr'], name: 'galette.name', scheme: 'festive', fonts: 'elegant', size: 'half', build: (k) => invite(k, 'crown', 'galette.title', 'galette.who', { kicker: 'galette.kicker' }) },
  { id: 'pt-junina', cat: 'local', langs: ['pt'], name: 'junina.name', scheme: 'sunshine', fonts: 'friendly', build: (k) => poster(k, 'fire', 'junina.title', 'junina.sub', 'junina.body', { bunting: true, bg: 'light', titleColor: 'primary', textColor: 'dark' }) },
  { id: 'pt-maes', cat: 'local', langs: ['pt'], name: 'maes.name', scheme: 'berry', fonts: 'script', size: 'half', build: (k) => invite(k, 'bouquet', 'maes.title', 'maes.who', { kicker: 'maes.kicker', after: 'maes.after' }) },
  { id: 'it-comunione', cat: 'local', langs: ['it'], name: 'comunione.name', scheme: 'lavender', fonts: 'elegant', size: 'half', build: (k) => invite(k, 'dove', 'comunione.title', 'comunione.who', { kicker: 'comunione.kicker', place: 'comunione.place' }) },
  { id: 'it-befana', cat: 'local', langs: ['it'], name: 'befana.name', scheme: 'royal', fonts: 'friendly', build: (k) => poster(k, 'candy', 'befana.title', 'befana.sub', 'befana.body', { confetti: true, seed: 4 }) },
];

// each local template speaks its own language; English names are there so the gallery can show them anywhere
export const STR = {
  en: {
    'local.date': 'Saturday 14 June', 'local.time': '5 pm', 'local.place': 'Village Hall, Church Street', 'local.after': 'followed by a celebration at our home', 'local.rsvp': 'Please let us know if you can come',
    'halloween.name': 'Halloween party', 'halloween.title': 'Halloween Party', 'halloween.sub': 'Costumes, games, pumpkins and spooky treats for all ages.', 'halloween.body': 'Prize for the best costume!',
    'thanks2.name': 'Thanksgiving dinner', 'thanks2.kicker': 'Please join us for', 'thanks2.title': 'Thanksgiving Dinner', 'thanks2.who': 'at the Millers’',
    'comunion.name': 'First Communion (Spanish)', 'reyes.name': 'Three Kings party (Spanish)', 'schule.name': 'First school day (German)', 'martin.name': 'St Martin lantern walk (German)',
    'voisins.name': 'Neighbours’ party (French)', 'galette.name': 'Galette des rois (French)', 'junina.name': 'Festa Junina (Portuguese)', 'maes.name': 'Mother’s Day card (Portuguese)',
    'comunione.name': 'First Communion (Italian)', 'befana.name': 'Befana party (Italian)',
  },
  es: {
    'local.date': 'Sábado, 14 de junio', 'local.time': '17:00', 'local.place': 'Salón parroquial, calle Mayor', 'local.after': 'Después lo celebraremos en casa', 'local.rsvp': 'Por favor, confirmad vuestra asistencia',
    'comunion.name': 'Primera Comunión', 'comunion.kicker': 'Te invito a mi', 'comunion.title': 'Primera Comunión', 'comunion.who': 'Lucía', 'comunion.place': 'Iglesia de San José, a las 12:00',
    'reyes.name': 'Fiesta de Reyes', 'reyes.title': 'Fiesta de Reyes', 'reyes.sub': 'Roscón, chocolate caliente y regalos para los más pequeños.', 'reyes.body': '¡Sus Majestades llegarán a las 18:00!',
  },
  de: {
    'local.date': 'Samstag, 14. Juni', 'local.time': '17 Uhr', 'local.place': 'Gemeindehaus, Kirchstraße 12', 'local.after': 'Danach feiern wir zu Hause', 'local.rsvp': 'Bitte gebt uns Bescheid, ob ihr kommt',
    'schule.name': 'Einschulung', 'schule.kicker': 'Wir feiern die', 'schule.title': 'Einschulung', 'schule.who': 'von Paul',
    'martin.name': 'Sankt-Martins-Umzug', 'martin.title': 'Laternenumzug', 'martin.sub': 'Zu Ehren von Sankt Martin ziehen wir mit Laternen durch das Dorf. Danach gibt es Weckmänner und Kinderpunsch.', 'martin.body': 'Laternen bitte selbst mitbringen',
  },
  fr: {
    'local.date': 'Samedi 14 juin', 'local.time': '17 h', 'local.place': 'Salle des fêtes, rue de l’Église', 'local.after': 'suivi d’un repas à la maison', 'local.rsvp': 'Merci de nous dire si vous venez',
    'voisins.name': 'Fête des voisins', 'voisins.title': 'Fête des voisins', 'voisins.sub': 'Apportez un plat, une boisson et votre bonne humeur. On se retrouve dans la cour !', 'voisins.body': 'Tables et chaises fournies',
    'galette.name': 'Galette des rois', 'galette.kicker': 'Venez partager la', 'galette.title': 'Galette des rois', 'galette.who': 'chez Marie et Paul',
  },
  pt: {
    'local.date': 'Sábado, 14 de junho', 'local.time': '17h', 'local.place': 'Salão da paróquia, Rua da Igreja', 'local.after': 'Com muito carinho', 'local.rsvp': 'Confirme sua presença',
    'junina.name': 'Festa Junina', 'junina.title': 'Festa Junina', 'junina.sub': 'Quadrilha, fogueira, pipoca, pamonha, quentão e muita diversão para toda a família!', 'junina.body': 'Venha a caráter!',
    'maes.name': 'Cartão de Dia das Mães', 'maes.kicker': 'Para a melhor mãe do mundo', 'maes.title': 'Feliz Dia das Mães', 'maes.who': 'Te amo, mãe!', 'maes.after': 'Obrigado por tudo',
  },
  it: {
    'local.date': 'Sabato 14 giugno', 'local.time': 'ore 17', 'local.place': 'Oratorio, via della Chiesa', 'local.after': 'Seguirà un rinfresco a casa nostra', 'local.rsvp': 'Vi preghiamo di confermare',
    'comunione.name': 'Prima Comunione', 'comunione.kicker': 'Ti aspetto alla mia', 'comunione.title': 'Prima Comunione', 'comunione.who': 'Giulia', 'comunione.place': 'Chiesa di San Marco, ore 11',
    'befana.name': 'Festa della Befana', 'befana.title': 'Arriva la Befana!', 'befana.sub': 'Calze piene di dolci, giochi e merenda per tutti i bambini.', 'befana.body': 'Portate la vostra calza!',
  },
};
