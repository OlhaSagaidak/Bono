import { expect, test } from "@playwright/test";
import { loginAs, main, q, userId } from "./helpers";

test("Interested, then Going, then clearing the response updates the counts", async ({ browser }) => {
  const maya = await userId("maya.chen");
  const [event] = await q<{ id: string }>("select id from events where title = 'Tree planting in Rainier Beach'");
  const [before] = await q<{ status: string }>("select status from event_rsvps where event_id = $1 and user_id = $2", [event.id, maya]);
  await q("delete from event_rsvps where event_id = $1 and user_id = $2", [event.id, maya]);

  try {
    const page = await loginAs(browser, "maya.chen");
    await page.goto(`/events/${event.id}`);
    const counts = main(page).getByText(/going.*interested/).first();
    const read = async () => (await counts.innerText()).replace(/\s+/g, " ");
    const start = await read();

    await main(page).getByRole("button", { name: "Interested" }).click();
    await expect(main(page).getByRole("button", { name: "✓ Interested" })).toBeVisible();
    await expect.poll(read).not.toBe(start);

    await main(page).getByRole("button", { name: "Going" }).click();
    await expect(main(page).getByRole("button", { name: "✓ Going" })).toBeVisible();

    await main(page).getByRole("button", { name: "✓ Going" }).click();
    await expect(main(page).getByRole("button", { name: "Going", exact: true })).toBeVisible();
    await expect.poll(read).toBe(start);
  } finally {
    await q("delete from event_rsvps where event_id = $1 and user_id = $2", [event.id, maya]);
    if (before) await q("insert into event_rsvps (event_id, user_id, status) values ($1, $2, $3)", [event.id, maya, before.status]);
  }
});
