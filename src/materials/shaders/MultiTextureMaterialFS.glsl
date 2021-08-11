#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>
#include <camera_structure_for_mesh>
#include <tests_for_texturing>

#ifdef USE_BUILDING_DATE
  varying float vIsTheOne;
  varying float dontShow;
  varying float vTextureNumber;
#endif

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform sampler2DArray mapArray;
uniform TextureCameraForMesh textureCameras[NUM_TEXTURES];
varying mat3 vH[NUM_TEXTURES];
varying float passShadowMapTest[NUM_TEXTURES];
varying vec4 vPosition[NUM_TEXTURES];
varying vec4 vColor;
uniform float pixelRatio;


void main() {
  #include <logdepthbuf_fragment>

#ifdef USE_BUILDING_DATE
  if (dontShow > 0.0) {
      discard;
  }
#endif

  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  float scoresSum = 0.;
  vec4 color = vec4(0.);

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {
    allTestsForMesh(color, vPosition[ i ], textureCameras[ i ], passShadowMapTest[ i ], scoresSum, mapArray, i );
  }

  // Normalize color
  if (scoresSum != 0.) {
    float normalization = 1.0 / scoresSum;
    finalColor = color * normalization;
  } else {
    finalColor.rgb = vec3(0.2); // shadow color
  }

  gl_FragColor =  finalColor;
}