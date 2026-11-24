import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./lib/api";
import { go, useRoute } from "./lib/router";
import { store } from "./lib/util";
import { ToastHost, Loading } from "./components/ui";
import { startGlow, countUp } from "./lib/fx";
import { Home } from "./pages/Home";
import { Login, ResetPassword } from "./pages/Auth";
import { Legal } from "./pages/Legal";

// The questionnaire, client area and coach area load when they're first needed,
// so the home page shows sooner.
const loadStart = () => import("./pages/Start");
const Start = lazy(() => loadStart().then((m) => ({ default: m.Start })));
const Paid = lazy(() => loadStart().then((m) => ({ default: m.Paid })));
const Portal = lazy(() => import("./pages/Portal").then((m) => ({ default: m.Portal })));
const Coach = lazy(() => import("./pages/Coach").then((m) => ({ default: m.Coach })));

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState(undefined);

  useEffect(() => startGlow(), []);

  // Once the page is quiet, fetch the questionnaire so "Start" opens straight away.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
    idle(() => loadStart().catch(() => {}), { timeout: 5000 });
  }, []);

  // stat numbers roll up when a page shows (and again shortly after, for data that loads late)
  useEffect(() => {
    const ts = [120, 700, 1600].map((ms) => setTimeout(() => countUp(), ms));
    return () => ts.forEach(clearTimeout);
  }, [route, session]);

  useEffect(() => {
    api.session().then(setSession);
    return api.onChange((s, event) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") go("reset");
    });
  }, []);

  // Back from the confirmation email with a half-finished questionnaire? Carry on.
  useEffect(() => {
    const draft = store("shc-q");
    if (session && session.user.role !== "coach" && draft?.step >= 8 && (route === "home" || route.includes("access_token"))) go("start");
  }, [session]);

  // Supabase email links land with tokens in the hash; tidy the address once they're read.
  useEffect(() => {
    if (route.includes("access_token") && session !== undefined) {
      setTimeout(() => go(route.includes("type=recovery") ? "reset" : session ? (session.user.role === "coach" ? "coach" : "app") : "home"), 300);
    }
  }, [route, session]);

  // Public pages don't wait for the login check.
  const isPublic = route === "home" || ["terms", "privacy", "health"].includes(route);
  if (session === undefined && !isPublic) return <Loading />;

  const needLogin = (r) => (r.startsWith("app") || r.startsWith("coach")) && !session;
  let page;
  if (needLogin(route)) page = <Login />;
  else if (route.startsWith("coach")) page = session.user.role === "coach" ? <Coach route={route} /> : <Portal route="app" session={session} />;
  else if (route.startsWith("app")) page = session.user.role === "coach" ? <Coach route="coach" /> : <Portal route={route} session={session} />;
  else if (route.startsWith("start")) page = <Start route={route} session={session} />;
  else if (route === "paid") page = <Paid session={session} />;
  else if (route === "login") page = <Login />;
  else if (route === "signup") page = <Login initialMode="signup" />;
  else if (route === "reset") page = <ResetPassword />;
  else if (["terms", "privacy", "health"].includes(route)) page = <Legal which={route} session={session} />;
  else page = <Home session={session} />;

  return (
    <ToastHost>
      {api.demo && (
        <div className="demo-bar" role="region" aria-label="Demo notice">
          Demo: nothing here is real yet.
          <button onClick={async () => { await api.demoAs("client"); go("app"); }}>Client area</button>
          <button onClick={async () => { await api.demoAs("coach"); go("coach"); }}>Coach area</button>
          <button onClick={() => { api.resetDemo(); location.hash = "home"; location.reload(); }}>Reset</button>
        </div>
      )}
      <Suspense fallback={<Loading />}>{page}</Suspense>
    </ToastHost>
  );
}
