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

let commitRate = null
let commitRatePromise = null
async function load_github_commit_rate(username, days = 30, token = null) {
    if (commitRate != null) {
        return commitRate
    }
    if (commitRatePromise) {
        return commitRatePromise
    }
    commitRatePromise = (async () => {
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
            commitRate = "?"
            return "Error or no commits found."
        }

        const weeks = days / 7
        commitRate = (data.total_count / weeks).toFixed(2) // average commits per week
        return commitRate
    })()
    return commitRatePromise
}

let personalMessageCooldown = 0
let personalMessageBanned = false
async function send_webhook_message(message) {
    if (message.toLowerCase() === "gaster")
        location.reload()

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
        squishyAssistantState = 1
        squishyAssistantFrame = 0
    } else if (data && data.banned) {
        // Backend returned banned, fuck you
        personalMessageBanned = true
        djui_hud_text_input_state.success = false
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
    { name: "Team Fortress 2 - Upgrade Station",             artist: "Valve Inc.",              audio: 'tf2-upgrade-station' },
    { name: "Portal - Radio Tune",                           artist: "Valve Inc.",              audio: 'portal-radio' },
    { name: "Nintendo 3DS - Internet Settings",              artist: "Nintendo / BedrockSolid", audio: '3ds-internet-settings' },
    { name: "sm64coopdx - Kindness Luigi",                   artist: "foxwithguns2 / Gorillaz", audio: 'kindness-luigi' },
    { name: "Sonic Unleashed - Windmill Isle (Night)",       artist: "Sonic Team",              audio: 'windmill-isle-night' },
    { name: "Kirby's Dream Land 3 - Game Over (JP Version)", artist: "Nintendo / SiIvaGunner",  audio: 'kirby-game-over' },
    // Gay People, 10 am!
    { name: "DELTARUNE - Hip Shop",                    artist: "Toby Fox",                audio: 'hip-shop' },
    { name: "UNDERTALE - Him",                         artist: "Toby Fox",                audio: 'him' },
]
const currMusicTrack = musicTracks[Math.floor(Math.random()*musicTracks.length)]

