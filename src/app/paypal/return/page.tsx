import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { donations, nonprofitProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { isOrderId, isReturnKind, safeBackPath } from "@/lib/paypal/return-params";
import { ReturnStatus } from "./return-status";

// Where PayPal sends phone buyers back to (the redirect flow; see
// lib/paypal/return-urls.ts). PayPal adds ?token=<order id>, and the URL we
// gave it carries the kind of payment and the page to go back to.

export const metadata = { title: "PayPal · Bono" };

export default function PayPalReturnPage({ searchParams }: PageProps<"/paypal/return">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Return searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Return({ searchParams }: { searchParams: PageProps<"/paypal/return">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { kind, token, back, cancelled } = await searchParams;
  const backPath = safeBackPath(back) ?? "/feed";

  if (!isReturnKind(kind) || !isOrderId(token)) {
    return (
      <>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p>We couldn&apos;t tell which payment this was. If PayPal charged you, it shows in your PayPal account.</p>
        <Link href={backPath} className="self-start rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600">
          Continue
        </Link>
      </>
    );
  }

  // For the thank-you line: the nonprofit behind this donation, if it's the viewer's own.
  const [donation] =
    kind === "donation"
      ? await db
          .select({ name: nonprofitProfiles.name })
          .from(donations)
          .innerJoin(nonprofitProfiles, eq(nonprofitProfiles.userId, donations.nonprofitId))
          .where(and(eq(donations.paypalOrderId, token), eq(donations.donorId, session.user.id)))
      : [];

  return <ReturnStatus kind={kind} orderId={token} cancelled={cancelled === "1"} backPath={backPath} nonprofitName={donation?.name ?? null} />;
}
