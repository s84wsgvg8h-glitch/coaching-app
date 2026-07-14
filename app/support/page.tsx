import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { getSupportEmail, getSupportMailto } from "@/lib/supportContact";

export const metadata: Metadata = {
  title: "Support · Limitless Coaching",
  description: "Contact en hulp voor Limitless Coaching",
};

export default function SupportPage() {
  const email = getSupportEmail();

  return (
    <LegalPageShell title="Support" updated="9 juli 2026">
      <section>
        <h2 className="text-lg font-semibold">Hulp nodig?</h2>
        <p className="mt-2 text-app-muted">
          Limitless Coaching is een invite-only coachingplatform voor powerlifting
          coaches en atleten. Voor technische vragen, accountproblemen of
          privacyverzoeken kun je contact opnemen via onderstaande kanalen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Contact</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-app-muted">
          <li>
            E-mail:{" "}
            <a href={getSupportMailto()} className="font-medium text-app-text underline">
              {email}
            </a>
          </li>
          <li>
            Atleten: neem ook contact op met je coach via{" "}
            <Link href="/chat" className="font-medium text-app-text underline">
              chat
            </Link>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="mt-2 text-app-muted">
          Je kunt je account zelf verwijderen via{" "}
          <Link href="/profile?section=account" className="font-medium text-app-text underline">
            Profiel → Account → Account verwijderen
          </Link>
          . Zie ook ons{" "}
          <Link href="/privacy" className="font-medium text-app-text underline">
            privacybeleid
          </Link>{" "}
          voor je rechten.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Meldingen en veiligheid</h2>
        <p className="mt-2 text-app-muted">
          Ongepaste chatberichten kun je melden via het menu op een bericht of
          gesprek. Gebruikers kunnen worden geblokkeerd via chat-opties. Meer
          informatie staat in ons{" "}
          <Link href="/voorwaarden#ugc" className="font-medium text-app-text underline">
            communitybeleid
          </Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
