let electron = require("electron");
//#region src/preload/index.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	minimize: () => electron.ipcRenderer.invoke("window:minimize"),
	maximize: () => electron.ipcRenderer.invoke("window:maximize"),
	close: () => electron.ipcRenderer.invoke("window:close"),
	isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
	onMaximizeChange: (cb) => {
		const h = (_, v) => cb(v);
		electron.ipcRenderer.on("window:maximized", h);
		return () => electron.ipcRenderer.off("window:maximized", h);
	},
	getSetting: (key) => electron.ipcRenderer.invoke("settings:get", key),
	setSetting: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
	getAllSettings: () => electron.ipcRenderer.invoke("settings:getAll"),
	pickFolder: () => electron.ipcRenderer.invoke("settings:pickFolder"),
	getDiskSpace: (folderPath) => electron.ipcRenderer.invoke("settings:getDiskSpace", folderPath),
	openAppDataFolder: () => electron.ipcRenderer.invoke("settings:openAppData"),
	openRecordingsFolder: () => electron.ipcRenderer.invoke("settings:openRecordingsFolder"),
	streamersGetAll: () => electron.ipcRenderer.invoke("streamers:getAll"),
	streamersAdd: (channelUrl) => electron.ipcRenderer.invoke("streamers:add", channelUrl),
	streamersRemove: (id) => electron.ipcRenderer.invoke("streamers:remove", id),
	streamersSetActive: (id, active) => electron.ipcRenderer.invoke("streamers:setActive", id, active),
	streamersCheckNow: (id) => electron.ipcRenderer.invoke("streamers:checkNow", id),
	streamersRefreshAvatars: () => electron.ipcRenderer.invoke("streamers:refreshAvatars"),
	recordingsGetAll: () => electron.ipcRenderer.invoke("recordings:getAll"),
	recordingsGetByStreamer: (streamerId) => electron.ipcRenderer.invoke("recordings:getByStreamer", streamerId),
	recordingsGetById: (id) => electron.ipcRenderer.invoke("recordings:getById", id),
	recordingsGetStats: () => electron.ipcRenderer.invoke("recordings:getStats"),
	recordingsClearFailed: () => electron.ipcRenderer.invoke("recordings:clearFailed"),
	recordingsStop: (id) => electron.ipcRenderer.invoke("recordings:stop", id),
	recordingsDelete: (id) => electron.ipcRenderer.invoke("recordings:delete", id),
	recordingsOpenFolder: (filePath) => electron.ipcRenderer.invoke("recordings:openFolder", filePath),
	recordingsOpenFile: (filePath) => electron.ipcRenderer.invoke("recordings:openFile", filePath),
	monitorGetStatus: () => electron.ipcRenderer.invoke("monitor:getStatus"),
	monitorSetInterval: (secs) => electron.ipcRenderer.invoke("monitor:setInterval", secs),
	monitorPause: () => electron.ipcRenderer.invoke("monitor:pause"),
	monitorResume: () => electron.ipcRenderer.invoke("monitor:resume"),
	openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
	updaterInstallAndRestart: () => electron.ipcRenderer.invoke("updater:installAndRestart"),
	onUpdaterAvailable: (cb) => {
		const h = () => cb();
		electron.ipcRenderer.on("updater:available", h);
		return () => electron.ipcRenderer.off("updater:available", h);
	},
	onUpdaterDownloaded: (cb) => {
		const h = () => cb();
		electron.ipcRenderer.on("updater:downloaded", h);
		return () => electron.ipcRenderer.off("updater:downloaded", h);
	},
	onRecordingProgress: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:progress", h);
		return () => electron.ipcRenderer.off("recording:progress", h);
	},
	onRecordingCompleted: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:completed", h);
		return () => electron.ipcRenderer.off("recording:completed", h);
	},
	onRecordingFailed: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:failed", h);
		return () => electron.ipcRenderer.off("recording:failed", h);
	},
	onStreamWentLive: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("monitor:streamWentLive", h);
		return () => electron.ipcRenderer.off("monitor:streamWentLive", h);
	},
	onRecordingSnapshot: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:snapshot", h);
		return () => electron.ipcRenderer.off("recording:snapshot", h);
	},
	onRecordingMetaUpdate: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:metaUpdate", h);
		return () => electron.ipcRenderer.off("recording:metaUpdate", h);
	},
	onRecordingSizeUpdate: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:sizeUpdate", h);
		return () => electron.ipcRenderer.off("recording:sizeUpdate", h);
	},
	onRecordingStopping: (cb) => {
		const h = (_, d) => cb(d);
		electron.ipcRenderer.on("recording:stopping", h);
		return () => electron.ipcRenderer.off("recording:stopping", h);
	}
});
//#endregion
