import { BadgeCheck, HandCoins, HeartHandshake, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import feedShot from "../../public/landing/feed.jpg";
import reelShot from "../../public/landing/reel.jpg";

// The front door for visitors: what Bono is in one look, why it's different,
// and a straight path into the demo. Signed-in people skip it (see below).

const FEATURES = [
  {
    Icon: HandCoins,
    title: "Your gift goes straight to the nonprofit",
    text: "Donate in two taps with PayPal. The money lands in the nonprofit's own PayPal account; Bono never holds it.",
  },
  {
    Icon: HeartHandshake,
    title: "Sponsors double it",
    text: "Companies fund matching pools. When your gift qualifies, the match is paid to the nonprofit automatically.",
  },
  {
    Icon: BadgeCheck,
    title: "Only real, verified charities",
    text: "Every nonprofit is checked against IRS records before it can post or take a single dollar.",
  },
  {
    Icon: Sparkles,
    title: "A feed that learns what you care about",
    text: "It learns from what you read, like and give to, and tells you why you're seeing each post.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-[1fr_auto] md:py-20">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Social media for good</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Nonprofits are the influencers.
          </h1>
          <p className="max-w-xl text-lg text-zinc-700 dark:text-zinc-300">
            Scroll a feed made only of verified nonprofits: stories, reels and posts from people doing the work. When
            something moves you, give in two taps, and watch a sponsor match it.
          </p>
          {/* The hero is static; only the session-dependent part waits on the request. */}
          <Suspense fallback={<div className="h-12" aria-hidden />}>
            <SignedInRedirect />
          </Suspense>
        </div>
        {/* Two phone screens of the real app, overlapping. Decorative: the text above says what they show. */}
        <div aria-hidden className="relative mx-auto hidden h-[34rem] w-[22rem] sm:block">
          <Image
            src={feedShot}
            alt=""
            priority
            sizes="15rem"
            className="absolute left-0 top-0 w-60 rounded-[2rem] border-8 border-zinc-900 shadow-2xl dark:border-zinc-700"
          />
          <Image
            src={reelShot}
            alt=""
            sizes="13rem"
            className="absolute bottom-0 right-0 w-52 rounded-[2rem] border-8 border-zinc-900 shadow-2xl dark:border-zinc-700"
          />
        </div>
      </section>

      <section aria-labelledby="how-heading" className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 id="how-heading" className="sr-only">
            How Bono works
          </h2>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex flex-col gap-2">
                <span className="flex size-11 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="font-bold">{title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400">
        Built for the PayPal AI Hackathon. Every organization and person in this demo is fictional, and payments run in
        the PayPal sandbox.
      </footer>
    </main>
  );
}

// The landing page is for visitors. Signed-in people go where they can act:
// the feed, or profile setup if that isn't finished (the feed needs interests,
// donations need a payee).
async function SignedInRedirect() {
  const session = await getSession();
  if (session) redirect(session.user.onboarded ? "/feed" : "/onboarding");

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/signup"
        className="rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:outline-white"
      >
        Join Bono
      </Link>
      <Link
        href="/login"
        className="rounded-lg border border-zinc-300 px-6 py-3 font-semibold hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus:outline-white"
      >
        Log in
      </Link>
    </div>
  );
}
