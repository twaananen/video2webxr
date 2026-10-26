import assert from 'node:assert/strict';
import test from 'node:test';
import { PlaybackStats } from '../src/playback-stats.js';
import {
    cadenceRate,
    DEFAULT_SETTINGS,
    normalizeSettings,
    SETTINGS,
    settingText,
    stepSetting,
    videoSettingsKey,
} from '../src/player-settings.js';

test('untrusted stored settings are bounded and never add properties', () => {
    const input = JSON.parse(
        '{"sharpness":20,"horizontal":-999,"renderScale":2,"swapEyes":"true","foveation":null,"extra":"ignored","__proto__":{"polluted":true}}',
    );
    const result = normalizeSettings(input);
    assert.equal(result.sharpness, 0.6);
    assert.equal(result.horizontal, -2);
    assert.equal(result.renderScale, 1);
    assert.equal(result.swapEyes, false);
    assert.equal(result.foveation, -1);
    assert.deepEqual(Object.keys(result), Object.keys(DEFAULT_SETTINGS));
    assert.equal({}.polluted, undefined);
    for (const bad of [null, undefined, [], 17, 'bad']) assert.deepEqual(normalizeSettings(bad), DEFAULT_SETTINGS);
    assert.equal(normalizeSettings({ brightness: NaN, contrast: Infinity }).contrast, 1);
});

test('controller steppers stop at safe limits instead of wrapping', () => {
    for (const [key, spec] of Object.entries(SETTINGS)) {
        const first = spec.values ? spec.values[0] : spec.min;
        const last = spec.values ? spec.values.at(-1) : spec.max;
        assert.equal(stepSetting(key, first, -1), first);
        assert.equal(stepSetting(key, last, 1), last);
        assert.ok(settingText(key, spec.default).length);
    }
    assert.equal(stepSetting('horizontal', 0.2, 1), 0.3);
});

test('saved video identities never include signed URLs or unrelated parameters', () => {
    assert.equal(
        videoSettingsKey('https://www.youtube.com/watch?v=a-b_1&token=SECRET#fragment'),
        'video2webxr:https://www.youtube.com/watch?v=a-b_1',
    );
    assert.equal(
        videoSettingsKey('https://example.com/movie/7?signature=SECRET#session'),
        'video2webxr:https://example.com/movie/7',
    );
    assert.equal(
        videoSettingsKey('https://youtube.com.evil.test/watch?v=SECRET'),
        'video2webxr:https://youtube.com.evil.test/watch',
    );
});

test('cadence matching uses only advertised rates and tolerates fractional video fps', () => {
    assert.equal(cadenceRate(23.976, [72, 90, 120], 90), 72);
    assert.equal(cadenceRate(24, [72, 90, 120], 120), 120);
    assert.equal(cadenceRate(29.97, [72, 90, 120], 72), 90);
    assert.equal(cadenceRate(59.94, [72, 90, 120], 72), 120);
    assert.equal(cadenceRate(25, [72, 90, 120], 72), null);
    for (const fps of [0, NaN, Infinity, 500]) assert.equal(cadenceRate(fps, [72, 90], 72), null);
});

test('video statistics ignore seeks and cancel their callback on disposal', () => {
    let tick, seek, canceled;
    const video = {
        paused: false,
        seeking: false,
        videoWidth: 1920,
        videoHeight: 1080,
        requestVideoFrameCallback(cb) {
            tick = cb;
            return 42;
        },
        cancelVideoFrameCallback(id) {
            canceled = id;
        },
        addEventListener(_event, cb) {
            seek = cb;
        },
        removeEventListener() {},
        getVideoPlaybackQuality() {
            return { droppedVideoFrames: 3 };
        },
    };
    const stats = new PlaybackStats(video);
    tick(0, { mediaTime: 0, presentedFrames: 1 });
    for (let i = 1; i <= 12; i++) tick((i * 1000) / 24, { mediaTime: i / 24, presentedFrames: i + 1 });
    assert.ok(Math.abs(stats.fps - 24) < 0.001);
    assert.match(stats.summary(null, null)[0], /1920 × 1080.*24.0 video fps.*3 dropped/);
    seek();
    assert.equal(stats.fps, 0);
    tick(0, { mediaTime: 500, presentedFrames: 15 });
    assert.equal(stats.samples.length, 0);
    stats.dispose();
    assert.equal(canceled, 42);
});
