//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
//#endregion
let electron = require("electron");
let electron_updater = require("electron-updater");
let path = require("path");
path = __toESM(path);
let fs = require("fs");
let fs_promises = require("fs/promises");
let better_sqlite3 = require("better-sqlite3");
better_sqlite3 = __toESM(better_sqlite3);
let child_process = require("child_process");
//#region src/main/ipc/window.ts
function registerWindowIpc(win) {
	electron.ipcMain.handle("window:minimize", () => win.minimize());
	electron.ipcMain.handle("window:maximize", () => {
		if (win.isMaximized()) win.unmaximize();
		else win.maximize();
	});
	electron.ipcMain.handle("window:close", () => win.close());
	electron.ipcMain.handle("window:isMaximized", () => win.isMaximized());
	win.on("maximize", () => win.webContents.send("window:maximized", true));
	win.on("unmaximize", () => win.webContents.send("window:maximized", false));
}
//#endregion
//#region src/main/ipc/settings.ts
var JsonStore = class {
	file = null;
	data = {};
	name;
	constructor(name) {
		this.name = name;
	}
	init() {
		if (this.file) return;
		const dir = electron.app.getPath("userData");
		(0, fs.mkdirSync)(dir, { recursive: true });
		this.file = path.default.join(dir, `${this.name}.json`);
		if ((0, fs.existsSync)(this.file)) try {
			this.data = JSON.parse((0, fs.readFileSync)(this.file, "utf8"));
		} catch {
			this.data = {};
		}
	}
	get(key) {
		this.init();
		return this.data[key];
	}
	set(key, value) {
		this.init();
		this.data[key] = value;
		(0, fs.writeFileSync)(this.file, JSON.stringify(this.data, null, 2), "utf8");
	}
	delete(key) {
		this.init();
		delete this.data[key];
		(0, fs.writeFileSync)(this.file, JSON.stringify(this.data, null, 2), "utf8");
	}
	getAll() {
		this.init();
		return { ...this.data };
	}
};
var store = new JsonStore("streamvault-prefs");
function registerSettingsIpc() {
	electron.ipcMain.handle("settings:get", (_event, key) => store.get(key));
	electron.ipcMain.handle("settings:set", (_event, key, value) => store.set(key, value));
	electron.ipcMain.handle("settings:delete", (_event, key) => store.delete(key));
	electron.ipcMain.handle("settings:getAll", () => store.getAll());
	electron.ipcMain.handle("settings:pickFolder", async () => {
		const result = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
		if (result.canceled || result.filePaths.length === 0) return null;
		return result.filePaths[0];
	});
	electron.ipcMain.handle("settings:getDiskSpace", async (_event, folderPath) => {
		try {
			const stats = await (0, fs_promises.statfs)(folderPath);
			return {
				free: stats.bfree * stats.bsize,
				total: stats.blocks * stats.bsize
			};
		} catch {
			return null;
		}
	});
	electron.ipcMain.handle("settings:openAppData", async () => {
		await electron.shell.openPath(electron.app.getPath("userData"));
	});
	electron.ipcMain.handle("settings:openRecordingsFolder", async () => {
		const p = store.get("storagePath") || path.default.join(require("os").homedir(), "Videos", "StreamVault");
		await electron.shell.openPath(p);
	});
}
//#endregion
//#region src/main/db.ts
var db_exports = /* @__PURE__ */ __exportAll({
	getDb: () => getDb,
	recordings: () => recordings,
	streamers: () => streamers
});
function getDb() {
	if (!db) {
		db = new better_sqlite3.default(path.default.join(electron.app.getPath("userData"), "streamvault.db"));
		db.pragma("journal_mode = WAL");
		db.pragma("foreign_keys = ON");
		db.exec(`
      CREATE TABLE IF NOT EXISTS streamers (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        platform     TEXT NOT NULL,
        username     TEXT NOT NULL,
        channel_url  TEXT NOT NULL UNIQUE,
        display_name TEXT,
        avatar_url   TEXT,
        added_at     INTEGER NOT NULL,
        is_active    INTEGER NOT NULL DEFAULT 1,
        last_checked INTEGER,
        last_live_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS recordings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        streamer_id      INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
        title            TEXT,
        platform         TEXT NOT NULL,
        stream_date      INTEGER NOT NULL,
        file_path        TEXT,
        thumbnail_path   TEXT,
        duration_secs    REAL,
        file_size_bytes  INTEGER,
        video_codec      TEXT,
        audio_codec      TEXT,
        resolution       TEXT,
        fps              REAL,
        language         TEXT,
        viewer_count     INTEGER,
        category         TEXT,
        status           TEXT NOT NULL DEFAULT 'recording',
        started_at       INTEGER NOT NULL,
        completed_at     INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_recordings_streamer ON recordings(streamer_id);
      CREATE INDEX IF NOT EXISTS idx_recordings_status   ON recordings(status);
      CREATE INDEX IF NOT EXISTS idx_recordings_date     ON recordings(stream_date DESC);

      CREATE TABLE IF NOT EXISTS clips (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id   INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        title          TEXT,
        start_secs     REAL NOT NULL,
        end_secs       REAL NOT NULL,
        file_path      TEXT,
        thumbnail_path TEXT,
        duration_secs  REAL,
        created_at     INTEGER NOT NULL
      );
    `);
		try {
			db.exec("ALTER TABLE recordings ADD COLUMN category TEXT");
		} catch {}
	}
	return db;
}
var db, streamers, recordings;
var init_db = __esmMin((() => {
	db = null;
	streamers = {
		getAll() {
			return getDb().prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM recordings r WHERE r.streamer_id = s.id) as recording_count,
        (SELECT MAX(r.stream_date) FROM recordings r WHERE r.streamer_id = s.id) as last_recording_at
      FROM streamers s
      ORDER BY s.added_at DESC
    `).all();
		},
		getActive() {
			return getDb().prepare("SELECT * FROM streamers WHERE is_active = 1").all();
		},
		getById(id) {
			return getDb().prepare("SELECT * FROM streamers WHERE id = ?").get(id);
		},
		add(data) {
			const r = getDb().prepare(`
      INSERT INTO streamers (platform, username, channel_url, display_name, avatar_url, added_at)
      VALUES (@platform, @username, @channel_url, @display_name, @avatar_url, @added_at)
    `).run({
				...data,
				display_name: data.display_name ?? data.username,
				avatar_url: data.avatar_url ?? null,
				added_at: Date.now()
			});
			return getDb().prepare("SELECT * FROM streamers WHERE id = ?").get(r.lastInsertRowid);
		},
		remove(id) {
			getDb().prepare("DELETE FROM streamers WHERE id = ?").run(id);
		},
		setActive(id, active) {
			getDb().prepare("UPDATE streamers SET is_active = ? WHERE id = ?").run(active ? 1 : 0, id);
		},
		updateChecked(id, checkedAt, liveAt) {
			if (liveAt != null) getDb().prepare("UPDATE streamers SET last_checked = ?, last_live_at = ? WHERE id = ?").run(checkedAt, liveAt, id);
			else getDb().prepare("UPDATE streamers SET last_checked = ? WHERE id = ?").run(checkedAt, id);
		},
		updateMeta(id, data) {
			getDb().prepare("UPDATE streamers SET display_name = COALESCE(@display_name, display_name), avatar_url = COALESCE(@avatar_url, avatar_url) WHERE id = @id").run({
				id,
				display_name: data.display_name ?? null,
				avatar_url: data.avatar_url ?? null
			});
		}
	};
	recordings = {
		getAll() {
			return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name, s.avatar_url as streamer_avatar
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      ORDER BY r.stream_date DESC
    `).all();
		},
		getByStreamer(streamerId) {
			return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      WHERE r.streamer_id = ?
      ORDER BY r.stream_date DESC
    `).all(streamerId);
		},
		getById(id) {
			return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name, s.avatar_url as streamer_avatar, s.platform as streamer_platform
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      WHERE r.id = ?
    `).get(id);
		},
		getActiveForStreamer(streamerId) {
			return getDb().prepare("SELECT * FROM recordings WHERE streamer_id = ? AND status IN ('recording', 'processing')").get(streamerId);
		},
		add(data) {
			return getDb().prepare(`
      INSERT INTO recordings (streamer_id, title, platform, stream_date, status, started_at, file_path, viewer_count, category)
      VALUES (@streamer_id, @title, @platform, @stream_date, @status, @started_at, @file_path, @viewer_count, @category)
    `).run({
				title: null,
				file_path: null,
				viewer_count: null,
				category: null,
				...data
			}).lastInsertRowid;
		},
		update(id, data) {
			const fields = Object.keys(data).map((k) => `${k} = @${k}`).join(", ");
			getDb().prepare(`UPDATE recordings SET ${fields} WHERE id = @id`).run({
				id,
				...data
			});
		},
		delete(id) {
			getDb().prepare("DELETE FROM recordings WHERE id = ?").run(id);
		},
		getStats() {
			return getDb().prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'recording' THEN 1 ELSE 0 END), 0) as active,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
        COALESCE(SUM(COALESCE(duration_secs, 0)), 0) as total_duration,
        COALESCE(SUM(CASE WHEN stream_date > ? THEN 1 ELSE 0 END), 0) as last_24h
      FROM recordings
    `).get(Date.now() - 864e5);
		},
		deleteAllFailed() {
			const rows = getDb().prepare("SELECT file_path FROM recordings WHERE status = 'failed'").all();
			getDb().prepare("DELETE FROM recordings WHERE status = 'failed'").run();
			return rows.map((r) => r.file_path).filter(Boolean);
		}
	};
}));
//#endregion
//#region src/main/ffmpeg.ts
init_db();
function getBinPath(name) {
	if (name === "yt-dlp") {
		const override = store.get("ytdlpPath");
		if (override && (0, fs.existsSync)(override)) return override;
	} else if (name === "ffmpeg") {
		const override = store.get("ffmpegPath");
		if (override && (0, fs.existsSync)(override)) return override;
	}
	const exe = name + (process.platform === "win32" ? ".exe" : "");
	if (electron.app.isPackaged) return path.default.join(process.resourcesPath, "bin", exe);
	return path.default.join(__dirname, "../../resources/bin", exe);
}
function extractMetadata(filePath, timeoutMs = 3e4) {
	return new Promise((resolve) => {
		const ffprobe = getBinPath("ffprobe");
		if (!(0, fs.existsSync)(ffprobe)) {
			resolve({});
			return;
		}
		const proc = (0, child_process.spawn)(ffprobe, [
			"-v",
			"quiet",
			"-print_format",
			"json",
			"-show_streams",
			"-show_format",
			filePath
		]);
		const killTimer = setTimeout(() => {
			console.warn("[ffprobe] timed out on", filePath, "— killing");
			try {
				proc.kill();
			} catch {}
			resolve({});
		}, timeoutMs);
		killTimer.unref();
		let stdout = "";
		proc.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		proc.on("close", () => {
			clearTimeout(killTimer);
			try {
				const json = JSON.parse(stdout);
				const videoStream = json.streams?.find((s) => s.codec_type === "video");
				const audioStream = json.streams?.find((s) => s.codec_type === "audio");
				const fmt = json.format;
				const fps = videoStream?.r_frame_rate ? (() => {
					const [n, d] = videoStream.r_frame_rate.split("/").map(Number);
					return d ? Math.round(n / d * 10) / 10 : void 0;
				})() : void 0;
				const lang = audioStream?.tags?.language && audioStream.tags.language !== "und" ? audioStream.tags.language.toUpperCase() : void 0;
				resolve({
					duration: fmt?.duration ? parseFloat(fmt.duration) : void 0,
					videoCodec: videoStream?.codec_name,
					audioCodec: audioStream?.codec_name,
					resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : void 0,
					fps,
					fileSize: fmt?.size ? parseInt(fmt.size) : void 0,
					language: lang
				});
			} catch {
				resolve({});
			}
		});
		proc.on("error", () => {
			clearTimeout(killTimer);
			resolve({});
		});
	});
}
function extractThumbnail(filePath, outputPath, atSecs = 30, timeoutMs = 3e4) {
	return new Promise((resolve) => {
		const ffmpeg = getBinPath("ffmpeg");
		if (!(0, fs.existsSync)(ffmpeg)) {
			resolve(false);
			return;
		}
		const proc = (0, child_process.spawn)(ffmpeg, [
			"-ss",
			String(atSecs),
			"-i",
			filePath,
			"-vframes",
			"1",
			"-q:v",
			"2",
			"-y",
			outputPath
		]);
		const killTimer = setTimeout(() => {
			console.warn("[ffmpeg] extractThumbnail timed out on", filePath, "— killing");
			try {
				proc.kill();
			} catch {}
			resolve(false);
		}, timeoutMs);
		killTimer.unref();
		proc.on("close", (code) => {
			clearTimeout(killTimer);
			resolve(code === 0);
		});
		proc.on("error", () => {
			clearTimeout(killTimer);
			resolve(false);
		});
	});
}
/** Grab a single frame from a (possibly partial/live) file — seeks 60s from end */
function captureSnapshot(inputPath, outputPath) {
	return new Promise((resolve) => {
		const ffmpeg = getBinPath("ffmpeg");
		if (!(0, fs.existsSync)(ffmpeg) || !(0, fs.existsSync)(inputPath)) {
			resolve(false);
			return;
		}
		const proc = (0, child_process.spawn)(ffmpeg, [
			"-sseof",
			"-60",
			"-i",
			inputPath,
			"-vframes",
			"1",
			"-q:v",
			"4",
			"-y",
			outputPath
		]);
		proc.on("close", (code) => resolve(code === 0));
		proc.on("error", () => resolve(false));
		const t = setTimeout(() => {
			proc.kill();
			resolve(false);
		}, 15e3);
		proc.on("close", () => clearTimeout(t));
	});
}
//#endregion
//#region src/main/platforms.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
function detectPlatform(url) {
	if (/twitch\.tv/i.test(url)) return "twitch";
	if (/kick\.com/i.test(url)) return "kick";
	if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
	if (/tiktok\.com/i.test(url)) return "tiktok";
	if (/afreecatv\.com/i.test(url)) return "afreeca";
	if (/twitcasting\.tv/i.test(url)) return "twitcasting";
	if (/bilibili\.com/i.test(url)) return "bilibili";
	if (/pandalive\.co\.kr/i.test(url)) return "panda";
	if (/pandatv\.com/i.test(url)) return "panda";
	if (/ttinglive\.com/i.test(url)) return "flextv";
	if (/flextv\.co\.kr/i.test(url)) return "flextv";
	if (/rumble\.com/i.test(url)) return "rumble";
	if (/douyin\.com/i.test(url)) return "douyin";
	return "unknown";
}
function extractUsername(url, platform) {
	try {
		const parts = new URL(url).pathname.split("/").filter(Boolean);
		switch (platform) {
			case "youtube": return parts.find((p) => p.startsWith("@"))?.slice(1) ?? parts[0] ?? url;
			case "tiktok": return parts.find((p) => p.startsWith("@"))?.slice(1) ?? parts[0] ?? url;
			case "panda": {
				const liveIdx = parts.indexOf("live");
				if (liveIdx !== -1 && parts[liveIdx + 1] === "play") return parts[liveIdx + 2] ?? parts[0] ?? url;
				return parts[parts.length - 1] ?? url;
			}
			case "flextv": {
				const chIdx = parts.indexOf("channels");
				if (chIdx !== -1) return parts[chIdx + 1] ?? parts[0] ?? url;
				return parts[0] ?? url;
			}
			case "rumble":
				if (parts[0] === "c" || parts[0] === "user") return parts[1] ?? url;
				return parts[0] ?? url;
			default: return parts[0] ?? url;
		}
	} catch {
		return url;
	}
}
var twitchToken = null;
var twitchTokenExpiry = 0;
async function getTwitchToken(clientId, clientSecret) {
	if (twitchToken && Date.now() < twitchTokenExpiry) return twitchToken;
	try {
		const body = await fetchJson(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, { method: "POST" });
		twitchToken = body.access_token ?? null;
		twitchTokenExpiry = Date.now() + (body.expires_in ?? 3600) * 1e3 - 6e4;
		return twitchToken;
	} catch {
		return null;
	}
}
async function checkTwitchBatch(usernames) {
	const result = /* @__PURE__ */ new Map();
	const clientId = store.get("twitchClientId");
	const clientSecret = store.get("twitchClientSecret");
	if (!clientId || !clientSecret) {
		for (const u of usernames) result.set(u, { isLive: false });
		return result;
	}
	const token = await getTwitchToken(clientId, clientSecret);
	if (!token) {
		for (const u of usernames) result.set(u, { isLive: false });
		return result;
	}
	try {
		const data = await fetchJson(`https://api.twitch.tv/helix/streams?${usernames.map((u) => `user_login=${encodeURIComponent(u)}`).join("&")}&first=100`, { headers: {
			"Client-ID": clientId,
			"Authorization": `Bearer ${token}`
		} });
		for (const u of usernames) result.set(u, { isLive: false });
		for (const stream of data.data ?? []) result.set(stream.user_login.toLowerCase(), {
			isLive: true,
			title: stream.title,
			viewerCount: stream.viewer_count,
			thumbnailUrl: stream.thumbnail_url?.replace("{width}", "320").replace("{height}", "180"),
			streamId: stream.id,
			category: stream.game_name || void 0
		});
	} catch {
		for (const u of usernames) result.set(u, { isLive: false });
	}
	return result;
}
async function checkKick(username) {
	try {
		const data = await fetchJson(`https://kick.com/api/v2/channels/${username}/livestream`, { headers: {
			"User-Agent": UA,
			"Accept": "application/json"
		} });
		if (!data?.data) return { isLive: false };
		const kickData = data.data;
		const category = kickData.categories?.[0]?.name;
		return {
			isLive: true,
			title: kickData.session_title,
			viewerCount: kickData.viewer_count,
			thumbnailUrl: kickData.thumbnail?.url,
			streamId: kickData.id?.toString(),
			category: category || void 0
		};
	} catch {
		return { isLive: false };
	}
}
async function findKickVodM3u8(channelUrl) {
	const username = channelUrl.split("/").filter(Boolean).pop();
	if (!username) return null;
	try {
		const videos = (await fetchJson(`https://kick.com/api/v1/channels/${username}/videos?sort=desc`, { headers: {
			"User-Agent": UA,
			"Accept": "application/json"
		} }))?.data ?? [];
		if (!videos.length) return null;
		const video = videos[0];
		const thumbUrl = video?.thumbnail?.src ?? "";
		const startTime = video?.start_time ?? "";
		const thumbParts = thumbUrl.split("/");
		if (thumbParts.length < 6) return null;
		const channelId = thumbParts[4];
		const videoId = thumbParts[5];
		const start = /* @__PURE__ */ new Date(startTime.replace(" ", "T") + "Z");
		const bases = [
			"https://stream.kick.com/ivs/v1/196233775518",
			"https://stream.kick.com/3c81249a5ce0/ivs/v1/196233775518",
			"https://stream.kick.com/0f3cb0ebce7/ivs/v1/196233775518"
		];
		for (let offset = -5; offset <= 5; offset++) {
			const t = new Date(start.getTime() + offset * 6e4);
			const y = t.getUTCFullYear();
			const mo = t.getUTCMonth() + 1;
			const d = t.getUTCDate();
			const h = t.getUTCHours();
			const mi = t.getUTCMinutes();
			for (const base of bases) {
				const url = `${base}/${channelId}/${y}/${mo}/${d}/${h}/${mi}/${videoId}/media/hls/master.m3u8`;
				if (await headRequest(url)) return url;
			}
		}
		return null;
	} catch {
		return null;
	}
}
function checkViaYtdlp(channelUrl) {
	return new Promise((resolve) => {
		const proc = (0, child_process.spawn)(getBinPath("yt-dlp"), [
			"--simulate",
			"--no-download",
			"--quiet",
			"--print",
			"%(is_live)s|||%(title)s|||%(view_count)s|||%(thumbnail)s|||%(categories.0)s",
			channelUrl
		]);
		let stdout = "";
		proc.stdout.on("data", (d) => {
			stdout += d.toString();
		});
		proc.on("close", (code) => {
			if (code !== 0) {
				resolve({ isLive: false });
				return;
			}
			const parts = (stdout.trim().split("\n").find((l) => l.includes("True")) ?? stdout.trim()).split("|||");
			const isLive = parts[0]?.trim() === "True";
			const rawCategory = parts[4]?.trim();
			resolve({
				isLive,
				title: parts[1]?.trim() || void 0,
				viewerCount: parts[2] ? parseInt(parts[2]) || void 0 : void 0,
				thumbnailUrl: parts[3]?.trim() || void 0,
				category: rawCategory && rawCategory !== "NA" && rawCategory !== "None" ? rawCategory : void 0
			});
		});
		proc.on("error", () => resolve({ isLive: false }));
		setTimeout(() => {
			proc.kill();
			resolve({ isLive: false });
		}, 15e3);
	});
}
async function fetchAvatarUrl(platform, username) {
	try {
		switch (platform) {
			case "twitch": {
				const url = await fetchText(`https://decapi.me/twitch/avatar/${username}`);
				return url.startsWith("http") ? url.trim() : null;
			}
			case "kick": {
				const pic = ((await fetchJson(`https://kick.com/api/v2/channels/${username}`, { headers: {
					"User-Agent": UA,
					"Accept": "application/json"
				} }))?.user)?.profile_pic;
				return typeof pic === "string" ? pic : null;
			}
			case "afreeca": return `https://profile.img.afreecatv.com/LOGO/${username}/${username}.jpg`;
			case "panda": {
				const thumb = ((await fetchJson(`https://api.pandalive.co.kr/v1/live/play?channel=${encodeURIComponent(username)}&info=media`, { headers: {
					"User-Agent": UA,
					"Accept": "application/json",
					"Origin": "https://www.pandalive.co.kr"
				} }))?.userInfo)?.profileImg;
				return typeof thumb === "string" ? thumb : null;
			}
			case "youtube": {
				const html = await fetchText(username.startsWith("UC") ? `https://www.youtube.com/channel/${username}` : `https://www.youtube.com/@${username}`);
				const m = html.match(/<meta property="og:image" content="([^"]+)"/);
				if (m?.[1]) return m[1];
				return html.match(/https:\/\/yt3\.googleusercontent\.com\/[A-Za-z0-9_-]{20,}/)?.[0] ?? null;
			}
			case "rumble": return (await fetchText(username.startsWith("http") ? username : `https://rumble.com/c/${username}`)).match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null;
			default: return null;
		}
	} catch {
		return null;
	}
}
function fetchJson(url, opts = {}) {
	return new Promise((resolve, reject) => {
		const req = electron.net.request({
			method: opts.method ?? "GET",
			url
		});
		if (opts.headers) for (const [k, v] of Object.entries(opts.headers)) req.setHeader(k, v);
		req.setHeader("Accept", "application/json");
		let body = "";
		req.on("response", (res) => {
			res.on("data", (chunk) => {
				body += chunk.toString();
			});
			res.on("end", () => {
				try {
					resolve(JSON.parse(body));
				} catch {
					reject(/* @__PURE__ */ new Error("JSON parse error"));
				}
			});
		});
		req.on("error", reject);
		req.end();
	});
}
function fetchText(url) {
	return new Promise((resolve, reject) => {
		const req = electron.net.request({
			method: "GET",
			url
		});
		req.setHeader("User-Agent", UA);
		let body = "";
		req.on("response", (res) => {
			res.on("data", (chunk) => {
				body += chunk.toString();
			});
			res.on("end", () => resolve(body));
		});
		req.on("error", reject);
		req.end();
	});
}
function headRequest(url) {
	return new Promise((resolve) => {
		try {
			const req = electron.net.request({
				method: "HEAD",
				url
			});
			req.setHeader("User-Agent", UA);
			req.on("response", (res) => resolve(res.statusCode === 200));
			req.on("error", () => resolve(false));
			req.end();
		} catch {
			resolve(false);
		}
	});
}
//#endregion
//#region src/main/state.ts
/** Shared runtime state — imported by both monitor and recorder to avoid circular deps */
var recentlyFinished = /* @__PURE__ */ new Map();
var COOLDOWN_MS = 300 * 1e3;
function markRecordingFinished(streamerId) {
	recentlyFinished.set(streamerId, Date.now());
}
//#endregion
//#region src/main/recorder.ts
var active = /* @__PURE__ */ new Map();
var manuallyStopped = /* @__PURE__ */ new Set();
var mainWindow$2 = null;
function setMainWindow(win) {
	mainWindow$2 = win;
}
function send(channel, data) {
	mainWindow$2?.webContents.send(channel, data);
}
function getStoragePath() {
	return store.get("storagePath") || require("path").join(require("os").homedir(), "Videos", "StreamVault");
}
function getQualityFormat(quality, platform) {
	if (platform === "twitch") switch (quality) {
		case "1080p60": return "1080p60/best";
		case "1080": return "1080p60/1080p/best";
		case "720": return "720p60/720p/best";
		case "480": return "480p/best";
		default: return "best";
	}
	if (platform === "kick") switch (quality) {
		case "1080p60": return "1080p60/1080p/best";
		case "1080": return "1080p/best";
		case "720": return "720p60/720p/best";
		case "480": return "480p/best";
		default: return "best";
	}
	switch (quality) {
		case "1080p60": return "bestvideo[height<=1080][fps<=60]+bestaudio/bestvideo[height<=1080]+bestaudio/best";
		case "1080": return "bestvideo[height<=1080]+bestaudio/best";
		case "720": return "bestvideo[height<=720]+bestaudio/best";
		case "480": return "bestvideo[height<=480]+bestaudio/best";
		default: return "bestvideo[height<=1080][fps<=60]+bestaudio/bestvideo[height<=1080]+bestaudio/best";
	}
}
function sanitize(s) {
	return s.replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
}
function pad(n) {
	return String(n).padStart(2, "0");
}
function buildFileName(streamer, platform, title) {
	const pattern = store.get("fileNamePattern") ?? "{streamer}_{date}_{time}";
	const now = /* @__PURE__ */ new Date();
	return pattern.replace("{streamer}", sanitize(streamer)).replace("{platform}", platform).replace("{date}", `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`).replace("{time}", `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`).replace("{title}", sanitize(title ?? "stream")).slice(0, 120);
}
async function startRecording(recordingId, streamerId, channelUrl, platform, streamerName) {
	const storagePath = getStoragePath();
	(0, fs.mkdirSync)(storagePath, { recursive: true });
	const outputFormat = store.get("outputFormat") ?? "mp4";
	const baseName = buildFileName(streamerName, platform);
	const finalExt = outputFormat === "ts" ? ".ts" : ".mp4";
	const finalPath = path.default.join(storagePath, baseName + finalExt);
	recordings.update(recordingId, { file_path: finalPath });
	if (platform === "kick_vod") {
		const m3u8 = await findKickVodM3u8(channelUrl);
		if (!m3u8) {
			recordings.update(recordingId, {
				status: "failed",
				completed_at: Date.now()
			});
			send("recording:failed", {
				recordingId,
				error: "Could not find Kick VOD M3U8 URL"
			});
			markRecordingFinished(streamerId);
			return;
		}
		spawnFfmpegDownload(recordingId, streamerId, m3u8, finalPath, finalPath);
		return;
	}
	const ytdlp = getBinPath("yt-dlp");
	const format = getQualityFormat(store.get("defaultQuality"), platform);
	const tempPath = path.default.join(storagePath, baseName + ".ts");
	const proc = (0, child_process.spawn)(ytdlp, [
		...platform === "youtube" ? ["--live-from-start"] : ["--no-live-from-start"],
		"--hls-use-mpegts",
		"--no-part",
		"--newline",
		"--progress",
		"--retries",
		String(store.get("maxRetries") ?? 3),
		"--fragment-retries",
		String(store.get("maxRetries") ?? 3),
		"--socket-timeout",
		"30",
		"--no-continue",
		"--format",
		format,
		"-o",
		tempPath,
		channelUrl
	], { stdio: [
		"pipe",
		"pipe",
		"pipe"
	] });
	proc.stderr?.on("data", (d) => console.log("[yt-dlp]", d.toString().trim()));
	let lastSize = 0;
	let staleTicks = 0;
	const watchdog = setInterval(() => {
		if (!active.has(recordingId)) {
			clearInterval(watchdog);
			return;
		}
		try {
			const { size } = (0, fs.statSync)(tempPath);
			if (size === lastSize) {
				staleTicks++;
				if (staleTicks >= 4) {
					console.log(`[recorder] watchdog: no file growth for ${staleTicks} ticks, killing ${recordingId}`);
					clearInterval(watchdog);
					proc.kill();
				}
			} else {
				staleTicks = 0;
				lastSize = size;
			}
		} catch {}
	}, 6e4);
	const rec = {
		process: proc,
		recordingId,
		streamerId,
		startedAt: Date.now(),
		outputPath: tempPath,
		platform
	};
	active.set(recordingId, rec);
	setTimeout(async () => {
		if (!active.has(recordingId)) return;
		if (!(0, fs.existsSync)(tempPath)) return;
		const meta = await extractMetadata(tempPath);
		if (meta.videoCodec || meta.resolution) {
			recordings.update(recordingId, {
				video_codec: meta.videoCodec,
				audio_codec: meta.audioCodec,
				resolution: meta.resolution,
				fps: meta.fps,
				language: meta.language
			});
			send("recording:metaUpdate", {
				recordingId,
				meta
			});
		}
	}, 1e4);
	rec.snapshotTimer = setInterval(async () => {
		if (!(0, fs.existsSync)(tempPath)) return;
		try {
			const { size } = (0, fs.statSync)(tempPath);
			recordings.update(recordingId, { file_size_bytes: size });
			send("recording:sizeUpdate", {
				recordingId,
				fileSize: size
			});
		} catch {}
		const snapshotPath = tempPath.replace(/\.[^.]+$/, "_snap.jpg");
		if (await captureSnapshot(tempPath, snapshotPath)) {
			recordings.update(recordingId, { thumbnail_path: snapshotPath });
			send("recording:snapshot", {
				recordingId,
				snapshotPath
			});
		}
	}, 3e4);
	setTimeout(async () => {
		if (!active.has(recordingId) || !(0, fs.existsSync)(tempPath)) return;
		const snapshotPath = tempPath.replace(/\.[^.]+$/, "_snap.jpg");
		if (await captureSnapshot(tempPath, snapshotPath)) {
			recordings.update(recordingId, { thumbnail_path: snapshotPath });
			send("recording:snapshot", {
				recordingId,
				snapshotPath
			});
		}
	}, 45e3);
	proc.stdout.on("data", (data) => {
		const line = data.toString().trim();
		const fragMatch = line.match(/Downloading segment (\d+)/);
		if (fragMatch) send("recording:progress", {
			recordingId,
			fragments: parseInt(fragMatch[1])
		});
		const pctMatch = line.match(/(\d+\.?\d*)%/);
		if (pctMatch) send("recording:progress", {
			recordingId,
			percent: parseFloat(pctMatch[1])
		});
	});
	proc.on("close", async (code) => {
		clearInterval(watchdog);
		if (rec.snapshotTimer) clearInterval(rec.snapshotTimer);
		if (rec.forceKillTimer) clearTimeout(rec.forceKillTimer);
		active.delete(recordingId);
		const wasManualStop = manuallyStopped.delete(recordingId);
		console.log(`[recorder] yt-dlp exited (code ${code}, manual=${wasManualStop}) for recording ${recordingId}`);
		if (!wasManualStop && code !== 0) {
			markRecordingFinished(streamerId);
			recordings.update(recordingId, {
				status: "failed",
				completed_at: Date.now()
			});
			send("recording:failed", {
				recordingId,
				error: `yt-dlp exited with code ${code}`
			});
			return;
		}
		try {
			await onRecordingFinished(recordingId, tempPath, finalPath);
		} catch (err) {
			console.error("[recorder] onRecordingFinished threw unexpectedly:", err);
			try {
				recordings.update(recordingId, {
					status: "failed",
					completed_at: Date.now(),
					file_path: (0, fs.existsSync)(finalPath) ? finalPath : (0, fs.existsSync)(tempPath) ? tempPath : void 0
				});
			} catch {}
			send("recording:failed", {
				recordingId,
				error: String(err)
			});
		}
	});
	proc.on("error", async (err) => {
		clearInterval(watchdog);
		if (rec.snapshotTimer) clearInterval(rec.snapshotTimer);
		active.delete(recordingId);
		console.error("[recorder] yt-dlp spawn error:", err);
		recordings.update(recordingId, {
			status: "failed",
			completed_at: Date.now()
		});
		send("recording:failed", {
			recordingId,
			error: "yt-dlp spawn error"
		});
		markRecordingFinished(streamerId);
	});
}
function spawnFfmpegDownload(recordingId, streamerId, inputUrl, outputPath, finalPath) {
	const proc = (0, child_process.spawn)(getBinPath("ffmpeg"), [
		"-i",
		inputUrl,
		"-c",
		"copy",
		"-movflags",
		"+faststart",
		"-y",
		finalPath
	]);
	active.set(recordingId, {
		process: proc,
		recordingId,
		streamerId,
		startedAt: Date.now(),
		outputPath: finalPath,
		platform: "kick_vod"
	});
	proc.on("close", async () => {
		active.delete(recordingId);
		markRecordingFinished(streamerId);
		await onRecordingFinished(recordingId, finalPath, finalPath);
	});
	proc.on("error", async () => {
		active.delete(recordingId);
		recordings.update(recordingId, {
			status: "failed",
			completed_at: Date.now()
		});
		send("recording:failed", {
			recordingId,
			error: "ffmpeg spawn error"
		});
		markRecordingFinished(streamerId);
	});
}
/** Remux with a hard timeout — spawns ffmpeg directly so we can kill it cleanly on timeout */
function remuxWithTimeout(tsPath, finalPath, timeoutMs = 12e4) {
	return new Promise((resolve) => {
		const ffmpegBin = getBinPath("ffmpeg");
		if (!(0, fs.existsSync)(ffmpegBin) || !(0, fs.existsSync)(tsPath)) {
			resolve(false);
			return;
		}
		console.log("[recorder] remuxing", tsPath, "->", finalPath);
		const proc = (0, child_process.spawn)(ffmpegBin, [
			"-i",
			tsPath,
			"-c",
			"copy",
			"-movflags",
			"+faststart",
			"-y",
			finalPath
		], { stdio: [
			"ignore",
			"ignore",
			"pipe"
		] });
		let stderr = "";
		proc.stderr?.on("data", (d) => {
			stderr += d.toString();
		});
		const killTimer = setTimeout(() => {
			console.warn("[recorder] remux timed out after", timeoutMs / 1e3, "s — killing ffmpeg");
			try {
				proc.kill();
			} catch {}
			resolve(false);
		}, timeoutMs);
		killTimer.unref();
		proc.on("close", (code) => {
			clearTimeout(killTimer);
			if (code !== 0) console.error("[recorder] remux failed (exit", code, "):\n", stderr.slice(-800));
			else console.log("[recorder] remux OK");
			resolve(code === 0);
		});
		proc.on("error", (err) => {
			clearTimeout(killTimer);
			console.error("[recorder] remux spawn error:", err);
			resolve(false);
		});
	});
}
async function onRecordingFinished(recordingId, tsPath, finalPath) {
	if (!(0, fs.existsSync)(tsPath)) {
		recordings.update(recordingId, {
			status: "failed",
			completed_at: Date.now()
		});
		send("recording:failed", {
			recordingId,
			error: "Output file not found"
		});
		return;
	}
	let finalFile = finalPath;
	if (tsPath !== finalPath) if (await remuxWithTimeout(tsPath, finalPath)) try {
		await (0, fs_promises.unlink)(tsPath);
	} catch {}
	else {
		finalFile = tsPath;
		recordings.update(recordingId, { file_path: tsPath });
	}
	const meta = await extractMetadata(finalFile);
	const thumbPath = finalFile.replace(/\.[^.]+$/, "_thumb.jpg");
	await extractThumbnail(finalFile, thumbPath, Math.min(30, (meta.duration ?? 60) * .1));
	const rec = recordings.getById(recordingId);
	recordings.update(recordingId, {
		status: "completed",
		completed_at: Date.now(),
		duration_secs: meta.duration,
		file_size_bytes: meta.fileSize,
		video_codec: meta.videoCodec,
		audio_codec: meta.audioCodec,
		resolution: meta.resolution,
		fps: meta.fps,
		language: meta.language,
		thumbnail_path: (0, fs.existsSync)(thumbPath) ? thumbPath : void 0
	});
	send("recording:completed", { recordingId });
	if (rec?.streamer_id) markRecordingFinished(rec.streamer_id);
	if (store.get("notifyOnComplete") === true && electron.Notification.isSupported()) new electron.Notification({
		title: "Recording complete",
		body: rec?.title ?? "A recording has finished."
	}).show();
}
async function stopRecording(recordingId) {
	recordings.update(recordingId, { status: "processing" });
	send("recording:stopping", { recordingId });
	const rec = active.get(recordingId);
	if (!rec) {
		console.log(`[recorder] stopRecording: no active process for id ${recordingId}, marking failed`);
		recordings.update(recordingId, {
			status: "failed",
			completed_at: Date.now()
		});
		send("recording:failed", {
			recordingId,
			error: "Process not found (orphaned recording)"
		});
		return;
	}
	manuallyStopped.add(recordingId);
	if (rec.snapshotTimer) clearInterval(rec.snapshotTimer);
	markRecordingFinished(rec.streamerId);
	try {
		if (rec.process.stdin && !rec.process.stdin.destroyed) {
			rec.process.stdin.write("q\n");
			rec.process.stdin.end();
		}
	} catch {}
	const forceKillTimer = setTimeout(() => {
		if (!active.has(recordingId)) return;
		console.log(`[recorder] force-killing ${recordingId} after 10s graceful timeout`);
		try {
			rec.process.kill();
		} catch {}
		if (process.platform === "win32" && rec.process.pid) (0, child_process.spawn)("taskkill", [
			"/F",
			"/T",
			"/PID",
			String(rec.process.pid)
		], { stdio: "ignore" }).unref();
	}, 1e4);
	forceKillTimer.unref();
	rec.forceKillTimer = forceKillTimer;
}
async function stopAll() {
	const promises = [];
	for (const [id] of active) promises.push(stopRecording(id));
	await Promise.all(promises);
}
/** Hard-kill every child process tracked by the recorder.
*  Called on app exit to prevent yt-dlp / ffmpeg orphan processes. */
function killAllProcesses() {
	for (const [, rec] of active) try {
		if (rec.snapshotTimer) clearInterval(rec.snapshotTimer);
		if (process.platform === "win32" && rec.process.pid) {
			const { spawnSync } = require("child_process");
			spawnSync("taskkill", [
				"/F",
				"/T",
				"/PID",
				String(rec.process.pid)
			]);
		} else rec.process.kill("SIGKILL");
	} catch {}
	active.clear();
}
function getActiveIds() {
	return Array.from(active.keys());
}
async function deleteRecordingFile(filePath) {
	try {
		await (0, fs_promises.unlink)(filePath);
	} catch {}
}
//#endregion
//#region src/main/monitor.ts
init_db();
var intervalHandle = null;
var mainWindow$1 = null;
var nextTickAt = 0;
function startMonitor(win) {
	mainWindow$1 = win;
	scheduleInterval(store.get("pollingIntervalSecs") ?? 10);
}
function stopMonitor() {
	if (intervalHandle) {
		clearInterval(intervalHandle);
		intervalHandle = null;
	}
}
function setPollingInterval(secs) {
	stopMonitor();
	scheduleInterval(secs);
}
function scheduleInterval(secs) {
	const ms = Math.max(secs, 10) * 1e3;
	nextTickAt = Date.now() + ms;
	intervalHandle = setInterval(tick, ms);
	setTimeout(tick, 3e3);
}
function getMonitorStatus() {
	return {
		running: intervalHandle !== null,
		nextTickIn: Math.max(0, nextTickAt - Date.now()),
		activeRecordingIds: getActiveIds()
	};
}
async function checkStreamerNow(streamerId) {
	const row = streamers.getById(streamerId);
	if (!row) return;
	await checkAndRecord(row);
}
async function tick() {
	nextTickAt = Date.now() + (store.get("pollingIntervalSecs") ?? 10) * 1e3;
	const activeStreamers = streamers.getActive();
	if (!activeStreamers.length) return;
	const maxConcurrent = store.get("maxConcurrentRecordings") ?? 3;
	const twitchStreamers = activeStreamers.filter((s) => s.platform === "twitch");
	const otherStreamers = activeStreamers.filter((s) => s.platform !== "twitch");
	if (twitchStreamers.length > 0) {
		const results = await checkTwitchBatch(twitchStreamers.map((s) => s.username.toLowerCase()));
		for (const s of twitchStreamers) {
			const info = results.get(s.username.toLowerCase()) ?? { isLive: false };
			streamers.updateChecked(s.id, Date.now(), info.isLive ? Date.now() : void 0);
			const onCooldown1 = (recentlyFinished.get(s.id) ?? 0) + COOLDOWN_MS > Date.now();
			if (info.isLive && !onCooldown1 && getActiveIds().length < maxConcurrent) {
				if (!recordings.getActiveForStreamer(s.id)) {
					const recId = recordings.add({
						streamer_id: s.id,
						title: info.title ?? `${s.display_name} stream`,
						platform: s.platform,
						stream_date: Date.now(),
						status: "recording",
						started_at: Date.now(),
						viewer_count: info.viewerCount,
						category: info.category
					});
					await startRecording(recId, s.id, s.channel_url, s.platform, s.display_name);
					mainWindow$1?.webContents.send("monitor:streamWentLive", {
						streamerId: s.id,
						recordingId: recId
					});
					if (store.get("notifications") !== false && electron.Notification.isSupported()) new electron.Notification({
						title: `${s.display_name} is live`,
						body: info.title ?? `${s.display_name} started streaming`
					}).show();
				}
			}
		}
	}
	const BATCH = 5;
	for (let i = 0; i < otherStreamers.length; i += BATCH) {
		const batch = otherStreamers.slice(i, i + BATCH);
		await Promise.allSettled(batch.map((s) => checkAndRecord(s, maxConcurrent)));
	}
}
async function checkAndRecord(s, maxConcurrent = 3) {
	try {
		let info;
		if (s.platform === "kick") info = await checkKick(s.username);
		else info = await checkViaYtdlp(s.channel_url);
		streamers.updateChecked(s.id, Date.now(), info.isLive ? Date.now() : void 0);
		const onCooldown2 = (recentlyFinished.get(s.id) ?? 0) + COOLDOWN_MS > Date.now();
		if (info.isLive && !onCooldown2 && getActiveIds().length < maxConcurrent) {
			if (!recordings.getActiveForStreamer(s.id)) {
				const recId = recordings.add({
					streamer_id: s.id,
					title: info.title ?? `${s.display_name} stream`,
					platform: s.platform,
					stream_date: Date.now(),
					status: "recording",
					started_at: Date.now(),
					viewer_count: info.viewerCount,
					category: info.category
				});
				await startRecording(recId, s.id, s.channel_url, s.platform, s.display_name);
				mainWindow$1?.webContents.send("monitor:streamWentLive", {
					streamerId: s.id,
					recordingId: recId
				});
				if (store.get("notifications") !== false && electron.Notification.isSupported()) new electron.Notification({
					title: `${s.display_name} is live`,
					body: info.title ?? `${s.display_name} started streaming`
				}).show();
			}
		}
	} catch (err) {
		console.error(`[monitor] Error checking ${s.username}:`, err);
	}
}
//#endregion
//#region src/main/ipc/streamers.ts
init_db();
function registerStreamersIpc() {
	electron.ipcMain.handle("streamers:getAll", () => streamers.getAll());
	electron.ipcMain.handle("streamers:add", async (_event, channelUrl) => {
		const platform = detectPlatform(channelUrl);
		const username = extractUsername(channelUrl, platform);
		try {
			const row = streamers.add({
				platform,
				username,
				channel_url: channelUrl,
				display_name: username
			});
			const id = row.id;
			try {
				const avatarUrl = await fetchAvatarUrl(platform, username);
				if (avatarUrl) {
					streamers.updateMeta(id, { avatar_url: avatarUrl });
					row.avatar_url = avatarUrl;
				}
			} catch {}
			return row;
		} catch (err) {
			if ((err instanceof Error ? err.message : String(err)).includes("UNIQUE")) throw new Error("Streamer already added");
			throw err;
		}
	});
	electron.ipcMain.handle("streamers:remove", (_event, id) => {
		streamers.remove(id);
	});
	electron.ipcMain.handle("streamers:setActive", (_event, id, active) => {
		streamers.setActive(id, active);
	});
	electron.ipcMain.handle("streamers:checkNow", (_event, id) => {
		return checkStreamerNow(id);
	});
	electron.ipcMain.handle("streamers:refreshAvatars", async () => {
		const missing = streamers.getAll().filter((s) => !s.avatar_url);
		await Promise.allSettled(missing.map(async (s) => {
			const url = await fetchAvatarUrl(s.platform, s.username);
			if (url) streamers.updateMeta(s.id, { avatar_url: url });
		}));
		return streamers.getAll();
	});
}
//#endregion
//#region src/main/ipc/recordings.ts
init_db();
function registerRecordingsIpc() {
	electron.ipcMain.handle("recordings:getAll", () => recordings.getAll());
	electron.ipcMain.handle("recordings:getByStreamer", (_event, streamerId) => recordings.getByStreamer(streamerId));
	electron.ipcMain.handle("recordings:getById", (_event, id) => recordings.getById(id));
	electron.ipcMain.handle("recordings:getStats", () => recordings.getStats());
	electron.ipcMain.handle("recordings:stop", (_event, id) => stopRecording(id));
	electron.ipcMain.handle("recordings:delete", async (_event, id) => {
		const row = recordings.getById(id);
		recordings.delete(id);
		if (row?.file_path) await deleteRecordingFile(row.file_path);
		if (row?.thumbnail_path) await deleteRecordingFile(row.thumbnail_path);
	});
	electron.ipcMain.handle("recordings:openFolder", (_event, filePath) => {
		const normalized = path.default.normalize(filePath);
		if ((0, fs.existsSync)(normalized)) electron.shell.showItemInFolder(normalized);
		else electron.shell.openPath(path.default.dirname(normalized));
	});
	electron.ipcMain.handle("recordings:openFile", async (_event, filePath) => {
		const normalized = path.default.normalize(filePath);
		const err = await electron.shell.openPath(normalized);
		if (err) console.error("[recordings:openFile]", err);
	});
	electron.ipcMain.handle("recordings:clearFailed", async () => {
		const paths = recordings.deleteAllFailed();
		for (const p of paths) await deleteRecordingFile(p);
	});
}
//#endregion
//#region src/main/ipc/monitor.ts
function registerMonitorIpc() {
	electron.ipcMain.handle("monitor:getStatus", () => getMonitorStatus());
	electron.ipcMain.handle("monitor:setInterval", (_event, secs) => {
		store.set("pollingIntervalSecs", secs);
		setPollingInterval(secs);
	});
	electron.ipcMain.handle("monitor:pause", () => stopMonitor());
	electron.ipcMain.handle("monitor:resume", () => {
		setPollingInterval(store.get("pollingIntervalSecs") ?? 60);
	});
}
//#endregion
//#region src/main/index.ts
var isQuitting = false;
electron.app.commandLine.appendSwitch("enable-features", "PlatformHEVCDecoderSupport,HardwareMediaKeyHandling,MediaSessionService");
electron.app.commandLine.appendSwitch("enable-accelerated-video-decode");
electron.app.commandLine.appendSwitch("enable-gpu-rasterization");
electron.protocol.registerSchemesAsPrivileged([{
	scheme: "media",
	privileges: {
		secure: true,
		supportFetchAPI: true,
		bypassCSP: true,
		corsEnabled: true
	}
}]);
var mainWindow = null;
var tray = null;
function createWindow() {
	electron.protocol.handle("media", (request) => {
		try {
			const url = new URL(request.url);
			const rawPath = decodeURIComponent(url.pathname);
			const filePath = (0, path.normalize)(process.platform === "win32" ? rawPath.replace(/^\//, "") : rawPath);
			if (!(0, fs.existsSync)(filePath)) return new Response("Not found", { status: 404 });
			const ext = (0, path.extname)(filePath).toLowerCase();
			const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "application/octet-stream";
			const data = (0, fs.readFileSync)(filePath);
			return new Response(data, {
				status: 200,
				headers: { "Content-Type": mime }
			});
		} catch {
			return new Response("Error", { status: 500 });
		}
	});
	mainWindow = new electron.BrowserWindow({
		width: 1360,
		height: 860,
		minWidth: 960,
		minHeight: 620,
		frame: false,
		transparent: false,
		backgroundColor: "#000000",
		titleBarStyle: "hidden",
		show: false,
		webPreferences: {
			preload: (0, path.join)(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false
		}
	});
	if (process.platform === "win32") try {
		mainWindow.setBackgroundMaterial("acrylic");
	} catch {}
	mainWindow.on("ready-to-show", () => {
		if (store.get("startMinimized")) mainWindow?.hide();
		else mainWindow?.show();
	});
	const iconPath = (0, path.join)(__dirname, "../../resources/icon.ico");
	const trayIcon = (0, fs.existsSync)(iconPath) ? electron.nativeImage.createFromPath(iconPath).resize({
		width: 16,
		height: 16
	}) : electron.nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2P8z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==");
	tray = new electron.Tray(trayIcon);
	tray.setToolTip("StreamVault");
	tray.setContextMenu(electron.Menu.buildFromTemplate([
		{
			label: "Show StreamVault",
			click: () => {
				mainWindow?.show();
				mainWindow?.focus();
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				electron.app.quit();
			}
		}
	]));
	tray.on("click", () => {
		if (mainWindow?.isVisible()) mainWindow.focus();
		else {
			mainWindow?.show();
			mainWindow?.focus();
		}
	});
	mainWindow.on("close", (e) => {
		if (!isQuitting) {
			e.preventDefault();
			mainWindow?.hide();
			tray?.displayBalloon?.({
				title: "StreamVault",
				content: "Still running in the background. Active recordings continue.",
				icon: trayIcon
			});
		}
	});
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//i.test(url)) electron.shell.openExternal(url);
		return { action: "deny" };
	});
	registerWindowIpc(mainWindow);
	registerSettingsIpc();
	registerStreamersIpc();
	registerRecordingsIpc();
	registerMonitorIpc();
	electron.ipcMain.handle("shell:openExternal", async (_event, url) => {
		if (/^https?:\/\//i.test(url)) await electron.shell.openExternal(url);
	});
	electron.ipcMain.handle("updater:installAndRestart", () => {
		isQuitting = true;
		electron_updater.autoUpdater.quitAndInstall();
	});
	setMainWindow(mainWindow);
	startMonitor(mainWindow);
	try {
		const { getDb } = (init_db(), __toCommonJS(db_exports));
		getDb().prepare("UPDATE recordings SET status = 'failed', completed_at = ? WHERE status IN ('recording', 'processing')").run(Date.now());
	} catch {}
	if (electron.app.isPackaged) {
		electron_updater.autoUpdater.checkForUpdatesAndNotify();
		electron_updater.autoUpdater.on("update-available", () => {
			mainWindow?.webContents.send("updater:available");
		});
		electron_updater.autoUpdater.on("update-downloaded", () => {
			mainWindow?.webContents.send("updater:downloaded");
		});
	}
	if (process.env.ELECTRON_RENDERER_URL) mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	else mainWindow.loadFile((0, path.join)(__dirname, "../renderer/index.html"));
}
electron.app.whenReady().then(createWindow);
electron.app.on("activate", () => {
	if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.on("window-all-closed", () => {
	if (process.platform === "darwin") electron.app.quit();
});
electron.app.on("before-quit", async () => {
	isQuitting = true;
	stopMonitor();
	killAllProcesses();
	await stopAll();
});
process.on("uncaughtException", async (err) => {
	console.error("[uncaughtException]", err);
	stopMonitor();
	killAllProcesses();
	await stopAll();
});
process.on("SIGTERM", () => {
	killAllProcesses();
	process.exit(0);
});
process.on("SIGINT", () => {
	killAllProcesses();
	process.exit(0);
});
//#endregion
