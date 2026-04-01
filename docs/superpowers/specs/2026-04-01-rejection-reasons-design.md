# Rejection Reasons Feature — Design Spec

## Problem

When voters reject an image, the admin has no way to know *why*. This makes it hard to act on feedback — is the image blurry? Off-brand? Wrong content? Without reasons, rejection data is binary and not actionable.

## Solution

Add required free-text rejection reasons to the vote flow. When a user clicks Reject, the vote buttons transform into a reason input area (button-swap pattern). The reason is stored in the database, displayed in the admin dashboard, and included in CSV exports.

## Database

Add a nullable `reason` column to the existing `votes` table:

```sql
ALTER TABLE votes ADD COLUMN reason TEXT;
```

- `NULL` for approve votes
- Required non-empty text for reject votes
- No length limit enforced at DB level (validated in API)

## Vote Flow (UI)

**File:** `src/app/vote/page.tsx`

### Approve (unchanged)
Click Approve → card swipes right → next image appears. No reason prompted.

### Reject (new flow)
1. User clicks Reject
2. The Approve/Reject button area **transforms** into a reason input:
   - Label: "Rejecting — why?"
   - Textarea (auto-focused, placeholder: "Type your reason...")
   - Two buttons: "← Back" (cancel) and "Reject →" (submit, disabled until text entered)
3. Image stays fully visible above the input area
4. No card-exit animation fires on initial Reject click
5. User types reason, clicks "Reject →"
6. Card swipes left, optimistic UI shows next image
7. Vote + reason fires in background via `POST /api/vote`

### Back (cancel)
Restores original Approve/Reject buttons. No vote recorded.

### State
Add to component:
- `rejectMode: boolean` — whether the reason input is showing
- `rejectReason: string` — the textarea value

## API

**File:** `src/app/api/vote/route.ts`

Accept optional `reason` field in POST body:
```typescript
{ image_id: string, voter_name: string, vote: 'approve' | 'reject', reason?: string }
```

Validation:
- If `vote === 'reject'` and `reason` is missing or empty after trim → return 400
- If `vote === 'approve'`, `reason` is ignored (not stored)

Insert:
```typescript
await supabase.from('votes').insert({
  image_id,
  voter_name: voter_name.trim().toLowerCase(),
  vote,
  reason: vote === 'reject' ? reason.trim() : null,
})
```

## Admin Dashboard

**File:** `src/app/admin/dashboard/page.tsx`

### Disagreements Tab
Each reject vote chip currently shows `"voter ✗"`. Extend to show the reason inline:

```
kobi ✗ — "Image is too blurry"
```

The reason text displayed in a muted color after the voter name, truncated with ellipsis if long. Full reason visible on hover (title attribute).

### Voters API
**File:** `src/app/api/admin/voters/route.ts`

Add `reason` to the select query:
```typescript
.select('voter_name, vote, reason, image_id, images(filename, url)')
```

Include `reason` in the disagreements vote array:
```typescript
{ voter: v.voter_name, vote: v.vote, reason: v.reason }
```

### Disagreement Interface Update
```typescript
votes: { voter: string; vote: string; reason: string | null }[]
```

## CSV Export

**File:** `src/app/api/admin/export/route.ts`

Add `reason` to select:
```typescript
.select('voter_name, vote, reason, created_at, images(filename)')
```

Update CSV:
```
image_filename,voter_name,vote,reason,voted_at
```

Reason field: empty string for approvals, quoted text for rejections (handle commas/newlines in reason text with proper CSV escaping).

## Files Modified

| File | Change |
|------|--------|
| Supabase migration | `ALTER TABLE votes ADD COLUMN reason TEXT` |
| `src/app/vote/page.tsx` | Button-swap UI, reason textarea, updated handleVote |
| `src/app/api/vote/route.ts` | Accept and validate `reason` field |
| `src/app/api/admin/voters/route.ts` | Include `reason` in query and response |
| `src/app/admin/dashboard/page.tsx` | Show reasons in disagreements tab |
| `src/app/api/admin/export/route.ts` | Add `reason` to CSV export |

## Verification

1. **Vote flow**: Click Reject → reason input appears → type reason → submit → card swipes, vote recorded with reason
2. **Validation**: Click Reject → try submitting empty → button stays disabled
3. **Back button**: Click Reject → click Back → original buttons restored
4. **Approve unchanged**: Click Approve → works exactly as before
5. **Admin disagreements**: Rejection reasons visible next to voter chips
6. **CSV export**: Download CSV → reason column present with rejection text
7. **Build**: `npx next build` passes
