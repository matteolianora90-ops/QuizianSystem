import { Quiz, ActivityRecord, UserProfile, StudyMaterial } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'user-matteo-1',
  name: 'Matteo Llanora',
  email: 'matteollanora@gmail.com',
  avatar: 'M',
  school: 'Polytechnic University of the Philippines',
  bio: 'Computer Science student • Preparing for Midterm Exams 📚',
  role: 'student',
  totalPoints: 100,
  coins: 100,
  settings: {
    notifications: true,
    challengeAlerts: true,
    studyReminders: true,
    soundEffects: true,
    theme: 'cream',
    reminderConfig: {
      enabled: true,
      time: '19:30',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      goal: 'Daily Quiz Review & Active Recall',
      browserNotifications: false,
      soundEnabled: true,
    },
  },
};

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-is-101',
    title: 'Introduction to Information Systems',
    description: 'Core concepts of information systems, enterprise data, hardware, and business processes.',
    category: 'Computer Science',
    difficulty: 'Easy',
    timesPlayed: 8,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-05',
    studyMaterialId: 'mat-is-101',
    studyMaterialSummary: 'Lecture Notes: 5 Components of IS, MIS, TPS, ERP, Porter’s Five Forces & CIA Triad',
    questions: [
      {
        id: 'is-1',
        type: 'multiple_choice',
        question: 'Which component is NOT one of the five primary components of an Information System?',
        options: ['Hardware', 'Software', 'Competitor Strategy', 'Telecommunications'],
        correctAnswer: 'Competitor Strategy',
        explanation: 'The five classic components are Hardware, Software, Data, People, and Process/Telecommunications.',
      },
      {
        id: 'is-2',
        type: 'multiple_choice',
        question: 'What is the primary objective of a Management Information System (MIS)?',
        options: [
          'To provide managers with tools to organize, evaluate, and efficiently manage departments',
          'To replace human executives with automated robots',
          'To purely write low-level assembly code',
          'To eliminate all operational costs immediately',
        ],
        correctAnswer: 'To provide managers with tools to organize, evaluate, and efficiently manage departments',
        explanation: 'MIS focuses on giving managers actionable insights and reports for decision making.',
      },
      {
        id: 'is-3',
        type: 'fill_blank',
        question: 'Raw facts and figures without context are known as ____, whereas organized and meaningful facts become information.',
        options: [],
        correctAnswer: 'Data',
        explanation: 'Data represents unprocessed symbols and facts, which turn into information when contextualized.',
      },
      {
        id: 'is-4',
        type: 'identification',
        question: 'Identify the enterprise software that coordinates business processes across all core functional areas.',
        options: [],
        correctAnswer: 'ERP (Enterprise Resource Planning)',
        explanation: 'ERP systems integrate financial, manufacturing, HR, and supply chain data into a single system.',
      },
      {
        id: 'is-5',
        type: 'scrambled_word',
        question: 'Unscramble the crucial computing unit that executes instructions: [ U C P ]',
        options: [],
        correctAnswer: 'CPU',
        explanation: 'The Central Processing Unit (CPU) is the electronic circuitry that executes software instructions.',
        scrambledClue: 'Central Processing Unit',
      },
      {
        id: 'is-6',
        type: 'multiple_choice',
        question: 'Which of the following describes Cloud Computing?',
        options: [
          'On-demand delivery of IT resources over the Internet with pay-as-you-go pricing',
          'Running servers in an airplane cargo hold',
          'A proprietary wired connection between two office computers',
          'Manual paper archiving stored in waterproof vaults',
        ],
        correctAnswer: 'On-demand delivery of IT resources over the Internet with pay-as-you-go pricing',
        explanation: 'Cloud computing allows organizations to rent computing resources and storage remotely.',
      },
      {
        id: 'is-7',
        type: 'multiple_choice',
        question: 'What does TPS stand for in information systems hierarchy?',
        options: ['Transaction Processing System', 'Technical Procedure System', 'Total Performance Standard', 'Tactical Planning System'],
        correctAnswer: 'Transaction Processing System',
        explanation: 'TPS systems capture and process daily routine transactions such as order processing and payroll.',
      },
      {
        id: 'is-8',
        type: 'fill_blank',
        question: 'A ____ is an interconnected group of computers that can share resources and communicate.',
        options: [],
        correctAnswer: 'Network',
        explanation: 'A computer network connects multiple devices to share data, files, and internet bandwidth.',
      },
      {
        id: 'is-9',
        type: 'identification',
        question: 'Identify the competitive forces model developed by Harvard Business School professor Michael Porter.',
        options: [],
        correctAnswer: "Porter's Five Forces",
        explanation: "Porter's Five Forces framework analyzes an industry's competitive intensity and attractiveness.",
      },
      {
        id: 'is-10',
        type: 'multiple_choice',
        question: 'Why is cybersecurity critical in modern information systems?',
        options: [
          'To protect confidentiality, integrity, and availability of sensitive assets',
          'To make the computer monitor brighter',
          'To increase physical keyboard typing speed',
          'To ensure hardware is painted in brand colors',
        ],
        correctAnswer: 'To protect confidentiality, integrity, and availability of sensitive assets',
        explanation: 'The CIA triad (Confidentiality, Integrity, Availability) represents the foundational pillars of cybersecurity.',
      },
    ],
  },
  {
    id: 'quiz-db-202',
    title: 'Database Fundamentals',
    description: 'Relational data models, SQL queries, normalization, keys, and indexing principles.',
    category: 'Computer Science',
    difficulty: 'Medium',
    timesPlayed: 14,
    createdAt: '2026-11-02',
    updatedAt: '2026-11-06',
    studyMaterialId: 'mat-db-202',
    studyMaterialSummary: 'Study Guide: Primary/Foreign Keys, SQL Joins, 1NF-3NF Normalization, ACID & Indexes',
    questions: [
      {
        id: 'db-1',
        type: 'multiple_choice',
        question: 'Which of the following best describes a primary key in a database?',
        options: [
          'A unique identifier for each record in a table',
          'A field that stores images and multimedia files',
          'A duplicate value in every row',
          'A backup copy of the database schema',
        ],
        correctAnswer: 'A unique identifier for each record in a table',
        explanation: 'A primary key enforces entity integrity by ensuring every record has an immutable, unique value.',
      },
      {
        id: 'db-2',
        type: 'multiple_choice',
        question: 'Which SQL clause is used to filter records that satisfy a specific condition?',
        options: ['WHERE', 'ORDER BY', 'GROUP BY', 'DISTINCT'],
        correctAnswer: 'WHERE',
        explanation: 'The WHERE clause filters rows before aggregation or grouping.',
      },
      {
        id: 'db-3',
        type: 'fill_blank',
        question: 'A ____ key in a table refers to the primary key of another table, establishing a relationship between them.',
        options: [],
        correctAnswer: 'Foreign',
        explanation: 'A foreign key maintains referential integrity between related relational tables.',
      },
      {
        id: 'db-4',
        type: 'identification',
        question: 'Identify the database normalization stage that removes transitive dependencies.',
        options: [],
        correctAnswer: 'Third Normal Form (3NF)',
        explanation: '3NF requires that the table is in 2NF and has no non-key column dependent on another non-key column.',
      },
      {
        id: 'db-5',
        type: 'multiple_choice',
        question: 'What does ACID stand for in database transaction management?',
        options: [
          'Atomicity, Consistency, Isolation, Durability',
          'Automated, Concurrent, Indexed, Distributed',
          'Access, Control, Integrity, Data',
          'Array, Column, Index, Directory',
        ],
        correctAnswer: 'Atomicity, Consistency, Isolation, Durability',
        explanation: 'ACID guarantees that database transactions are processed reliably.',
      },
      {
        id: 'db-6',
        type: 'scrambled_word',
        question: 'Unscramble the standard query language used for relational databases: [ L Q S ]',
        options: [],
        correctAnswer: 'SQL',
        explanation: 'Structured Query Language (SQL) is the standard language for querying and updating RDBMS.',
        scrambledClue: 'Structured Query Language',
      },
      {
        id: 'db-7',
        type: 'multiple_choice',
        question: 'Which JOIN operation returns all rows from the left table, and matched rows from the right table?',
        options: ['LEFT JOIN', 'INNER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'],
        correctAnswer: 'LEFT JOIN',
        explanation: 'LEFT JOIN (or LEFT OUTER JOIN) preserves all rows from the first (left) table even if no match is found.',
      },
      {
        id: 'db-8',
        type: 'fill_blank',
        question: 'An ____ is a data structure that improves the speed of data retrieval operations on a database table.',
        options: [],
        correctAnswer: 'Index',
        explanation: 'Indexes (such as B-trees) provide quick lookups, avoiding full table scans.',
      },
    ],
  },
  {
    id: 'quiz-hci-303',
    title: 'Human-Computer Interaction',
    description: 'Usability heuristics, user-centered design, cognitive load, affordances, and interaction principles.',
    category: 'Design & UX',
    difficulty: 'Medium',
    timesPlayed: 6,
    createdAt: '2026-11-03',
    updatedAt: '2026-11-04',
    studyMaterialId: 'mat-hci-303',
    studyMaterialSummary: 'Summary Sheet: Affordances, Nielsen’s Heuristics, Fitts’s Law, Hick’s Law & Cognitive Load',
    questions: [
      {
        id: 'hci-1',
        type: 'multiple_choice',
        question: 'What is an "affordance" according to Don Norman in The Design of Everyday Things?',
        options: [
          'The perceived and actual properties of a thing that determine how it could be used',
          'The financial cost required to produce a product interface',
          'A decorative animation that plays during loading',
          'The maximum battery life of a portable touchscreen device',
        ],
        correctAnswer: 'The perceived and actual properties of a thing that determine how it could be used',
        explanation: 'Affordances clue the user into how an object operates (e.g., buttons afford clicking or pushing).',
      },
      {
        id: 'hci-2',
        type: 'multiple_choice',
        question: "Which of Jakob Nielsen's 10 Usability Heuristics states that users should always be informed about what is going on?",
        options: [
          'Visibility of system status',
          'Match between system and real world',
          'Aesthetic and minimalist design',
          'Flexibility and efficiency of use',
        ],
        correctAnswer: 'Visibility of system status',
        explanation: 'The system should always keep users informed about what is happening through appropriate feedback within a reasonable time.',
      },
      {
        id: 'hci-3',
        type: 'fill_blank',
        question: "____ Law states that the time required to rapidly move to a target area is a function of the ratio between the distance to the target and the width of the target.",
        options: [],
        correctAnswer: "Fitts's",
        explanation: "Fitts's Law explains why larger and closer buttons are easier and faster to tap or click.",
      },
      {
        id: 'hci-4',
        type: 'identification',
        question: 'Identify the law in psychology stating that the time it takes to make a decision increases logarithmically with the number and complexity of choices.',
        options: [],
        correctAnswer: "Hick's Law",
        explanation: "Hick's Law highlights the importance of minimizing menu clutter to reduce cognitive friction.",
      },
      {
        id: 'hci-5',
        type: 'scrambled_word',
        question: 'Unscramble the term representing the cognitive effort required to use a computer interface: [ A D L O ]',
        options: [],
        correctAnswer: 'LOAD',
        explanation: 'Cognitive load refers to the amount of mental processing power required to operate an interface.',
        scrambledClue: 'Mental effort in UX',
      },
    ],
  },
];

