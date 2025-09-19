import type { Puzzle } from '$lib/types';

export const MOCK_PUZZLES: Puzzle[] = [
	{
		id: 'demo-1',
		title: 'Demo 1',
		createdAt: Date.now(),
		words: [
			// A – Fruit
			{ id: 'w1', text: 'Apple', groupId: 'A' },
			{ id: 'w2', text: 'Banana', groupId: 'A' },
			{ id: 'w3', text: 'Grape', groupId: 'A' },
			{ id: 'w4', text: 'Pear', groupId: 'A' },
			// B – Colors
			{ id: 'w5', text: 'Red', groupId: 'B' },
			{ id: 'w6', text: 'Blue', groupId: 'B' },
			{ id: 'w7', text: 'Green', groupId: 'B' },
			{ id: 'w8', text: 'Yellow', groupId: 'B' },
			// C – Animals
			{ id: 'w9', text: 'Dog', groupId: 'C' },
			{ id: 'w10', text: 'Cat', groupId: 'C' },
			{ id: 'w11', text: 'Horse', groupId: 'C' },
			{ id: 'w12', text: 'Sheep', groupId: 'C' },
			// D – Weather
			{ id: 'w13', text: 'Rain', groupId: 'D' },
			{ id: 'w14', text: 'Snow', groupId: 'D' },
			{ id: 'w15', text: 'Wind', groupId: 'D' },
			{ id: 'w16', text: 'Sun', groupId: 'D' }
		]
	},
	{
		id: 'demo-2',
		title: 'Demo 2',
		createdAt: Date.now() - 86_400_000,
		words: [
			// A – Shapes
			{ id: 'x1', text: 'Circle', groupId: 'A' },
			{ id: 'x2', text: 'Square', groupId: 'A' },
			{ id: 'x3', text: 'Triangle', groupId: 'A' },
			{ id: 'x4', text: 'Rectangle', groupId: 'A' },
			// B – Continents
			{ id: 'x5', text: 'Asia', groupId: 'B' },
			{ id: 'x6', text: 'Europe', groupId: 'B' },
			{ id: 'x7', text: 'Africa', groupId: 'B' },
			{ id: 'x8', text: 'Oceania', groupId: 'B' },
			// C – Months
			{ id: 'x9', text: 'Jan', groupId: 'C' },
			{ id: 'x10', text: 'Feb', groupId: 'C' },
			{ id: 'x11', text: 'Mar', groupId: 'C' },
			{ id: 'x12', text: 'Apr', groupId: 'C' },
			// D – Tools
			{ id: 'x13', text: 'Hammer', groupId: 'D' },
			{ id: 'x14', text: 'Wrench', groupId: 'D' },
			{ id: 'x15', text: 'Saw', groupId: 'D' },
			{ id: 'x16', text: 'Drill', groupId: 'D' }
		]
	}
];
