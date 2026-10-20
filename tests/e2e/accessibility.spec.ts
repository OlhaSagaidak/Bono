import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAs, q, userId } from "./helpers";

// An automated accessibility scan (axe) of the main signed-in pages, on a
// laptop and a phone: no serious or critical problems, and nothing wider than
// the screen. It can't judge everything (keyboard flows are tested elsewhere),
// but it catches contrast, labels and structure mistakes early.

for (const width of [1440, 390]) {
  test(`main pages at ${width}px`, async ({ browser }) => {
    test.setTimeout(180_000);
    const [maya, paws] = [await userId("maya.chen"), await userId("paws-haven")];
    const [post] = await q<{ id: string }>("select post_id as id from post_comments where body like 'This made my day%'");
    const [event] = await q<{ id: string }>("select id from events where status = 'scheduled' order by starts_at limit 1");
    const [conv] = await q<{ id: string }>(
      "select id from conversations where (user_low = $1 and user_high = $2) or (user_low = $2 and user_high = $1)",
      [maya, paws],
    );
    const paths = ["/feed", "/reels", "/messages", `/messages/${conv.id}`, "/following", "/events", `/events/${event.id}`, "/notifications", `/posts/${post.id}`, `/nonprofits/${paws}`, `/users/${maya}?tab=saved`, "/profile/edit"];

    const page = await loginAs(browser, "maya.chen");
    await page.setViewportSize({ width, height: 900 });
    const problems: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const v of violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
        problems.push(`${path}: ${v.id} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) problems.push(`${path}: ${overflow}px wider than the screen`);
    }
    expect(problems).toEqual([]);
  });
}
