# 📬 Postman Collection - Interview Tracker API

Complete Postman collection for testing all Interview Tracker API endpoints.

## 📦 Files Included

1. **`Interview-Tracker-API.postman_collection.json`** - Main API collection
2. **`Interview-Tracker-Local.postman_environment.json`** - Local development environment

---

## 🚀 Quick Start

### Step 1: Import Collection

1. Open **Postman**
2. Click **Import** button (top left)
3. Drag and drop both files:
   - `Interview-Tracker-API.postman_collection.json`
   - `Interview-Tracker-Local.postman_environment.json`
4. Click **Import**

### Step 2: Select Environment

1. Click the environment dropdown (top right)
2. Select **"Interview Tracker - Local"**

### Step 3: Start Testing!

1. Make sure your backend is running: `npm run dev`
2. Start with **Authentication → Register User**
3. Then **Authentication → Login** (this will automatically save your token)
4. All other requests will use the saved token automatically!

---

## 📚 API Endpoints Overview

### 🔐 Authentication (3 endpoints)
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login and get JWT token
- **POST** `/api/auth/logout` - Logout user

### 👤 User Profile (2 endpoints)
- **GET** `/api/user/me` - Get current user profile
- **PUT** `/api/user/me` - Update user profile

### 💼 Applications (6 endpoints)
- **GET** `/api/applications` - Get all applications
- **POST** `/api/applications` - Create new application
- **GET** `/api/applications/:id` - Get single application
- **PUT** `/api/applications/:id` - Update application
- **PUT** `/api/applications/:id` - Update with offer details
- **DELETE** `/api/applications/:id` - Delete application

### ❓ Questions (5 endpoints)
- **GET** `/api/questions` - Get all questions
- **GET** `/api/questions?applicationId=xxx` - Filter by application
- **GET** `/api/questions?category=DSA` - Filter by category
- **POST** `/api/questions` - Create question with application
- **POST** `/api/questions` - Create general question

### 🏃 Sprints (3 endpoints)
- **GET** `/api/sprints` - Get all sprints
- **GET** `/api/sprints?status=active` - Filter by status
- **POST** `/api/sprints` - Create new sprint

**Total: 19 API endpoints**

---

## 🎯 Testing Workflow

### 1️⃣ First Time Setup

```
1. Register User
   └─> Automatically saves userId

2. Login
   └─> Automatically saves authToken and userId
   
3. Get Current User
   └─> Verify authentication works
```

### 2️⃣ Create Application

```
1. Create Application
   └─> Automatically saves applicationId
   
2. Get All Applications
   └─> See your created application
   
3. Get Single Application
   └─> Uses saved applicationId
```

### 3️⃣ Add Questions

```
1. Create Question (with application)
   └─> Links to your application
   
2. Create General Question
   └─> Not linked to any application
   
3. Get Questions by Category
   └─> Filter by DSA, SystemDesign, etc.
```

### 4️⃣ Create Sprint

```
1. Create Sprint
   └─> Uses saved applicationId
   
2. Get Active Sprints
   └─> Filter by status
```

---

## 🔧 Environment Variables

The collection uses these variables (automatically managed):

| Variable | Description | Auto-saved? |
|----------|-------------|-------------|
| `baseUrl` | API base URL | ✅ Pre-configured |
| `authToken` | JWT authentication token | ✅ After login |
| `userId` | Current user ID | ✅ After register/login |
| `applicationId` | Last created application ID | ✅ After creating application |

---

## 📝 Example Request Bodies

### Register User
```json
{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
}
```

### Create Application
```json
{
    "company": "Google",
    "role": "Software Engineer",
    "jobDescriptionUrl": "https://careers.google.com/jobs/12345",
    "roleType": "SDE",
    "status": "applied",
    "applicationDate": "2026-02-06T00:00:00.000Z",
    "notes": "Applied through referral"
}
```

### Update Application with Offer
```json
{
    "status": "offer",
    "offerDetails": {
        "baseSalary": 150000,
        "equity": "0.5% RSU",
        "bonus": 20000,
        "currency": "USD",
        "location": "San Francisco, CA",
        "workMode": "Hybrid",
        "joiningDate": "2026-03-15T00:00:00.000Z",
        "noticePeriod": "2 weeks",
        "benefits": ["Health Insurance", "401k Match", "Gym Membership"],
        "notes": "Great offer with excellent benefits",
        "totalCTC": 170000
    }
}
```

### Create Question
```json
{
    "questionText": "Implement a LRU Cache with O(1) operations",
    "category": "DSA",
    "difficulty": "Medium",
    "askedInRound": "Technical Round 1",
    "applicationId": "{{applicationId}}"
}
```

