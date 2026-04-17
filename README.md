<div align="center">

<img src="https://raw.githubusercontent.com/kinderdat/streamvault/main/resources/icon.ico" width="96" height="96" alt="StreamVault Logo" />

# StreamVault

**Automatic stream archiver for Twitch, YouTube, Kick and more.**  
Record, archive, and clip live streams from one desktop app.


<br/>

[![Electron](https://img.shields.io/badge/ELECTRON-41.1.1-191919?style=flat-square&logo=electron&logoColor=47848F&labelColor=2d2d2d)](https://electronjs.org)
[![React](https://img.shields.io/badge/REACT-19.2.5-61DAFB?style=flat-square&logo=react&logoColor=61DAFB&labelColor=2d2d2d)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TYPESCRIPT-6.0.2-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=2d2d2d)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/VITE-8.0.7-646CFF?style=flat-square&logo=vite&logoColor=FFBD2E&labelColor=2d2d2d)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/TAILWIND-4.2.2-38BDF8?style=flat-square&logo=tailwindcss&logoColor=38BDF8&labelColor=2d2d2d)](https://tailwindcss.com)

[![React Router](https://img.shields.io/badge/REACT_ROUTER-7.14.1-CA4245?style=flat-square&logo=reactrouter&logoColor=white&labelColor=2d2d2d)](https://reactrouter.com)
[![Zustand](https://img.shields.io/badge/ZUSTAND-5.0.12-F97316?style=flat-square&logo=react&logoColor=white&labelColor=2d2d2d)](https://zustand-demo.pmnd.rs)
[![TanStack Query](https://img.shields.io/badge/TANSTACK_QUERY-5.99.0-FF4154?style=flat-square&logo=reactquery&logoColor=white&labelColor=2d2d2d)](https://tanstack.com/query)
[![Zod](https://img.shields.io/badge/ZOD-4.3.6-3068B7?style=flat-square&logo=zod&logoColor=white&labelColor=2d2d2d)](https://zod.dev)

[![SQLite](https://img.shields.io/badge/SQLITE-12.9.0-003B57?style=flat-square&logo=sqlite&logoColor=white&labelColor=2d2d2d)](https://www.sqlite.org)
[![Video.js](https://img.shields.io/badge/VIDEO.JS-8.23.7-FF0000?style=flat-square&logo=vlc&logoColor=white&labelColor=2d2d2d)](https://videojs.com)
[![Phosphor Icons](https://img.shields.io/badge/PHOSPHOR_ICONS-2.1.10-8B5CF6?style=flat-square&logo=phosphoricons&logoColor=white&labelColor=2d2d2d)](https://phosphoricons.com)
[![Anime.js](https://img.shields.io/badge/ANIME.JS-4.3.6-FF6B9D?style=flat-square&logo=javascript&logoColor=white&labelColor=2d2d2d)](https://animejs.com)


[![GitHub Stars](https://img.shields.io/github/stars/kinderdat/StreamVault?style=social)](https://github.com/kinderdat/StreamVault/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/kinderdat/StreamVault?style=social)](https://github.com/kinderdat/StreamVault/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Last Commit](https://img.shields.io/github/last-commit/kinderdat/StreamVault)](https://github.com/kinderdat/StreamVault/commits/main)
[![Latest Release](https://img.shields.io/github/v/release/kinderdat/StreamVault?style=flat)](https://github.com/kinderdat/StreamVault/releases/latest)


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
