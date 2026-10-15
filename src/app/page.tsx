// TEMP: root path renders the construction marketplace directly under the root
// layout (the marketplace component renders its own footer). Restore the landing
// page by moving (site)/landing.tsx back to (site)/page.tsx and deleting this file.
import type { ComponentProps } from "react";
import MarketplacePage, { metadata } from "@/app/marketplace/page";
import { PageTransition } from "@/components/layout/page-transition";

export const dynamic = "force-dynamic";
export { metadata };

// Same app-like route transition the marketplace layout gives /marketplace/*.
export default function HomePage(props: ComponentProps<typeof MarketplacePage>) {
  return (
    <PageTransition>
      <MarketplacePage {...props} />
    </PageTransition>
  );
}
