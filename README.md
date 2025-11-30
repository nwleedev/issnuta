# Issnuta

[한국어](./README.ko.md)

A mobile-first offline translation PWA supporting Korean, English, and Japanese.

<p align="center">
  <img src="docs/images/screenshot-main.jpg" width="220" alt="Main translator interface">
  &nbsp;&nbsp;
  <img src="docs/images/screenshot-feeds.jpg" width="220" alt="Saved translations list">
  &nbsp;&nbsp;
  <img src="docs/images/screenshot-selection.jpg" width="220" alt="Selection mode">
</p>
<p align="center">
  <b>Translator</b>&nbsp;&nbsp;·&nbsp;&nbsp;<b>Feeds</b>&nbsp;&nbsp;·&nbsp;&nbsp;<b>Selection</b>
</p>

Issnuta runs translation models directly in your browser using [Transformers.js](https://huggingface.co/docs/transformers.js) and [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), so you can translate text even without an internet connection.

## Features

- **Offline Translation** — Translate between KO↔EN and KO↔JA without network access
- **PWA Support** — Install on your device and use like a native app
- **User-Controlled Updates** — Choose when to update the app with a simple dialog
- **Mobile-First UI** — Optimized for smartphones and touch interactions

## Built With

- [Next.js 15](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Serwist](https://serwist.pages.dev/) (Service Worker / PWA)
- [Transformers.js](https://huggingface.co/docs/transformers.js) + [ONNX Runtime Web](https://onnxruntime.ai/)
- [TanStack Query](https://tanstack.com/query) (Data Fetching / Caching)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (Form Handling)
- [idb](https://github.com/jakearchibald/idb) (IndexedDB Wrapper)
- [qrcode](https://github.com/soldair/node-qrcode) (QR Code Generation)

## Getting Started

### Prerequisites

- Node.js 23 or later
- [pnpm](https://pnpm.io/)

### Installation

1. Clone the repository

   ```sh
   git clone https://github.com/nwleedev/issnuta.git
   cd issnuta
   ```

2. Install dependencies

   ```sh
   pnpm install
   ```

3. Start the development server

   ```sh
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```sh
pnpm build
pnpm start
```

### Run Tests

```sh
pnpm test
```

## Pages

| Route         | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `/`           | Main translator interface with language selection and text input    |
| `/feeds`      | Saved translations list with search, filtering, and QR code sharing |
| `/feeds/scan` | QR code scanner to import shared translations                       |
| `/offline`    | Fallback page shown when offline without cached content             |

## Project Structure

```
app/           → Next.js App Router pages and layouts
entries/       → Entry points (providers, shared UI wrappers)
shared/        → Shared utilities and UI components
  ├── lib/     → Hooks, helpers, and business logic
  └── ui/      → Reusable UI components
```

## How It Works

1. **First Visit** — The app downloads translation models for your selected language pair
2. **Offline Mode** — Once cached, translations work without internet
3. **Updates** — When a new version is available, a dialog lets you choose when to update

## License

This project is licensed under the MIT License.
