import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isLoggedIn()) {
    redirect("/pos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Easy Drops POS</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the cashier password</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
