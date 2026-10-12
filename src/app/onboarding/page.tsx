import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { imageUrl } from "@/lib/images";
import { getCauses, getInterestSlugs, getNonprofitProfile, getSponsorProfile } from "@/lib/profiles/queries";
import { InterestsForm, NonprofitProfileForm, SponsorProfileForm } from "./forms";

export const metadata = { title: "Set up your profile · Bono" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <Onboarding />
      </Suspense>
    </main>
  );
}

// One URL for every role: the form shown depends on who is signed in. It also
// serves as the edit page, prefilled with what was saved before.
async function Onboarding() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id, role, name, onboarded } = session.user;
  const causes = (await getCauses()).map((c) => ({ value: c.slug, label: c.label }));

  if (role === "user") {
    const selected = await getInterestSlugs(id);
    return (
      <>
        <Heading
          title={onboarded ? "Your interests" : "What do you care about?"}
          intro="Pick the causes you want to see. Your feed starts here and learns as you scroll."
        />
        <InterestsForm causes={causes} selected={selected} />
      </>
    );
  }

  if (role === "nonprofit") {
    const profile = await getNonprofitProfile(id);
    return (
      <>
        <Heading
          title={onboarded ? "Edit your nonprofit profile" : "Set up your nonprofit"}
          intro="This is what supporters see on your page and next to your posts."
        />
        <NonprofitProfileForm
          causes={causes}
          initial={{
            name: profile?.name ?? name ?? "",
            mission: profile?.mission ?? "",
            paypalPayeeEmail: profile?.paypalPayeeEmail ?? "",
            causes: profile?.causes.map((c) => c.slug) ?? [],
            logoUrl: profile?.logoImageId ? imageUrl(profile.logoImageId) : undefined,
          }}
        />
      </>
    );
  }

  const profile = await getSponsorProfile(id);
  return (
    <>
      <Heading
        title={onboarded ? "Edit your sponsor profile" : "Set up your sponsor profile"}
        intro="Supporters see this on the campaigns you fund and the posts you boost."
      />
      <SponsorProfileForm
        initial={{
          name: profile?.name ?? name ?? "",
          about: profile?.about ?? "",
          logoUrl: profile?.logoImageId ? imageUrl(profile.logoImageId) : undefined,
        }}
      />
    </>
  );
}

function Heading({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{intro}</p>
    </div>
  );
}
