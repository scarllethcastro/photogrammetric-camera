void shadowMapTest(bool useUvw, vec4 uvw, mat4 m, vec3 position, TextureCamera textureCamera_i, sampler2DArray depthMapArray, inout float passShadowMapTest_i) {
  
  vec4 uvwNotDistorted;

  if (useUvw) {
    uvwNotDistorted = textureCamera_i.postTransform * uvw;
  } else {
    m[3].xyz -= textureCamera_i.position;
    uvwNotDistorted = textureCamera_i.postTransform * textureCamera_i.preTransform * m * vec4(position, 1.0);
  }
  
  uvwNotDistorted.xyz /= uvwNotDistorted.w;

  // If using ShadowMapMaterial:
  // float minDist = unpackRGBAToDepth(texture(depthMapArray, vec3( uvwNotDistorted.xy, textureCamera_i.index )));

  float minDist = texture(depthMapArray, vec3( uvwNotDistorted.xy, textureCamera_i.index )).r;
  bool passShadowMapTest;

  #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )

    float glPosition_w = uvwNotDistorted.w / 2.0;
    float glFragDepthEXT = log2(glPosition_w + 1.0) * logDepthBufFC * 0.5;
    passShadowMapTest = (glFragDepthEXT >= (minDist - EPSILON - 0.001)) && (glFragDepthEXT <= (minDist + EPSILON + 0.001));

	#else

    float distanceCamera = uvwNotDistorted.z;
    passShadowMapTest = distanceCamera <= (minDist + EPSILON);

	#endif

  vec3 testBorderNotDistorted = min(uvwNotDistorted.xyz, 1. - uvwNotDistorted.xyz);
  if ( all(greaterThan(testBorderNotDistorted,vec3(0.))) && passShadowMapTest ) {
    passShadowMapTest_i = 1.0;
  } else {
    passShadowMapTest_i = 0.0;
  }
}

void allTestsForSprite(inout vec4 color, vec3 texCoord, TextureCamera textureCamera_i, float passShadowMapTest_i, inout float scoresSum, sampler2DArray mapArray, int index) {

  // ShadowMapping
  if (passShadowMapTest_i > 0.5) {

    // Don't texture if texCoord.z < 0 (z = w in this case)
    if (texCoord.z > 0. && distort_radial_vec3(texCoord, textureCamera_i.uvDistortion)) {

       texCoord = textureCamera_i.M_prime_Post * texCoord;
       texCoord /= texCoord.z;

      // Test if coordinates are valid, so we can texture
      vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

      if (all(greaterThan(testBorder,vec2(0.)))) {
        color += texture( mapArray, vec3( texCoord.xy, textureCamera_i.index ) ) * textureCamera_i.weight;
        scoresSum += textureCamera_i.weight;
      }
    }
  }
}

void allTestsForMesh(inout vec4 color, vec4 texCoord, TextureCamera textureCamera_i, inout float scoresSum, sampler2DArray mapArray, sampler2DArray depthMapArray, bool shadowMappingActivated, int index) {

  // ShadowMapping
  float passShadowMapTest_i = 0.0;
  if ( shadowMappingActivated )
    shadowMapTest(true, texCoord, mat4(0), vec3(0.), textureCamera_i, depthMapArray, passShadowMapTest_i);
  else
    passShadowMapTest_i = 1.0;

  if (passShadowMapTest_i > 0.5) {

    // Don't texture if texCoord.z < 0 (z = w in this case)
    if (texCoord.w > 0. && distort_radial(texCoord, textureCamera_i.uvDistortion)) {

       texCoord = textureCamera_i.postTransform * texCoord;
       texCoord.xyz /= texCoord.w;

      // Test if coordinates are valid, so we can texture
      vec3 testBorder = min(texCoord.xyz, 1. - texCoord.xyz);

      if (all(greaterThan(testBorder,vec3(0.)))) {
        color += texture( mapArray, vec3( texCoord.xy, textureCamera_i.index ) ) * textureCamera_i.weight;
        scoresSum += textureCamera_i.weight;
      }
    }
  }
}