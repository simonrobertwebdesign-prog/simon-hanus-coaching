import { DEMO } from "../config";
import { demoApi } from "./demoApi";

// Demo until Supabase keys are added; then the real database.
let impl = demoApi;
if (!DEMO) {
  const mod = await import("./supabaseApi");
  impl = mod.supabaseApi;
}

export const api = impl;
