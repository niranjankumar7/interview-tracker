# 🗺️ API Endpoints Map

```
Interview Tracker API
│
├── 🔐 /api/auth
│   ├── POST   /register          → Register new user
│   ├── POST   /login             → Login & get JWT token
│   └── POST   /logout            → Logout user
│
├── 👤 /api/user
│   └── /me
│       ├── GET                   → Get current user profile
│       └── PUT                   → Update user profile
│
├── 💼 /api/applications
│   ├── GET    /                  → Get all applications
│   ├── POST   /                  → Create new application
│   └── /:id
│       ├── GET                   → Get single application
│       ├── PUT                   → Update application
│       └── DELETE                → Delete application
│
├── ❓ /api/questions
│   ├── GET    /                  → Get all questions
│   │          ?applicationId     → Filter by application
│   │          ?category          → Filter by category
│   └── POST   /                  → Create new question
│
└── 🏃 /api/sprints
    ├── GET    /                  → Get all sprints
    │          ?status            → Filter by status
    └── POST   /                  → Create new sprint
```

---

## 🔑 Authentication Flow

```
┌─────────────┐
│   Register  │
│  New User   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Login    │
│  Get Token  │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│ Save Token  │─────▶│ Use Token in │
│ in Postman  │      │ All Requests │
└─────────────┘      └──────────────┘
```

---

## 📊 Data Relationships

```
User
 ├── Applications
 │    ├── Interview Rounds
 │    ├── Questions (optional)
 │    └── Sprints
 ├── Questions (general)
 ├── User Progress
 ├── User Preferences
 └── LeetCode Connection (optional)
```

---

## 🎯 Common Workflows

### Workflow 1: Track New Job Application
```
1. POST /api/applications
   ↓
2. GET /api/applications
   ↓
3. PUT /api/applications/:id (update status)
```

### Workflow 2: Prepare for Interview
```
1. POST /api/applications (create application)
   ↓
2. POST /api/sprints (create prep plan)
   ↓
3. POST /api/questions (add practice questions)
   ↓
4. GET /api/questions?applicationId=xxx (review questions)
```

### Workflow 3: Record Interview Questions
```
1. GET /api/applications (find application)
   ↓
2. POST /api/questions (add questions asked)
   ↓
3. PUT /api/applications/:id (update round info)
```

### Workflow 4: Manage Offer
```
1. PUT /api/applications/:id
   {
     "status": "offer",
     "offerDetails": { ... }
   }
   ↓
2. GET /api/applications (compare offers)
```

---

## 🔒 Protected vs Public Endpoints

### Public (No Auth Required)
- POST /api/auth/register
- POST /api/auth/login

### Protected (Requires JWT Token)
- All other endpoints

---

## 📝 Request Methods Summary

| Method | Count | Usage |
|--------|-------|-------|
| GET | 8 | Retrieve data |
| POST | 7 | Create new resources |
| PUT | 3 | Update existing resources |
| DELETE | 1 | Remove resources |
| **Total** | **19** | |

---

## 🎨 Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email on register |
| 500 | Server Error | Internal error |

---

## 🔄 Variable Flow in Postman

```
Register User
    ↓
  userId saved
    ↓
Login
    ↓
  authToken saved
  userId confirmed
    ↓
Create Application
    ↓
  applicationId saved
    ↓
All subsequent requests use:
  - authToken (for authentication)
  - applicationId (for related operations)
```

---

## 📦 Collection Structure in Postman

```
Interview Tracker API
│
├── 📁 Authentication (3 requests)
│   ├── Register User
│   ├── Login
│   └── Logout
│
├── 📁 User Profile (2 requests)
│   ├── Get Current User
│   └── Update User Profile
│
├── 📁 Applications (6 requests)
│   ├── Get All Applications
│   ├── Create Application
│   ├── Get Single Application
│   ├── Update Application
│   ├── Update Application with Offer Details
│   └── Delete Application
│
├── 📁 Questions (5 requests)
│   ├── Get All Questions
│   ├── Get Questions by Application
│   ├── Get Questions by Category
│   ├── Create Question
│   └── Create General Question (No Application)
│
└── 📁 Sprints (3 requests)
    ├── Get All Sprints
    ├── Get Active Sprints
    └── Create Sprint
```

---

## 🎯 Testing Order (Recommended)

```
1. Authentication → Register User
2. Authentication → Login
3. User Profile → Get Current User
4. Applications → Create Application
5. Applications → Get All Applications
6. Questions → Create Question
7. Sprints → Create Sprint
8. Applications → Update Application
9. User Profile → Update User Profile
10. Test all GET endpoints with filters
```

---

**This map provides a visual overview of your entire API structure!**
