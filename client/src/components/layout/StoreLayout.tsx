import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/format";
import { useBootstrap } from "@/lib/queries";
import { Problem } from "@/components/ui/ErrorBoundary";
import { Announcement, MobileMenu, Navbar, SearchOverlay } from "./Navbar";
import { BagDrawer } from "./BagDrawer";
import { Footer } from "./Footer";
import { WelcomeOffer } from "./WelcomeOffer";

/** Sets the browser tab title for a page. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Sima Beauty` : "Sima Beauty | Original makeup from the brands you love";
  }, [title]);
}

export function StoreLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const boot = useBootstrap();
  const settings = boot.data?.settings;
  const isHome = location === "/";
  const bare = location.startsWith("/checkout");

  // Start every new page at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [location]);

  // The store's data could not be loaded (server restarting, no internet…).
  if (boot.isError && !boot.data) {
    return <Problem title="We'll be right back" text="The store couldn't load. Check your connection and try again." onAction={() => boot.refetch()} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Announcement />
      <Navbar overHero={isHome} />
      <main className="flex-1">{children}</main>
      {!bare && <Footer />}
      <MobileMenu />
      <SearchOverlay />
      <BagDrawer />
      <WelcomeOffer />
      {settings?.whatsapp && !bare && (
        <a
          href={whatsappLink(settings.whatsapp, "Hi Sima Beauty, I need help choosing a product.")}
          target="_blank" rel="noreferrer" aria-label="Chat with us on WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1FA855] text-white shadow-xl transition hover:scale-110"
        >
          <MessageCircle size={26} />
        </a>
      )}
    </div>
  );
}
