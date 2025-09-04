import type { Puzzle } from "$lib/types";

export const MOCK_PUZZLES: Puzzle[] = [
  {
    id: "demo-1",
    title: "Demo Puzzle 1",
    createdAt: Date.now() - 1000 * 60 * 60,
    words: [
      { id: "w1",  text: "Apple",  groupId: "A" },
      { id: "w2",  text: "Banana", groupId: "A" },
      { id: "w3",  text: "Pear",   groupId: "A" },
      { id: "w4",  text: "Grape",  groupId: "A" },
      { id: "w5",  text: "Red",    groupId: "B" },
      { id: "w6",  text: "Blue",   groupId: "B" },
      { id: "w7",  text: "Green",  groupId: "B" },
      { id: "w8",  text: "Yellow", groupId: "B" },
      { id: "w9",  text: "Dog",    groupId: "C" },
      { id: "w10", text: "Cat",    groupId: "C" },
      { id: "w11", text: "Horse",  groupId: "C" },
      { id: "w12", text: "Cow",    groupId: "C" },
      { id: "w13", text: "Car",    groupId: "D" },
      { id: "w14", text: "Bus",    groupId: "D" },
      { id: "w15", text: "Train",  groupId: "D" },
      { id: "w16", text: "Boat",   groupId: "D" }
    ],
    groups: [
      { id: "A", name: "Fruits" },
      { id: "B", name: "Colors" },
      { id: "C", name: "Animals" },
      { id: "D", name: "Vehicles" }
    ]
  },
  {
    id: "demo-2",
    title: "Demo Puzzle 2",
    createdAt: Date.now() - 1000 * 60 * 30,
    words: [
      { id: "x1", text: "Mercury", groupId: "A" },
      { id: "x2", text: "Venus",   groupId: "A" },
      { id: "x3", text: "Earth",   groupId: "A" },
      { id: "x4", text: "Mars",    groupId: "A" },
      { id: "x5", text: "Triangle", groupId: "B" },
      { id: "x6", text: "Square",   groupId: "B" },
      { id: "x7", text: "Circle",   groupId: "B" },
      { id: "x8", text: "Hexagon",  groupId: "B" },
      { id: "x9",  text: "Jazz",    groupId: "C" },
      { id: "x10", text: "Rock",    groupId: "C" },
      { id: "x11", text: "Pop",     groupId: "C" },
      { id: "x12", text: "Blues",   groupId: "C" },
      { id: "x13", text: "Fork",    groupId: "D" },
      { id: "x14", text: "Spoon",   groupId: "D" },
      { id: "x15", text: "Knife",   groupId: "D" },
      { id: "x16", text: "Chopsticks", groupId: "D" }
    ],
    groups: [
      { id: "A", name: "Planets" },
      { id: "B", name: "Shapes" },
      { id: "C", name: "Music Genres" },
      { id: "D", name: "Utensils" }
    ]
  }
];
