export type Ingredient = {
  uid: number;
  amount: string;
  unit: string;
  name: string;
  notes: string;
  /** Heading this ingredient sits under, e.g. "For the tempering". */
  group?: string;
};

export type Step = {
  uid: number;
  text: string;
  imageUrl?: string;
  group?: string;
  /** uids of ingredients this step uses, for Cook Mode's "you'll need" strip. */
  ingredientUids: number[];
};

export type Nutrition = Partial<Record<
  | 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'saturated_fat'
  | 'fiber' | 'sugar' | 'sodium' | 'cholesterol' | 'potassium'
  | 'calcium' | 'iron' | 'vitamin_a' | 'vitamin_c',
  number
>>;

export type Recipe = {
  id: number;
  slug: string;
  name: string;
  /** `name` with SEO tails trimmed — use this for anything user-facing. */
  displayName: string;
  summary: string;
  imageUrl?: string;
  /** Permalink on chopthegreens.com, empty when the recipe has no parent post. */
  link: string;
  prep: number;
  cook: number;
  /** Repaired: never less than prep + cook. Minutes. */
  total: number;
  servings: number;
  servingsUnit: string;
  rating: { avg: number; count: number };
  courses: string[];
  cuisines: string[];
  diets: string[];
  keywords: string[];
  equipment: string[];
  ingredients: Ingredient[];
  steps: Step[];
  notes: string;
  nutrition: Nutrition;
  /** Parsed out of `video_embed`; the feed's own `video_id` is always "0". */
  videoId?: string;
  /** Vertical Shorts need a 9:16 player instead of 16:9. */
  videoIsShort: boolean;
  date: string;
  /** Derived: protein per serving >= 15g. */
  highProtein: boolean;
  /** Lowercased haystack for search. */
  search: string;
};
