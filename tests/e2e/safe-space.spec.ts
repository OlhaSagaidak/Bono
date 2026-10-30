import { expect, test } from "@playwright/test";
import { loginAs, main, q, userId } from "./helpers";

// Unverified nonprofits act like supporters (Oct 29 decision): visible and
// labeled "Not verified yet", able to comment and message, but with no Donate
// or Follow button, and no posts until verified.

test.afterEach(async () => {
  await q("delete from post_comments where body like 'E2E %'");
});

test("an unverified nonprofit's page is labeled, with Message but no Donate or Follow", async ({ browser }) => {
  const canvas = await userId("canvas-commons");
  const [row] = await q<{ verified: boolean }>("select verified_at is not null as verified from nonprofit_profiles where user_id = $1", [canvas]);
  test.skip(row.verified, "Canvas Commons is verified in this database; reset it to unverified to run this test.");

  const visitor = await loginAs(browser, "maya.chen");
  await visitor.goto(`/nonprofits/${canvas}`);
  await expect(main(visitor).getByText("Not verified yet.")).toBeVisible();
  await expect(main(visitor).getByRole("button", { name: "Message" })).toBeVisible();
  await expect(main(visitor).getByRole("button", { name: "Donate" })).toHaveCount(0);
  await expect(main(visitor).getByRole("button", { name: /^Follow/ })).toHaveCount(0);

  const owner = await loginAs(browser, "canvas-commons");
  await owner.goto(`/nonprofits/${canvas}`);
  await expect(main(owner).getByText("Your nonprofit isn't verified yet.")).toBeVisible();
});

test("an unverified nonprofit can comment like a supporter", async ({ browser }) => {
  const [post] = await q<{ id: string }>("select post_id as id from post_comments where body like 'This made my day%'");
  const page = await loginAs(browser, "canvas-commons");
  await page.goto(`/posts/${post.id}`);
  const comments = main(page).getByRole("region", { name: "Comments" });
  await comments.getByLabel("Write a comment…").fill("E2E from an unverified nonprofit");
  await comments.getByLabel("Write a comment…").press("Enter");
  await expect(comments.getByText("E2E from an unverified nonprofit")).toBeVisible();
});
