/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import PublicMenu from "./pages/PublicMenu";
import OrderTracking from "./pages/OrderTracking";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/super-admin" element={<SuperAdminPortal />} />
            <Route path="/r/:slug" element={<PublicMenu />} />
            <Route path="/order/:orderId" element={<OrderTracking />} />
          </Routes>
        </AnimatePresence>
      </Router>
    </ErrorBoundary>
  );
}


