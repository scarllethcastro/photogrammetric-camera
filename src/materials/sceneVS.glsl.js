export default /* glsl */`

#ifdef USE_MAP4
    #undef USE_MAP
    varying highp vec4 vUvw;
#endif

uniform float size;

void main() {
    #ifdef USE_MAP4
        // Transform from normalized coords to pixel coords
        vec2 vUv = (uv*2.)-1.;
        vUvw = vec4(vUv, 0., 1.);
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}
`;