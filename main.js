var display, mainParticle
var displayData
var lastRender = 0

var collisionSpeed = 500

var particlesToCollide = []

window.onload = function() {
    const clickableElements = document.getElementsByClassName("clickable")

    for (var i = 0; i < clickableElements.length; i++) {
        clickableElements[i].addEventListener("click", onClick, false)
    }

    display = document.getElementById("particle_display")
    mainParticle = document.getElementById("main_particle")

    displayData = getComputedStyle(display)
}

function update(deltaTime) {
    var removeAfter = []

    for (var i = 0; i < particlesToCollide.length; i++) {
        var particle = particlesToCollide[i]
        
        var x0 = parseFloat(particle.style.left.replace("%", ""))
        var y0 = parseFloat(particle.style.top.replace("%", ""))

        var vect = {x: 50 - x0, y: 50 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (mag <= 1) {
            removeAfter.push(particle)
        } else {
            vect.x *= collisionSpeed/mag
            vect.y *= collisionSpeed/mag

            particle.style.left = (100*vect.x * deltaTime/displayData.width.replace("px", "") + x0) + "%"
            particle.style.top = (100*vect.y * deltaTime/displayData.height.replace("px", "") + y0) + "%"

            if (x0 > 0 && x0 < 100 && y0 > 0 && y0 < 100-100*particle.style.height.replace("px", "")/displayData.height.replace("px", "")) {
                particle.hidden = false;
            }
        }
    }

    for (var i = 0; i < removeAfter.length; i++) {
        var del = particlesToCollide.splice(particlesToCollide.indexOf(removeAfter[i]), 1)
        display.removeChild(del[0])
    }

    removeAfter = []
}

function draw() {

}

function onClick(event) {
    console.log(event.currentTarget.id)

    var part = createParticle("#ffff00", 10)

    display.appendChild(part)

    particlesToCollide.push(part)
}

function createParticle(color, size) {
    let div = document.createElement('div');

    var angle = Math.round(Math.random() * 100);
    var side = Math.random() > 0.5

    div.style.position = "absolute"
    div.style.left = side ? (-Math.ceil(100*size/getComputedStyle(display).width.replace("px", ""))) + "%" : "100%"
    div.style.top = (angle-size/getComputedStyle(display).height.replace("px", ""))+"%"
    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.borderRadius = "50%"
    div.style.backgroundColor = color
    div.style.boxShadow = "0 0 " + size + "px " + (size/5) + "px " + color
    div.hidden = true;
    
    return div
}

function loop(timestamp) {
    var delta = (timestamp - lastRender) / 1000
  
    update(delta)
    draw()
    
    lastRender = timestamp
    window.requestAnimationFrame(loop)
  }

function getPosition(ele) {
    if (typeof ele == undefined || ele == null)
        return {x: 0, y: 0}
    
    var rect=ele.getBoundingClientRect();

    return {x: rect.left, y: rect.top};
}
  
  window.requestAnimationFrame(loop)