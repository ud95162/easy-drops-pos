import { redirect } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await isLoggedIn()) {
    redirect("/pos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-sand-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* EasyDrops logo */}
          <img
            src="/logo-mark.png"
            alt="EasyDrops"
            className="mb-3 h-16 w-auto"
          />
          <p className="text-sm text-slate-500">Enter the cashier password</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
