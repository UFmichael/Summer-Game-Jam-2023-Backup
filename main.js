var display, mainParticle
var displayData
var lastRender = 0

var collisionSpeed = 500

var mainParticleSize = 25
var clickParticleMass = 1

var mass_doc, energy_doc, velocity_doc

var particleData = {
    alpha: {
        color: "#ffff00",
        size: 10,
        mass: 1,
        symbol: "α",
    },
    beta: {
        color: "#00ff00",
        size: 12,
        mass: 10,
        symbol: "β",
    },
    gamma: {
        color: "#ff00ff",
        size: 15,
        mass: 50,
        symbol: "γ",
    },
    delta: {
        color: " #a6ff00",
        size: 16,
        mass: 100,
        symbol: "δ",
    }
}

var milestoneData = {
    vel1: {
        bought: false,
        cost: 50,
        unlockCost: 25,
        unit: "kg",
        resource: "mass",
        title: "Give it a little nudge",
        description: "Increase velocity by 1 m/s",
        img: "tempimg.png",
        imgWidth: "60px",
        prereqs: [],
    },
    alpha1: {
        bought: false,
        cost: 35,
        unlockCost: 10,
        unit: "Alpha Particles",
        resource: "alpha",
        title: "A worthy sacrifice",
        description: "Double the mass of alpha particles",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: [],
    },
    click1: {
        bought: false,
        cost: 150,
        unlockCost: 100,
        unit: "kg",
        resource: "mass",
        title: "Clicking v2.0",
        description: "Double the mass generated by clicking",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: [],
    },
    vel2: {
        bought: false,
        cost: 650,
        unlockCost: 100,
        unit: "kg",
        resource: "mass",
        title: "Give it a slightly bigger nudge",
        description: "Increase velocity by 1 m/s",
        img: "tempimg.png",
        imgWidth: "60px",
        prereqs: ["vel1"],
    },
}

const milestoneFunctions = {
    vel1: () => resources.velocity++,
    alpha1: () => particleData.alpha.mass *= 2,
    click1: () => clickParticleMass *= 2,
    vel2: () => resources.velocity++,
}

var resources = {
    mass: 0,
    velocity: 0,
    lightspeed: 299792458,
    alpha: 0,
    beta: 0,
    gamma: 0,
    delta: 0,
}

var activeParticles = {
    alpha: 0,
    beta: 0,
    gamma: 0,
    delta: 0,
}

var costQuant = {
    u1: 0,
    u2: 0,
    u3: 0,
    u4: 0,
}

var costData = {
    _u1: () => 10 * Math.pow(1.1, costQuant.u1),
    u1: 10,
    _u2: () => 80 * Math.pow(1.12, costQuant.u2),
    u2: 80,
    _u3: () => 200 * Math.pow(1.15, costQuant.u3),
    u3: 200,
    _u4: () => 1000 * Math.pow(1.19, costQuant.u4),
    u4: 1000,
}

var kineticEnergy = (mass=resources.mass, velocity=resources.velocity) => 0.5 * mass * velocity * velocity;
var invKineticEnergy = (energyInput, velocity=resources.velocity) => 2*energyInput/(velocity*velocity); 

var restEnergy = (mass, c) => mass * c * c;

var energy = kineticEnergy;

var particlesToCollide = []
var particlesToDrift = []

var garbageBin;

var allParticles;
var allResources;

var allMilestones;
var buyableMilestones;

window.onload = function() {
    display = document.getElementById("particle_display")
    mainParticle = document.getElementById("main_particle")

    displayData = getComputedStyle(display)

    mass_doc = document.getElementById("mass")
    energy_doc = document.getElementById("energy")
    velocity_doc = document.getElementById("velocity")

    allParticles = Object.keys(particleData)
    allResources = Object.keys(resources)
    allMilestones = Object.keys(milestoneData)
    buyableMilestones = Object.keys(milestoneData)

    mainParticle.style.width = mainParticleSize + "px";
    mainParticle.style.height = mainParticleSize + "px";

    initializeParticleShopHTML()
    initializeMilestoneHTML()

    displayLightspeed()

    const clickableElements = document.getElementsByClassName("clickable")

    for (var i = 0; i < clickableElements.length; i++) {
        clickableElements[i].addEventListener("click", onClick, false)
    }

    updateButtonText()

    if (typeof(garbageBin) === 'undefined') {
        garbageBin = document.createElement('div');
        garbageBin.style.display = 'none';
        document.body.appendChild(garbageBin);
    }
}

function discardElement(element) {
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

    unlockMilestones("mass")
}