const SOUND_MUSIC = new Object()
Object.defineProperties(SOUND_MUSIC, {
    init: {
        value() {
            if (this.inited) return

            this.ctx = new AudioContext()
            this.volumeNode = this.ctx.createGain()
            this.volumeNode.connect(this.ctx.destination)
            this._loop = false
            this._volume = 1
            this._playbackRate = 1
            this.curPos = 0
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
            return this._loop
        },
        set(loop) {
            if (this.playing) this.source.loop = loop
            this._loop = loop
        }
    },
    volume: {
        get() {
            return this._volume
        },
        set(volume) {
            this.volumeNode.gain.value = volume
            this._volume = volume
        }
    },
    playbackRate: {
        get() {
            return this._playbackRate
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
                    this.source.playbackRate.linearRampToValueAtTime(Math.abs(playbackRate), this.ctx.currentTime + (1/30))
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
SOUND_MUSIC.load(`sound/music/${currMusicTrack.audio}.ogg`)
SOUND_MUSIC.loop = true
SOUND_MUSIC.volume = 0.2

console.log(`Music Track: ${currMusicTrack.name} | ${currMusicTrack.artist}`)

function update_music_volume(mult) {
    SOUND_MUSIC.volume = 0.2 * mult
}

// Sounds
const SOUND_CHECKPOINT = new Audio('sound/checkpoint.ogg'); SOUND_CHECKPOINT.volume = 0.2
const SOUND_WOODBLOCK_OPEN = new Audio('sound/woodblock-open.ogg')
const SOUND_WOODBLOCK_CLOSE = new Audio('sound/woodblock-close.ogg')
const SOUND_WOODBLOCK_SWITCH = new Audio('sound/woodblock-switch.ogg')
const SOUND_ART_OPEN = new Audio('sound/art-open.mp3'); SOUND_ART_OPEN.volume = 0.2 // Thanks Honkish
const SOUND_ART_CLOSE = new Audio('sound/art-close.mp3'); SOUND_ART_CLOSE.volume = 0.2

const shatterSounds = [
    'smw',
    'glass',
    'lego',
]
const SOUND_SHATTER = new Audio(`sound/shatter-${shatterSounds[Math.floor(Math.random()*shatterSounds.length)]}.ogg`); SOUND_SHATTER.volume = 0.2

function update_audio_volume(mult) {
    SOUND_CHECKPOINT.volume = 0.3 * mult
    SOUND_WOODBLOCK_OPEN.volume = 0.5 * mult
    SOUND_WOODBLOCK_CLOSE.volume = 0.5 * mult
    SOUND_WOODBLOCK_SWITCH.volume = 0.5 * mult
    SOUND_ART_OPEN.volume = 0.3 * mult
    SOUND_ART_CLOSE.volume = 0.3 * mult
    SOUND_SHATTER.volume = 0.2 * mult
}

const TEX_LOGO = get_texture_info("textures/wip-logo.png")
const TEX_LOGO_WAIT = get_texture_info("textures/wip-logo.png")
const TEX_LOGO_PEACE = get_texture_info("textures/wip-logo-2.png")
const TEX_LOGO_SPIN = get_texture_info("textures/wip-logo-3.png")
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
for (let link of socialLinks) {
    link.image = get_texture_info(`textures/social-${link.image}.png`)
    link.y = 300
    link.scale = socialScaleMin
}

// Info Tabs Info??

const currAge = new Date().getFullYear() - 2007 - (
    new Date() < new Date(new Date().getFullYear(), 3, 3) ? 1 : 0
)
const TEX_SQUISHY_ASSISTANT = get_texture_info("textures/squishy-assistant.png")
let squishyAssistantState = 0
let squishyAssistantFrame = 0
let personalMessage = ""
function info_tab_render_about_me(x, y, width, height) {
    load_github_commit_rate("Squishy6094")

    // Profile Picture
    djui_hud_set_color(bgColor.r, bgColor.g, bgColor.b, 255)
    djui_hud_render_rect(x + 3, y + 3, 75, 75)
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_texture(TEX_SQUISHY_PFP, x + 5, y + 5, 71/TEX_SQUISHY_PFP.width, 71/TEX_SQUISHY_PFP.height)

    // Description
    let textX = x + 83, textY = y + 5
    djui_hud_print_text("Haii, I'm Squishy!", textX, textY, 0.5)
    textY +=  5;
    textY += 10; djui_hud_print_text("I'm also known as Madeline, I'm a programmer who mainly",      textX, textY, 0.3)
    textY += 10; djui_hud_print_text("works on SM64CoopDX Mods and both Front/Backend Javascript!",  textX, textY, 0.3)
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
    textY += 8; djui_hud_print_text((commitRate ? `Commit Rate: ${commitRate}/wk` : "Loading Commit Rate..."), textX, textY, 0.25)

    let messageStatus = `${personalMessage.length}/64`
    if (djui_hud_text_input_state.sent) {
        messageStatus = "Sending..."
        if (djui_hud_text_input_state.success) {
            messageStatus = "Sent!"
        } else if (djui_hud_text_input_state.success === false) {
            if (personalMessageBanned) {
                messageStatus = `Banned from Service`
            } else if (personalMessageCooldown > Date.now()) {
                let msLeft = personalMessageCooldown - Date.now()
                let min = Math.floor(msLeft / 60000)
                let sec = Math.floor((msLeft % 60000) / 1000)
                let secStr = sec < 10 ? "0" + sec : sec
                messageStatus = `${min}:${secStr}`
                if (msLeft < 1000) {
                    djui_hud_text_input_state.sent = false
                }
            } else {
                messageStatus = "Failed!"
            }
        }
    }

    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_print_text(`Send me a Message!! - ${messageStatus}`, x + 3, y + height - 35, 0.3)
    personalMessage = djui_hud_render_text_input(personalMessage, x + 3, y + height - 25, 100, 15)
    djui_hud_set_color(255, 255, 255, 150)
    djui_hud_print_text("(Messages are publicly viewable but anonymous)", x + 3, y + height - 7, 0.2)

        // Message Assistant
    if (squishyAssistantState == 1) {
        squishyAssistantRender = Math.min(Math.floor(squishyAssistantFrame/5), 7) * 160
    } else {
        squishyAssistantRender = Math.floor(squishyAssistantFrame/30)%2 * 160
    }
    squishyAssistantFrame = squishyAssistantFrame + 1

    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_texture_tile(TEX_SQUISHY_ASSISTANT, x - 3 + Math.max(100, djui_hud_measure_text(personalMessage) * 0.3 + 8), y + height - 65, 0.3, 0.3, squishyAssistantRender, 0, 160, 288)
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
            // Remove file extension from img name
            let nameWithoutExt = item.img.replace(/\.[^/.]+$/, "")
            if (!grouped[item.artist]) grouped[item.artist] = []
            grouped[item.artist].push({
            ...item,
            name: nameWithoutExt,
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
let focusImageDelay = 0
let galleryHeight = 0
function info_tab_render_art_gallery(x, y, width, height) {
    let imagesPerRow = Math.floor((djui_hud_get_screen_width() - 60) / (imageWidth + 5))
    // Only render if data is loaded
    if (!get_art_gallery_json()) {
        djui_hud_print_text("Loading art gallery...", x + height*0.5, y + height*0.5 - 5, 0.4)
        return
    }

    if (width < 5) {
        focusImageX = 1000
    }

    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()
    let mousePressed = djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON === 1

    console.log(mousePressed)

    let artistY = y - galleryScroll
    for (let artist of artGalleryTable) {
        a = artGalleryTable.indexOf(artist)
        if (a != 0) {
            djui_hud_render_rect(x + 8, artistY - 5, Math.max(width - 20, 0), 1)
        }
        const artCount = Object.keys(artist.items).length
        djui_hud_print_text(`${artist.artist} - ${artCount} Artwork${artCount > 1 ? "s" : ""}`, x + 10, artistY + 5, 0.4)

        let imgHeights = []
        for (let i = 0; i < imagesPerRow; i++) {
            imgHeights[i] = 0
        }
        for (let item of artist.items) {
            if (!item.texture || !item.texture.width || !item.texture.height) continue; // Skip if texture not loaded yet
            // Find the column with the smallest height
            let i = 0
            let minHeight = imgHeights[0]
            for (let j = 1; j < imagesPerRow; j++) {
                if (imgHeights[j] < minHeight) {
                    minHeight = imgHeights[j]
                    i = j
                }
            }
            let itemX = x + 10 + (i * (imageWidth + 5));
            let itemY = artistY + 20 + imgHeights[i%imagesPerRow]
            let scale = imageWidth/item.texture.width
            let imgW = imageWidth
            let imgH = item.texture.height * scale

            // Check for click
            if (
                !focusImage && focusImageDelay === 0 &&
                mouseX > itemX && mouseX < itemX + imgW &&
                mouseY > itemY && mouseY < itemY + imgH &&
                mousePressed
            ) {
                focusImageFile = item
                focusImage = true
                focusImageDelay = 3
                SOUND_ART_OPEN.play()
            }
            if ((itemY + imgH + 5) > 0 && (itemY) < x + height) {
                // Only render if on screen
                djui_hud_render_texture(item.texture, itemX, itemY, scale, scale)
            }
            imgHeights[i%imagesPerRow] += imgH + 5 // Move down for next artist
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
        focusImageX = lerp(focusImageX, width*1.1, 0.09)
    }
    if (focusImageX < width && focusImageFile && focusImageFile.texture) {
        djui_hud_set_color(bgColor.r*0.5, bgColor.g*0.5, bgColor.b*0.5, Math.max((width*0.5)-focusImageX, 0)/(width*0.5)*200)
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
        const artName = focusImageFile.name + " - " + focusImageFile.artist
        djui_hud_print_text(artName, imgX + imgW*0.5 - djui_hud_measure_text(artName)*0.25, imgY - 15, 0.5)
        // Click anywhere to close
        if (mousePressed && focusImageDelay === 0) {
            focusImage = false
            focusImageDelay = 3
            SOUND_ART_CLOSE.play()
        }
    }
    
    // Calculate the total height of the gallery for scrolling
    galleryHeight = artistY + galleryScroll - height - y

    if (focusImageDelay > 0) {
        focusImageDelay = focusImageDelay - 1
    }
}

window.addEventListener('wheel', function(e) {
    if (currInfoTab && currInfoTab.func == info_tab_render_art_gallery) {
        galleryScroll += e.deltaY * 0.1
        galleryScroll = clamp(galleryScroll, 0, galleryHeight)
    }
})


let optionColorR = localStorage.getItem("prefColorR") || 0
let optionColorG = localStorage.getItem("prefColorG") || (88/255)
let optionColorB = localStorage.getItem("prefColorB") || 0

let bgColorRaw = { r: optionColorR*255, g: optionColorG*255, b: optionColorB*255 }
let bgColor = bgColorRaw
let bgColorTimer = 0

function set_background_color_to_default() {
    bgColorRaw = { r: optionColorR*255, g: optionColorG*255, b: optionColorB*255 }
}

const musicSpeedModRange = 1
let optionMusicVolume = localStorage.getItem("musicVolume") || 0.25
let optionAudioVolume = localStorage.getItem("audioVolume") || 0.75
let optionMusicSpeed = localStorage.getItem("musicSpeed") || 0.5
function info_tab_render_options(x, y, width, height) {
    let optionY = y + 10
    djui_hud_print_text("Color Preference: ", x + 10, optionY, 0.4)

    // Color Preview
    optionY = optionY + 12
    djui_hud_set_color(255, 255, 255, 255)
    djui_hud_render_rect(x + 159, optionY - 1, 34, 34)
    djui_hud_set_color(optionColorR*127, optionColorG*127, optionColorB*127, 255)
    djui_hud_render_rect(x + 160, optionY, 32, 32)
    djui_hud_set_color(optionColorR*255, optionColorG*255, optionColorB*255, 255)
    djui_hud_render_rect(x + 162, optionY + 2, 28, 28)

    // Adjust Red
    djui_hud_set_color(255, 0, 0, 255)
    optionColorR = djui_hud_render_slider(optionColorR, x + 10, optionY - 1, 100, 10)
    djui_hud_print_text(`${Math.round(optionColorR*255)}`, x + 120, optionY, 0.4)

    // Adjust Green
    optionY = optionY + 12
    djui_hud_set_color(0, 255, 0, 255)
    optionColorG = djui_hud_render_slider(optionColorG, x + 10, optionY - 1, 100, 10)
    djui_hud_print_text(`${Math.round(optionColorG*255)}`, x + 120, optionY, 0.4)

    // Adjust Blue
    optionY = optionY + 12
    djui_hud_set_color(0, 0, 255, 255)
    optionColorB = djui_hud_render_slider(optionColorB, x + 10, optionY - 1, 100, 10)
    djui_hud_print_text(`${Math.round(optionColorB*255)}`, x + 120, optionY, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("prefColorR", optionColorR)
        localStorage.setItem("prefColorG", optionColorG)
        localStorage.setItem("prefColorB", optionColorB)
    }

    djui_hud_render_rect(x + 10, optionY + 13, 200, 1)

    optionY = optionY + 20
    djui_hud_print_text("Audio Volume: ", x + 10, optionY, 0.4)
    optionAudioVolume = djui_hud_render_slider(optionAudioVolume, x + 70, optionY - 1, 100, 10)
    djui_hud_print_text(`${Math.round(optionAudioVolume*100)}%`, x + 180, optionY, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("audioVolume", optionAudioVolume)
    }

    djui_hud_render_rect(x + 10, optionY + 13, 200, 1)

    optionY = optionY + 20
    djui_hud_print_text("Music Volume: ", x + 10, optionY, 0.4)
    optionMusicVolume = djui_hud_render_slider(optionMusicVolume, x + 70, optionY - 1, 100, 10)
    djui_hud_print_text(`${Math.round(optionMusicVolume*100)}%`, x + 180, optionY, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("musicVolume", optionMusicVolume)
    }

    optionY = optionY + 15
    djui_hud_print_text("Music Speed: ", x + 10, optionY, 0.4)
    optionMusicSpeed = djui_hud_render_slider(optionMusicSpeed, x + 70, optionY, 100, 10)
    djui_hud_print_text(`${Math.round(((musicSpeedModRange*0.5) + optionMusicSpeed*musicSpeedModRange)*100)/100}x`, x + 180, optionY, 0.4)
    if (globalTimer % 30 == 1) {
        localStorage.setItem("musicSpeed", optionMusicSpeed)
    }

    djui_hud_print_text("Credits:", x + 10, y + 165, 0.4)
    let textY = 170
    textY = textY + 10; djui_hud_print_text("Shell_x33 - Main Website Artist", x + 13, y + textY, 0.3)
    textY = textY + 10; djui_hud_print_text("Kaktus64 - Social Icons",         x + 13, y + textY, 0.3)
    textY = textY + 10; djui_hud_print_text("Honkish - Art Gallery UI Sounds", x + 13, y + textY, 0.3)
}

let currInfoTab, prevInfoTab
let infoTabPosX = 0
const infoTabs = [
    { image: "squishy-about-me.png", name: "About Me",    func: info_tab_render_about_me    },
    { image: null,                   name: "Art Gallery", func: info_tab_render_art_gallery },
    { image: null,                   name: "Options",     func: info_tab_render_options     },
]
for (let tab of infoTabs) {
    let i = infoTabs.indexOf(tab)
    if (tab.image)
        tab.image = get_texture_info(`textures/${tab.image}`)
    tab.x = -80 - 5*(i + 1)
}

djui_hud_set_resolution(RESOLUTION_N64)

let bgCheckerSize = 16
let titleClick = false
let keyTitleClick = false
let titleOffset = djui_hud_get_screen_width()*0.25
let titleScaleSpin = 3
let logoFallPosY = djui_hud_get_screen_height()
let logoFallVelY = 0
let logoFlash = 0
let logoSquishyFlung = false

let recordSpeed = 0x10 // fullrev   fps  s/m  rpm
const recordSpeedTarget = 0x10000 / 30 / 60 * 33
const recordSpeedUp = 10
const recordSlowDown = 10
const recordBrake = 40
const recordBreakThreshold = 5500
let recordRot = 0
let recordDragStart = 0
let recordHeld = false

let recordStress = 0
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
    let mouseX = djui_hud_get_mouse_x()
    let mouseY = djui_hud_get_mouse_y()

    // Set User Settings
    update_music_volume(optionMusicVolume)
    update_audio_volume(optionAudioVolume)

    let targetColor = (typeof bgColorRaw  == 'function' ? bgColorRaw() : bgColorRaw)
    bgColor.r = lerp(bgColor.r, targetColor.r, 0.1)
    bgColor.g = lerp(bgColor.g, targetColor.g, 0.1)
    bgColor.b = lerp(bgColor.b, targetColor.b, 0.1)
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

    let logoTexture = TEX_LOGO
    if (!logoSquishyFlung) {
        if (titleScaleSpin > 3.5 && titleClick) {
            logoTexture = TEX_LOGO_SPIN
        } else if (spinMath > 0) {
            logoTexture = TEX_LOGO_PEACE
        } else {
            logoTexture = TEX_LOGO_WAIT
        }
    }

    djui_hud_render_texture(logoTexture, screenWidth*0.25 + titleOffset - logoTexture.width*logoScale*0.5 * spinMath, screenHeight*0.5 - logoTexture.height*logoScale*0.5 - (Math.sin((titleOffset/(screenWidth*0.25))*Math.PI)*30) - logoFallPosY, logoScale * spinMath, logoScale)
    djui_hud_set_rotation(0, 0, 0)
    if (!titleClick) {
        if ((djui_hud_get_mouse_buttons_pressed() || keyTitleClick)) {
            // Initialize like EVERYTHING
            titleClick = true
            SOUND_CHECKPOINT.play()
            SOUND_MUSIC.play()
            logoFlash = 150

            if (konami_keys_check_pass("7"))
                TEXT_WIP = "KILLER7"

            if (konami_keys_check_pass("iloveyou") || konami_keys_check_pass("ily"))
                window.open("https://raw.githubusercontent.com/Squishy6094/squishy6094.github.io/refs/heads/main/textures/squishy-iloveyoutoo.png", "_blank", "width=200, height=200")

            if (konami_keys_check_pass("shell"))
                bgColorRaw = {r:107, g:94, b:255}

            if (konami_keys_check_pass("gaster"))
                location.reload()

            if (konami_keys_check_pass("kys"))
                recordSpeed = recordBreakThreshold*2
        }
    } else if (mouseX > screenWidth*0.25 - TEX_LOGO.width*logoScale*0.5 && mouseX < screenWidth*0.25 + TEX_LOGO.width*logoScale*0.5 &&
               mouseY > screenHeight*0.5 - TEX_LOGO.height*logoScale*0.5 - (Math.sin((titleOffset/(screenWidth*0.25))*Math.PI)*30) && mouseY < screenHeight*0.5 + TEX_LOGO.height*logoScale*0.5 - (Math.sin((titleOffset/(screenWidth*0.25))*Math.PI)*30)) {
        if ((djui_hud_get_mouse_buttons_pressed() & L_MOUSE_BUTTON) && !currInfoTab) {
            titleScaleSpin = titleScaleSpin + 2
        }

    }

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

            let i = socialLinks.indexOf(link)
            link.y *= 0.85 + (i*0.09/socialLinks.length)
            let imgWidth = link.image.width * link.scaleAdjust
            let imgHeight = link.image.height * link.scaleAdjust
            let imgScale = link.scale * link.scaleAdjust
            let x = (i - socialLinks.length*0.5)*imgWidth*socialScaleMax+2 + screenWidth*0.25
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
                bgColorTimer = 0
            } else {
                link.scale = Math.max(link.scale*0.95, socialScaleMin)
            }
            djui_hud_set_color(255, 255, 255, (link.scale-socialScaleMin)/(socialScaleMax-socialScaleMin)*255)
            djui_hud_print_text(link.name, (x + imgWidth*socialScaleMin*0.5) - djui_hud_measure_text(link.name)*0.15, y - 10, 0.3)
        }

        titleOffset *= 0.9
        titleScaleSpin *= 0.95
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
            prevInfoTab.func(screenWidth - infoTabPosX + 3, 20, Math.max(infoTabPosX - 3, 0), Math.max(screenHeight - 23, 0))
            djui_hud_set_color(0, 0, 0, 255)
            djui_hud_render_rect(screenWidth - infoTabPosX, 0, screenWidth, 20) // Top
            djui_hud_render_rect(screenWidth - infoTabPosX, 0, 3, screenHeight) // Left
            djui_hud_render_rect(Math.max(screenWidth - 3, screenWidth - infoTabPosX), 0, 3, screenHeight) // Right
            djui_hud_render_rect(screenWidth - infoTabPosX, screenHeight - 3, screenWidth, 3) // Bottom
            djui_hud_set_color(255, 255, 255, 255)
            djui_hud_print_text(prevInfoTab.name, screenWidth - infoTabPosX + 6, 4, 0.6)
        }

        if (currInfoTab) {
            infoTabPosX = lerp(infoTabPosX, screenWidth - 60, 0.15)
            prevInfoTab = currInfoTab
            set_background_color_to_default()
        } else {
            infoTabPosX = lerp(infoTabPosX, 0, 0.15)
        }

        // Music Record
        let recordRadius = TEX_MUSIC_RECORD.width * 0.25
        if (!recordBroken) {
            let userSpeedTarget = SOUND_MUSIC.playing ? (recordSpeedTarget * ((musicSpeedModRange*0.5) + optionMusicSpeed*musicSpeedModRange)) : 0
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

            if (Math.abs(recordSpeed) > recordBreakThreshold) recordStress += (Math.abs(recordSpeed) - recordBreakThreshold) / 150
            else recordStress = 0

            SOUND_MUSIC.playbackRate = recordSpeed / recordSpeedTarget

            if (recordStress > 99) {
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
        }

        // Shhhh secretss
        djui_hud_set_color(255, 255, 255, 255)
        djui_hud_print_text(konamiKeys.toString().replace(/,/g, ''), screenWidth*0.5 - djui_hud_measure_text(konamiKeys.join(""))*0.25, 30, 0.5)
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