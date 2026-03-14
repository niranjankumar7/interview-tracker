/**
 * Demo/Test Script: Round-Specific Smart Prep Feature
 * 
 * This simulates the user flow:
 * 1. User applies to Microsoft for SDE3
 * 2. User gets Round 1 interview call on March 17th
 * 3. User uses Smart Prep to get preparation data
 */

import { getCompanyPrepData } from './src/services/scraper/duckduckgo.ts';

async function runDemo() {
  console.log('🎯 Interview Tracker - Smart Prep Demo\n');
  console.log('=' .repeat(50));
  
  // Step 1: User applies for Microsoft SDE3
  console.log('\n📋 STEP 1: Application Created');
  console.log('-'.repeat(50));
  const application = {
    id: 'app-123',
    company: 'Microsoft',
    role: 'SDE3',
    roleType: 'SDE' as const,
    status: 'shortlisted',
    applicationDate: new Date().toISOString(),
  };
  console.log(`Company: ${application.company}`);
  console.log(`Role: ${application.role}`);
  console.log(`Status: ${application.status}`);
  console.log('✅ Application saved to database\n');

  // Step 2: User gets interview call
  console.log('\n📞 STEP 2: Interview Scheduled');
  console.log('-'.repeat(50));
  const interviewDate = '2026-03-17T10:00:00';
  console.log(`Round: Round 1 (Technical)`);
  console.log(`Date: March 17th, 2026`);
  console.log(`Type: Technical Round 1`);
  console.log('✅ Round added to application\n');

  // Step 3: User opens Smart Prep
  console.log('\n🤖 STEP 3: Smart Prep Panel Opened');
  console.log('-'.repeat(50));
  console.log('User clicks "Smart Prep" button...\n');

  // Step 4: User inputs what they know
  console.log('\n📝 STEP 4: User Provides Information');
  console.log('-'.repeat(50));
  
  const userInput = {
    roundType: 'TechnicalRound1',
    hrNotes: 'HR mentioned this will focus on algorithms and data structures. Some questions may be based on my resume projects.',
    resumeFocus: ['System Design', 'React', 'Node.js', 'Distributed Systems'],
    scheduledDate: interviewDate,
  };

  console.log(`Selected Round: ${userInput.roundType}`);
  console.log(`HR Notes: "${userInput.hrNotes}"`);
  console.log(`Resume Focus: ${userInput.resumeFocus.join(', ')}`);
  console.log(`Scheduled: ${userInput.scheduledDate}\n`);

  // Step 5: System scrapes for company data
  console.log('\n🌐 STEP 5: Scraping Company Data');
  console.log('-'.repeat(50));
  console.log('Searching for Microsoft SDE interview data...\n');

  try {
    const scrapedData = await getCompanyPrepData(
      application.company,
      application.role,
      application.roleType,
      userInput.roundType
    );

    console.log(`✅ Data found from: ${scrapedData.source}`);
    console.log(`Fetched at: ${scrapedData.fetchedAt}`);
    console.log(`\nCompany Tips (${scrapedData.companyTips.length}):`);
    scrapedData.companyTips.forEach((tip, i) => {
      console.log(`  ${i + 1}. ${tip}`);
    });

    if (scrapedData.recentQuestions.length > 0) {
      console.log(`\nRecent Questions (${scrapedData.recentQuestions.length}):`);
      scrapedData.recentQuestions.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.substring(0, 80)}...`);
      });
    }
  } catch (error) {
    console.log('⚠️ Scraping failed, will use generic templates');
  }

  // Step 6: Generate Recommendations
  console.log('\n\n🎯 STEP 6: Generated Prep Recommendations');
  console.log('=' .repeat(50));

  const recommendations = [
    {
      type: 'hr_provided',
      title: 'Based on HR Information',
      description: userInput.hrNotes,
      confidence: 'high',
    },
    {
      type: 'resume_based',
      title: 'Resume-Based Preparation',
      description: `Focus on these areas from your resume: ${userInput.resumeFocus.join(', ')}`,
      topics: userInput.resumeFocus,
      confidence: 'high',
    },
    {
      type: 'generic',
      title: 'Technical Round 1: DSA Focus',
      description: 'Typically focuses on data structures and algorithms',
      topics: ['Arrays', 'Strings', 'Hash Maps', 'Two Pointers', 'Sliding Window'],
      confidence: 'medium',
    },
  ];

  recommendations.forEach((rec, idx) => {
    console.log(`\n${idx + 1}. ${rec.title}`);
    console.log(`   Confidence: ${rec.confidence.toUpperCase()}`);
    console.log(`   ${rec.description}`);
    if (rec.topics) {
      console.log(`   Topics: ${rec.topics.join(', ')}`);
    }
  });

  // Step 7: Final Output
  console.log('\n\n✅ FINAL PREP PLAN');
  console.log('=' .repeat(50));
  console.log('Your personalized preparation plan includes:\n');
  console.log('📌 High Priority (from HR):');
  console.log('   - Focus on algorithms and data structures');
  console.log('   - Review resume projects thoroughly\n');
  console.log('📌 Study Topics:');
  console.log('   - Arrays & Strings');
  console.log('   - Hash Maps');
  console.log('   - System Design (from resume)');
  console.log('   - React & Node.js (from resume)\n');
  console.log('📌 Company-Specific Tips:');
  console.log('   - Microsoft values growth mindset');
  console.log('   - Be ready to discuss Azure/cloud considerations\n');

  console.log('🎓 Good luck with your interview!\n');
}

runDemo().catch(console.error);
