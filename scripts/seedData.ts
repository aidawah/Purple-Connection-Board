// scripts/seedData.ts
import type { FieldValue } from "firebase-admin/firestore";

export const seedUsers = [
  {
    id: "demo_ada",
    displayName: "Ada Lovelace",
    bio: "puzzle enjoyer",
    photoURL: "https://i.pravatar.cc/150?img=5",
    email: "ada@example.com",
    providerIds: ["password"],
    settings: { darkMode: true, emailNotifications: true },
    stats: { puzzlesCreated: 2, puzzlesPlayed: 0, puzzlesCompleted: 0 },
    pinned: [] as string[]
  },
  {
    id: "demo_grace",
    displayName: "Grace Hopper",
    bio: "ships puzzles before breakfast",
    photoURL: "https://i.pravatar.cc/150?img=15",
    email: "grace@example.com",
    providerIds: ["password"],
    settings: { darkMode: false, emailNotifications: true },
    stats: { puzzlesCreated: 1, puzzlesPlayed: 0, puzzlesCompleted: 0 },
    pinned: [] as string[]
  }
];

export const seedPuzzles = [
  {
    id: "pz_animals_easy",
    title: "Animals & Things",
    description: "4x4 classic",
    categories: [
      { title: "Birds",    words: ["Sparrow","Crow","Robin","Finch"] },
      { title: "Big Cats", words: ["Lion","Tiger","Leopard","Jaguar"] },
      { title: "Sea Life", words: ["Tuna","Ray","Eel","Shark"] },
      { title: "Bugs",     words: ["Ant","Bee","Fly","Moth"] }
    ],
    wordsFlat: [
      "Sparrow","Crow","Robin","Finch",
      "Lion","Tiger","Leopard","Jaguar",
      "Tuna","Ray","Eel","Shark",
      "Ant","Bee","Fly","Moth"
    ],
    difficulty: "easy" as const,
    tags: ["animals","beginner"],
    solutionHash: null as string | null,
    createdBy: { uid: "demo_ada", displayName: "Ada Lovelace", photoURL: "https://i.pravatar.cc/150?img=5" },
    visibility: "public" as const,
    stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
    isPublished: true
  },
  {
    id: "pz_food_medium",
    title: "Food Groups",
    description: "Find the tasty sets",
    categories: [
      { title: "Fruits",  words: ["Apple","Pear","Grape","Peach"] },
      { title: "Breads",  words: ["Rye","Pita","Baguette","Naan"] },
      { title: "Cheeses", words: ["Brie","Gouda","Cheddar","Swiss"] },
      { title: "Spices",  words: ["Cumin","Basil","Clove","Sage"] }
    ],
    wordsFlat: [
      "Apple","Pear","Grape","Peach",
      "Rye","Pita","Baguette","Naan",
      "Brie","Gouda","Cheddar","Swiss",
      "Cumin","Basil","Clove","Sage"
    ],
    difficulty: "medium" as const,
    tags: ["food"],
    solutionHash: null,
    createdBy: { uid: "demo_ada", displayName: "Ada Lovelace", photoURL: "https://i.pravatar.cc/150?img=5" },
    visibility: "public" as const,
    stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
    isPublished: true
  },
  {
    id: "pz_science_hard",
    title: "Science Mix",
    description: "Trickier connections",
    categories: [
      { title: "Planets",       words: ["Mars","Venus","Earth","Mercury"] },
      { title: "SI Units",      words: ["Ampere","Kelvin","Mole","Candela"] },
      { title: "Noble Gases",   words: ["Neon","Argon","Krypton","Xenon"] },
      { title: "Famous Laws",   words: ["Ohm","Boyle","Hooke","Avogadro"] }
    ],
    wordsFlat: [
      "Mars","Venus","Earth","Mercury",
      "Ampere","Kelvin","Mole","Candela",
      "Neon","Argon","Krypton","Xenon",
      "Ohm","Boyle","Hooke","Avogadro"
    ],
    difficulty: "hard" as const,
    tags: ["science","hardcore"],
    solutionHash: null,
    createdBy: { uid: "demo_grace", displayName: "Grace Hopper", photoURL: "https://i.pravatar.cc/150?img=15" },
    visibility: "public" as const,
    stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
    isPublished: true
  }
];

export const seedCollections = [
  {
    ownerUid: "demo_ada",
    id: "col_adas_favs",
    name: "Ada's Favs",
    description: "Favorites & WIPs",
    puzzleIds: ["pz_animals_easy","pz_food_medium"],
    isPublic: false
  }
];

export const seedActivity = [
  // Keep tiny—UI smoke test only
  {
    id: "act_pz_animals_created",
    type: "puzzle_created",
    actor: { uid: "demo_ada", displayName: "Ada Lovelace", photoURL: "https://i.pravatar.cc/150?img=5" },
    puzzleId: "pz_animals_easy",
    visibility: "public"
  },
  {
    id: "act_pz_science_created",
    type: "puzzle_created",
    actor: { uid: "demo_grace", displayName: "Grace Hopper", photoURL: "https://i.pravatar.cc/150?img=15" },
    puzzleId: "pz_science_hard",
    visibility: "public"
  }
];
