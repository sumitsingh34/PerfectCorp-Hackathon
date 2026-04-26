import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./routes/Landing";
import Capture from "./routes/Capture";
import Analyzing from "./routes/Analyzing";
import Diagnosis from "./routes/act1/Diagnosis";
import Forecast from "./routes/act1/Forecast";
import Routine from "./routes/act1/Routine";
import EventPick from "./routes/act2/EventPick";
import Building from "./routes/act2/Building";
import Lookbook from "./routes/act2/Lookbook";
import ShopList from "./routes/act2/ShopList";
import Share from "./routes/Share";
import CartBadge from "./components/CartBadge";
import CartDrawer from "./components/CartDrawer";
import { ToastHost } from "./components/Toast";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.main {...pageTransition} className="min-h-dvh w-full max-w-md mx-auto pad-screen">
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();
  // Reset scroll on every route change so each new screen starts at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);
  // Hide the floating cart on the landing screen — it's noise before the user starts.
  const showCart = location.pathname !== "/";
  return (
    <>
      {showCart && <CartBadge />}
      <CartDrawer />
      <ToastHost />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Landing /></Page>} />
          <Route path="/capture" element={<Page><Capture /></Page>} />
          <Route path="/analyzing" element={<Page><Analyzing /></Page>} />
          <Route path="/diagnosis" element={<Page><Diagnosis /></Page>} />
          <Route path="/forecast" element={<Page><Forecast /></Page>} />
          <Route path="/routine" element={<Page><Routine /></Page>} />
          <Route path="/event" element={<Page><EventPick /></Page>} />
          <Route path="/building" element={<Page><Building /></Page>} />
          <Route path="/lookbook" element={<Page><Lookbook /></Page>} />
          <Route path="/shop" element={<Page><ShopList /></Page>} />
          <Route path="/share" element={<Page><Share /></Page>} />
        </Routes>
      </AnimatePresence>
    </>
  );
}
