import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

// Routes are plain names in the address hash, e.g. #start, #app-training,
// #coach-client-abc123. Works the same on GitHub Pages and in the preview.
export function useRoute() {
  const read = () => (location.hash || "").replace(/^#/, "") || "home";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      const update = () => {
        setRoute(read());
        window.scrollTo({ top: 0 });
      };
      // Smooth fade between pages where the browser supports it.
      if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const vt = document.startViewTransition(() => flushSync(update));
        // A transition can be skipped (e.g. the phone's address bar resizes the view). That's fine.
        const quiet = () => {};
        vt.ready?.catch(quiet); vt.finished?.catch(quiet); vt.updateCallbackDone?.catch(quiet);
      } else update();
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function go(name) {
  if (("#" + name) === location.hash) window.scrollTo({ top: 0, behavior: "smooth" });
  else location.hash = name;
}

export function scrollToId(id) {
  const run = () => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -68, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  if ((location.hash || "#home") !== "#home" && location.hash !== "") {
    location.hash = "home";
    setTimeout(run, 60);
  } else run();
}
