var display, mainParticle
var displayData
var lastRender = 0

var collisionSpeed = 500

var mainParticleSize = 25

var mass_doc, energy_doc, velocity_doc

var particleData = {
    alpha: {
        color: "#ffff00",
        size: 10,
        mass: 1
    },
    beta: {
        color: "#00ff00",
        size: 12,
        mass: 5
    },
    gamma: {
        color: "#ff00ff",
        size: 15,
        mass: 30
    }
}

var resources = {
    mass: 0,
    velocity: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
}

var activeParticles = {
    alpha: 0,
    beta: 0,
    gamma: 0,
}

var costQuant = {
    vel: 0,
    u1: 0,
    u2: 0,
    u3: 0
}

var costData = {
    _u1: () => 10 * Math.pow(1.1, costQuant.u1),
    u1: 10,
    _u2: () => 80 * Math.pow(1.13, costQuant.u2),
    u2: 80,
    _u3: () => 200 * Math.pow(1.17, costQuant.u2),
    u3: 200,
    _vel: () => 50 * Math.pow(5, costQuant.vel),
    vel: 50,
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

    updateButtonText()

    document.getElementById("velocity_upgrade").innerHTML = "Increase velocity<br>1 m/s<br>"+costData.vel + " kg";

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

    createParticlesIfAvailable("alpha")
    createParticlesIfAvailable("beta")
    createParticlesIfAvailable("gamma")

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
            while (particle.velocity/0.95 < resources.velocity) {
                particle.velocity += 1
            }
            
            particle.style.left = (-50*collisionSpeed*particle.velocity * deltaTime/displayData.width.replace("px", "") + x0) + "%"
            
            particle.hidden = !(x0 > 0 && x0 < 100-100*particle.style.width.replace("px", "")/displayData.width.replace("px", ""));
        }
    }

    for (var i = 0; i < removeAfter.length; i++) {
        var del = particlesToDrift.splice(particlesToDrift.indexOf(removeAfter[i]), 1)
        activeParticles[del[0].name]--
        discardElement(del[0])
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
        if (resources.mass >= costData.vel) {
            resources.mass -= costData.vel;
            resources.velocity++
            costQuant.vel++
            costData.vel = costData._vel()
            document.getElementById("velocity_upgrade").innerHTML = "Increase velocity<br>1 m/s<br>"+costData.vel + " kg";
        }
    } else if (id.slice(0, 16) == "particle_upgrade") {
        let names = Object.keys(particleData)
        let costs = Object.values(costData)

        let i = parseInt(id.slice(16))-1
        
        if (energy(resources.mass, resources.velocity) >= costs[2*i+1]) {
            resources.mass -= invKineticEnergy(costs[2*i+1], resources.velocity)
            resources[names[i]]++
            costQuant["u" + (i+1)]++
            costData["u" + (i+1)] = costData["_u" + (i+1)]()
        }
    }

    updateButtonText()
}

function updateButtonText() {
    let updateMassCost = true
    let massCost = "∞"
    let names = Object.keys(particleData)
    let costs = Object.values(costData)

    if (resources.velocity == 0)
        updateMassCost = false
    
    for (var i = 0; i < names.length; i++) {
        let cost = ceil(costs[2*i + 1], 100)
        let name = names[i]

        if (updateMassCost) {
            massCost = ceil(invKineticEnergy(cost, resources.velocity), 100)
        }

        document.getElementById("particle_upgrade" + (i+1)).innerHTML = name.charAt(0).toUpperCase() + name.slice(1) + " Particles<br>("+resources[name]+")<br>" +cost+ " J / " + massCost + " kg"
    }
}

function createManualParticle(color, size, mass) {
    let div = document.createElement('div');

    var angle = Math.round(Math.random() * 100);
    var side = Math.random() > 0.5

    div.style.position = "absolute"
    div.style.left = side ? (-Math.ceil(100*size/getComputedStyle(display).width.replace("px", ""))) + "%" : "100%"
    div.style.top = (angle-2*size/getComputedStyle(display).height.replace("px", ""))+"%"
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
    div.style.top = (angle-2*size/getComputedStyle(display).height.replace("px", ""))+"%"
    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.borderRadius = "50%"
    div.style.backgroundColor = color
    div.style.boxShadow = "0 0 " + size + "px " + (size/5) + "px " + color
    div.hidden = true;
    div.mass = mass
    
    return div
}

function createParticlesIfAvailable(name) {
    var min = Math.min(resources[name] - activeParticles[name], 10)

    var data = particleData[name]

    for (var i = 0; i < min; i++) {
        var part = createParticle(data.color, data.size, data.mass)

        part.velocity = resources.velocity * (0.95 + Math.random()/10)
        part.name = name

        display.appendChild(part)
        
        particlesToDrift.push(part)
    }

    activeParticles[name] += min
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

function ceil(number, whichPlace) {
    return Math.ceil(number*whichPlace)/whichPlace
}
  
window.requestAnimationFrame(loop)