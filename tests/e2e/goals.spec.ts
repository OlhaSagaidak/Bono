import { expect, test } from "@playwright/test";
import { loginAs, main, q } from "./helpers";

// A post's fundraising goal: what the seed put behind it, and the bar moving
// the moment a gift goes through (the Donate dialog announces it; here the
// announcement is sent by hand, since PayPal can't be approved headlessly).

test("a goal post shows its progress and moves when the viewer gives", async ({ browser }) => {
  const [post] = await q<{ id: string; goal_cents: number; raised: number }>(
    `select p.id, p.goal_cents, coalesce(sum(d.amount_cents), 0)::int as raised
     from posts p left join donations d on d.post_id = p.id and d.status = 'completed'
     where p.goal_title like 'Rex%' group by p.id`,
  );
  const page = await loginAs(browser, "maya.chen");
  await page.goto(`/posts/${post.id}`);

  const bar = main(page).getByRole("progressbar", { name: /Rex's surgery/ });
  await expect(bar).toHaveAttribute("aria-valuenow", String(post.raised));
  await expect(bar).toHaveAttribute("aria-valuemax", String(post.goal_cents));
  const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;
  await expect(main(page)).toContainText(`${usd(post.raised)} of ${usd(post.goal_cents)}`);
  await page.screenshot({ path: `${process.env.CLAUDE_JOB_DIR ?? "/tmp"}/tmp/goal-before.png`, fullPage: false });

  // A $25 gift matched 1:1 by a sponsor.
  await page.evaluate(
    (postId) => window.dispatchEvent(new CustomEvent("bono:donated", { detail: { postId, amountCents: 2500, matchCents: 2500 } })),
    post.id,
  );
  await expect(bar).toHaveAttribute("aria-valuenow", String(Math.min(post.raised + 5000, post.goal_cents)));
  await expect(main(page)).toContainText("Thank you!");
  await page.screenshot({ path: `${process.env.CLAUDE_JOB_DIR ?? "/tmp"}/tmp/goal-after.png`, fullPage: false });

  // A gift from another post leaves this bar alone.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bono:donated", { detail: { postId: "other", amountCents: 100_000, matchCents: 0 } })));
  await expect(bar).toHaveAttribute("aria-valuenow", String(Math.min(post.raised + 5000, post.goal_cents)));
});
