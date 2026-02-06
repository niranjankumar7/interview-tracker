# API Testing Examples

Use these examples to test your backend API endpoints. You can use tools like:
- **Thunder Client** (VS Code extension)
- **Postman**
- **curl** (command line)
- **REST Client** (VS Code extension)

## 🔐 Authentication Flow

### 1. Register a New User

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "name": "John Doe",
    "createdAt": "2026-02-05T16:00:00.000Z"
  }
}
```

### 2. Login

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token!** You'll need it for authenticated requests.

---

## 👤 User Profile

### Get Current User

```http
GET http://localhost:3000/api/user/me
Authorization: Bearer YOUR_TOKEN_HERE
```

### Update Profile

```http
PUT http://localhost:3000/api/user/me
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "John Smith",
  "targetRole": "Senior Software Engineer",
  "experienceLevel": "Senior"
}
```

---

## 📝 Applications

### Create Application

```http
POST http://localhost:3000/api/applications
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "company": "Google",
  "role": "Software Engineer",
  "roleType": "SDE",
  "status": "applied",
  "applicationDate": "2026-02-01T00:00:00.000Z",
  "notes": "Applied through referral"
}
```

### Get All Applications

```http
GET http://localhost:3000/api/applications
Authorization: Bearer YOUR_TOKEN_HERE
```

### Get Single Application

```http
GET http://localhost:3000/api/applications/APPLICATION_ID_HERE
Authorization: Bearer YOUR_TOKEN_HERE
```

### Update Application

```http
PUT http://localhost:3000/api/applications/APPLICATION_ID_HERE
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "interview",
  "interviewDate": "2026-02-15T10:00:00.000Z",
  "notes": "First round scheduled"
}
```

### Update Application with Offer Details

```http
PUT http://localhost:3000/api/applications/APPLICATION_ID_HERE
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "offer",
  "offerDetails": {
    "baseSalary": 150000,
    "bonus": 20000,
    "equity": "50000 RSUs",
    "currency": "USD",
    "location": "San Francisco",
    "workMode": "Hybrid",
    "joiningDate": "2026-03-01T00:00:00.000Z",
    "benefits": ["Health Insurance", "401k Match", "Gym Membership"],
    "totalCTC": 220000
  }
}
```

### Delete Application

```http
DELETE http://localhost:3000/api/applications/APPLICATION_ID_HERE
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## ❓ Questions

### Create Question

```http
POST http://localhost:3000/api/questions
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "applicationId": "APPLICATION_ID_HERE",
  "questionText": "Implement a LRU Cache",
  "category": "DSA",
  "difficulty": "Medium",
  "askedInRound": "Round 1: Technical"
}
```

### Get All Questions

```http
GET http://localhost:3000/api/questions
Authorization: Bearer YOUR_TOKEN_HERE
```

### Filter Questions by Application

```http
GET http://localhost:3000/api/questions?applicationId=APPLICATION_ID_HERE
Authorization: Bearer YOUR_TOKEN_HERE
```

### Filter Questions by Category

```http
GET http://localhost:3000/api/questions?category=DSA
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🏃 Sprints

### Create Sprint

```http
POST http://localhost:3000/api/sprints
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "applicationId": "APPLICATION_ID_HERE",
  "interviewDate": "2026-02-20T10:00:00.000Z",
  "roleType": "SDE",
  "totalDays": 7,
  "dailyPlans": [
    {
      "day": 1,
      "date": "2026-02-13T00:00:00.000Z",
      "focus": "DSA",
      "blocks": [
        {
          "id": "block-1",
          "type": "morning",
          "duration": "2 hours",
          "tasks": [
            {
              "id": "task-1",
              "description": "Arrays and Strings",
              "completed": false,
              "category": "DSA"
            }
          ],
          "completed": false
        }
      ],
      "completed": false
    }
  ]
}
```

### Get All Sprints

```http
GET http://localhost:3000/api/sprints
Authorization: Bearer YOUR_TOKEN_HERE
```

### Filter Sprints by Status

```http
GET http://localhost:3000/api/sprints?status=active
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔓 Logout

```http
POST http://localhost:3000/api/auth/logout
```

---

## 🧪 Testing with curl

If you prefer command line:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get user profile (replace TOKEN with actual token)
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer TOKEN"

# Create application
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company":"Google","role":"SWE","status":"applied"}'
```

---

## 📊 Response Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists (e.g., duplicate email)
- `500 Internal Server Error` - Server error

---

## 🔍 Common Errors

### "Unauthorized"
- Make sure you're sending the `Authorization: Bearer TOKEN` header
- Check that your token hasn't expired (tokens expire after 7 days)
- Try logging in again to get a fresh token

### "Invalid input"
- Check the request body matches the expected schema
- Ensure required fields are present
- Verify data types (strings, numbers, dates)

### "Application not found"
- Verify the application ID is correct
- Ensure the application belongs to the authenticated user

---

## 💡 Tips

1. **Save your token**: After login, save the token to use in subsequent requests
2. **Use environment variables**: In Postman/Thunder Client, create a variable for the token
3. **Check Prisma Studio**: Use `npm run db:studio` to view database changes
4. **Enable logging**: Check the terminal running `npm run dev` for API logs
5. **Test incrementally**: Start with auth, then move to applications, questions, etc.

---

Happy testing! 🚀
