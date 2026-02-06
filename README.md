# Blueprint 🎯

**The Master Plan for Your Job Change**

> Built with [Tambo](https://tambo.co) for the **WeMakeDevs Hackathon**

Blueprint is a **Generative UI Interview Prep Tracker** that uses natural language to help you manage job applications and prepare systematically for interviews.

---

## 💡 The Problem

Students and early-career professionals face these challenges during job hunting:

| Challenge | Impact |
|-----------|--------|
| **Disorganized tracking** | Applications scattered across emails, spreadsheets, and sticky notes |
| **No structured prep plan** | Know what to study, but not *when* or *how much* |
| **Last-minute cramming** | Without a timeline, students panic-prep the day before |
| **Lost interview insights** | Questions asked in previous rounds are forgotten |
| **No accountability** | Easy to skip prep days without progress tracking |

---

## ✨ Our Solution

Blueprint transforms chaotic interview prep into a **structured system**:

### 🤖 Powered by Tambo's Generative UI

Instead of clicking through forms, you **describe your situation in plain English**:

```
"I have an interview at Google next Thursday for SDE role"
```

Tambo's AI automatically:
- Creates an application card in your pipeline
- Generates a 7-day prep sprint
- Shows today's tasks and countdown

### 📊 Key Features

| Feature | Description |
|---------|-------------|
| **AI Chat Interface** | Natural language commands to manage everything |
| **Kanban Pipeline** | Track applications: Applied → Interview → Offer |
| **Sprint Generator** | Auto-generates study plans based on interview date |
| **Daily Prep View** | Today's tasks, streaks, and progress tracking |
| **Question Bank** | Store questions asked at each company |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud: [Neon](https://neon.tech) / [Supabase](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/blueprint.git
cd blueprint
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp example.env.local .env.local
```

Edit `.env.local` with your values:

```bash
# Tambo AI - Get your free key at https://tambo.co/dashboard
NEXT_PUBLIC_TAMBO_API_KEY=your-tambo-api-key

# PostgreSQL Database
DATABASE_URL="postgresql://user:password@localhost:5432/interview_tracker"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-at-least-32-characters"
```

Also create a `.env` file for Prisma:

```bash
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/interview_tracker"' > .env
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **AI/Chat** | [Tambo React SDK](https://tambo.co) - Generative UI |
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT (bcrypt + jose) |

---

## 🎨 How Tambo Powers Blueprint

Tambo's Generative UI SDK is the **core innovation** of Blueprint:

### Natural Language → UI Components

```typescript
// Users speak naturally, Tambo generates the right UI
"Add interview at Microsoft for PM role next Friday"
  → Renders ApplicationCard + SprintSetup components

"Show my prep plan for tomorrow"
  → Renders DailyPlanView with tasks

"Add question: explain microservices architecture"
  → Adds to Question Bank, auto-categorizes as SystemDesign
```

### Registered Components & Tools

See `src/lib/tambo.ts` for all Tambo integrations:

- **Components**: Graph, ApplicationCard, PrepPlan, QuestionCard
- **Tools**: addApplications, updateApplicationStatus, addQuestions, markTopicComplete

---

## 📁 Project Structure

```
blueprint/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── api/               # REST API endpoints
│   │   ├── dashboard/         # Main dashboard
│   │   ├── pipeline/          # Kanban board
│   │   └── chat/              # AI chat interface
│   ├── components/            # React components
│   ├── lib/                   # Utilities, Tambo config, auth
│   └── services/              # API client services
├── prisma/                    # Database schema
└── docs/                      # Documentation
```

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [Quickstart](docs/setup/quickstart.md) | 5-minute setup |
| [Backend Setup](docs/setup/backend-setup.md) | Detailed configuration |
| [API Map](docs/api/api-map.md) | All API endpoints |
| [Testing Guide](docs/guides/testing.md) | How to test |

---

## 🏆 Built for Tambo Hackathon

This project was built for the **WeMakeDevs x Tambo Hackathon** to showcase:

- ✅ **Best Use of Tambo** - Core interaction via Generative UI
- ✅ **Real Problem** - Addresses actual student pain points
- ✅ **Production Ready** - Full backend with user auth and data persistence
- ✅ **Polished UX** - Dark mode, responsive design, smooth animations

---

## 👥 Team

Built with ❤️ for the Tambo Hackathon

---

## 📄 License

MIT License - feel free to use and modify!
