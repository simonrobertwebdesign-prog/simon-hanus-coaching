import { DEMO } from "../config";

// Demo until Supabase keys are added; then the real database. Only the one in use gets downloaded.
export const api = DEMO ? (await import("./demoApi")).demoApi : (await import("./supabaseApi")).supabaseApi;
