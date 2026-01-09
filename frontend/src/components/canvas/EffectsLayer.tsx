/**
 * EffectsLayer Component
 *
 * Post-processing effects for the cyberpunk aesthetic.
 * - Bloom: Creates neon glow effect on bright objects (luminance > 1.1)
 * - Vignette: Darkens edges for cinematic feel
 * - Noise: Adds subtle film grain texture
 *
 * IMPORTANT: This must be placed as the last child of Canvas
 * to apply effects to the entire scene.
 */

import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function EffectsLayer() {
  return (
    <EffectComposer>
      {/* Bloom - Creates the neon glow effect
          luminanceThreshold: 1.1 means only HDR values (>1.0) will glow
          intensity: How strong the glow effect is
          mipmapBlur: High quality blur for smooth bloom */}
      <Bloom
        luminanceThreshold={1.1}
        luminanceSmoothing={0.3}
        intensity={1.5}
        mipmapBlur
      />

      {/* Vignette - Darkens the edges of the screen
          darkness: How dark the edges get (0.5 = moderate)
          offset: How far from center the darkening starts */}
      <Vignette
        darkness={0.5}
        offset={0.5}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* Noise - Adds film grain for gritty cyberpunk feel
          opacity: Very subtle (0.02) to not be distracting
          blendFunction: OVERLAY for subtle integration */}
      <Noise
        opacity={0.02}
        blendFunction={BlendFunction.OVERLAY}
      />
    </EffectComposer>
  );
}
