// Shared by the accessible page controls and the controller-operated VR panel.
export const SETTINGS_PAGES = [
    { title: 'Picture', keys: ['sharpness', 'brightness', 'contrast', 'saturation'] },
    { title: 'Rendering', keys: ['renderScale', 'foveation', 'refresh'] },
    { title: 'Comfort', keys: ['swapEyes', 'horizontal', 'vertical', 'fov', 'reclined'] },
];

export const SETTINGS = {
    sharpness: {
        label: 'Sharpness',
        min: 0,
        max: 0.6,
        step: 0.1,
        default: 0,
        help: 'Adds edge detail; lower values avoid compression halos.',
    },
    brightness: {
        label: 'Brightness',
        min: -0.2,
        max: 0.2,
        step: 0.02,
        default: 0,
        help: 'Picture brightness. Reset returns to the original.',
    },
    contrast: {
        label: 'Contrast',
        min: 0.7,
        max: 1.3,
        step: 0.05,
        default: 1,
        help: 'Keep at 100% for the original contrast.',
    },
    saturation: {
        label: 'Color',
        min: 0,
        max: 1.5,
        step: 0.1,
        default: 1,
        help: 'Keep at 100% for the original colors.',
    },
    renderScale: {
        label: 'Render resolution',
        values: [0.85, 1, 1.15, 1.25, 1.5],
        labels: ['85%', 'Recommended', '115%', '125%', '150%'],
        default: 1,
        help: 'Next VR entry; the browser may cap resolution. Higher settings can reduce smoothness.',
    },
    foveation: {
        label: 'Peripheral detail',
        values: [-1, 0, 0.5, 1],
        labels: ['Runtime default', 'Full detail', 'Balanced', 'Save power'],
        default: -1,
        help: 'Changes peripheral detail only when the runtime supports it.',
    },
    refresh: {
        label: 'Refresh rate',
        values: ['runtime', 'match'],
        labels: ['Runtime default', 'Match video'],
        default: 'runtime',
        help: 'Match uses only supported rates with an even video cadence.',
    },
    swapEyes: {
        label: 'Swap eyes',
        values: [false, true],
        labels: ['Normal', 'Swapped'],
        default: false,
        stereo: true,
        help: 'Use only when a 3D video has the eyes reversed.',
    },
    horizontal: {
        label: 'Stereo depth',
        min: -2,
        max: 2,
        step: 0.1,
        default: 0,
        stereo: true,
        unit: '°',
        help: 'Small horizontal alignment correction. This does not change headset IPD.',
    },
    vertical: {
        label: 'Vertical alignment',
        min: -1,
        max: 1,
        step: 0.05,
        default: 0,
        stereo: true,
        unit: '°',
        help: 'Aligns mismatched 3D camera images. Neutral is usually best.',
    },
    fov: {
        label: 'VR180 field of view',
        values: [160, 170, 180, 190, 200],
        default: 180,
        unit: '°',
        help: 'VR180 lens calibration. Use 180° unless the video needs correction.',
    },
    reclined: {
        label: 'Recenter direction',
        values: [false, true],
        labels: ['Keep horizon level', 'Follow my gaze'],
        default: false,
        help: 'Follow my gaze supports reclined viewing. Press Recenter to apply.',
    },
};

export const DEFAULT_SETTINGS = Object.fromEntries(Object.entries(SETTINGS).map(([key, spec]) => [key, spec.default]));

export function normalizeSettings(input) {
    return Object.fromEntries(
        Object.entries(SETTINGS).map(([key, spec]) => {
            const value = input && Object.hasOwn(input, key) ? input[key] : spec.default;
            if (spec.values) return [key, spec.values.includes(value) ? value : spec.default];
            return [
                key,
                typeof value === 'number' && Number.isFinite(value)
                    ? Math.min(spec.max, Math.max(spec.min, value))
                    : spec.default,
            ];
        }),
    );
}

export function settingText(key, value) {
    const spec = SETTINGS[key];
    if (spec.labels) return spec.labels[spec.values.indexOf(value)] ?? 'Default';
    if (spec.unit) return `${Number(value.toFixed(2))}${spec.unit}`;
    return `${Math.round(value * 100)}%`;
}

export function stepSetting(key, value, direction) {
    const spec = SETTINGS[key];
    if (spec.values)
        return spec.values[Math.min(spec.values.length - 1, Math.max(0, spec.values.indexOf(value) + direction))];
    return Math.min(spec.max, Math.max(spec.min, Number((value + spec.step * direction).toFixed(4))));
}

// Strip signed URLs, fragments and unrelated query parameters from saved identities.
export function videoSettingsKey(href) {
    const url = new URL(href);
    const id = /(^|\.)youtube\.com$/.test(url.hostname) ? url.searchParams.get('v') : null;
    return `video2webxr:${url.origin}${url.pathname}${id ? `?v=${encodeURIComponent(id)}` : ''}`;
}

export function cadenceRate(fps, supported, current) {
    if (!Number.isFinite(fps) || fps < 10 || fps > 144) return null;
    const candidates = [...supported].filter(
        (rate) =>
            Number.isFinite(rate) &&
            rate >= 60 &&
            rate <= 144 &&
            rate >= fps &&
            Math.abs(rate / fps - Math.round(rate / fps)) < 0.02,
    );
    if (candidates.includes(current)) return current;
    return candidates.sort((a, b) => a - b)[0] ?? null;
}
