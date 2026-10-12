import Link from "next/link";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · Bono" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-2xl font-bold">Log in</h1>
      <LoginForm />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        New to Bono?{" "}
        <Link href="/signup" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Create an account
        </Link>
      </p>
    </main>
  );
}
