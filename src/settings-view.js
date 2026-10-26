import { SETTINGS, SETTINGS_PAGES, settingText } from './player-settings.js';

export function settingsButton(player) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Quality & comfort';
    button.onclick = () => {
        if (player.settingsDialog) {
            player.settingsDialog.showModal();
            return;
        }
        const dialog = document.createElement('dialog');
        player.settingsDialog = dialog;
        dialog.setAttribute('aria-label', 'Video quality and comfort');
        const host = document.createElement('div');
        dialog.append(host);
        const root = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
            :host { color-scheme: dark; } * { box-sizing: border-box; }
            main { width:min(580px,80vw); color:#edf3fa; font:16px/1.5 system-ui; }
            h2 { margin:0 0 4px; font-size:23px; } p { color:#b8c6d6; margin:8px 0 20px; }
            fieldset { border:1px solid #4b5c70; border-radius:10px; margin:16px 0; padding:16px; }
            legend { font-weight:650; padding:0 8px; } label { display:block; font-weight:600; }
            small { display:block; color:#bdc9d7; margin:2px 0 10px; }
            input,select { width:100%; min-height:36px; accent-color:#55b7ff; }
            output { float:right; font-variant-numeric:tabular-nums; }
            button { color:#edf3fa; background:#30445a; border:1px solid #7594b5; border-radius:7px; padding:10px 14px; min-height:44px; font:inherit; cursor:pointer; }
            button:hover { background:#3b5876; } :focus-visible { outline:3px solid #67c1ff; outline-offset:3px; }
            :disabled { opacity:.5; cursor:default; } .actions { display:flex; gap:8px; flex-wrap:wrap; }
            #stats { white-space:pre-line; font-size:14px; } #message { min-height:24px; }
        `;
        Object.assign(dialog.style, {
            background: '#182432',
            color: '#edf3fa',
            border: '1px solid #7594b5',
            borderRadius: '16px',
            padding: '24px',
            maxHeight: '85vh',
        });
        const main = document.createElement('main');
        const title = document.createElement('h2');
        title.textContent = 'Quality & comfort';
        const intro = document.createElement('p');
        intro.textContent =
            'Set source quality on the website before entering VR. Neutral settings preserve the video; save only if this video needs its own settings.';
        main.append(title, intro);
        const controls = new Map();
        for (const page of SETTINGS_PAGES) {
            const group = document.createElement('fieldset');
            const legend = document.createElement('legend');
            legend.textContent = page.title;
            group.append(legend);
            for (const key of page.keys) {
                const spec = SETTINGS[key];
                const label = document.createElement('label');
                const input = document.createElement(spec.values ? 'select' : 'input');
                input.id = `video2webxr-${key}`;
                label.htmlFor = input.id;
                label.textContent = spec.label;
                const value = document.createElement('output');
                value.htmlFor = input.id;
                label.append(value);
                const help = document.createElement('small');
                help.id = `${input.id}-help`;
                input.setAttribute('aria-describedby', help.id);
                if (spec.values)
                    for (const item of spec.values) input.add(new Option(settingText(key, item), String(item)));
                else {
                    input.type = 'range';
                    input.min = spec.min;
                    input.max = spec.max;
                    input.step = spec.step;
                }
                input.oninput = () => {
                    const next = spec.values
                        ? spec.values.find((item) => String(item) === input.value)
                        : Number(input.value);
                    player.updateSetting(key, next);
                };
                controls.set(key, { input, value, help });
                group.append(label, help, input);
            }
            main.append(group);
        }
        const stats = document.createElement('p');
        stats.id = 'stats';
        const message = document.createElement('p');
        message.id = 'message';
        message.setAttribute('role', 'status');
        const actions = document.createElement('div');
        actions.className = 'actions';
        const action = (text, run) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = text;
            b.onclick = run;
            actions.append(b);
            return b;
        };
        action('Save for this video', () => player.saveSettings());
        action('Reset', () => player.resetSettings());
        const compare = action('Original picture', () => player.comparePicture());
        action('Recenter', () => player.vrControls.recenter());
        action('Done', () => dialog.close());
        main.append(stats, message, actions);
        root.append(style, main);
        document.body.append(dialog);
        const refresh = () => {
            for (const [key, { input, value, help }] of controls) {
                input.value = String(player.settings[key]);
                input.disabled = !player.settingAvailable(key);
                value.textContent = settingText(key, player.settings[key]);
                help.textContent = player.settingHelp(key);
            }
            stats.textContent = player.diagnostics().join('\n');
            message.textContent = player.settingsMessage || '';
            compare.setAttribute('aria-pressed', String(player.comparing));
            compare.textContent = player.comparing ? 'Original picture — return' : 'Original picture';
        };
        player.refreshSettingsView = refresh;
        refresh();
        player.settingsInterval = setInterval(() => {
            if (dialog.open) refresh();
        }, 1000);
        dialog.showModal();
    };
    return button;
}
