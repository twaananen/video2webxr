# Frame rendering research and roadmap

Researched 2026-10-26 for the local `frame-player-quality` build. This is a
research plan, not a list of implemented features or promised upstream releases.
The installed extension, browser flags and headset settings were not changed
during this investigation.

## What is actually limited

The path is website video → browser decoder → video texture → our WebGL scene
→ Chrome's OpenXR output → SteamVR compositor → headset. Each stage has its own
cost and capabilities. Changing Three.js to another web framework cannot expose
an API missing from Chrome or SteamVR.

Previously measured on Chrome 157.0.8103.15 / SteamOS Stable 0.4.5:

- Legacy XR framebuffer: 3456×1728 total, or 1728×1728 per eye, with AA off.
- Requesting 115% render scale did not enlarge that buffer; 85% did reduce it.
- No usable WebXR fixed-foveation or refresh-rate controls were exposed.
- A separate capability probe requesting layers was not granted that feature;
  `XRMediaBinding` was absent. A method existing on `XRWebGLBinding` did not prove
  that the session could use it.
- Sessions were hidden/unworn. These observations do not measure physical
  refresh, visible smoothness, comfort, or every headset rendering mode.

This investigation additionally queried the installed SteamVR runtime directly
through its OpenXR negotiation interface and enumerated its extension names.
All calls succeeded, reporting 48 extensions. No XR instance or session was
created. The relevant advertised extensions were:

```text
XR_EXT_eye_gaze_interaction
XR_FB_display_refresh_rate
XR_FB_foveation
XR_FB_foveation_configuration
XR_FB_foveation_vulkan
XR_META_foveation_eye_tracked
```

The runtime advertised none of Chrome's three required layer extensions:

```text
XR_KHR_composition_layer_cylinder
XR_KHR_composition_layer_equirect2
XR_KHR_composition_layer_cube
```

Advertising an extension establishes an API entry point, not that every mode or
request will work. In particular, native refresh requests have reported runtime
restrictions; do not turn this list into a claim that an app can select any rate.

## 1. Smoothing outlines inside the video

Yes, we can soften jagged character outlines. Ordinary MSAA targets polygon
coverage: it improves the edge of a screen, panel or pointer, but does not
reconstruct the character already encoded into the video texture.

