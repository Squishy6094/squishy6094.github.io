
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



// Grab External Data
function get_current_time_string() {
    const now = new Date()

    const isOddSecond = now.getSeconds() % 2 === 1
    const separator = isOddSecond ? ' ' : ':' // space on odd seconds, colon on even

    // Get hours and minutes for PST
    const pstOptions = {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }
    const pstParts = new Intl.DateTimeFormat('en-US', pstOptions).formatToParts(now)
    const hour = pstParts.find(p => p.type === 'hour').value
    const minute = pstParts.find(p => p.type === 'minute').value

    const formattedPST = `${hour}${separator}${minute}`

    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${month}/${day} - ${formattedPST} PST`
}

let discordInfo = "Discord"
async function load_discord_data() {
    const guildId = '1137469863741362297'
    const res = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`)
    if (!res.ok) return

    const data = await res.json()

    discordInfo = `${data.name} - ${data.presence_count} Online`
} load_discord_data()

let commitRate = "?"
async function load_github_commit_rate(username, days = 30, token = null) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const url = `https://api.github.com/search/commits?q=author:${username}+committer-date:>=${since}`

    const headers = {
        Accept: "application/vnd.github.cloak-preview" // Required for commit search
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(url, { headers })
    const data = await res.json()

    if (!res.ok || !data.total_count) {
        console.error(data)
        return "Error or no commits found."
    }

    const weeks = days / 7
    commitRate = (data.total_count / weeks).toFixed(2) // average commits per week
} load_github_commit_rate("Squishy6094")

