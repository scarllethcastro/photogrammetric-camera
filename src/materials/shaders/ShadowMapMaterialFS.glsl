varying vec4 vPositionImage;

void main() {

  float distanceCamera = ((vPositionImage.z / vPositionImage.w) + 1.) / 2.;
  gl_FragColor = packDepthToRGBA(distanceCamera);

  // Change to this line to visualize the result
  //gl_FragColor = vec4(1. - distanceCamera, 1. - distanceCamera, 1. - distanceCamera, 1.);
  
}
