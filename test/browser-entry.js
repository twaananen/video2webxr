import * as THREE from 'three';
import { DEFAULT_SETTINGS } from '../src/player-settings.js';
import { PROJECTIONS, VRPlayer } from '../src/vr-player.js';

async function setup() {
    const source = document.createElement('canvas');
    source.width = 768;
    source.height = 512;
    const context = source.getContext('2d');
    let pattern = 'gray';
    const draw = () => {
        context.fillStyle = '#808080';
        context.fillRect(0, 0, source.width, source.height);
        if (pattern === 'stereo') {
            context.fillStyle = '#e02020';
            context.fillRect(0, 0, source.width / 2, source.height);
            context.fillStyle = '#2020e0';
            context.fillRect(source.width / 2, 0, source.width / 2, source.height);
        } else if (pattern === 'top-bottom') {
            context.fillStyle = '#e02020';
            context.fillRect(0, 0, source.width, source.height / 2);
            context.fillStyle = '#2020e0';
            context.fillRect(0, source.height / 2, source.width, source.height / 2);
        } else if (pattern === 'detail') {
            for (let x = 0; x < source.width; x += 8) {
                context.fillStyle = x % 16 ? '#303030' : '#b0b0b0';
                context.fillRect(x, 0, 8, source.height);
            }
        }
    };
    draw();
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = source.captureStream(30);
    await video.play();
    const player = new VRPlayer(video, 'EAC');
    player.renderer.setSize(640, 360);
    document.getElementById('view').append(player.canvas, video);
    document.getElementById('controls').append(player.createControls());
    const interval = setInterval(draw, 1000 / 30);
    const waitFrame = () =>
        new Promise((resolve) => {
            draw();
            // Offscreen browser views may not dispatch presentation callbacks.
            const timer = setTimeout(() => {
                video.cancelVideoFrameCallback(id);
                resolve();
            }, 150);
            const id = video.requestVideoFrameCallback(() => {
                clearTimeout(timer);
                resolve();
            });
        });
    const pixel = () => {
        for (const object of [...player.vrControls.handles, ...player.vrControls.controllers]) object.visible = false;
        player.material.map.needsUpdate = true;
        player.render();
        const gl = player.renderer.getContext(),
            out = new Uint8Array(4);
        gl.readPixels(gl.drawingBufferWidth / 2, gl.drawingBufferHeight / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
        return [...out];
    };
    const assert = (ok, message) => {
        if (!ok) throw new Error(message);
    };
    async function runChecks() {
        const results = [];
        player.settings = { ...DEFAULT_SETTINGS };
        player.applyPicture();
        pattern = 'gray';
        await waitFrame();
        for (const projection of Object.keys(PROJECTIONS)) {
            player.setProjection(projection);
            const color = pixel();
            assert(
                color.slice(0, 3).every((channel) => Math.abs(channel - 128) <= 4),
                `${projection} changed neutral color: ${color}`,
            );
            results.push(`${projection}: neutral color ${color.slice(0, 3).join('/')}`);
        }
        for (const projection of Object.keys(PROJECTIONS)) {
            player.setProjection(projection);
            player.updateSetting('sharpness', 0.6);
            player.updateSetting('brightness', 0.1);
            const color = pixel();
            assert(color[0] > 145 && color[0] < 170, `${projection}: correction did not apply: ${color}`);
        }
        results.push('All projections: picture effects compile and apply');
        player.settings = { ...DEFAULT_SETTINGS };
        player.applyPicture();
        pattern = 'stereo';
        await waitFrame();
        player.setProjection('360_LR');
        const left = pixel();
        player.updateSetting('swapEyes', true);
        const right = pixel();
        assert(left[0] > 180 && left[2] < 60 && right[2] > 180 && right[0] < 60, `Eye swap failed: ${left} / ${right}`);
        for (const projection of ['360_LR', '180_LR', 'EAC_LR', '360_TB']) {
            pattern = projection === '360_TB' ? 'top-bottom' : 'stereo';
            await waitFrame();
            player.updateSetting('swapEyes', false);
            player.updateSetting('sharpness', 0.6);
            player.setProjection(projection);
            const color = pixel();
            assert(color[0] > 180 && color[2] < 60, `${projection}: eye region leaked or mapped incorrectly: ${color}`);
        }
        player.updateSetting('sharpness', 0);
        player.updateSetting('horizontal', 0.5);
        player.updateSetting('vertical', -0.2);
        const rotations = player.meshes.map((mesh) => mesh.quaternion.toArray());
        assert(
            rotations[0].some((v, i) => v !== rotations[1][i]),
            'Stereo alignment did not affect the eyes separately',
        );
        player.setProjection('180_LR');
        player.updateSetting('fov', 190);
        assert(
            Math.abs(player.meshes[0].geometry.parameters.phiLength - THREE.MathUtils.degToRad(190)) < 0.0001,
            'VR180 FOV was not applied',
        );
        results.push('Stereo: eye swap, separate alignment and VR180 FOV verified');
        player.vrControls.activate('settings');
        player.vrControls.activate('setting:sharpness:1');
        assert(player.settings.sharpness === 0.1, 'Controller stepper failed');
        player.vrControls.activate('tab:2');
        player.vrControls.draw();
        document.getElementById('vr-preview').src = player.vrControls.canvas.toDataURL();
        player.setProjection('FLAT');
        const horizontal = player.settings.horizontal;
        player.vrControls.activate('setting:horizontal:1');
        assert(player.settings.horizontal === horizontal, 'Unavailable stereo control accepted input');
        player.vrControls.activate('done');
        assert(player.vrControls.canvas.height === 336, 'Playback panel did not restore its size');
        results.push('VR controls: navigation, stepper, disabled state and return verified');
        player.updateSetting('brightness', 0.1);
        player.comparePicture();
        assert(player.pictureUniforms.picture.value.y === 0, 'Original comparison did not bypass effects');
        player.comparePicture();
        assert(player.pictureUniforms.picture.value.y === 0.1, 'Comparison did not restore effects');
        assert(
            player.renderer.info.programs.every((program) => program.diagnostics?.runnable !== false),
            'A shader failed compilation',
        );
        results.push('Original comparison and shader compilation verified');
        await player.resetSettings();
        pattern = 'detail';
        await waitFrame();
        player.vrControls.setSettingsPage(0);
        player.vrControls.draw();
        document.getElementById('vr-preview').src = player.vrControls.canvas.toDataURL();
        player.vrControls.setSettingsPage(null);
        document.getElementById('result').textContent = results.join('\n');
        return results;
    }
    window.fixture = {
        player,
        video,
        source,
        runChecks,
        pixel,
        async runStorageChecks() {
            if (!globalThis.chrome) globalThis.chrome = {};
            const chrome = globalThis.chrome;
            const original = chrome.storage;
            const data = {};
            const instances = [];
            chrome.storage = {
                local: {
                    async get(key) {
                        return { [key]: data[key] };
                    },
                    async set(values) {
                        Object.assign(data, values);
                    },
                    async remove(key) {
                        delete data[key];
                    },
                },
            };
            try {
                const first = new VRPlayer(video, '180_LR');
                instances.push(first);
                await first.settingsReady;
                first.updateSetting('horizontal', 0.4);
                first.updateSetting('sharpness', 0.2);
                await first.saveSettings();
                assert(first.settingsMessage.startsWith('Saved'), 'Save was not acknowledged');
                const second = new VRPlayer(video, 'FLAT');
                instances.push(second);
                await second.settingsReady;
                assert(
                    second.settings.horizontal === 0.4 &&
                        second.settings.sharpness === 0.2 &&
                        second.projection === '180_LR',
                    'Saved profile did not restore',
                );
                await second.resetSettings();
                assert(
                    !data[second.settingsKey] && second.settings.horizontal === 0,
                    'Reset did not remove the profile',
                );
                chrome.storage.local.set = async () => {
                    throw new Error('Quota exceeded');
                };
                await first.saveSettings();
                assert(first.settingsMessage.startsWith('Could not save'), 'Storage failure was hidden');
                return ['Per-video save/load, projection restoration, reset and storage error feedback verified'];
            } finally {
                for (const instance of instances) await instance.dispose();
                chrome.storage = original;
            }
        },
        async benchmark() {
            const result = [];
            player.setProjection('EAC');
            const ratio = player.renderer.getPixelRatio();
            player.renderer.setPixelRatio(1);
            player.renderer.setSize(3456, 1728);
            const gl = player.renderer.getContext();
            try {
                assert(!gl.isContextLost(), 'Cannot benchmark a lost GPU context');
                const color = pixel();
                assert(color[0] > 100 && color[0] < 150, `Benchmark did not render its gray video: ${color}`);
                for (const sharpness of [0, 0.3, 0.6]) {
                    player.updateSetting('sharpness', sharpness);
                    for (let i = 0; i < 4; i++) {
                        player.render();
                        gl.finish();
                    }
                    const samples = [];
                    for (let i = 0; i < 20; i++) {
                        const start = performance.now();
                        player.render();
                        gl.finish();
                        samples.push(performance.now() - start);
                    }
                    samples.sort((a, b) => a - b);
                    result.push({ sharpness, medianMs: samples[10], p95Ms: samples[18] });
                }
                assert(gl.getError() === gl.NO_ERROR, 'GPU reported an error during benchmark');
            } finally {
                player.updateSetting('sharpness', 0);
                player.renderer.setPixelRatio(ratio);
                player.renderer.setSize(640, 360);
            }
            return {
                kind: 'Synchronized render wall time; synthetic 768x512 source, 3456x1728 output; excludes normal playback decoding costs',
                result,
            };
        },
        setPattern(value) {
            pattern = value;
            draw();
        },
        dispose: async () => {
            clearInterval(interval);
            await player.dispose();
            video.srcObject.getTracks().forEach((track) => {
                track.stop();
            });
        },
    };
    document.getElementById('checks').onclick = () =>
        runChecks().catch((error) => {
            document.getElementById('result').textContent = error.stack;
        });
    document.getElementById('result').textContent = 'Ready. Open Quality & comfort or run rendering checks.';
}
setup().catch((error) => {
    document.getElementById('result').textContent = error.stack;
});