let personalMessageCooldown = 0
async function send_webhook_message(message) {
    // Always try to send, backend will enforce cooldown
    const response = await fetch("https://squishy-site-backend.vercel.app/api/send-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    })

    const data = await response.json()

    if (response.ok && !data.error) {
        console.log("Message sent!")
        djui_hud_text_input_state.success = true
        // Set new cooldown for 15 minutes from now
        personalMessageCooldown = Date.now() + 15 * 60 * 1000
    } else if (data && data.cooldown) {
        // Backend returned cooldown, set it
        personalMessageCooldown = data.cooldown
        djui_hud_text_input_state.success = false
        console.log("Cooldown active, cannot send message until:", new Date(personalMessageCooldown).toLocaleTimeString())
    } else {
        console.error("Failed to send:", data && data.error ? data.error : await response.text())
        djui_hud_text_input_state.success = false
    }
}

// Helper Functions
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

// Simple text input field for djui_hud
let djui_hud_text_input_state = {
    active: false,
    value: "",
    cursor: 0,
    sent: false,
    success: null,
    lastFrameActive: false
}

function djui_hud_render_text_input(textValue, x, y, width, height) {
    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()
    let isInside = (mouseX > x && mouseX < x + width) && (mouseY > y && mouseY < y + height)

    // Draw box
    width = Math.max(width, djui_hud_measure_text(textValue) * 0.3 + 8)
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_rect(x, y, width, height)

    // Draw text
    djui_hud_set_color(0, 0, 0, 255)
    let textY = y + (height/2) - 3
    djui_hud_print_text(textValue, x + 4, textY, 0.3)

    // Handle focus
    if (isInside && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
        djui_hud_text_input_state.active = true
        djui_hud_text_input_state.value = textValue
        djui_hud_text_input_state.cursor = textValue.length
    } else if (!isInside && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
        djui_hud_text_input_state.active = false
    }

    // Handle input
    if (djui_hud_text_input_state.active) {
        // Draw cursor
        let cursorX = x + 4 + djui_hud_measure_text(textValue.substring(0, djui_hud_text_input_state.cursor)) * 0.3
        if ((globalTimer % 60) < 30) {
            djui_hud_set_color(0, 0, 0, 255)
            djui_hud_print_text("|", cursorX, textY, 0.3)
        }

        // Only attach event once per frame
        if (!djui_hud_text_input_state.lastFrameActive) {
            window.addEventListener('keydown', djui_hud_text_input_keydown)
        }
    } else {
        if (djui_hud_text_input_state.lastFrameActive) {
            window.removeEventListener('keydown', djui_hud_text_input_keydown)
        }
    }
    djui_hud_text_input_state.lastFrameActive = djui_hud_text_input_state.active

    // Return the possibly updated value
    return djui_hud_text_input_state.active ? djui_hud_text_input_state.value : textValue
}

function djui_hud_text_input_keydown(e) {
    if (!djui_hud_text_input_state.active) return
    // Prevent input if message was sent (value is empty and not active)

    let val = djui_hud_text_input_state.value
    let cur = djui_hud_text_input_state.cursor
    if (e.key.length == 1 && val.length < 64) {
        val = val.slice(0, cur) + e.key + val.slice(cur)
        cur++
    } else if (e.key == "Backspace" && cur > 0) {
        val = val.slice(0, cur - 1) + val.slice(cur)
        cur--
    } else if (e.key == "Delete" && cur < val.length) {
        val = val.slice(0, cur) + val.slice(cur + 1)
    } else if (e.key == "ArrowLeft" && cur > 0) {
        cur--
    } else if (e.key == "ArrowRight" && cur < val.length) {
        cur++
    } else if (e.key == "Enter") {
        if (personalMessageCooldown - Date.now() > 0) return
        djui_hud_text_input_state.active = false
        send_webhook_message(djui_hud_text_input_state.value)
        djui_hud_text_input_state.sent = true
    } else if (e.key == "Escape") {
        djui_hud_text_input_state.active = false
        djui_hud_text_input_state.sent = false
    }
    djui_hud_text_input_state.value = val
    djui_hud_text_input_state.cursor = cur
    e.preventDefault()
}

let rainbowColor = { r: 255, g: 0, b: 0 }
let rainbowState = 0
function rainbow_color() {
    const speed = 5

    switch (rainbowState) {
        case 0:
            rainbowColor.r += speed
            if (rainbowColor.r >= 255) rainbowState++
            break
        case 1:
            rainbowColor.b -= speed
            if (rainbowColor.b <= 0) rainbowState++
            break
        case 2:
            rainbowColor.g += speed
            if (rainbowColor.g >= 255) rainbowState++
            break
        case 3:
            rainbowColor.r -= speed
            if (rainbowColor.r <= 0) rainbowState++
            break
        case 4:
            rainbowColor.b += speed
            if (rainbowColor.b >= 255) rainbowState++
            break
        case 5:
            rainbowColor.g -= speed
            if (rainbowColor.g <= 0) rainbowState = 0
            break
    }

    rainbowColor.r = clamp(rainbowColor.r, 0, 255)
    rainbowColor.g = clamp(rainbowColor.g, 0, 255)
    rainbowColor.b = clamp(rainbowColor.b, 0, 255)

    return {
        r: rainbowColor.r*0.6,
        g: rainbowColor.g*0.6,
        b: rainbowColor.b*0.6
    }
}

// Website
let globalTimer = 0

let TEXT_WEBSITE_NAME = "Squishy Site"
let TEXT_WIP = "Nastywerkkk in Progress!!"
let TEXT_CLICK_ANYWHERE = "Click Anywhere"

// Music
const musicTracks = [
    { name: "Team Fortress 2 - Upgrade Station",       artist: "Valve Inc.",              audio: 'tf2-upgrade-station' },
    { name: "Portal - Radio Tune",                     artist: "Valve Inc.",              audio: 'portal-radio' },
    { name: "Nintendo 3DS - Internet Settings",        artist: "Nintendo / BedrockSolid", audio: '3ds-internet-settings' },
    { name: "sm64coopdx - Kindness Luigi",             artist: "foxwithguns2 / Gorillaz", audio: 'kindness-luigi' },
    { name: "Sonic Unleashed - Windmill Isle (Night)", artist: "Sonic Team",              audio: 'windmill-isle-night' },
    // Gay People, 10 am!
    { name: "DELTARUNE - Hip Shop",                    artist: "Toby Fox",                audio: 'hip-shop' },
    { name: "UNDERTALE - Him",                         artist: "Toby Fox",                audio: 'him' },
]
const currMusicTrack = musicTracks[Math.floor(Math.random()*musicTracks.length)]

const SOUND_MUSIC = new Object()
Object.defineProperties(SOUND_MUSIC, {
    curPos: {
        value: 0,
        writable: true
    },
    init: {
        value() {
            if (this.inited) return

            this.ctx = new AudioContext()
            this.volumeNode = this.ctx.createGain()
            this.volumeNode.connect(this.ctx.destination)
            this.inited = true
        }
    },
    play: {
        async value() {
            await this.load()
            if (!this.playing) {
                let reversed = this.playbackRate > 0
                this.source = this.ctx.createBufferSource()
                this.source.buffer =
                    reversed
                    ? this.buf
                    : this.revBuf
                this.source.loop = this.loop
                this.source.volume = this.volume
                this.source.playbackRate.value = Math.abs(this.playbackRate)
                this.source.connect(this.volumeNode)
                this.source.start(0, reversed ? this.curPos : (this.buf.duration - this.curPos))
                this.lastPos = this.ctx.currentTime
                this.playing = true
            }
        }
    },
    pause: {
        value() {
            if (this.playing) {
                this.source.stop()
                delete this.source
                this.playing = false
            }
        }
    },
    loop: {
        get() {
            return this._loop || false
        },
        set(loop) {
            if (this.playing) this.source.loop = loop
            this._loop = loop
        }
    },
    volume: {
        get() {
            return this._volume || 1
        },
        set(volume) {
            this.volumeNode.gain.value = volume
            this._volume = volume
        }
    },
    playbackRate: {
        get() {
            return this._playbackRate || 1
        },
        set(playbackRate) {
            let oldRate = this._playbackRate || 1
            this._playbackRate = playbackRate
            if (this.playing) {
                this.curPos += (this.ctx.currentTime - this.lastPos) * oldRate
                this.curPos %= this.buf.duration
                if (this.curPos < 0) this.curPos += this.buf.duration
                this.lastPos = this.ctx.currentTime

                if (playbackRate < 0 != oldRate < 0) {
                    this.pause()
                    this.play()
                } else {
                    this.source.playbackRate.value = Math.abs(playbackRate)
                }
            }
        }
    },
    load: {
        async value(url) {
            if (this.loaded) return this.loaded
            this.loaded = fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this.ctx.decodeAudioData(buffer))
            .then(buf => {
                this.buf = buf
                this.revBuf = this.ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate)
                for (let i = 0; i < buf.numberOfChannels; i++) {
                    buf.copyFromChannel(this.revBuf.getChannelData(i), i)
                    this.revBuf.getChannelData(i).reverse()
                }
            })
        }
    }
})

