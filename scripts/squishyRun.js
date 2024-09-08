var ShellSite = false
var Cheater = false

const animSquishyRun = "images/run-anims/squishy-run.gif"
const animSquishyJump = "images/run-anims/squishy-jump.png"
const animShellRun = "images/run-anims/shell-run.gif"
const animShellJump = "images/run-anims/shell-jump.png"
const animSquished = "images/run-anims/squished.png"

var tickSpeed = 1000/30 // 30fps

// Preload Needed Assets - By Nanoo
var cache = document.createElement("CACHE");
cache.style = "position:absolute;z-index:-1000;opacity:0;";
document.body.appendChild(cache);
function preloadImage(url) {
    var img = new Image();
    img.src = url;
    img.style = "position:absolute";
    cache.appendChild(img);
}

preloadImage(animSquishyRun);
preloadImage(animSquishyJump);
preloadImage(animShellRun);
preloadImage(animShellJump);
preloadImage(animSquished);

var id = null;
const startPos = -150
var posX = startPos;
var posY = 0;
var prevPosY = posY;
var jumpVel = 0;
var squishedPhys = false;
const posFloor = 80
var runAnim = animSquishyRun
var jumpAnim = animSquishyJump
function creatureSpawn(rng) {
    const elem = document.getElementById("runAnim");
    const elemLink = document.getElementById("runAnimLink")
    posX = startPos
    squishedPhys = false

    // Remove all previous click events
    elemLink.removeAttribute("href");
    elemLink.removeEventListener("click", unlockSquished);
    elem.style.cursor = 'auto'
    if (rng == 69) { // squished,,
        runAnim = animSquished
        squishedPhys = true
        elemLink.addEventListener("click", unlockSquished);
        elem.style.cursor = 'pointer'
    } else if (ShellSite) {
        if (rng <= 10) { // Squishy Easter Egg
            elemLink.href = "index.html"
            runAnim = animSquishyRun
            jumpAnim = animSquishyJump
        } else { // Shell Anims
            runAnim = animShellRun
            jumpAnim = animShellJump
        }
    } else {
        if (rng <= 10) { // Shell Easter Egg
            runAnim = animShellRun
            jumpAnim = animShellJump
            elemLink.href = "shell.html"
        } else { // Squishy Anims
            runAnim = animSquishyRun
            jumpAnim = animSquishyJump
        }
    }
    
    elem.src = runAnim
    clearInterval(id);
    id = setInterval(creatureUpdate, tickSpeed);
    posX++
}

function creatureUpdate() {
    const width = window.innerWidth;
    const elem = document.getElementById("runAnim");
    const elemLink = document.getElementById("runAnimLink")
    if (posX >= width && posX > startPos) {
        posX = startPos
        posY = 0;
        jumpVel = 0;
        elem.style.left = startPos + 'px'; 
        elem.style.bottom = posFloor + 'px'; 
        clearInterval(id);
    } else {
        // Jumping
        if (squishedPhys) {
            posX = posX + 12; 
        } else {
            if (posY == 0) {
                if (Math.floor(Math.random()*100) == 0){
                    jumpVel = 15
                }
                if (prevPosY != posY){ // Prevent Anim Buffer
                    elem.src = runAnim
                }
            } else {
                elem.src = jumpAnim
            }
            prevPosY = posY
            jumpVel = Math.max(jumpVel - 1, -20)
            posY = Math.max(posY + jumpVel, 0)
            posX = posX + 4; 
        }
        elem.style.left = posX + 'px';
        elem.style.bottom = (posFloor + posY) + 'px';
    }
}

// Creature Spawner
setInterval(function() {
    const elem = document.getElementById("runAnim");
    const elemLink = document.getElementById("runAnimLink")
    var spawnRate = 60
    if (ShellSite) {
        spawnRate = 30
    }
    const d = new Date();
    const rng = Math.floor(Math.random()*100)
    if (d.getSeconds() % spawnRate == 0 && posX == startPos ) {
        creatureSpawn(rng)
    }
}, 1000)

// Debug Functions
const squishyRun = {
    spawn(setRng) {
        Cheater = true
        creatureSpawn(setRng)
    }
}

// Squished Achievement
function unlockSquished() {
    // Snackbar/Popups
    const squishedUnlocked = {
        text: "Achievement Unlocked!\nSquished Found",
        duration: 5000,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        onClick: function(){} // Callback after click
    }
    if (!Cheater) {
        localStorage.setItem("squishedFound", "true")
        document.getElementById('squishedBadge').style.visibility = 'visible';
    } else {
        console.log("Hell no, Cheater!!!!")
        squishedUnlocked.text = "No >:("
    }
    Toastify(squishedUnlocked).showToast();
}