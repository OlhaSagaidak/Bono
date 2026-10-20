import { expect, test } from "@playwright/test";
import { loginAs, main, q, userId } from "./helpers";

test("a saved post shows on your private Saved tab, and only there", async ({ browser }) => {
  const maya = await userId("maya.chen");
  const [post] = await q<{ id: string }>(
    "select p.id from posts p join nonprofit_profiles n on n.user_id = p.nonprofit_id where n.verified_at is not null and not exists (select 1 from post_saves s where s.post_id = p.id and s.user_id = $1) limit 1",
    [maya],
  );
  try {
    const page = await loginAs(browser, "maya.chen");
    await page.goto(`/posts/${post.id}`);
    await main(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(main(page).getByRole("button", { name: "Saved" })).toBeVisible();

    await page.goto(`/users/${maya}?tab=saved`);
    await expect(main(page).locator(`article[data-post-id="${post.id}"]`)).toBeVisible();

    const other = await loginAs(browser, "sofia.rossi");
    await other.goto(`/users/${maya}?tab=saved`);
    await expect(main(other).getByRole("heading", { name: "Follows" })).toBeVisible();
    await expect(main(other).locator(`article[data-post-id="${post.id}"]`)).toHaveCount(0);
  } finally {
    await q("delete from post_saves where user_id = $1 and post_id = $2", [maya, post.id]);
  }
});

test("a like reaches the nonprofit's bell", async ({ browser }) => {
  const [maya, paws] = [await userId("maya.chen"), await userId("paws-haven")];
  const [post] = await q<{ id: string }>(
    "select id from posts where nonprofit_id = $1 and not exists (select 1 from post_likes l where l.post_id = posts.id and l.user_id = $2) limit 1",
    [paws, maya],
  );
  try {
    const page = await loginAs(browser, "maya.chen");
    await page.goto(`/posts/${post.id}`);
    await main(page).getByRole("button", { name: /^Like/ }).click();
    await expect(main(page).getByRole("button", { name: /^Liked/ })).toBeVisible();

    const org = await loginAs(browser, "paws-haven");
    await org.getByRole("button", { name: /^Notifications/ }).click();
    await expect(org.getByRole("link", { name: /Maya Chen.*liked your post/ }).first()).toBeVisible();
  } finally {
    await q("delete from post_likes where user_id = $1 and post_id = $2", [maya, post.id]);
  }
});