SOUND_MUSIC.init()
SOUND_MUSIC.load(`sound/music-${currMusicTrack.audio}.ogg`)
SOUND_MUSIC.loop = true
SOUND_MUSIC.volume = 0.2

console.log(`Music Track: ${currMusicTrack.name} | ${currMusicTrack.artist}`)

// Sounds
const SOUND_CHECKPOINT = new Audio('sound/checkpoint.ogg'); SOUND_CHECKPOINT.volume = 0.5
const SOUND_WOODBLOCK_OPEN = new Audio('sound/woodblock-open.ogg')
const SOUND_WOODBLOCK_CLOSE = new Audio('sound/woodblock-close.ogg')
const SOUND_WOODBLOCK_SWITCH = new Audio('sound/woodblock-switch.ogg')

const shatterSounds = [
    'smw',
    'glass',
    'lego',
]
const SOUND_SHATTER = new Audio(`sound/shatter-${shatterSounds[Math.floor(Math.random()*shatterSounds.length)]}.ogg`)

const TEX_LOGO = get_texture_info("textures/wip-logo.png")
const TEX_MUSIC_RECORD = get_texture_info("textures/record.png")
const TEX_SQUISHY_PFP = get_texture_info("https://avatars.githubusercontent.com/u/74333752")
const logoScale = 1.5

let konamiKeys = []

function konami_keys_check_pass(string) {
    let stringArray = Array.from(string)
    for (let i = 0; i < stringArray.length; i++) {
        if (stringArray[i] != konamiKeys[konamiKeys.length - stringArray.length + i]) {
            return false
        }
    }
    return true
}

const socialScaleMin = 0.3*4
const socialScaleMax = 0.35*4
const socialLinks = [
    { image: "github",     name: "Github",  color: { r: 100, g: 100, b: 100 }, link: "https://github.com/Squishy6094"                 },
    { image: "discord",    name: "Discord", color: { r:  88, g: 101, b: 242 }, link: "https://discord.gg/yN3ahrf5zD"                  },
    { image: "bsky",       name: "Bluesky", color: { r:  79, g: 155, b: 217 }, link: "https://bsky.app/profile/squishy6094.github.io" },
    { image: "twitter",    name: "Twitter", color: { r:  30, g:  30, b:  30 }, link: "https://x.com/squishy6094"                      },
    { image: "youtube",    name: "Youtube", color: { r: 200, g:   0, b:   0 }, link: "https://www.youtube.com/@Squishy6094"           },
    { image: "romhacking", name: "Romhacking.com", color: rainbow_color,       link: "https://romhacking.com/user/SQUISHY"            },
]
i=0;for (let link of socialLinks) {
    link.i = i++
    link.image = get_texture_info(`textures/social-${link.image}.png`)
    link.y = 300
    link.scale = socialScaleMin
} delete i

// Info Tabs Info??

