<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4c1873dc-a3dd-487a-bf89-86672857d5e5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase vendor comparison slice

The first real data-backed loop uses Supabase for jobs, vendors, items, quote responses, and selected parts usage.

1. Create a Supabase project.
2. Run `supabase/migrations/202604120001_initial_vendor_comparison.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Run `supabase/seed/202604120001_vendor_comparison_seed.sql` to load the demo job, vendors, items, and quote responses.
4. Add these values to `.env.local`:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
5. Restart `npm run dev`.

In the app, create or open a capture, add a material, pick the seeded Supabase job, and use Compare vendors to load quote responses. Choosing Use this vendor writes the selected quote into `parts_usage`.
