import { asc, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { nonprofitProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { defaultCampaignDates } from "@/lib/matching/queries";
import { getCauses } from "@/lib/profiles/queries";
import { CampaignForm } from "./campaign-form";

export const metadata = { title: "New matching campaign · Bono" };

export default function NewCampaignPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">New matching campaign</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        When a supporter donates to a nonprofit your campaign covers, Bono adds your match from the pool and sends it
        straight to the nonprofit through PayPal.
      </p>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewCampaign />
      </Suspense>
    </main>
  );
}

async function NewCampaign() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "sponsor") redirect("/feed");
  const [causes, nonprofits] = await Promise.all([
    getCauses(),
    db
      .select({ value: nonprofitProfiles.userId, label: nonprofitProfiles.name })
      .from(nonprofitProfiles)
      .where(isNotNull(nonprofitProfiles.verifiedAt))
      .orderBy(asc(nonprofitProfiles.name)),
  ]);
  const { today, inAMonth } = defaultCampaignDates();
  return (
    <CampaignForm
      causes={causes.map((c) => ({ value: c.slug, label: c.label }))}
      nonprofits={nonprofits}
      today={today}
      inAMonth={inAMonth}
    />
  );
}
