<div align="center">

<img src="https://raw.githubusercontent.com/kinderdat/streamvault/main/resources/icon.ico" width="96" height="96" alt="StreamVault Logo" />

# StreamVault

**Automatic stream archiver for Twitch, YouTube, Kick and more.**  
Record, archive, and clip live streams — all from one place.

<br/>

[![Electron](https://img.shields.io/badge/Electron-41-191919?style=for-the-badge&logo=electron&logoColor=47848F)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Local_DB-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-6B7280?style=flat-square&logo=github)](https://github.com/kinderdat/streamvault/releases)
[![Stars](https://img.shields.io/github/stars/kinderdat/streamvault?style=flat-square&color=FBBF24)](https://github.com/kinderdat/streamvault/stargazers)
[![Issues](https://img.shields.io/github/issues/kinderdat/streamvault?style=flat-square&color=F87171)](https://github.com/kinderdat/streamvault/issues)

</div>

---

## Overview

StreamVault is a desktop application for automatically archiving live streams from Twitch, YouTube, Kick, and more soon. Built on Electron and powered by yt-lp + FFmpeg, it records raw `.ts` HLS segments with quality option — and soon lets you trim clips instantly without re-encoding.

No subscriptions. No cloud. No data sent anywhere. Everything stays on your machine.

---

## Features

| Feature | Description |
|---|---|
| 🎥 **Raw Stream Recording** | Capture `.ts` HLS/m3u8 |
| 🔗 **Drag & Drop URLs** | Paste any supported stream link and hit record |
| 💾 **Local SQLite Storage** | All Recordings, metadata, and projects stored locally |
| 🎨 **Modern UI** | React 19 + Tailwind CSS v4  |
| 🖥️ **Cross-Platform** | Runs on Windows, macOS, and Linux |

---

## Tech Stack

```
Frontend   →  React 19 · Tailwind CSS v4 · Vite 8 · Zustand · Radix UI
Backend    →  Electron 41 · Node.js · better-sqlite3
Video      →  FFmpeg · Streamlink · yt-dlp
Build      →  vite-plugin-electron · electron-builder
```

---

## Quick Start

```bash
git clone https://github.com/kinderdat/streamvault.git
cd streamvault
npm install
npm run dev
```

> **Windows Users:** Download [`streamlink.exe`](https://github.com/streamlink/streamlink/releases), [`ffmpeg.exe`](https://ffmpeg.org/download.html), and `ffprobe.exe` and place them in `resources/bin/`.

---

## Project Structure

```
streamvault/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # IPC bridge (context bridge)
│   └── renderer/      # React application
├── resources/
│   └── bin/           # FFmpeg · yt-dlp binaries
└── out/               # Build output
```

---

## Roadmap

- [x] Twitch · YouTube · Kick recording
- [x] Local SQLite storage
- [ ] Lossless clip trimming
- [ ] Multi-track timeline editor via [Remotion](https://www.remotion.dev)
- [ ] Additional platform support

---

- [**yt-dlp**](https://github.com/yt-dlp/yt-dlp) — Feature-rich stream/video downloader
- [**FFmpeg**](https://ffmpeg.org) — Multimedia processing framework

---

## License

Distributed under the **MIT License** — free for personal and commercial use.  
See [`LICENSE`](LICENSE) for full terms.

---

<div align="center">

Made by [kinder](https://github.com/kinderdat) · ⭐ Star if you find it useful

</div>
