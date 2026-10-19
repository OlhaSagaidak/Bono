import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { imageUrl } from "@/lib/images";
import { getAccount, getCauses, getInterestSlugs, getNonprofitProfile, getSponsorProfile } from "@/lib/profiles/queries";
import { InterestsForm, NonprofitProfileForm, SponsorProfileForm, SupporterProfileForm } from "./forms";

// One component for every role: the form shown depends on who is signed in.
// /onboarding uses it for first setup; /profile/edit for later changes,
// prefilled with what was saved before.
export async function ProfileEditor({ mode }: { mode: "setup" | "edit" }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id, role, name } = session.user;
  const onboarded = mode === "edit" || session.user.onboarded;
  const causes = (await getCauses()).map((c) => ({ value: c.slug, label: c.label }));

  if (role === "user") {
    const selected = await getInterestSlugs(id);
    if (mode === "setup" && !session.user.onboarded) {
      return (
        <>
          <Heading
            title="What do you care about?"
            intro="Pick the causes you want to see. Your feed starts here and learns as you scroll."
          />
          <InterestsForm causes={causes} selected={selected} />
        </>
      );
    }
    const account = await getAccount(id);
    return (
      <>
        <Heading title="Edit your profile" intro="Your name, photo and bio show on your profile and in messages." />
        <SupporterProfileForm
          initial={{
            name: account?.name ?? name ?? "",
            bio: account?.bio ?? "",
            photoUrl: account?.photoImageId ? imageUrl(account.photoImageId) : undefined,
          }}
        />
        <Heading title="Your interests" intro="Pick the causes you want to see. Your feed starts here and learns as you scroll." />
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
            bio: profile?.bio ?? "",
            paypalPayeeEmail: profile?.paypalPayeeEmail ?? "",
            causes: profile?.causes.map((c) => c.slug) ?? [],
            logoUrl: profile?.logoImageId ? imageUrl(profile.logoImageId) : undefined,
            verified: Boolean(profile?.verifiedAt),
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
          bio: profile?.bio ?? "",
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
