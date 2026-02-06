/**
 * Database Seeding Script
 * Creates dummy data for testing the Interview Tracker application
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data (in reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.completedTopic.deleteMany();
    await prisma.leetCodeConnection.deleteMany();
    await prisma.userPreferences.deleteMany();
    await prisma.userProgress.deleteMany();
    await prisma.question.deleteMany();
    await prisma.sprint.deleteMany();
    await prisma.interviewRound.deleteMany();
    await prisma.application.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Cleaned existing data\n');

    // Create Users
    console.log('👤 Creating users...');
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    const user1 = await prisma.user.create({
        data: {
            email: 'john.doe@example.com',
            passwordHash,
            name: 'John Doe',
            targetRole: 'Senior Software Engineer',
            experienceLevel: 'Mid',
            progress: {
                create: {
                    currentStreak: 7,
                    longestStreak: 15,
                    lastActiveDate: new Date(),
                    totalTasksCompleted: 42,
                },
            },
            preferences: {
                create: {
                    theme: 'dark',
                    studyRemindersEnabled: true,
                    calendarAutoSyncEnabled: false,
                    leetcodeAutoSyncEnabled: true,
                },
            },
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'jane.smith@example.com',
            passwordHash,
            name: 'Jane Smith',
            targetRole: 'Full Stack Developer',
            experienceLevel: 'Senior',
            progress: {
                create: {
                    currentStreak: 3,
                    longestStreak: 10,
                    lastActiveDate: new Date(),
                    totalTasksCompleted: 28,
                },
            },
            preferences: {
                create: {
                    theme: 'light',
                    studyRemindersEnabled: false,
                    calendarAutoSyncEnabled: true,
                    leetcodeAutoSyncEnabled: false,
                },
            },
        },
    });

    console.log(`✅ Created users: ${user1.email}, ${user2.email}\n`);

    // Create Applications for User 1
    console.log('💼 Creating applications...');

    const app1 = await prisma.application.create({
        data: {
            userId: user1.id,
            company: 'Google',
            role: 'Senior Software Engineer',
            jobDescriptionUrl: 'https://careers.google.com/jobs/12345',
            roleType: 'SDE',
            status: 'interview',
            applicationDate: new Date('2026-01-15'),
            interviewDate: new Date('2026-02-20'),
            currentRound: 'Technical Round 2',
            notes: 'Referred by a friend. Focus on system design and algorithms.',
        },
    });

    const app2 = await prisma.application.create({
        data: {
            userId: user1.id,
            company: 'Microsoft',
            role: 'Software Engineer II',
            jobDescriptionUrl: 'https://careers.microsoft.com/jobs/67890',
            roleType: 'SDE',
            status: 'offer',
            applicationDate: new Date('2026-01-10'),
            interviewDate: new Date('2026-01-25'),
            notes: 'Great interview experience. Team seems very collaborative.',
            offerBaseSalary: 150000,
            offerEquity: '50000 RSUs over 4 years',
            offerBonus: 20000,
            offerCurrency: 'USD',
            offerLocation: 'Seattle, WA',
            offerWorkMode: 'Hybrid',
            offerJoiningDate: new Date('2026-03-15'),
            offerNoticePeriod: '2 weeks',
            offerBenefits: ['Health Insurance', '401k Match', 'Stock Options', 'Gym Membership'],
            offerNotes: 'Excellent benefits package. Flexible work hours.',
            offerTotalCTC: 170000,
        },
    });

    const app3 = await prisma.application.create({
        data: {
            userId: user1.id,
            company: 'Amazon',
            role: 'SDE II',
            roleType: 'SDE',
            status: 'shortlisted',
            applicationDate: new Date('2026-01-20'),
            interviewDate: new Date('2026-02-15'),
            notes: 'Online assessment completed. Waiting for interview schedule.',
        },
    });

    const app4 = await prisma.application.create({
        data: {
            userId: user1.id,
            company: 'Meta',
            role: 'Software Engineer',
            roleType: 'SDE',
            status: 'applied',
            applicationDate: new Date('2026-02-01'),
            notes: 'Applied through company website.',
        },
    });

    const app5 = await prisma.application.create({
        data: {
            userId: user1.id,
            company: 'Netflix',
            role: 'Senior Backend Engineer',
            roleType: 'SDE',
            status: 'rejected',
            applicationDate: new Date('2025-12-15'),
            interviewDate: new Date('2026-01-05'),
            notes: 'Did not pass the coding round. Need to improve on distributed systems.',
        },
    });

    console.log(`✅ Created ${5} applications\n`);

    // Create Interview Rounds
    console.log('🎯 Creating interview rounds...');

    await prisma.interviewRound.create({
        data: {
            applicationId: app1.id,
            roundNumber: 1,
            roundType: 'technical',
            scheduledDate: new Date('2026-02-10'),
            notes: 'Phone screen with hiring manager. Discussed background and projects.',
            questionsAsked: [
                'Tell me about your experience with distributed systems',
                'Explain a challenging bug you fixed recently',
            ],
            feedbackRating: 4,
            feedbackPros: ['Good communication', 'Strong technical background'],
            feedbackCons: ['Could elaborate more on system design'],
            feedbackStruggledTopics: [],
            feedbackNotes: 'Positive feedback. Moving to next round.',
        },
    });

    await prisma.interviewRound.create({
        data: {
            applicationId: app1.id,
            roundNumber: 2,
            roundType: 'technical',
            scheduledDate: new Date('2026-02-20'),
            notes: 'Coding interview scheduled. Focus on algorithms and data structures.',
            questionsAsked: [],
            feedbackPros: [],
            feedbackCons: [],
            feedbackStruggledTopics: [],
        },
    });

    await prisma.interviewRound.create({
        data: {
            applicationId: app2.id,
            roundNumber: 1,
            roundType: 'technical',
            scheduledDate: new Date('2026-01-20'),
            notes: 'Coding round - solved 2 medium problems',
            questionsAsked: [
                'Implement LRU Cache',
                'Design a rate limiter',
            ],
            feedbackRating: 5,
            feedbackPros: ['Excellent problem solving', 'Clean code', 'Good time complexity analysis'],
            feedbackCons: [],
            feedbackStruggledTopics: [],
            feedbackNotes: 'Strong performance. Recommended for hire.',
        },
    });

    await prisma.interviewRound.create({
        data: {
            applicationId: app2.id,
            roundNumber: 2,
            roundType: 'system-design',
            scheduledDate: new Date('2026-01-25'),
            notes: 'System design round - designed a URL shortener',
            questionsAsked: [
                'Design a URL shortening service like bit.ly',
            ],
            feedbackRating: 5,
            feedbackPros: ['Excellent system design skills', 'Considered scalability', 'Good trade-off analysis'],
            feedbackCons: [],
            feedbackStruggledTopics: [],
            feedbackNotes: 'Outstanding performance. Strong hire.',
        },
    });

    console.log(`✅ Created interview rounds\n`);

    // Create Questions
    console.log('❓ Creating questions...');

    await prisma.question.createMany({
        data: [
            {
                userId: user1.id,
                applicationId: app1.id,
                questionText: 'Implement a thread-safe LRU Cache with O(1) operations',
                category: 'DSA',
                difficulty: 'Hard',
                askedInRound: 'Round 1: Technical',
            },
            {
                userId: user1.id,
                applicationId: app1.id,
                questionText: 'Design a distributed rate limiter',
                category: 'SystemDesign',
                difficulty: 'Hard',
                askedInRound: 'Round 2: System Design',
            },
            {
                userId: user1.id,
                applicationId: app2.id,
                questionText: 'Tell me about a time you had a conflict with a team member',
                category: 'Behavioral',
                askedInRound: 'Round 1: Behavioral',
            },
            {
                userId: user1.id,
                questionText: 'Reverse a linked list',
                category: 'DSA',
                difficulty: 'Easy',
            },
            {
                userId: user1.id,
                questionText: 'Find the longest palindromic substring',
                category: 'DSA',
                difficulty: 'Medium',
            },
            {
                userId: user1.id,
                questionText: 'Design a parking lot system',
                category: 'SystemDesign',
                difficulty: 'Medium',
            },
            {
                userId: user1.id,
                questionText: 'Write a SQL query to find the second highest salary',
                category: 'SQL',
                difficulty: 'Medium',
            },
            {
                userId: user1.id,
                questionText: 'Describe your leadership style',
                category: 'Behavioral',
            },
        ],
    });

    console.log(`✅ Created questions\n`);

    // Create Sprints
    console.log('🏃 Creating sprints...');

    await prisma.sprint.create({
        data: {
            userId: user1.id,
            applicationId: app1.id,
            interviewDate: new Date('2026-02-20'),
            roleType: 'SDE',
            totalDays: 14,
            status: 'active',
            dailyPlans: {
                days: [
                    {
                        day: 1,
                        date: '2026-02-06',
                        topics: ['Arrays', 'Strings'],
                        problems: 5,
                        completed: 3,
                    },
                    {
                        day: 2,
                        date: '2026-02-07',
                        topics: ['Linked Lists', 'Stacks'],
                        problems: 5,
                        completed: 0,
                    },
                    {
                        day: 3,
                        date: '2026-02-08',
                        topics: ['Trees', 'Binary Search'],
                        problems: 5,
                        completed: 0,
                    },
                ],
            },
        },
    });

    await prisma.sprint.create({
        data: {
            userId: user1.id,
            applicationId: app3.id,
            interviewDate: new Date('2026-02-15'),
            roleType: 'SDE',
            totalDays: 10,
            status: 'active',
            dailyPlans: {
                days: [
                    {
                        day: 1,
                        date: '2026-02-05',
                        topics: ['System Design Basics'],
                        problems: 2,
                        completed: 2,
                    },
                    {
                        day: 2,
                        date: '2026-02-06',
                        topics: ['Scalability Patterns'],
                        problems: 2,
                        completed: 1,
                    },
                ],
            },
        },
    });

    console.log(`✅ Created sprints\n`);

    // Create Completed Topics
    console.log('✅ Creating completed topics...');

    await prisma.completedTopic.createMany({
        data: [
            {
                userId: user1.id,
                topicName: 'arrays',
                displayName: 'Arrays',
                source: 'chat',
            },
            {
                userId: user1.id,
                topicName: 'linked-lists',
                displayName: 'Linked Lists',
                source: 'manual',
            },
            {
                userId: user1.id,
                topicName: 'binary-search',
                displayName: 'Binary Search',
                source: 'chat',
            },
            {
                userId: user1.id,
                topicName: 'dynamic-programming',
                displayName: 'Dynamic Programming',
                source: 'manual',
            },
        ],
    });

    console.log(`✅ Created completed topics\n`);

    // Create LeetCode Connection
    console.log('🔗 Creating LeetCode connection...');

    await prisma.leetCodeConnection.create({
        data: {
            userId: user1.id,
            username: 'johndoe_leetcode',
            connectedAt: new Date('2026-01-01'),
            lastSyncAt: new Date(),
            readOnly: true,
            currentStreak: 7,
            longestStreak: 15,
            lastActiveDate: new Date(),
            totalSolved: 250,
            easySolved: 100,
            mediumSolved: 120,
            hardSolved: 30,
        },
    });

    console.log(`✅ Created LeetCode connection\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users: 2`);
    console.log(`   - Applications: 5`);
    console.log(`   - Interview Rounds: 4`);
    console.log(`   - Questions: 8`);
    console.log(`   - Sprints: 2`);
    console.log(`   - Completed Topics: 4`);
    console.log(`   - LeetCode Connections: 1`);
    console.log('\n✅ You can now login with:');
    console.log('   Email: john.doe@example.com');
    console.log('   Password: TestPassword123!');
    console.log('\n   OR');
    console.log('\n   Email: jane.smith@example.com');
    console.log('   Password: TestPassword123!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
