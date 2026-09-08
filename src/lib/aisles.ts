/**
 * Shopping list grouping. Ingredients are matched against keyword sets in
 * order, so the list reads in roughly the order you walk a supermarket.
 * This corpus is vegetarian Indian, so the spice shelf is generous.
 */
export const AISLES = [
  'Produce',
  'Dairy & Chilled',
  'Spices & Masala',
  'Grains, Dal & Flour',
  'Cans, Jars & Sauces',
  'Oils & Vinegars',
  'Baking & Sweet',
  'Nuts & Dried Fruit',
  'Bakery & Frozen',
  'Other',
] as const;

export type Aisle = (typeof AISLES)[number];

const RULES: Array<[Aisle, RegExp]> = [
  // Ordered most-specific first: "mustard oil" must beat "mustard",
  // "corn flour" must beat "corn", "coconut milk" must beat "milk".
  ['Baking & Sweet', /\bbaking (powder|soda)\b/i],
  ['Spices & Masala', /\b(masala|turmeric|haldi|cumin|jeera|coriander seed|dhania|cayenne|paprika|garam|asafoetida|hing|cardamom|elaichi|clove|cinnamon|dalchini|bay lea(f|ves)|tej patta|fenugreek|methi|kasuri|mustard seed|rai\b|fennel|saunf|ajwain|carom|nigella|kalonji|star anise|mace|javitri|nutmeg|jaiphal|peppercorn|black pepper|white pepper|amchur|chaat|kashmiri|curry powder|sambar|rasam|tandoori|salt|kala namak|saffron|kesar|dried chil|red chill?ie?s?\b|spice|powder|seasoning|allspice|oregano|asoefitida|rose water)s?\b/i],
  ['Grains, Dal & Flour', /\b(rice|basmati|poha|semolina|sooji|rava|flour|atta|maida|besan|cornstarch|corn ?flour|dal|daal|lentil|toor|arhar|moong|mung|masoor|urad|chana|chickpea|garbanzo|rajma|kidney bean|black bean|quinoa|oats?\b|barley|millet|bajra|jowar|ragi|couscous|pasta|noodle|spaghetti|vermicelli|sevai|bread ?crumb|panko|sabudana|tapioca|yeast|soya chunk|sev\b|melon seed|poppy seed|khus khus)/i],
  ['Oils & Vinegars', /\b(oil|vinegar|cooking spray)s?\b/i],
  ['Cans, Jars & Sauces', /\b(tomato (puree|paste|sauce|passata)|coconut (milk|cream)|stock|broth|soy sauce|tamari|ketchup|sriracha|gochujang|hot sauce|salsa|chutney|pickle|achar|tahini|hummus|mayonnaise|mayo|mustard|worcestershire|canned|tinned|olives|capers|peanut butter|jam|honey|maple syrup|molasses|tamarind|imli)/i],
  ['Dairy & Chilled', /\b(paneer|milk|yogurt|yoghurt|curd|dahi|cream|butter|ghee|cheese|mozzarella|parmesan|ricotta|buttermilk|chaas|tofu|eggs?\b|kefir|khoya|mawa)/i],
  ['Nuts & Dried Fruit', /\b(almond|cashew|kaju|badam|pistachio|pista|walnut|pecan|hazelnut|peanut|groundnut|raisin|kishmish|dates?\b|khajur|apricot|cranberry|figs?\b|anjeer|coconut|sesame|til\b|sunflower seed|pumpkin seed|chia|flax|hemp seed|nuts?\b)/i],
  ['Bakery & Frozen', /\b(bread|buns?\b|pav\b|naan|roti|chapati|parantha|paratha|tortilla|pita|wrap|puff pastry|phyllo|frozen|ice cream|pie crust|spring roll)/i],
  ['Baking & Sweet', /\b(sugar|jaggery|gur\b|cocoa|chocolate|vanilla|marshmallow|sweetener|stevia|custard|gelatin|agar|condensed milk)/i],
  ['Produce', /\b(onion|tomato|potato|garlic|ginger|adrak|cilantro|coriander|curry leaves|mint|pudina|spinach|palak|kale|lettuce|cabbage|carrot|pepper|capsicum|chill?i|jalape(n|\u00f1)o|serrano|cauliflower|gobi|broccoli|peas|beans|okra|bhindi|eggplant|brinjal|baingan|zucchini|squash|pumpkin|cucumber|celery|corn|mushroom|avocado|lemon|lime|nimbu|orange|apple|banana|mango|berry|berries|blueberr|strawberr|raspberr|blackberr|beet|radish|mooli|turnip|scallion|shallot|leek|sweet potato|yam\b|gourd|lauki|tindora|drumstick|greens|herb|parsley|basil|thyme|rosemary|dill|arugula|sprout|fruit|vegetable|veggie|pomegranate|pineapple|asparagus|edamame|coleslaw|melon|banana|grape|pear|peach|plum|cherry|watermelon)/i],
];

export function aisleFor(name: string): Aisle {
  const n = (name ?? '').toLowerCase();
  for (const [aisle, re] of RULES) if (re.test(n)) return aisle;
  return 'Other';
}

/** Sort helper so aisles always render in walk order. */
export const aisleRank = (a: string) => {
  const i = (AISLES as readonly string[]).indexOf(a);
  return i === -1 ? AISLES.length : i;
};

/**
 * Things nobody adds to a shopping list. Filtered out before the list is
 * built -- "Water" alone accounts for over a hundred ingredient rows.
 */
const STAPLE = /^(cold |warm |hot |room temperature |luke ?warm )?(water|ice cubes?|ice)\b/i;
export const isPantryStaple = (name: string) => STAPLE.test((name ?? '').trim());
