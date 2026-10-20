import { expect, test } from "@playwright/test";
import { loginAs, main, q, userId } from "./helpers";

// Unverified nonprofits are invisible to everyone but themselves.
test("an unverified nonprofit's page is hidden from others but shown to itself", async ({ browser, page }) => {
  const canvas = await userId("canvas-commons");
  await page.goto(`/nonprofits/${canvas}`);
  await expect(page.getByText("We couldn't find that page")).toBeVisible();

  const owner = await loginAs(browser, "canvas-commons");
  await owner.goto(`/nonprofits/${canvas}`);
  await expect(main(owner).getByText("Only you can see this page for now.")).toBeVisible();
});

test("an unverified nonprofit can't comment where others would see it", async ({ browser }) => {
  const [post] = await q<{ id: string }>("select post_id as id from post_comments where body like 'This made my day%'");
  const page = await loginAs(browser, "canvas-commons");
  await page.goto(`/posts/${post.id}`);
  const comments = main(page).getByRole("region", { name: "Comments" });
  await comments.getByLabel("Write a comment…").fill("E2E should not post");
  await comments.getByLabel("Write a comment…").press("Enter");
  await expect(comments.getByRole("alert")).toHaveText("Your organization can do this once it's verified.");
  expect((await q("select 1 from post_comments where body = 'E2E should not post'")).length).toBe(0);
});
