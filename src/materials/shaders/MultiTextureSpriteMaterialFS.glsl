#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform sampler2DArray mapArray;
uniform TextureCamera textureCameras[NUM_TEXTURES];
varying mat3 vH[NUM_TEXTURES];
varying float passShadowMapTest[NUM_TEXTURES];
varying vec4 vColor;
uniform float pixelRatio;
uniform float opacity;


void main() {
  #include <logdepthbuf_fragment>

  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  float scoresSum = 0.;
  vec4 color = vec4(0.);

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {
    allTests(color, gl_FragCoord / pixelRatio, vH[ i ], textureCameras[ i ], passShadowMapTest[ i ], scoresSum, mapArray, i );
  }

  // Normalize color
  if (scoresSum != 0.) {
    float normalization = 1.0 / scoresSum;
    finalColor = color * normalization;
  } else {
    finalColor.rgb = vec3(0.2); // shadow color
  }

  gl_FragColor =  vec4(finalColor.rgb, opacity);
}
