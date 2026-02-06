# Local PostgreSQL Setup for Windows + DBeaver

This guide will help you install PostgreSQL locally and connect it to DBeaver.

## 📥 Step 1: Install PostgreSQL

### Option A: Using Installer (Recommended)

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download the latest version (PostgreSQL 16.x)

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Click "Next" through the setup wizard
   
3. **Important Settings:**
   - **Components**: Select all (PostgreSQL Server, pgAdmin 4, Command Line Tools)
   - **Data Directory**: Use default (`C:\Program Files\PostgreSQL\16\data`)
   - **Password**: Set a password for the `postgres` user (remember this!)
     - Example: `postgres123` (for local development)
   - **Port**: Use default `5432`
   - **Locale**: Use default
   
4. **Complete Installation:**
   - Click "Next" → "Next" → "Finish"
   - PostgreSQL is now installed!

### Option B: Using Chocolatey (If you have it)

Open PowerShell as Administrator:
```powershell
choco install postgresql
```

## 🗄️ Step 2: Create Your Database

### Using pgAdmin (GUI - Easier)

1. **Open pgAdmin 4:**
   - Search for "pgAdmin 4" in Windows Start menu
   - It will open in your browser
   
2. **Connect to Server:**
   - Expand "Servers" in left sidebar
   - Right-click "PostgreSQL 16" → Enter your password
   
3. **Create Database:**
   - Right-click "Databases" → "Create" → "Database"
   - **Database name**: `interview_tracker`
   - Click "Save"

### Using Command Line (Alternative)

1. **Open Command Prompt or PowerShell**

2. **Navigate to PostgreSQL bin folder:**
   ```powershell
   cd "C:\Program Files\PostgreSQL\16\bin"
   ```

3. **Create database:**
   ```powershell
   .\createdb.exe -U postgres interview_tracker
   ```
   
   When prompted, enter your PostgreSQL password.

## 🔌 Step 3: Update Your .env.local

Open your project's `.env.local` file and update the `DATABASE_URL`:

```bash
# Local PostgreSQL Connection
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/interview_tracker"
```

**Replace `YOUR_PASSWORD` with the password you set during installation.**

Example:
```bash
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/interview_tracker"
```

## 🐘 Step 4: Install DBeaver

1. **Download DBeaver:**
   - Go to: https://dbeaver.io/download/
   - Download "DBeaver Community Edition" for Windows
   
2. **Install:**
   - Run the installer
   - Follow the setup wizard (all defaults are fine)

## 🔗 Step 5: Connect DBeaver to Your Database

1. **Open DBeaver**

2. **Create New Connection:**
   - Click "New Database Connection" (plug icon) or `Ctrl+Shift+N`
   - Select **PostgreSQL**
   - Click "Next"

3. **Connection Settings:**
   ```
   Host: localhost
   Port: 5432
   Database: interview_tracker
   Username: postgres
   Password: [your password]
   ```

4. **Test Connection:**
   - Click "Test Connection"
   - If prompted to download drivers, click "Download"
   - You should see "Connected" ✅

5. **Save Connection:**
   - Click "Finish"

## 🚀 Step 6: Create Database Tables

Now that your database is set up, create the tables:

1. **Open Terminal in VS Code** (or PowerShell in your project folder)

2. **Navigate to your project:**
   ```powershell
   cd d:\code\interview-tracker-hackathon\interview-tracker
   ```

3. **Push the schema to database:**
   ```powershell
   npm run db:push
   ```

   You should see: ✅ "Your database is now in sync with your Prisma schema"

## 👀 Step 7: View Your Database in DBeaver

1. **In DBeaver**, expand your connection:
   ```
   interview_tracker
   └── Schemas
       └── public
           └── Tables
   ```

2. **You should see all your tables:**
   - User
   - Application
   - InterviewRound
   - Sprint
   - Question
   - UserProgress
   - UserPreferences
   - CompletedTopic
   - LeetCodeConnection

3. **View table data:**
   - Right-click any table → "View Data"
   - Or double-click the table

## 🧪 Step 8: Test Your Backend

1. **Start your dev server:**
   ```powershell
   npm run dev
   ```

2. **Test registration** (in a new terminal):
   ```powershell
   curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}"
   ```

3. **Check DBeaver:**
   - Refresh the `User` table in DBeaver
   - You should see your new user! 🎉

## 📊 Useful DBeaver Features

### View Table Data
- Right-click table → "View Data"
- Or press `F3` with table selected

### Run SQL Queries
- Click "SQL Editor" → "New SQL Script" (or `Ctrl+]`)
- Example query:
  ```sql
  SELECT * FROM "User";
  SELECT * FROM "Application";
  ```

### Export Data
- Right-click table → "Export Data"
- Choose format (CSV, JSON, etc.)

### ER Diagram
- Right-click database → "View Diagram"
- Shows relationships between tables

## 🐛 Troubleshooting

### "psql: command not found" or "createdb: command not found"

**Solution:** Add PostgreSQL to your PATH:

1. Open "Environment Variables":
   - Search "Environment Variables" in Windows Start
   - Click "Environment Variables" button
   
2. Edit "Path" variable:
   - Under "System variables", find "Path"
   - Click "Edit"
   - Click "New"
   - Add: `C:\Program Files\PostgreSQL\16\bin`
   - Click "OK" on all dialogs
   
3. **Restart your terminal/PowerShell**

### "Connection refused" in DBeaver

**Check if PostgreSQL is running:**

1. Open "Services" (search in Windows Start)
2. Find "postgresql-x64-16" (or similar)
3. If stopped, right-click → "Start"

Or via PowerShell (as Administrator):
```powershell
Get-Service -Name postgresql*
Start-Service -Name postgresql-x64-16
```

### "Database does not exist"

Create it using pgAdmin or:
```powershell
cd "C:\Program Files\PostgreSQL\16\bin"
.\createdb.exe -U postgres interview_tracker
```

### "Password authentication failed"

- Make sure you're using the correct password from installation
- Default username is `postgres`
- Try resetting password in pgAdmin

### "Port 5432 already in use"

Another PostgreSQL instance might be running. Check Services and stop duplicates.

## 🎯 Quick Reference

### Connection String Format
```
postgresql://username:password@host:port/database
```

### Your Connection Details
```
Host: localhost
Port: 5432
Database: interview_tracker
Username: postgres
Password: [your password]
```

### Useful Commands

```powershell
# Check PostgreSQL service status
Get-Service -Name postgresql*

# Start PostgreSQL
Start-Service -Name postgresql-x64-16

# Stop PostgreSQL
Stop-Service -Name postgresql-x64-16

# Create database (from PostgreSQL bin folder)
.\createdb.exe -U postgres interview_tracker

# Drop database (⚠️ deletes all data)
.\dropdb.exe -U postgres interview_tracker
```

## 📚 Next Steps

1. ✅ PostgreSQL installed
2. ✅ Database created
3. ✅ DBeaver connected
4. ✅ Tables created with Prisma
5. ✅ Backend tested

Now you can:
- View and edit data in DBeaver
- Run SQL queries
- Monitor your database as you develop
- Export/import data

## 💡 Pro Tips

1. **Keep pgAdmin open** - Useful for quick database management
2. **Use DBeaver for queries** - Better SQL editor and data viewing
3. **Backup your data** - Right-click database in DBeaver → "Backup"
4. **Use Prisma Studio** - Run `npm run db:studio` for a web-based GUI

---

**Need help?** Common issues and solutions are in the Troubleshooting section above!