function updateDisplayBoard(deltaTime) {
    let removeAfter = []

    var cData = mainParticle.getBoundingClientRect()

    var x1 = 100*(cData.x+12)/displayData.width.replace("px", "")
    var y1 = 100*((cData.y+25)-display.offsetTop)/displayData.height.replace("px", "")

    for (var i = 0; i < particlesToCollide.length; i++) {
        var particle = particlesToCollide[i]

        var box = particle.getBoundingClientRect()
        
        var x0 = 100 * box.x / displayData.width.replace("px", "")
        var y0 = 100 * (box.y-display.offsetTop)/displayData.height.replace("px", "")

        var vect = {x: x1 - x0, y: y1 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (mag <= 1) {
            removeAfter.push(particle)
            resources.mass += particle.mass
        } else {
            vect.x *= collisionSpeed/mag
            vect.y *= collisionSpeed/mag

            particle.style.left = 100*(vect.x * deltaTime)/displayData.width.replace("px", "") + parseFloat(particle.style.left.replace("%", "")) + "%"
            particle.style.top = 100*(vect.y * deltaTime)/displayData.height.replace("px", "") + parseFloat(particle.style.top.replace("%", "")) + "%"

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

    createParticlesIfAvailable()

    var diff = 100*getComputedStyle(mainParticle).width.replace("px", "")/Math.min(displayData.width.replace("px", ""),displayData.height.replace("px", ""))

    for (var i = 0; i < particlesToDrift.length; i++) {
        var particle = particlesToDrift[i] 

        var x0 = parseFloat(particle.style.left.replace("%", ""))
        var y0 = parseFloat(particle.style.top.replace("%", ""))

        var vect = {x: x1 - x0, y: y1 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (y0 <= y1 + diff/2 && y0 >= y1 - diff/2 && x0 <= 50) {
            removeAfter.push(particle)
            resources.mass += particle.mass
            console.log(particle.mass)
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

    if (mult > 1) {
        mainParticle.style.width = mainParticleSize * mult + "px";
        mainParticle.style.height = mainParticleSize * mult + "px";
    }
}

function initializeParticleShopHTML() {
    let container = document.getElementById("particle_shop")

    for (var i = 0; i < allParticles.length; i++) {
        let name = allParticles[i]

        let button = document.createElement("button")

        button.id = "particle_upgrade" + (i+1)
        button.className = "clickable particle_shop_button"

        button.addEventListener("mousemove", hoverParticleShopEvent)
        button.addEventListener("mouseover", hoverParticleShopEvent)
        button.addEventListener("scroll", hoverParticleShopEvent)

        container.appendChild(button)

        let div = document.createElement("div")
        div.id = button.id + "_"
        div.className = "hoverable"

        div.appendChild(document.createElement("div"))

        let div2 = document.createElement("div")
        div2.className = "p_shop_hover_text"

        div.appendChild(div2)

        container.appendChild(div)
    }
}

function initializeMilestoneHTML() {
    let container = document.getElementById("milestone_upgrades")

    for (var i = 0; i < allMilestones.length; i++) {
        let name = allMilestones[i]
        let data = milestoneData[name]

        let button = document.createElement("button")

        button.id = name
        button.className = "clickable milestone_button"
        button.hidden = true

        button.addEventListener("mouseover", hoverMilestoneEvent)
        button.addEventListener("mousemove", hoverMilestoneEvent)

        let img1 = document.createElement("img")

        img1.src = data.img
        img1.style.width = data.imgWidth
        img1.style.height = "auto"
        img1.className = "img"

        button.appendChild(img1)

        container.appendChild(button)

        let div = document.createElement("div")
        div.id = name + "_"
        div.className = "hoverable"

        let img2 = document.createElement("img")

        img2.src = data.img
        img2.style.width = "60px"
        img2.style.height = "auto"

        div.appendChild(img2)
        div.appendChild(document.createElement("div"))

        container.appendChild(div)
    }
}

function draw() {

}

function displayLightspeed() {
    document.getElementById("c").innerHTML = "c = " + resources.lightspeed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " m/s"
}

function onClick(event) {
    var id = event.currentTarget.id
    var cls = event.currentTarget.classList

    if (id == "main_particle") {
        var part = createManualParticle("#ffffff", 10, clickParticleMass)
        
        display.appendChild(part)

        particlesToCollide.push(part)
    } else if (id.slice(0, 16) == "particle_upgrade") {
        let names = allParticles
        let costs = Object.values(costData)

        let i = parseInt(id.slice(16))-1
        
        if (energy(resources.mass, resources.velocity) >= costs[2*i+1]) {
            resources.mass -= invKineticEnergy(costs[2*i+1], resources.velocity)
            resources[names[i]]++
            costQuant["u" + (i+1)]++
            costData["u" + (i+1)] = costData["_u" + (i+1)]()

            unlockMilestones(names[i])
        }
    } else if (cls[1] == "milestone_button") {
        milestoneUpgrade(id)
    }

    updateButtonText()
}

function milestoneUpgrade(id) {
    let data = milestoneData[id]
    let resource = data.resource

    if (resource == "energy" && energy() >= data.cost) {
        resources["mass"] -= invKineticEnergy(data.cost)
    }
    else if (resources[resource] >= data.cost) {
        resources[resource] -= data.cost
    }
    else {
        return;
    }

    data.bought = true
    buyableMilestones.splice(buyableMilestones.indexOf(id), 1)

    document.getElementById(id).hidden = true
    checkUnlockAllMilestones()

    milestoneFunctions[id]()
}

function getMilestoneHoverer(id) {
    return document.getElementById(id + "_")
}

function checkUnlockAllMilestones() {
    for (var i = 0; i < allResources.length; i++)
        unlockMilestones(allResources[i])

    unlockMilestones("energy")
}

function unlockMilestones(resource) {
    var size = buyableMilestones.length

    prereqMet:
    for (var i = 0; i < size; i++) {
        let name = buyableMilestones[i]

        let data = milestoneData[name]
        
        if (data.resource == resource && ((resource == "energy" && energy() >= data.unlockCost) || resources[resource] >= data.unlockCost)) {
            var prereqs = data.prereqs
            
            for (var r = 0; r < prereqs.length; r++)
                if (!milestoneData[prereqs[r]].bought)
                    continue prereqMet

            let elm = document.getElementById(name)
            elm.getElementsByTagName("img")[0].src = data.img

            elm.hidden = false
        }
    }
}

function updateMilestoneDisplay(elm) {
    let id = elm.id

    let name = id.slice(0, -1)
    let data = milestoneData[name]

    let img = elm.getElementsByTagName("img")[0]

    img.src = data.img

    elm.getElementsByTagName("div")[0].innerHTML = "<br><b>" + data.title + "</b><br><br>" + data.description + "<br><br>" + "Cost: " + numDisplay(data.cost) + " " + data.unit
}

function updateButtonText() {
    let updateMassCost = true
    let massCost = "∞"
    let costs = Object.values(costData)

    if (resources.velocity == 0)
        updateMassCost = false
    
    for (var i = 0; i < allParticles.length; i++) {
        let cost = numDisplay(costs[2*i+1])
        let name = allParticles[i]

        if (updateMassCost) {
            massCost = numDisplay(invKineticEnergy(cost, resources.velocity))
        }

        document.getElementById("particle_upgrade" + (i+1)).innerHTML = name.charAt(0).toUpperCase() + name.slice(1) + " Particles<br>("+resources[name]+")<br>" +cost+ " J / " + massCost + " kg"
    }
}

function createManualParticle(color, size, mass) {
    let div = document.createElement('div');

    var angle = Math.round(Math.random() * 100);

    div.style.top = (-Math.ceil(100*size/getComputedStyle(display).height.replace("px", ""))) + "%"
    div.style.left = (angle-2*size/getComputedStyle(display).width.replace("px", ""))+"%"
    div.style.width = size + "px"
    div.style.height = size + "px"
    div.mass = mass
    div.style.backgroundColor = color
    div.style.boxShadow = "0 0 " + size + "px " + (size/5) + "px " + color

    div.className = "particle"
    
    return div
}

function createParticle(color, size, mass) {
    let div = document.createElement('div');

    var angle = Math.round(Math.random() * 100);

    div.style.left = "100%"
    div.style.top = (angle-2*size/getComputedStyle(display).height.replace("px", ""))+"%"
    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.backgroundColor = color
    div.style.boxShadow = "0 0 " + size + "px " + (size/5) + "px " + color
    div.hidden = true;
    div.mass = mass

    div.className = "particle"
    
    return div
}

function createStaticParticle(type, div) {
    data = particleData[type]
    
    div.className = "static_particle"

    let size = 25

    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.backgroundColor = data.color
    div.style.boxShadow = "0 0 " + size + "px " + "3px " + data.color
}

function createParticlesIfAvailable() {
    for (var j = 0; j < allParticles.length; j++) {
        var name = allParticles[j]
        
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

function toExp(number, digits) {
    return number.toExponential(digits)
}

function numDisplay(number) {
    if (number < 10000)
        return ceil(number, 100);
    else
        return toExp(number, 2);
}

function hoverMilestoneEvent(e){

    var left  = e.clientX  + "px";
    var top  = e.clientY  + "px";

    var div = document.getElementById(e.currentTarget.id +"_");

    updateMilestoneDisplay(div)

    div.style.left = left;
    div.style.top = top;

    return false;
}

function hoverParticleShopEvent(e){
    let id = e.currentTarget.id

    let i = parseInt(id.slice(16))-1

    var div = document.getElementById(id +"_");

    let nodes = div.getElementsByTagName("div")

    createStaticParticle(allParticles[i], nodes[0])

    nodes[1].innerHTML = particleData[allParticles[i]].mass + " kg"

    var left  = e.currentTarget.getBoundingClientRect().x + e.currentTarget.getBoundingClientRect().width + 5+ "px"
    var top  = e.clientY  + "px";

    div.style.left = left;
    div.style.top = top;

    return false;
}

window.requestAnimationFrame(loop)