## Goal

Update the existing Community Vote "Start Vote" button in `src/components/staff/MarketingHub.tsx` so it POSTs the correct payload to the n8n Voting webhook. No redesign, no rebuild — only the changes needed to satisfy the webhook contract.

## Current state

- File: `src/components/staff/MarketingHub.tsx`
- The Community Vote card has: `voteTitle`, `optionA`, `optionB`, `closingDate`.
- "Start Vote" calls `handleCreateVote` → `useCreateVote` (DB insert into `community_votes`). No webhook call. No `message` field. Only 2 options.
- The n8n webhook requires: `title`, `message`, `options[]` (2–6 strings), `send_sms`, `send_email`, `audience`, `vote_link`.

## Changes (surgical)

All edits inside `src/components/staff/MarketingHub.tsx` only.

1. Add minimal new state:
   - `voteMessage: string` — required by webhook.
   - `isStartingVote: boolean` — loading flag for the button.
   - Convert the two existing inputs into a `voteOptions: string[]` array seeded with two empty strings, while keeping the existing 2-column grid look. Render the array via `.map()` so we can support 2–6 options with a small "+ Add option" button (and a remove (×) on rows beyond the first two). This keeps the existing visual style — just a tiny extension, not a redesign.

2. Add a new `Message` textarea between Title and Options (one extra field, same card, same styling tokens).

3. Replace `handleCreateVote` with `startCommunityVote` using exactly the user-specified pattern:
   - Trim/clean options, drop empties, slice to max 6.
   - Validate: title required, message required, ≥2 options.
   - Toast errors via existing `sonner` `toast`.
   - `setIsStartingVote(true)` → `fetch('https://kyle2000.app.n8n.cloud/webhook/Voting-webhook', { POST, JSON })` with payload `{ title, message, options, send_sms: true, send_email: true, audience: "demo", vote_link: "" }`.
   - Throw on non-OK; safe `try/catch` on `response.json()`.
   - Success toast: "Community vote started. Demo SMS/email triggered."
   - Error toast: "Community vote could not be started. Check the voting workflow and try again."
   - Always `setIsStartingVote(false)` in `finally`.
   - Reset the form inputs on success.

4. Wire the Start Vote button:
   - `onClick={startCommunityVote}`
   - `disabled={isStartingVote || !voteTitle.trim() || !voteMessage.trim() || voteOptions.filter(o => o.trim()).length < 2}`
   - Loading label: "Starting vote..." (spinner kept).

## Explicitly NOT changing

- `useBroadcasts.ts` / `useCreateVote` / `community_votes` table — left intact (Active Votes list still reads existing rows).
- Closing Date picker UI — left in place but no longer required for the webhook (kept as optional metadata; not sent because the n8n payload schema doesn't include it). Validation no longer blocks on it.
- Broadcasts, Google Reviews, Social Media, KDS, payments, orders, RLS, edge functions — untouched.
- No Supabase service keys, no customer fetching on the frontend. The browser only POSTs the campaign payload to n8n; n8n handles SMS/email.

## Acceptance check

- Click Start Vote → network panel shows POST to `https://kyle2000.app.n8n.cloud/webhook/Voting-webhook` with the exact payload shape above.
- Invalid inputs blocked with the specified toasts.
- Button disables and shows "Starting vote..." while in flight.
- Existing Community Vote card layout remains visually intact (one extra textarea + dynamic options list).