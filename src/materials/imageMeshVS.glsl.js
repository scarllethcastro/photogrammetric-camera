export default /* glsl */`
#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec3 vPosition;
    varying float vValid;
#endif

#ifdef USE_COLOR
    varying vec3 vColor;
#endif

uniform float size;

void main() {
    #ifdef USE_COLOR
        vColor.xyz = color.xyz;
    #endif

    #ifdef USE_MAP4
        vPosition = position;
        vValid = 1.;
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);

    if (size > 0.) {
        gl_PointSize = size;
    }
    else {
        gl_PointSize = clamp(-size/gl_Position.w, 3.0, 10.0);
    }
}
`;