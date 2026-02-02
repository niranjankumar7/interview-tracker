import { Sprint, DailyPlan, Block, Task, RoleType, FocusArea } from '@/types';
import { addDays, differenceInDays, startOfDay } from 'date-fns';

export function generateSprint(
    applicationId: string,
    interviewDate: Date,
    roleType: RoleType
): Sprint {
    const today = startOfDay(new Date());
    const interviewDay = startOfDay(interviewDate);
    const daysRemaining = Math.max(1, differenceInDays(interviewDay, today));

    const dailyPlans = generateDailyPlans(daysRemaining, roleType, today);

    return {
        id: Date.now().toString(),
        applicationId,
        interviewDate: interviewDate.toISOString(),
        roleType,
        totalDays: daysRemaining,
        dailyPlans,
        status: 'active',
        createdAt: new Date().toISOString(),
    };
}

function generateDailyPlans(
    daysRemaining: number,
    roleType: RoleType,
    startDate: Date
): DailyPlan[] {
    const template = getSprintTemplate(roleType, daysRemaining);
    const plans: DailyPlan[] = [];

    for (let i = 0; i < daysRemaining && i < template.length; i++) {
        const dayTemplate = template[i];

        plans.push({
            day: i + 1,
            date: addDays(startDate, i).toISOString(),
            focus: dayTemplate.focus,
            blocks: generateBlocks(dayTemplate.focus, dayTemplate.topics),
            completed: false,
        });
    }

    // Fill remaining days with review if needed
    for (let i = template.length; i < daysRemaining; i++) {
        plans.push({
            day: i + 1,
            date: addDays(startDate, i).toISOString(),
            focus: 'Review',
            blocks: generateBlocks('Review', ['General Review']),
            completed: false,
        });
    }

    return plans;
}

interface DayTemplate {
    focus: FocusArea;
    topics: string[];
}

function getSprintTemplate(roleType: RoleType, days: number): DayTemplate[] {
    if (roleType === 'SDE') {
        if (days >= 7) {
            return [
                { focus: 'DSA', topics: ['Arrays', 'Strings'] },
                { focus: 'DSA', topics: ['Trees', 'Graphs'] },
                { focus: 'DSA', topics: ['Dynamic Programming'] },
                { focus: 'SystemDesign', topics: ['Caching', 'Databases'] },
                { focus: 'SystemDesign', topics: ['Load Balancing', 'APIs'] },
                { focus: 'SystemDesign', topics: ['Scalability'] },
                { focus: 'Review', topics: ['Mock Interviews', 'Company Questions'] },
            ];
        } else if (days >= 3) {
            return [
                { focus: 'DSA', topics: ['Core Patterns'] },
                { focus: 'SystemDesign', topics: ['Key Concepts'] },
                { focus: 'Review', topics: ['Mock + Questions'] },
            ];
        } else {
            return [
                { focus: 'Review', topics: ['Company Questions', 'Quick Revision'] },
            ];
        }
    }

    if (roleType === 'QA') {
        if (days >= 7) {
            return [
                { focus: 'DSA', topics: ['Test Case Design'] },
                { focus: 'DSA', topics: ['Bug Reporting'] },
                { focus: 'SystemDesign', topics: ['Automation Basics'] },
                { focus: 'SystemDesign', topics: ['Selenium', 'API Testing'] },
                { focus: 'SystemDesign', topics: ['Performance Testing'] },
                { focus: 'Behavioral', topics: ['STAR Stories'] },
                { focus: 'Review', topics: ['Mock Scenarios'] },
            ];
        }
        return [
            { focus: 'Review', topics: ['QA Fundamentals'] },
        ];
    }

    if (roleType === 'Data') {
        if (days >= 7) {
            return [
                { focus: 'DSA', topics: ['SQL Queries'] },
                { focus: 'DSA', topics: ['Data Modeling'] },
                { focus: 'DSA', topics: ['Statistics'] },
                { focus: 'SystemDesign', topics: ['Data Pipelines'] },
                { focus: 'SystemDesign', topics: ['ETL Processes'] },
                { focus: 'Behavioral', topics: ['Case Studies'] },
                { focus: 'Review', topics: ['Portfolio Review'] },
            ];
        }
        return [
            { focus: 'Review', topics: ['Data Analysis Basics'] },
        ];
    }

    if (roleType === 'PM') {
        if (days >= 7) {
            return [
                { focus: 'Behavioral', topics: ['Product Sense'] },
                { focus: 'Behavioral', topics: ['Metrics & Analytics'] },
                { focus: 'SystemDesign', topics: ['Product Design'] },
                { focus: 'SystemDesign', topics: ['Technical Understanding'] },
                { focus: 'Behavioral', topics: ['Leadership Stories'] },
                { focus: 'Behavioral', topics: ['Stakeholder Management'] },
                { focus: 'Review', topics: ['Mock PM Interview'] },
            ];
        }
        return [
            { focus: 'Review', topics: ['PM Fundamentals'] },
        ];
    }

    return [{ focus: 'Review', topics: ['General Preparation'] }];
}

function generateBlocks(focus: FocusArea, topics: string[]): Block[] {
    const tasks = generateTasks(focus, topics);
    const midpoint = Math.ceil(tasks.length / 2);

    return [
        {
            id: `morning-${Date.now()}`,
            type: 'morning',
            duration: '60-90 min',
            tasks: tasks.slice(0, midpoint),
            completed: false,
        },
        {
            id: `evening-${Date.now() + 1}`,
            type: 'evening',
            duration: '60-90 min',
            tasks: tasks.slice(midpoint),
            completed: false,
        },
    ];
}

function generateTasks(focus: FocusArea, topics: string[]): Task[] {
    const taskTemplates: Record<FocusArea, string[]> = {
        DSA: [
            `Solve 2 problems on ${topics[0] || 'algorithms'}`,
            `Review pattern: ${topics.join(', ')}`,
            'Practice timed coding (30 min)',
            'Review solutions and optimize',
        ],
        SystemDesign: [
            `Study concept: ${topics.join(', ')}`,
            'Design 1 small system',
            'Watch 1 system design video',
            'Document key trade-offs',
        ],
        Behavioral: [
            'Prepare 2 STAR stories',
            'Practice common behavioral questions',
            'Review company values',
            'Mock behavioral interview (15 min)',
        ],
        Review: [
            'Review weak topics',
            'Go through company question bank',
            'Complete 1 mock interview',
            'Final preparation notes',
        ],
        Mock: [
            'Full mock interview (1 hour)',
            'Review feedback',
            'Practice weak areas',
            'Prepare questions for interviewer',
        ],
    };

    const templates = taskTemplates[focus] || ['General preparation'];

    return templates.map((desc, i) => ({
        id: `task-${Date.now()}-${i}`,
        description: desc,
        completed: false,
        category: topics[0] || 'General',
    }));
}
