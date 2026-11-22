import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Spinner, Toasts } from "@/components/ui/basics";
import { HeartBurstLayer } from "@/components/ui/HeartBurst";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Home from "@/pages/store/Home";
import Shop from "@/pages/store/Shop";
import ProductPage from "@/pages/store/ProductPage";
import Checkout from "@/pages/store/Checkout";
import Account from "@/pages/store/Account";
import Help from "@/pages/store/Help";
import { OrderDone, Track } from "@/pages/store/OrderPages";
import { Brands, NotFound, Offers, Wishlist } from "@/pages/store/Browse";

// The admin panel is loaded only when someone opens /admin,
// so shoppers never download it.
const Admin = lazy(() => import("@/pages/admin/Admin"));

export default function App() {
  const [location] = useLocation();
  return (
    <>
      {location.startsWith("/admin") ? (
        <ErrorBoundary resetKey={location}>
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-pink"><Spinner /></div>}>
            <Admin />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <StoreLayout>
          {/* a pink swipe plus a soft rise each time the page changes */}
          <div key={`swipe-${location}`} className="route-swipe pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] bg-gradient-to-r from-pink-glow via-pink to-pink-deep" aria-hidden />
          <div key={location} className={location === "/" ? undefined : "page-in"}>
          <ErrorBoundary resetKey={location}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/product/:slug" component={ProductPage} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/order/:number" component={OrderDone} />
            <Route path="/track" component={Track} />
            <Route path="/account" component={Account} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/brands" component={Brands} />
            <Route path="/offers" component={Offers} />
            <Route path="/help" component={Help} />
            <Route path="/help/:tab" component={Help} />
            <Route component={NotFound} />
          </Switch>
          </ErrorBoundary>
          </div>
        </StoreLayout>
      )}
      <Toasts />
      <HeartBurstLayer />
    </>
  );
}
