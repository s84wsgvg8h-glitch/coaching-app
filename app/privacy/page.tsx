import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { getSupportEmail, getSupportMailto } from "@/lib/supportContact";

export const metadata: Metadata = {
  title: "Privacybeleid · Limitless Coaching",
  description: "Privacybeleid van Limitless Coaching",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacybeleid" updated="22 juni 2026">
      <section>
        <h2 className="text-lg font-semibold">1. Wie zijn wij</h2>
        <p className="mt-2 text-app-muted">
          Limitless Coaching biedt een online coachingplatform voor powerlifting
          coaches en atleten. Wij verwerken persoonsgegevens om de app te laten
          functioneren, coaching te faciliteren en de veiligheid van het platform
          te waarborgen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. Welke gegevens verwerken wij</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-app-muted">
          <li>Accountgegevens: naam, e-mailadres, rol (coach/atleet/admin)</li>
          <li>Trainingsgegevens: programma&apos;s, logs, RPE, video&apos;s, check-ins</li>
          <li>Communicatie: chatberichten tussen coach en atleet</li>
          <li>Profiel- en betalingsmetadata waar van toepassing</li>
          <li>Technische gegevens: sessie- en gebruikslogs voor beveiliging</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">3. Doeleinden</h2>
        <p className="mt-2 text-app-muted">
          Wij gebruiken gegevens om accounts te beheren, coachingdiensten te
          leveren, communicatie mogelijk te maken, betalingen te verwerken (merch),
          push-herinneringen te sturen (met toestemming) en het platform te
          verbeteren en beveiligen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">4. Bewaartermijn</h2>
        <p className="mt-2 text-app-muted">
          Gegevens worden bewaard zolang je account actief is of zolang nodig voor
          coaching, wettelijke verplichtingen of geschillen. Na accountverwijdering
          worden gegevens binnen redelijke termijn verwijderd, behoudens wettelijke
          bewaarplicht.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">5. Delen met derden</h2>
        <p className="mt-2 text-app-muted">
          Wij delen gegevens alleen met verwerkers die nodig zijn voor de dienst:
          Supabase (database/auth), Vercel (hosting), Stripe (betalingen), Resend
          (e-mail) en OpenAI (AI-functies, indien gebruikt). Met coaches delen
          atleten gegevens binnen het platform voor coachingdoeleinden.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">6. Jouw rechten</h2>
        <p className="mt-2 text-app-muted">
          Je hebt recht op inzage, rectificatie, verwijdering, beperking,
          dataportabiliteit en bezwaar. Je kunt je account zelf verwijderen via
          Profiel → Account → Account verwijderen. Voor andere verzoeken kun je
          contact opnemen via je coach of platformbeheerder.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">7. Beveiliging</h2>
        <p className="mt-2 text-app-muted">
          Wij nemen passende technische maatregelen, waaronder versleutelde
          verbindingen (HTTPS), row-level security in de database en
          toegangscontrole op API-routes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">8. Contact</h2>
        <p className="mt-2 text-app-muted">
          Vragen over privacy? Neem contact op via{" "}
          <a href={getSupportMailto()} className="font-medium text-app-text underline">
            {getSupportEmail()}
          </a>{" "}
          of onze{" "}
          <a href="/support" className="font-medium text-app-text underline">
            supportpagina
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
