# video2webxr

A Chromium extension that plays web videos in your PC VR headset through WebXR, using https://threejs.org/

- **YouTube:** 360°, VR180, 3D and normal videos, via a cardboard icon in the player; the projection is detected automatically
- **Other sites:** any non-DRM video, via the extension's toolbar button
- **In VR:** a controls panel styled after the Steam Frame, and a flat screen you can move and resize with your controllers

![A 3D 360° YouTube video in the headset, with the browser floating in SteamVR](docs/screenshots/headset-eac-3d.jpg)

### Install

**From a store**
- Chrome, Brave and other Chromium browsers: [Chrome Web Store](https://chromewebstore.google.com/detail/video2webxr/bacbclkmpiflnfeggheehlhhdmjjcfni)
- Microsoft Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/video2webxr/pegmdbgaelolcgnfadanmahjnlallpon)

**Manually**
1. Download `video2webxr-<version>.zip` from the [latest release](https://github.com/phit/video2webxr/releases/latest) and unzip it to a folder
2. Open the extensions page in the browser and enable developer mode
3. Click "Load Unpacked" and choose the folder

**On the Steam Frame:** works in Chrome Canary running on the Frame itself; see [phit/chromium-webxr-steam-frame (google branch)](https://github.com/phit/chromium-webxr-steam-frame/tree/google) for how to set it up

### Usage
1. Turn VR on first (e.g. start SteamVR)
2. Start a new browser so that it detects the hardware

On the Steam Frame itself, skip these two steps: just open Chrome Canary.

**On YouTube**
1. Open a video: 360° or VR180 (e.g. from https://www.youtube.com/vr/), or a normal one for the flat screen
2. Click on the white cardboard icon in the bottom right hand corner of the video
3. The dropdown next to the "Enter VR" button shows the detected projection. 3D is recognised from the picture itself, so it switches to the 3D option once the video shows something other than a dark frame. Change it if it looks wrong
4. Click on the "Enter VR" button below the video

   ![YouTube with the Enter VR button and the projection dropdown set to 360° EAC 3D](docs/screenshots/youtube-eac-3d.jpg)

**On other sites**
1. Start playing the video
2. Click the video2webxr button in the browser toolbar (pin it from the extensions menu)
3. Pick the projection in the popup (defaults to Flat screen; your choice is remembered) and click "Enter VR"
4. Click the video in the page to enter VR. Browsers only start VR from a click in the page itself, so this step can't be skipped
5. Use the controls in VR, or open the popup again to change the projection or click "Stop"

   ![The video2webxr popup open from the toolbar on a Wikimedia Commons 360° video](docs/screenshots/other-sites-popup.jpg)

The page itself gets no extra controls, so video lightboxes and overlays keep working.

**In VR**

A controls panel floats below the video: play/pause, the seek bar, skip 10 seconds back or forward, mute and volume, the projection (‹ › to switch), passthrough, Recenter and Exit VR.

![The controls panel below a flat screen video in the headset, with passthrough showing the room around it](docs/screenshots/headset-controls-passthrough.jpg)

| To | Do this |
|---|---|
| Use a control | Point the controller's laser at it and pull the trigger; hold the trigger to drag the seek or volume slider |
| Hide or show the panel | Press A/X or B/Y. Pulling the trigger away from the screen also shows it, and it comes back in front of you if it was out of view |
| Move the panel or the flat screen | Drag the bar below it with the trigger, or hold the grip anywhere on it. It stays upright and turns to face you |
| Move it closer or further away | While holding it, push the thumbstick forward or back |
| Resize the flat screen | Drag its bottom right corner, or push the thumbstick left or right while holding it |
| Play or pause | Click the flat screen |
| Skip 10 seconds back or forward | Double click the left or right third of the flat screen, like on YouTube's mobile app; each further click skips another 10 seconds |
| See the room around the screen | Press the passthrough button (the headset icon). It works where the browser supports AR with passthrough, e.g. Chrome Canary on the Steam Frame ([install guide](https://github.com/phit/chromium-webxr-steam-frame/tree/google#install-on-the-frame)), and only shows there |
| Put everything back in front of you | Recenter on the panel. On 360° and 180° videos it also turns the front of the video to where you look |

### Videos to try

| Video | Where | Projection |
|---|---|---|
| [Caminandes VR demo](https://www.youtube.com/watch?v=uvy--ElpfF8) | YouTube | 360° EAC 3D |
| [Tomorrowland 360°](https://www.youtube.com/watch?v=y0k8Akk1yN0) | YouTube | 360° EAC |
| [Elton John VR180](https://www.youtube.com/watch?v=9r6NI9m_IxM) | YouTube | 180° |
| [Bled Lake 360° timelapse](https://commons.wikimedia.org/wiki/File:Video_360%C2%B0._Timelapse._Bled_Lake_in_Slovenia..webm) | Wikimedia Commons, via the toolbar button | 360° equirectangular |

### Projections

| Projection | Use it for |
|---|---|
| 360° EAC | 360° videos on YouTube - this is how YouTube serves them on desktop |
| 360° EAC 3D | 3D 360° videos served as stereo EAC |
| 360° cubemap | videos in a plain 3x2 cubemap layout |
| 360° equirectangular | 360° videos served as a single equirectangular image (2:1) |
| 360° 3D top/bottom, side by side | 3D equirectangular 360° videos |
| 180° | VR180 videos on YouTube, and other mono 180° videos |
| 180° 3D side by side | 3D 180° videos with both eyes side by side, the most common VR video format |
| Flat screen (other sites' default) | normal videos, shown on a virtual screen in front of you |

You can switch the projection while in VR, from the panel. If the image looks jumbled into squares, try a 360° EAC option; if it looks stretched or doubled, try the others.

### Limitations
- DRM-protected videos (Netflix, Prime Video, Disney+ etc.) can't be shown: the browser won't hand protected frames to WebGL
- Videos served from another domain without CORS headers can't be read by WebGL either; the extension retries with CORS turned on and tells you if that doesn't work
- On other sites the toolbar button can only reach videos in the page itself and in same-site frames

### Troubleshooting
If "Enter VR" says "VR NOT SUPPORTED", the browser hasn't found your headset: make sure SteamVR is running and the headset is connected, then restart the browser.

If clicking the video doesn't enter VR, close other browser windows that use the headset; only one browser can be in VR at a time. The popup shows why the last attempt failed.

If you don't see the white cardboard icon in the bottom right hand corner of a YouTube video then the extension is not installed or disabled

### Development
#### Frame quality and comfort branch

This local branch keeps the XR-only GPU flush and adds **Quality & comfort** to
the page controls and the controller-operated VR panel. The upstream flush PR
remains separate. No new runtime dependency is needed.

- Picture: bounded five-tap sharpening, brightness, contrast and saturation.
  **Original picture** compares against neutral processing without changing stereo
  alignment. Sharpening stays off by default; neutral color values preserve the
  source. Sampling is clamped to each eye/cubemap face to avoid neighboring-image
  bleed. EAC now uses the same sRGB decode/output conversion as the other modes.
- Rendering: recommended resolution by default, optional requested render scale,
  peripheral detail and cadence matching where the runtime exposes them. Resolution
  applies on the next VR entry and the browser can cap it. Diagnostics show actual
  dimensions, antialiasing, approximate presented video fps, dropped video frames,
  XR callbacks and CPU render time. CPU timing is not a GPU or display measurement.
- Comfort: neutral eye alignment, eye swap for reversed footage, small stereo
  depth/vertical corrections and VR180 FOV calibration. **Follow my gaze** plus
  **Recenter** supports reclined viewing; level recentering remains the default.
  These controls do not change headset optics, physical IPD or binocular overlap.
- **Save for this video** stores settings and the projection locally in extension
  storage; **Reset** removes that profile and restores neutral values. Nothing is
  synchronized or sent to a server. The `storage` permission is used for these
  explicit saves. Generic sites are identified by origin/path; YouTube also keeps
  only its video ID. Signed URL parameters and fragments are excluded. Generic
  sites that select multiple videos on one URL share that page's profile.
- Unsupported controls are disabled after a session checks the runtime. The page
  dialog has native labels, keyboard controls, a focus indicator and Escape/Done;
  the VR panel has separate Picture, Rendering and Comfort tabs with large hit
  targets. Effects and alignment are bounded and saved input is validated.

Research and decisions:

- [Rendering research and roadmap](docs/rendering-roadmap.md) distinguishes video
  edge smoothing from MSAA, records native Frame capability checks, and separates
  current experiments from browser and runtime dependencies.
- [Follow-up Frame measurements](docs/rendering-investigation-2026-10-27.md)
  cover per-app resolution/refresh overrides, browser/native decoding, and
  offscreen antialiasing costs. These experiments do not change installed defaults.
- Source quality remains the website's choice; diagnostics show the actual decoded
  resolution and dropped-frame counter. YouTube's [public player API](https://developers.google.com/youtube/iframe_api_reference)
  no longer supports playback-quality setters. This branch does not rely on an
  undocumented source-selector API or claim to enable hardware decoding.
- [Three.js XR controls](https://threejs.org/docs/pages/WebXRManager) require render
  scale to be set before entry and describe optional foveation. We request AA,
  report what is granted, and preserve runtime defaults instead of forcing cost.
- [Video-frame callbacks](https://developer.chrome.com/blog/requestvideoframecallback-rvfc)
  and playback-quality counters provide timing/drop observations. They do not
  establish hardware decoding or a headset's physical refresh rate. Cadence
  selection only requests advertised rates with an approximately integral ratio
  to a stable video estimate; it never invents motion-interpolated video frames.
- [WebXR frame-rate control](https://immersive-web.github.io/webxr/) is optional.
  Reprojection belongs to the compositor; this extension does not override it.
- [Composition layers](https://immersive-web.github.io/layers/) can avoid an extra
  sampling pass. On this Frame/Chrome combination, `layers` was not granted and
  `XRMediaBinding` was absent. Keep the working legacy layer path rather than
  exposing an experimental switch that cannot work on this runtime.
- [HereSphere's calibration features](https://store.steampowered.com/app/1234730/HereSphere/)
  informed alignment and FOV controls. Its depth-estimation/autofocus and synthetic
  6DoF reconstruction need a separate algorithm; this implementation does not
  claim to recover missing viewpoints or change optical focus.
- [Adaptive sharpening research](https://gpuopen.com/fidelityfx-cas/) supports a
  restrained, bounded approach. Our small five-tap filter is not AMD CAS or AI
  upscaling and makes no claim to reconstruct lost source detail.

Automated verification:

```
npm test
npm run check
npm run build
node scripts/test-server.mjs  # loopback-only http://127.0.0.1:8818
```

The synthetic browser fixture checks real video textures and pixels for all nine
projections, color preservation, effects, stereo eye isolation/swap, FOV, VR panel
navigation/disabled controls, original comparison and storage round trips/errors.
It uses local generated media, not personal content. It also exposes a synchronized
wall-time benchmark; its tiny source and timer precision do not establish smooth
playback for high-resolution compressed video.

On Frame's Chrome 157 / SteamOS 0.4.5, native GPU pixel checks passed. Short native
VR/AR entry/exit tests found a 3456×1728 recommended buffer, AA off, no advertised
refresh rates and no fixed-foveation control. A request of 85% gave 2937×1468;
115% remained capped at 3456×1728. The headset session was hidden/unworn, so these
tests do not validate visible motion smoothness or subjective stereo comfort.

Sources are in `src/`:
- `youtube.js`: YouTube integration (the cardboard icon, projection detection)
- `youtube-page.js`: runs in YouTube's own page context to read the player's data
- `stereo.js`: tells 3D frames from mono ones
- `generic.js`, `popup.*`: the toolbar button and its popup for other sites
- `vr-player.js`: the shared WebXR player and projections
- `vr-controls.js`: the in-VR panel, lasers, moving and resizing
- `projections.js`: the projection names, shared by the player and the popup

```
npm install
npm run build   # builds the extension into dist/
npm run watch   # unminified with source maps, rebuilt on change
```
Load `dist/` unpacked in the browser. `npm run check` lints and checks formatting with [Biome](https://biomejs.dev/), and `npm run fix` applies fixes; CI fails on either.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `build:`, `ci:`, `style:`, `chore:`, `test:`, optionally with a scope (`feat(youtube): ...`). Release notes are generated from them with [git-cliff](https://git-cliff.org); `npm run changelog` previews the notes for unreleased commits.

### Releasing
Bump `version` in `manifest.json` and `package.json`, commit (`chore: release 2.1.0`), then push a matching tag: `git tag v2.1.0 && git push origin v2.1.0`. GitHub Actions builds the zip and publishes the release with the generated notes.

### Credits
- Based on [EnableYoutubePCVR](https://github.com/feedthedogs/EnableYoutubePCVR) by feedthedogs (ISC)
- Cardboard icon from [Tabler Icons](https://tabler.io/icons) (MIT)
- Rendering by [three.js](https://threejs.org/) (MIT)
