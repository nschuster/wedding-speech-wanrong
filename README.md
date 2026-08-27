# Wedding Speech Wanrong

A serverless, synchronized wedding-speech reader for German-, English-, and Chinese-speaking guests. One QR code opens the language picker; a protected presenter page controls every connected guest in near real time.

## Architecture

- **React + TypeScript + Vite** — static multi-page application
- **Firebase Realtime Database** — one small shared `live` record plus native reconnect support
- **Firebase Authentication** — presenter signs in with email/password
- **GitHub Pages + Actions** — no application server to operate
- **Offline behavior** — Firebase keeps the live subscription reconnecting; the most recent valid state is also cached in `localStorage`, so guests keep seeing the last section after reload or sleep and synchronize immediately when Firebase reconnects

Firestore was not chosen because Realtime Database exposes `.info/connected`, making the guest connection indicator and reconnect behavior simpler and more explicit.

## 1. Installation

Requirements: Node.js 22+ and npm.

```bash
git clone https://github.com/nschuster/wedding-speech-wanrong.git
cd wedding-speech-wanrong
npm ci
cp .env.example .env.local
```

## 2. Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. **Project settings → Your apps → Web app**: register a web app and copy its config values.
3. **Build → Realtime Database → Create database**. Prefer a nearby region (for example `europe-west1`) and start in locked mode.
4. **Build → Authentication → Sign-in method**: enable **Email/Password**.
5. **Authentication → Users**: create exactly one presenter user with a strong, unique password.
6. Deploy `database.rules.json`. It is configured for the presenter account `niklas.schuster@zoho.com`:

```bash
npm install --global firebase-tools
firebase login
firebase use --add wedding-speach-niklas
firebase deploy --only database
```

7. In Realtime Database, create this initial data (or sign in to Presenter and choose **Welcome** from the Jump menu):

```json
{"live":{"currentSection":0,"updatedAt":0}}
```

### Data model

```json
{
  "live": {
    "currentSection": 0,
    "updatedAt": 1787688000000
  }
}
```

`currentSection: 0` is the synchronized multilingual welcome screen. Speech sections use values `1..N` and are displayed as `1 / N` through `N / N` to guests.

## 3. Configuration

Fill `.env.local` from the Firebase web-app configuration:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.europe-west1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=...
VITE_DEMO_MODE=false
VITE_BASE_PATH=/
```

Firebase web configuration is not a server secret; authorization is enforced by database rules. Do not put the presenter password in an environment variable or repository.

`VITE_DEMO_MODE=true` activates a same-browser, `localStorage`-based adapter for automated/UI testing only. **Never use demo mode for the wedding deployment** because it does not synchronize different devices.

## 4. Security and authentication

The included rules provide:

- public read access to only `/live`, required for guests without accounts;
- write access only to an authenticated Firebase user whose verified token email matches the presenter email in `database.rules.json`;
- integer/range shape validation and rejection of unknown fields;
- default denial for every other database path.

Before going live:

- confirm `niklas.schuster@zoho.com` is the intended presenter account and deploy the rules;
- use a unique 16+ character presenter password and store it in a password manager;
- do not share `/presenter/` or its credentials;
- test a guest browser cannot write through the Firebase console/REST API;
- keep only one presenter tab active during the speech.

If the repository is public, the presenter email may be visible in the rules. This does not grant access; the password and Firebase Auth still protect writes. Use a dedicated address if desired.

## 5. Local development

```bash
npm run dev
```

Open the URL printed by Vite. For local UI work without Firebase, set `VITE_DEMO_MODE=true` in `.env.local`.

Quality checks:

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 6. GitHub Pages deployment

1. Push the repository to GitHub with the default branch named `main`.
2. **Settings → Pages → Build and deployment → Source**: select **GitHub Actions**.
3. Add these **Settings → Secrets and variables → Actions → Repository secrets**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
4. Push to `main` or run **Test and deploy GitHub Pages** manually.

The workflow validates Firebase configuration, runs unit and desktop/mobile browser tests, builds both entry pages, uploads `dist`, and deploys it. It automatically sets `VITE_BASE_PATH` to `/REPOSITORY_NAME/`.

Unlike a client-side fallback route, this project generates a real `presenter/index.html`. Directly opening or refreshing the presenter URL therefore works on GitHub Pages.

## 7. URLs and QR code

Production URLs:

| Purpose | URL |
|---|---|
| One guest QR / language picker | `https://nschuster.github.io/wedding-speech-wanrong/` |
| German directly | `https://nschuster.github.io/wedding-speech-wanrong/?lang=de` |
| English directly | `https://nschuster.github.io/wedding-speech-wanrong/?lang=en` |
| Chinese directly | `https://nschuster.github.io/wedding-speech-wanrong/?lang=zh` |
| Presenter | `https://nschuster.github.io/wedding-speech-wanrong/presenter/` |

