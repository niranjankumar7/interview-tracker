# 📬 Postman Collection - Quick Summary

## ✅ Files Created

1. ✅ **Interview-Tracker-API.postman_collection.json** - Complete API collection (19 endpoints)
2. ✅ **Interview-Tracker-Local.postman_environment.json** - Local environment configuration
3. ✅ **POSTMAN_GUIDE.md** - Comprehensive usage guide

---

## 🚀 Quick Import Instructions

### Step 1: Open Postman
Download from: https://www.postman.com/downloads/

### Step 2: Import Files
1. Click **Import** button (top left)
2. Drag and drop these files:
   - `Interview-Tracker-API.postman_collection.json`
   - `Interview-Tracker-Local.postman_environment.json`

### Step 3: Select Environment
- Click environment dropdown (top right)
- Select **"Interview Tracker - Local"**

### Step 4: Start Testing!
- Make sure backend is running: `npm run dev`
- Start with **Authentication → Register User**
- Then **Authentication → Login**
- Token is saved automatically! 🎉

---

## 📊 Collection Overview

### Total Endpoints: 19

| Category | Endpoints | Description |
|----------|-----------|-------------|
| 🔐 Authentication | 3 | Register, Login, Logout |
| 👤 User Profile | 2 | Get profile, Update profile |
| 💼 Applications | 6 | CRUD operations + offer details |
| ❓ Questions | 5 | Question bank with filters |
| 🏃 Sprints | 3 | Interview prep sprints |

---

## 🎯 Testing Workflow

```
1. Register User
   ↓
2. Login (saves token automatically)
   ↓
3. Create Application (saves applicationId)
   ↓
4. Create Questions
   ↓
5. Create Sprint
   ↓
6. Test all CRUD operations
```

---

## 🔧 Auto-Managed Variables

| Variable | Saved After | Used In |
|----------|-------------|---------|
| `authToken` | Login | All protected endpoints |
| `userId` | Register/Login | User operations |
| `applicationId` | Create Application | Questions, Sprints, Updates |

---

## 📝 Example Requests Included

✅ User registration with validation  
✅ Login with token management  
✅ Create application with all fields  
✅ Update application with offer details  
✅ Create questions (general + application-specific)  
✅ Create sprints with daily plans  
✅ Filter questions by category/application  
✅ Filter sprints by status  

---

## 🎨 Pre-configured Features

- ✅ Bearer token authentication
- ✅ Automatic token saving on login
- ✅ Environment variables for easy switching
- ✅ Test scripts for variable management
- ✅ Detailed descriptions for each endpoint
- ✅ Example request bodies
- ✅ Proper error handling examples

---

## 📖 Documentation

For detailed information, see **POSTMAN_GUIDE.md**

Topics covered:
- Complete endpoint reference
- Field options and enums
- Request/response examples
- Authentication flow
- Troubleshooting guide
- Testing tips and tricks

---

## 🎉 Ready to Use!

Your Postman collection is production-ready with:
- All 19 API endpoints configured
- Automatic authentication handling
- Environment variables setup
- Comprehensive documentation

**Start testing your API now!** 🚀

---

**Collection Version:** 1.0  
**Last Updated:** 2026-02-06  
**Backend URL:** http://localhost:3000
