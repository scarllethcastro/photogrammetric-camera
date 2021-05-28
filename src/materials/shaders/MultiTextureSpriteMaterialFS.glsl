#include <distortions/radial_pars_fragment>

precision highp sampler2DArray;
uniform bool diffuseColorGrey;
uniform sampler2D map;
uniform RadialDistortion uvDistortion;
//uniform sampler2DArray mapArray;
uniform sampler2D textures[NUM_TEXTURES];
uniform float numTextures;
uniform mat3 M_prime_Post;
varying mat3 vH;
varying vec4 vColor;
varying float passShadowMapTest;

void main() {
  vec4 finalColor = vColor;

  if (diffuseColorGrey) {
    finalColor.rgb = vec3(dot(vColor.rgb, vec3(0.333333)));
  }

  // p_texture = H * p_screen
  vec3 texCoord = M_prime_Post * vH * vec3(gl_FragCoord.xy, 1.);
  texCoord /= texCoord.z;

  vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

  if (all(greaterThan(testBorder,vec2(0.))))
  {
    float normalization = 1.0 / numTextures;

    // Doesn't work
    vec4 color = vec4(0.);
    #pragma unroll_loop
    for (int i = 0; i < NUM_TEXTURES; i++) {
      color += texture2D( textures[ i ], texCoord.xy );
    }
    color *= normalization;
    finalColor = color;

  } else {
    finalColor.rgb = vec3(0.2);
  }

  gl_FragColor =  finalColor;
}
