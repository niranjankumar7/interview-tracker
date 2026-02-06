# 🔗 Backend API Integration Guide

## ✅ Integration Complete!

Your Interview Tracker UI is now connected to the backend API.

---

## 📦 What Was Integrated

### 1. **API Client** (`src/lib/api-client.ts`)
Complete TypeScript client for all backend endpoints:
- ✅ Authentication (register, login, logout)
- ✅ User Profile (get, update)
- ✅ Applications (CRUD operations)
- ✅ Questions (create, list with filters)
- ✅ Sprints (create, list with filters)

### 2. **Authentication Context** (`src/contexts/AuthContext.tsx`)
React context for managing auth state:
- ✅ User profile state
- ✅ Login/Register/Logout functions
- ✅ Auto-load user on mount
- ✅ Token management in localStorage

### 3. **Auth Page** (`src/app/auth/page.tsx`)
Beautiful login/register page with:
- ✅ Toggle between login and register
- ✅ Form validation
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

### 4. **Root Layout Updated** (`src/app/layout.tsx`)
- ✅ AuthProvider wrapped around the app
- ✅ Authentication context available everywhere

---

## 🚀 How to Use

### Step 1: Start the Backend
```bash
npm run dev
```
Server runs on: http://localhost:3000

### Step 2: Access the Auth Page
Navigate to: http://localhost:3000/auth

### Step 3: Register or Login
- **Register**: Create a new account
- **Login**: Use existing credentials
- **Demo**: testuser@example.com / TestPassword123!

### Step 4: Use the API in Components
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  // Create an application
  const createApp = async () => {
    const app = await api.applications.create({
      company: 'Google',
      role: 'Software Engineer',
      status: 'applied',
    });
  };
  
  return <div>Welcome {user?.name}</div>;
}
```

---

## 🔧 API Client Usage Examples

### Authentication
```typescript
import { api } from '@/lib/api-client';

// Register
await api.auth.register({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Login
await api.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Logout
await api.auth.logout();

// Check if authenticated
const isAuth = api.auth.isAuthenticated();
```

### User Profile
```typescript
// Get profile
const profile = await api.user.getProfile();

// Update profile
await api.user.updateProfile({
  name: 'John Updated',
  targetRole: 'Senior Engineer',
  experienceLevel: 'Senior'
});
```

### Applications
```typescript
// Get all applications
const apps = await api.applications.getAll();

// Create application
const app = await api.applications.create({
  company: 'Google',
  role: 'Software Engineer',
  status: 'applied',
  applicationDate: new Date().toISOString(),
});

// Update application
await api.applications.update(app.id, {
  status: 'interview',
  interviewDate: '2026-02-20T00:00:00.000Z'
});

// Delete application
await api.applications.delete(app.id);
```

### Questions
```typescript
// Get all questions
const questions = await api.questions.getAll();

// Filter by application
const appQuestions = await api.questions.getAll({
  applicationId: 'app-id-here'
});

// Filter by category
const dsaQuestions = await api.questions.getAll({
  category: 'DSA'
});

// Create question
await api.questions.create({
  questionText: 'Implement LRU Cache',
  category: 'DSA',
  difficulty: 'Medium',
  applicationId: 'app-id-here'
});
```

### Sprints
```typescript
// Get all sprints
const sprints = await api.sprints.getAll();

// Filter by status
const activeSprints = await api.sprints.getAll({
  status: 'active'
});

// Create sprint
await api.sprints.create({
  applicationId: 'app-id-here',
  interviewDate: '2026-02-20T00:00:00.000Z',
  roleType: 'SDE',
  totalDays: 14,
  dailyPlans: { /* your plan data */ }
});
```

---

## 🎯 Next Steps: Integrate with Zustand Store

### Option 1: Sync on Component Mount
Update components to fetch from API on mount:

```typescript
'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const { applications, setApplications } = useStore();
  
  useEffect(() => {
    if (isAuthenticated) {
      loadApplications();
    }
  }, [isAuthenticated]);
  
  const loadApplications = async () => {
    try {
      const apps = await api.applications.getAll();
      // Transform and set to store
      setApplications(apps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };
  
  // Rest of component...
}
```

### Option 2: Add API Methods to Store
Extend the Zustand store with API integration:

```typescript
// In store.ts
import { api } from '@/lib/api-client';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... existing state ...
      
      // New API-integrated methods
      async loadApplicationsFromAPI() {
        try {
          const apps = await api.applications.getAll();
          set({ applications: apps });
        } catch (error) {
          console.error('Failed to load applications:', error);
        }
      },
      
      async createApplicationAPI(data) {
        try {
          const app = await api.applications.create(data);
          set(state => ({
            applications: [...state.applications, app]
          }));
          return app;
        } catch (error) {
          console.error('Failed to create application:', error);
          throw error;
        }
      },
      
      // ... more API methods ...
    }),
    // ... persist config ...
  )
);
```

---

## 🔒 Protected Routes

Create a protected route wrapper:

```typescript
// src/components/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, isLoading, router]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}
```

Use it in pages:

```typescript
// src/app/dashboard/page.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      {/* Your dashboard content */}
    </ProtectedRoute>
  );
}
```

---

## 📊 Data Flow

```
User Action (UI)
    ↓
