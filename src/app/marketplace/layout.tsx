import { PageTransition } from "@/components/layout/page-transition";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="storefront">
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
