import Link from "next/link";

export default function AuthLegalLinks() {
  return (
    <p className="text-center text-[12px] leading-relaxed text-app-subtle">
      Door verder te gaan ga je akkoord met ons{" "}
      <Link href="/privacy" className="text-app-muted underline-offset-2 hover:text-app-text hover:underline">
        privacybeleid
      </Link>{" "}
      en onze{" "}
      <Link href="/voorwaarden" className="text-app-muted underline-offset-2 hover:text-app-text hover:underline">
        algemene voorwaarden
      </Link>
      .
    </p>
  );
}
