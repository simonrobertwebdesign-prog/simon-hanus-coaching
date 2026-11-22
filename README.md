# Simon Hanus Coaching

The coaching website: public pages, the questionnaire, the client area and the coach area.

- **Site:** Vite + React. `npm install`, then `npm run dev` to try it locally.
- **Demo mode:** with no Supabase keys the site runs on made-up data in the browser.
- **Real mode:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` (the publishable key) in Netlify's environment variables. Database setup is in `supabase/setup.sql`.
- **Payments:** Stripe payment links, pasted into `src/config.js` (`paymentLink` on each plan). After paying, Stripe sends the client to `/?session_id={CHECKOUT_SESSION_ID}#paid`.
- **Daily coaching run:** see `COACHING-RUNBOOK.md`. Claude uses `window.SHC` in the coach area.

Prices, plan names and check-in gaps live in `src/config.js`.
