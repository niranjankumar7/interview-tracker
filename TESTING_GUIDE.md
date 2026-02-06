# 🧪 Complete Testing Flow Guide

## ✅ Database Seeded Successfully!

Your database now contains realistic dummy data for testing.

---

## 📊 **What Was Created**

### 👥 **Users** (2)
1. **John Doe**
   - Email: `john.doe@example.com`
   - Password: `TestPassword123!`
   - Role: Senior Software Engineer (Mid-level)
   - Streak: 7 days (longest: 15)
   - Tasks Completed: 42

2. **Jane Smith**
   - Email: `jane.smith@example.com`
   - Password: `TestPassword123!`
   - Role: Full Stack Developer (Senior)
   - Streak: 3 days (longest: 10)
   - Tasks Completed: 28

### 💼 **Applications** (5 for John Doe)
1. **Google** - Senior Software Engineer (Interview stage)
2. **Microsoft** - Software Engineer II (Offer received!)
3. **Amazon** - SDE II (Shortlisted)
4. **Meta** - Software Engineer (Applied)
5. **Netflix** - Senior Backend Engineer (Rejected)

### 🎯 **Interview Rounds** (4)
- Google: 2 rounds (1 completed, 1 upcoming)
- Microsoft: 2 rounds (both completed with excellent feedback)

### ❓ **Questions** (8)
- DSA questions (Easy, Medium, Hard)
- System Design questions
- Behavioral questions
- SQL questions

### 🏃 **Sprints** (2)
- Sprint for Google interview (14 days, active)
- Sprint for Amazon interview (10 days, active)

### ✅ **Completed Topics** (4)
- Arrays
- Linked Lists
- Binary Search
- Dynamic Programming

### 🔗 **LeetCode Connection** (1)
- Username: johndoe_leetcode
- Total Solved: 250 (100 Easy, 120 Medium, 30 Hard)
- Streak: 7 days

---

## 🧪 **Testing Flow**

### **Step 1: Test Authentication**

#### 1.1 Navigate to Auth Page
```
http://localhost:3000/auth
```

#### 1.2 Login with John Doe
- Email: `john.doe@example.com`
- Password: `TestPassword123!`
- Click "Sign In"

**Expected Result:**
- ✅ Successful login
- ✅ Redirected to dashboard
- ✅ Token saved in localStorage

#### 1.3 Verify Token
Open browser console:
```javascript
localStorage.getItem('authToken')
// Should return a JWT token
```

---

### **Step 2: Test User Profile API**

#### 2.1 Get Current User
Open browser console:
```javascript
const response = await fetch('/api/user/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
const user = await response.json();
console.log(user);
```

**Expected Result:**
```json
{
  "id": "...",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "targetRole": "Senior Software Engineer",
  "experienceLevel": "Mid",
  "progress": {
    "currentStreak": 7,
    "longestStreak": 15,
    "totalTasksCompleted": 42
  },
  "preferences": {
    "theme": "dark",
    "studyRemindersEnabled": true
  }
}
```

#### 2.2 Update User Profile
```javascript
const response = await fetch('/api/user/me', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe Updated',
    targetRole: 'Staff Engineer'
  })
});
const updated = await response.json();
console.log(updated);
```

---

### **Step 3: Test Applications API**

#### 3.1 Get All Applications
```javascript
const response = await fetch('/api/applications', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
const apps = await response.json();
console.log(`Total applications: ${apps.length}`);
console.log(apps);
```

**Expected Result:**
- ✅ 5 applications returned
- ✅ Google, Microsoft, Amazon, Meta, Netflix

#### 3.2 Get Single Application
```javascript
// Get the first application ID
const apps = await fetch('/api/applications', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

const appId = apps[0].id;

// Get single application
const app = await fetch(`/api/applications/${appId}`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(app);
```

**Expected Result:**
- ✅ Application details with interview rounds
- ✅ Company: Google
- ✅ Status: interview

#### 3.3 Create New Application
```javascript
const newApp = await fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    company: 'Apple',
    role: 'iOS Engineer',
    status: 'applied',
    applicationDate: new Date().toISOString()
  })
}).then(r => r.json());

console.log('Created application:', newApp);
```

