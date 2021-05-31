bool testsForTexturing(inout vec4 color, vec3 texCoord, sampler2D texture_i) {

  // Border final test
  vec2 testBorder = min(texCoord.xy, 1. - texCoord.xy);

  if (all(greaterThan(testBorder,vec2(0.)))) {
    color += texture2D( texture_i, texCoord.xy );
    return true;
  }

  return false;
}
