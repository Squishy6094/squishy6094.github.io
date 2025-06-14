// Set up canvas for rendering
if (!document.body) {
    document.documentElement.appendChild(document.createElement('body'));
}

const canvas = document.createElement('canvas');

canvas.id = 'myCanvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
// canvas.style.width = '100vw';
// canvas.style.height = '100vh';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

let resN64Math = window.innerHeight / 240;
const context = canvas.getContext('2d');

// The real stuffs

const RESOLUTION_DJUI = 1;
const RESOLUTION_N64 = 2;
let currentResolution = RESOLUTION_DJUI;
let resDJUIScale = 1; // Scale for DJUI resolution

// configDjuiScale: 0 = auto, 1 = 0.5, 2 = 0.85, 3 = 1.0, 4 = 1.5
let configDjuiScale = 0; // You can set this elsewhere as needed

function djui_gfx_get_scale() {
    if (configDjuiScale === 0) { // auto
        const windowHeight = window.innerHeight;
        if (windowHeight < 768) {
            return 0.5;
        } else if (windowHeight < 1440) {
            return 1.0;
        } else {
            return 1.5;
        }
    } else {
        switch (configDjuiScale) {
            case 1:  return 0.5;
            case 2:  return 0.85;
            case 3:  return 1.0;
            case 4:  return 1.5;
            default: return 1.0;
        }
    }
}

function get_res_scale() {
    if (currentResolution === RESOLUTION_DJUI) {
        return resDJUIScale;
    }
    else if (currentResolution === RESOLUTION_N64) {
        return resN64Math;
    }
    return 1;
}

function djui_hud_set_resolution(res) {
    if (res !== RESOLUTION_DJUI && res !== RESOLUTION_N64) {
        throw new Error('Invalid resolution: must be RESOLUTION_DJUI or RESOLUTION_N64');
    }
    currentResolution = res;
}

function djui_hud_get_screen_width() {
    return canvas.width / get_res_scale();
}

function djui_hud_get_screen_height() {
    if (currentResolution === RESOLUTION_DJUI) {
        return canvas.height / resDJUIScale;
    } else if (currentResolution === RESOLUTION_N64) {
        return 240; // N64 height is always 240 pixels
    }
}

function djui_hud_set_color(r, g, b, a) {
    a = a / 255;
    context.globalAlpha = a;
    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
}

const renderList = [];

let currentRotation = 0;
let currentPivotX = 0;
let currentPivotY = 0;

function djui_hud_set_rotation(rotation, pivotX, pivotY) {
    currentRotation = (-rotation / 0x10000) * 360;
    currentPivotX = pivotX;
    currentPivotY = pivotY;
}

function apply_rotation_context(x, y, width, height) {
    const pivotX = x + width * currentPivotX;
    const pivotY = y + height * currentPivotY;
    context.translate(pivotX, pivotY);
    context.rotate(currentRotation * Math.PI / 180);
    context.translate(-pivotX, -pivotY);
}

let _djui_mouse_x = 0;
let _djui_mouse_y = 0;
let _djui_mouse_buttons_down = 0;
let _djui_mouse_buttons_prev = 0;

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    _djui_mouse_x = (e.clientX - rect.left) / get_res_scale();
    _djui_mouse_y = (e.clientY - rect.top) / get_res_scale();
});

canvas.addEventListener('mousedown', function(e) {
    _djui_mouse_buttons_down |= (1 << e.button);
});

canvas.addEventListener('mouseup', function(e) {
    _djui_mouse_buttons_down &= ~(1 << e.button);
});

// Mobile "Mouse" Support
canvas.addEventListener('touchmove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0]; // Use the first touch point

    _djui_mouse_x = (touch.clientX - rect.left) / get_res_scale();
    _djui_mouse_y = (touch.clientY - rect.top) / get_res_scale();

    //e.preventDefault(); // Prevent scrolling or pinch-zoom
}, { passive: false }); // Needed to allow preventDefault()

canvas.addEventListener('touchstart', function(e) {
    _djui_mouse_buttons_down |= (1 << 0);
    //e.preventDefault(); // Prevent mouse emulation
});

canvas.addEventListener('touchend', function(e) {
    _djui_mouse_buttons_down &= ~(1 << 0);
    //e.preventDefault(); // Prevent mouse emulation
});

function djui_hud_get_mouse_x() {
    return _djui_mouse_x;
}

function djui_hud_get_mouse_y() {
    return _djui_mouse_y;
}

function djui_hud_get_mouse_buttons_down() {
    return _djui_mouse_buttons_down;
}

function djui_hud_get_mouse_buttons_pressed() {
    return (_djui_mouse_buttons_down & ~_djui_mouse_buttons_prev);
}

function djui_hud_get_mouse_buttons_released() {
    return (~_djui_mouse_buttons_down & _djui_mouse_buttons_prev);
}

