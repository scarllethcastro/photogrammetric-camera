#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform RadialDistortion uvDistortion;
//uniform sampler2DArray mapArray;
uniform TextureCamera textureCameras[NUM_TEXTURES];
uniform sampler2D textures[NUM_TEXTURES];
varying mat3 vH[NUM_TEXTURES];
varying float passShadowMapTest[NUM_TEXTURES];
varying vec4 vColor;


void main() {
  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  float countTexturesApplied = 0.;
  vec4 color = vec4(0.);

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {
    allTests(color, gl_FragCoord, vH[ i ], textures[ i ], textureCameras[ i ], passShadowMapTest[ i ], countTexturesApplied);
  }

  // Normalize color
  if (countTexturesApplied != 0.) {
    float normalization = 1.0 / countTexturesApplied;
    finalColor = color * normalization;
  } else {
    finalColor.rgb = vec3(0.2); // shadow color
  }

  gl_FragColor =  finalColor;
}
