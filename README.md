# Maliving

Maliving is a web app for running a small apartment building day to day — rooms, tenants, utility meters, monthly bills, payments, repair requests, and announcements, all in one place. Tenants get their own portal to check bills and pay, and can also check what they owe straight from LINE without logging in anywhere.

It's a real, working system — deployed on Vercel and used for actual monthly billing, not a demo.

## What it does

**For the admin**
- A dashboard with occupancy rate, revenue this month, overdue bills, and a floor-by-floor room map
- Manage rooms, tenants, meters, bills, payments, repair requests, and announcements
- Read electricity/water meters from a photo instead of typing them in by hand (see [Meter OCR](#meter-ocr) below)
- Check payment slips tenants upload and approve or reject them
- An AI assistant (`/admin/agent`) you can talk to in plain Thai — it calls the same backend actions the UI does, and has a sandbox mode so you can try commands without touching real data

**For tenants**
- View bills, print or download a receipt
- Pay a bill by scanning a PromptPay QR code and uploading the transfer slip for the admin to confirm
- Submit repair requests, read announcements, edit their own profile

**LINE bot**
- A tenant types their phone number into the building's LINE account and gets their current unpaid balance back immediately — no login needed

## How it's built

Everything runs through Next.js — there's no separate backend server. Supabase provides the database, auth, and file storage, all protected by row-level security policies so the database itself enforces who can see what.

```
Browser (admin / tenant portal)
        |
        v
Next.js App Router  ---- API routes ---->  Supabase (Postgres + Auth + Storage)
        |                                          ^
        |                                          |
        +--> Groq Vision (reads meter photos) ------+
        |
        +--> Groq LLM (AI assistant, function calling)
        |
        +--> LINE Messaging API (webhook in / messages out)
```

Requests are checked twice: `proxy.ts` keeps a tenant out of `/admin` pages (and vice versa) at the page level, and every API route re-checks the caller's role itself, since API routes aren't covered by the page-level check.

### Meter OCR

Admin uploads a photo of the meter → it's sent to Groq's vision model, which reads back the numbers for every room in that photo. Those numbers land as a **draft**, not a finished record — the admin opens each room, checks the number against what the camera actually shows, fixes it if the model misread a digit, and only then confirms it. A bill can't be generated for a room until its meter reading for that month has been confirmed this way. Same form works for typing a reading in by hand, in case a photo isn't practical.

### Payments

A tenant can either wait for the admin to record a cash/transfer payment, or pay themselves: scan a PromptPay QR generated for that exact bill amount, upload the slip, and it sits as **pending** until the admin looks at it and approves (marks the bill paid) or rejects it (tenant re-uploads). Nothing is marked paid just because a slip was uploaded — a person always confirms it.

### AI assistant

Instead of clicking through the UI, an admin can just describe what they want in Thai (“fill in this month's meters”, “generate bills for August”) and the assistant calls the real backend functions to do it. Anything that only reads data runs right away; anything that changes data stops and shows the admin exactly what it's about to do, waiting for a yes. A sandbox toggle lets you try commands risk-free — writes get simulated instead of applied.

## Tech stack

- **Framework**: Next.js 15 (App Router), Tailwind CSS 4
- **Database, auth, file storage**: Supabase (Postgres, with row-level security on every table)
- **Meter OCR**: Groq Vision (`meta-llama/llama-4-scout-17b-16e-instruct`)
- **AI assistant**: Groq (`openai/gpt-oss-120b`), function calling
- **Messaging**: LINE Messaging API
- **QR payments**: `promptpay-qr` + `qrcode`, generated server-side
- **Hosting**: Vercel, auto-deployed from `main`

## Running it locally

**1. Install dependencies**

```bash
npm install
```

**2. Set environment variables**

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
PROMPTPAY_ID=          # the building's own PromptPay phone number or tax ID
```

**3. Set up Supabase**

Run these files in the Supabase SQL editor, in order:

1. `supabase/schema.sql` — the 9 core tables and their RLS policies
2. `supabase/seed-admin.sql` — creates the first admin account
3. `supabase/migration_002_line_connected_at.sql`
4. `supabase/migration_003_payment_slips.sql` — payment status tracking + the storage bucket for slips

Also create a private storage bucket called **`meter-images`** in the Supabase dashboard, for the meter photos used in OCR.

**4. Start the dev server**

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project layout

```
app/
  (admin)/          public landing page
  (auth)/login/     login page
  admin/            everything the admin sees — rooms, tenants, meters, bills,
                     payments, repairs, announcements, AI assistant
  tenant/           everything the tenant sees
  api/              API routes (admin, tenant, LINE webhook)
lib/
  agent/            AI assistant: what it can do, how it does it, the loop that runs it
  supabase/         Supabase clients + the auth checks each API route runs
  promptpay.ts      builds the PromptPay QR
  bills.ts          bill status logic (unpaid / paid / overdue)
supabase/           schema, migrations, seed script
```

## Roles

- **admin** — full access to everything
- **tenant** — their own bills, repair requests, announcements, and profile; can submit a payment slip but can't mark anything as paid themselves

There's no self sign-up. An admin creates every tenant account by hand, since each one has to be tied to a real room. Roles live on `app_metadata.role` in Supabase Auth and are enforced by RLS everywhere, not just in the UI.

## Deploying

Pushing to `main` triggers an automatic deploy on Vercel. Remember to set the same environment variables there too, PromptPay ID included, or QR codes just won't show up on the live site.
