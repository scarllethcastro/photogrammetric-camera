// M^(-1) * screen -> this.viewProjectionScreenInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;

uniform vec3 E_prime;
uniform mat3 M_prime_Pre;
uniform mat3 M_prime_Post;
uniform mat3 viewProjectionScreenInverse;
varying mat3 vH;
varying mat3 vM_prime_Post;


void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(color, 1.);
    vM_prime_Post = M_prime_Post;

    // Homography

    vec4 P = modelMatrix * vec4( position, 1.0 );
    P.xyz = P.xyz/P.w-cameraPosition;
    vec3 N = P.xyz;
    mat3 fraction = mat3(N.x*E_prime, N.y*E_prime, N.z*E_prime) / dot(N, P.xyz);
    vH = (M_prime_Pre + fraction) * viewProjectionScreenInverse;
}
