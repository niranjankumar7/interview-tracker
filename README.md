# Interview Tracker / Blueprint

**Blueprint** is a comprehensive job application and interview preparation tracking tool. It helps you organize your job search, track application statuses, prepare for interviews with AI-driven assistants, and manage your daily sprint plans.

## Features

- **Application Tracking**: Kanban board and list views to manage job applications through various stages (Applied, Shortlisted, Interview, Offer, Rejected).
- **Interview Preparation**: dedicated spaces for tracking interview rounds, questions, and feedback.
- **AI Integration (Tambo)**:
  - **Chat**: Interactive AI assistant to help with mock interviews, question generation, and answering queries.
  - **Generative UI**: Dynamic panels for adding questions, summarizing pipelines, and managing offers.
- **Sprint Planning**: Manage your daily tasks and interview prep goals effectively.
- **Data Sync**: Seamless synchronization between local state and the Postgres database.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **PostgreSQL**: v14 or higher (local instance or cloud provider like Neon/Supabase)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/niranjankumar7/interview-tracker.git
    cd interview-prep-tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Environment Setup

1.  Create a `.env.local` file in the root directory. You can use the example below as a template.

    ```bash
    # .env.local

    # Tambo AI Configuration
    # Get your API key from: https://tambo.ai
    NEXT_PUBLIC_TAMBO_API_KEY=your-valid-api-key-here
    NEXT_PUBLIC_TAMBO_URL=https://api.tambo.ai/v1

    # Database Configuration
    # Update with your local or cloud PostgreSQL connection string
    DATABASE_URL="postgresql://postgres:password@localhost:5432/interview_tracker"

    # JWT Secret for Authentication
    # Generate a secure string (e.g., `openssl rand -base64 32`)
    JWT_SECRET="your-secure-jwt-secret"
    ```

2.  **CRITICAL**: You must replace `your-valid-api-key-here` with a real API Key from Tambo AI to avoid 403 Forbidden errors in the chat.

3.  Ensure your PostgreSQL database is running and accessible via the `DATABASE_URL`.

## Database Setup

Initialize the database schema and seed it with initial data.

1.  **Generate Prisma Client:**
    ```bash
    npx prisma generate
    ```

2.  **Run Migrations:**
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Seed the Database:**
    ```bash
    npx prisma db seed
    ```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Testing

To verify the backend and different user flows, you can run the provided test script (PowerShell):

```bash
./test-backend.ps1
```

Or run specific unit tests if available:
```bash
npm run test
```
