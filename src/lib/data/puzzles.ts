export interface Puzzle {
	id: number;
	title: string;
	difficulty: 'Easy' | 'Medium' | 'Hard';
	category: string;
	solveCount: number;
	isPinned: boolean;
	description: string;
	imageUrl: string;
	words: string[][];
	solution: {
		groups: {
			name: string;
			words: string[];
			color: string;
		}[];
	};
	createdBy: string;
	createdAt: string;
}

export const puzzles: Puzzle[] = [
	{
		id: 1,
		title: 'Daily Challenge: Sports Teams',
		difficulty: 'Medium',
		category: 'Sports',
		solveCount: 1247,
		isPinned: true,
		description: 'Connect professional sports teams by their leagues and divisions.',
		imageUrl: '/api/placeholder/300/200?text=Sports+Teams',
		words: [
			['Lakers', 'Warriors', 'Celtics', 'Heat'],
			['Cowboys', 'Patriots', 'Packers', 'Steelers'],
			['Yankees', 'Dodgers', 'Red Sox', 'Giants'],
			['Blackhawks', 'Rangers', 'Bruins', 'Kings']
		],
		solution: {
			groups: [
				{
					name: 'NBA Teams',
					words: ['Lakers', 'Warriors', 'Celtics', 'Heat'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'NFL Teams',
					words: ['Cowboys', 'Patriots', 'Packers', 'Steelers'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'MLB Teams',
					words: ['Yankees', 'Dodgers', 'Red Sox', 'Giants'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'NHL Teams',
					words: ['Blackhawks', 'Rangers', 'Bruins', 'Kings'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Alice Johnson',
		createdAt: '2024-01-15'
	},
	{
		id: 2,
		title: 'Classic Literature Characters',
		difficulty: 'Hard',
		category: 'Literature',
		solveCount: 892,
		isPinned: true,
		description: 'Group famous literary characters by the novels they appear in.',
		imageUrl: '/api/placeholder/300/200?text=Literature+Characters',
		words: [
			['Gatsby', 'Daisy', 'Nick', 'Tom'],
			['Atticus', 'Scout', 'Jem', 'Boo'],
			['Elizabeth', 'Darcy', 'Jane', 'Bingley'],
			['Sherlock', 'Watson', 'Moriarty', 'Lestrade']
		],
		solution: {
			groups: [
				{
					name: 'The Great Gatsby',
					words: ['Gatsby', 'Daisy', 'Nick', 'Tom'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'To Kill a Mockingbird',
					words: ['Atticus', 'Scout', 'Jem', 'Boo'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'Pride and Prejudice',
					words: ['Elizabeth', 'Darcy', 'Jane', 'Bingley'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Sherlock Holmes',
					words: ['Sherlock', 'Watson', 'Moriarty', 'Lestrade'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Carol Davis',
		createdAt: '2024-01-14'
	},
	{
		id: 3,
		title: 'Popular TV Shows',
		difficulty: 'Easy',
		category: 'Entertainment',
		solveCount: 2156,
		isPinned: false,
		description: 'Connect popular TV shows by their genres and networks.',
		imageUrl: '/api/placeholder/300/200?text=TV+Shows',
		words: [
			['Friends', 'Seinfeld', 'Cheers', 'Frasier'],
			['Breaking Bad', 'Better Call Saul', 'Ozark', 'Narcos'],
			['Game of Thrones', 'Westworld', 'True Detective', 'The Sopranos'],
			['The Office', 'Parks and Rec', 'Brooklyn Nine-Nine', '30 Rock']
		],
		solution: {
			groups: [
				{
					name: 'Classic Sitcoms',
					words: ['Friends', 'Seinfeld', 'Cheers', 'Frasier'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Crime Dramas',
					words: ['Breaking Bad', 'Better Call Saul', 'Ozark', 'Narcos'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'HBO Dramas',
					words: ['Game of Thrones', 'Westworld', 'True Detective', 'The Sopranos'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Workplace Comedies',
					words: ['The Office', 'Parks and Rec', 'Brooklyn Nine-Nine', '30 Rock'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Emma Brown',
		createdAt: '2024-01-13'
	},
	{
		id: 4,
		title: 'Chemical Elements',
		difficulty: 'Hard',
		category: 'Science',
		solveCount: 634,
		isPinned: false,
		description: 'Group chemical elements by their properties and periodic table groups.',
		imageUrl: '/api/placeholder/300/200?text=Chemical+Elements',
		words: [
			['Hydrogen', 'Lithium', 'Sodium', 'Potassium'],
			['Helium', 'Neon', 'Argon', 'Xenon'],
			['Iron', 'Copper', 'Silver', 'Gold'],
			['Carbon', 'Silicon', 'Germanium', 'Tin']
		],
		solution: {
			groups: [
				{
					name: 'Alkali Metals',
					words: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Noble Gases',
					words: ['Helium', 'Neon', 'Argon', 'Xenon'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'Transition Metals',
					words: ['Iron', 'Copper', 'Silver', 'Gold'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Carbon Group',
					words: ['Carbon', 'Silicon', 'Germanium', 'Tin'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'David Wilson',
		createdAt: '2024-01-12'
	},
	{
		id: 5,
		title: 'Tech Giants Connection',
		difficulty: 'Medium',
		category: 'Technology',
		solveCount: 1543,
		isPinned: false,
		description: 'Connect major technology companies by their primary business focus.',
		imageUrl: '/api/placeholder/300/200?text=Tech+Giants',
		words: [
			['Google', 'Facebook', 'Twitter', 'TikTok'],
			['Apple', 'Samsung', 'Sony', 'LG'],
			['Amazon', 'eBay', 'Shopify', 'Etsy'],
			['Microsoft', 'Oracle', 'SAP', 'Salesforce']
		],
		solution: {
			groups: [
				{
					name: 'Social Media',
					words: ['Google', 'Facebook', 'Twitter', 'TikTok'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Consumer Electronics',
					words: ['Apple', 'Samsung', 'Sony', 'LG'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'E-commerce',
					words: ['Amazon', 'eBay', 'Shopify', 'Etsy'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Enterprise Software',
					words: ['Microsoft', 'Oracle', 'SAP', 'Salesforce'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Alice Johnson',
		createdAt: '2024-01-11'
	},
	{
		id: 6,
		title: 'Movie Directors',
		difficulty: 'Medium',
		category: 'Entertainment',
		solveCount: 987,
		isPinned: false,
		description: 'Group famous movie directors by their signature film genres.',
		imageUrl: '/api/placeholder/300/200?text=Movie+Directors',
		words: [
			['Spielberg', 'Lucas', 'Cameron', 'Scott'],
			['Tarantino', 'Scorsese', 'Coppola', 'De Palma'],
			['Hitchcock', 'Kubrick', 'Lynch', 'Cronenberg'],
			['Miyazaki', 'Kurosawa', 'Ozu', 'Kitano']
		],
		solution: {
			groups: [
				{
					name: 'Blockbuster Directors',
					words: ['Spielberg', 'Lucas', 'Cameron', 'Scott'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Crime/Drama Masters',
					words: ['Tarantino', 'Scorsese', 'Coppola', 'De Palma'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'Psychological Thriller',
					words: ['Hitchcock', 'Kubrick', 'Lynch', 'Cronenberg'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Japanese Cinema',
					words: ['Miyazaki', 'Kurosawa', 'Ozu', 'Kitano'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Bob Smith',
		createdAt: '2024-01-10'
	},
	{
		id: 7,
		title: 'World Capitals',
		difficulty: 'Easy',
		category: 'Geography',
		solveCount: 1876,
		isPinned: false,
		description: 'Match world capitals with their respective continents.',
		imageUrl: '/api/placeholder/300/200?text=World+Capitals',
		words: [
			['London', 'Paris', 'Berlin', 'Rome'],
			['Tokyo', 'Beijing', 'Seoul', 'Bangkok'],
			['Cairo', 'Lagos', 'Nairobi', 'Casablanca'],
			['Ottawa', 'Mexico City', 'Brasilia', 'Buenos Aires']
		],
		solution: {
			groups: [
				{
					name: 'European Capitals',
					words: ['London', 'Paris', 'Berlin', 'Rome'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Asian Capitals',
					words: ['Tokyo', 'Beijing', 'Seoul', 'Bangkok'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'African Capitals',
					words: ['Cairo', 'Lagos', 'Nairobi', 'Casablanca'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'American Capitals',
					words: ['Ottawa', 'Mexico City', 'Brasilia', 'Buenos Aires'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Carol Davis',
		createdAt: '2024-01-09'
	},
	{
		id: 8,
		title: 'Programming Languages',
		difficulty: 'Medium',
		category: 'Technology',
		solveCount: 1234,
		isPinned: false,
		description: 'Group programming languages by their primary use cases and paradigms.',
		imageUrl: '/api/placeholder/300/200?text=Programming+Languages',
		words: [
			['JavaScript', 'TypeScript', 'React', 'Vue'],
			['Python', 'R', 'MATLAB', 'Julia'],
			['C', 'C++', 'Rust', 'Go'],
			['Java', 'C#', 'Kotlin', 'Scala']
		],
		solution: {
			groups: [
				{
					name: 'Web Development',
					words: ['JavaScript', 'TypeScript', 'React', 'Vue'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Data Science',
					words: ['Python', 'R', 'MATLAB', 'Julia'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'Systems Programming',
					words: ['C', 'C++', 'Rust', 'Go'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Enterprise/JVM',
					words: ['Java', 'C#', 'Kotlin', 'Scala'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'David Wilson',
		createdAt: '2024-01-08'
	},
	{
		id: 9,
		title: 'Ancient Civilizations',
		difficulty: 'Hard',
		category: 'History',
		solveCount: 756,
		isPinned: false,
		description: 'Connect ancient civilizations by their geographical regions and time periods.',
		imageUrl: '/api/placeholder/300/200?text=Ancient+Civilizations',
		words: [
			['Egyptian', 'Nubian', 'Carthaginian', 'Berber'],
			['Greek', 'Roman', 'Byzantine', 'Etruscan'],
			['Mesopotamian', 'Persian', 'Babylonian', 'Assyrian'],
			['Mayan', 'Aztec', 'Incan', 'Olmec']
		],
		solution: {
			groups: [
				{
					name: 'African Civilizations',
					words: ['Egyptian', 'Nubian', 'Carthaginian', 'Berber'],
					color: 'bg-yellow-200 dark:bg-yellow-800'
				},
				{
					name: 'Mediterranean',
					words: ['Greek', 'Roman', 'Byzantine', 'Etruscan'],
					color: 'bg-green-200 dark:bg-green-800'
				},
				{
					name: 'Middle Eastern',
					words: ['Mesopotamian', 'Persian', 'Babylonian', 'Assyrian'],
					color: 'bg-blue-200 dark:bg-blue-800'
				},
				{
					name: 'Mesoamerican',
					words: ['Mayan', 'Aztec', 'Incan', 'Olmec'],
					color: 'bg-purple-200 dark:bg-purple-800'
				}
			]
		},
		createdBy: 'Emma Brown',
		createdAt: '2024-01-07'
	}
];

export function getPuzzleById(id: number): Puzzle | undefined {
	return puzzles.find(puzzle => puzzle.id === id);
}

export function getFeaturedPuzzles(): Puzzle[] {
	return puzzles.filter(puzzle => puzzle.isPinned).concat(
		puzzles.filter(puzzle => !puzzle.isPinned).slice(0, 2)
	);
}
