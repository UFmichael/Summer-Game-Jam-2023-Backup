var display, mainParticle
var displayData
var lastRender = 0

var collisionSpeed = 500

var mainParticleSize = 25

var mass_doc, energy_doc, velocity_doc

var resources = {
    mass: 0,
    velocity: 0,
    alpha_particles: 0,
    avail_alpha_particles: 0
}

var cost_quant = {
    vel_quant: 0,
    u1_quant: 0
}

var cost_data = {
    _vel: () => 50 * Math.pow(5, cost_quant.vel_quant),
    vel: 50,
    _u1: () => 10 * Math.pow(1.1, cost_quant.u1_quant),
    u1: 10
}

var kineticEnergy = (mass, velocity) => 0.5 * mass * velocity * velocity;
var invKineticEnergy = (energyInput, velocity) => 2*energyInput/(velocity*velocity); 

var restEnergy = (mass, c) => mass * c * c;

var energy = kineticEnergy;

var particlesToCollide = []
var particlesToDrift = []

var garbageBin;

window.onload = function() {
    const clickableElements = document.getElementsByClassName("clickable")

    for (var i = 0; i < clickableElements.length; i++) {
        clickableElements[i].addEventListener("click", onClick, false)
    }

    display = document.getElementById("particle_display")
    mainParticle = document.getElementById("main_particle")

    displayData = getComputedStyle(display)

    mass_doc = document.getElementById("mass")
    energy_doc = document.getElementById("energy")
    velocity_doc = document.getElementById("velocity")

    document.getElementById("particle1_upgrade").innerHTML = "Alpha Particles<br>(0)<br>" +cost_data.u1+ " J / ∞ kg"
    document.getElementById("velocity_upgrade").innerHTML = "Increase velocity<br>1 m/s<br>"+cost_data.vel + " kg";

    mainParticle.style.width = mainParticleSize + "px";
    mainParticle.style.height = mainParticleSize + "px";

    if (typeof(garbageBin) === 'undefined')
        {
        garbageBin = document.createElement('div');
        garbageBin.style.display = 'none';
        document.body.appendChild(garbageBin);
        }
}

function discardElement(element)
        {
        garbageBin.appendChild(element);

        garbageBin.innerHTML = "";
        }

function update(deltaTime) {
    updateDisplayBoard(deltaTime);
    numberUpdates(deltaTime)
}

function numberUpdates(deltaTime) {
    mass_doc.innerHTML = "Mass: " + round(resources.mass, 100) + " kg"
    energy_doc.innerHTML = "Energy: " + round(energy(resources.mass, resources.velocity), 100) + " J"
    velocity_doc.innerHTML = "Velocity: " + round(resources.velocity, 100) + " m/s"
}

function updateDisplayBoard(deltaTime) {
    let removeAfter = []

    for (var i = 0; i < particlesToCollide.length; i++) {
        var particle = particlesToCollide[i]
        
        var x0 = parseFloat(particle.style.left.replace("%", ""))
        var y0 = parseFloat(particle.style.top.replace("%", ""))

        var vect = {x: 50 - x0, y: 50 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (mag <= 1) {
            removeAfter.push(particle)
            resources.mass += particle.mass
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
        discardElement(del[0])
    }

    removeAfter = []

    var min = Math.min(resources.alpha_particles - resources.avail_alpha_particles, 10)

    for (var i = 0; i < min; i++) {
        var part = createParticle("#ffff00", 10, 1)

        display.appendChild(part)
        
        particlesToDrift.push(part)
    }

    resources.avail_alpha_particles += min

    var diff = 100*getComputedStyle(mainParticle).width.replace("px", "")/displayData.width.replace("px", "")

    for (var i = 0; i < particlesToDrift.length; i++) {
        var particle = particlesToDrift[i]

        var x0 = parseFloat(particle.style.left.replace("%", ""))
        var y0 = parseFloat(particle.style.top.replace("%", ""))

        var vect = {x: 50 - x0, y: 50 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (y0 <= 50 + diff && y0 >= 50 - diff && x0 <= 50) {
            removeAfter.push(particle)
            resources.mass += particle.mass
        } else if (x0 < 0) {
            removeAfter.push(particle)
        } else {
            particle.style.left = (-50*collisionSpeed*resources.velocity * deltaTime/displayData.width.replace("px", "") + x0) + "%"
            
            particle.hidden = !(x0 > 0 && x0 < 100-100*particle.style.width.replace("px", "")/displayData.width.replace("px", ""));
        }
    }

    for (var i = 0; i < removeAfter.length; i++) {
        var del = particlesToDrift.splice(particlesToDrift.indexOf(removeAfter[i]), 1)
        discardElement(del[0])
        resources.avail_alpha_particles--
    }

    var mult = Math.sqrt(Math.log(resources.mass)/Math.log(10) + 1)

    if (true) {
        mainParticle.style.width = mainParticleSize * mult + "px";
        mainParticle.style.height = mainParticleSize * mult + "px";
    }
}

function draw() {

}

function onClick(event) {
    var id = event.currentTarget.id

    if (id == "main_particle") {
        var part = createManualParticle("#ffff00", 10, 1)

        display.appendChild(part)

        particlesToCollide.push(part)
    } else if (id == "velocity_upgrade") {
        if (resources.mass >= cost_data.vel) {
            resources.mass -= cost_data.vel;
            resources.velocity++
            cost_quant.vel_quant++
            cost_data.vel = cost_data._vel()
            document.getElementById("velocity_upgrade").innerHTML = "Increase velocity<br>1 m/s<br>"+cost_data.vel + " kg";
        }
    } else if (id == "particle1_upgrade") {
        if (energy(resources.mass, resources.velocity) >= cost_data.u1) {
            resources.mass -= invKineticEnergy(cost_data.u1, resources.velocity)
            resources.alpha_particles++
            cost_quant.u1_quant++
            cost_data.u1 = cost_data._u1()
        }
    }

    var cost = Math.ceil(100*cost_data.u1)/100

    var massCost = Math.ceil(100*invKineticEnergy(cost, resources.velocity))/100

    if (massCost == "Infinity")
        massCost = "∞"

    document.getElementById("particle1_upgrade").innerHTML = "Alpha Particles<br>("+resources.alpha_particles+")<br>" +cost+ " J / " + massCost + " kg"
}

function createManualParticle(color, size, mass) {
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
    div.mass = mass
    
    return div
}

function createParticle(color, size, mass) {
    let div = document.createElement('div');

    var angle = Math.round(Math.random() * 100);

    div.style.position = "absolute"
    div.style.left = "100%"
    div.style.top = (angle-size/getComputedStyle(display).height.replace("px", ""))+"%"
    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.borderRadius = "50%"
    div.style.backgroundColor = color
    div.style.boxShadow = "0 0 " + size + "px " + (size/5) + "px " + color
    div.hidden = true;
    div.mass = mass
    
    return div
}

function loop(timestamp) {
    var delta = (timestamp - lastRender)
    
    if (delta > 16) {
        update(delta/1000)
        draw()
        lastRender = timestamp
    }
    
    window.requestAnimationFrame(loop)
  }

function getPosition(ele) {
    if (typeof ele == undefined || ele == null)
        return {x: 0, y: 0}
    
    var rect=ele.getBoundingClientRect();

    return {x: rect.left, y: rect.top};
}

function round(number, whichPlace) {
    return Math.round(number*whichPlace)/whichPlace
}
  
window.requestAnimationFrame(loop)