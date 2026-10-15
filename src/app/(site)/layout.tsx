import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { LiveChatWidget } from "@/components/chat/live-chat-widget"
import { PageTransition } from "@/components/layout/page-transition"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div id="main-content" className="storefront flex-1">
        <PageTransition>{children}</PageTransition>
      </div>
      <SiteFooter />
      <LiveChatWidget />
    </>
  )
}
