import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent you a confirmation link. Open it to activate your account, then
          sign in.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-primary-700 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