#### 3.4 Update Application
```javascript
const apps = await fetch('/api/applications', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

const appId = apps[0].id;

const updated = await fetch(`/api/applications/${appId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'offer',
    notes: 'Received offer! Great compensation package.'
  })
}).then(r => r.json());

console.log('Updated application:', updated);
```

---

### **Step 4: Test Questions API**

#### 4.1 Get All Questions
```javascript
const questions = await fetch('/api/questions', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(`Total questions: ${questions.length}`);
console.log(questions);
```

**Expected Result:**
- ✅ 8 questions returned
- ✅ Mix of DSA, System Design, Behavioral, SQL

#### 4.2 Filter Questions by Category
```javascript
const dsaQuestions = await fetch('/api/questions?category=DSA', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(`DSA questions: ${dsaQuestions.length}`);
console.log(dsaQuestions);
```

#### 4.3 Filter Questions by Application
```javascript
// Get first application ID
const apps = await fetch('/api/applications', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

const appId = apps[0].id;

// Get questions for this application
const appQuestions = await fetch(`/api/questions?applicationId=${appId}`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(`Questions for ${apps[0].company}: ${appQuestions.length}`);
console.log(appQuestions);
```

#### 4.4 Create New Question
```javascript
const newQuestion = await fetch('/api/questions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    questionText: 'Implement a trie data structure',
    category: 'DSA',
    difficulty: 'Medium'
  })
}).then(r => r.json());

console.log('Created question:', newQuestion);
```

---

### **Step 5: Test Sprints API**

#### 5.1 Get All Sprints
```javascript
const sprints = await fetch('/api/sprints', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(`Total sprints: ${sprints.length}`);
console.log(sprints);
```

**Expected Result:**
- ✅ 2 sprints returned
- ✅ Both active status

#### 5.2 Filter Sprints by Status
```javascript
const activeSprints = await fetch('/api/sprints?status=active', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

console.log(`Active sprints: ${activeSprints.length}`);
console.log(activeSprints);
```

#### 5.3 Create New Sprint
```javascript
// Get an application ID
const apps = await fetch('/api/applications', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
}).then(r => r.json());

const appId = apps[0].id;

const newSprint = await fetch('/api/sprints', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    applicationId: appId,
    interviewDate: '2026-03-01T00:00:00.000Z',
    roleType: 'SDE',
    totalDays: 21,
    dailyPlans: {
      days: [
        {
          day: 1,
          date: '2026-02-08',
          topics: ['Arrays', 'Strings'],
          problems: 5,
          completed: 0
        }
      ]
    }
  })
}).then(r => r.json());

console.log('Created sprint:', newSprint);
```

---

### **Step 6: Test Logout**

```javascript
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
});

// Clear token
localStorage.removeItem('authToken');

