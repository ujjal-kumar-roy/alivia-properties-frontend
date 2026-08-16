import Link from "next/link"
import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { LegalSection, LegalSubHeading, LegalP, LegalUl, LegalCallout } from "@/components/legal/legal-content"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"

// Bump this string whenever the content below meaningfully changes — it is
// shown to visitors as-is, not derived from the current date.
const LAST_UPDATED = "August 16, 2026"

export const metadata = {
  title: "Privacy Policy — Alivia Properties",
  description:
    "How Alivia Properties collects, uses, and protects your information across our property marketplace, construction marketplace, and developer website.",
}

const TOC = [
  { id: "overview", label: "Overview & Who We Are" },
  { id: "scope", label: "Scope of This Policy" },
  { id: "information-you-give-us", label: "Information You Give Us" },
  { id: "automatic-information", label: "Information We Collect Automatically" },
  { id: "how-we-use-information", label: "How We Use Your Information" },
  { id: "cookies", label: "Cookies & Similar Technologies" },
  { id: "how-we-share", label: "How We Share Your Information" },
  { id: "sensitive-data", label: "Financial & Verification Data" },
  { id: "data-retention", label: "Data Retention" },
  { id: "data-security", label: "Data Security" },
  { id: "your-rights", label: "Your Rights & Choices" },
  { id: "childrens-privacy", label: "Children's Privacy" },
  { id: "international", label: "International Visitors" },
  { id: "third-party", label: "Third-Party Links & Services" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact Us" },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="How Alivia Properties collects, uses, and protects your information across our property marketplace, construction marketplace, and developer website."
      lastUpdated={LAST_UPDATED}
      toc={TOC}
      otherDocument={{ label: "Read our Terms of Service", href: ROUTES.TERMS }}
    >
      <LegalSection id="overview" title="Overview & Who We Are">
        <LegalP>
          Alivia Properties (&ldquo;Alivia,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates a
          real estate and construction-marketplace platform for Bangladesh at {siteConfig.url} (the &ldquo;Platform&rdquo;).
          The Platform covers three things: our own corporate website showcasing Alivia&apos;s apartment projects, a
          property marketplace where independent sellers and agents list properties for buyers to search and contact,
          and a construction marketplace that connects buyers with suppliers and service providers. We are based at{" "}
          {siteConfig.contact.address}.
        </LegalP>
        <LegalP>
          This policy explains what personal information we collect, why we collect it, who we share it with, and the
          choices you have. It applies whenever you browse, register for, or use the Platform.
        </LegalP>
        <LegalCallout variant="notice" title="Privacy, in plain terms">
          <LegalP>
            We collect what is genuinely needed to run a property and construction marketplace — your profile, the
            listings and requests you create, and the messages you exchange with sellers, agents, and suppliers. If
            you use our Mortgage Pre-Approval tool, we also ask for basic financial details, used only for the
            indicative estimate described in Section 8. We do not sell your personal information to advertisers or
            data brokers. You can ask us to access, correct, or delete your data at any time — see{" "}
            <Link href="#your-rights" className="font-semibold underline underline-offset-2 hover:text-brand-800">
              Your Rights &amp; Choices
            </Link>
            .
          </LegalP>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="scope" title="Scope of This Policy">
        <LegalP>
          This policy covers the public website, the property marketplace, the construction marketplace, and every
          buyer, seller, and admin dashboard on the Platform. It does not cover third-party sites we link to — such as
          Google Maps, partner banks, WhatsApp, or our social media pages — which have their own privacy practices.
          See{" "}
          <Link href="#third-party" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Third-Party Links &amp; Services
          </Link>
          .
        </LegalP>
      </LegalSection>

      <LegalSection id="information-you-give-us" title="Information You Give Us">
        <LegalP>
          Most of what we hold about you is information you choose to give us directly, when you create an account or
          use a feature of the Platform.
        </LegalP>

        <LegalSubHeading>Account &amp; profile</LegalSubHeading>
        <LegalP>
          Name, email address, phone number, and a password. Your password is stored as a one-way cryptographic hash —
          we cannot see or recover your actual password, even internally. You also choose an account type: buyer,
          seller/agent, or (for our own team) admin.
        </LegalP>

        <LegalSubHeading>If you list properties (seller, agent, or developer)</LegalSubHeading>
        <LegalP>
          Company name, license number, bio, years of experience, specialties, service areas, languages, and the
          property details, photos, videos, and floor plans you upload.
        </LegalP>

        <LegalSubHeading>If you search for a property (buyer)</LegalSubHeading>
        <LegalP>
          The properties you save, your recent searches (kept so your next visit is faster), inquiries you send,
          consultations or site visits you book, offers you submit, and reviews or questions you post.
        </LegalP>

        <LegalSubHeading>If you use Mortgage Pre-Approval or our EMI tools</LegalSubHeading>
        <LegalP>
          Income, expenses, employment details, down payment, and your desired loan amount and tenure — used only for
          the indicative calculation described in{" "}
          <Link href="#sensitive-data" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Financial &amp; Verification Data
          </Link>
          .
        </LegalP>

        <LegalSubHeading>If you upload a property document</LegalSubHeading>
        <LegalP>
          The file itself and its type — for example a title deed, mutation record, tax receipt, approval plan, NOC,
          survey report, utility bill, or agreement — along with whatever label you give it.
        </LegalP>

        <LegalSubHeading>If you use the construction marketplace</LegalSubHeading>
        <LegalP>
          Your request-for-quote details: the product or service category, specifications, quantity, budget, delivery
          address, delivery date, and any files you attach.
        </LegalP>

        <LegalSubHeading>Anything else you send us</LegalSubHeading>
        <LegalP>
          Messages you type into a contact form, our live chat widget, a review, a question, or a support email.
        </LegalP>
      </LegalSection>

      <LegalSection id="automatic-information" title="Information We Collect Automatically">
        <LegalP>
          When you use the Platform, some information is collected automatically:
        </LegalP>
        <LegalUl>
          <li>
            <strong>Technical data</strong> — your device and browser type, IP address, and the pages you request, in
            the form of standard server logs. Sensitive fields, such as passwords and authentication tokens, are
            automatically stripped before anything is written to a log file.
          </li>
          <li>
            <strong>Session data</strong> — a secure sign-in session so you stay logged in between visits. See{" "}
            <Link href="#cookies" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
              Cookies &amp; Similar Technologies
            </Link>
            .
          </li>
          <li>
            <strong>Approximate location</strong> — only if you use Map Search and grant your browser permission, to
            center the map near you. We do not store this against your account. Property locations shown on listings
            (division, district, area, map pin) are content the seller provided, not personal data about you.
          </li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="How We Use Your Information">
        <LegalUl>
          <li>Operate the marketplace — show you relevant listings, and connect you with the seller, agent, or supplier you contact.</li>
          <li>Route and manage your inquiries, bookings, offers, reviews, questions, and quote requests.</li>
          <li>Review and, where appropriate, verify or feature the listings and documents sellers submit.</li>
          <li>Send account and transactional email — verification, password resets, and updates about your activity.</li>
          <li>Push real-time notifications — for example, letting a seller know the moment a buyer sends an inquiry.</li>
          <li>Calculate indicative pre-approval and EMI results (see Section 8).</li>
          <li>Detect and prevent fraud, abuse, and misuse of the reporting tools.</li>
          <li>Understand, in aggregate, how the Platform is used, so we can improve it.</li>
          <li>Meet our legal, tax, and regulatory obligations.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies & Similar Technologies">
        <LegalP>
          Today, the Platform uses only what is strictly necessary to function: a session cookie that keeps you signed
          in, issued by our authentication system. We do not currently run third-party advertising or analytics
          cookies. If that changes — for example, if we add analytics to better understand how the Platform is used —
          we will update this section and, where required by law, ask for your consent first.
        </LegalP>
        <LegalP>
          Google Maps, when used on our Map Search page, may set its own cookies under Google&apos;s own privacy
          policy; that is between you and Google. Most browsers let you block or delete cookies through their
          settings — keep in mind that blocking the essential session cookie will prevent you from staying signed in.
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-share" title="How We Share Your Information">
        <LegalUl>
          <li>
            <strong>With the seller, agent, or supplier you contact.</strong> That is the point of an inquiry, offer,
            booking, or quote request — your name, contact details, and message are shared with them directly so they
            can respond.
          </li>
          <li>
            <strong>Publicly, where content is meant to be public.</strong> Property listings, photos, and a
            seller/agent&apos;s public profile are visible to anyone browsing the Platform. Reviews and questions you
            post are shown publicly under your name.
          </li>
          <li>
            <strong>With service providers who run the Platform for us</strong> — our hosting, database, file storage,
            and email-delivery providers — bound to use your information only to provide those services to us, never
            for their own purposes.
          </li>
          <li>
            <strong>If required by law</strong> — in response to a valid legal request, or to protect the rights,
            safety, or property of Alivia, our users, or the public.
          </li>
          <li>
            <strong>In a business transfer.</strong> If Alivia is involved in a merger, acquisition, or sale of
            assets, your information may transfer as part of that deal, under the protections of this policy.
          </li>
        </LegalUl>
        <LegalP>We do not sell your personal information to data brokers or advertisers.</LegalP>
      </LegalSection>

      <LegalSection id="sensitive-data" title="Financial & Verification Data">
        <LegalCallout variant="caution" title="Pre-Approval is not a bank decision">
          <LegalP>
            The income, employment, and credit information you enter into Mortgage Pre-Approval is used only to
            calculate an indicative estimate — a debt-to-income ratio, an EMI figure, and an approved/not-approved
            indicator — using our own formulas and the interest rates our partner banks publish to us. It is not sent
            to any bank, credit bureau, or other third party, and it is not a loan application, a credit check, or a
            commitment of financing from Alivia or any bank. If you decide to pursue financing, you apply directly
            with the bank of your choice, and the bank runs its own checks.
          </LegalP>
        </LegalCallout>
        <LegalP>
          Property documents you or a seller upload — title deeds, tax receipts, NOCs, and similar records — are kept
          in access-controlled storage and used only to verify a listing and, where relevant, to let an interested
          buyer review supporting documents before making an offer. We do not sell or repurpose these documents. We
          apply tighter internal access controls to this category, and to pre-approval data, than to ordinary profile
          information.
        </LegalP>
      </LegalSection>

      <LegalSection id="data-retention" title="Data Retention">
        <LegalUl>
          <li>We keep your account information for as long as your account is active.</li>
          <li>
            If you close your account, or ask us to delete it, we remove or anonymize your personal data within a
            reasonable period — except where we need to keep specific records for legal, tax, fraud-prevention, or
            dispute-resolution purposes, such as a history relevant to a reported transaction or a disputed offer.
          </li>
          <li>
            A property listing is taken down from public view once it is sold, rented, or removed by the seller; the
            underlying record may be kept for a further period for accounting and dispute-resolution purposes.
          </li>
          <li>Pre-approval data is kept only for as long as needed to show you your latest result, and you may ask us to delete it at any time.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="data-security" title="Data Security">
        <LegalP>
          We use industry-standard safeguards to protect your information, including encrypted (one-way hashed)
          password storage, role-based access control, temporary account lockouts after repeated failed sign-in
          attempts, and logging that automatically strips sensitive fields — such as passwords and authentication
          tokens — before anything is written to a log file.
        </LegalP>
        <LegalP>
          No method of transmission or storage is completely secure, and we cannot guarantee absolute security. If we
          become aware of a data breach affecting your personal information, we will notify affected users and the
          relevant authorities as required by applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-rights" title="Your Rights & Choices">
        <LegalP>Regardless of where you are, we extend you the following choices over your own data:</LegalP>
        <LegalUl>
          <li><strong>Access &amp; update</strong> — most profile information can be edited directly from your dashboard; ask us for anything that is not.</li>
          <li><strong>Correction</strong> — ask us to fix information that is inaccurate or incomplete.</li>
          <li><strong>Deletion</strong> — ask us to delete your account and associated personal data, subject to the legal-retention exceptions in Section 9.</li>
          <li><strong>Portability</strong> — ask for a copy of your data in a common, machine-readable format.</li>
          <li><strong>Objection &amp; restriction</strong> — ask us to stop, or limit, a particular use of your information.</li>
          <li><strong>Withdraw consent</strong> — for anything based on your consent, withdraw it at any time going forward.</li>
        </LegalUl>
        <LegalP>
          Today, we only email you about your account and your activity on the Platform — verification, password
          resets, and updates on your inquiries, bookings, and offers — not marketing newsletters. If that changes,
          every marketing email will include a way to unsubscribe.
        </LegalP>
        <LegalP>
          To exercise any of these rights, email{" "}
          <a href={`mailto:${siteConfig.contact.email}`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            {siteConfig.contact.email}
          </a>
          . We may need to verify your identity before acting on a request, and we aim to respond within a reasonable
          time and no later than any period required by applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection id="childrens-privacy" title="Children's Privacy">
        <LegalP>
          The Platform is intended for users aged 18 and over — property transactions, financial tools, and binding
          agreements are not things a child can enter into. We do not knowingly collect personal information from
          children. If you believe a child has provided us with personal information, contact us and we will delete
          it.
        </LegalP>
      </LegalSection>

      <LegalSection id="international" title="International Visitors & Where Data Is Stored">
        <LegalP>
          Alivia Properties is built for Bangladesh, and the large majority of our users, listings, and transactions
          are based here. Our servers, databases, and file storage run on third-party cloud infrastructure, which
          means your information may be processed on servers located outside your home country. By using the
          Platform, you understand that your information may be transferred to, and processed in, Bangladesh or other
          countries where our infrastructure providers operate, under this policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party" title="Third-Party Links & Services">
        <LegalUl>
          <li><strong>Google Maps</strong> — powers Map Search and property location display, subject to Google&apos;s own privacy policy.</li>
          <li><strong>Partner banks</strong> — rates and terms shown in our EMI and bank-comparison tools are informational; if you apply with a bank directly, that bank&apos;s own privacy practices apply.</li>
          <li><strong>WhatsApp</strong> — our &ldquo;Message on WhatsApp&rdquo; links open WhatsApp directly, governed by WhatsApp/Meta&apos;s own policy.</li>
          <li><strong>Social media</strong> — links to our Facebook, Instagram, YouTube, and LinkedIn pages take you to those platforms&apos; own sites.</li>
        </LegalUl>
        <LegalP>We are not responsible for the privacy practices of third-party sites — please review their policies separately.</LegalP>
      </LegalSection>

      <LegalSection id="changes" title="Changes to This Policy">
        <LegalP>
          We may update this policy as the Platform evolves. When we do, we will update the &ldquo;Last updated&rdquo;
          date at the top of this page, and where a change is material, we will take reasonable steps to let you know
          — for example, a notice on the Platform or an email. Continuing to use the Platform after an update means
          you accept the revised policy.
        </LegalP>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing Law">
        <LegalP>
          This policy is governed by the laws of the People&apos;s Republic of Bangladesh. We aim to comply with
          applicable Bangladeshi law on data and electronic communications, including the ICT Act 2006 (as amended)
          and the Cyber Security Act 2023, and we will adapt our practices as Bangladesh&apos;s dedicated
          data-protection legislation comes into force.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <LegalP>
          For any question, request, or concern about this Privacy Policy or your personal data, reach us at:
        </LegalP>
        <LegalUl>
          <li>
            Email:{" "}
            <a href={`mailto:${siteConfig.contact.email}`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
              {siteConfig.contact.email}
            </a>{" "}
            or{" "}
            <a href={`mailto:${siteConfig.contact.emailAlt}`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
              {siteConfig.contact.emailAlt}
            </a>
          </li>
          <li>
            Phone / WhatsApp:{" "}
            <a href={`tel:${siteConfig.contact.phoneRaw}`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
              {siteConfig.contact.phone}
            </a>
          </li>
          <li>Address: {siteConfig.contact.address}</li>
          <li>Office hours: {siteConfig.contact.officeHours}</li>
        </LegalUl>
        <LegalP>
          You can also reach us any time through our{" "}
          <Link href={ROUTES.CONTACT} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            contact page
          </Link>
          .
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  )
}
