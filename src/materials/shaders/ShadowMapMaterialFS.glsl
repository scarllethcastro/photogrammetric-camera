varying vec4 vPositionImage;

void main() {

  float distanceCamera = ((vPositionImage.z / vPositionImage.w) + 1.) / 2.;
  gl_FragColor = packDepthToRGBA(distanceCamera);
}
