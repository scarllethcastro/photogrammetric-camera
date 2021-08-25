#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

#ifdef USE_BUILDING_DATE
  varying float vIsTheOne;
  varying float dontShow;
  varying float vTextureNumber;
#endif

precision highp sampler2DArray;
uniform mat4 modelMatrix;
uniform bool diffuseColorGrey;
uniform sampler2DArray mapArray;
uniform sampler2DArray depthMapArray;
uniform bool shadowMappingActivated;
uniform TextureCamera textureCameras[NUM_TEXTURES];
varying vec3 vNewPosition;
varying vec4 vColor;
uniform float pixelRatio;
uniform float opacity;


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
  mat4 m_withTranslation;
  vec4 texCoord;

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {

    m_withTranslation = modelMatrix;
    m_withTranslation[3].xyz -= textureCameras[ i ].position;
    texCoord = textureCameras[ i ].preTransform * m_withTranslation * vec4(vNewPosition, 1.0);

    allTestsForMesh(color, texCoord, textureCameras[ i ], scoresSum, mapArray, depthMapArray, shadowMappingActivated, i );
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