import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Algemene voorwaarden · Limitless Coaching",
  description: "Algemene voorwaarden van Limitless Coaching",
};

export default function VoorwaardenPage() {
  return (
    <LegalPageShell title="Algemene voorwaarden" updated="9 juli 2026">
      <section>
        <h2 className="text-lg font-semibold">1. Toepasselijkheid</h2>
        <p className="mt-2 text-app-muted">
          Deze voorwaarden gelden voor het gebruik van het Limitless Coaching
          platform door coaches, atleten en beheerders. Door een account aan te
          maken of de app te gebruiken, ga je akkoord met deze voorwaarden.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. Dienst</h2>
        <p className="mt-2 text-app-muted">
          Het platform faciliteert coaching, programma&apos;s, communicatie,
          statistieken, merch-bestellingen en aanvullende tools. Limitless
          Coaching is een softwareplatform; de coachingrelatie blijft tussen coach
          en atleet.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">3. Account en toegang</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-app-muted">
          <li>Je bent verantwoordelijk voor vertrouwelijkheid van je inloggegevens</li>
          <li>Accounts worden uitgenodigd of aangemaakt volgens het invite-model</li>
          <li>Misbruik, reverse engineering of ongeautoriseerde toegang is verboden</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">4. Gebruikerscontent en chat</h2>
        <p className="mt-2 text-app-muted">
          Chatberichten, video&apos;s en andere uploads zijn user-generated content
          (UGC). Je bent zelf verantwoordelijk voor wat je deelt. Het is verboden om
          spam, intimidatie, haatdragende taal, ongepaste content of illegaal materiaal
          te verspreiden.
        </p>
        <p className="mt-2 text-app-muted" id="ugc">
          Je kunt ongepaste berichten melden via het menu op een bericht of gesprek.
          Je kunt andere gebruikers blokkeren om geen directe berichten meer te
          ontvangen. Meldingen worden binnen 24 uur beoordeeld; bij schending kunnen
          accounts worden gewaarschuwd, opgeschort of verwijderd.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">5. Gebruik van content</h2>
        <p className="mt-2 text-app-muted">
          Trainingsvideo&apos;s, chatberichten en programma-inhoud blijven eigendom
          van de uploadende gebruiker. Je verleent het platform een beperkte
          licentie om content te hosten en tonen binnen de app voor
          coachingdoeleinden.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">6. Betalingen (merch)</h2>
        <p className="mt-2 text-app-muted">
          Merch-bestellingen worden verwerkt via Stripe. Prijzen, levering en
          retourbeleid worden bepaald door de coach/organisatie. Limitless
          Coaching faciliteert de technische afhandeling.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">7. Aansprakelijkheid</h2>
        <p className="mt-2 text-app-muted">
          Coaching en trainingsadvies vallen onder de verantwoordelijkheid van de
          coach. Het platform wordt geleverd &quot;as is&quot;. Wij zijn niet
          aansprakelijk voor blessures, prestatie-uitkomsten of indirecte schade,
          voor zover wettelijk toegestaan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">8. Beëindiging</h2>
        <p className="mt-2 text-app-muted">
          Accounts kunnen worden opgeschort of verwijderd bij schending van deze
          voorwaarden of op verzoek van de gebruiker/beheerder. Na beëindiging
          vervalt toegang tot het platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">9. Wijzigingen</h2>
        <p className="mt-2 text-app-muted">
          Wij kunnen deze voorwaarden wijzigen. Bij materiële wijzigingen informeren
          wij gebruikers via het platform. Voortgezet gebruik geldt als
          acceptatie.
        </p>
      </section>
    </LegalPageShell>
  );
}