### Create Sprint
```json
{
    "applicationId": "{{applicationId}}",
    "interviewDate": "2026-02-20T00:00:00.000Z",
    "roleType": "SDE",
    "totalDays": 14,
    "dailyPlans": {
        "day1": {
            "topics": ["Arrays", "Strings"],
            "problems": 5,
            "completed": false
        },
        "day2": {
            "topics": ["Linked Lists", "Stacks"],
            "problems": 5,
            "completed": false
        }
    }
}
```

---

## 🎨 Field Options

### Application Status
- `applied`
- `shortlisted`
- `interview`
- `offer`
- `rejected`

### Question Category
- `DSA`
- `SystemDesign`
- `Behavioral`
- `SQL`
- `Other`

### Question Difficulty
- `Easy`
- `Medium`
- `Hard`

### Experience Level
- `Junior`
- `Mid`
- `Senior`

### Work Mode
- `WFH`
- `Hybrid`
- `Office`

### Sprint Status
- `active`
- `completed`
- `expired`

---

## 🔒 Authentication

All endpoints except **Register** and **Login** require authentication.

The collection is configured to automatically use the `authToken` from the environment variables.

**How it works:**
1. Login request saves the token to `{{authToken}}`
2. All subsequent requests include: `Authorization: Bearer {{authToken}}`
3. Token is valid for **7 days**

---

## 🧪 Testing Tips

### 1. Use the Console
- Open Postman Console (bottom left) to see request/response details
- Useful for debugging authentication issues

### 2. Test Scripts
- Login and Register requests have **test scripts** that auto-save variables
- Check the **Tests** tab to see what gets saved

### 3. Pre-request Scripts
- You can add custom logic before requests
- Example: Generate random emails for testing

### 4. Collections Runner
- Run entire collection or folders
- Great for regression testing
- Click **Run** button in collection

### 5. Mock Data
- Use variables for dynamic data
- Example: `{{$randomEmail}}`, `{{$timestamp}}`

---

## 🐛 Troubleshooting

### "Unauthorized" Error
**Solution:** Make sure you've logged in and the token is saved
```
1. Check environment variables (eye icon, top right)
2. Verify authToken has a value
3. Try logging in again
```

### "Application not found"
**Solution:** Create an application first
```
1. Run "Create Application" request
2. Check that applicationId was saved
3. Try the request again
```

### "Connection refused"
**Solution:** Backend server not running
```
1. Open terminal
2. Run: npm run dev
3. Wait for server to start
4. Try request again
```

### Token Expired
**Solution:** Login again to get a new token
```
1. Run "Login" request
2. New token will be saved automatically
```

---

## 📊 Response Examples

### Successful Login
```json
{
    "message": "Login successful",
    "user": {
        "id": "795d8535-6c52-497c-ae6f-ae1758e4d138",
        "email": "john.doe@example.com",
        "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI3OTVkODUzNS02YzUyLTQ5N2MtYWU2Zi1hZTE3NThlNGQxMzgiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNzA3MjE5OTgwLCJleHAiOjE3MDc4MjQ3ODB9.abc123..."
}
```

### Get Current User
```json
{
    "id": "795d8535-6c52-497c-ae6f-ae1758e4d138",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "targetRole": "Senior Software Engineer",
    "experienceLevel": "Senior",
    "createdAt": "2026-02-06T13:26:20.086Z",
    "progress": {
        "userId": "795d8535-6c52-497c-ae6f-ae1758e4d138",
        "currentStreak": 5,
        "longestStreak": 10,
        "lastActiveDate": "2026-02-06T13:26:20.086Z",
        "totalTasksCompleted": 25,
        "updatedAt": "2026-02-06T13:26:20.086Z"
    },
    "preferences": {
        "userId": "795d8535-6c52-497c-ae6f-ae1758e4d138",
        "theme": "dark",
        "studyRemindersEnabled": true,
        "calendarAutoSyncEnabled": false,
        "leetcodeAutoSyncEnabled": true,
        "updatedAt": "2026-02-06T13:26:20.086Z"
    },
    "leetcode": null
}
```

---

## 🌐 Production Environment

To test against production:

1. Duplicate the environment
2. Rename to "Interview Tracker - Production"
3. Update `baseUrl` to your production URL
4. Import and select the new environment

---

## 📖 Additional Resources

- **API Documentation**: See `SETUP_COMPLETE.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`
- **Database Setup**: See `LOCAL_DATABASE_SETUP.md`

---

## 💡 Pro Tips

1. **Save Requests**: Star frequently used requests for quick access
2. **Organize**: Use folders to group related endpoints
3. **Share**: Export and share collections with your team
4. **Version Control**: Commit Postman files to Git
5. **Documentation**: Add descriptions to requests for better clarity
6. **Examples**: Save response examples for reference

---

## 🎉 Happy Testing!

Your Postman collection is ready to use. Start with the Authentication folder and work your way through!

**Questions?** Check the troubleshooting section or refer to the main documentation.

---

**Last Updated:** 2026-02-06  
**Collection Version:** 1.0  
**Total Endpoints:** 19
