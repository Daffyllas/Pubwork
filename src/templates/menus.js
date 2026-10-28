// Menus: café, restaurant, fine dining, pizza, children's, drinks, brunch and a wedding dinner card.
import { priceRow } from './common.js';

// a menu section: heading, then dishes "Name|price|description" one per line
function section(k, x, y, w, title, lines, o = {}) {
  k.text(x, y, w, 12, title, { size: o.head ?? 20, font: 'heading', color: o.headColor ?? 'primary', bold: o.bold ?? true, align: o.align });
  if (o.rule !== false) k.line(x, y + 12.5, x + w, y + 12.5, { color: o.ruleColor ?? 'secondary', width: 0.8 });
  let yy = y + 16;
  for (const line of lines.split('\n')) {
    const [name, price, desc] = line.split('|');
    priceRow(k, x, yy, w, name, price || '', { size: o.size ?? 14, desc, priceColor: o.priceColor, color: o.color, descColor: o.descColor });
    yy += desc ? (o.size ?? 14) * 0.62 + 7 : (o.size ?? 14) * 0.45 + 4.5;
  }
  return yy + 4;
}

export const menus = [
  {
    id: 'menu-cafe', cat: 'menus', name: 'cafe.name', scheme: 'earth', fonts: 'traditional',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.rect(0, 0, W, 64, { fill: 'primary' });
      k.art('hot-beverage', 16, 12, 40, 40); k.art('croissant', W - 56, 12, 40, 40);
      k.text(60, 12, W - 120, 30, s('cafe.title'), { size: 44, font: 'heading', color: 'light', align: 'center', bold: true });
      k.text(60, 42, W - 120, 12, s('cafe.sub'), { size: 14, color: 'light', align: 'center', italic: true });
      let y = section(k, 22, 76, W - 44, s('cafe.s1'), s('cafe.l1'));
      y = section(k, 22, y + 2, W - 44, s('cafe.s2'), s('cafe.l2'));
      section(k, 22, y + 2, W - 44, s('cafe.s3'), s('cafe.l3'));
      k.rect(0, H - 20, W, 20, { fill: 'dark' });
      k.text(10, H - 20, W - 20, 20, s('cafe.hours'), { size: 13, color: 'light', align: 'center', valign: 'middle' });
    },
  },
  {
    id: 'menu-restaurant', cat: 'menus', name: 'rest.name', scheme: 'navy', fonts: 'classic',
    build(k) {
      const { W, H, s } = k;
      k.rect(8, 8, W - 16, H - 16, { fill: 'none', stroke: 'secondary', sw: 1.5 });
      k.text(14, 20, W - 28, 30, s('common.org'), { size: 40, font: 'heading', color: 'primary', align: 'center', bold: true, field: 'org' });
      k.text(14, 46, W - 28, 10, s('rest.sub'), { size: 13, align: 'center', caps: true, tracking: 3, color: 'secondary' });
      k.line(W / 2 - 30, 60, W / 2 + 30, 60, { color: 'secondary', width: 1 }); k.star(W / 2, 60, 2.6, { fill: 'secondary' });
      const cw = (W - 54) / 2;
      let y1 = section(k, 20, 72, cw, s('rest.s1'), s('rest.l1'), { priceColor: 'accent' });
      section(k, 20, y1 + 4, cw, s('rest.s3'), s('rest.l3'), { priceColor: 'accent' });
      section(k, 34 + cw, 72, cw, s('rest.s2'), s('rest.l2'), { priceColor: 'accent' });
      k.photo(20, 208, W - 40, H - 244);
      k.text(14, H - 30, W - 28, 16, s('rest.footer'), { size: 11, align: 'center', italic: true });
    },
  },
  {
    id: 'menu-fine', cat: 'menus', name: 'fine.name', scheme: 'mono', fonts: 'elegant', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.text(10, 16, W - 20, 26, s('fine.title'), { size: 46, font: 'heading', align: 'center', color: 'dark' });
      k.text(10, 42, W - 20, 8, s('fine.date'), { size: 11, align: 'center', caps: true, tracking: 3, color: 'secondary' });
      const courses = s('fine.courses').split('\n');
      courses.forEach((c, i) => {
        const [name, desc] = c.split('|'), y = 60 + i * 30;
        k.text(14, y, W - 28, 8, name, { size: 14, align: 'center', bold: true, caps: true, tracking: 2 });
        k.text(18, y + 8, W - 36, 14, desc, { size: 11.5, align: 'center', italic: true, lh: 1.2 });
        if (i < courses.length - 1) { k.line(W / 2 - 8, y + 25, W / 2 + 8, y + 25, { color: 'secondary', width: 0.6 }); }
      });
      k.text(10, H - 18, W - 20, 8, s('fine.price'), { size: 12, align: 'center', color: 'accent', bold: true });
    },
  },
  {
    id: 'menu-pizza', cat: 'menus', name: 'pizza.name', scheme: 'coral', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, 78, { fill: 'primary' });
      for (let i = 0; i < 14; i++) k.rect(i * (W / 14), 78, W / 28, 6, { fill: 'dark' });
      k.art('pizza', W - 80, 6, 70, 70, { rotate: -15 });
      k.text(16, 12, W - 100, 40, s('pizza.title'), { size: 56, font: 'heading', color: 'light', lh: 0.95 });
      k.text(16, 54, W - 100, 14, s('pizza.sub'), { size: 16, color: 'light' });
      const cw = (W - 46) / 2;
      section(k, 16, 94, cw, s('pizza.s1'), s('pizza.l1'), { priceColor: 'primary', ruleColor: 'primary' });
      section(k, 30 + cw, 94, cw, s('pizza.s2'), s('pizza.l2'), { priceColor: 'primary', ruleColor: 'primary' });
      k.photo(16, 184, W - 32, H - 240);
      k.rect(16, H - 48, W - 32, 34, { fill: 'accent', r: 6 });
      k.art('i:phone', 26, H - 40, 18, 18, { color: 'light' });
      k.text(50, H - 46, W - 76, 30, [{ t: s('pizza.order'), size: 16 }, { t: s('common.phone'), size: 26, bold: true }], { color: 'light', valign: 'middle', font: 'heading' });
    },
  },
  {
    id: 'menu-kids', cat: 'menus', name: 'kids.name', scheme: 'candy', fonts: 'friendly', size: 'half',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.text(10, 10, W - 20, 24, s('kids.title'), { size: 40, font: 'heading', color: 'primary', align: 'center', bold: true });
      const items = s('kids.items').split('\n'), pics = ['hamburger', 'spaghetti', 'pizza', 'poultry-leg', 'ice-cream', 'glass-of-milk'];
      const colors = ['secondary', 'accent', 'primary'];
      items.forEach((line, i) => {
        const [name, price] = line.split('|'), x = 10 + (i % 2) * (W - 20) / 2, y = 40 + Math.floor(i / 2) * 50, w = (W - 30) / 2;
        k.rect(x, y, w, 44, { fill: colors[i % 3], opacity: 0.18, r: 8 });
        k.art(pics[i % pics.length], x + w / 2 - 12, y + 3, 24, 24);
        k.text(x + 2, y + 27, w - 4, 8, name, { size: 12, align: 'center', bold: true });
        k.text(x + 2, y + 35, w - 4, 7, price, { size: 11, align: 'center', color: 'primary', bold: true });
      });
      k.text(10, H - 16, W - 20, 8, s('kids.footer'), { size: 10.5, align: 'center', italic: true });
    },
  },
  {
    id: 'menu-drinks', cat: 'menus', name: 'drinks.name', scheme: 'royal', fonts: 'bold',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'dark' });
      k.art('cocktail-glass', W / 2 - 24, 14, 48, 48);
      k.text(14, 64, W - 28, 30, s('drinks.title'), { size: 48, font: 'heading', color: 'secondary', align: 'center' });
      const o = { color: 'light', descColor: 'light', priceColor: 'secondary', headColor: 'secondary', ruleColor: 'secondary' };
      const cw = (W - 50) / 2;
      let y = section(k, 18, 100, cw, s('drinks.s1'), s('drinks.l1'), o);
      section(k, 18, y + 4, cw, s('drinks.s3'), s('drinks.l3'), o);
      section(k, 32 + cw, 100, cw, s('drinks.s2'), s('drinks.l2'), o);
      k.text(14, H - 22, W - 28, 10, s('drinks.footer'), { size: 12, color: 'light', align: 'center', italic: true });
    },
  },
  {
    id: 'menu-brunch', cat: 'menus', name: 'brunch.name', scheme: 'sunshine', fonts: 'handwritten',
    build(k) {
      const { W, H, s } = k;
      k.rect(0, 0, W, H, { fill: 'light' });
      k.circle(W, 0, 70, { fill: 'secondary' });
      k.art('pancakes', 20, 18, 56, 56); k.art('sun-with-face', W - 50, 10, 36, 36);
      k.text(82, 26, W - 140, 40, s('brunch.title'), { size: 50, font: 'heading', color: 'primary', bold: true });
      let y = section(k, 22, 86, W - 44, s('brunch.s1'), s('brunch.l1'), { headColor: 'accent' });
      section(k, 22, y + 4, W - 44, s('brunch.s2'), s('brunch.l2'), { headColor: 'accent' });
      k.text(14, H - 22, W - 28, 12, s('brunch.footer'), { size: 14, font: 'heading', align: 'center', color: 'primary' });
    },
  },
  {
    id: 'menu-wedding', cat: 'menus', name: 'wmenu.name', scheme: 'lavender', fonts: 'elegant', size: [99, 210],
    build(k) {
      const { W, H, s } = k;
      k.rect(5, 5, W - 10, H - 10, { fill: 'none', stroke: 'secondary', sw: 0.8 });
      k.art('white-flower', W / 2 - 10, 12, 20, 20);
      k.text(8, 34, W - 16, 22, s('wmenu.title'), { size: 34, font: 'heading', color: 'primary', align: 'center' });
      k.text(8, 54, W - 16, 8, s('wmenu.couple'), { size: 11, align: 'center', caps: true, tracking: 2 });
      s('wmenu.courses').split('\n').forEach((c, i) => {
        const [name, desc] = c.split('|'), y = 72 + i * 30;
        k.text(10, y, W - 20, 7, name, { size: 10.5, align: 'center', caps: true, tracking: 2, color: 'primary', bold: true });
        k.text(10, y + 7, W - 20, 18, desc, { size: 11, align: 'center', italic: true, lh: 1.2 });
      });
      k.art('white-flower', W / 2 - 6, H - 22, 12, 12);
    },
  },
];