const currAge = new Date().getFullYear() - 2007 - (
    new Date() < new Date(new Date().getFullYear(), 3, 3) ? 1 : 0
)
let personalMessage = ""
function info_tab_render_about_me(x, y, width, height) {
    // Profile Picture
    djui_hud_set_color(bgColor.r, bgColor.g, bgColor.b, 255)
    djui_hud_render_rect(x + 5, y + 3, 75, 75)
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_texture(TEX_SQUISHY_PFP, x + 7, y + 5, 71/TEX_SQUISHY_PFP.width, 71/TEX_SQUISHY_PFP.height)

    // Description
    let textX = x + 85, textY = y + 5
    djui_hud_print_text("Haii, I'm Squishy!", textX, textY, 0.5)
    textY +=  5;
    textY += 10; djui_hud_print_text("I'm also known as Madeline, I'm a programmer who mainly",      textX, textY, 0.3)
    textY += 10; djui_hud_print_text("works on SM64CoopDX Mods and Frontend Web Development!",       textX, textY, 0.3)
    textY += 10; djui_hud_print_text("I'm generally just a silly gal looking for stuff to program,", textX, textY, 0.3)
    textY += 10; djui_hud_print_text("and I'm always up to learn new Scripting Languages.",          textX, textY, 0.3)
    textY +=  5;
    textY += 10; djui_hud_print_text("My currently known Scripting Languages are:", textX, textY, 0.3)
    textY += 10; djui_hud_print_text("  - Lua",                   textX, textY, 0.3)
    textY += 10; djui_hud_print_text("  - Python",                textX, textY, 0.3)
    textY += 10; djui_hud_print_text("  - JavaScript, CSS, HTML", textX, textY, 0.3)

    // Basic Info
    textX = x + 6, textY = y + 80
                djui_hud_print_text("She/Her - Transgender Female",  textX, textY, 0.25)
    textY += 8; djui_hud_print_text(`Age: ${currAge}`,               textX, textY, 0.25)
    textY += 8; djui_hud_print_text(`Commit Rate: ${commitRate}/wk`, textX, textY, 0.25)

    let messageStatus = `${personalMessage.length}/64`
    if (djui_hud_text_input_state.sent) {
        messageStatus = "Sending..."
        if (djui_hud_text_input_state.success) {
            messageStatus = "Sent!"
        } else if (djui_hud_text_input_state.success === false) {
            if (personalMessageCooldown > Date.now()) {
                let msLeft = personalMessageCooldown - Date.now()
                let min = Math.floor(msLeft / 60000)
                let sec = Math.floor((msLeft % 60000) / 1000)
                let secStr = sec < 10 ? "0" + sec : sec
                messageStatus = `Cooldown ${min}:${secStr}`
                if (msLeft < 1000) {
                    djui_hud_text_input_state.sent = false
                }
            } else {
                messageStatus = "Failed to Send"
            }
        }
    }

    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_print_text(`Send me a Message!! - ${messageStatus}`, x + 10, y + 140, 0.3)
    personalMessage = djui_hud_render_text_input(personalMessage, x + 10, y + 148, 100, 15)
    djui_hud_set_color(255, 255, 255, 150)
    djui_hud_print_text("(Messages are publicly viewable but anonymous)", x + 10, y + 165, 0.2)
}


// Art Gallery Data Table
let artGalleryTable = []
let artGalleryLoaded = false
let artGalleryLoading = false
let artGalleryRawData = null

async function get_art_gallery_json() {
    // Already loaded and grouped
    if (artGalleryLoaded) return true

    // If loading is in progress, return false until done
    if (artGalleryLoading) return false

    artGalleryLoading = true

    try {
        // Fetch JSON only once
        if (!artGalleryRawData) {
            const response = await fetch('https://raw.githubusercontent.com/Squishy6094/squishy-site-art-gallery/refs/heads/main/art-list.json')
            artGalleryRawData = await response.json()
        }

        // Group by artist
        let grouped = {}
        for (const item of artGalleryRawData) {
            if (!grouped[item.artist]) grouped[item.artist] = []
            grouped[item.artist].push({
            ...item,
            url: `https://raw.githubusercontent.com/Squishy6094/squishy-site-art-gallery/refs/heads/main/${encodeURIComponent(item.artist)}/${encodeURIComponent(item.img)}`,
            texture: null // will be loaded one at a time
            })
        }

        // Sort artists by number of arts, greatest to least
        const sortedArtists = Object.entries(grouped)
            .sort((a, b) => b[1].length - a[1].length)
        const groupedSorted = Object.fromEntries(sortedArtists)
        grouped = groupedSorted

        // Convert to array
        artGalleryTable = Object.entries(grouped).map(([artist, items]) => ({
            artist,
            items
        }))

        // Start loading images one at a time, per artist, per item
        async function loadNextImage() {
            for (const artist of artGalleryTable) {
                for (const item of artist.items) {
                    if (!item.texture) {
                        item.texture = get_texture_info(item.url)
                        // Wait for the image to load if get_texture_info is async, otherwise remove this await
                        if (item.texture && item.texture.then) {
                            await item.texture
                        }
                        // Load one image per event loop tick
                        setTimeout(loadNextImage, 0)
                        return
                    }
                }
            }
            // All images loaded
            artGalleryLoaded = true
        }
        loadNextImage()
    } catch (error) {
        console.error('Error loading JSON:', error)
        artGalleryLoading = false
        return false
    }

    return false
}
const imageWidth = 60
let galleryScroll = 0
let focusImage = false
let focusImageFile = null
let focusImageX = 1000
let galleryHeight = 0
function info_tab_render_art_gallery(x, y, width, height) {
    let imagesPerRow = Math.floor((djui_hud_get_screen_width() - 60) / (imageWidth + 5))
    // Only render if data is loaded
    if (!get_art_gallery_json()) {
        djui_hud_print_text("Loading art gallery...", x + height*0.5, y + height*0.5 - 5, 0.4)
        return
    }

    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()
    let mousePressed = djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON

    let artistY = y - galleryScroll;
    for (let artist of artGalleryTable) {
        a = artGalleryTable.indexOf(artist)
        if (a != 0) {
            djui_hud_render_rect(x + 10, artistY, width - 20, 1)
        }
        djui_hud_print_text(artist.artist, x + 10, artistY + 5, 0.4)

        let imgHeights = []
        for (let i = 0; i < imagesPerRow; i++) {
            imgHeights[i] = 0
        }
        for (let item of artist.items) {
            if (!item.texture || !item.texture.width || !item.texture.height) continue; // Skip if texture not loaded yet
            // Find the column with the smallest height
            let i = 0;
            let minHeight = imgHeights[0];
            for (let j = 1; j < imagesPerRow; j++) {
                if (imgHeights[j] < minHeight) {
                    minHeight = imgHeights[j];
                    i = j;
                }
            }
            let itemX = x + 10 + (i * (imageWidth + 5));
            let itemY = artistY + 20 + imgHeights[i%imagesPerRow]
            let scale = imageWidth/item.texture.width
            let imgW = imageWidth
            let imgH = item.texture.height * scale

            // Check for click
            if (
                !focusImage && focusImageX > width &&
                mouseX > itemX && mouseX < itemX + imgW &&
                mouseY > itemY && mouseY < itemY + imgH &&
                mousePressed
            ) {
                focusImageFile = item
                focusImage = true
            }

            djui_hud_render_texture(item.texture, itemX, itemY, scale, scale)
            //djui_hud_print_text(item.name, itemX, itemY + 70, 0.3)
            imgHeights[i%imagesPerRow] += imgH + 5; // Move down for next artist
        }
        let artistYAdd = 0 
        for (let i = 0; i < imagesPerRow; i++) {
            artistYAdd = Math.max(artistYAdd, imgHeights[i])
        }
        artistY = artistY + artistYAdd + 30
    }
    
    // Focused image overlay
    if (focusImage) {
        focusImageX = lerp(focusImageX, 0, 0.15)
    } else {
        focusImageX = lerp(focusImageX, width*2, 0.05)
    }
    if (focusImageX < width && focusImageFile && focusImageFile.texture) {
        djui_hud_set_color(255, 255, 255, Math.max((width*0.5)-focusImageX, 0)/(width*0.5)*150)
        djui_hud_render_rect(x, y, width, height)
        djui_hud_set_color(255, 255, 255, 255)
        let scale = Math.min(
            width / focusImageFile.texture.width,
            height / focusImageFile.texture.height,
            2
        )*0.8
        let imgW = focusImageFile.texture.width * scale
        let imgH = focusImageFile.texture.height * scale
        let imgX = x + width/2 - imgW/2 + focusImageX
        let imgY = y + height/2 - imgH/2
        djui_hud_render_texture(focusImageFile.texture, imgX, imgY, scale, scale)
        djui_hud_set_color(0, 0, 0, 255)
        djui_hud_print_text(focusImageFile.artist, imgX + imgW*0.5 - djui_hud_measure_text(focusImageFile.artist)*0.25, imgY - 15, 0.5)
        // Click anywhere to close
        if (mousePressed) {
            focusImage = false
        }
    }
    
    // Calculate the total height of the gallery for scrolling
    galleryHeight = artistY + galleryScroll - height - y
}

