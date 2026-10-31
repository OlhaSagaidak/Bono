# Demo video script (target 2:45, hard limit 3:00)

**Before recording:**
- Warm up the live site.
- Reset Canvas Commons to unverified (ask Claude).
- Log in to the sandbox buyer account in PayPal once, so approval is quick.
- Use one browser window at 1440×900, plus a phone (or a phone-sized window) for the reels.
- Rules: no music unless it's royalty free, no real brands on screen, and passwords never on screen.

| Time | On screen | Voice-over |
|---|---|---|
| 0:00–0:15 | Home feed as Maya, scrolling slowly | "We scroll for hours a day. What if every post in your feed came from a nonprofit, and the step from 'this moved me' to 'I helped' was one tap? This is Bono, a social feed where nonprofits are the influencers." |
| 0:15–0:35 | Point at the stories row, a post, the "Acme matches" banner, then click "Why am I seeing this?" | "Maya picked animals and refugees when she signed up. Her feed is ranked by an AI model that runs inside the app: it learns from what she donates to, follows, comments on, and even how long she looks at a post. And it tells her why she sees each one." |
| 0:35–0:45 | Click "Translate to English" on the Ukrainian post | "Some nonprofits post in Ukrainian or Spanish. Claude Haiku translates on request, and every translation is cached." |
| 0:45–1:20 | Click Donate on the Paws Haven post, pick $25, PayPal popup, approve, thank-you with the match and tier | "Donating is PayPal Orders v2, created and captured on the server. The payee is Paws Haven's own PayPal account, so the money goes straight to the nonprofit: Bono never holds it. Acme is matching gifts to animal shelters, so Bono pays the match to Paws Haven automatically with PayPal Payouts. And Maya just moved up to a new supporter tier." |
| 1:20–1:35 | Paws Haven profile, the Supporters section with badges | "Supporters earn public badges for each nonprofit they back: tiers only, never amounts. It gives people a reason to keep giving and to show it." |
| 1:35–1:55 | Log in as Acme: the campaigns page, pool progress, a boosted post's results | "Sponsors fund matching pools and boost posts through PayPal, and see exactly what their money did. Boosted posts are always labeled." |
| 1:55–2:25 | Log in as Canvas Commons (unverified): the banner, then Get verified, enter the EIN, the match, pay the $25 fee, the Verified badge | "A charity can't just claim to be one. Bono checks the EIN on demand against IRS records and requires six months of tax-exempt status, then the nonprofit pays a verification fee through PayPal, from its own PayPal account. Until then it can take part like a supporter, but it can't post or take donations." |
| 2:25–2:40 | Phone: reels snap-scroll, tap Donate, PayPal opens in the same tab | "It's built for phones too: stories, reels, messages and events. On a phone, PayPal opens in the same tab and brings you right back." |
| 2:40–2:55 | README architecture diagram, or a title card | "Bono runs on Next.js and Postgres with pgvector on Render. Every PayPal call was written with Claude Code and the APIMatic PayPal Context Plugin. Bono: scroll with purpose." |

**Cut if long:** the translation beat (0:35–0:45), then the badges beat.

**Accounts used:**
- maya.chen@bono.example (supporter)
- acme@bono.example (sponsor)
- canvas-commons@bono.example (unverified nonprofit)

The demo password is in seed.local.json. Approve PayPal with the sandbox Personal (buyer) account. For the verification fee, use Canvas Commons' own sandbox Business account.
