void allTests(inout vec4 color, vec4 fragCoord, mat3 vH_i, TextureCamera textureCamera_i, float passShadowMapTest_i, inout float scoresSum, sampler2DArray mapArray, int index) {

  if (passShadowMapTest_i > 0.5) {

    vec3 texCoord = vH_i * vec3(fragCoord.xy, 1.);

    // Don't texture if texCoord.z < 0 (z = w in this case)
    if (texCoord.z > 0. && distort_radial_vec3(texCoord, textureCamera_i.uvDistortion)) {

       texCoord = textureCamera_i.M_prime_Post * texCoord;
       texCoord /= texCoord.z;

      // Test if coordinates are valid, so we can texture
      vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

      if (all(greaterThan(testBorder,vec2(0.))) && passShadowMapTest_i == 1.) {
        color += texture( mapArray, vec3( texCoord.xy, textureCamera_i.index ) ) * textureCamera_i.weight;
        scoresSum += textureCamera_i.weight;
      }
    }
  }
}

void shadowMapTest(mat4 m, vec3 position, TextureCamera textureCamera_i, sampler2D depthMap_i, inout float passShadowMapTest_i) {
  m[3].xyz -= textureCamera_i.position;
  vec4 uvwNotDistorted = textureCamera_i.postTransform * textureCamera_i.preTransform * m * vec4(position, 1.0);
  uvwNotDistorted.xyz /= uvwNotDistorted.w;

  // If using ShadowMapMaterial:
  // float minDist = unpackRGBAToDepth(texture2D(depthMap_i, uvwNotDistorted.xy));

  float minDist = texture2D(depthMap_i, uvwNotDistorted.xy).r;
  float distanceCamera = uvwNotDistorted.z;
  vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);
  if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && distanceCamera <= minDist + EPSILON ) {
    passShadowMapTest_i = 1.0;
  } else {
    passShadowMapTest_i = 0.0;
  }
}
