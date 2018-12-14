attribute vec2 position;

varying vec2 uv;
void main(){
    uv = (position.xy + vec2(1.0))/2.;
    uv.y = 1. - uv.y;
    gl_Position = vec4(position,0,1);
}