API Client (src/lib/api-client.ts)
    ↓
Backend API (http://localhost:3000/api/...)
    ↓
PostgreSQL Database
    ↓
Response back to UI
    ↓
Update Zustand Store (optional)
    ↓
UI Re-renders
```

---

## 🛠️ Environment Variables

Make sure your `.env.local` is configured:

```bash
# Tambo AI Configuration
NEXT_PUBLIC_TAMBO_API_KEY=your-tambo-key

# Database Configuration
DATABASE_URL="postgresql://postgres:admin@localhost:5432/interview_tracker"

# JWT Secret for Authentication
JWT_SECRET="HIepinLafTAQk5Ydjgv8S7xNmcUDJZ3K"

# API URL (optional, defaults to same origin)
NEXT_PUBLIC_API_URL=""
```

---

## 🧪 Testing the Integration

### 1. Test Authentication
```bash
# Start the dev server
npm run dev

# Navigate to http://localhost:3000/auth
# Try registering a new user
# Try logging in
```

### 2. Test API Calls
Open browser console and try:

```javascript
// In browser console
const api = await import('/src/lib/api-client.ts');

// Test login
await api.default.auth.login({
  email: 'testuser@example.com',
  password: 'TestPassword123!'
});

// Test getting profile
const profile = await api.default.user.getProfile();
console.log(profile);

// Test creating application
const app = await api.default.applications.create({
  company: 'Test Company',
  role: 'Engineer',
  status: 'applied'
});
console.log(app);
```

---

## 🐛 Troubleshooting

### "Network Error" or "Failed to fetch"
- ✅ Make sure backend is running: `npm run dev`
- ✅ Check backend is on http://localhost:3000
- ✅ Check browser console for CORS errors

### "Unauthorized" Error
- ✅ Make sure you're logged in
- ✅ Check token in localStorage: `localStorage.getItem('authToken')`
- ✅ Try logging in again

### TypeScript Errors
- ✅ Run: `npm run build` to check for type errors
- ✅ Make sure all dependencies are installed: `npm install`

---

## 📚 Files Created/Modified

### Created:
1. ✅ `src/lib/api-client.ts` - API client
2. ✅ `src/contexts/AuthContext.tsx` - Auth context
3. ✅ `src/app/auth/page.tsx` - Auth page

### Modified:
1. ✅ `src/app/layout.tsx` - Added AuthProvider

---

## 🎉 You're Ready!

Your UI is now fully integrated with the backend API. You can:
- ✅ Register and login users
- ✅ Make authenticated API calls
- ✅ Access user profile
- ✅ CRUD operations on all resources

**Next steps:**
1. Update existing components to use the API
2. Add protected routes
3. Sync Zustand store with backend
4. Add error handling and loading states

---

**Happy coding!** 🚀