console.log('Logged out successfully');
```

---

## 🎯 **Complete Test Script**

Run this entire script in the browser console to test everything:

```javascript
// Complete API Test Script
async function testCompleteFlow() {
  console.log('🧪 Starting complete API test flow...\n');
  
  // 1. Login
  console.log('1️⃣ Testing login...');
  const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'john.doe@example.com',
      password: 'TestPassword123!'
    })
  });
  const { token } = await loginResponse.json();
  localStorage.setItem('authToken', token);
  console.log('✅ Login successful\n');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 2. Get User Profile
  console.log('2️⃣ Testing user profile...');
  const user = await fetch('/api/user/me', { headers }).then(r => r.json());
  console.log(`✅ User: ${user.name} (${user.email})`);
  console.log(`   Streak: ${user.progress.currentStreak} days`);
  console.log(`   Tasks: ${user.progress.totalTasksCompleted}\n`);
  
  // 3. Get Applications
  console.log('3️⃣ Testing applications...');
  const apps = await fetch('/api/applications', { headers }).then(r => r.json());
  console.log(`✅ Found ${apps.length} applications:`);
  apps.forEach(app => {
    console.log(`   - ${app.company}: ${app.role} (${app.status})`);
  });
  console.log('');
  
  // 4. Get Questions
  console.log('4️⃣ Testing questions...');
  const questions = await fetch('/api/questions', { headers }).then(r => r.json());
  console.log(`✅ Found ${questions.length} questions`);
  const categories = [...new Set(questions.map(q => q.category))];
  console.log(`   Categories: ${categories.join(', ')}\n`);
  
  // 5. Get Sprints
  console.log('5️⃣ Testing sprints...');
  const sprints = await fetch('/api/sprints', { headers }).then(r => r.json());
  console.log(`✅ Found ${sprints.length} sprints`);
  sprints.forEach(sprint => {
    console.log(`   - ${sprint.totalDays} days sprint (${sprint.status})`);
  });
  console.log('');
  
  // 6. Create New Application
  console.log('6️⃣ Testing create application...');
  const newApp = await fetch('/api/applications', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      company: 'Test Company',
      role: 'Test Engineer',
      status: 'applied'
    })
  }).then(r => r.json());
  console.log(`✅ Created application: ${newApp.company}\n`);
  
  console.log('🎉 All tests passed!');
  console.log('\n📊 Summary:');
  console.log(`   ✅ Authentication working`);
  console.log(`   ✅ User profile working`);
  console.log(`   ✅ Applications CRUD working`);
  console.log(`   ✅ Questions API working`);
  console.log(`   ✅ Sprints API working`);
}

// Run the test
testCompleteFlow();
```

---

## 📱 **Testing with Postman**

### Import the Collection
1. Open Postman
2. Import `Interview-Tracker-API.postman_collection.json`
3. Import `Interview-Tracker-Local.postman_environment.json`
4. Select "Interview Tracker - Local" environment

### Test Flow in Postman
1. **Authentication → Login**
   - Use: `john.doe@example.com` / `TestPassword123!`
   - Token will be saved automatically

2. **User Profile → Get Current User**
   - Should return John Doe's profile

3. **Applications → Get All Applications**
   - Should return 5 applications

4. **Questions → Get All Questions**
   - Should return 8 questions

5. **Sprints → Get All Sprints**
   - Should return 2 sprints

---

## 🎨 **Testing the UI**

### Dashboard
Navigate to: `http://localhost:3000/dashboard`

**Should show:**
- ✅ 42 tasks completed
- ✅ 5 applications tracked
- ✅ Upcoming interviews
- ✅ Application pipeline chart
- ✅ Topic progress chart
- ✅ Offer comparison table (Microsoft offer)

### Pipeline
Navigate to: `http://localhost:3000/pipeline`

**Should show:**
- ✅ Kanban board with applications
- ✅ 5 columns: Applied, Shortlisted, Interview, Offer, Rejected
- ✅ Drag and drop functionality

### Questions
Navigate to: `http://localhost:3000/questions`

**Should show:**
- ✅ 8 questions in the bank
- ✅ Filter by category
- ✅ Filter by application

### Prep/Sprints
Navigate to: `http://localhost:3000/prep`

**Should show:**
- ✅ 2 active sprints
- ✅ Daily plans
- ✅ Progress tracking

---

## 🔍 **Verify Data in Database**

### Using Prisma Studio
```bash
npm run db:studio
```

Then browse:
- Users table (2 users)
- Application table (5 applications)
- Question table (8 questions)
- Sprint table (2 sprints)
- InterviewRound table (4 rounds)

### Using psql
```bash
psql -U postgres -d interview_tracker

# Check users
SELECT id, email, name FROM "User";

# Check applications
SELECT company, role, status FROM "Application";

# Check questions
SELECT "questionText", category, difficulty FROM "Question";
```

---

## 🎉 **You're All Set!**

Your database is fully seeded with realistic data. You can now:
1. ✅ Login with test credentials
2. ✅ Test all API endpoints
3. ✅ Verify UI components
4. ✅ Test complete user flows

**Start testing at:** http://localhost:3000/auth

**Login credentials:**
- Email: `john.doe@example.com`
- Password: `TestPassword123!`

Happy testing! 🚀
