/**
 * Static prep templates for 10 job roles
 * Contains first-round specific prep content, HR templates, and key topics
 */

import { RoleType, InterviewRoundType } from '@/types';

export interface PrepTemplate {
    roleType: RoleType;
    displayName: string;
    description: string;
    rounds: RoundPrepContent[];
}

export interface RoundPrepContent {
    round: InterviewRoundType;
    displayName: string;
    focusAreas: string[];
    keyTopics: PrepTopic[];
    commonQuestions: string[];
    timeAllocation: string;
    tips: string[];
}

export interface PrepTopic {
    name: string;
    subtopics: string[];
    priority: 'high' | 'medium' | 'low';
}

// HR Round Template - Common across all roles
const HR_ROUND_TEMPLATE: RoundPrepContent = {
    round: 'HR',
    displayName: 'HR / Behavioral Round',
    focusAreas: ['STAR Method', 'Company Research', 'Cultural Fit'],
    keyTopics: [
        {
            name: 'STAR Method',
            subtopics: [
                'Situation: Set the context',
                'Task: Describe your responsibility',
                'Action: Explain what you did',
                'Result: Share the outcome with metrics'
            ],
            priority: 'high'
        },
        {
            name: 'Common Behavioral Themes',
            subtopics: [
                'Leadership & Initiative',
                'Conflict Resolution',
                'Teamwork & Collaboration',
                'Handling Failure',
                'Time Management & Prioritization'
            ],
            priority: 'high'
        },
        {
            name: 'Company Research',
            subtopics: [
                'Company mission & values',
                'Recent news & achievements',
                'Products & services',
                'Company culture'
            ],
            priority: 'medium'
        }
    ],
    commonQuestions: [
        'Tell me about yourself',
        'Why do you want to work here?',
        'Tell me about a challenging project you worked on',
        'Describe a time you had a conflict with a teammate',
        'What is your biggest strength/weakness?',
        'Where do you see yourself in 5 years?',
        'Why are you leaving your current job?',
        'Tell me about a time you failed and what you learned'
    ],
    timeAllocation: '30-45 min prep, practice with a friend',
    tips: [
        'Prepare 5-6 STAR stories that can be adapted to different questions',
        'Research the company thoroughly - know their products, values, recent news',
        'Practice answering out loud, not just in your head',
        'Have 2-3 thoughtful questions ready for the interviewer',
        'Be genuine - authenticity matters more than perfect answers'
    ]
};

// ============================================
// ROLE-SPECIFIC TEMPLATES
// ============================================

