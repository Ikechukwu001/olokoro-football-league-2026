# Olokoro Football League 2026

A mobile-first community league website with live Firestore updates and a private, single-admin dashboard.

## Features in this starter
- Public live match centre, fixtures and results
- Four group tables calculated from completed group matches
- Golden Boot rankings calculated from recorded goal events
- Teams directory
- Private Firebase email/password admin login
- Admin can change match status and record goals/cards
- Goal events automatically update the match score
- Firestore client rules permit public reads only; all writes are performed by protected server routes

## 1. Install
Use Node.js 20.9 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Create Firebase project
1. Create a project at https://console.firebase.google.com/
2. Add a Web App and copy its config values into `.env.local`.
3. Create a Cloud Firestore database.
4. Enable Authentication > Sign-in method > Email/Password.
5. Create your own administrator user under Authentication > Users.
6. Copy that user's UID into `ADMIN_UID` in `.env.local`.
7. In Project settings > Service accounts, generate a private key. Put the complete JSON on one line in `FIREBASE_SERVICE_ACCOUNT_JSON`. Keep this secret server-side only.

## 3. Deploy Firestore rules
In Firebase Console > Firestore Database > Rules, paste the contents of `firebase.rules` and publish.

## 4. Seed the competition
The seed script creates 12 teams and 20 fixtures from the supplied 2026 poster. It uses Agbama as the corrected Group D name.

Set `FIREBASE_SERVICE_ACCOUNT_JSON` in your shell before running:

PowerShell:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
npm run seed
```

Do not commit `service-account.json`. Alternatively, set the environment variable in your terminal without saving the key in the project.

## 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000. Admin is at http://localhost:3000/admin.

## 6. Deploy to Vercel
1. Push the project to a private GitHub repository.
2. Import it into Vercel.
3. Add every variable from `.env.local` to Vercel Project Settings > Environment Variables.
4. Deploy.
5. Add your deployed domain to Firebase Authentication > Settings > Authorized domains.

## Firestore data model
- `teams/{teamId}`: `{ name, group }`
- `matches/{matchId}`: stage, round, date, homeTeam, awayTeam, scores, status, events[]

## Important notes
- The public site listens to Firestore snapshots, so updates appear without a manual refresh.
- The administrator is enforced server-side by comparing the verified Firebase UID with `ADMIN_UID`.
- Never put the Firebase service-account JSON in a `NEXT_PUBLIC_` variable.
- This is a functional first version. Before the tournament, test all score/event workflows with a test match and verify the dates/times with the organizers.
- Knockout fixtures are seeded with placeholder labels. The next development step should be automatic qualification and knockout-team assignment when group matches are complete.
