#[macro_use]
extern crate cfg_if;
extern crate palette;
extern crate wasm_bindgen;
use std::mem;
use std::os::raw::c_void;
use std::slice;
cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function to get better error messages if we ever panic.
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        use console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
        fn set_panic_hook() {}
    }
}

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

// In order to work with the memory we expose (de)allocation methods
#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr as *mut c_void;
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut c_void, cap: usize) {
    unsafe {
        let _buf = Vec::from_raw_parts(ptr, 0, cap);
    }
}

struct Pixel {
    pub x: usize,
    pub y: usize,
}

impl Pixel {
    pub fn new(x: usize, y: usize) -> Pixel {
        Pixel { x: x, y: y }
    }
}

struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Color {
    pub fn new(r: u8, g: u8, b: u8) -> Color {
        Color { r: r, g: g, b: b }
    }
}

fn solveBFS(
    bfsQueue: &mut Vec<Pixel>,
    memory: &mut [u8],
    source: &[u8],
    dest: &mut [u8],
    width: usize,
    height: usize,
    color: &Color,
) {
    while bfsQueue.len() > 0 {
        let point = bfsQueue.remove(0);
        memory[point.y * width + point.x] = 1;
        dest[((height - point.y) * width + point.x) * 4] = color.r;
        dest[((height - point.y) * width + point.x) * 4 + 1] = color.g;
        dest[((height - point.y) * width + point.x) * 4 + 2] = color.b;
        //has left?
        if point.x > 0
            && source[(point.y * width + point.x - 1) * 4] > 128
            && memory[point.y * width + point.x - 1] == 0
        {
            memory[point.y * width + point.x - 1] = 1;
            bfsQueue.push(Pixel::new(point.x - 1, point.y))
        }
        // // // has right?
        if point.x < width - 1
            && source[(point.y * width + point.x + 1) * 4] > 128
            && memory[point.y * width + point.x + 1] == 0
        {
            memory[point.y * width + point.x + 1] = 1;
            bfsQueue.push(Pixel::new(point.x + 1, point.y))
        }
        // // has up?
        if point.y > 0
            && source[((point.y - 1) * width + point.x) * 4] > 128
            && memory[(point.y - 1) * width + point.x] == 0
        {
            memory[(point.y - 1) * width + point.x] = 1;
            bfsQueue.push(Pixel::new(point.x, point.y - 1))
        }
        //  has down?
        if point.y < height - 1
            && source[((point.y + 1) * width + point.x) * 4] > 128
            && memory[(point.y + 1) * width + point.x] == 0
        {
            memory[(point.y + 1) * width + point.x] = 1;
            bfsQueue.push(Pixel::new(point.x, point.y + 1))
        }
    }
}

#[no_mangle]
pub fn process(source: *const u8, dest: *mut u8, mem: *mut u8, width: usize, height: usize) {
    // ポインタからの変換
    let pixelCount = width * height;
    let sa = unsafe { slice::from_raw_parts(source, pixelCount * 4) };
    let da = unsafe { slice::from_raw_parts_mut(dest, pixelCount * 4) };
    let mem = unsafe { slice::from_raw_parts_mut(mem, pixelCount) };
    for x in 0..(width - 1) {
        for y in 0..(height - 1) {
            let bp = y * width + x;
            let cbp = bp * 4;
            da[cbp] = 0;
            da[cbp + 1] = 0;
            da[cbp + 2] = 0;
            da[cbp + 3] = 255;
            mem[bp] = 0;
        }
    }
    let mut bfs: Vec<Pixel> = Vec::new();
    let mut colors: Vec<Color> = Vec::new();
    colors.push(Color::new(255, 0, 0));
    colors.push(Color::new(0, 255, 0));
    colors.push(Color::new(0, 0, 255));
    colors.push(Color::new(255, 255, 0));
    colors.push(Color::new(0, 255, 255));
    colors.push(Color::new(255, 0, 255));
    colors.push(Color::new(255, 128, 0));
    colors.push(Color::new(128, 255, 0));
    colors.push(Color::new(0, 128, 255));
    colors.push(Color::new(128, 255, 0));
    colors.push(Color::new(255, 128, 0));
    colors.push(Color::new(0, 255, 128));
    let mut ci = 0;
    for x in 0..(width - 1) {
        for y in 0..(height - 1) {
            let bp = y * width + x;
            let cbp = bp * 4;
            if sa[cbp] > 128 && mem[bp] == 0 {
                let color = &colors[ci % colors.len()];
                // 線の上でないかつ、すでに処理していない場所であったなら
                bfs.push(Pixel::new(x, y));
                //dest[(point.y * width + point.x) * 4] = 255;
                solveBFS(&mut bfs, mem, sa, da, width, height, color);
                bfs.clear();
                ci = ci + 1;
            }
        }
    }
    return;
}
