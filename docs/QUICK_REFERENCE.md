# 🚀 Quick Reference - Backend & Database

## ⚡ Quick Start

### Start Development Server
```bash
npm run dev
```
Server: http://localhost:3000

### Open Database GUI
```bash
npm run db:studio
```
Prisma Studio: http://localhost:5555

---

## 🔑 Connection Details

**Database:**
- Host: `localhost`
- Port: `5432`
- Database: `interview_tracker`
- Username: `postgres`
- Password: `admin`

**Connection String:**
```
postgresql://postgres:admin@localhost:5432/interview_tracker
```

---

## 📡 API Endpoints

### Authentication

**Register:**
```
POST /api/auth/register
Body: { email, password, name }
```

**Login:**
```
POST /api/auth/login
Body: { email, password }
Returns: { token, user }
```

### Protected Routes (Require JWT Token)

**Get Current User:**
```
GET /api/user/me
Header: Authorization: Bearer <token>
```

---

## 🧪 Test User

**Email:** testuser@example.com  
**Password:** TestPassword123!

---

## 🛠️ Common Commands

```bash
# Database
npm run db:generate    # Generate Prisma Client
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio

# Development
npm run dev            # Start dev server
npm run build          # Build for production
npm run lint           # Run linter

# PostgreSQL
psql -U postgres -d interview_tracker    # Connect to DB
psql -U postgres -l                      # List databases
```

---

## ✅ Status: All Systems Operational

- ✅ PostgreSQL Running
- ✅ Database Created
- ✅ Tables Migrated
- ✅ Backend Server Running
- ✅ API Endpoints Tested
- ✅ Authentication Working

**Last Updated:** 2026-02-06 18:31 IST