window.addEventListener('wheel', function(e) {
    if (currInfoTab && currInfoTab.func === info_tab_render_art_gallery) {
        galleryScroll += e.deltaY * 0.1;
        galleryScroll = clamp(galleryScroll, 0, galleryHeight)
    }
});

let optionMusicVolume = localStorage.getItem("musicVolume") || 0.25
let optionMusicSpeed = localStorage.getItem("musicSpeed") || 0.5
function info_tab_render_options(x, y, width, height) {
    djui_hud_print_text("Music Volume: ", x + 10, y + 10, 0.4)
    optionMusicVolume = djui_hud_render_slider(optionMusicVolume, x + 70, y + 9, 100, 10)
    djui_hud_print_text(`${Math.round(optionMusicVolume*100)}%`, x + 180, y + 10, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("musicVolume", optionMusicVolume)
    }

    djui_hud_print_text("Music Speed: ", x + 10, y + 25, 0.4)
    optionMusicSpeed = djui_hud_render_slider(optionMusicSpeed, x + 70, y + 24, 100, 10)
    djui_hud_print_text(`${Math.round((0.8 + optionMusicSpeed*0.4)*100)/100}x`, x + 180, y + 25, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("musicSpeed", optionMusicSpeed)
    }
}

let currInfoTab, prevInfoTab
let infoTabPosX = 0
const infoTabs = [
    { image: "squishy-about-me.png", name: "About Me", func: info_tab_render_about_me },
    { image: null,                   name: "Art Gallery",  func: info_tab_render_art_gallery  },
    { image: null,                   name: "Options",  func: info_tab_render_options  },
]
for (let tab of infoTabs) {
    let i = infoTabs.indexOf(tab)
    if (tab.image)
        tab.image = get_texture_info(`textures/${tab.image}`)
    tab.x = -80 - 5*(i + 1)
}

djui_hud_set_resolution(RESOLUTION_N64)

