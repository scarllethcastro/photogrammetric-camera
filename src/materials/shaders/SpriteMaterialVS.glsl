// M^(-1) -> this.viewProjectionInverse
<<<<<<< HEAD
// C -> uniform vec3 cameraPosition
=======
// C -> this.viewCameraPosition
>>>>>>> Start of implementation of point sprites (lot of problems)
// M' -> this.textureCameraPostTransform * this.textureCameraPreTransform
// C' -> this.textureCameraPosition
// P -> attribute vec3 position;

uniform float size;
varying vec4 vColor;

uniform vec3 textureCameraPosition;
uniform mat4 textureCameraPreTransform; // Contains the rotation and the intrinsics of the camera, but not the translation
uniform mat4 textureCameraPostTransform;
<<<<<<< HEAD
uniform mat3 viewProjectionInverse;
varying mat3 vH;

=======
uniform vec3 viewCameraPosition;
uniform mat4 viewProjectionInverse;
varying mat4 vH;
>>>>>>> Start of implementation of point sprites (lot of problems)

void main() {
    gl_PointSize = size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    // Homography

<<<<<<< HEAD
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
=======
    mat4 M_prime = textureCameraPostTransform * textureCameraPreTransform;
    vec4 E_prime = M_prime * vec4(viewCameraPosition - textureCameraPosition, 1.0);
    E_prime.xyz /= E_prime.w;
    vec4 P = modelMatrix * vec4( position, 1.0 );
    P.xyz /= P.w;
    vec3 N = P.xyz - viewCameraPosition;

    mat3 E_prime_mat = mat3(E_prime.x, 0.0, 0.0,
                            0.0, E_prime.y, 0.0,
                            0.0, 0.0, E_prime.z);

    mat3 N_transpose_mat = mat3(N.x, N.y, N.z,
                                N.x, N.y, N.z,
                                N.x, N.y, N.z);

    mat3 numerator = E_prime_mat * N_transpose_mat;
    float denominator = dot(N, P.xyz - viewCameraPosition);

    mat3 fraction = ( 1.0 / denominator ) * numerator;


    // TODO: find another way to do this
    M_prime[0][0] += fraction[0][0]; M_prime[0][1] += fraction[0][1]; M_prime[0][2] += fraction[0][2];
    M_prime[1][0] += fraction[1][0]; M_prime[1][1] += fraction[1][1]; M_prime[1][0] += fraction[1][2];
    M_prime[2][0] += fraction[2][0]; M_prime[2][1] += fraction[2][1]; M_prime[2][0] += fraction[2][2];


    vH = M_prime * viewProjectionInverse;
>>>>>>> Start of implementation of point sprites (lot of problems)


    vColor = vec4(color, 1.);
}
