export class PlaybackStats {
    constructor(video) {
        this.video = video;
        this.samples = [];
        this.fps = 0;
        this.xrFps = 0;
        this.cpuMs = 0;
        this.frames = 0;
        this.started = 0;
        this.disposed = false;
        const tick = (_now, metadata) => {
            if (this.disposed) return;
            const last = this.lastVideo;
            if (last && !video.seeking && !video.paused) {
                const seconds = metadata.mediaTime - last.mediaTime;
                const frames = metadata.presentedFrames - last.presentedFrames;
                const fps = frames / seconds;
                if (seconds > 0 && seconds < 1 && frames > 0 && fps >= 10 && fps <= 144) {
                    this.samples.push(fps);
                    if (this.samples.length > 24) this.samples.shift();
                    const sorted = [...this.samples].sort((a, b) => a - b);
                    this.fps = sorted[Math.floor(sorted.length / 2)];
                } else this.samples = [];
            }
            this.lastVideo = metadata;
            this.callback = video.requestVideoFrameCallback(tick);
        };
        if (video.requestVideoFrameCallback) this.callback = video.requestVideoFrameCallback(tick);
        this.onSeek = () => {
            this.samples = [];
            this.lastVideo = null;
            this.fps = 0;
        };
        video.addEventListener('seeking', this.onSeek);
    }

    frame(now, cpuMs, presenting) {
        if (!presenting) {
            this.started = 0;
            this.frames = 0;
            return;
        }
        if (!this.started) this.started = now;
        this.frames++;
        this.cpuMs = this.cpuMs ? this.cpuMs * 0.95 + cpuMs * 0.05 : cpuMs;
        if (now - this.started >= 1000) {
            this.xrFps = (this.frames * 1000) / (now - this.started);
            this.started = now;
            this.frames = 0;
        }
    }

    summary(session, layer) {
        const video = this.video;
        const quality = video.getVideoPlaybackQuality?.();
        const size = video.videoWidth ? `${video.videoWidth} × ${video.videoHeight}` : 'Waiting for video';
        const fps = this.fps ? ` · ≈${this.fps.toFixed(1)} video fps` : '';
        const dropped = quality ? ` · ${quality.droppedVideoFrames} dropped` : '';
        const xr = session
            ? `${this.xrFps.toFixed(0)} XR fps${session.frameRate ? ` / ${session.frameRate} target` : ''}`
            : 'Outside VR';
        const aa = layer ? (layer.antialias ? 'AA on' : 'AA off') : 'AA checked in VR';
        return [`${size}${fps}${dropped}`, `${xr} · ${this.cpuMs.toFixed(1)} ms CPU · ${aa}`];
    }

    dispose() {
        this.disposed = true;
        if (this.callback !== undefined) this.video.cancelVideoFrameCallback?.(this.callback);
        this.video.removeEventListener('seeking', this.onSeek);
    }
}