let bgColorDefault = { r: 0, g: 88, b: 0 }
let bgColorRaw = bgColorDefault
let bgColor = bgColorRaw
let bgCheckerSize = 16
let titleClick = false
let keyTitleClick = false
let titleOffset = djui_hud_get_screen_width()*0.25
let titleScaleSpin = 2
let logoFallPosY = djui_hud_get_screen_height()
let logoFallVelY = 0
let logoFlash = 0

let recordSpeed = 0x10 // fullrev   fps  s/m  rpm
const recordSpeedTarget = 0x10000 / 30 / 60 * 33
const recordSpeedUp = 10
const recordSlowDown = 10
const recordBrake = 40
const recordBreakThreshold = 3500
let recordRot = 0
let recordDragStart = 0
let recordHeld = false

let recordBreakTimer = 0
let recordBreakSpin = 0
let recordBroken = false
let recordPos = { x: 0, y: 0 }
let recordVel = { x: 0, y: 0 }
let musicTitlePos = { x: 0, y: 0 }
let musicTitleVel = { x: 0, y: 0 }
let musicArtistPos = { x: 0, y: 0 }
let musicArtistVel = { x: 0, y: 0 }

function hud_render() {
    djui_hud_set_resolution(RESOLUTION_N64)
    let screenWidth = djui_hud_get_screen_width()
    let screenHeight = djui_hud_get_screen_height()

    // Set User Settings
    SOUND_MUSIC.volume = 0.2*optionMusicVolume

    // Background Color
    let prevColor = (typeof bgColorRaw  == 'function' ? bgColorRaw() : bgColorRaw)
    bgColor.r = lerp(bgColor.r, prevColor.r, 0.1)
    bgColor.g = lerp(bgColor.g, prevColor.g, 0.1)
    bgColor.b = lerp(bgColor.b, prevColor.b, 0.1)
    djui_hud_set_color(bgColor.r, bgColor.g, bgColor.b, 255)
    djui_hud_render_rect(0, 0, screenWidth, screenHeight)
    djui_hud_set_color(bgColor.r*0.5, bgColor.g*0.5, bgColor.b*0.5, 255)
    let checkerWidth = Math.ceil(screenWidth / bgCheckerSize)
    let checkerHeight = Math.ceil(screenHeight / bgCheckerSize)
    for (let w = 0; w < checkerWidth; w++) {
        for (let h = 0; h < checkerHeight; h++) {
            if ((w+h) % 2) {
                djui_hud_render_rect(w * bgCheckerSize, h * bgCheckerSize, bgCheckerSize, bgCheckerSize)
            }
        }
    }
    
    djui_hud_set_color(0, 0, 0, logoFlash)
    djui_hud_render_rect(0, 0, screenWidth, screenHeight)

    // Title Screen
    logoFallVelY -= 0.3
    logoFallPosY += logoFallVelY
    if (logoFallPosY < 0) {
        logoFallVelY = -logoFallVelY*0.5
        logoFallPosY = 0
    }
    let logoTilt = Math.sin(globalTimer*0.1)/Math.PI*0x800
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_set_rotation(logoTilt, 0.5, 0.5)
    let spinMath = (Math.sin((titleScaleSpin + 0.5)*Math.PI))
    djui_hud_render_texture(TEX_LOGO, screenWidth*0.25 + titleOffset - TEX_LOGO.width*logoScale*0.5 * spinMath, screenHeight*0.5 - TEX_LOGO.height*logoScale*0.5 - (Math.sin((titleOffset/(screenWidth*0.25))*Math.PI)*30) - logoFallPosY, logoScale * spinMath, logoScale)
    djui_hud_set_rotation(0, 0, 0)
    if ((djui_hud_get_mouse_buttons_pressed() || keyTitleClick) && !titleClick) {
        // Initialize like EVERYTHING
        titleClick = true
        SOUND_CHECKPOINT.play()
        SOUND_MUSIC.play()
        logoFlash = 150

        if (konami_keys_check_pass("7"))
            TEXT_WIP = "KILLER7"

        if (konami_keys_check_pass("iloveyou"))
            window.open("https://raw.githubusercontent.com/Squishy6094/squishy6094.github.io/refs/heads/main/textures/squishy-iloveyoutoo.png", "_blank", "width=200, height=200")

        if (konami_keys_check_pass("shell"))
            bgColorRaw = {r:107, g:94, b:255}

        if (konami_keys_check_pass("kys"))
            recordSpeed = recordBreakThreshold*2
    }

    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()

    djui_hud_set_color(0, 0, 0, 100)
    djui_hud_render_rect(screenWidth*0.25 - socialLinks.length*0.5*16*socialScaleMax+2 - 5, screenHeight - 35 + socialLinks[1].y, socialLinks.length*16*socialScaleMax+2 + 5, 28)
    if (titleClick) {
        // Bottom Socials
        for (let link of socialLinks) {
            // Ensure images, no matter res, become the right size
            link.scaleAdjust = 16/link.image.width

            // Update Discord Name
            if (link.name == "Discord" && discordInfo != "Discord") {
                link.name = discordInfo
            }

            link.y *= 0.85 + (link.i*0.09/socialLinks.length)
            let imgWidth = link.image.width * link.scaleAdjust
            let imgHeight = link.image.height * link.scaleAdjust
            let imgScale = link.scale * link.scaleAdjust
            let x = (link.i - socialLinks.length*0.5)*imgWidth*socialScaleMax+2 + screenWidth*0.25
            let y = screenHeight - 30 + link.y
            djui_hud_set_color(255, 255, 255, 255)
            
            let imgScaleOffset = -imgWidth*socialScaleMin*0.5 + (imgWidth*socialScaleMin*(link.scale/socialScaleMin))*0.5
            djui_hud_render_texture(link.image, x - imgScaleOffset, y - imgScaleOffset, imgScale, imgScale)

            let textOpacity = 0
            if (!currInfoTab && (mouseX > x && mouseX < x + imgWidth*link.scale) && (mouseY > y && mouseY < y + imgWidth*link.scale)) {
                if (djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
                    window.open(link.link)
                }
                link.scale = Math.min(link.scale*1.05, socialScaleMax)
                bgColorRaw = link.color
            } else {
                link.scale = Math.max(link.scale*0.95, socialScaleMin)
            }
            djui_hud_set_color(255, 255, 255, (link.scale-socialScaleMin)/(socialScaleMax-socialScaleMin)*255)
            djui_hud_print_text(link.name, (x + imgWidth*socialScaleMin*0.5) - djui_hud_measure_text(link.name)*0.15, y - 10, 0.3)
        }

        titleOffset *= 0.9
        titleScaleSpin *= 0.9
        logoFlash *= 0.9
        
        // Info Tabs
        let tabY = 15
        for (let tab of infoTabs) {
            let x = screenWidth - 50 - infoTabPosX - tab.x
            let y = tabY
            let tabHeight = tab.image ? 60 : 15

            djui_hud_set_color(0, 0, 0, 150)
            djui_hud_render_rect(x, y, 50 + tab.x, tabHeight)
            djui_hud_set_color(255, 255, 255, 255)
            if (tab.image) {
                djui_hud_render_texture(tab.image, x + 2, y + 2, 46/tab.image.width, 46/tab.image.width)
            }
            djui_hud_print_text(tab.name, x + 25 - djui_hud_measure_text(tab.name)*0.15, y + tabHeight - 10, 0.3)
            tabY = tabY + tabHeight + 5
            
            if ((mouseX > x && mouseX < x + 50 + tab.x) && (mouseY > y && mouseY < y + tabHeight)) {
                if (djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
                    if (currInfoTab != tab) {
                        if (!currInfoTab) {
                            SOUND_WOODBLOCK_OPEN.play()
                        } else {
                            SOUND_WOODBLOCK_SWITCH.currentTime = 0
                            SOUND_WOODBLOCK_SWITCH.play()
                        }
                        currInfoTab = tab
                    } else {
                        currInfoTab = null
                        SOUND_WOODBLOCK_CLOSE.play()
                    }
                }
                tab.x = lerp(tab.x, 6, 0.1)
            } else {
                tab.x = lerp(tab.x, (currInfoTab == tab) ? 3 : 0, 0.1)
            }
        }

        if (infoTabPosX > 0.01) {
            djui_hud_set_color(0, 0, 0, 150)
            djui_hud_render_rect(screenWidth - infoTabPosX, 0, screenWidth, screenHeight)
            djui_hud_set_color(255, 255, 255, 255)
            prevInfoTab.func(screenWidth - infoTabPosX, 20, Math.max(infoTabPosX, 0), Math.max(screenHeight - 20, 0))
            djui_hud_set_color(0, 0, 0, 255)
            djui_hud_render_rect(screenWidth - infoTabPosX, 0, screenWidth, 20)
            djui_hud_render_rect(screenWidth - infoTabPosX, 0, 3, screenHeight)
            djui_hud_set_color(255, 255, 255, 255)
            djui_hud_print_text(prevInfoTab.name, screenWidth - infoTabPosX + 6, 4, 0.6)
        }

        if (currInfoTab) {
            infoTabPosX = lerp(infoTabPosX, screenWidth - 60, 0.15)
            prevInfoTab = currInfoTab
        } else {
            infoTabPosX = lerp(infoTabPosX, 0, 0.15)
        }

        // Music Record
        let recordRadius = TEX_MUSIC_RECORD.width * 0.25
        if (!recordBroken) {
            let userSpeedTarget = SOUND_MUSIC.playing ? (recordSpeedTarget * (0.8 + optionMusicSpeed*0.4)) : 0
            let distFromRecord = Math.hypot((screenWidth - 15) - mouseX, (screenHeight - 15 + titleOffset) - mouseY)
            let angleToRecord = Math.atan2((screenHeight - 15 + titleOffset) - mouseY, (screenWidth - 15) - mouseX) * 0x8000 / Math.PI + 0x8000
            
            if (distFromRecord < recordRadius && djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) {
                recordHeld = true
                recordDragStart = angleToRecord
            } else if (distFromRecord > recordRadius || djui_hud_get_mouse_buttons_released() & L_MOUSE_BUTTON) {
                recordHeld = false
            }
            if (Math.abs(recordDragStart - angleToRecord) > 0x4000) {
                recordDragStart = angleToRecord
            }
            if (recordHeld) {
                recordSpeed *= 0.5
                recordSpeed += (recordDragStart - angleToRecord) / 2
                recordDragStart = angleToRecord
            } else {
                if (recordSpeed > userSpeedTarget)
                    recordSpeed -= recordSlowDown
                else if (recordSpeed < 0)
                    recordSpeed += recordBrake
                else recordSpeed = Math.min(userSpeedTarget, recordSpeed + recordSpeedUp)
            }
            recordRot += recordSpeed

            if (Math.abs(recordSpeed) > recordBreakThreshold) recordBreakTimer++
            else recordBreakTimer = 0

            SOUND_MUSIC.playbackRate = recordSpeed / recordSpeedTarget

            if (recordBreakTimer > 99) {
                recordBroken = true
                SOUND_MUSIC.pause()
                SOUND_SHATTER.play()
                recordVel.x = random(-5, 1)
                recordVel.y = random(-7, -1)
                musicTitleVel.x = random(-5, 1)
                musicTitleVel.y = random(-7, -1)
                musicArtistVel.x = random(-5, 2)
                musicArtistVel.y = random(-7, -1)
            }
        } else {
            recordPos.x += recordVel.x
            recordPos.y += recordVel.y
            musicTitlePos.x += musicTitleVel.x
            musicTitlePos.y += musicTitleVel.y
            musicArtistPos.x += musicArtistVel.x
            musicArtistPos.y += musicArtistVel.y

            recordVel.y += 0.3
            musicTitleVel.y += 0.3
            musicArtistVel.y += 0.3
            
            recordRot += recordSpeed
            recordBreakSpin += recordSpeed * 0.03
        }

        djui_hud_set_color(255, 255, 255, 255)
        djui_hud_print_text(currMusicTrack.artist, screenWidth - (djui_hud_measure_text(currMusicTrack.artist)*0.3 + 50) * (1 - (titleOffset / (screenWidth * 0.25))) + musicArtistPos.x, screenHeight - 20 + musicArtistPos.y, 0.3)
        djui_hud_print_text(currMusicTrack.name, screenWidth - (djui_hud_measure_text(currMusicTrack.name)*0.3 + 50) * (1 - (titleOffset / (screenWidth * 0.25))) + musicTitlePos.x, screenHeight - 10 + musicTitlePos.y, 0.3)
        djui_hud_set_rotation(recordRot, 0.5, 0.5)
        djui_hud_render_texture(TEX_MUSIC_RECORD, screenWidth - recordRadius * Math.cos(recordBreakSpin) - 15 + recordPos.x + titleOffset, screenHeight - recordRadius - 15 + recordPos.y + titleOffset, 0.5 * Math.cos(recordBreakSpin), 0.5)
        djui_hud_set_rotation(0, 0, 0)
    } else {
        titleOffset = screenWidth*0.25
        if (globalTimer > 150) {
            djui_hud_set_color(255, 255, 255, Math.abs(Math.sin((globalTimer - 150)*0.05)/Math.PI)*255)
            djui_hud_print_text(TEXT_CLICK_ANYWHERE, screenWidth*0.5 - djui_hud_measure_text(TEXT_CLICK_ANYWHERE)*0.25, screenHeight - 30, 0.5)
            djui_hud_set_color(255, 255, 255, 255)
            djui_hud_print_text(konamiKeys.toString().replace(/,/g, ''), screenWidth*0.5 - djui_hud_measure_text(konamiKeys.join(""))*0.25, 30, 0.5)
        }
    }

    // if ('getBattery' in navigator) {
    //     navigator.getBattery().then(function(battery) {
    //         console.log(`Battery level: ${battery.level * 100}%`)
    //         console.log(`Is charging: ${battery.charging}`)
    //     })
    // } else {
    //     console.log('Battery Status API not supported')
    // }

    // Show Time in Corner
    djui_hud_set_color(255, 255, 255, 255)
    const timeString = get_current_time_string()
    djui_hud_print_text(timeString, screenWidth - 3 - djui_hud_measure_text(timeString)*0.4, 3, 0.4)

    // Work In Progress Text
    // let headerScrollX = -Math.tan(globalTimer*0.02 - 1.1)*screenWidth/3 + screenWidth*0.5
    // djui_hud_set_color(0, 0, 0, 100)
    // djui_hud_render_rect(0, 10, screenWidth, 16)
    // djui_hud_set_color(255, 255, 255, 255)
    // djui_hud_print_text(TEXT_WIP, 20 + headerScrollX, 13, 0.5)

    // Global Site Timer
    globalTimer = globalTimer + 1
}

// Secrets
window.addEventListener('keypress', (e) => {
    if (e.key == "Enter") {
        keyTitleClick = true
        return
    }
    konamiKeys.push(e.key)
})

hook_event(hud_render)