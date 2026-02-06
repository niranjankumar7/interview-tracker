# Backend Setup Guide

This guide will help you set up the PostgreSQL database and backend API for the Interview Tracker application.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database (we'll set this up)

## 🗄️ Database Setup

### Option 1: Neon (Recommended - Free Tier)

1. Go to [Neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project
4. Copy the connection string (it looks like: `postgresql://user:password@host/dbname`)
5. Paste it into `.env.local` as `DATABASE_URL`

### Option 2: Supabase (Alternative - Free Tier)

1. Go to [Supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Go to Project Settings → Database
4. Copy the "Connection string" (URI format)
5. Paste it into `.env.local` as `DATABASE_URL`

### Option 3: Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create a database
createdb interview_tracker

# Connection string format:
DATABASE_URL="postgresql://localhost:5432/interview_tracker"
```

## 🔐 Environment Variables

Update your `.env.local` file:

```bash
# Tambo AI Configuration
NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key

# Database Configuration
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# JWT Secret for Authentication
# Generate with: openssl rand -base64 32
JWT_SECRET="your-secret-key-here"
```

### Generate a Secure JWT Secret

**On Windows (PowerShell):**
```powershell
# Generate a random base64 string
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

## 🚀 Installation Steps

### 1. Install Dependencies

All dependencies should already be installed, but if not:

```bash
npm install
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

This generates the TypeScript types for your database models.

### 3. Create Database Tables

**Option A: Using Migrations (Recommended for production)**

```bash
npm run db:migrate
```

This creates a migration file and applies it to your database.

**Option B: Push Schema Directly (Quick for development)**

```bash
npm run db:push
```

This pushes your schema directly without creating migration files.

### 4. Verify Database Setup

Open Prisma Studio to view your database:

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:5555` where you can view and edit your data.

## 🧪 Testing the Backend

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test API Endpoints

You can use tools like **Postman**, **Thunder Client** (VS Code extension), or **curl**.

#### Register a New User

```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

#### Login

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

This returns a JWT token. Copy it for authenticated requests.

#### Get User Profile (Authenticated)

```bash
GET http://localhost:3000/api/user/me
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

#### Create an Application

```bash
POST http://localhost:3000/api/applications
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "company": "Google",
  "role": "Software Engineer",
  "status": "applied",
  "notes": "Applied through referral"
}
```

## 📁 Backend File Structure

```
src/
├── app/
│   └── api/                          # API Routes
│       ├── auth/
│       │   ├── register/route.ts     # POST /api/auth/register
│       │   ├── login/route.ts        # POST /api/auth/login
│       │   └── logout/route.ts       # POST /api/auth/logout
│       ├── applications/
│       │   ├── route.ts              # GET, POST /api/applications
│       │   └── [id]/route.ts         # GET, PUT, DELETE /api/applications/:id
│       ├── questions/
│       │   └── route.ts              # GET, POST /api/questions
│       ├── sprints/
│       │   └── route.ts              # GET, POST /api/sprints
│       └── user/
│           └── me/route.ts           # GET, PUT /api/user/me
├── lib/
│   ├── db.ts                         # Prisma client instance
│   ├── auth.ts                       # Password hashing utilities
│   └── auth-middleware.ts            # JWT authentication middleware
└── prisma/
    └── schema.prisma                 # Database schema
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)
- `POST /api/auth/logout` - Logout user

### User
- `GET /api/user/me` - Get current user profile
- `PUT /api/user/me` - Update user profile

### Applications
- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `GET /api/applications/:id` - Get single application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Questions
- `GET /api/questions` - Get all questions (supports filters)
- `POST /api/questions` - Create new question

### Sprints
- `GET /api/sprints` - Get all sprints (supports status filter)
- `POST /api/sprints` - Create new sprint

## 🔒 Authentication

The backend uses **JWT (JSON Web Tokens)** for authentication.

### How it works:

1. User registers or logs in
2. Server returns a JWT token
3. Client stores token (in cookie or localStorage)
4. Client sends token with each request in `Authorization` header
5. Server verifies token and identifies user

### Token Storage:

The login endpoint sets an **HTTP-only cookie** for security, but you can also use the token from the response body for API calls.

**Using Cookie (Automatic):**
```javascript
// Cookie is set automatically, no need to send Authorization header
fetch('/api/user/me', {
  credentials: 'include' // Include cookies
})
```

**Using Authorization Header:**
```javascript
fetch('/api/user/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

## 🛠️ Database Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Create and apply migration
npm run db:migrate

# Push schema without migration (dev only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

## 🐛 Troubleshooting

### "PrismaClient is unable to run in the browser"

Make sure you're only importing `prisma` in server-side code (API routes), not in client components.

### "Invalid `prisma.user.findUnique()` invocation"

Run `npm run db:generate` to regenerate the Prisma Client after schema changes.

### Database connection errors

1. Check your `DATABASE_URL` in `.env.local`
2. Ensure your database is running
3. Verify network access (some cloud databases require IP whitelisting)

### JWT errors

Make sure `JWT_SECRET` is set in `.env.local` and is at least 32 characters long.

## 📚 Next Steps

1. **Integrate with Frontend**: Update Zustand store to fetch from API instead of localStorage
2. **Add LeetCode Sync**: Implement `/api/leetcode/sync` endpoint
3. **Add Real-time Updates**: Consider using WebSockets or Server-Sent Events
4. **Deploy**: Deploy to Vercel (frontend + API) and Neon/Supabase (database)

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_TAMBO_API_KEY`
4. Deploy!

Vercel automatically handles Next.js API routes.

## 📖 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT.io](https://jwt.io) - Decode and verify JWT tokens
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Need help?** Check the API route files for detailed comments and examples!
