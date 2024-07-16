var ShellSite = false

var id = null;
var startPos = -150
var posX = startPos;
var posY = 0;
var prevPosY = posY;
var jumpVel = 0;
var squishedPhys = false;
const posFloor = 73

var runAnim = "images/paper_squishy.png"
var jumpAnim = "images/icons/coopdx.png"
setInterval(function() {
    var elem = document.getElementById("runAnim");
    var elemLink = document.getElementById("runAnimLink")
    const d = new Date();
    const rng = Math.floor(Math.random()*100)
    if (d.getSeconds() % 60 == 0 && posX == startPos ) {
        squishedPhys = false
        elemLink.removeAttribute("href");
        if (rng == 69) { // squished,,
            runAnim = "images/runAnims/squished.png"
            squishedPhys = true
        } else if (ShellSite) {
            if (rng <= 10) { // Shell Anims
                elemLink.href = "index.html"
                runAnim = "images/runAnims/squishy-run.gif"
                jumpAnim = "images/runAnims/squishy-jump.png"
            } else { // Squishy Easter Egg
                runAnim = "images/runAnims/shell-run.gif"
                jumpAnim = "images/runAnims/shell-jump.png"
            }
        } else {
            if (rng <= 10) { // Shell Easter Egg
                runAnim = "images/runAnims/shell-run.gif"
                jumpAnim = "images/runAnims/shell-jump.png"
                elemLink.href = "shell.html"
            } else { // Squishy Anims
                runAnim = "images/runAnims/squishy-run.gif"
                jumpAnim = "images/runAnims/squishy-jump.png"
            }
        }
        
        elem.src = runAnim
        clearInterval(id);
        id = setInterval(frame, 10);
        posX++
    }
    function frame() {
        let width = screen.width;
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
                posX = posX + 6; 
            } else {
                if (posY == 0) {
                    if (Math.floor(Math.random()*100) == 0){
                        jumpVel = 10
                    }
                    if (prevPosY != posY){ // Prevent Anim Buffer
                        elem.src = runAnim
                    }
                } else {
                    elem.src = jumpAnim
                }
                prevPosY = posY
                jumpVel = Math.max(jumpVel - 0.3, -20)
                posY = Math.max(posY + jumpVel, 0)
                posX = posX + 2; 
            }
            elem.style.left = posX + 'px'; 
            elem.style.bottom = (posFloor + posY) + 'px'; 
        }
    }
}, 1000)