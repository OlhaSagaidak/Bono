import { expect, test } from "@playwright/test";
import { loginAs, main, q } from "./helpers";

// The giving pulse on the feed: the latest gifts, never who gave them, and
// the viewer's own gift joining the front the moment it goes through.

test("the feed shows the giving pulse and adds the viewer's gift at once", async ({ browser }) => {
  const [latest] = await q<{ name: string; amount_cents: number }>(
    `select n.name, d.amount_cents from donations d join nonprofit_profiles n on n.user_id = d.nonprofit_id
     where d.status = 'completed' and n.verified_at is not null order by d.completed_at desc limit 1`,
  );
  const page = await loginAs(browser, "maya.chen");
  const pulse = main(page).getByRole("region", { name: "The giving pulse" });
  await expect(pulse).toContainText(/given through Bono in the last 30 days/);
  await expect(pulse.getByRole("listitem").first()).toContainText(latest.name);
  // Donors stay private: no supporter's name in the pulse.
  await expect(pulse).not.toContainText(/Maya|Chen/);
  await page.screenshot({ path: `${process.env.CLAUDE_JOB_DIR ?? "/tmp"}/tmp/pulse-before.png` });

  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("bono:donated", {
        detail: { postId: null, amountCents: 2500, matchCents: 2500, nonprofitId: "x", nonprofitName: "Paws Haven", sponsorName: "Acme" },
      }),
    ),
  );
  const first = pulse.getByRole("listitem").first();
  await expect(first).toContainText("Your $25");
  await expect(first).toContainText("matched by Acme");
  await expect(first).toContainText("just now");
  await page.screenshot({ path: `${process.env.CLAUDE_JOB_DIR ?? "/tmp"}/tmp/pulse-after.png` });
});
