# 18. Production Launch & Deployment Guide

This document provides a step-by-step guide to take the Multi-Tenant Gym Operating System live across all three channels: Supabase Backend, React Web Frontend, and React Native (Expo) Mobile App.

---

## Step 1: Deploy Supabase Backend (Edge Functions & Storage)

### I. Create Storage Buckets
On your Supabase Dashboard (**[hzpmhvydcothszxkdatb](https://supabase.com/dashboard/project/hzpmhvydcothszxkdatb)**):
1. Go to **Storage** on the left menu.
2. Click **New bucket** and create two public buckets:
   - `branding-assets` (For white-label logos, icons, splash screens)
   - `exercise-videos` (For exercise library demonstration video streaming)
3. Set their access controls to **Public**.

### II. Deploy Edge Functions
To deploy the Deno Edge Functions from your command line:
1. Log in to the CLI using a Personal Access Token (generate one under **Supabase Account -> Access Tokens**):
   ```bash
   supabase login --token <your_sbp_token>
   ```
2. Link your local project directory:
   ```bash
   supabase link --project-ref hzpmhvydcothszxkdatb
   ```
3. Deploy the Edge Functions:
   ```bash
   supabase functions deploy onboard-tenant
   supabase functions deploy verify-qr
   supabase functions deploy payments-router
   ```
4. Configure Secret Environment Variables on Supabase dashboard under **Settings -> API -> Edge Function Secrets**:
   - `HMAC_GLOBAL_SECRET` (e.g. `your_random_hmac_secret_key`)
   - `STRIPE_SECRET_KEY` (Your Stripe production API secret key)
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (Your Razorpay API credentials)

---

## Step 2: Host React Web Frontend (Admin/Staff Portal)

The React web application can be hosted on **Vercel** or **Netlify** for free with automated CI/CD deployments connected to your GitHub repository.

### I. Deploy to Vercel
1. Go to **[Vercel](https://vercel.com/)** and link your GitHub account.
2. Click **Add New -> Project** and select your repository **`gymmanagementsaas`**.
3. In the project settings:
   - Set **Framework Preset** to **Vite**.
   - Set **Root Directory** to `apps/web`.
4. Configure **Environment Variables**:
   - `REACT_APP_SUPABASE_URL`: `https://hzpmhvydcothszxkdatb.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cG1odnlkY290aHN6eGtkYXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDE3ODksImV4cCI6MjA5NzY3Nzc4OX0.RwcmIjUYrGaPA8uOEDEbn05YPHxjx_Jo12yGitFntYE`
5. Click **Deploy**. Vercel compiles the build and provides a public domain (e.g., `gymos-admin.vercel.app`).

---

## Step 3: Compile & Publish React Native Expo Mobile App

The mobile client-facing application is compiled and distributed using **Expo Application Services (EAS)**.

### I. Configure Environment Variables
Inside the mobile directory (`apps/mobile`), configure Expo environment variables:
- Add a `.env` file containing:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://hzpmhvydcothszxkdatb.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

### II. Build and Compile Binaries (EAS Build)
1. Install the EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo developer account:
   ```bash
   eas login
   ```
3. Initialize the project with EAS:
   ```bash
   eas project:init
   ```
4. Build the application for iOS and Android:
   ```bash
   eas build --platform all --profile production
   ```
   *EAS will handle generating the required developer certificates, provision the build on Expo's remote servers, and output compiled `.ipa` (iOS) and `.aab` (Android) binaries.*

### III. Submit to App Stores
Once builds are complete, submit them directly using:
```bash
eas submit --platform all
```
*This uploads the binaries to App Store Connect and Google Play Console for review and production release.*
