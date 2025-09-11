// scripts/seedData.ts

// Users
export const seedUsers = [
  {
    id: "john_doe",
    displayName: "John Doe",
    bio: "sports puzzle maker",
    photoURL: "https://i.pravatar.cc/150?img=11",
    email: "john@example.com",
    providerIds: ["password"],
    settings: { darkMode: true, emailNotifications: true },
    stats: { puzzlesCreated: 2, puzzlesPlayed: 0, puzzlesCompleted: 0 },
    pinned: [] as string[]
  },
  {
    id: "jane_doe",
    displayName: "Jane Doe",
    bio: "stat nerd & solver",
    photoURL: "https://i.pravatar.cc/150?img=32",
    email: "jane@example.com",
    providerIds: ["password"],
    settings: { darkMode: false, emailNotifications: true },
    stats: { puzzlesCreated: 1, puzzlesPlayed: 0, puzzlesCompleted: 0 },
    pinned: [] as string[]
  }
];

// Puzzles
export const seedPuzzles = [
  {
    id: "pz_sports_basics_4x4",
    title: "Ball Sports Basics",
    description: "Classic 4×4 warm-up",
    gridSize: 4,
    groupSize: 4,
    categories: [
      { title: "Basketball Terms", words: ["Dribble", "Rebound", "Assist", "Dunk"] },
      { title: "Soccer Positions", words: ["Striker", "Winger", "Keeper", "Fullback"] },
      { title: "Tennis Slams",     words: ["Wimbledon", "US Open", "Roland Garros", "Australian Open"] },
      { title: "Baseball Stats",   words: ["RBI", "ERA", "HR", "AVG"] }
    ],
    wordsFlat: [
      "Dribble","Rebound","Assist","Dunk",
      "Striker","Winger","Keeper","Fullback",
      "Wimbledon","US Open","Roland Garros","Australian Open",
      "RBI","ERA","HR","AVG"
    ],
    difficulty: "easy" as const,
    tags: ["sports", "beginner"],
    solutionHash: null as string | null,
    createdBy: { uid: "john_doe", displayName: "John Doe", photoURL: "https://i.pravatar.cc/150?img=11" },
    visibility: "public" as const,
    stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
    isPublished: true
  },
  {
    id: "pz_sports_mix_5x5",
    title: "Sports Mix",
    description: "Step up to 5×5",
    gridSize: 5,
    groupSize: 5,
    categories: [
      { title: "NBA Legends",        words: ["Jordan", "LeBron", "Kobe", "Magic", "Bird"] },
      { title: "Soccer Positions",   words: ["Striker", "Winger", "Keeper", "Fullback", "Midfielder"] },
      { title: "Tennis Strokes",     words: ["Forehand", "Backhand", "Serve", "Slice", "Dropshot"] },
      { title: "Pitch Types",        words: ["Fastball", "Curveball", "Slider", "Changeup", "Knuckleball"] },
      { title: "Track Distances",    words: ["100m", "200m", "400m", "800m", "1500m"] }
    ],
    wordsFlat: [
      "Jordan","LeBron","Kobe","Magic","Bird",
      "Striker","Winger","Keeper","Fullback","Midfielder",
      "Forehand","Backhand","Serve","Slice","Dropshot",
      "Fastball","Curveball","Slider","Changeup","Knuckleball",
      "100m","200m","400m","800m","1500m"
    ],
    difficulty: "medium" as const,
    tags: ["sports"],
    solutionHash: null,
    createdBy: { uid: "jane_doe", displayName: "Jane Doe", photoURL: "https://i.pravatar.cc/150?img=32" },
    visibility: "public" as const,
    stats: { plays: 0, completions: 0, avgTimeSec: 0, likes: 0 },
    isPublished: true
  }
];

// ── User Collections ───────────────────────────────────────────────────────────
export const seedCollections = [
  {
    ownerUid: "john_doe",
    id: "col_john_favs",
    name: "John's Sports Picks",
    description: "Favorites & WIPs",
    puzzleIds: ["pz_sports_basics_4x4", "pz_sports_mix_5x5"],
    isPublic: false
  }
];

// ── Activity (tiny feed) ──────────────────────────────────────────────────────
export const seedActivity = [
  {
    id: "act_pz_sports_basics_created",
    type: "puzzle_created",
    actor: { uid: "john_doe", displayName: "John Doe", photoURL: "https://i.pravatar.cc/150?img=11" },
    puzzleId: "pz_sports_basics_4x4",
    visibility: "public"
  },
  {
    id: "act_pz_sports_mix_created",
    type: "puzzle_created",
    actor: { uid: "jane_doe", displayName: "Jane Doe", photoURL: "https://i.pravatar.cc/150?img=32" },
    puzzleId: "pz_sports_mix_5x5",
    visibility: "public"
  }
];
