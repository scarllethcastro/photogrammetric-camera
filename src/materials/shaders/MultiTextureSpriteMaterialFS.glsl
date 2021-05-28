#include <distortions/radial_pars_fragment>
#include <camera_structure>

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform RadialDistortion uvDistortion;
//uniform sampler2DArray mapArray;
uniform TextureCamera textureCameras[NUM_TEXTURES];
uniform sampler2D textures[NUM_TEXTURES];
varying mat3 vH[NUM_TEXTURES];
//varying float passShadowMapTest;
varying vec4 vColor;


void main() {
  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  vec3 texCoord;
  vec2 testBorder;
  float countTexturesApplied = 0.;
  vec4 color = vec4(0.);

  // For each textureCamera
  #pragma unroll_loop
  for ( int i = 0; i < NUM_TEXTURES; i++ ) {

    // p_texture = H * p_screen
    texCoord = textureCameras[ i ].M_prime_Post * vH[ i ] * vec3(gl_FragCoord.xy, 1.);
    texCoord /= texCoord.z;

    testBorder = min(texCoord.xy, 1. - texCoord.xy);

    // Not able to use brackets because it messes up the unroll loop pattern
    // TODO: find another way to do this because we need nested ifs to be able
    // include the distortion and the shadowMapping
    if (all(greaterThan(testBorder,vec2(0.))))
      color += texture2D( textures[ i ], texCoord.xy );
    if (all(greaterThan(testBorder,vec2(0.))))
      countTexturesApplied++;

  }

  // Normalize color
  if (countTexturesApplied != 0.) {
    float normalization = 1.0 / countTexturesApplied;
    finalColor = color * normalization;
  }

  gl_FragColor =  finalColor;
}
