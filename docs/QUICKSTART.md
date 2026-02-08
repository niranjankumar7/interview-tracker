# 🚀 Quick Start - Backend Setup (5 Minutes)

Follow these steps to get your backend running quickly.

## Step 1: Get a Free PostgreSQL Database (2 minutes)

### Using Neon (Recommended)

1. Go to **https://neon.tech**
2. Click "Sign Up" (use GitHub for quick signup)
3. Click "Create Project"
4. **Copy the connection string** (looks like: `postgresql://user:password@...`)

### Using Supabase (Alternative)

1. Go to **https://supabase.com**
2. Sign up and create new project
3. Go to **Settings → Database**
4. Copy the **Connection string** (URI format)

## Step 2: Configure Environment Variables (1 minute)

Open `.env.local` and update:

```bash
# Paste your database connection string here
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Generate a random secret (or use this for testing)
JWT_SECRET="test-secret-key-change-in-production-12345678901234567890"
```

**For production, generate a secure JWT secret:**

Windows PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Mac/Linux:
```bash
openssl rand -base64 32
```

## Step 3: Create Database Tables (1 minute)

```bash
npm run db:push
```

You should see: ✅ "Your database is now in sync with your Prisma schema"

## Step 4: Start the Server (30 seconds)

```bash
npm run dev
```

Server starts at **http://localhost:3000**

## Step 5: Test It Works (30 seconds)

### Option A: Using Browser

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}"
```

You should see a success response with user data!

### Option B: Using Thunder Client (VS Code)

1. Install **Thunder Client** extension in VS Code
2. Create new request:
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123",
       "name": "Test User"
     }
     ```
3. Click "Send"

## ✅ You're Done!

Your backend is now running with:
- ✅ PostgreSQL database
- ✅ User authentication (JWT)
- ✅ All API endpoints ready
- ✅ Prisma ORM configured

## 🎯 Next Steps

### View Your Database
```bash
npm run db:studio
```
Opens at http://localhost:5555

### Test All Endpoints
See `API_TESTING.md` for complete examples

### Integrate with Frontend
Update your Tambo tools to call the API instead of using Zustand localStorage

## 📚 Full Documentation

- **`BACKEND_COMPLETE.md`** - Overview and next steps
- **`BACKEND_SETUP.md`** - Detailed setup guide
- **`API_TESTING.md`** - API endpoint examples

## 🐛 Troubleshooting

### "Error connecting to database"
- Check your `DATABASE_URL` in `.env.local`
- Make sure you copied the full connection string from Neon/Supabase

### "Prisma Client not found"
```bash
npm run db:generate
```

### "Port 3000 already in use"
```bash
# Kill the process using port 3000, then:
npm run dev
```

---

**That's it!** Your backend is ready to use. 🎉

Check `API_TESTING.md` for examples of all available endpoints!
