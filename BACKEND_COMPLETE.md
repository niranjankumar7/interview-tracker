# 🎉 Backend Setup Complete!

Your Interview Tracker backend is now fully configured with PostgreSQL, Prisma ORM, and JWT authentication.

## ✅ What's Been Created

### 📁 Database Schema (`prisma/schema.prisma`)
- **Users** - Authentication and profile
- **Applications** - Job applications with offer details
- **InterviewRounds** - Track interview rounds and feedback
- **Sprints** - Interview prep sprints with daily plans
- **Questions** - Question bank
- **UserProgress** - Streak tracking and task completion
- **UserPreferences** - App settings
- **CompletedTopics** - Topic completion tracking
- **LeetCodeConnection** - LeetCode integration

### 🔌 API Endpoints

#### Authentication (`/api/auth/`)
- ✅ `POST /api/auth/register` - Register new user
- ✅ `POST /api/auth/login` - Login (returns JWT token)
- ✅ `POST /api/auth/logout` - Logout

#### User (`/api/user/`)
- ✅ `GET /api/user/me` - Get current user profile
- ✅ `PUT /api/user/me` - Update profile

#### Applications (`/api/applications/`)
- ✅ `GET /api/applications` - List all applications
- ✅ `POST /api/applications` - Create application
- ✅ `GET /api/applications/:id` - Get single application
- ✅ `PUT /api/applications/:id` - Update application (including offer details)
- ✅ `DELETE /api/applications/:id` - Delete application

#### Questions (`/api/questions/`)
- ✅ `GET /api/questions` - List questions (with filters)
- ✅ `POST /api/questions` - Create question

#### Sprints (`/api/sprints/`)
- ✅ `GET /api/sprints` - List sprints (with status filter)
- ✅ `POST /api/sprints` - Create sprint

### 🛠️ Utilities
- ✅ `src/lib/db.ts` - Prisma client singleton
- ✅ `src/lib/auth.ts` - Password hashing & validation
- ✅ `src/lib/auth-middleware.ts` - JWT authentication middleware

### 📦 Dependencies Installed
- ✅ `prisma` & `@prisma/client` - Database ORM
- ✅ `bcryptjs` - Password hashing
- ✅ `jose` - JWT token handling
- ✅ `next-auth` - Authentication framework
- ✅ `zod` - Schema validation (already installed)

## 🚀 Next Steps

### 1. Set Up Your Database

You need a PostgreSQL database. Choose one option:

**Option A: Neon (Recommended - Free)**
1. Go to https://neon.tech
2. Create account and new project
3. Copy connection string
4. Paste into `.env.local` as `DATABASE_URL`

**Option B: Supabase (Alternative - Free)**
1. Go to https://supabase.com
2. Create project
3. Get connection string from Settings → Database
4. Paste into `.env.local` as `DATABASE_URL`

**Option C: Local PostgreSQL**
```bash
# Install PostgreSQL, then:
createdb interview_tracker
# Use: postgresql://localhost:5432/interview_tracker
```

### 2. Update Environment Variables

Edit `.env.local`:

```bash
# Database (REQUIRED - Get from Neon/Supabase)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# JWT Secret (REQUIRED - Generate a random string)
JWT_SECRET="your-secret-key-here"

# Tambo (Already configured)
NEXT_PUBLIC_TAMBO_API_KEY=your_existing_key
```

**Generate JWT Secret (Windows PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Create Database Tables

Once you have `DATABASE_URL` set:

```bash
# Push schema to database
npm run db:push

# OR create migration (recommended for production)
npm run db:migrate
```

### 4. Test the Backend

```bash
# Start dev server
npm run dev

# In another terminal, test registration:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}"
```

See `API_TESTING.md` for complete testing guide.

### 5. View Your Database

```bash
# Open Prisma Studio (database GUI)
npm run db:studio
```

Opens at http://localhost:5555

## 📚 Documentation

- **`BACKEND_SETUP.md`** - Detailed setup instructions
- **`API_TESTING.md`** - API endpoint examples and testing guide
- **`prisma/schema.prisma`** - Database schema with comments

## 🔑 Authentication Flow

1. User registers → Password hashed with bcrypt
2. User logs in → JWT token generated (7-day expiry)
3. Token stored in HTTP-only cookie + returned in response
4. Client sends token with each request (cookie or Authorization header)
5. Middleware verifies token and extracts user ID

## 🎯 Integration with Frontend

### Current State (Zustand)
Your app currently uses Zustand with localStorage for state management.

### Migration Options

**Option 1: Hybrid Approach (Recommended)**
- Keep Zustand for UI state
- Fetch data from API on load
- Mutations go through API → Update Zustand

**Option 2: Full Backend**
- Use TanStack Query for server state
- Zustand only for UI state (theme, modals)

### Example: Update Tambo Tools

```typescript
// src/lib/tambo.ts
export const tools: TamboTool[] = [
  {
    name: "addApplications",
    tool: async (input) => {
      // Call backend API
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include auth cookie
        body: JSON.stringify(input.applications[0]),
      });
      
      const data = await response.json();
      
      // Optionally update Zustand for immediate UI update
      useStore.getState().addApplication(data);
      
      return { added: [data.company], count: 1 };
    },
  },
];
```

## 🐛 Troubleshooting

### Prisma Client errors
```bash
npm run db:generate
```

### Database connection errors
- Check `DATABASE_URL` in `.env.local`
- Ensure database is running
- Verify network access (cloud databases may need IP whitelisting)

### JWT/Auth errors
- Ensure `JWT_SECRET` is set and at least 32 characters
- Check token hasn't expired (7-day limit)

### TypeScript errors
- Restart TypeScript server in VS Code: `Ctrl+Shift+P` → "Restart TS Server"

## 📊 Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema (no migration)
npm run db:push

# Open database GUI
npm run db:studio

# Reset database (⚠️ Deletes all data)
npx prisma migrate reset
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL` (from Neon/Supabase)
   - `JWT_SECRET` (same as local)
   - `NEXT_PUBLIC_TAMBO_API_KEY` (already have)
4. Deploy!

Vercel automatically handles Next.js API routes.

## 🎨 What's Next?

1. **Set up database** (Neon/Supabase)
2. **Run migrations** (`npm run db:push`)
3. **Test API endpoints** (see `API_TESTING.md`)
4. **Integrate with frontend** (update Zustand/Tambo tools)
5. **Add LeetCode sync** (implement `/api/leetcode/sync`)
6. **Deploy** (Vercel + Neon)

## 💡 Tips

- Use **Prisma Studio** (`npm run db:studio`) to view/edit data visually
- Check **API logs** in terminal running `npm run dev`
- Use **Thunder Client** (VS Code extension) for easy API testing
- Keep **JWT_SECRET** secure and never commit it to Git

## 📖 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT.io](https://jwt.io) - Decode JWT tokens
- [Neon](https://neon.tech/docs)
- [Supabase](https://supabase.com/docs)

---

**Need help?** Check the detailed guides:
- `BACKEND_SETUP.md` - Complete setup instructions
- `API_TESTING.md` - API testing examples

**Ready to test?** Run:
```bash
npm run dev
```

Then open `API_TESTING.md` and start testing endpoints! 🎉
