#include <logdepthbuf_pars_fragment>
#include <distortions/radial_pars_fragment>
#include <camera_structure>
#include <tests_for_texturing>

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform sampler2DArray mapArray;
uniform TextureCamera textureCameras[NUM_TEXTURES];
varying vec3 n;
varying vec4 passShadowMapTest[NUM_TEXTURES_BY_FOUR];
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
  vec3 screenCoord;
  vec3 texCoord;
  int index;
  int coordinate;
  float passShadowMapTest_i;

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {
    screenCoord = vec3(gl_FragCoord.xy / pixelRatio, 1.);
    texCoord = textureCameras[ i ].H_prime * screenCoord + dot(n, screenCoord) * textureCameras[ i ].E_prime;

    index = i / 4;
    coordinate = int(mod(float( i ), 4.0));

    if (coordinate == 0)
      passShadowMapTest_i = passShadowMapTest[ index ].x;
    else if (coordinate == 1)
      passShadowMapTest_i = passShadowMapTest[ index ].y;
    else if (coordinate == 2)
      passShadowMapTest_i = passShadowMapTest[ index ].z;
    else
      passShadowMapTest_i = passShadowMapTest[ index ].w;

    allTestsForSprite(color, texCoord, textureCameras[ i ], passShadowMapTest_i, scoresSum, mapArray, i );
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