export const INITIAL_STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat-is-101',
    quizId: 'quiz-is-101',
    title: 'Introduction to Information Systems — Lecture Notes',
    sourceType: 'notes',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-05',
    textContent: `1. Five Primary Components of an Information System
- Hardware: Physical devices such as CPUs, servers, and networking gear.
- Software: Applications and operating systems that process instructions.
- Data: Raw facts and figures without context; becomes Information once organized and meaningful.
- People: Users, analysts, and managers who operate and benefit from the system.
- Process & Telecommunications: Workflows and interconnected networks enabling communication.

2. Enterprise Information Systems
- TPS (Transaction Processing System): Captures daily routine operations such as payroll and order processing.
- MIS (Management Information System): Provides managers with tools to organize, evaluate, and manage departments efficiently.
- ERP (Enterprise Resource Planning): Coordinates financial, manufacturing, HR, and supply chain processes in one unified platform.

3. Strategy, Cloud & Security
- Cloud Computing: On-demand delivery of IT resources over the Internet with pay-as-you-go pricing.
- Porter's Five Forces: Framework developed by Michael Porter to analyze industry competitive intensity.
- Cybersecurity CIA Triad: Protects Confidentiality, Integrity, and Availability of sensitive assets.`,
  },
  {
    id: 'mat-db-202',
    quizId: 'quiz-db-202',
    title: 'Database Fundamentals — Midterm Study Guide',
    sourceType: 'notes',
    createdAt: '2026-11-02',
    updatedAt: '2026-11-06',
    textContent: `1. Relational Keys & Integrity
- Primary Key: Uniquely identifies each record in a relational table (entity integrity).
- Foreign Key: References the primary key of another table to maintain referential integrity.

2. SQL & Querying
- SQL (Structured Query Language): Standard language for querying and managing relational databases.
- WHERE Clause: Filters records that match specific criteria before grouping.
- LEFT JOIN: Returns all rows from the left table and matched rows from the right table.
- Indexes: B-tree structures that accelerate data retrieval operations at a small write overhead.

3. Normalization & Transactions
- 1NF: Ensures atomic column values and removes repeating groups.
- 2NF: Eliminates partial dependencies on composite primary keys.
- 3NF (Third Normal Form): Removes transitive dependencies between non-key attributes.
- ACID Properties: Atomicity, Consistency, Isolation, and Durability guarantee reliable database transactions.`,
  },
  {
    id: 'mat-hci-303',
    quizId: 'quiz-hci-303',
    title: 'Human-Computer Interaction — Core Principles',
    sourceType: 'notes',
    createdAt: '2026-11-03',
    updatedAt: '2026-11-04',
    textContent: `1. Affordances & Mental Models
- Affordance (Don Norman): Perceived and actual properties of an object that suggest how it can be used (e.g., buttons afford tapping or clicking).
- Cognitive Load: The mental processing effort required for a user to learn and operate an interface.

2. Usability Heuristics & Quantitative Laws
- Visibility of System Status (Jakob Nielsen): Keep users informed about what is happening with timely, clear feedback.
- Fitts's Law: Movement time to a target depends on distance to the target and the width of the target—larger, closer targets are faster to hit.
- Hick's Law: Decision time increases logarithmically with the number and complexity of available choices.`,
  },
];

