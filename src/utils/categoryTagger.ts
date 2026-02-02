import { QuestionCategory } from '@/types';

export function autoTagCategory(questionText: string): QuestionCategory {
    const lower = questionText.toLowerCase();

    // DSA keywords
    const dsaKeywords = [
        'array', 'string', 'tree', 'graph', 'sort', 'search',
        'linked list', 'stack', 'queue', 'heap', 'hash',
        'binary', 'recursion', 'dynamic programming', 'dp',
        'algorithm', 'leetcode', 'reverse', 'palindrome',
        'two pointer', 'sliding window', 'bfs', 'dfs',
        'merge', 'quick sort', 'insertion', 'bubble'
    ];

    // System Design keywords
    const systemDesignKeywords = [
        'design', 'scale', 'api', 'database', 'cache',
        'load balancer', 'microservice', 'architecture',
        'distributed', 'sharding', 'replication', 'cdn',
        'consistency', 'availability', 'partition',
        'rate limit', 'notification', 'chat', 'feed',
        'url shortener', 'twitter', 'instagram', 'uber'
    ];

    // SQL keywords
    const sqlKeywords = [
        'sql', 'query', 'join', 'index', 'table',
        'select', 'aggregate', 'acid',
        'transaction', 'normalization', 'primary key',
        'foreign key', 'group by', 'having', 'where'
    ];

    // Behavioral keywords
    const behavioralKeywords = [
        'tell me about', 'describe a time', 'situation',
        'conflict', 'challenge', 'mistake', 'feedback',
        'team', 'leadership', 'disagree', 'failure',
        'weakness', 'strength', 'why this company',
        'biggest achievement', 'difficult decision'
    ];

    // Check categories in order of specificity
    if (systemDesignKeywords.some(kw => lower.includes(kw))) {
        return 'SystemDesign';
    }
    if (sqlKeywords.some(kw => lower.includes(kw))) {
        return 'SQL';
    }
    if (behavioralKeywords.some(kw => lower.includes(kw))) {
        return 'Behavioral';
    }
    if (dsaKeywords.some(kw => lower.includes(kw))) {
        return 'DSA';
    }

    return 'Other';
}
