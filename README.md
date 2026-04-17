<div align="center">

<img src="https://raw.githubusercontent.com/kinderdat/streamvault/main/resources/icon.ico" width="96" height="96" alt="StreamVault Logo" />

# StreamVault

**Automatic stream archiver for Twitch, YouTube, Kick and more.**  
Record, archive, and clip live streams from one desktop app.

<br/>

<!-- Core Runtime -->
[![Electron](https://img.shields.io/badge/Electron-41.1.1-191919?style=for-the-badge&logo=electron&logoColor=47848F)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19.2.5-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.0.7-646CFF?style=for-the-badge&logo=vite&logoColor=FFBD2E)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2.2-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)](https://tailwindcss.com)
[![React Router](https://img.shields.io/badge/React_Router-7.14.1-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![Zustand](https://img.shields.io/badge/Zustand-5.0.12-433E38?style=for-the-badge&logo=react&logoColor=white)](https://zustand-demo.pmnd.rs)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.99.0-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Zod](https://img.shields.io/badge/Zod-4.3.6-3068B7?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev)
[![SQLite](https://img.shields.io/badge/SQLite-12.9.0-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![Video.js](https://img.shields.io/badge/Video.js-8.23.7-FF0000?style=for-the-badge&logo=vlc&logoColor=white)](https://videojs.com)
[![Phosphor Icons](https://img.shields.io/badge/Phosphor_Icons-2.1.10-8B5CF6?style=for-the-badge&logo=phosphoricons&logoColor=white)](https://phosphoricons.com)
[![Anime.js](https://img.shields.io/badge/Anime.js-4.3.6-FF6B9D?style=for-the-badge&logo=javascript&logoColor=white)](https://animejs.com)


[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)

<!-- Community -->
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-6B7280?style=flat-square&logo=github&logoColor=white)](https://github.com/kinderdat/StreamVault/releases)
[![Stars](https://img.shields.io/github/stars/kinderdat/StreamVault?style=flat-square&color=FBBF24&logo=starship&logoColor=FBBF24)](https://github.com/kinderdat/StreamVault/stargazers)
[![Issues](https://img.shields.io/github/issues/kinderdat/StreamVault?style=flat-square&color=F87171&logo=gitbook&logoColor=F87171)](https://github.com/kinderdat/StreamVault/issues)

</div>

---

## Overview

StreamVault is a desktop app for automatically archiving live streams from Twitch, YouTube, Kick, and more. Built on Electron and powered by `yt-dlp` + FFmpeg, it records raw `.ts` HLS segments and includes a lightweight clip workflow.

No subscriptions. No cloud. No data sent anywhere. Everything stays on your machine.

---

## Features

| Feature | Description |
|---|---|
| 🎥 **Auto Recording** | Monitor streamers and automatically record when they go live |
| ⚡ **Manual Checks** | One-click “Check” per streamer or “Check All” from the page header |
| ✂️ **Clipping (Lightweight)** | Create/manage clips |
| 💾 **Local SQLite Storage** | Recordings + metadata stored locally |
| 🧊 **Glass UI** | Modern dark UI with consistent “glass” card styling |
| 🖥️ **System Tray** | Runs in the background; closing hides to tray |

---

## Tech Stack

`React 19 · Tailwind CSS v4 · Vite 8 · Zustand · Radix UI primitives · Electron 41 · better-sqlite3 · yt-dlp · FFmpeg`

---

## Quick Start

```bash
git clone https://github.com/kinderdat/StreamVault.git
cd streamvault
npm install
npm run dist:win
```

> **Windows Users:** Download [`yt-dlp.exe`](https://github.com/yt-dlp/yt-dlp/releases), [`ffmpeg.exe`](https://ffmpeg.org/download.html), and `ffprobe.exe` and place them in `resources/bin/`.

### Updates

Auto-updating is **disabled/removed** right now. To update, download a newer release/build and replace the app manually.


---


## Roadmap

- [x] Twitch · YouTube · Kick recording
- [x] Local SQLite storage
- [x] Lightweight clipping workflow
- [ ] Additional platform support

---

- [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) 
- [**FFmpeg**](https://ffmpeg.org) 

---

## License

Distributed under the **MIT License** — free for personal and commercial use.  
See [`LICENSE`](LICENSE) for full terms.

---

<div align="center">

Author: [kinderdat](https://github.com/kinderdat) (kinder) · ⭐ Star if you find it useful

</div>
