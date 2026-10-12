import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up · Bono" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-2xl font-bold">Join Bono</h1>
      <SignupForm />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Log in
        </Link>
      </p>
    </main>
  );
}
