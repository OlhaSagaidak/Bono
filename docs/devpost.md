# Devpost submission text

Draft for the Devpost form. Paste each section into the matching field.

## Tagline (short)

A social feed where nonprofits are the influencers: scroll guilt free, give in two taps with PayPal.

## Inspiration

I built Bono, a social network where nonprofits are the influencers. You can discover a cause on your lunch break, follow the people doing the work, and come back months later to see what the donations made possible.

I've volunteered with the Ukrainian Association of Washington State for several years. I've seen how much work it takes to reach people who would gladly give, volunteer, or tell a friend if they knew about a cause. I also know how easy it is to open my phone out of habit and scroll through posts I'll barely remember.

When I came across this hackathon, I wondered, What if the scroll itself could help? On Bono, a view, a like, a comment, a follow, or a donation can help a story you paused on show up in someone else's feed.

## What it does

Open Bono and you might meet Rex, a Seattle rescue dog who needs surgery. You give $25 in two taps with PayPal, straight to the rescue. A dollar-for-dollar sponsor match through PayPal Payouts brings it to $50. Later, the rescue shares the update you've been waiting for. Rex got adopted.

The feed learns from what you follow and what makes you pause. You can see why a post was recommended, read it in translation, and search in your own words.

Bono checks each U.S. nonprofit's EIN against IRS records and requires at least six months of tax-exempt status. The nonprofit pays a verification fee from the PayPal account it will use to receive donations. Search any nonprofit on Bono and see at a glance whether it's verified.

AG Grid dashboards show nonprofits what they raised and what sponsors added. Sponsors can ask the dashboard, "Where did my matches go?"

## How we built it

I built Bono solo in five weeks with Claude Code as my coding partner. I used Next.js 16, TypeScript, Postgres with pgvector, Auth.js, and Tailwind. Render hosts the app and database.

I used APIMatic's PayPal Context Plugin to build the Orders v2 and Payouts integrations against the API contracts. A local embedding model powers search and helps rank the feed. Claude Haiku translates posts, explains recommendations, and powers the dashboard agent in AG Studio.

## Challenges we ran into

PayPal can report the same capture in both its response and a webhook. I check amounts on the server, verify webhook signatures, and make both paths safe to retry so one gift can trigger at most one match.

The IRS check and PayPal verification payment had to fit into one signup flow a nonprofit could complete on its own. To run a media-heavy feed on Render's smallest plans, I compressed reels for phones and streamed media from Postgres. Caching and daily limits kept AI costs down.

## Accomplishments that we're proud of

My favorite moment is watching a gift and its sponsor match move the goal bar while the story is still on screen. The Giving Pulse shows what people are helping fund across Bono as gifts come in.

## What we learned

I learned that a donation flow earns trust after someone taps Donate. The app has to show what's happening when a payment takes time or fails. A handful of signals was enough to make the feed feel personal and explain why a post was there. I got the best results from Claude Code when I gave it a clear product goal and the actual API contract.

## What's next for Bono

Bono's next step is to go global. Bono already translates posts on tap and searches by meaning, so a nonprofit can share its story once, in its own language, and be read across borders. Next: nonprofit registries beyond the IRS, so a charity anywhere PayPal works, in more than 200 markets, can be verified and funded directly. If there's PayPal, there's Bono.

Happy mindful scrolling.

## Built with

nextjs, typescript, react, tailwindcss, postgresql, pgvector, drizzle, auth.js, paypal,
paypal-orders-v2, paypal-payouts, paypal-webhooks, apimatic, claude-code, anthropic,
claude-haiku, transformers.js, ag-grid, ag-studio, render, playwright

## Testing instructions for judges

Live demo: https://bono-h8b8.onrender.com (PayPal sandbox).

Try it in 2 minutes:
1. Log in as judge.supporter@bono.example (password Judge-sdnrzffysq) and press Donate on a
   Paws Haven post. Approve in PayPal with the sandbox buyer sb-5tuls53714143@personal.example.com
   (password %h,<0&LN).
2. The thank-you shows the money went straight to Paws Haven, whether a sponsor matched it, and
   your new supporter badge. Press "Why am I seeing this?" on any post.
3. Log in as judge.sponsor@bono.example (same password), open Dashboard, click "Customize & ask
   AI" and pick "Where did my matches go?".

More (including signing up and verifying your own nonprofit) is in the README's "For judges"
section.
