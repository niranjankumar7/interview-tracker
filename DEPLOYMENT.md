# Deployment Guide: Vercel + Neon Postgres

This guide outlines the steps to deploy the **Interview Tracker** application to **Vercel** using a **Neon** serverless Postgres database.

## Prerequisites

1.  **Vercel Account**: [Sign up here](https://vercel.com/signup).
2.  **Neon Account**: [Sign up here](https://neon.tech).
3.  **GitHub Account**: You should have this repository pushed to your GitHub.

---

## Part 1: Database Setup (Neon)

1.  **Create a Project**:
    -   Log in to the [Neon Console](https://console.neon.tech).
    -   Click **"New Project"**.
    -   Name it `interview-tracker` (or similar).
    -   Select a region close to your users (e.g., `US East (N. Virginia)`).
    -   Click **"Create Project"**.

2.  **Get Configuration**:
    -   On the **Dashboard** of your new project, look for the **Connection Details** section.
    -   Should show a connection string like `postgres://user:password@ep-...,neon.tech/neondb...`
    -   **Important**: Check the **"Pooled connection"** checkbox if available. This is better for Vercel's serverless environment.
    -   Copy this Connection String. You will need it mainly for Vercel.

---

## Part 2: Vercel Deployment

1.  **Import Project**:
    -   Log in to [Vercel](https://vercel.com).
    -   Click **"Add New..."** -> **"Project"**.
    -   Select your **`interview-track-plan`** repository and click **"Import"**.

2.  **Configure Project**:
    -   **Framework Preset**: Vercel should auto-detect `Next.js`.
    -   **Root Directory**: Leave as `./` (default).
    -   **Build & Output Settings**: Default `npm run build` is fine.

3.  **Environment Variables (Crucial)**:
    -   Expand the **"Environment Variables"** section. Add the following:

    | Key | Value / Instructions |
    | :--- | :--- |
    | `DATABASE_URL` | Paste the **Connection String** from Neon. |
    | `NEXT_PUBLIC_TAMBO_API_KEY` | Copy from your local `.env`. |
    | `JWT_SECRET` | Generate a random string. Use `openssl rand -base64 32`. This is required by `/api/auth/login` and protected API routes. |
    | `NEXT_PUBLIC_API_URL` | Set this to your deployed app URL (for example `https://your-app.vercel.app`) if your frontend needs an explicit API base URL. |

4.  **Deploy**:
    -   Click **"Deploy"**.
    -   Wait for the build to complete. It might take a minute or two.
    -   If successful, you will see a "Congratulations!" screen.

---

## Part 3: Post-Deployment Database Migration

After the first deployment, your database is likely empty (no tables). You need to push the schema to Neon.

**Option A: Push from Local Machine (Easiest)**
1.  In your local terminal, run the following command (replace with your ACTUAL Neon connection string):
    ```bash
    DATABASE_URL="postgres://..." npx prisma db push
    ```
    *Note: Use quotes around the URL.*
    
2.  This command creates all the tables in your Neon database defined in `prisma/schema.prisma`.

**Option B: Setup Build Command (Automated)**
We have already added `"postinstall": "prisma generate"` to `package.json`, which ensures the client is ready. 
For migrations, `prisma db push` is often manually run or run as part of a custom build step, but running it locally once is usually sufficient for a solo project.

---

## Troubleshooting

-   **500 Errors on Login**: usually means `JWT_SECRET` or `DATABASE_URL` is missing or incorrect.
-   **Database Errors**: Ensure you ran `npx prisma db push` against the Neon URL.
-   **Build Failures**: Check the Vercel logs. Common issues are type errors or eslint errors (Next.js fails build on these by default).

---

**You're all set!** Visit your Vercel URL to start using the app.
