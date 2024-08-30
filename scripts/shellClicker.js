const owieAnimEnd = -70
var owieAnim = owieAnimEnd
var petAnim = 0
var hitCount = 0
var hasBeenHit = false
var hitIntensity = 0

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

preloadImage("images/shell-site/shell-clicker/shell-idle.png");
preloadImage("images/shell-site/shell-clicker/shell-ow.gif");
preloadImage("images/shell-site/shell-clicker/shell-pet.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-1.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-2.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-3.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-4.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-5.gif");
// preloadImage("images/shell-site/shell-clicker/shell-hurt-6.gif");

const stupidBitch = document.getElementById("shellClicker")
stupidBitch.style.cursor = 'pointer'
const navText = document.getElementById("navText")
const hitAnims = [
    "shell-hurt-1.gif",
    "shell-hurt-2.gif",
    "shell-hurt-3.gif",
    "shell-hurt-4.gif",
    "shell-hurt-5.gif",
    "shell-hurt-6.gif",
];

// var shellPetStatus = 0
(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
        var eventDoc, doc, body;

        event = event || window.event; // IE-ism

        // If pageX/Y aren't available and clientX/Y are,
        // calculate pageX/Y - logic taken from jQuery.
        // (This is to support old IE)
        if (event.pageX == null && event.clientX != null) {
            eventDoc = (event.target && event.target.ownerDocument) || document;
            doc = eventDoc.documentElement;
            body = eventDoc.body;

            event.pageX = event.clientX +
              (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
              (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY +
              (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
              (doc && doc.clientTop  || body && body.clientTop  || 0 );
        }

        // Use event.pageX / event.pageY here
        
        const shellSize = document.getElementById("shellClickerLink").getBoundingClientRect();
        if (event.pageY > shellSize.top && event.pageY > shellSize.bottom && hasBeenHit && owieAnim <= owieAnimEnd){
            if (shellPetStatus == 0 && event.pageX > shellSize.left && event.pageX < shellSize.right) {
                shellPetStatus = 1
            }
            if (shellPetStatus == 1 && (event.pageX < shellSize.left || event.pageX > shellSize.right)) {
                shellPetStatus = 0
                petAnim = 50
                hitCount = hitCount - 1
                if (hitCount >= 0) {
                    navText.textContent = "Abuse: " + hitCount
                } else {
                    navText.textContent = "Headpats: " + hitCount*-1
                }
            }
        } else {
            shellPetStatus = 0
        }
    }
})();

var tickSpeed = 1000/30 // 30fps
setInterval(function() {
    if (owieAnim > owieAnimEnd) {
        petAnim = 0
        owieAnim = owieAnim - 1
        if (owieAnim < 0) {
            stupidBitch.src = 'images/shell-site/shell-clicker/shell-ow.gif'
        }
    } else if (petAnim > 0) {
        petAnim = petAnim - 1
        if (petAnim > 0) {
            stupidBitch.src = 'images/shell-site/shell-clicker/shell-pet.gif'
        }
    } else {
        stupidBitch.src = 'images/shell-site/shell-clicker/shell-idle.png'
    }
    if (hitIntensity > 0) {
        hitIntensity = hitIntensity - 1
        stupidBitch.style.left = (Math.random()*hitIntensity*2 - hitIntensity) + 'px';
        stupidBitch.style.bottom = (Math.random()*hitIntensity*2 - hitIntensity + 50) + 'px'; 
    }
}, tickSpeed)

function shellOnClick() {
    owieAnim = 20
    hitIntensity = 10
    if (hitCount < 0) {
        hitCount = 0
    }
    hitCount++
    hasBeenHit = true
    navText.textContent = "Abuse: " + hitCount
    var anim = hitAnims[Math.floor(Math.random()*hitAnims.length)]
    stupidBitch.src = 'images/shell-site/shell-clicker/' + anim
}

function shellOnPet() {

}

document.getElementById("shellClickerLink").addEventListener("click", shellOnClick); 