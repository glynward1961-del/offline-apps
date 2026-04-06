# Ledgerly

Ledgerly is a mobile-first, local-first subscription tracker built as a standalone-friendly PWA.

## What changed in this upgrade
- Reframed the UI around a tighter mobile dashboard instead of a generic app shell.
- Shifted the visual system toward a calm light premium finance palette with softer neutrals, sage accents, and clearer semantic states for active, due soon, and urgent items.
- Promoted a real overview hero:
  - monthly spend as the primary figure,
  - annual equivalent underneath,
  - quick insight chips for due-soon items, trials, and largest subscription.
- Added an attention panel so trials and renewals stop hiding in plain sight.
- Improved upcoming renewals with stronger date urgency and cleaner scan patterns.
- Demoted Display out of the main tab bar into a Settings shortcut, keeping primary navigation focused on Overview, Add, and Subscriptions.
- Reworked the add/edit form into grouped sections:
  - Basics
  - Renewal
  - Details
- Replaced the billing-cycle select with segmented controls and clearer helper text.
- Upgraded subscription cards for scannability with:
  - service initials markers,
  - price/cadence pairing,
  - a dedicated renewal row,
  - compact status/category/trial badges,
  - lighter-weight actions.
- Added library controls for real-world data volumes:
  - search by name/category/notes,
  - filters for active, trial, cancelled, and due soon,
  - sort by renewal date, price, name, or newest.
- Preserved the existing local storage data model so saved subscriptions and preferences continue to work.

## Features
- Add, edit, and delete subscriptions
- Fields for name, price, billing cycle, next payment date, category, notes, trial, and active/cancelled
- Dashboard hero with monthly spend, annual total, and key attention insights
- Upcoming renewals with urgency tiers
- Search, filter, and sort for the subscriptions library
- App-style sections for overview, add/edit, subscriptions, and settings
- Local storage persistence in the browser
- Installable PWA shell with service worker caching
- Locale-aware date formatting and configurable currency display

## Run locally
Use any static file server from the `apps/ledgerly` folder.

Examples:

```powershell
npx serve .
```

or

```powershell
node server.cjs
```

Then open the shown URL in a browser.

## How to test
1. Start a local server from `apps/ledgerly`.
2. Open the app in a browser.
3. Confirm the app opens on Overview with the tighter header and three-tab primary nav.
4. Open Settings from the header and verify locale/currency preferences still work and persist after refresh.
5. Check the overview hero updates for monthly spend, annual total, due-soon count, and largest subscription.
6. Verify upcoming renewals show urgency styling for near dates.
7. Open Subscriptions and test:
   - search by service name,
   - filter Active / Trial / Cancelled / Due in 7 days,
   - sort by renewal date, price, name, and newest.
8. Add a subscription from the Add tab and confirm it appears in the library and updates overview metrics.
9. Edit a subscription by tapping the card or Edit action and confirm the grouped form pre-fills correctly.
10. Delete a subscription and confirm the totals and lists update.
11. If your browser supports install prompts, verify the Install button appears before installation and disappears once installed.
12. Put the app offline after first load and confirm the shell still opens from service worker cache.

## Notes
- Data is stored in `localStorage`, so it stays on the same browser profile/device context.
- Currency selection only changes display/formatting; it does not convert values.
- Annual totals still use the existing simplified billing model, especially for `custom` cycles.
- Search/filter/sort are view controls only; they do not modify saved records.
