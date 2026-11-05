import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardLoader } from "@/components/dashboard/dashboard-loader";
import { db } from "@/db";
import { nonprofitProfiles, sponsorProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { nonprofitCampaigns, nonprofitDonations, sponsorBoosts, sponsorCampaigns, sponsorMatches } from "@/lib/dashboards/queries";
import type { DashboardData } from "@/lib/dashboards/types";

export const metadata = { title: "Dashboard · Bono" };

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id, role } = session.user;
  if (role !== "nonprofit" && role !== "sponsor") redirect("/feed");

  // Only the signed-in organization's own rows ever reach the page.
  let data: DashboardData;
  if (role === "nonprofit") {
    const [profile, donations, campaigns] = await Promise.all([
      db.query.nonprofitProfiles.findFirst({ where: eq(nonprofitProfiles.userId, id), columns: { name: true } }),
      nonprofitDonations(id),
      nonprofitCampaigns(id),
    ]);
    data = { kind: "nonprofit", orgName: profile?.name ?? "your nonprofit", donations, campaigns };
  } else {
    const [profile, matches, campaigns, boosts] = await Promise.all([
      db.query.sponsorProfiles.findFirst({ where: eq(sponsorProfiles.userId, id), columns: { name: true } }),
      sponsorMatches(id),
      sponsorCampaigns(id),
      sponsorBoosts(id),
    ]);
    data = { kind: "sponsor", orgName: profile?.name ?? "your company", matches, campaigns, boosts };
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{data.orgName} dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {role === "nonprofit"
            ? "Donations, sponsor matches and campaigns that cover you. Click a chart to filter the rest of the page."
            : "Your matching pools, where your matches went, and what your boosts did. Click a chart to filter the rest of the page."}
        </p>
      </div>
      <DashboardLoader data={data} licenseKey={process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY} />
    </>
  );
}
