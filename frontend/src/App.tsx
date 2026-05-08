import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";
import AuthPage from "./routes/auth-route";
import Navbar from "./components/Navbar";

const HomeRoute = lazy(() => import("./routes/home-route"));
const WikiRoute = lazy(() => import("./routes/wiki-route"));
const GraphRoute = lazy(() => import("./routes/graph-route"));
const SearchRoute = lazy(() => import("./routes/search-route"));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-wiki-border border-t-wiki-accent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <LoadingSpinner />;

  if (!session) return <AuthPage />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-wiki-bg">
        <Navbar session={session} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/wiki/:id" element={<WikiRoute />} />
              <Route path="/graph" element={<GraphRoute />} />
              <Route path="/search" element={<SearchRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
