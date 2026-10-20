import { readFileSync } from "node:fs";
import type { Browser, Page } from "@playwright/test";
import pg from "pg";

process.loadEnvFile(".env");
const { demoPassword } = JSON.parse(readFileSync("seed.local.json", "utf8")) as { demoPassword: string };

export const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
export const q = async <T = Record<string, unknown>>(text: string, values: unknown[] = []) => (await db.query(text, values)).rows as T[];
export const userId = async (login: string) => (await q<{ id: string }>("select id from users where email = $1", [`${login}@bono.example`]))[0].id;

/** A fresh browser session logged in as a demo account (e.g. "maya.chen", "paws-haven"). */
export async function loginAs(browser: Browser, login: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${login}@bono.example`);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: /Log in/ }).click();
  await page.waitForURL(/\/feed/);
  return page;
}

/** The visible page's <main> (hidden routes stay in the DOM). */
export const main = (page: Page) => page.locator("main:visible");
