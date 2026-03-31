# Image Feedback Collection App — Design Spec

## Context

Build a web app for collecting approve/reject feedback on images from a small group (5-20 people). The app needs to be simple — no accounts, just a name to identify voters. An admin panel lets the owner manage images and view results. Hosted on Vercel with Supabase as the backend.

## Tech Stack

- **Framework:** Next.js 14+ (App Router), TypeScript
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (public bucket for images)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Design:** Dark mode theme — dark backgrounds so images pop

## Database Schema

### `images` table

| Column       | Type        | Notes                          |
|-------------|-------------|--------------------------------|
| id          | uuid (PK)   | auto-generated via gen_random_uuid() |
| filename    | text        | original filename              |
| storage_path| text        | path in Supabase storage bucket |
| url         | text        | public URL for the image       |
| created_at  | timestamptz | default now()                  |

### `votes` table

| Column      | Type        | Notes                          |
|------------|-------------|--------------------------------|
| id         | uuid (PK)   | auto-generated via gen_random_uuid() |
| image_id   | uuid (FK)   | references images(id) ON DELETE CASCADE |
| voter_name | text        | name entered at login screen   |
| vote       | text        | 'approve' or 'reject'         |
| created_at | timestamptz | default now()                  |

**Constraints:**
- Unique constraint on `(image_id, voter_name)` — one vote per person per image
- Foreign key `image_id` references `images(id)` with CASCADE delete (deleting an image removes its votes)

## User-Facing Pages

### 1. Login Screen (`/`)

- App title: "Image Feedback"
- Subtitle: "Help us pick the best images"
- Single text input: "Enter your name"
- Button: "Start Reviewing"
- On submit: store voter name in localStorage, redirect to `/vote`
- If name already in localStorage, redirect to `/vote` automatically

### 2. Voting Screen (`/vote`)

- Progress indicator: "3 of 12" (current position / total images for this voter)
- Large image display, centered, taking most of the viewport
- Two buttons below: "Reject" (red) and "Approve" (green)
- On click: submit vote via POST `/api/vote`, then load next unvoted image
- If no voter name in localStorage, redirect to `/`
- Fetch logic: GET `/api/images?voter={name}` returns the next image this voter hasn't voted on
- Smooth transition between images (simple fade or slide)

### 3. Done Screen (`/done`)

- Checkmark icon
- "All done!" heading
- "You reviewed X images" subtitle
- Summary: count of approved and rejected (green/red numbers)
- "Thanks for your feedback!" message
- Stats fetched from API based on voter name

## Admin Pages

### 4. Admin Login (`/admin`)

- Simple password input field
- Button: "Enter"
- Password checked against `ADMIN_PASSWORD` environment variable
- On success: set an admin session cookie, redirect to `/admin/dashboard`
- Middleware protects `/admin/dashboard` and all `/api/admin/*` routes

### 5. Admin Dashboard (`/admin/dashboard`)

**Header:**
- Title: "Image Feedback — Admin"
- Stats: total images count, total votes count
- Buttons: "Upload Images" (opens bulk upload modal), "Export CSV"

**Filter Bar:**
- Preset filter buttons: All, ≥ 80%, ≥ 60%, < 50%, No votes
- Shows count: "Showing X of Y"
- Client-side filtering (all data loaded at once — small dataset)

**Bulk Actions Bar:**
- Select all checkbox
- "Download Selected" button — downloads selected images as ZIP
- "Reset Votes" button — clears votes for selected images
- "Delete" button — removes selected images and their votes

**Image Table:**
- Columns: Checkbox, Thumbnail, Filename, Approved count, Rejected count, Total votes, Approval %, Actions
- Approval % column is sortable (click to toggle asc/desc)
- Approval % displayed as colored pill (green ≥60%, red <50%, gray for no votes)
- Per-row actions: Reset votes, Delete
- Thumbnails are small (48x36px) previews

**Bulk Upload:**
- Modal/dialog with drag-and-drop zone
- Also has file picker button as fallback
- Accepts multiple image files (jpg, png, webp, gif)
- Shows upload progress for each file
- Uploads to Supabase Storage in parallel
- Creates database records for each uploaded image

## API Routes

### Public

| Endpoint | Method | Body/Params | Response | Notes |
|----------|--------|------------|----------|-------|
| `/api/images` | GET | `?voter={name}` | `{ image: { id, url } \| null, remaining: number, total: number }` | Returns next unvoted image for voter |
| `/api/vote` | POST | `{ image_id, voter_name, vote }` | `{ success: true }` | Records vote, 409 if duplicate |
| `/api/voter-stats` | GET | `?voter={name}` | `{ total, approved, rejected }` | For the done screen summary |

### Admin (protected by middleware)

| Endpoint | Method | Body/Params | Response | Notes |
|----------|--------|------------|----------|-------|
| `/api/admin/upload` | POST | FormData with multiple files | `{ uploaded: number }` | Bulk upload to Supabase Storage + DB |
| `/api/admin/delete` | DELETE | `{ image_ids: string[] }` | `{ deleted: number }` | Removes images from storage + DB (cascade deletes votes) |
| `/api/admin/reset` | POST | `{ image_ids: string[] }` | `{ reset: number }` | Deletes votes for specified images |
| `/api/admin/export` | GET | — | CSV file download | Columns: image_filename, voter_name, vote, voted_at |
| `/api/admin/download` | POST | `{ image_ids: string[] }` | ZIP file download | Streams ZIP of selected images |
| `/api/admin/images` | GET | — | `{ images: [...] }` | All images with vote counts for admin table |

## Auth & Security

- **Voter identification:** Name stored in localStorage. No authentication — this is a trust-based system for small groups.
- **Admin auth:** Single password from `ADMIN_PASSWORD` env var. Stored as HTTP-only cookie after successful login. Middleware checks cookie on all `/admin/dashboard` and `/api/admin/*` routes.
- **Vote deduplication:** Unique DB constraint on (image_id, voter_name) prevents double votes. API returns 409 if attempted.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_PASSWORD` | Password for admin panel access |

## Verification Plan

1. **Local dev:** Run `npm run dev`, test full user flow (login → vote → done)
2. **Admin flow:** Test upload, filtering, bulk download, CSV export, delete, reset
3. **Duplicate prevention:** Try voting on same image twice with same name — should be blocked
4. **Multiple voters:** Open in two browsers with different names — each sees all images independently
5. **Deploy to Vercel:** Push to GitHub, connect to Vercel, set env vars, verify production build