export const INITIAL_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'act-1',
    quizId: 'quiz-is-101',
    quizTitle: 'Introduction to Information Systems',
    date: '2026-11-06 at 9:15 AM',
    timestamp: Date.now() - 3600000 * 2,
    score: 40,
    maxScore: 50,
    coinsEarned: 40,
    correctCount: 8,
    totalQuestions: 10,
    accuracy: 80,
    type: 'challenge',
    opponentCount: 3,
    rank: 1,
    leaderboard: [
      { id: 'p-1', name: 'Matteo Llanora', avatar: 'M', score: 40, coins: 40, correctAnswers: 8, totalQuestions: 10, accuracy: 80, completed: true },
      { id: 'p-2', name: 'Sarah K.', avatar: 'S', score: 35, coins: 35, correctAnswers: 7, totalQuestions: 10, accuracy: 70, completed: true },
      { id: 'p-3', name: 'Liam M.', avatar: 'L', score: 30, coins: 30, correctAnswers: 6, totalQuestions: 10, accuracy: 60, completed: true },
    ],
  },
  {
    id: 'act-2',
    quizId: 'quiz-db-202',
    quizTitle: 'Database Fundamentals',
    date: '2026-11-05 at 4:30 PM',
    timestamp: Date.now() - 86400000,
    score: 35,
    maxScore: 40,
    coinsEarned: 35,
    correctCount: 7,
    totalQuestions: 8,
    accuracy: 88,
    type: 'solo',
  },
  {
    id: 'act-3',
    quizId: 'quiz-hci-303',
    quizTitle: 'Human-Computer Interaction',
    date: '2026-11-04 at 8:00 PM',
    timestamp: Date.now() - 86400000 * 2,
    score: 25,
    maxScore: 25,
    coinsEarned: 25,
    correctCount: 5,
    totalQuestions: 5,
    accuracy: 100,
    type: 'challenge',
    opponentCount: 2,
    rank: 1,
    leaderboard: [
      { id: 'p-1', name: 'Matteo Llanora', avatar: 'M', score: 25, coins: 25, correctAnswers: 5, totalQuestions: 5, accuracy: 100, completed: true },
      { id: 'p-4', name: 'David P.', avatar: 'D', score: 20, coins: 20, correctAnswers: 4, totalQuestions: 5, accuracy: 80, completed: true },
    ],
  },
];
