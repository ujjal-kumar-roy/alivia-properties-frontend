import Link from "next/link"
import { LegalPageShell } from "@/components/legal/legal-page-shell"
import { LegalSection, LegalSubHeading, LegalP, LegalUl, LegalCallout } from "@/components/legal/legal-content"
import { ROUTES } from "@/config/routes.config"
import { siteConfig } from "@/config/site.config"

// Bump this string whenever the content below meaningfully changes — it is
// shown to visitors as-is, not derived from the current date.
const LAST_UPDATED = "August 16, 2026"

export const metadata = {
  title: "Terms of Service — Alivia Properties",
  description:
    "The terms governing use of Alivia Properties' website, property marketplace, and construction marketplace — for buyers, sellers, agents, and suppliers.",
}

const TOC = [
  { id: "agreement", label: "Agreement to Terms" },
  { id: "definitions", label: "Definitions" },
  { id: "eligibility", label: "Eligibility & Your Account" },
  { id: "our-role", label: "What Alivia Is — and Isn't" },
  { id: "property-marketplace", label: "Using the Property Marketplace" },
  { id: "listing-properties", label: "Listing Properties" },
  { id: "financial-tools", label: "Pre-Approval & Financial Tools" },
  { id: "bookings-offers", label: "Bookings, Consultations & Offers" },
  { id: "construction-marketplace", label: "Construction Marketplace & RFQs" },
  { id: "content", label: "Reviews, Q&A & Your Content" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "reporting", label: "Reporting Problems & Removal" },
  { id: "fees", label: "Fees" },
  { id: "third-party", label: "Third-Party Services & Links" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Liability & Indemnification" },
  { id: "termination", label: "Suspension & Termination" },
  { id: "governing-law", label: "Governing Law & Disputes" },
  { id: "contact", label: "Contact Us" },
]

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="The rules for using Alivia Properties' website, property marketplace, and construction marketplace — for buyers, sellers, agents, and suppliers."
      lastUpdated={LAST_UPDATED}
      toc={TOC}
      otherDocument={{ label: "Read our Privacy Policy", href: ROUTES.PRIVACY }}
    >
      <LegalSection id="agreement" title="Agreement to Terms">
        <LegalP>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of {siteConfig.url} and the
          Alivia Properties platform — our developer website, property marketplace, and construction marketplace,
          together the &ldquo;Platform&rdquo; — operated by Alivia Properties (&ldquo;Alivia,&rdquo; &ldquo;we,&rdquo;
          or &ldquo;us&rdquo;).
        </LegalP>
        <LegalP>
          By creating an account, browsing listings, submitting an inquiry, or otherwise using the Platform, you agree
          to these Terms and to our{" "}
          <Link href={ROUTES.PRIVACY} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Privacy Policy
          </Link>
          . If you do not agree, please do not use the Platform.
        </LegalP>
        <LegalCallout variant="notice" title="The short version">
          <LegalP>
            Alivia connects buyers, sellers, agents, and suppliers. We do not buy, sell, rent, or hold funds for any
            property or product ourselves, and we are not a party to any deal you make through the Platform — see{" "}
            <Link href="#our-role" className="font-semibold underline underline-offset-2 hover:text-brand-800">
              What Alivia Is — and Isn&apos;t
            </Link>{" "}
            for what that means for you.
          </LegalP>
        </LegalCallout>
      </LegalSection>

      <LegalSection id="definitions" title="Definitions">
        <LegalUl>
          <li><strong>&ldquo;Platform&rdquo;</strong> — the Alivia Properties website, property marketplace, and construction marketplace, together.</li>
          <li><strong>&ldquo;Listing&rdquo;</strong> — a property, project, or marketplace product/service shown on the Platform.</li>
          <li><strong>&ldquo;Seller&rdquo;</strong> — a person, agency, or developer listing a property for sale or rent.</li>
          <li><strong>&ldquo;Buyer&rdquo;</strong> — anyone searching, saving, inquiring about, booking, or making an offer on a property or marketplace item.</li>
          <li><strong>&ldquo;Supplier&rdquo;</strong> — a vendor or service provider offering products or services on the construction marketplace.</li>
          <li><strong>&ldquo;Content&rdquo;</strong> — listings, photos, videos, documents, reviews, questions and answers, messages, and anything else submitted to the Platform.</li>
          <li><strong>&ldquo;RFQ&rdquo;</strong> — a Request for Quote submitted through the construction marketplace.</li>
          <li><strong>&ldquo;You&rdquo; / &ldquo;User&rdquo;</strong> — anyone using the Platform, in any role.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="eligibility" title="Eligibility & Your Account">
        <LegalUl>
          <li>You must be at least 18 years old and able to form a binding contract under the laws of Bangladesh.</li>
          <li>You agree to register with accurate information — name, email, and phone number — and to keep it up to date.</li>
          <li>One account per person. You are responsible for keeping your password confidential and for all activity that happens under your account.</li>
          <li>You choose an account type at sign-up — buyer or seller (including agents and developers) — and Alivia may verify or adjust that role.</li>
          <li>Email verification is required before you can sign in, and repeated failed sign-in attempts will temporarily lock an account as a security measure.</li>
          <li>Tell us immediately at {siteConfig.contact.email} if you suspect unauthorized use of your account.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="our-role" title="What Alivia Is — and Isn't">
        <LegalP>The Platform brings together three things:</LegalP>
        <LegalUl>
          <li>Our own corporate site, showcasing Alivia&apos;s apartment projects as a developer.</li>
          <li>A property marketplace, where independent sellers and agents list properties for buyers to find.</li>
          <li>A construction marketplace, connecting buyers with suppliers and service providers through RFQs.</li>
        </LegalUl>
        <LegalCallout variant="caution" title="We are a platform, not a party to your transaction">
          <LegalP>
            Alivia is a venue that connects people. Unless you are dealing directly with Alivia as the developer of an
            Alivia-branded project, Alivia is not the seller, buyer, broker, agent, lender, escrow agent, or
            contractor in any transaction you enter into through the Platform. We do not hold or process funds for
            property purchases, rentals, or supplier orders. Negotiating price, verifying title, signing agreements,
            arranging payment, and closing the deal are between you and the other party, using your own legal,
            banking, and — where appropriate — professional advisors.
          </LegalP>
        </LegalCallout>
        <LegalP>
          We review listings and can mark them Approved, Verified, or Featured. That process is a quality-control
          convenience, not a guarantee of accuracy, title, or condition — see{" "}
          <Link href="#disclaimers" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Disclaimers
          </Link>
          .
        </LegalP>
      </LegalSection>

      <LegalSection id="property-marketplace" title="Using the Property Marketplace">
        <LegalUl>
          <li>Searching, saving, comparing, and inquiring about properties is free for buyers.</li>
          <li>When you contact a seller or agent — through an inquiry, booking, or offer — your contact details and message are shared with them directly so they can respond.</li>
          <li>
            &ldquo;Verified&rdquo; and &ldquo;Featured&rdquo; badges reflect Alivia&apos;s review of the information a
            seller submitted. They are not a substitute for your own independent legal and physical due diligence —
            an in-person visit, an independent title search, and verification of ownership documents — before you
            commit to any purchase or rental.
          </li>
          <li>An offer you submit through the Platform is a proposal to the seller, not a binding contract. A real transaction requires a signed agreement between you and the seller, outside the Platform.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="listing-properties" title="Listing Properties">
        <LegalP>This section applies if you list a property as a seller, agent, or developer.</LegalP>
        <LegalUl>
          <li>You confirm you have the legal right to list, sell, or rent the property, and that everything you submit — price, specifications, photos, documents, and availability — is accurate and kept up to date.</li>
          <li>Listings go through review before or after they go live, and may be marked Pending, Approved, Verified, Featured, or Rejected with a reason. Alivia may reject, unpublish, or edit a listing that appears inaccurate, duplicated, fraudulent, or that otherwise breaks these Terms.</li>
          <li>You agree to respond to inquiries, bookings, and offers in good faith, and to honor the availability and pricing you publish.</li>
          <li>Uploading a supporting document — a title deed, mutation record, tax receipt, NOC, or similar — confirms you have the right to share it and that it is genuine.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="financial-tools" title="Pre-Approval & Financial Tools">
        <LegalCallout variant="caution" title="Not a loan offer">
          <LegalP>
            Our Mortgage Pre-Approval tool and EMI / bank-comparison calculators produce an indicative estimate only,
            based on the numbers you enter and the rates our partner banks publish to us. They are not a loan
            application, a credit decision, or a commitment from Alivia or any bank. Actual financing depends on the
            bank&apos;s own underwriting, documentation, and approval process.
          </LegalP>
        </LegalCallout>
        <LegalP>
          Partner bank rates and terms shown on the Platform are for comparison purposes and can change — confirm
          current terms directly with the bank before relying on them.
        </LegalP>
      </LegalSection>

      <LegalSection id="bookings-offers" title="Bookings, Consultations & Offers">
        <LegalUl>
          <li>You can request a consultation or a site visit free of charge. Alivia or the relevant seller/agent will confirm, reschedule, or cancel as needed, and either side may cancel a booking that has not yet taken place.</li>
          <li>Making an offer through the Platform is not a deposit or a binding purchase — it opens a negotiation between you and the seller.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="construction-marketplace" title="Construction Marketplace & RFQs">
        <LegalUl>
          <li>Buyers can browse suppliers and products by category and submit a Request for Quote — to one supplier, or fanned out to several at once.</li>
          <li>Submitting an RFQ shares your specifications, quantities, budget, delivery details, and contact information with the supplier(s) you selected, or that Alivia routes it to.</li>
          <li>Quotes, pricing, availability, and delivery timelines come from the supplier, not Alivia. We do not guarantee a supplier&apos;s quote, product quality, or delivery performance. Any resulting purchase or contract is between you and the supplier.</li>
          <li>Suppliers are responsible for the accuracy of their catalogue, pricing, and responses in the RFQ conversation.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="content" title="Reviews, Q&A & Your Content">
        <LegalP>
          Reviews and property questions must reflect a genuine experience or a genuine question — no fake reviews,
          review-swapping, or posting on behalf of someone else.
        </LegalP>
        <LegalP>
          By submitting Content — listing photos, documents, reviews, questions and answers, or messages — you grant
          Alivia a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and distribute that
          Content as part of operating and promoting the Platform. You keep ownership of what you submit, and you
          confirm you have the rights to share it. Alivia may remove Content that violates these Terms or the law;
          leaving other Content in place is not an endorsement of it.
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable Use">
        <LegalP>When using the Platform, you agree not to:</LegalP>
        <LegalUl>
          <li>List a property, product, or service you do not have the legal right to sell, rent, or advertise.</li>
          <li>Post false, misleading, or duplicate listings, reviews, or questions.</li>
          <li>Discriminate, in a listing or in your conduct, on the basis of religion, race, gender, disability, or another legally protected characteristic.</li>
          <li>Scrape, harvest, or bulk-download data from the Platform without our written permission.</li>
          <li>Take a connection made on the Platform off-platform specifically to avoid fees that may apply to your account type.</li>
          <li>Upload malware, or attempt to interfere with or gain unauthorized access to the Platform, other accounts, or our infrastructure.</li>
          <li>Impersonate another person, or misrepresent your affiliation with any person or company.</li>
          <li>Use the Platform for any unlawful purpose, including listing disputed or unlawfully acquired land.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="intellectual-property" title="Intellectual Property">
        <LegalP>
          The Platform&apos;s design, code, and branding, and any text or photography that is Alivia&apos;s own, are
          owned by Alivia or our licensors and protected by copyright and trademark law. You may not copy, modify, or
          redistribute them without our written permission. You keep ownership of Content you submit — see{" "}
          <Link href="#content" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Reviews, Q&amp;A &amp; Your Content
          </Link>
          .
        </LegalP>
      </LegalSection>

      <LegalSection id="reporting" title="Reporting Problems & Removal">
        <LegalP>
          Use the &ldquo;Report&rdquo; option on a listing, or contact us, to flag a listing, review, or other Content
          you believe is inaccurate, fraudulent, or breaks these Terms.
        </LegalP>
        <LegalP>
          If you believe your intellectual property — for example, your photographs — has been used on the Platform
          without permission, email{" "}
          <a href={`mailto:${siteConfig.contact.email}`} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
            {siteConfig.contact.email}
          </a>{" "}
          with a description of the content, where it appears on the Platform, and confirmation of your ownership. We
          will review the report and remove infringing Content where appropriate.
        </LegalP>
      </LegalSection>

      <LegalSection id="fees" title="Fees">
        <LegalP>
          Browsing, searching, saving, and inquiring is free for buyers. Alivia does not currently charge booking,
          offer, or RFQ fees. If we introduce fees for any account type — for example, premium placement for a seller
          or supplier listing — we will display them clearly before you are charged, and they will not apply
          retroactively.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party" title="Third-Party Services & Links">
        <LegalP>
          The Platform links to, or embeds, services we do not control — Google Maps, partner banks, WhatsApp, and our
          social media pages among them. Your use of those services is governed by their own terms, and Alivia is not
          responsible for their content, availability, or practices.
        </LegalP>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers">
        <LegalP>
          The Platform, and all listings, RFQ responses, and pre-approval estimates, are provided &ldquo;as is&rdquo;
          and &ldquo;as available.&rdquo; Alivia does not guarantee the accuracy, completeness, legal title,
          condition, or availability of any listing or product, or the reliability of any user — buyer, seller,
          agent, or supplier — you interact with. Verified or Featured status reflects our review of the information
          provided to us; it is not a warranty. To the fullest extent permitted by law, Alivia disclaims all
          warranties, express or implied, about the Platform and its Content.
        </LegalP>
      </LegalSection>

      <LegalSection id="liability" title="Liability & Indemnification">
        <LegalSubHeading>Limitation of liability</LegalSubHeading>
        <LegalP>
          To the fullest extent permitted by law, Alivia and its officers, employees, and partners are not liable for
          indirect, incidental, or consequential damages arising from your use of the Platform, or from any
          transaction, dispute, or interaction with another user — including financial loss connected to a property
          purchase, rental, RFQ, or financing decision made outside the Platform. Our total liability for any claim
          relating to the Platform is limited to the amount, if any, you paid us in the twelve months before the
          claim arose.
        </LegalP>
        <LegalSubHeading>Indemnification</LegalSubHeading>
        <LegalP>
          You agree to indemnify and hold Alivia harmless from claims, losses, or expenses — including reasonable
          legal fees — arising from your use of the Platform, your Content, your listings, or your breach of these
          Terms.
        </LegalP>
      </LegalSection>

      <LegalSection id="termination" title="Suspension & Termination">
        <LegalUl>
          <li>You may stop using the Platform and close your account at any time by contacting us.</li>
          <li>We may suspend or terminate your account if you violate these Terms, provide false information, or if we reasonably believe your account poses a risk to the Platform or other users. Where practical, we will tell you why.</li>
          <li>Provisions that by their nature should survive account closure — including Definitions, What Alivia Is and Isn&apos;t, Intellectual Property, Disclaimers, Liability &amp; Indemnification, and Governing Law — continue to apply afterward.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing Law & Disputes">
        <LegalUl>
          <li>These Terms are governed by the laws of the People&apos;s Republic of Bangladesh. Courts located in Dhaka, Bangladesh have exclusive jurisdiction over any dispute that cannot be resolved informally.</li>
          <li>Before filing a claim, please contact us — most concerns can be resolved directly and quickly.</li>
          <li>If any part of these Terms is found unenforceable, the remainder stays in effect.</li>
          <li>
            These Terms, together with our{" "}
            <Link href={ROUTES.PRIVACY} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800">
              Privacy Policy
            </Link>
            , are the entire agreement between you and Alivia about the Platform, and supersede any earlier version.
          </li>
          <li>We may update these Terms as the Platform grows. We will update the &ldquo;Last updated&rdquo; date above and, for material changes, take reasonable steps to notify you. Continuing to use the Platform after an update means you accept the revised Terms.</li>
          <li>You may not assign these Terms. Alivia may assign them as part of a merger, acquisition, or sale of assets.</li>
        </LegalUl>
      </LegalSection>

      <LegalSection id="contact" title="Contact Us">
        <LegalP>Questions about these Terms are welcome at:</LegalP>
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