function djui_hud_render_rect(x, y, width, height) {
    const scale = get_res_scale();
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * scale;
    const sh = height * scale;
    context.save();
    apply_rotation_context(sx, sy, sw, sh);
    context.fillRect(sx, sy, sw, sh);
    context.restore();
}

const fontStyles = document.createElement('style');
const FONT_NORMAL = 1;
const FONT_ALIASED = 2;
fontStyles.textContent = `
@font-face {font-family: FONT_NORMAL; src: url('djui-js/sm64coopdx-normal-font.ttf') format('truetype'); font-weight: normal; font-style: normal;}
@font-face {font-family: FONT_ALIASED; src: url('djui-js/sm64coopdx-aliased-font.ttf') format('truetype'); font-weight: normal; font-style: normal;}
`;
document.head.appendChild(fontStyles);

context.font = '24px FONT_NORMAL';
currentFont = 'FONT_NORMAL'
currentFontSize = 24;
function djui_hud_set_font(font) {
    if (font === FONT_NORMAL) {
        currentFont = 'FONT_NORMAL';
        currentFontSize = 24;
    } else if (font === FONT_ALIASED) {
        currentFont = 'FONT_ALIASED';
        currentFontSize = 24;
    }
}
function djui_hud_measure_text(text) {
    const scale = get_res_scale();
    context.save();
    context.textBaseline = 'top';
    context.font = `${currentFontSize * scale}px ${currentFont}`;
    const metrics = context.measureText(text);
    context.restore();
    return metrics.width / scale;
}

function djui_hud_print_text(text, x, y, scale) {
    const resScale = get_res_scale();
    context.textBaseline = 'top'; // Align text at the top
    context.imageSmoothingEnabled = false;
    context.font = `${scale * currentFontSize * resScale}px ${currentFont}`;
    context.fillText(text, x * resScale, y * resScale);
}

function get_texture_info(texName) {
    const img = new Image();
    img.src = texName;
    img.width = img.naturalWidth
    img.height = img.naturalHeight
    return img;
}

const gTextures = {
    luigi: get_texture_info('djui-js/luigi.png'),
    toad: get_texture_info('djui-js/toad.png'),
    waluigi: get_texture_info('djui-js/waluigi.png'),
    wario: get_texture_info('djui-js/wario.png'),
};

function djui_hud_render_texture(texture, x, y, scaleX, scaleY) {
    if (!(texture instanceof HTMLImageElement) || !texture.complete || texture.naturalWidth === 0) {
        return;
    }

    const scale = get_res_scale();
    const drawX = x * scale;
    const drawY = y * scale;
    const drawW = texture.naturalWidth * scaleX * scale;
    const drawH = texture.naturalHeight * scaleY * scale;

    context.save();
    apply_rotation_context(drawX, drawY, drawW, drawH);
    context.imageSmoothingEnabled = false;
    context.drawImage(texture, drawX, drawY, drawW, drawH);
    context.restore();
}



function djui_hud_render_texture_tile(texture, x, y, width, height, tileX, tileY, tileWidth, tileHeight) {
    const scale = get_res_scale();
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * tileWidth * tileWidth / texture.naturalWidth;
    const sh = height * tileHeight * tileHeight / texture.naturalHeight;
    context.save();
    apply_rotation_context(sx, sy, sw, sh);
    if (texture instanceof HTMLImageElement) {
        context.imageSmoothingEnabled = false;
        context.drawImage(texture, tileX, tileY, tileWidth, tileHeight, sx, sy, sw * scale, sh * scale);
    }
    context.restore();
}

const hookedFunctions = [];
function hook_event(func) {
    if (typeof func === 'function') {
        hookedFunctions.push(func);
    }
}

function djui_on_render() {
    renderList.length = 0;
    // Set Canvas size accordingly
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    resN64Math = window.innerHeight / 240;
    resDJUIScale = djui_gfx_get_scale();
    context.clearRect(0, 0, canvas.width, canvas.height);
    try {
        for (const fn of hookedFunctions) {
            fn();
        }
    } catch (error) {
        djui_hud_set_resolution(RESOLUTION_DJUI);
        djui_hud_set_font(FONT_NORMAL);
        djui_hud_set_rotation(0, 0, 0);
        const fileName = window.location.pathname.split('/').pop();
        const errorMsg = `'${fileName}' has script errors!`;
        djui_hud_set_color(0, 0, 0, 255);
        djui_hud_print_text(errorMsg, djui_hud_get_screen_width()*0.5 - djui_hud_measure_text(errorMsg)*0.5 + 1, 31, 1);
        djui_hud_set_color(255, 0, 0, 255);
        djui_hud_print_text(errorMsg, djui_hud_get_screen_width()*0.5 - djui_hud_measure_text(errorMsg)*0.5, 30, 1);
        throw new Error(error + " Line: " + error.lineNumber + " in " + fileName);
    }
    canvas._djui_link_boxes = [];
    _djui_mouse_buttons_prev = _djui_mouse_buttons_down;
}
setInterval(djui_on_render, 1000 / 30); // Update 30 times a second