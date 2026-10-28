// Newsletters and bulletins: a masthead, columns of stories, photo frames and a box of dates.

function masthead(k, title, o = {}) {
  const { W, s } = k;
  k.rect(0, 0, W, o.h ?? 46, { fill: o.fill ?? 'primary' });
  if (o.art) k.art(o.art, 14, 7, 32, 32);
  const x = o.art ? 52 : 14;
  k.text(x, 6, W - x - 14, 26, title, { size: o.size ?? 36, font: 'heading', color: o.color ?? 'light', bold: true, field: o.field });
  k.text(x, 32, W - x - 14, 9, s('news.issue'), { size: 11, color: o.color ?? 'light', caps: true, tracking: 2 });
}
// a story: headline, then text in columns
function story(k, x, y, w, h, head, body, o = {}) {
  k.text(x, y, w, o.headH ?? 12, head, { size: o.headSize ?? 20, font: 'heading', color: o.headColor ?? 'primary', bold: true, lh: 1 });
  k.text(x, y + (o.headH ?? 12) + 2, w, h - (o.headH ?? 12) - 2, body, { size: o.size ?? 10.5, lh: 1.3, columns: o.columns ?? 1, gap: 5, align: o.justify === false ? 'left' : 'justify', after: 4 });
}
function datesBox(k, x, y, w, h, title, lines, o = {}) {
  k.rect(x, y, w, h, { fill: o.fill ?? 'light', r: 2 });
  k.text(x + 4, y + 3, w - 8, 10, title, { size: 15, font: 'heading', color: o.headColor ?? 'primary', bold: true });
  k.text(x + 4, y + 15, w - 8, h - 18, lines.split('\n').map((l) => { const [a, b] = l.split('|'); return { runs: [{ t: a + (b ? '  ' : ''), bold: true, color: o.accent ?? 'primary' }, { t: b || '' }], after: 4 }; }), { size: 10.5, lh: 1.25 });
}

