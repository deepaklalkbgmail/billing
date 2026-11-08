# RestoPOS

Multi-branch restaurant billing, inventory and expense software (React + Express + SQLite/Prisma).

## Run (Windows / Linux)
```
npm install
npm run setup     # creates .env, database, seed data
npm run dev       # http://localhost:5173
```
Daily use: `npm run build` then `npm start` -> http://localhost:3456

## Open on phone / tablet (same Wi-Fi)
1. Find the PC's IP: run `ipconfig` and note the IPv4 address (e.g. 192.168.1.20).
2. Open `http://192.168.1.20:5173` (dev) or `http://192.168.1.20:3456` (after `npm start`) in the phone/tablet browser.
3. If it does not load, allow Node.js through Windows Firewall (Private networks), or run in an admin PowerShell:
   `New-NetFirewallRule -DisplayName "RestoPOS" -Direction Inbound -Protocol TCP -LocalPort 5173,3456 -Action Allow`

Use "Add to Home screen" in the phone browser for an app-like full-screen icon.
