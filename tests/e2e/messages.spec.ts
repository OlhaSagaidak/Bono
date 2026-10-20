import { expect, test } from "@playwright/test";
import { loginAs, q, userId } from "./helpers";

test.afterEach(async () => {
  await q("delete from messages where body like 'E2E %'");
});

test("two people chat, and outsiders can't read it", async ({ browser }) => {
  const [maya, paws] = [await userId("maya.chen"), await userId("paws-haven")];
  const [conv] = await q<{ id: string }>(
    "select id from conversations where (user_low = $1 and user_high = $2) or (user_low = $2 and user_high = $1)",
    [maya, paws],
  );

  const a = await loginAs(browser, "maya.chen");
  const b = await loginAs(browser, "paws-haven");
  await a.goto(`/messages/${conv.id}`);
  await b.goto(`/messages/${conv.id}`);

  await a.getByLabel("Message Paws Haven").fill("E2E ping");
  await a.getByLabel("Message Paws Haven").press("Enter");
  // Arrives by polling (every 3 s).
  await expect(b.getByRole("log").getByText("E2E ping")).toBeVisible({ timeout: 10_000 });

  await b.getByLabel("Message Maya Chen").fill("E2E pong");
  await b.getByRole("button", { name: "Send" }).click();
  await expect(a.getByRole("log").getByText("E2E pong")).toBeVisible({ timeout: 10_000 });

  const outsider = await loginAs(browser, "ben.fischer");
  expect((await outsider.request.get(`/api/messages/${conv.id}`)).status()).toBe(404);
});
