import * as THREE from 'three';

// Sample inside one eye/face only, so sharpening cannot leak neighboring stereo images.
export const PICTURE_SHADER = `
uniform vec2 videoSize;
uniform vec4 picture;
vec4 sampleVideo(sampler2D image, vec2 uv, vec2 low, vec2 high) {
    vec2 pixel = 1.0 / max(videoSize, vec2(1.0));
    low += pixel * 0.5;
    high -= pixel * 0.5;
    vec4 center = texture2D(image, clamp(uv, low, high));
    vec3 color = center.rgb;
    if (picture.x > 0.0) {
        vec3 a = texture2D(image, clamp(uv + vec2(pixel.x, 0.0), low, high)).rgb;
        vec3 b = texture2D(image, clamp(uv - vec2(pixel.x, 0.0), low, high)).rgb;
        vec3 c = texture2D(image, clamp(uv + vec2(0.0, pixel.y), low, high)).rgb;
        vec3 d = texture2D(image, clamp(uv - vec2(0.0, pixel.y), low, high)).rgb;
        vec3 lower = min(color, min(min(a, b), min(c, d)));
        vec3 upper = max(color, max(max(a, b), max(c, d)));
        color = clamp(color + picture.x * (color - (a + b + c + d) * 0.25), lower, upper);
    }
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, picture.w);
    color = (color - 0.5) * picture.z + 0.5 + picture.y;
    return vec4(clamp(color, 0.0, 1.0), center.a);
}`;

export function pictureUniforms(texture) {
    return {
        videoSize: { value: new THREE.Vector2(texture.image.videoWidth || 1, texture.image.videoHeight || 1) },
        picture: { value: new THREE.Vector4(0, 0, 1, 1) },
    };
}

export function pictureMaterial(texture, uniforms, region = [0, 0, 1, 1], side = THREE.FrontSide, cube = false) {
    const material = new THREE.MeshBasicMaterial({ map: texture, side });
    material.userData.pictureUniforms = uniforms;
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        const [u, v, w, h] = region;
        const low = cube ? 'floor(vMapUv * vec2(3.0, 2.0)) / vec2(3.0, 2.0)' : `vec2(${u.toFixed(8)}, ${v.toFixed(8)})`;
        const high = cube
            ? '(floor(vMapUv * vec2(3.0, 2.0)) + 1.0) / vec2(3.0, 2.0)'
            : `vec2(${(u + w).toFixed(8)}, ${(v + h).toFixed(8)})`;
        const sample = `sampleVideo(map, vMapUv, ${low}, ${high})`;
        shader.fragmentShader = `${PICTURE_SHADER}\n${shader.fragmentShader}`.replace(
            '#include <map_fragment>',
            THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', sample),
        );
    };
    material.customProgramCacheKey = () => `${region.join(',')}:${cube}`;
    return material;
}
