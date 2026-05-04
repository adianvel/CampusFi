/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { AppDashboard } from "./pages/AppDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AppDashboard />} />
    </Routes>
  );
}