Generate **one QR code only**, pointing to the first URL. Print and test it with both iPhone and Android cameras before the wedding. The root guest URL deliberately shows the language picker every time, even if that browser previously chose a language; direct `?lang=` URLs bypass the picker.

The Presenter welcome section generates this production QR code directly in the browser. Keep the presenter on **Welcome** while guests arrive; press **Right Arrow** or **Space** to start speech section 1 on every connected phone.

## 8. Replacing the speech

Edit only [`src/speech.json`](src/speech.json):

```json
[
  {"id": 1, "de": "German text", "en": "English translation", "zh": "中文翻译"},
  {
    "id": 2,
    "de": "A section with a photo",
    "en": "A section with a photo",
    "zh": "带照片的段落",
    "image": "images/your-photo.webp",
    "imagePosition": "center",
    "imageFit": "contain"
  }
]
```

Rules:

1. Keep valid JSON (double quotes, commas between entries, no trailing comma).
2. Keep IDs sequential, starting at `1`.
3. Every entry must contain non-empty `de`, `en`, and `zh` strings.
4. Keep each section short enough to fit a phone screen; split long paragraphs.
5. Run `npm test && npm run build`, then push to `main`.

### Optional section background images

1. Put optimized `.webp`, `.jpg`, or `.png` files in `public/images/`.
2. Add `"image": "images/filename.webp"` only to the sections that should display one.
3. Optionally set `imagePosition` to a CSS background position such as `center`, `center 35%`, `top`, or `right center` to control the crop.
4. Set `imageFit` to `contain` to show the complete image without zooming or cropping. Use `cover` only when filling every edge is more important than preserving the whole image. If omitted, it defaults to `cover` for backward compatibility.
5. Do not start the image path with `/`; the application automatically applies the correct GitHub Pages base path.
6. Remove `image`, `imagePosition`, and `imageFit` from a section to return to the normal text-only design.

The guest view expands the photo across the entire viewport behind the header, translated text, and footer, with a dark readability overlay and white text. The presenter also shows the same photo behind the current German section while keeping its controls and next-section preview unchanged. Section 18 uses the replaceable Königssee example; section 20 uses the supplied personal Paris photo.

The included content test catches missing translations, non-sequential IDs, and an unexpected section count. The production speech currently contains 28 synchronized sections; update the expected length in `src/content.test.ts` if that structure changes.

## Presenter controls

- **Next**: Right Arrow or Space
- **Previous**: Left Arrow
- compact Jump dropdown in the header (Welcome plus all speech sections)
- fullscreen and sign out
- current German section plus next-section preview
- large scannable guest QR code on the Welcome section

## Wedding-day reliability checklist

1. Deploy the final speech at least 48 hours early.
2. Rehearse the exact nine-step multi-device scenario below on the venue Wi-Fi and mobile data.
3. Keep the presenter laptop plugged in and disable its automatic sleep.
4. Keep a phone hotspot available as a backup network.
5. Print the QR with the full production URL and test the printed copy.
6. Open Presenter before guests arrive, sign in, and choose **Welcome** from the Jump menu.
7. Keep a PDF/printed copy of all translations as a non-realtime fallback.

### Verified synchronization scenario

The automated component and browser tests cover:

1. English guest opens.
2. Chinese guest opens.
3. Presenter opens.
4. Presenter advances.
5. Both languages change.
6. One guest disconnects/closes.
7. Presenter advances twice.
8. Guest reconnects/reopens.
9. Guest immediately displays the current section.

The browser suite runs both desktop Chromium and a Pixel 7 viewport and checks the guest view does not require page scrolling.

## Optional wake lock

After a guest chooses a language, the app requests the Screen Wake Lock API where supported. Browsers may deny or release it; this never blocks synchronization or display. Guests can still use their normal phone auto-lock settings.

## License

Private/personal use. Add a license before redistributing as a public template.

### Example-image credit

- Königssee from Jenner — A. Öztas, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sch%C3%B6nau_am_K%C3%B6nigssee_(DE),_K%C3%B6nigssee_vom_Jenner_--_2024_--_0357-88.jpg), CC BY 4.0.
