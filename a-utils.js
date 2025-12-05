// Utilities
function lerp(a, b, alpha) {
    return a + alpha * ( b - a )
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

function remap(a, b, c, d, x) {
    return c + (d - c) * ((x - a) / (b - a))
}

function random(a, b) {
    return remap(0, 1, a, b, Math.random())
}

function is_client_firefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;  
}

function is_client_mobile() { // Assume client is mobile from SAFE_N64 being active
    return djui_hud_get_screen_height() > 240
}

// Custom Render Functions
function djui_hud_render_slider(sliderPos, x, y, width, height) {
    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()

    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_rect(x, y, width, 1)
    djui_hud_render_rect(x, y + height - 1, width, 1)
    djui_hud_render_rect(x, y, 1, height)
    djui_hud_render_rect(x + width - 1, y, 1, height)

    djui_hud_render_rect(x + 2, y + 2, (width - 4)*sliderPos, height - 4)
    
    if ((mouseX > x && mouseX < x + width) && (mouseY > y && mouseY < y + height)) {
        if (djui_hud_get_mouse_buttons_down() & L_MOUSE_BUTTON) {
            sliderPos = (mouseX - (x + 2))/(width - 4)
            sliderPos = clamp(sliderPos, 0, 1)
        }
    }
    return sliderPos
}

// Textbox Handler/Renderer
let textInputStates = {}
function djui_hud_get_text_input_state(textboxID) {
    if (textInputStates[textboxID] == null) {
        textInputStates[textboxID] = {
            active: false,
            value: "",
            cursor: 0,
            restrict: false,
            function: null,
        }
    }
    return textInputStates[textboxID]
}

function djui_hud_render_text_input(textboxID, x, y, width, height) {
    let t = djui_hud_get_text_input_state(textboxID)
    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()
    let isInside = (mouseX > x && mouseX < x + width) && (mouseY > y && mouseY < y + height)

    // Draw box
    width = Math.max(width, djui_hud_measure_text(t.value) * 0.3 + 8)
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_rect(x, y, width, height)

    // Draw text
    djui_hud_set_color(0, 0, 0, 255)
    let textY = y + (height/2) - 5
    djui_hud_print_text(t.value, x + 4, textY, 0.3)

    // Handle focus
    if (isInside && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
        t.active = true
        // Temp way for mobile users to send messages
        if (is_client_mobile()) {
            let mobileInput = prompt("Input", t.value)
            if (mobileInput != null)
                t.value = mobileInput
        } 
        t.value = t.value.slice(0, 64)
        t.cursor = t.value.length
    } else if (!isInside && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
        t.active = false
    }

    // Handle input
    if (t.active) {
        // Draw cursor
        let cursorX = x + 4 + djui_hud_measure_text(t.value.substring(0, t.cursor)) * 0.3
        if ((get_global_timer() % 60) < 30) {
            djui_hud_set_color(0, 0, 0, 255)
            djui_hud_print_text("|", cursorX, textY, 0.3)
        }
    }

    // Return the possibly updated value
    return t.active ? t.value : t.value
}

// listener for textboxes
function djui_hud_text_input_keydown(textboxID, e) {
    let t = djui_hud_get_text_input_state(textboxID);
    if (!t.active || t.restrict) return;

    let val = t.value;
    let cur = t.cursor;

    // Typing
    if (e.key.length === 1 && val.length < 64) {
        val = val.slice(0, cur) + e.key + val.slice(cur);
        cur++;

    } else if (e.key === "Backspace" && cur > 0) {
        val = val.slice(0, cur - 1) + val.slice(cur);
        cur--;

    } else if (e.key === "Delete" && cur < val.length) {
        val = val.slice(0, cur) + val.slice(cur + 1);

    } else if (e.key === "ArrowLeft" && cur > 0) {
        cur--;

    } else if (e.key === "ArrowRight" && cur < val.length) {
        cur++;

    } else if (e.key === "Enter") {
        if (t.function != null)
            t.function(t.value);
        t.active = false;
    } else if (e.key === "Escape") {
        t.active = false;
    }

    t.value = val;
    t.cursor = cur;

    e.preventDefault();
}

window.addEventListener("keydown", e => {
    // Find the active textbox, if any
    let activeID = null;
    for (const id in textInputStates) {
        if (textInputStates[id]?.active) {
            activeID = id;
            break;
        }
    }
    if (!activeID) return;

    djui_hud_text_input_keydown(activeID, e);
});

function djui_hud_render_button(textValue, x, y, width, height) {
    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()
    let isInside = (mouseX > x && mouseX < x + width) && (mouseY > y && mouseY < y + height)
    let wasPressed = false

    // Draw box
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_rect(x, y, width, 1)
    djui_hud_render_rect(x, y + height - 1, width, 1)
    djui_hud_render_rect(x, y, 1, height)
    djui_hud_render_rect(x + width - 1, y, 1, height)

    // Draw text
    djui_hud_set_color(255, 255, 255, 255)
    let textX = x + (width/2) - djui_hud_measure_text(textValue)*0.5*0.3
    let textY = y + (height/2) - 5
    djui_hud_print_text(textValue, textX, textY, 0.3)

    // Handle Press
    if (isInside && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
        wasPressed = true
    }
    return wasPressed
}