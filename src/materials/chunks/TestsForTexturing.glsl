bool testsForTexturing(inout vec4 color, vec3 texCoord, sampler2D texture_i, TextureCamera textureCamera_i) {

  // Don't texture if texCoord.z < 0 (z = w in this case)
  if (texCoord.z > 0. && distort_radial_vec3(texCoord, textureCamera_i.uvDistortion)) {

    texCoord = textureCamera_i.M_prime_Post * texCoord;
    texCoord /= texCoord.z;

    // Test if coordinates are valid, so we can texture
    vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

    if (all(greaterThan(testBorder,vec2(0.)))) {
      color += texture2D( texture_i, texCoord.xy );
      return true;
    } else {
      return false;
    }

  } else {
    return false;
  }
}
