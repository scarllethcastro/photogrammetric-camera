// M^(-1) -> this.viewProjectionInverse
// C -> uniform vec3 cameraPosition
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;

uniform vec3 textureCameraPosition;
uniform mat4 textureCameraPreTransform; // Contains the rotation and the intrinsics of the camera, but not the translation
uniform mat4 textureCameraPostTransform;
uniform mat3 viewProjectionInverse;
varying mat3 vH;

void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    // Homography

    mat4 M_prime_mat4 = textureCameraPostTransform * textureCameraPreTransform;
    mat3 M_prime = mat3(M_prime_mat4[0][0], M_prime_mat4[0][1], M_prime_mat4[0][3],
                        M_prime_mat4[1][0], M_prime_mat4[1][1], M_prime_mat4[1][3],
                        M_prime_mat4[2][0], M_prime_mat4[2][1], M_prime_mat4[2][3]);

    vec3 E_prime = M_prime * (cameraPosition - textureCameraPosition);

    vec4 P = modelMatrix * vec4( position, 1.0 );
    P.xyz /= P.w;
    vec3 N = P.xyz - cameraPosition;

    mat3 numerator = mat3(N.x*E_prime, N.y*E_prime, N.z*E_prime);
    float denominator = dot(N, P.xyz - cameraPosition);

    mat3 fraction = ( 1.0 / denominator ) * numerator;

    vH = (M_prime + fraction) * viewProjectionInverse;


    vColor = vec4(color, 1.);
}
