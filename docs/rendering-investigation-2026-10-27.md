# Frame investigation results — 2026-10-27

These experiments extend the [rendering roadmap](rendering-roadmap.md). They
changed no installed extension code or production browser flags. Temporary
SteamVR overrides were removed afterward. MatineeVR was installed from the
user's existing download.

## Environment and method

- SteamOS Stable 0.4.5, SteamVR 2.18.2, native ARM64 Chrome 157.
- Separate temporary Chrome profile, loopback debugging and synthetic-media
  fixture. The normal Chrome XR profile remained open and was not edited.
- The actual SteamVR app key was
  `system.generated.openxr.google chrome 157.chrome`, rather than the Steam
  shortcut's app ID. OpenVR settings were read and set through the public
  `IVRSettings_003` API. Both tested keys were initially unset.
- Synthetic `testsrc2` H.264 clips at 3840×1920 and 7680×3840, 30 fps.
  Initial two-second looping tests exposed loop-related waits. The final tests
  used 12-second containers and eight-second observations. The high-detail
  sources were approximately 49 and 203 Mbit/s, respectively; they are stress
  samples, not typical movie footage.
- The final 90/120-rate tests fetched the complete file into a Blob URL before
  playback, removing transfer speed from the playback measurement. These large
  synthetic files are ignored by Git.
- Most XR timing observations had visibility `visible-blurred`. Callback rate
  measures application rendering opportunities, not physical panel refresh or
  successful presentation of every frame. Head motion, subjective sharpness,
  stereo comfort, sound, long thermal runs and normal website playback were not
  physically validated.

## Resolution and refresh controls work, with limits

The per-app keys are `resolutionOverride` (integer) and `preferredRefreshRate`
(float). Setting the former to 2160 enlarged the XR framebuffer from 3456×1728
to 4096×2160. Actual eye viewports were 2048×2160 each. A 4320-wide target was
not granted. The WebGL context reported 16384 for both maximum texture and
renderbuffer size, so the observed 4096-wide XR limit is not its general texture
limit; the exact cause remains unconfirmed.

Representative continuous H.264 observations:

- **Default settings, 4K:** 71.5 render callbacks/s, 240 video frames and zero
  reported video drops or waits during eight seconds.
- **2160 request / 90-rate request, fully fetched 4K:** 86.1 render callbacks/s,
  239 video frames, zero drops and zero waits.
- **2160 request / 120-rate request, fully fetched 4K:** 72.0 render callbacks/s,
  240 video frames, zero drops and zero waits. Earlier short runs were variable;
  this does not establish delivery of 120 Hz.
- **2160 request / 90-rate request, fully fetched 8K:** 43.5 render callbacks/s,
  173 video frames, 13 reported video drops and nine waits. The complete
  12-second source was buffered. This particular 8K source exceeded the browser
  path's comfortable throughput.

Do not turn these into universal presets. The higher resolution is a practical
quality candidate; 90 is worth a focused viewing comparison, while 120 has not
earned a default. No frame-rate API appeared in WebXR during these tests.
The original global refresh preference was not modified, and the two temporary
per-app keys were removed afterward.

## Browser decoding is a more immediate 8K boundary than foveation

CDP Media reported `FFmpegVideoDecoder` and `kIsPlatformVideoDecoder=false` for
both H.264 resolutions. `SystemInfo.getInfo` advertised an empty hardware video
decoding list. This identifies the path actually used, rather than inferring
hardware acceleration from successful playback. It does not prove every future
browser or codec must behave the same way.

The full-Blob 8K test still stalled, so network transfer did not explain that
result. More GPU foveation cannot remove software decoding work. Prioritize a
supported browser hardware-decoder path, or native playback for suitable media,
before spending effort on custom foveation. This investigation did not compile
a browser or try undocumented acceleration switches.

## Image smoothing is feasible, but costs GPU time

Frame's WebGL context supports four-sample render targets and
`EXT_disjoint_timer_query_webgl2`, despite the direct XR layer reporting AA off.
The fixture compared a paused decoded 4K frame using the existing scene,
offscreen rendering, MSAA 4× and the SMAA implementation already shipped with
Three.js. No dependency was added. It verified a detailed non-empty output,
pixel changes, successful shader execution, and no reported GL error.

After freezing the source and waiting for timer results, all six cases returned
20 available, non-disjoint GPU timer samples. Median GPU times for one square
eye-sized target were:

- **1728×1728:** original 0.213 ms; MSAA 4× 1.176 ms; SMAA 0.822 ms.
- **2160×2160:** original 0.417 ms; MSAA 4× 1.966 ms; SMAA 1.429 ms.

