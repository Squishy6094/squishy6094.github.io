const owieAnimEnd = -100
var owieAnim = owieAnimEnd
var hitCount = 0
var hitIntensity = 0

const stupidBitch = document.getElementById("shellClicker")
const navText = document.getElementById("navText")
const hitAnims = [
    "shell-hurt-1.gif",
    "shell-hurt-2.gif",
    "shell-hurt-3.gif",
    "shell-hurt-4.gif",
    "shell-hurt-5.gif",
    "shell-hurt-6.gif",
];

setInterval(function() {
    if (owieAnim > owieAnimEnd) {
        owieAnim = owieAnim - 1
        if (owieAnim < 0) {
            stupidBitch.src = 'images/shell-site/shell-clicker/shell-ow.gif'
        }
    } else {
        stupidBitch.src = 'images/shell-site/shell-clicker/shell-idle.png'
    }
    if (hitIntensity > 0) {
        hitIntensity = hitIntensity - 1
        stupidBitch.style.left = (Math.random()*hitIntensity*2 - hitIntensity) + 'px';
        stupidBitch.style.bottom = (Math.random()*hitIntensity*2 - hitIntensity + 50) + 'px'; 
    }
}, 10)

function shellOnClick() {
    owieAnim = 50
    hitIntensity = 10
    hitCount++
    navText.textContent = "Abuse: " + hitCount
    var anim = hitAnims[Math.floor(Math.random()*hitAnims.length)]
    stupidBitch.src = 'images/shell-site/shell-clicker/' + anim
}

document.getElementById("shellClickerLink").addEventListener("click", shellOnClick); 