export const newsletters = [
  {
    id: 'news-school', cat: 'news', name: 'nschool.name', scheme: 'ocean', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      masthead(k, s('nschool.title'), { art: 'school' });
      k.photo(14, 54, W * 0.62 - 14, 64);
      story(k, 14, 124, W * 0.62 - 14, 102, s('nschool.h1'), `${s('news.story')}\n${s('news.story2')}`, { columns: 2 });
      datesBox(k, W * 0.62 + 6, 54, W * 0.38 - 20, 100, s('nschool.dates'), s('nschool.datelist'));
      k.rect(W * 0.62 + 6, 160, W * 0.38 - 20, 66, { fill: 'secondary', opacity: 0.18, r: 2 });
      k.art('trophy', W * 0.62 + 10, 164, 14, 14);
      k.text(W * 0.62 + 28, 165, W * 0.38 - 46, 12, s('nschool.star'), { size: 14, font: 'heading', color: 'primary', bold: true });
      k.text(W * 0.62 + 10, 181, W * 0.38 - 28, 42, s('nschool.starbody'), { size: 10.5, lh: 1.3 });
      k.line(14, 232, W - 14, 232, { color: 'secondary', width: 1 });
      story(k, 14, 236, W - 28, H - 252, s('nschool.h2'), s('news.short'), { columns: 2, headSize: 17 });
      k.rect(0, H - 10, W, 10, { fill: 'primary' });
    },
  },
  {
    id: 'news-parish', cat: 'news', name: 'parish.name', scheme: 'navy', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.art('church', W / 2 - 14, 8, 28, 28);
      k.text(14, 36, W - 28, 22, s('parish.title'), { size: 34, font: 'heading', color: 'primary', align: 'center', bold: true });
      k.text(14, 56, W - 28, 8, s('news.issue'), { size: 10.5, align: 'center', caps: true, tracking: 2, color: 'accent' });
      k.line(14, 67, W - 14, 67, { color: 'secondary', width: 1.5 }); k.line(14, 69, W - 14, 69, { color: 'secondary', width: 0.5 });
      story(k, 14, 76, W * 0.62 - 14, 120, s('parish.h1'), `${s('news.story')}\n${s('news.story2')}`);
      k.rect(W * 0.62 + 6, 76, W * 0.38 - 20, 120, { fill: 'none', stroke: 'secondary', sw: 1 });
      k.text(W * 0.62 + 10, 80, W * 0.38 - 28, 10, s('parish.times'), { size: 15, font: 'heading', color: 'primary', bold: true, align: 'center' });
      k.text(W * 0.62 + 10, 94, W * 0.38 - 28, 98, s('parish.timelist').split('\n').map((l) => { const [a, b] = l.split('|'); return { runs: [{ t: a, bold: true }, { t: b ? ` ${b}` : '' }], after: 5, align: 'center' }; }), { size: 11, lh: 1.25 });
      k.line(14, 204, W - 14, 204, { color: 'secondary', width: 0.6 });
      story(k, 14, 210, (W - 34) / 2, H - 226, s('parish.h2'), s('news.short'), { headSize: 16 });
      datesBox(k, W / 2 + 3, 210, (W - 34) / 2, H - 226, s('parish.notices'), s('parish.noticelist'), { fill: 'light', accent: 'accent' });
    },
  },
  {
    id: 'news-club', cat: 'news', name: 'club.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      masthead(k, s('club.title'), { art: 'soccer-ball', fill: 'dark' });
      k.rect(0, 46, W, 4, { fill: 'primary' });
      k.photo(0, 50, W, 76);
      k.rect(14, 112, W * 0.6, 22, { fill: 'primary' });
      k.text(18, 112, W * 0.6 - 8, 22, s('club.h1'), { size: 20, font: 'heading', color: 'light', valign: 'middle' });
      story(k, 14, 140, W * 0.6 - 4, H - 156, s('club.sub'), `${s('news.story')}\n${s('news.short')}`, { columns: 2, headSize: 14, headColor: 'dark' });
      const x = W * 0.6 + 16, w = W * 0.4 - 30;
      k.text(x, 140, w, 12, s('club.results'), { size: 18, font: 'heading', color: 'primary' });
      s('club.resultlist').split('\n').forEach((l, i) => {
        const [a, b, c] = l.split('|'), y = 156 + i * 13;
        k.rect(x, y, w, 11, { fill: i % 2 ? 'light' : 'secondary', opacity: i % 2 ? 1 : 0.2 });
        k.text(x + 2, y, w - 24, 11, `${a} – ${b}`, { size: 10.5, valign: 'middle' });
        k.text(x + w - 22, y, 20, 11, c, { size: 11, bold: true, align: 'right', valign: 'middle', color: 'primary' });
      });
      datesBox(k, x, 230, w, H - 246, s('club.next'), s('club.nextlist'));
    },
  },
  {
    id: 'news-community', cat: 'news', name: 'comm.name', scheme: 'forest', fonts: 'newspaper',
    build(k) {
      const { W, H, s } = k;
      k.text(14, 10, W - 28, 30, s('comm.title'), { size: 46, font: 'heading', color: 'dark', align: 'center', bold: true });
      k.rect(14, 42, W - 28, 9, { fill: 'primary' });
      k.text(16, 42, W - 32, 9, s('news.issue'), { size: 10, color: 'light', valign: 'middle', align: 'center', caps: true, tracking: 2 });
      const cw = (W - 28 - 12) / 3;
      k.photo(14, 58, cw * 2 + 6, 70);
      story(k, 14, 134, cw * 2 + 6, 110, s('comm.h1'), `${s('news.story')}\n${s('news.story2')}`, { columns: 2, headSize: 22, headColor: 'dark' });
      story(k, 14 + 2 * (cw + 6), 58, cw, 120, s('comm.h2'), s('news.short'), { headSize: 15, headH: 16 });
      datesBox(k, 14 + 2 * (cw + 6), 184, cw, 60, s('comm.diary'), s('comm.diarylist'));
      k.line(14, 250, W - 14, 250, { color: 'dark', width: 0.6 });
      story(k, 14, 254, W - 28, H - 266, s('comm.h3'), s('news.short'), { columns: 3, headSize: 15 });
    },
  },
  {
    id: 'news-company', cat: 'news', name: 'corp.name', scheme: 'mint', fonts: 'modern',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, 10, H, { fill: 'primary' });
      k.logo(20, 12, 24, 24, { art: 'office-building' });
      k.text(50, 12, W - 64, 16, s('corp.title'), { size: 30, font: 'heading', color: 'dark', bold: true });
      k.text(50, 29, W - 64, 8, s('news.issue'), { size: 10.5, color: 'primary', caps: true, tracking: 2, bold: true });
      const stats = s('corp.stats').split('\n'), sw = (W - 34 - 12) / 3;
      stats.forEach((l, i) => {
        const [n, t] = l.split('|'), x = 20 + i * (sw + 6);
        k.rect(x, 46, sw, 30, { fill: i === 1 ? 'accent' : 'primary', opacity: i === 1 ? 1 : 0.12, r: 3 });
        k.text(x, 48, sw, 16, n, { size: 26, font: 'heading', bold: true, align: 'center', color: i === 1 ? 'light' : 'primary' });
        k.text(x + 2, 64, sw - 4, 10, t, { size: 10, align: 'center', color: i === 1 ? 'light' : 'dark' });
      });
      story(k, 20, 86, W * 0.58 - 20, 140, s('corp.h1'), `${s('news.story')}\n${s('news.story2')}`, { headH: 19, headSize: 18 });
      k.photo(W * 0.58 + 6, 86, W * 0.42 - 20, 62);
      story(k, W * 0.58 + 6, 152, W * 0.42 - 20, 74, s('corp.h2'), s('news.short'), { headSize: 15 });
      k.rect(20, 234, W - 34, H - 250, { fill: 'light', r: 3 });
      k.photo(26, 240, 34, 34, { round: true });
      k.text(66, 240, W - 86, 10, s('corp.h3'), { size: 15, font: 'heading', color: 'primary', bold: true });
      k.text(66, 252, W - 86, H - 272, s('news.short'), { size: 10.5, lh: 1.3 });
    },
  },
  {
    id: 'news-garden', cat: 'news', name: 'garden.name', scheme: 'spring', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('sunflower', 12, 8, 30, 30); k.art('seedling', W - 36, 12, 24, 24);
      k.text(46, 10, W - 90, 22, s('garden.title'), { size: 34, font: 'heading', color: 'primary', bold: true, align: 'center' });
      k.text(46, 31, W - 90, 8, s('news.issue'), { size: 10.5, align: 'center', caps: true, tracking: 2, color: 'accent' });
      k.line(14, 44, W - 14, 44, { color: 'primary', width: 1.5 });
      k.photo(14, 52, W - 28, 70);
      story(k, 14, 128, W - 28, 76, s('garden.h1'), `${s('news.story')}\n${s('news.story2')}`, { columns: 2 });
      const tw = (W - 34) / 2;
      k.rect(14, 210, tw, H - 224, { fill: '#ffffff', r: 3 });
      k.text(18, 214, tw - 8, 10, s('garden.tips'), { size: 16, font: 'heading', color: 'primary', bold: true });
      s('garden.tiplist').split('\n').forEach((t, i) => { k.art('i:leaf', 18, 229 + i * 10, 5, 5, { color: 'primary' }); k.text(26, 227 + i * 10, tw - 16, 10, t, { size: 10.5 }); });
      datesBox(k, 20 + tw, 210, tw, H - 224, s('garden.meet'), s('garden.meetlist'), { fill: '#ffffff' });
    },
  },
  {
    id: 'news-family', cat: 'news', name: 'family.name', scheme: 'festive', fonts: 'script',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.art('christmas-tree', 14, 10, 26, 26); k.art('wrapped-gift', W - 40, 12, 24, 24);
      k.text(42, 8, W - 84, 30, s('family.title'), { size: 42, font: 'heading', color: 'primary', align: 'center' });
      k.text(14, 38, W - 28, 10, s('family.from'), { size: 13, align: 'center', color: 'secondary', bold: true });
      const pw = (W - 28 - 6) / 2;
      [[14, 52], [20 + pw, 52]].forEach(([x, y]) => k.photo(x, y, pw, 58));
      k.text(14, 116, W - 28, 76, `${s('family.body')}\n${s('news.story2')}`, { size: 11, lh: 1.35, columns: 2, gap: 6, after: 4 });
      [[14, 196], [20 + pw, 196]].forEach(([x, y]) => k.photo(x, y, pw, 54));
      k.text(14, 256, W - 28, H - 268, s('family.end'), { size: 18, font: 'heading', align: 'center', color: 'primary' });
    },
  },
  {
    id: 'news-twopage', cat: 'news', name: 'two.name', scheme: 'orange', fonts: 'newspaper',
    build(k) {
      const { W, H, s } = k;
      masthead(k, s('two.title'), { art: 'newspaper', field: 'org' });
      story(k, 14, 54, W - 28, 92, s('two.h1'), `${s('news.story')}\n${s('news.story2')}`, { columns: 3, headSize: 24 });
      k.photo(14, 150, W * 0.55, 70);
      k.text(14, 222, W * 0.55, 8, s('two.caption'), { size: 9.5, italic: true });
      story(k, W * 0.55 + 20, 150, W * 0.45 - 34, 80, s('two.h2'), s('news.short'), { headSize: 16 });
      k.rect(14, 236, W - 28, H - 252, { fill: 'light', r: 2 });
      story(k, 18, 240, W - 36, H - 260, s('two.h3'), s('news.story'), { columns: 2, headSize: 16 });
      k.text(14, H - 12, W - 28, 8, s('two.more'), { size: 10, align: 'right', italic: true, color: 'primary' });
      k.page('paper');
      k.rect(0, 0, W, 12, { fill: 'primary' });
      k.text(14, 2, W - 28, 8, s('two.title'), { size: 10, color: 'light', caps: true, tracking: 2 });
      story(k, 14, 20, W - 28, 100, s('two.h4'), `${s('news.story')}\n${s('news.story2')}`, { columns: 3, headSize: 22 });
      k.photo(14, 126, (W - 34) / 2, 60); k.photo(20 + (W - 34) / 2, 126, (W - 34) / 2, 60);
      story(k, 14, 194, (W - 34) / 2, H - 210, s('two.h5'), s('news.short'), { headSize: 16 });
      datesBox(k, 20 + (W - 34) / 2, 194, (W - 34) / 2, H - 210, s('comm.diary'), s('comm.diarylist'));
    },
  },
];