export const PREP_TEMPLATES: PrepTemplate[] = [
    // 1. SDE (Software Development Engineer)
    {
        roleType: 'SDE',
        displayName: 'Software Development Engineer',
        description: 'General software engineering role focusing on DSA and system design',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (DSA/Coding)',
                focusAreas: ['Data Structures', 'Algorithms', 'Problem Solving', 'Code Quality'],
                keyTopics: [
                    {
                        name: 'Arrays & Strings',
                        subtopics: ['Two Pointers', 'Sliding Window', 'Prefix Sum', 'String Manipulation'],
                        priority: 'high'
                    },
                    {
                        name: 'Trees & Graphs',
                        subtopics: ['BFS/DFS Traversal', 'Binary Search Trees', 'Graph Algorithms', 'Tree Problems'],
                        priority: 'high'
                    },
                    {
                        name: 'Dynamic Programming',
                        subtopics: ['1D DP', '2D DP', 'Memoization', 'Tabulation'],
                        priority: 'high'
                    },
                    {
                        name: 'Hash Maps & Sets',
                        subtopics: ['Frequency Counting', 'Two Sum Pattern', 'Caching'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Two Sum, Three Sum variations',
                    'Merge Intervals',
                    'LRU Cache implementation',
                    'Binary Tree Level Order Traversal',
                    'Longest Substring Without Repeating Characters',
                    'Valid Parentheses',
                    'Course Schedule (Topological Sort)'
                ],
                timeAllocation: '2-3 hours daily, 45-60 min per problem',
                tips: [
                    'Always clarify requirements before coding',
                    'Think out loud - explain your approach',
                    'Start with brute force, then optimize',
                    'Test with edge cases (empty, single element, large input)',
                    'Practice writing clean, readable code'
                ]
            },
            {
                round: 'SystemDesign',
                displayName: 'System Design Round',
                focusAreas: ['Scalability', 'Distributed Systems', 'Database Design', 'Trade-offs'],
                keyTopics: [
                    {
                        name: 'Fundamentals',
                        subtopics: ['Load Balancing', 'Caching (Redis, CDN)', 'Database Sharding', 'CAP Theorem'],
                        priority: 'high'
                    },
                    {
                        name: 'Common Systems',
                        subtopics: ['URL Shortener', 'Rate Limiter', 'Chat System', 'News Feed'],
                        priority: 'high'
                    },
                    {
                        name: 'Data Storage',
                        subtopics: ['SQL vs NoSQL', 'Indexing', 'Replication', 'Partitioning'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Design a URL shortener',
                    'Design Twitter/Instagram feed',
                    'Design a rate limiter',
                    'Design a notification system',
                    'Design a file storage system like Dropbox'
                ],
                timeAllocation: '1-2 hours daily on one system design problem',
                tips: [
                    'Start with requirements and constraints',
                    'Draw diagrams and components',
                    'Discuss trade-offs for every decision',
                    'Estimate scale: QPS, storage, bandwidth',
                    'Think about failure scenarios'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 2. SDET (Software Development Engineer in Test)
    {
        roleType: 'SDET',
        displayName: 'Software Development Engineer in Test',
        description: 'Testing and automation focused role with coding skills',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Testing + Coding)',
                focusAreas: ['Test Strategy', 'Automation', 'Bug Analysis', 'Coding'],
                keyTopics: [
                    {
                        name: 'Test Case Design',
                        subtopics: ['Boundary Value Analysis', 'Equivalence Partitioning', 'Decision Tables', 'Edge Cases'],
                        priority: 'high'
                    },
                    {
                        name: 'Automation Frameworks',
                        subtopics: ['Selenium WebDriver', 'TestNG/JUnit', 'Page Object Model', 'API Testing (RestAssured)'],
                        priority: 'high'
                    },
                    {
                        name: 'Testing Types',
                        subtopics: ['Unit Testing', 'Integration Testing', 'E2E Testing', 'Performance Testing'],
                        priority: 'high'
                    },
                    {
                        name: 'DSA Basics',
                        subtopics: ['Arrays', 'Strings', 'Basic Algorithms', 'Time Complexity'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'How would you test a login page?',
                    'Write test cases for an elevator system',
                    'Explain your automation framework architecture',
                    'How do you handle flaky tests?',
                    'Write a function to validate email addresses',
                    'How would you test an API endpoint?',
                    'Explain CI/CD integration for tests'
                ],
                timeAllocation: '2 hours daily, split between testing concepts and coding',
                tips: [
                    'Think about edge cases and negative scenarios',
                    'Know your automation framework inside out',
                    'Practice writing clean, maintainable test code',
                    'Understand the testing pyramid',
                    'Be ready to discuss test strategy for any feature'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 3. ML Engineer
    {
        roleType: 'ML',
        displayName: 'Machine Learning Engineer',
        description: 'ML/AI focused role combining software engineering with machine learning',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (ML Fundamentals + Coding)',
                focusAreas: ['ML Algorithms', 'Math/Statistics', 'Coding', 'Model Evaluation'],
                keyTopics: [
                    {
                        name: 'ML Algorithms',
                        subtopics: ['Linear/Logistic Regression', 'Decision Trees/Random Forests', 'Neural Networks', 'SVMs'],
                        priority: 'high'
                    },
                    {
                        name: 'Deep Learning',
                        subtopics: ['CNNs', 'RNNs/LSTMs', 'Transformers', 'Attention Mechanism'],
                        priority: 'high'
                    },
                    {
                        name: 'Statistics & Math',
                        subtopics: ['Probability', 'Bayes Theorem', 'Linear Algebra', 'Gradient Descent'],
                        priority: 'high'
                    },
                    {
                        name: 'ML Engineering',
                        subtopics: ['Feature Engineering', 'Model Training', 'Hyperparameter Tuning', 'MLOps basics'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Explain bias-variance tradeoff',
                    'How would you handle imbalanced datasets?',
                    'Explain backpropagation',
                    'What evaluation metrics would you use for classification?',
                    'How would you deploy an ML model?',
                    'Explain overfitting and how to prevent it',
                    'Code a simple neural network from scratch'
                ],
                timeAllocation: '3 hours daily, split between ML theory and coding',
                tips: [
                    'Know the math behind common algorithms',
                    'Be ready to code ML algorithms from scratch',
                    'Practice explaining complex concepts simply',
                    'Have projects ready to discuss in detail',
                    'Understand end-to-end ML pipeline'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 4. DevOps Engineer
    {
        roleType: 'DevOps',
        displayName: 'DevOps Engineer',
        description: 'Infrastructure, CI/CD, and cloud operations focused role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (DevOps + Scripting)',
                focusAreas: ['CI/CD', 'Cloud Platforms', 'Containers', 'Infrastructure as Code'],
                keyTopics: [
                    {
                        name: 'CI/CD',
                        subtopics: ['Jenkins/GitHub Actions', 'Pipeline Design', 'Deployment Strategies', 'Artifact Management'],
                        priority: 'high'
                    },
                    {
                        name: 'Containers & Orchestration',
                        subtopics: ['Docker', 'Kubernetes', 'Container Networking', 'Helm Charts'],
                        priority: 'high'
                    },
                    {
                        name: 'Cloud Platforms',
                        subtopics: ['AWS/GCP/Azure basics', 'IAM', 'VPC & Networking', 'Serverless'],
                        priority: 'high'
                    },
                    {
                        name: 'IaC & Automation',
                        subtopics: ['Terraform', 'Ansible', 'Shell Scripting', 'Python Automation'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Design a CI/CD pipeline for a microservices app',
                    'How would you handle a production incident?',
                    'Explain Kubernetes architecture',
                    'How do you ensure infrastructure security?',
                    'Write a script to automate deployment',
                    'Explain blue-green vs canary deployments',
                    'How do you monitor and alert on system health?'
                ],
                timeAllocation: '2-3 hours daily on hands-on practice',
                tips: [
                    'Have hands-on experience with your tools',
                    'Know troubleshooting commands by heart',
                    'Understand networking fundamentals',
                    'Be ready to whiteboard architecture',
                    'Practice scripting (Bash, Python)'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 5. Frontend Engineer
    {
        roleType: 'Frontend',
        displayName: 'Frontend Engineer',
        description: 'UI/UX focused web development role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Frontend + JavaScript)',
                focusAreas: ['JavaScript', 'React/Vue/Angular', 'CSS', 'Web Performance'],
                keyTopics: [
                    {
                        name: 'JavaScript Fundamentals',
                        subtopics: ['Closures', 'Promises/Async-Await', 'Event Loop', 'Prototypes'],
                        priority: 'high'
                    },
                    {
                        name: 'React/Framework',
                        subtopics: ['Component Lifecycle', 'State Management', 'Hooks', 'Virtual DOM'],
                        priority: 'high'
                    },
                    {
                        name: 'CSS & Layout',
                        subtopics: ['Flexbox/Grid', 'Responsive Design', 'CSS-in-JS', 'Animations'],
                        priority: 'high'
                    },
                    {
                        name: 'Web Performance',
                        subtopics: ['Lazy Loading', 'Bundle Optimization', 'Core Web Vitals', 'Caching'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Explain the event loop in JavaScript',
                    'Build a debounce/throttle function',
                    'How does React reconciliation work?',
                    'Implement infinite scroll component',
                    'Explain CSS specificity',
                    'How would you optimize a slow webpage?',
                    'Build a modal component from scratch'
                ],
                timeAllocation: '2-3 hours daily, mix of theory and coding',
                tips: [
                    'Know JavaScript fundamentals deeply',
                    'Practice building components from scratch',
                    'Understand browser rendering pipeline',
                    'Be ready for live coding challenges',
                    'Have a portfolio of projects to discuss'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 6. Backend Engineer
    {
        roleType: 'Backend',
        displayName: 'Backend Engineer',
        description: 'Server-side development, APIs, and database focused role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Backend + DSA)',
                focusAreas: ['API Design', 'Databases', 'System Architecture', 'DSA'],
                keyTopics: [
                    {
                        name: 'API Design',
                        subtopics: ['REST principles', 'GraphQL', 'Authentication/Authorization', 'Rate Limiting'],
                        priority: 'high'
                    },
                    {
                        name: 'Databases',
                        subtopics: ['SQL Queries', 'Indexing', 'Transactions', 'NoSQL patterns'],
                        priority: 'high'
                    },
                    {
                        name: 'DSA',
                        subtopics: ['Arrays/Strings', 'Trees/Graphs', 'Hash Maps', 'Time Complexity'],
                        priority: 'high'
                    },
                    {
                        name: 'Architecture',
                        subtopics: ['Microservices', 'Message Queues', 'Caching', 'Load Balancing'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Design a REST API for a social media app',
                    'How would you optimize a slow database query?',
                    'Explain SQL vs NoSQL trade-offs',
                    'Implement LRU Cache',
                    'How do you handle concurrent requests?',
                    'Design a notification service',
                    'Explain database transactions and ACID'
                ],
                timeAllocation: '2-3 hours daily, DSA + system design',
                tips: [
                    'Know SQL deeply - joins, indexes, explain plans',
                    'Understand concurrency and thread safety',
                    'Practice API design exercises',
                    'Be ready to discuss scaling strategies',
                    'Know your language runtime well (JVM, Node, etc.)'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 7. Full Stack Engineer
    {
        roleType: 'FullStack',
        displayName: 'Full Stack Engineer',
        description: 'End-to-end development covering frontend and backend',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Full Stack Coding)',
                focusAreas: ['JavaScript/TypeScript', 'React + Node', 'Databases', 'API Integration'],
                keyTopics: [
                    {
                        name: 'Frontend',
                        subtopics: ['React Hooks', 'State Management', 'Component Design', 'CSS Frameworks'],
                        priority: 'high'
                    },
                    {
                        name: 'Backend',
                        subtopics: ['Node.js/Express', 'REST APIs', 'Authentication', 'ORMs'],
                        priority: 'high'
                    },
                    {
                        name: 'Databases',
                        subtopics: ['SQL Basics', 'MongoDB', 'Data Modeling', 'Migrations'],
                        priority: 'high'
                    },
                    {
                        name: 'DSA Basics',
                        subtopics: ['Arrays', 'Strings', 'Objects/Maps', 'Basic Algorithms'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Build a todo app with CRUD operations',
                    'Explain the request-response cycle',
                    'How would you handle authentication?',
                    'Optimize a slow React component',
                    'Design a database schema for an e-commerce app',
                    'Explain how you would deploy this app',
                    'Build a real-time chat feature'
                ],
                timeAllocation: '2-3 hours daily, alternating frontend and backend',
                tips: [
                    'Have a full-stack project to walk through',
                    'Know both sides reasonably well',
                    'Understand how frontend and backend communicate',
                    'Be ready to debug across the stack',
                    'Practice building features end-to-end'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 8. Data Engineer
    {
        roleType: 'Data',
        displayName: 'Data Engineer',
        description: 'Data pipelines, ETL, and big data infrastructure focused role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Data Engineering)',
                focusAreas: ['SQL', 'Data Pipelines', 'Big Data', 'Python/Scala'],
                keyTopics: [
                    {
                        name: 'SQL',
                        subtopics: ['Complex Queries', 'Window Functions', 'CTEs', 'Query Optimization'],
                        priority: 'high'
                    },
                    {
                        name: 'Data Pipelines',
                        subtopics: ['ETL/ELT', 'Apache Airflow', 'Data Modeling', 'Data Quality'],
                        priority: 'high'
                    },
                    {
                        name: 'Big Data',
                        subtopics: ['Spark', 'Kafka', 'Hadoop basics', 'Data Warehousing'],
                        priority: 'high'
                    },
                    {
                        name: 'Programming',
                        subtopics: ['Python/PySpark', 'Scala basics', 'SQL coding', 'Scripting'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Write a SQL query with window functions',
                    'Design a data pipeline for event tracking',
                    'Explain star schema vs snowflake schema',
                    'How would you handle late-arriving data?',
                    'Optimize a slow Spark job',
                    'Design a real-time analytics pipeline',
                    'Explain data partitioning strategies'
                ],
                timeAllocation: '2-3 hours daily, heavy focus on SQL',
                tips: [
                    'Master SQL - it\'s the core skill',
                    'Know at least one big data tool well',
                    'Understand data modeling principles',
                    'Be ready to whiteboard pipeline architectures',
                    'Practice optimizing queries and jobs'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 9. Product Manager
    {
        roleType: 'PM',
        displayName: 'Product Manager',
        description: 'Product strategy, user experience, and cross-functional leadership role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Product Round (Product Sense)',
                focusAreas: ['Product Thinking', 'Metrics', 'User Research', 'Prioritization'],
                keyTopics: [
                    {
                        name: 'Product Sense',
                        subtopics: ['User Problems', 'Solution Design', 'Trade-offs', 'MVP Definition'],
                        priority: 'high'
                    },
                    {
                        name: 'Metrics',
                        subtopics: ['North Star Metric', 'KPIs', 'Funnel Analysis', 'A/B Testing'],
                        priority: 'high'
                    },
                    {
                        name: 'Strategy',
                        subtopics: ['Market Analysis', 'Competitive Landscape', 'Go-to-Market', 'Roadmapping'],
                        priority: 'high'
                    },
                    {
                        name: 'Execution',
                        subtopics: ['PRDs', 'Stakeholder Management', 'Sprint Planning', 'Launch Planning'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Design a product for [specific user group]',
                    'How would you improve [existing product]?',
                    'What metrics would you track for [feature]?',
                    'How would you prioritize these features?',
                    'Tell me about a product you launched',
                    'How do you handle disagreements with engineering?',
                    'Design an MVP for [problem statement]'
                ],
                timeAllocation: '2 hours daily, practice case studies',
                tips: [
                    'Use frameworks but don\'t be robotic',
                    'Always start with the user problem',
                    'Practice case studies out loud',
                    'Know your past products deeply',
                    'Be ready to discuss trade-offs'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    },

    // 10. Mobile Engineer
    {
        roleType: 'MobileEngineer',
        displayName: 'Mobile Engineer',
        description: 'iOS/Android or cross-platform mobile development role',
        rounds: [
            {
                round: 'TechnicalRound1',
                displayName: 'Technical Round 1 (Mobile Development)',
                focusAreas: ['Platform Knowledge', 'UI/UX', 'Performance', 'DSA'],
                keyTopics: [
                    {
                        name: 'Platform Fundamentals',
                        subtopics: ['iOS (Swift/UIKit/SwiftUI)', 'Android (Kotlin/Jetpack)', 'React Native/Flutter', 'App Lifecycle'],
                        priority: 'high'
                    },
                    {
                        name: 'Mobile UI',
                        subtopics: ['Layouts', 'Navigation', 'Animations', 'Accessibility'],
                        priority: 'high'
                    },
                    {
                        name: 'Performance',
                        subtopics: ['Memory Management', 'Network Optimization', 'Battery Efficiency', 'App Size'],
                        priority: 'high'
                    },
                    {
                        name: 'DSA',
                        subtopics: ['Arrays/Strings', 'Trees', 'Basic Algorithms', 'Mobile-specific data structures'],
                        priority: 'medium'
                    }
                ],
                commonQuestions: [
                    'Explain the activity/view lifecycle',
                    'How do you handle offline mode?',
                    'Build a list view with infinite scroll',
                    'How would you optimize app startup time?',
                    'Explain memory leaks and how to prevent them',
                    'Design a caching strategy for images',
                    'How do you handle push notifications?'
                ],
                timeAllocation: '2-3 hours daily, platform + DSA',
                tips: [
                    'Know your platform deeply (iOS or Android)',
                    'Understand platform-specific patterns',
                    'Practice building UI components',
                    'Be ready to discuss published apps',
                    'Know the app store guidelines'
                ]
            },
            HR_ROUND_TEMPLATE
        ]
    }
];

// Helper function to get template by role
export function getPrepTemplateByRole(roleType: RoleType): PrepTemplate | undefined {
    return PREP_TEMPLATES.find(t => t.roleType === roleType);
}

// Helper function to get round content
export function getRoundPrepContent(roleType: RoleType, round: InterviewRoundType): RoundPrepContent | undefined {
    const template = getPrepTemplateByRole(roleType);
    if (!template) return undefined;
    return template.rounds.find(r => r.round === round);
}

// Get all available roles for dropdown
export function getAllRoleOptions(): { value: RoleType; label: string }[] {
    return PREP_TEMPLATES.map(t => ({
        value: t.roleType,
        label: t.displayName
    }));
}

// Get available rounds for a role
export function getAvailableRounds(roleType: RoleType): { value: InterviewRoundType; label: string }[] {
    const template = getPrepTemplateByRole(roleType);
    if (!template) return [];
    return template.rounds.map(r => ({
        value: r.round,
        label: r.displayName
    }));
}
