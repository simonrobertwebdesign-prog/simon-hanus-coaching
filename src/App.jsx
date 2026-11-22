import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { go, useRoute } from "./lib/router";
import { ToastHost, Loading } from "./components/ui";
import { Home } from "./pages/Home";
import { Start, Paid } from "./pages/Start";
import { Login, ResetPassword } from "./pages/Auth";
import { Legal } from "./pages/Legal";
import { Portal } from "./pages/Portal";
import { Coach } from "./pages/Coach";

export default function App() {
  const route = useRoute();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    api.session().then(setSession);
    return api.onChange(setSession);
  }, []);

  // Supabase email links land with tokens in the hash; send them on.
  useEffect(() => {
    if (route.includes("access_token") || route.includes("type=recovery")) {
      const recovery = route.includes("type=recovery");
      setTimeout(() => go(recovery ? "reset" : "start"), 400);
    }
  }, [route]);

  if (session === undefined) return <Loading />;

  const needLogin = (r) => (r.startsWith("app") || r.startsWith("coach")) && !session;
  let page;
  if (needLogin(route)) page = <Login />;
  else if (route.startsWith("coach")) page = session.user.role === "coach" ? <Coach route={route} /> : <Portal route="app" session={session} />;
  else if (route.startsWith("app")) page = session.user.role === "coach" ? <Coach route="coach" /> : <Portal route={route} session={session} />;
  else if (route.startsWith("start")) page = <Start route={route} session={session} />;
  else if (route === "paid") page = <Paid session={session} />;
  else if (route === "login") page = <Login />;
  else if (route === "reset") page = <ResetPassword />;
  else if (["terms", "privacy", "health"].includes(route)) page = <Legal which={route} session={session} />;
  else page = <Home session={session} />;

  return (
    <ToastHost>
      {api.demo && (
        <div className="demo-bar">
          Demo: nothing here is real yet.
          <button onClick={async () => { await api.demoAs("client"); go("app"); }}>Client area</button>
          <button onClick={async () => { await api.demoAs("coach"); go("coach"); }}>Coach area</button>
          <button onClick={() => { api.resetDemo(); location.hash = "home"; location.reload(); }}>Reset</button>
        </div>
      )}
      {page}
    </ToastHost>
  );
}
