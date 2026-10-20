import { expect, test } from "@playwright/test";
import { loginAs, main, q, userId } from "./helpers";

test.afterEach(async () => {
  await q("delete from post_comments where body like 'E2E %'");
});

test("comment, react, reply and delete", async ({ browser }) => {
  const [post] = await q<{ id: string }>("select post_id as id from post_comments where body like 'This made my day%'");
  const page = await loginAs(browser, "maya.chen");
  await page.goto(`/posts/${post.id}`);
  const comments = main(page).getByRole("region", { name: "Comments" });

  await comments.getByLabel("Write a comment…").fill("E2E hello");
  await comments.getByLabel("Write a comment…").press("Enter");
  const mine = comments.locator(":scope > ul > li").filter({ hasText: "E2E hello" });
  await expect(mine).toBeVisible();

  // React with Love through the picker, then take it back.
  const top = mine.locator("> div").first();
  await top.getByRole("button", { name: "Choose a reaction" }).click();
  await top.getByRole("button", { name: "Love" }).click();
  await expect(top.getByRole("button", { name: "❤️ Love" })).toBeVisible();
  await top.getByRole("button", { name: "❤️ Love" }).click();
  await expect(top.getByRole("button", { name: "Like", exact: true })).toBeVisible();

  // Reply, nested under the comment.
  await top.getByRole("button", { name: "Reply" }).click();
  await mine.getByRole("textbox").fill("E2E reply");
  await mine.getByRole("textbox").press("Enter");
  await expect(mine.getByRole("list", { name: /Replies to/ }).getByText("E2E reply")).toBeVisible();

  // Deleting the comment takes its reply with it.
  await top.getByRole("button", { name: "Delete" }).click();
  await top.getByRole("button", { name: "Yes" }).click();
  await expect(mine).toHaveCount(0);
  expect((await q("select 1 from post_comments where body like 'E2E %'")).length).toBe(0);
});

test("the nonprofit hears about comments on its post", async ({ browser }) => {
  const paws = await userId("paws-haven");
  const [post] = await q<{ id: string }>("select id from posts where nonprofit_id = $1 order by created_at desc limit 1", [paws]);
  const maya = await loginAs(browser, "maya.chen");
  await maya.goto(`/posts/${post.id}`);
  const comments = main(maya).getByRole("region", { name: "Comments" });
  await comments.getByLabel("Write a comment…").fill("E2E for the bell");
  await comments.getByLabel("Write a comment…").press("Enter");
  await expect(comments.getByText("E2E for the bell")).toBeVisible();

  const org = await loginAs(browser, "paws-haven");
  await org.goto("/notifications");
  await expect(main(org).getByRole("link", { name: /Maya Chen.*commented on your post/ }).first()).toBeVisible();
});