export const en = {
  'cafe.name': 'Café menu', 'cafe.title': 'Café Menu', 'cafe.sub': 'Fresh coffee and home-made cakes',
  'cafe.s1': 'Coffee', 'cafe.l1': 'Espresso|2.20\nCappuccino|3.20\nLatte|3.40\nFlat white|3.30\nIced coffee|3.80',
  'cafe.s2': 'Tea and more', 'cafe.l2': 'Pot of tea|2.80\nHot chocolate|3.50\nFresh orange juice|3.90',
  'cafe.s3': 'Cakes and snacks', 'cafe.l3': 'Carrot cake|3.90|With cream cheese icing\nChocolate brownie|3.20|Warm, with a scoop of ice cream\nToasted sandwich|5.50|Ham and cheese, or tomato and mozzarella',
  'cafe.hours': 'Open every day 8 am – 6 pm · Free Wi-Fi',
  'rest.name': 'Restaurant menu', 'rest.sub': 'Menu',
  'rest.s1': 'Starters', 'rest.l1': 'Soup of the day|6.50|With fresh bread\nGreek salad|8.00|Tomato, cucumber, olives and feta\nGarlic prawns|9.50|In olive oil and chilli',
  'rest.s2': 'Main courses', 'rest.l2': 'Grilled sea bass|18.50|Lemon potatoes and greens\nLamb with rosemary|19.00|Slow cooked, with roast vegetables\nChicken souvlaki|14.50|Pitta, tzatziki and chips\nMushroom risotto|13.50|With parmesan and herbs\nBeef burger|14.00|Cheddar, salad and fries',
  'rest.s3': 'Desserts', 'rest.l3': 'Baklava|6.00\nChocolate cake|6.50\nIce cream|5.00|Three scoops',
  'rest.footer': 'Please tell us about any allergies. All prices include tax.',
  'fine.name': 'Tasting menu', 'fine.title': 'Tasting Menu', 'fine.date': 'Autumn',
  'fine.courses': 'To begin|Beetroot, goat’s cheese and walnuts\nFish|Pan-fried cod with saffron sauce\nMain|Slow-roasted duck, cherry jus and celeriac\nTo finish|Dark chocolate tart with vanilla cream',
  'fine.price': '€65 per person',
  'pizza.name': 'Pizza menu', 'pizza.title': 'Pizza Napoli', 'pizza.sub': 'Wood-fired since 1998',
  'pizza.s1': 'Classic', 'pizza.l1': 'Margherita|8.50|Tomato, mozzarella, basil\nMarinara|7.50|Tomato, garlic, oregano\nPepperoni|10.50|Spicy salami and mozzarella\nFour cheeses|11.00|Mozzarella, gorgonzola, parmesan, fontina',
  'pizza.s2': 'Specials', 'pizza.l2': 'Vegetarian|10.00|Peppers, courgette, onion, olives\nHawaiian|10.50|Ham and pineapple\nCapricciosa|11.50|Ham, mushrooms, artichokes, olives\nCalzone|11.00|Folded, with ricotta and salami',
  'pizza.order': 'Order by phone',
  'kids.name': 'Children’s menu', 'kids.title': 'Kids’ Menu', 'kids.items': 'Mini burger|5.50\nPasta|4.90\nPizza|5.20\nChicken bites|5.50\nIce cream|2.50\nMilkshake|2.80', 'kids.footer': 'For children up to 12 years · Free colouring sheet!',
  'drinks.name': 'Drinks list', 'drinks.title': 'Drinks',
  'drinks.s1': 'Cocktails', 'drinks.l1': 'Mojito|8.50\nAperol spritz|8.00\nPiña colada|9.00\nMargarita|8.50',
  'drinks.s2': 'Wine', 'drinks.l2': 'House red|5.00|Glass\nHouse white|5.00|Glass\nRosé|5.50|Glass\nProsecco|6.50|Glass\nBottle of house wine|19.00',
  'drinks.s3': 'Beer and soft drinks', 'drinks.l3': 'Draught beer|4.50\nBottled beer|4.00\nCola, lemonade|2.80\nSparkling water|2.50',
  'drinks.footer': 'Happy hour every day 5 – 7 pm',
  'brunch.name': 'Brunch menu', 'brunch.title': 'Weekend Brunch',
  'brunch.s1': 'Plates', 'brunch.l1': 'Pancake stack|8.50|Maple syrup, berries and cream\nFull breakfast|11.00|Eggs, bacon, sausage, beans and toast\nAvocado toast|9.00|Poached eggs and chilli\nGranola bowl|6.50|Yoghurt, honey and fruit',
  'brunch.s2': 'To drink', 'brunch.l2': 'Fresh orange juice|3.90\nSmoothie of the day|4.50\nCoffee or tea|2.80',
  'brunch.footer': 'Saturday and Sunday · 9 am – 2 pm',
  'wmenu.name': 'Wedding dinner menu', 'wmenu.title': 'Dinner', 'wmenu.couple': 'Sophie & James · 12.09',
  'wmenu.courses': 'Starter|Melon with cured ham and mint\nMain course|Roast chicken with herbs, potatoes and seasonal vegetables\nDessert|Wedding cake and fresh strawberries\nTo finish|Coffee and sweets',
};
