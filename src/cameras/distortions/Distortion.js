const chunks = {
    shaders: `
    struct Distos {
        float F;
        vec2 C;
        vec4 R;
        vec2 P;
        vec2 l;
    };

    float polynom(vec3 R, float x) {
        float x2 = x*x;
        return dot(R, vec3(x, x2, x*x2));
    }
    
    bool distort_radial(inout vec4 p, Distos disto, bool extrapol) {
        p /= p.w;
        vec2 r = p.xy - disto.C;
        float r2 = dot(r, r);
    
        if (r2 > disto.R.w)
            if (extrapol) r2 = disto.R.w;
            else return false;
    
        // the same as: p.xy = disto.C + r * (1.+polynom(disto.R.xyz, r2));
        p.xy += r*polynom(disto.R.xyz, r2);
        return true;
    }
    
    const int N = 10;
    const float m_err2_max = 0.5;
    bool distort_radial_inverse(inout vec4 p, Distos disto, bool extrapol) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float rd2 = dot(v, v);
        float r2_max = disto.R.w;
        float r_max = sqrt(r2_max);
        float rd_max = r_max *(1. + polynom(disto.R.xyz, r2_max));
        float rd2_max = rd_max * rd_max;
        vec3 derivative = disto.R.xyz * vec3(3.,5.,7.);
        float ratio = r_max / rd_max;
    
        // If we are inside the maximum radius
        if(rd2 < rd2_max){
            float rd = sqrt(rd2), r = rd*ratio, r2 = r*r; // initialization of the iteration
            float Pr2 = 1. + polynom(disto.R.xyz, r2);
            float err = rd - r*Pr2, err2 = err*err;
            // If we are inside the maximum radius, we want to invert
            // the function g(r) in order to find r from rd = d(r) = r*polynom(r^2)
            // in an iterative way, were:
            // r(0) = rd * ratio
            // r(n+1) = r(n) + (rd-d(r(n))) / d'(r(n))
            for (int i = 0; i < N; i++) { // iterate max N times
                if (err2 < m_err2_max) break;
                // New estimate of r such that d(r) = rd
                float D = 1. + polynom(derivative, r2); // = d'(r)
                r = clamp(r + err/D, 0., r_max);
                r2 = r*r;
                Pr2 = 1. + polynom(disto.R.xyz, r2);
                err = rd - r*Pr2;
                err2 = err*err;
            }
            if(err2 > m_err2_max) return false;
            p.xy = disto.C + (r/rd)*v;
    
        } else if (extrapol){
             p.xy = disto.C + ratio*v;
    
        } else return false;
    
        return true;
    }

    void fisheye(inout vec2 p, Distos disto){
        vec2 AB = (p - disto.C)/disto.F;
        float R = sqrt(dot(AB, AB));
        float theta = atan(R);
        float lambda = theta/R;
        vec2 P = lambda*AB;
        float x2 = P.x * P.x;
        float xy = P.x * P.y;
        float y2 = P.y * P.y;
        float r2 = dot(P, P);

        // Radial distortion and degree 1 polynomial
        float radial = 1. + polynom(disto.R.xyz, r2);
        p.x = P.y * disto.l.y + P.x * (radial + disto.l.x);
        p.y = P.x * disto.l.y + P.y * radial;

        // Tangential distortion
        p.x += disto.P.x*(r2 + (2.*x2)) + 2.*disto.P.y*xy;
        p.y += disto.P.y*(r2 + 2.*y2) + 2.*disto.P.x*xy;
    }

    bool distort_fisheye(inout vec4 p, Distos disto, bool extrapol) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float v2 = dot(v, v);

        if (v2 > disto.R.w)
            if (extrapol) p.xy = normalize(v)*sqrt(disto.R.w) + disto.C;
            else return false;

        fisheye(p.xy, disto);

        // Unapply N normalization
        if (v2 > disto.R.w){
            float d2 = dot(p.xy, p.xy);
            p.xy = disto.C + (v*disto.F*sqrt(d2))/sqrt(disto.R.w);
        }
        else p.xy = disto.C + disto.F*p.xy;
        return true;
    }

    bool distort_fisheye_inverse(inout vec4 p, Distos disto, bool extrapol) {
        p /= p.w;
        vec2 v = p.xy - disto.C;
        float rd2 = dot(v, v);

        float r2_max = disto.R.w;
        float r_max = sqrt(r2_max);
        vec2 point_rmax = normalize(v)*r_max + disto.C;
        fisheye(point_rmax, disto);
        float rd_max = disto.F*sqrt(dot(point_rmax, point_rmax));
        float rd2_max = rd_max*rd_max;
        float ratio = r_max/rd_max;

        // If we are inside the maximum radius
        if(rd2 < rd2_max){ 
        }
        else p.xy = disto.C + ratio*v;
        return true;
    }
`,
}

export default {
    chunks,
};