P95 values reached approximately 3–5 ms in this small run. Synchronized CPU
wall-clock timings were often below useful timer precision; the GPU queries
are the useful cost observation. These timings exclude live decoding, the XR
compositor, stereo integration and thermal steady state. Do not simply double
them and promise a headset frame budget.

MSAA changed almost no source-image pixels (maximum channel change one in the
stable run). SMAA changed edge pixels measurably (maximum channel change 40–59).
This supports the distinction between smoothing geometry and filtering video
edges; it does not establish that the filtered picture looks better. A focused
comparison with animation, text and fine detail remains necessary. Filtering
within each packed stereo eye/face must remain isolated during any integration.

Decision: retain neutral installed defaults. An optional spatial edge filter is
feasible; offscreen MSAA alone is a poor answer to jagged character outlines.
The tested filter is not yet integrated into the installed XR renderer. Custom
minification filtering remains a later image-quality experiment, not a remedy
for the observed decoder bottleneck.

## MatineeVR installation and native comparison

Python 3.12.3 was already present at `/usr/bin/python3`. The user's download at
`~/apps/matineevr` is version 0.1.0. Its installer was run successfully, creating
**Steam → Library → Non-Steam → Devkit Game: MatineeVR**, with verified artwork.

One compatibility fix was needed in `artwork.py`: normalize the VDF root key's
case instead of requiring `Shortcuts`. Steam's actual key was `shortcuts`.
Assertions passed for three capitalizations, and truncated input was rejected.
The original file is retained as `artwork.py.pre-fleet-20261027`. No pip package,
system Python replacement, OS update or Steam restart was required.

The source included with 0.1.0 explicitly accepts existing local files and
directories and rejects ordinary HTTP/page URLs. This MatineeVR build is useful
for file playback and as a native comparison; it is not a drop-in browser-video
integration. Other native players may offer network sources, but website login,
manifest extraction and DRM are separate concerns.

Its built-in decode probes on the two-second synthetic files reported:

- H.264 3840×1920: 60 frames in 0.150 s, using `h264_v4l2m2m`.
- H.264 7680×3840: 60 frames in 0.589 s, using `h264_v4l2m2m`.
- HEVC 7680×3840: 60 frames in 0.653 s, using `hevc_v4l2m2m`.

All selected `/dev/video-dec0`, `iris_driver` / `iris_decoder`, with hardware
required. The 8K H.264 offscreen rendering probe also passed: 60 frames in
0.583 s using bundled Turnip Vulkan on Adreno 750. Its offscreen target is only
1024×1024; these numbers are decode/render throughput, not actual headset fps.
The normal Vulkan injection layer worked in this probe; no disabling workaround
was applied. Full in-headset UI and playback still need a viewing check.

## Follow-up: VR settings panel freeze

Opening the larger settings panel reproduced `GL_INVALID_VALUE` (1281): the
canvas grew from 336 to 720 pixels high after its GPU texture had been allocated.
The original interaction checks did not render this transition. The fix
recreates the texture when dimensions change and retains it for same-sized tab
changes. Core fix: `b7b0204`.

The regression now renders the visible panel through three complete
playback/settings/tab/close cycles, checks for GPU errors/context loss, and
requires rendering to advance. It passed both on desktop and in Frame's native
XR session, including 15 transition actions with no GL error. The installed
build is labelled `2.2.0 + Frame quality and comfort (panel fix)`; all 13 managed
files matched the production build's hashes. The enabled local extension was
reloaded and its build label verified, then Chrome XR was restarted without
debugging flags. The preceding build is retained in
`~/.local/share/video2webxr-frame-before-panel-fix-20261027`. Subjective viewing
and controller pointing remain physical checks.

## Reproduction and cleanup

The loopback test server now serves only the specifically named synthetic clips
under ignored `test/media/`. Generate `testsrc2` at the dimensions/rate above
with `libx264 -preset ultrafast -crf 22 -threads 4 -pix_fmt yuv420p`; the HEVC
comparison used `libx265 -preset ultrafast -crf 28` with four threads. Extend
two seconds to 12 using stream-copy repetition. Keep these stress assets out of
commits and use only synthetic or appropriately licensed media.

`fixture.loadVideo('synthetic-4k-h264.mp4')` fully fetches a source;
`fixture.measurePlayback(8)` observes it. `fixture.compareSmoothing()` pauses
the source and stops the animation loop for offscreen experiments; reload the
fixture before further XR tests. Its pixel and GL checks fail explicitly.

Temporary permission overrides were reset and the diagnostic browser service
was stopped. The loopback fixture server and SSH forwarding were stopped too.
The normal browser profile, installed extension and default
headset settings remain the working baseline. Diagnostic helpers and the small
native sample clips are retained under `~/.local/state/fleet/diagnostics/` on
Frame. No native player's subjective quality or future browser feature is
claimed verified by these tests.
