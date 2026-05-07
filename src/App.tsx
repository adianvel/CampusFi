/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Onboarding } from "./pages/Onboarding";

const AppDashboard = lazy(() =>
  import("./pages/AppDashboard").then((module) => ({ default: module.AppDashboard })),
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/app/*"
        element={
          <Suspense fallback={<div className="min-h-screen bg-[#E5E7EB]" />}>
            <AppDashboard />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