Image-space edge filters such as [SMAA](https://github.com/iryoku/smaa) can instead
identify contrast edges in the rendered image. They can reduce visible steps,
including steps in video content, at the cost of possible detail loss or false
edge detection. They cannot recover the original missing samples. Temporal
approaches need extra care around moving video, where ghosting is undesirable.

Separate two experiments:

1. **Video sampling:** compare the existing bilinear sampling with a bounded
   minification filter on detailed, moving clips. Three.js video textures use
   linear filtering and disable mipmap generation by default; this is not proof
   those defaults are wrong, but it identifies a concrete sampling baseline.
   [VideoTexture documentation](https://threejs.org/docs/pages/VideoTexture.html)
2. **Edge smoothing:** compare a lightweight spatial AA filter with an unchanged
   image. Also test an offscreen MSAA target for geometric UI/screen edges if
   Frame's WebGL context supports the required sample count and XR copy path.
   [Three.js render targets](https://threejs.org/docs/pages/RenderTarget.html)

Do not simply enable video mipmaps: updating them has a cost, and packed stereo
eyes and cubemap faces need isolated filtering to prevent color/eye leakage.
Extra source resolution helps when projection/downsampling causes aliasing;
aliasing already baked into the recording cannot be fully repaired by rendering
the same image at higher resolution. Sharpening can make existing aliasing worse.

Default remains the neutral image until a measured improvement wins. Keep an
Original comparison and test text, fine hair, animation outlines, eye separation,
EAC face seams and moving patterns. Measure the complete render cost, not only
shader compilation or a tiny static texture.

## 2. Composition and media layers

Browser support already exists. Chromium enabled WebXR layers by default subject
to runtime capabilities; its OpenXR backend requires all three extensions listed
above. This installed Frame runtime fails that gate. This is a concrete runtime
dependency, not just a future Chrome-version requirement.
[Chromium enablement](https://chromium.googlesource.com/chromium/src/+/d4b9320e6784808e09851e02e7a68f0161e46132),
[matching Chrome 157 gate](https://chromium.googlesource.com/chromium/src/+/refs/tags/157.0.8103.15/device/vr/openxr/openxr_extension_helper.cc)

Other implementations demonstrate the feature: Meta Browser documents video
media layers, while WPE WebKit 2.54 added further layer shapes behind build-time
options. Neither establishes a ready-to-use replacement browser for this Frame,
nor compatibility with a Chromium extension.
[Meta documentation](https://developers.meta.com/vr/documentation/web/webxr-layers/),
[WPE release notes](https://wpewebkit.org/blog/2026-09-16-wpewebkit-2.54.html)

The potential gain is a video surface sampled directly by the compositor,
independent resolution for controls, and fewer redundant renders. The existing
projection path already receives compositor head-motion reprojection. A layers
polyfill which draws into that same path cannot obtain native-layer benefits.
[WebXR Layers specification](https://immersive-web.github.io/layers/)

Future integration requires a granted session feature and a successful real
layer submission. Replace the current forced-legacy workaround only then.
Keep the legacy backend as fallback. EAC needs special treatment because its
packed, angularly remapped faces are not a direct equirectangular media source;
picture adjustments may also require a GPU-texture layer instead of a direct
media layer. These paths need separate capability and quality tests.

## 3. Foveation and 4K/8K playback

Foveation reduces rendering work in parts of the output eye image. It does not
reduce the work needed to decode the complete compressed source video, and is
not limited to high-resolution sources. It helps most when rendering is the
bottleneck. Moving from 4K to 8K at the same aspect ratio quadruples source
pixels; it does not automatically quadruple the output eye-buffer size.
[WebXR foveation semantics](https://immersive-web.github.io/webxr/)

Keep three problems separate: compressed-video decoding, frame transfer/texture
sampling, and rendering the projected scene. Our earlier Pearl check identified
software VP9 decoding for that stream; that does not establish the decoder used
by every codec, site or native app.

Frame advertises native foveation and eye-gaze interfaces, while this WebXR path
exposes no usable control. Browser/backend integration would let us retain the
current renderer. Eye-tracked rendering additionally needs a usable gaze or
runtime-controlled foveation path; tracking permission and safe fallback matter.
An advertised native extension alone is insufficient to promise this works.
[OpenXR extension specifications](https://registry.khronos.org/OpenXR/specs/1.1/html/xrspec.html#XR_FB_foveation)

A native OpenXR/Vulkan player can work below the browser boundary now. For a
comparison, [FramePlayerX](https://github.com/remotesojourner/frameplayerx) is an
open-source ARM64 player whose authors document hardware decoding, including 8K
H.264/HEVC. [MatineeVR](https://embedding-shapes.itch.io/matineevr/devlog/1681701/0010-vulkan-fisheye-flat-3d-movies-8k-hevc-and-faster-seeking)
also documents a Vulkan path and 8K HEVC playback. These are candidates, not
locally tested endorsements or proof that their foveation paths match our needs.
Compare the same legal local/network clip before expanding scope. A native
player is not automatically a replacement for signed-in YouTube/site playback.

Custom fixed foveation inside our WebGL renderer is technically possible but
adds passes, blending and stereo-edge cases. It is lower priority than proving
a GPU rendering bottleneck. Switching to Babylon.js or WebGPU alone would not
remove runtime/API restrictions or guarantee hardware decoding.

## 4. Refresh and render resolution outside the webpage

Valve documents **VR Settings → Video → Per-Application Video Settings**, which
includes render resolution and refresh overrides. Its documented defaults are
1728×1728 per eye and 72 Hz, not evidence of those being hardware maxima.
The resolution matches our measured buffer exactly. Hypothesis: increasing
Chrome XR's actual per-app resolution could raise its recommended buffer and
avoid the ceiling seen with the extension's scale request. This has not been
tested; the effective SteamVR app identity must first be established.
[Valve per-app settings](https://partner.steamgames.com/doc/steamhardware/steamframe/vrpreferences)

Use the runtime settings route before assuming a new browser is required.
Confirm applied values rather than copying an unverified `vrpreferences.json`
beside a non-Steam launcher. Independent reports describe restrictions and
overrides even when `XR_FB_display_refresh_rate` is advertised; those are reports,
not results measured here.
[Refresh request report](https://github.com/ValveSoftware/openvr/issues/1927),
[success-then-override report](https://github.com/ValveSoftware/SteamVR-for-Linux/issues/1020)

For cadence, 24 fps divides evenly into 72/120 Hz; 30 fps into 90/120 Hz; 60 fps
into 120 Hz. Fractional frame rates need corresponding tolerance. Even cadence
reduces presentation judder; it does not create new video motion frames. Higher
refresh and resolution cost GPU time and battery. Measure delivered timing,
dropped video frames and thermal stability, not only a requested setting.

## Prioritized experiments and release gates

1. **Establish a representative baseline.** Record codec, actual decoder,
   dimensions, source fps, dropped frames, render size and visible-session
   timings for the same 4K and 8K clips. Separate decode stalls from GPU cost.
2. **Test existing SteamVR controls.** Establish Chrome XR's app identity, then
   compare one resolution or refresh change at a time. Confirm the actual XR
   buffer and applied rate. Preserve the prior values for rollback.
3. **Test video sampling and spatial edge smoothing.** Use real video plus
   synthetic edge/seam patterns. Ship only if visual detail and measured frame
   deadlines improve or a clearly labelled optional tradeoff is worthwhile.
4. **Compare a native player.** Start with an existing ARM64 release and the
   same clip; inspect hardware decoding and timing before considering a new
   native project. Do not rebuild a browser for this investigation.
5. **Recheck upstream capabilities after relevant stable updates.** Layers need
   runtime support or a changed Chromium gate; WebXR foveation and automatic
   refresh need usable browser integration and runtime behavior. Re-run actual
   session probes before enabling controls. No scheduled monitoring was created.

Keep the working XR-only GPU flush, neutral defaults, stereo/face isolation and
rollback. Hide complexity behind clear quality choices; explain unavailable
settings and any re-entry requirement. Automated pixel/decoder/timing checks can
screen experiments, but final visible flicker, eye strain and motion comfort
still need a short in-headset check before declaring improved defaults.
