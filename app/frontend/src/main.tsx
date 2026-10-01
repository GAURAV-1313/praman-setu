import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/500.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-devanagari/700.css";
import "./styles.css";
import "./mobile.css";
import { LangProvider } from "./i18n";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Kendra from "./pages/Kendra";
import Queue from "./pages/Queue";
import CaseView from "./pages/CaseView";
import Collector from "./pages/Collector";
import Audit from "./pages/Audit";
import GraphPage from "./pages/GraphPage";
import Renewals from "./pages/Renewals";
import Reader from "./pages/Reader";
import SewaSetuConsole, { SewaSetuDashboard } from "./pages/SewaSetuConsole";
import CitizenPortal from "./pages/CitizenPortal";

import { bootDemo } from "./demo";

// Round 5: `?demo=reset` and a backend reset elsewhere are applied before the first render
bootDemo().finally(() => ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LangProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/sewasetu/case/:appId" element={<SewaSetuConsole />} />
          <Route path="/sewasetu" element={<SewaSetuDashboard />} />
          <Route path="/nagrik" element={<CitizenPortal />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/kendra" element={<Kendra />} />
            <Route path="/officer" element={<Queue />} />
            <Route path="/officer/case/:appId" element={<CaseView />} />
            <Route path="/collector" element={<Collector />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/reader" element={<Reader />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LangProvider>
  </React.StrictMode>,
));