export const en = {
  'news.issue': 'Issue 12 · June',
  'news.story': 'This is the place for your main story. Double-click the text to change it, and type your own news: what happened, who was there and what comes next. Short sentences and a friendly tone work best. If a story is long, keep the most important part at the start.',
  'news.story2': 'You can add a photo by double-clicking a picture frame. Pictures of real people and real events make readers stop and read. Remember to ask people before you print their photo.',
  'news.short': 'A shorter story fits here. Use it for a thank-you, a reminder, a new member, or a quick report about something that went well. Two or three sentences are enough.',
  'nschool.name': 'School newsletter', 'nschool.title': 'Oakfield School News', 'nschool.h1': 'A wonderful sports day', 'nschool.dates': 'Dates for your diary', 'nschool.datelist': '3 June|School photos\n10 June|Parents’ evening\n17 June|Summer concert\n24 June|Last day of term', 'nschool.star': 'Stars of the week', 'nschool.starbody': 'Well done to class 4B for their brilliant science projects, and to Lily for reading 50 books this year!', 'nschool.h2': 'A message from the head teacher',
  'parish.name': 'Parish bulletin', 'parish.title': 'St Mary’s Parish Bulletin', 'parish.h1': 'Welcome', 'parish.times': 'Service times', 'parish.timelist': 'Saturday|6 pm\nSunday|9 am and 11 am\nWednesday|10 am\nConfession|Saturday 5 pm', 'parish.h2': 'From the parish council', 'parish.notices': 'Notices', 'parish.noticelist': 'Coffee morning|after Sunday service\nChoir practice|Thursday 7 pm\nFood bank|bring tins to the porch',
  'club.name': 'Sports club news', 'club.title': 'Club News', 'club.h1': 'Champions again!', 'club.sub': 'Our under-14s win the league for the second year', 'club.results': 'Results', 'club.resultlist': 'Lions|Eagles|3–1\nTigers|Lions|0–2\nLions|Rovers|1–1\nUnited|Lions|2–4', 'club.next': 'Next matches', 'club.nextlist': 'Sat 21|Lions v City, 10 am\nSat 28|Rovers v Lions, 11 am',
  'comm.name': 'Community newsletter', 'comm.title': 'The Neighbourhood News', 'comm.h1': 'New playground opens in the park', 'comm.h2': 'Meet our new neighbours', 'comm.diary': 'Coming up', 'comm.diarylist': '5 July|Street party\n12 July|Book swap\n20 July|Garden open day', 'comm.h3': 'Lost and found, offers and notices',
  'corp.name': 'Company newsletter', 'corp.title': 'Company Update', 'corp.stats': '+18%|sales this quarter\n240|happy customers\n12|new colleagues', 'corp.h1': 'A record quarter for the whole team', 'corp.h2': 'Our new office', 'corp.h3': 'Meet the team: Laura from Sales',
  'garden.name': 'Garden club newsletter', 'garden.title': 'Green Fingers Garden Club', 'garden.h1': 'The summer show is coming', 'garden.tips': 'Jobs for this month', 'garden.tiplist': 'Water early in the morning\nPick sweet peas every day\nFeed tomatoes once a week\nSow lettuce for autumn', 'garden.meet': 'Club meetings', 'garden.meetlist': '2 July|Rose pruning talk\n16 July|Visit to Hill Gardens\n30 July|Plant swap',
  'family.name': 'Family year letter', 'family.title': 'Our Year', 'family.from': 'from the Rossi family', 'family.body': 'What a year it has been! Here is a little news from all of us: new jobs, school, holidays and a new puppy called Biscuit.', 'family.end': 'Wishing you a very happy New Year!',
  'two.name': 'Newsletter (2 pages)', 'two.title': 'Monthly Newsletter', 'two.h1': 'Big news this month', 'two.caption': 'Write a short caption for the photo here.', 'two.h2': 'In brief', 'two.h3': 'A closer look', 'two.more': 'Continued overleaf', 'two.h4': 'Inside this issue', 'two.h5': 'Thank you',
};
