import { default as PhotogrammetricDistortion } from '../PhotogrammetricDistortion';

// http://fr.wikipedia.org/wiki/Methode_de_Cardan
function cardan_cubic_roots(a, b, c, d)
{
    if (a == 0) return quadratic_roots(b, c, d);
    var vt = -b / (3 * a);
    var a2 = a * a;
    var b2 = b * b;
    var a3 = a * a2;
    var b3 = b * b2;
    var p = c / a - b2 / (3 * a2);
    var q = b3 / (a3 * 13.5) + d / a - b * c / (3 * a2);
    if (p == 0) {
        var x0 = cubic_root(-q) + vt;
        return [x0, x0, x0];
    }
    var p3_4_27 = p * p * p * 4 / 27;
    var del = q * q + p3_4_27;

    if (del > 0) {
        var sqrt_del = Math.sqrt(del);
        var u = cubic_root((-q + sqrt_del) / 2);
        var v = cubic_root((-q - sqrt_del) / 2);
        return [u + v + vt];
    } else if (del == 0) {
        var z0 = 3 * q / p;
        var x12 = vt - z0 * 0.5;
        return [vt + z0, x12, x12];
    } else { // (del < 0)
        var kos = Math.acos(-q / Math.sqrt(p3_4_27));
        var r = 2 * Math.sqrt(-p / 3);
        return [
            vt + r * Math.cos((kos) / 3),
            vt + r * Math.cos((kos + Math.PI) / 3),
            vt + r * Math.cos((kos + Math.PI * 2) / 3),
        ];
    }
}

function quadratic_roots(a, b, c)
{
    var delta = b * b - 4 * a * c;
    if (delta < 0) return [];
    var x0 = -b / (2 * a);
    if (delta == 0) return [x0];
    var sqr_delta_2a = Math.sqrt(delta) / (2 * a);
    return [x0 - sqr_delta_2a, x0 + sqr_delta_2a];
}

function sgn(x) { return (x > 0) - (x < 0); }
function cubic_root(x) { return sgn(x) * Math.pow(Math.abs(x), 1 / 3); }

// maximum squared radius of a radial distortion of degree 3 (r3, r5, r7)
function r2max(R)
{
    // returned the square of the smallest positive root of the derivative of the distorsion polynomial
    // which tells where the distorsion might no longer be bijective.
    var roots = cardan_cubic_roots(7 * R[2], 5 * R[1], 3 * R[0], 1);
    var imax = -1;
    for (var i in roots) if (roots[i] > 0 && (imax == -1 || roots[imax] > roots[i])) imax = i;
    if (imax == -1) return Infinity; // no roots : all is valid !
    return roots[imax];
}

// https://github.com/micmacIGN/micmac/blob/e0008b7a084f850aa9db4dc50374bd7ec6984da6/src/photogram/phgr_ebner_brown_dist.cpp#L441-L475
// WithFraser=false
function project(p) {
    var x = p.x - this.C[0];
    var y = p.y - this.C[1];
    var r2 = x * x + y * y;
    var radial = r2 * PhotogrammetricDistortion.polynom(this.R, r2);
    p.x += radial * x;
    p.y += radial * y;
    return p;
}

const chunks = {
    radial_shaders: `
struct RadialDistortion {
    vec2 C;
    vec4 R;
};

float polynom(vec3 R, float r2) {
    float r4 = r2*r2;
    return dot(R, vec3(r2, r4, r2*r4));
}

float derivpolynom(vec3 R, float r2){
    float r4 = r2*r2;
    return dot(R, vec3(3.*r2, 5.*r4, 7.*r2*r4));
}

bool distort_radial(inout vec4 p, RadialDistortion disto, bool extrapol, float m) {
    p /= p.w;
    vec2 r = p.xy - disto.C;
    float r2 = dot(r, r);

    float r_max = sqrt(disto.R.w);

    float rd_max = sqrt(disto.R.w)*(1. + polynom(disto.R.xyz, disto.R.w));
    float rd2_max = dot(rd_max, rd_max);

    // If we are inside the maximum radius
    if(r2 < disto.R.w){
        // the same as: p.xy = disto.C + r * (1.+polynom(disto.R.xyz, r2));
        p.xy += r * polynom(disto.R.xyz, r2);
    }
    // Otherwise extrapolate
    else if(extrapol){
        float g_r2_max = 1. + polynom(disto.R.xyz, disto.R.w);
        p.xy = disto.C + (m*r + normalize(r)*r_max*(g_r2_max - m));
    }else return false;

    return true;
}

const int N = 50;
const float m_error_max = 0.5;
bool distort_radial_inverse(inout vec4 p, RadialDistortion disto, bool extrapol, float m) {
    p /= p.w;
    vec2 rd = p.xy - disto.C;
    float rd2 = dot(rd, rd);

    float rd_max = sqrt(disto.R.w)*(1. + polynom(disto.R.xyz, disto.R.w));
    float rd2_max = dot(rd_max, rd_max);
    float r_max = sqrt(disto.R.w);

    // Extrapolate if we are outisde the maximum radius
    if(rd2 > rd2_max){
        if(extrapol){
            float g_r2_max = 1. + polynom(disto.R.xyz, disto.R.w);
            p.xy = disto.C + (rd/m) + normalize(rd)*(r_max/m)*(m - g_r2_max);
        }else return false;
    // If not, apply the iterative mode
    }else{
        float y = sqrt(rd2), r = y; // initialization of the iteration
        float r2 = r*r, g_r2 = 1.+polynom(disto.R.xyz, r2);
        float err = (y - r*g_r2), err2 = err*err; // r*g(r2) = d(r)
        
        // If we are inside the maximum radius, we want to invert
        // the function g(r) in order to find r from y = d(r) = r*g(r^2)
        // in an iterative way, were:
        // r(0) = y
        // r(n+1) = r(n) + (y-d(r(n))) / d'(r(n))
        for (int i = 0; i < N; i++) { // iterate max 50 times
            if (err2 < m_error_max || r2 > disto.R.w) break;
            // New estimate of r such that h(r) = y
            float D = 1.+derivpolynom(disto.R.xyz, r2); // = d'(r)
            if (D < 0.1) r += err;
            else r += err/D;
            r2 = r*r, g_r2 = 1.+polynom(disto.R.xyz, r2);
            err = (y - r*g_r2), err2 = err*err;
            float ratio = r/y;    
            p.xy = disto.C + ratio*rd;
        }

        if(err2 > m_error_max) return false;
    }
    return true;
}
`,
}

export default {
    r2max,
    project,
    chunks,
};
