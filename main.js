var resources = {
    mass: 0,
    velocity: 0,
    time: 1,
    lTime: 1,
    lightspeed: 299792458,
    accelMass: 0,
    minAccelMass: 10,
    friction: 0,
    blackholes: 0,
    lp: 0,
    resetNum: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
    delta: 0,
    epsilon: 0,
    zeta: 0,
    eta: 0,
}

var activeParticles = {
    alpha: 0,
    beta: 0,
    gamma: 0,
    delta: 0,
    epsilon: 0,
    zeta: 0,
    eta: 0,
}

var costFunc = {
    alpha: () => 10 * Math.pow(1.1, resources.alpha),
    beta: () => 100 * Math.pow(1.12, resources.beta),
    gamma: () => 1e3 * Math.pow(1.17, resources.gamma),
    delta: () => 1e5 * Math.pow(1.21, resources.delta),
    epsilon: () => 1e7 * Math.pow(1.28, resources.epsilon),
    zeta: () => 1e10 * Math.pow(1.35, resources.zeta),
    eta: () => 1e13 * Math.pow(1.4, resources.eta),
}

var costs = {
    alpha: costFunc.alpha(),
    beta: costFunc.beta(),
    gamma: costFunc.gamma(),
    delta: costFunc.delta(),
    epsilon: costFunc.epsilon(),
    zeta: costFunc.zeta(),
    eta: costFunc.eta(),
}

var sounds = {
    mainClick: null,
    shopClick: null,
}

var loadComplete = false

var display, mainParticle
var displayData
var lastRender = 0

var collisionSpeed = 500

var mainParticleSize = 25

var clickParticleMass = 1

var relativityUnlocked = false

var pClickNum = 1

var particleCap = 35
var speedCap = 7

var autoClickTime = 0
var curClickTime = 0

var particleObjST = []

var registerChange = false

var maxFriction = 1
var autoMassPerc = 0

var isCapped = true

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context;

var mass_doc, energy_doc, velocity_doc, time_doc, mvengine_doc, blackhole_doc, lp_doc
var canvas
var ctx

var lastDisplayRender = 0

var kineticEnergy = (mass=resources.mass, velocity=resources.velocity) => 0.5 * mass * velocity * velocity;
var invKineticEnergy = (energyInput=kineticEnergy(), velocity=resources.velocity) => 2*energyInput/(velocity*velocity); 

var lorentz = (v=resources.velocity,c=resources.lightspeed) => 1/Math.sqrt(1 - Math.pow(v/c, 2))

var restEnergy = (mass=resources.mass, velocity=resources.velocity, c=resources.lightspeed) => mass * c * c * lorentz(velocity, c);
var invRestEnergy = (energyInput=restEnergy(), c=resources.lightspeed, velocity=resources.velocity) => energyInput / (c * c * lorentz(velocity, c))

var energy = kineticEnergy;
var invEnergy = invKineticEnergy

var energyText = "E = &frac12*mv<sup>2</sup>"

var mvEngineFormula = (subMass, energyI=energy(), mass=resources.mass,velocity=resources.velocity) => Math.sqrt(2*energyI/(mass - subMass)) - velocity

var particlesToCollide = []

var garbageBin;

var allParticles;
var allResources;

var allMilestones;
var buyableMilestones;

var unlockedBuyableMilestones = [];

var engineUnlocked = false

var buttonUpdateTimer = 0
var buttonUpdateMaxTime = 500

var allUpgrades

var allPrestige1;
var allPrestige2;

window.onload = function() {
    display = document.getElementById("particle_display")
    mainParticle = document.getElementById("main_particle")

    displayData = getComputedStyle(display)

    mass_doc = document.getElementById("mass")
    energy_doc = document.getElementById("energy")
    velocity_doc = document.getElementById("velocity")
    time_doc = document.getElementById("time")
    mvengine_doc = document.getElementById("mvengine")
    blackhole_doc = document.getElementById("blackholes")
    lp_doc = document.getElementById("lp")

    canvas = document.getElementById("canvas")
    ctx = canvas.getContext("2d")

    allParticles = Object.keys(particleData)
    allResources = Object.keys(resources)

    particleShopDoublingUpgradeInit()

    allMilestones = Object.keys(milestoneData)
    buyableMilestones = Object.keys(milestoneData)

    allPrestige1 = Object.keys(prestige1Data)
    allPrestige2 = Object.keys(prestige2Data)

    allUpgrades = allMilestones.concat(allPrestige1)
    allUpgradeData = Object.assign(milestoneData, prestige1Data)

    mainParticle.style.width = mainParticleSize + "px";
    mainParticle.style.height = mainParticleSize + "px";

    initializeParticleShopHTML()
    initializeMilestoneHTML()
    initializePrestige1MilestoneHTML()
    initializePrestige2MilestoneHTML()

    context = new AudioContext()
    setAudioBuffers()

    displayLightspeed()

    for (var i = 0; i < allParticles.length; i++)
        particleObjST[allParticles[i]] = []

    document.getElementById("energyform").innerHTML = energyText

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

    loadComplete = true
}

function discardElement(element) {
    garbageBin.appendChild(element);

    garbageBin.innerHTML = "";
}

function update(deltaTime) {
    numberUpdates(deltaTime)
}

function displayUpdate() {
    let time = "Time: "

    if (relativityUnlocked)
        time = "Rest Time: "

    tempFr = maxFriction

    if (prestige2Data.p5.bought)
            tempFr *= resources.lp + 1

    mass_doc.innerHTML = "Mass: " + numDisplay(resources.mass) + " kg"
    energy_doc.innerHTML = "Energy: " + numDisplay(energy()) + " J"
    velocity_doc.innerHTML = "Velocity: " + numDisplay(resources.velocity) + " m/s"
    time_doc.innerHTML = time + numDisplay(resources.time) + " s/s"
    mvengine_doc.innerHTML = "M.V. Engine:<font color=\"red\"> Active</font><br>   Usage: " + resources.accelMass + " kg/s<br>   Minimum Mass: " + resources.minAccelMass + " kg<br>   Efficiency: " + numDisplay(100*(1-resources.friction)) + "%"
    blackhole_doc.innerHTML = "Black Holes: " + numDisplay(resources.blackholes)
    lp_doc.innerHTML = "LP: " + numDisplay(resources.lp)

    if (tempFr >= 0)
        mvengine_doc.innerHTML += "<br>   Efficiency Cap: " + numDisplay(tempFr) + " (m/s)/kg"
    
    if (resources.accelMass == 0) {
        mvengine_doc.hidden = true
    }

    if (resources.blackholes == 0) {
        blackhole_doc.hidden = true
    }

    if (resources.lp == 0) {
        lp_doc.hidden = true
    }
}

function numberUpdates(deltaTime) {
    updateAutoMass(deltaTime)
    updateVelocity(deltaTime)

    resources.lTime = resources.time

    unlockMilestones("mass")
    unlockMilestones("energy")
    unlockPrestigeMilestones("energy")

    updateMilestoneAvailability()

    unlockRelativity()
    updateRelativity()

    if (resources.velocity >= resources.lightspeed)
        onCReached()
}

function updateAutoMass(deltaTime) {
    if (autoMassPerc != 0) {
        let totalShopMass = 0

        for (var i = 0; i < allParticles.length; i++) {
            let name = allParticles[i]
            
            totalShopMass += resources[name] * particleData[name].mass
        }

        resources.mass += totalShopMass * autoMassPerc * deltaTime
    }
}

function onCReached() {
    document.getElementById("main").style.display = "none"
    document.getElementById("final").style.display = "grid"

    document.getElementById("finalButton").innerHTML = "Reset and gain " + (resources.resetNum+1) + " LP"
}

function onLightspeedReset() {
    resources.lightspeed *= 2

    document.getElementById("main").style.display = "grid"
    document.getElementById("final").style.display = "none"

    if (!prestige2Data.p2.bought)
        lockRelativity()

    resources.lTime = resources.time

    displayLightspeed()

    resources.lp += ++resources.resetNum

    basicPrestigeReset(100)

    lp_doc.hidden = false

    for (var i = 0; i < allPrestige2.length; i++) {
        document.getElementById(allPrestige2[i]).style.visibility = "visible"
    }

    for (var i = 0; i < particlesToCollide.length; i++)
        discardElement(particlesToCollide[i])

    particlesToCollide = []
}

function updateMilestoneAvailability() {
    for (var i = 0; i < unlockedBuyableMilestones.length; i++) {
        let name = unlockedBuyableMilestones[i]
        
        if (isMilestoneBuyable(name)) {
            document.getElementById(name).style.backgroundColor = null
        }
        else {
            document.getElementById(name).style.backgroundColor = "#949494"
        }
    }
}

function updateVelocity(deltaTime) {
    let subMass = resources.accelMass * deltaTime * resources.lTime

    if (subMass != 0 && resources.mass >= resources.minAccelMass && resources.mass >= subMass) {
        engineUnlocked = true
        
        let net = mvEngineFormula(subMass)
        let ratio = net / subMass

        let tempFr = maxFriction;

        if (prestige2Data.p5.bought)
            tempFr *= resources.lp + 1

        if (maxFriction < 0) {
            resources.friction = 0
        }
        else {
            resources.friction = Math.min(ratio/tempFr, 1)
        }

        resources.velocity += net * (1 - resources.friction)
        resources.mass -= subMass
    }

    unlockMilestones("velocity")
}

function initializeParticleShopHTML() {
    let container = document.getElementById("particle_shop")

    for (var i = 0; i < allParticles.length; i++) {
        let button = document.createElement("button")

        button.id = "particle_upgrade" + (i+1)
        button.className = "clickable particle_shop_button"

        if (i != 0)
            button.style.visibility = "hidden"

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

        img1.src = "assets/images/" + data.img
        img1.style.width = data.imgWidth
        img1.style.height = "auto"
        img1.className = "img"

        button.appendChild(img1)

        container.appendChild(button)

        let div = document.createElement("div")
        div.id = name + "_"
        div.className = "hoverable"

        let img2 = document.createElement("img")

        img2.src = "assets/images/" + data.img
        img2.style.width = "60px"
        img2.style.height = "auto"

        div.appendChild(img2)
        div.appendChild(document.createElement("div"))

        container.appendChild(div)
    }
}

function initializePrestige1MilestoneHTML() {
    let container = document.getElementById("prestige1")

    for (var i = 0; i < allPrestige1.length; i++) {
        let name = allPrestige1[i]
        let data = prestige1Data[name]

        let button = document.createElement("button")

        button.id = name
        button.className = "clickable prestige_button"
        button.style.visibility = "hidden"

        button.addEventListener("mouseover", hoverPrestigeMilestoneEvent)
        button.addEventListener("mousemove", hoverPrestigeMilestoneEvent)

        let img1 = document.createElement("img")

        img1.src = "assets/images/" + data.img
        img1.style.width = data.imgWidth
        img1.style.height = "auto"
        img1.className = "img"

        button.appendChild(img1)

        container.appendChild(button)

        let div = document.createElement("div")
        div.id = name + "_"
        div.className = "hoverable"

        let img2 = document.createElement("img")

        img2.src = "assets/images/" + data.img
        img2.style.width = "60px"
        img2.style.height = "auto"

        div.appendChild(img2)
        div.appendChild(document.createElement("div"))

        container.appendChild(div)
    }
}

function initializePrestige2MilestoneHTML() {
    let container = document.getElementById("b_border")

    for (var i = 0; i < allPrestige2.length; i++) {
        let name = allPrestige2[i]
        let data = prestige2Data[name]

        let button = document.createElement("button")

        button.id = name
        button.className = "clickable prestige2_button"
        button.style.visibility = "hidden"

        button.addEventListener("mouseover", hoverPrestige2MilestoneEvent)
        button.addEventListener("mousemove", hoverPrestige2MilestoneEvent)

        let img1 = document.createElement("img")

        img1.src = "assets/images/" + data.img
        img1.style.width = data.imgWidth
        img1.style.height = "auto"
        img1.className = "img"

        button.appendChild(img1)

        container.appendChild(button)

        let div = document.createElement("div")
        div.id = name + "_"
        div.className = "hoverable"

        let img2 = document.createElement("img")

        img2.src = "assets/images/" + data.img
        img2.style.width = "60px"
        img2.style.height = "auto"

        div.appendChild(img2)
        div.appendChild(document.createElement("div"))

        container.appendChild(div)
    }
}

function particleShopDoublingUpgradeInit() {
    for (var i = 0; i < allParticles.length; i++) {
        let name = allParticles[i]
        let capName = name.charAt(0).toUpperCase() + name.slice(1)
        
        milestoneData[name + "1"] = {
            bought: false,
            cost: 35,
            unlockCost: 1,
            unit: capName + " Particles",
            resource: name,
            title: capName + " Quality Control",
            description: "Double mass of " +name+ " particles",
            img: capName + "_upgrade_reduce.png",
            imgWidth: "60px",
            prereqs: [],
        }

        milestoneFunctions[name + "1"] = () => { particleData[name].mass *= 2; removeAllParticles(name); costs[name] = costFunc[name]()}

        for (var j = 2; j < 5; j++) {
            milestoneData[name + j] = 
            {
                bought: false,
                cost: 35 + j - 1,
                unlockCost: 35 + j - 2,
                unit: capName + " Particles",
                resource: name,
                title: capName + " Quality Control v." + j,
                description: "Double mass of " +name+ " particles",
                img: capName + "_upgrade_reduce.png",
                imgWidth: "60px",
                prereqs: [name + (j-1)],
            }

            milestoneFunctions[name + j] = () => { particleData[name].mass *= 2; removeAllParticles(name); costs[name] = costFunc[name]()}
        }
    }
}

function setParticleButtonVisibility(name, visibility) {
    var i = allParticles.indexOf(name)

    document.getElementById("particle_upgrade" + (i+1)).style.visibility = visibility
}

function draw(deltaTime) {
    canvas.width = canvas.getBoundingClientRect().width
    canvas.height = canvas.getBoundingClientRect().height

    var cData = mainParticle.getBoundingClientRect()
    
    var dWidth = displayData.width.replace("px", "")
    var dHeight = displayData.height.replace("px", "")

    var x1 = 100*(cData.x+12)/dWidth
    var y1 = 100*((cData.y+25)-display.offsetTop)/dHeight

    const pi2 = Math.PI * 2;

    let leny = particlesToCollide.length

    ctx.beginPath()

    for (var i = 0; i < leny; i++) {
        var particle = particlesToCollide[i]

        ctx.fillStyle = particle.color
        
        var x0 = particle.left
        var y0 = particle.top

        var vect = {x: x1 - x0, y: y1 - y0}
        var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)

        if (mag <= 1) {
            resources.mass += particle.mass

            particlesToCollide.splice(i, 1)
    
            i--
            leny--
        } else {
            vect.x *= collisionSpeed/mag
            vect.y *= collisionSpeed/mag

            particle.left += 100*(vect.x * deltaTime)/dWidth
            particle.top += 100*(vect.y * deltaTime)/dHeight

            ctx.moveTo(particle.left*dWidth/100 + particle.size/2,particle.top*dHeight/100)
            ctx.arc( particle.left*dWidth/100, particle.top*dHeight/100, particle.size/2, 0, pi2)
        }
    }

    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    
    createParticleObjectsIfAvailable()

    var diff = 100*getComputedStyle(mainParticle).height.replace("px", "")/displayData.height.replace("px", "")

    let temp = display.style.maxWidth

    display.style.maxWidth = "100%"

    let lenS = allParticles.length

    for (var p = 0; p < lenS; p++) {
        let name = allParticles[p]

        ctx.shadowBlur = particleData[name].size/4
        ctx.shadowColor = particleData[name].color
        
        ctx.fillStyle = particleData[name].color
        ctx.beginPath()

        let len = particleObjST[name].length

        for (var i = 0; i < len; i++) {
            var particle = particleObjST[name][i]
    
            var x0 = particle.left
            var y0 = particle.top
    
            var vect = {x: x1 - x0, y: y1 - y0}
            var mag = Math.sqrt(vect.x * vect.x + vect.y * vect.y)
            
            if (x0 < 0) {
                particle.left = 100
                particle.top = Math.round(Math.random() * 100)
            } else {
                if (particle.velocity/0.93 < resources.velocity || particle.velocity/1.07 > resources.velocity) {
                    particle.velocity = resources.velocity * (0.93 + 14*Math.random()/100)
                }
    
                let left = (-50*collisionSpeed*Math.min(particle.velocity * resources.lTime, speedCap) * deltaTime /displayData.width.replace("px", "") + x0)
                
                if (y0 <= y1 + diff/2 && y0 >= y1 - diff/2 && left <= 50) {
                    resources.mass += particle.mass
                    activeParticles[particle.name]--
    
                    particleObjST[name].splice(i, 1)
    
                    i--
                    len--
                }
                else {
                    if (particle.wait)
                        particle.wait = false
                    else
                        particle.left = left
                    
                    ctx.moveTo(particle.left*dWidth/100 + particle.size/2,particle.top*dHeight/100)
                    ctx.arc( particle.left*dWidth/100, particle.top*dHeight/100, particle.size/2, 0, pi2)
                }
            }
        }

        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }

    display.style.maxWidth = temp

    var mult = Math.sqrt(Math.log(resources.mass)/Math.log(10) + 1)

    if (mult > 1) {
        mainParticle.style.width = mainParticleSize * mult + "px";
        mainParticle.style.height = mainParticleSize * mult + "px";
    }
}

function createParticleObjectsIfAvailable() {
    for (var j = 0; j < allParticles.length; j++) {
        var name = allParticles[j]

        let total;

        if (isCapped)
            total = resources[name]
        else
            total = Math.min(particleCap, resources[name])
        
        var min = Math.min(total - activeParticles[name], 10)

        var data = particleData[name]

        for (var i = 0; i < min; i++) {
            var part = createParticleObject(data.color, data.size, data.mass)

            part.velocity = resources.velocity * (0.93 + 14*Math.random()/100)
            part.name = name
            
            particleObjST[name].push(part)
        }

        activeParticles[name] += min
    }
}

function createParticleObject(color, size, mass) {
    let part = {};
    
    var angle = Math.round(Math.random() * 100)

    part.left = 100
    part.top = angle
    part.size = size
    part.color = color
    part.mass = mass
    part.wait = true
    
    return part
}

function displayLightspeed() {
    document.getElementById("c").innerHTML = "c = " + largeNumDisplay(resources.lightspeed) + " m/s"
}

function unlockRelativity(forceUnlock=false) {
    if (forceUnlock || (!relativityUnlocked && resources.velocity/resources.lightspeed >= 0.01)) {
        relativityUnlocked = true
        
        document.getElementById("lockedRelativity").style.display = "none"
        document.getElementById("relativityData").style.display = null

        energy = restEnergy
        invEnergy = invRestEnergy

        energyText = "E=γmc<sup>2</sup>"
        document.getElementById("energyform").innerHTML = energyText

        mvEngineFormula = (subMass, c=resources.lightspeed, m=resources.mass, v=resources.velocity) => c*Math.sqrt(1 - (1 - Math.pow(v/c, 2))*Math.pow(1-(subMass/m), 2)) - v
    }
}

function lockRelativity() {
    document.getElementById("lockedRelativity").style.display = null
    document.getElementById("relativityData").style.display = "none"

    relativityUnlocked = false

    energy = kineticEnergy
    invEnergy = invKineticEnergy
    document.getElementById("energyform").innerHTML = "E = &frac12*mv<sup>2</sup>"

    display.style.maxWidth = "100%"

    mvEngineFormula = (subMass, energyI=energy(), mass=resources.mass,velocity=resources.velocity) => Math.sqrt(2*energyI/(mass - subMass)) - velocity
}

function updateRelativity() {
    if (relativityUnlocked) {
        resources.lTime = resources.time / lorentz()
        
        let lor = document.getElementById("lorentz")

        lor.innerHTML = "Lorentz Factor (γ)<br><font size=\"4vmin\">(1 - (v/c)<sup>2</sup>)<sup>-&frac12</sup> = " + smallNumDisplay(lorentz()) + "</font>"

        let timeDoc = document.getElementById("timeDilation")

        timeDoc.innerHTML = "Time Dilation<br><font size=\"4vmin\">Diluted Time = " + smallNumDisplay(resources.lTime) + " s/s</font>"

        let lengthDoc = document.getElementById("lengthContraction")

        lengthDoc.innerHTML = "Length Contraction<br><font size=\"4vmin\">1 m / γ = " + smallNumDisplay(1/lorentz()) + " m</font>"

        display.style.maxWidth = 100/lorentz() + "%"
    } else {
        let div = document.getElementById("lockedRelativity")

        div.innerHTML = "Unlock Relativity<br>at 1% the speed of light<br><br>Currently: " + numDisplay(100*resources.velocity/resources.lightspeed) + "%"
    }
}

function setAudioBuffers() {
    loadClickSound("assets/audio/shortclick.mp3", "mainClick");
    loadClickSound("assets/audio/shopclick.wav", "shopClick");
}

function loadClickSound(url, name) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    // Decode asynchronously
    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            if (!buffer) {
                console.log('Error decoding file data: ' + url);
                return;
            }
        sounds[name] = buffer;
    });

    request.onerror = function() {
        console.log('BufferLoader: XHR error');        
    };
    };

    request.send();
}

function playSound(buffer, time, volume) {              
  var source = context.createBufferSource();  
  source.buffer = buffer;                     
  source.connect(context.destination);         
  var gainNode = context.createGain();          
  source.connect(gainNode);                    
  gainNode.connect(context.destination);       
  gainNode.gain.value = volume;                
  source.start(time);                     
}

function onClick(event) {
    var id = event.currentTarget.id
    var cls = event.currentTarget.classList

    if (id == "main_particle") {
        onMainClick()

        playSound(sounds["mainClick"], 0, 1)
    } else if (id.slice(0, 16) == "particle_upgrade") {
        let i = parseInt(id.slice(16))-1

        let name = allParticles[i]
        
        if (energy() >= costs[name] && (!isCapped || resources[name] < particleCap)) {
            resources.mass -= invEnergy(costs[name])
            
            if (++resources[name] == 5) {
                let nameIndex = allParticles.indexOf(name)

                if (nameIndex + 1 < allParticles.length)
                    setParticleButtonVisibility(allParticles[i+1], "visible")
            }

            costs[name] = costFunc[name]()

            unlockMilestones(name)
        }

        playSound(sounds["shopClick"], 0, 1)
    } else if (cls[1] == "milestone_button") {
        milestoneUpgrade(id)

        playSound(sounds["shopClick"], 0, 1)
    } else if (cls[1] == "prestige_button") {
        prestigeUpgrade(id)

        playSound(sounds["shopClick"], 0, 1)
    } else if (cls[1] == "prestige2_button") {
        prestige2Upgrade(id)

        playSound(sounds["shopClick"], 0, 1)
    }

    registerChange = true
}

function onMainClick() {
    for (var i = 0; i < pClickNum; i++) {
        var part = createManualParticle("#ffffff", 10, clickParticleMass)

        particlesToCollide.push(part)
    }
}

function isMilestoneBuyable(id) {
    let data = milestoneData[id]
    let resource = data.resource
    
    return (resource == "energy" && energy() >= data.cost) || (resources[resource] >= data.cost)
}

function milestoneUpgrade(id) {
    let data = milestoneData[id]
    let resource = data.resource

    if (resource == "energy" && energy() >= data.cost) {
        resources["mass"] -= invEnergy(data.cost)
    }
    else if (resources[resource] >= data.cost) {
        resources[resource] -= data.cost
    }
    else {
        return;
    }

    data.bought = true

    document.getElementById(id).hidden = true
    checkUnlockAllMilestones()

    milestoneFunctions[id]()

    unlockedBuyableMilestones.splice(unlockedBuyableMilestones.indexOf(id), 1)
}

function prestigeUpgrade(id) {
    let data = prestige1Data[id]
    let resource = data.resource
    let cost = data.unlockCost()

    if (ifReqMetOrNotOverclock(id) && ((resource == "energy" && energy() >= cost) || (resources != "energy" && resources[resource] >= cost))) {
        data.bought++

        prestige1Functions[id]()

        checkUnlockAllPrestige()

        updatePrestigeMilestoneDisplay(document.getElementById(id + "_"))

        document.getElementById(id).style.backgroundColor = "#949494"
    }
}

function prestige2Upgrade(id) {
    let data = prestige2Data[id]

    if (resources.lp >= data.cost && (data.max == 0 || data.bought < data.max)) {
        data.bought++

        resources.lp -= data.cost

        prestige2Functions[id]()

        checkUnlockAllPrestige()

        updatePrestige2MilestoneDisplay(document.getElementById(id + "_"))
    }
}

function ifReqMetOrNotOverclock(id) {
    return id != "overclock" || milestoneData.accel1.bought
}

function checkUnlockAllPrestige() {
    let names = allPrestige1
    
    for (var i = 0; i < names.length; i++) {
        let id = names[i]
        let data = prestige1Data[id]
        let resource = data.resource
        let cost = data.unlockCost()

        if (!ifReqMetOrNotOverclock(id) || ((resource == "energy" && energy() < cost) || (resources != "energy" && resources[resource] < cost))) {
            document.getElementById(id).style.backgroundColor = "#949494"
        }
        else {
            document.getElementById(id).style.backgroundColor = null
        }
    }

    names = allPrestige2
    
    for (var i = 0; i < names.length; i++) {
        let id = names[i]
        let data = prestige2Data[id]

        if (resources.lp < data.cost || (data.max != 0 && data.bought >= data.max)) {
            document.getElementById(id).style.backgroundColor = "#949494"
        }
        else {
            document.getElementById(id).style.backgroundColor = null
        }
    }
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

    let removeAfter = []

    prereqMet:
    for (var i = 0; i < size; i++) {
        let name = buyableMilestones[i]

        let data = milestoneData[name]

        let elm = document.getElementById(name)
        
        if (data.resource == resource && ((resource == "energy" && energy() >= data.unlockCost) || resources[resource] >= data.unlockCost)) {
            var prereqs = data.prereqs
            
            for (var r = 0; r < prereqs.length; r++)
                if (!milestoneData[prereqs[r]].bought)
                    continue prereqMet

            elm.getElementsByTagName("img")[0].src = "assets/images/" + data.img

            elm.hidden = false

            document.getElementById("milestone_upgrades").appendChild(elm)
            document.getElementById("milestone_upgrades").appendChild(getMilestoneHoverer(name))

            unlockedBuyableMilestones.push(name)

            removeAfter.push(name)
        }
    }

    for (var i = 0; i < removeAfter.length; i++) {
        buyableMilestones.splice(buyableMilestones.indexOf(removeAfter[i]), 1)
    }

    removeAfter = []
}

function unlockPrestigeMilestones(resource) {
    var size = allPrestige1.length

    prereqMet:
    for (var i = 0; i < size; i++) {
        let name = allPrestige1[i]
        let data = prestige1Data[name]

        let elm = document.getElementById(name)

        var prereqs = data.prereqs

        if (elm.style.visibility == "hidden") {
            for (var r = 0; r < prereqs.length; r++)
                    if (!allUpgradeData[prereqs[r]].bought)
                        continue prereqMet
        }

        elm.getElementsByTagName("img")[0].src = "assets/images/" + data.img

        elm.style.visibility = "visible"

        if (ifReqMetOrNotOverclock(name) && data.resource == resource && ((resource == "energy" && energy() >= data.unlockCost()) || resources[resource] >= data.unlockCost())) {
            elm.style.backgroundColor = null
        }
        else {
            elm.style.backgroundColor = "#949494"
        }
    }
}

function updateMilestoneDisplay(elm) {
    let id = elm.id

    let name = id.slice(0, -1)
    let data = milestoneData[name]

    let img = elm.getElementsByTagName("img")[0]

    img.src = "assets/images/" + data.img

    elm.getElementsByTagName("div")[0].innerHTML = "<br><b>" + data.title + "</b><br><br>" + data.description + "<br><br>" + "Cost: " + numDisplay(data.cost) + " " + data.unit

    if (data.hasOwnProperty("perm")) {
        elm.getElementsByTagName("div")[0].innerHTML += "<br><br><font color=\"#ca0000\">This upgrade will persist through " + prestige1Data[data.perm].name + " resets</font>"
    }
}

function updatePrestigeMilestoneDisplay(elm) {
    let id = elm.id

    let name = id.slice(0, -1)
    let data = milestoneData[name]

    let img = elm.getElementsByTagName("img")[0]

    img.src = "assets/images/" + data.img

    elm.getElementsByTagName("div")[0].innerHTML = "<br><b>" + data.title + "</b><br><br>" + data.description + "<br><br>" + data.costDesc + "<br><br>Requires " + numDisplay(data.unlockCost()) + " " + data.unit
}

function updatePrestige2MilestoneDisplay(elm) {
    let id = elm.id

    let name = id.slice(0, -1)
    let data = prestige2Data[name]

    let img = elm.getElementsByTagName("img")[0]

    img.src = "assets/images/" + data.img

    let db = elm.getElementsByTagName("div")[0]

    db.innerHTML = "<br><b>" + data.name + "</b><br><br>" + data.description + "<br><br>Cost: " + data.cost + " LP<br><br>Owned: " + data.bought

    if (data.max > 0) {
        db.innerHTML += " / " + data.max
    }
}

function updateButtonText() {
    let updateMassCost = true
    let massCost = "&#8734;"

    if (resources.velocity == 0)
        updateMassCost = false
    
    for (var i = 0; i < allParticles.length; i++) {
        let name = allParticles[i]
        let cost = costs[name]
    
        if (updateMassCost) {
            massCost = numDisplay(invEnergy(cost, resources.velocity))
        }

        let div = document.getElementById("particle_upgrade" + (i+1))

        if (div.style.visibility == "visible" || !div.hidden)
            div.innerHTML = name.charAt(0).toUpperCase() + name.slice(1) + " Particles<br>("+resources[name]+")" + ((isCapped) ? "<br>Cap: " + particleCap : "") + "<br>Realtime Speed Cap: " +speedCap + " m/s<br>" + numDisplay(cost)+ " J / " + massCost + " kg"
    }
}

function createManualParticle(color, size, mass) {
    let part = {};

    part.left = Math.round(Math.random() * 100)
    part.top = (Math.random() < 0.5) ? 0 : 100
    part.size = size
    part.color = color
    part.mass = mass
    
    return part
}

function createStaticParticle(type, div) {
    let data = particleData[type]
    
    div.className = "static_particle"

    let size = 25

    div.style.width = size + "px"
    div.style.height = size + "px"
    div.style.backgroundColor = data.color
    div.style.boxShadow = "0 0 " + size + "px " + "3px " + data.color
}

function removeAllParticles(name) {
    particleObjST[name] = []
}

function resetParticleShop() {
    for (var i = 0; i < allParticles.length; i++) {
        let name = allParticles[i]
        removeAllParticles(name)
        resources[name] = 0
        costs[name] = costFunc[name]()
    }
}

function resetAllMilestoneUpgrades(prestigeLayer) {
    buyableMilestones = Object.keys(milestoneData)
    
    for (var i = 0; i < allMilestones.length; i++) {
        let name = allMilestones[i]

        if (prestige2Data.p3.bought && (name.slice(0, -1) == "cap" || allParticles.includes(name.slice(0, -1)))) {
            if (milestoneData[name].bought) {
                buyableMilestones.splice(buyableMilestones.indexOf(name), 1)
                continue
            }
        }

        if (milestoneData[name].hasOwnProperty("perm")) {
            let permName = milestoneData[name].perm
            
            if (milestoneData[name].bought && ((permName == "overclock" && prestigeLayer == 0) || (permName == "blackhole" && prestigeLayer <= 1) || (permName == "amplifier" && prestigeLayer <= 2))) {
                buyableMilestones.splice(buyableMilestones.indexOf(name), 1)
            }
            else {
                milestoneData[name].bought = false
            }
        }
        else {
            milestoneData[name].bought = false
        }
    }

    for (var i = 0; i < unlockedBuyableMilestones.length; i++) {
        let name = unlockedBuyableMilestones[i]

        document.getElementById(name).hidden = true
    }

    unlockedBuyableMilestones = []
}

function resetAllParticleMass() {
    for (var i = 0; i < allParticles.length; i++) {
        particleData[allParticles[i]].mass = particleData[allParticles[i]].baseMass
    }
}

function basicPrestigeReset(prestigeLayer) {
    resetAllMilestoneUpgrades(prestigeLayer)
    
    if (!prestige2Data.p3.bought) {
        resetParticleShop()
        resetAllParticleMass()

        particleCap = 35
    }

    resources.mass = 0
    resources.velocity = 0
    resources.time = 1

    pClickNum = 1
    clickParticleMass = 1

    let resetPrestige = !prestige2Data.p1.bought

    if (prestigeLayer > 0) {
        if (!prestige2Data.p3.bought)
            isCapped = true
        
        if (resetPrestige) {
            resources.accelMass = 0
            resources.minAccelMass = 10
            
            prestige1Data.overclock.bought = 0
        }
    }

    if (milestoneData.vel1.bought) {
        milestoneFunctions.vel1()
    }

    if (prestigeLayer > 1) {    
        autoMassPerc = 0     

        if (resetPrestige) {
            resources.blackholes = 0
            prestige1Data.blackhole.bought = 0
        }
    }

    if (prestigeLayer > 2) {
        autoClickTime = 0

        if (resetPrestige) {
            maxFriction = 1
            prestige1Data.amplifier.bought = 0
        }
    }

    mainParticle.style.width = mainParticleSize
    mainParticle.style.height = mainParticleSize
    
    blackHoleUpdate(resources.blackholes)

    updateButtonText()

    checkUnlockAllPrestige()
}

function blackHoleUpdate(change) {
    let mult = Math.pow(10, change)
    
    resources.velocity *= mult
    resources.time /= mult
}

function loop(timestamp) {
    var delta = (timestamp - lastRender)
    
    if (delta > 16) {
        update(delta/1000)
        draw(delta/1000)
        lastRender = timestamp
    }
    
    if (autoClickTime != 0) {
        curClickTime += delta

        if (curClickTime >= autoClickTime) {
            curClickTime = 0

            onMainClick()
        }
    }

    if (timestamp - lastDisplayRender > 50) {
        lastDisplayRender = timestamp

        displayUpdate()

        if (registerChange) {
            updateButtonText()
            registerChange = false
        }
    }

    if (engineUnlocked) {
        buttonUpdateTimer += delta

        if (buttonUpdateTimer >= buttonUpdateMaxTime) {
            buttonUpdateTimer = 0

            updateButtonText()
        }
    }

    window.requestAnimationFrame(loop)
}

function preloop() {
    if (loadComplete)
        window.requestAnimationFrame(loop)
    else
        window.requestAnimationFrame(preloop)
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

function floor(number, whichPlace) {
    return Math.floor(number*whichPlace)/whichPlace
}

function toExp(number, digits) {
    return number.toExponential(digits)
}

function numDisplay(number) {
    numberA = Math.abs(number)
    
    if (numberA != 0 && (numberA < 0.01 || numberA >= 10000)) {
        let exp = Math.floor(Math.log10(numberA))
        let baseExp = Math.pow(10, exp)
        let base = floor(number/baseExp, 100)

        return base + "*10<sup>" +exp+ "</sup>"
    }
    else
        return floor(number, 100);
}

function smallNumDisplay(number) {
    numberA = Math.abs(number)
    
    if (numberA != 0 && (numberA < 0.001 || numberA >= 10000)) {
        let exp = Math.floor(Math.log10(numberA))
        let baseExp = Math.pow(10, exp)
        let base = floor(number/baseExp, 1000)

        return base + "*10<sup>" +exp+ "</sup>"
    }
    else
        return floor(number, 1000);
}

function largeNumDisplay(number) {
    numberA = Math.abs(number)
    
    if (numberA != 0 && (numberA < 1 || numberA >= 1e10)) {
        let exp = Math.floor(Math.log10(numberA))
        let baseExp = Math.pow(10, exp)
        let base = floor(number/baseExp, 100)

        return base + "*10<sup>" +exp+ "</sup>"
    }
    else
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
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

function hoverPrestigeMilestoneEvent(e){

    var left  = e.clientX  + "px";
    var top  = e.clientY  + "px";

    var div = document.getElementById(e.currentTarget.id +"_");

    updatePrestigeMilestoneDisplay(div)

    div.style.left = left;
    div.style.top = top;

    return false;
}

function hoverPrestige2MilestoneEvent(e){

    var left  = e.clientX  + "px";
    var top  = e.clientY  + "px";

    var div = document.getElementById(e.currentTarget.id +"_");

    updatePrestige2MilestoneDisplay(div)

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

window.requestAnimationFrame(preloop)

var particleData = {
    alpha: {
        color: "#ffff00",
        size: 10,
        baseMass: 1,
        mass: 1,
        symbol: "α",
    },
    beta: {
        color: "#00ff00",
        size: 12,
        baseMass: 10,
        mass: 10,
        symbol: "β",
    },
    gamma: {
        color: "#ff00ff",
        size: 15,
        baseMass: 80,
        mass: 80,
        symbol: "γ",
    },
    delta: {
        color: "#a6ff00",
        size: 16,
        baseMass: 560,
        mass: 560,
        symbol: "δ",
    },
    epsilon: {
        color: "#85fbff",
        size: 17,
        baseMass: 3000,
        mass: 3000,
        symbol: "ε",
    },
    zeta: {
        color: "#5c1100",
        size: 8,
        baseMass: 15000,
        mass: 15000,
        symbol: "ζ",
    },
    eta: {
        color: "#bf00ff",
        size: 14,
        baseMass: 50000,
        mass: 50000,
        symbol: "η",
    },
}

var milestoneData = {
    vel1: {
        bought: false,
        cost: 20,
        unlockCost: 0,
        unit: "kg",
        resource: "mass",
        title: "One small step",
        description: "Increase velocity by 1 m/s",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: [],
    },
    click1: {
        bought: false,
        cost: 50,
        unlockCost: 25,
        unit: "kg",
        resource: "mass",
        title: "Clicking v2.0",
        description: "Double mass generated by clicking",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: [],
    },
    click2: {
        bought: false,
        cost: 500,
        unlockCost: 100,
        unit: "kg",
        resource: "mass",
        title: "Clicking v3.0",
        description: "Double mass generated by clicking",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: ["click1"],
    },
    click1b: {
        bought: false,
        cost: 50,
        unlockCost: 25,
        unit: "kg",
        resource: "mass",
        title: "Double counting",
        description: "Increase the number of particles generated per click by 1",
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
        title: "Give it a big nudge",
        description: "Double the velocity",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel1"],
    },
    vel3: {
        bought: false,
        cost: 800,
        unlockCost: 700,
        unit: "kg",
        resource: "mass",
        title: "Low-mass gravitational slingshot",
        description: "Multiply velocity by 3 and divide the passage of time by 3",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel2"],
    },
    accel1: {
        bought: false,
        cost: 1200,
        unlockCost: 0,
        unit: "kg",
        resource: "mass",
        title: "Mass-Velocity Engine",
        description: "Every second, convert 0.1 kg to velocity such that energy does not change. Requires a minimum of 10 kg",
        //img: "tempimg.png",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel2"],
        perm: "overclock"
    },
    cap1: {
        bought: false,
        cost: 1.00e5,
        unlockCost: 6.00e4,
        unit: "J",
        resource: "energy",
        title: "Better caps",
        description: "Increase all particle caps by 1",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: [],
    },
    cap2: {
        bought: false,
        cost: 1.00e7,
        unlockCost: 6.00e6,
        unit: "J",
        resource: "energy",
        title: "Even better caps",
        description: "Increase all particle caps by 1",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: ["cap1"],
    },
    cap3: {
        bought: false,
        cost: 1.00e9,
        unlockCost: 6.00e8,
        unit: "J",
        resource: "energy",
        title: "The best caps",
        description: "Increase all particle caps by 1",
        img: "tempimg2.png",
        imgWidth: "60px",
        prereqs: ["cap2"],
    },
    time1: {
        bought: false,
        cost: 1.00e6,
        unlockCost: 9.50e5,
        unit: "J",
        resource: "energy",
        title: "Universal impatience",
        description: "Multiply the passage of time by 3",
        img: "time.png",
        imgWidth: "60px",
        prereqs: [],
    },
    vel4: {
        bought: false,
        cost: 2000,
        unlockCost: 1000,
        unit: "kg",
        resource: "mass",
        title: "Positive work environment",
        description: "Multiply velocity by 2 and divide the passage of time by 1.8",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel3"],
    },
    vel5: {
        bought: false,
        cost: 5e4,
        unlockCost: 1e4,
        unit: "kg",
        resource: "mass",
        title: "Medium-mass gravitational slingshot",
        description: "Multiply velocity by 3 and divide the passage of time by 3.2",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel4"],
    },
    vel6: {
        bought: false,
        cost: 2e5,
        unlockCost: 4e4,
        unit: "kg",
        resource: "mass",
        title: "High-mass gravitational slingshot",
        description: "Multiply velocity by 4 and divide the passage of time by 5",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["vel5"],
    },
    auto1: {
        bought: false,
        cost: 4000,
        unlockCost: 1500,
        unit: "kg",
        resource: "mass",
        title: "Auto clicker",
        description: "Click the particle once a second",
        img: "clicker.png",
        imgWidth: "60px",
        prereqs: [],
        perm: "amplifier",
    },
    auto2: {
        bought: false,
        cost: 10000,
        unlockCost: 5000,
        unit: "kg",
        resource: "mass",
        title: "More auto clickers",
        description: "Auto click twice as fast",
        img: "clicker.png",
        imgWidth: "60px",
        prereqs: ["auto1"],
        perm: "amplifier",
    },
    auto3: {
        bought: false,
        cost: 30000,
        unlockCost: 20000,
        unit: "kg",
        resource: "mass",
        title: "Suspiciously fast clicking",
        description: "Auto click 2.5 times as fast",
        img: "clicker.png",
        imgWidth: "60px",
        prereqs: ["auto2"],
        perm: "amplifier",
    },
    auto4: {
        bought: false,
        cost: 50000,
        unlockCost: 40000,
        unit: "kg",
        resource: "mass",
        title: "A wolf in sheep's clothing",
        description: "Auto click 4 times as fast",
        img: "clicker.png",
        imgWidth: "60px",
        prereqs: ["auto3"],
        perm: "amplifier",
    },
    idleShop1: {
        bought: false,
        cost: 1.5e6,
        unlockCost: 9e5,
        unit: "J",
        resource: "energy",
        title: "Idle particles",
        description: "Gain 1% of the total mass of all bought particles every real second",
        img: "auto.png",
        imgWidth: "60px",
        prereqs: ["cap1"],
        perm: "blackhole",
    },
    idleShop2: {
        bought: false,
        cost: 1.5e7,
        unlockCost: 1e7,
        unit: "J",
        resource: "energy",
        title: "Not enough idle particles",
        description: "Gain 10% of the total mass of all bought particles every real second",
        img: "auto.png",
        imgWidth: "60px",
        prereqs: ["idleShop1"],
        perm: "blackhole",
    },
    idleShop3: {
        bought: false,
        cost: 4e8,
        unlockCost: 1e8,
        unit: "J",
        resource: "energy",
        title: "Particles with an extra serving of more particles",
        description: "Gain 50% of the total mass of all bought particles every real second",
        img: "auto.png",
        imgWidth: "60px",
        prereqs: ["idleShop2"],
        perm: "blackhole",
    },
    cap4: {
        bought: false,
        cost: 5e9,
        unlockCost: 1e9,
        unit: "J",
        resource: "energy",
        title: "To infinity and beyond",
        description: "All particles in the shop are uncapped, but the amount of particles displayed is still capped",
        img: "temping.png",
        imgWidth: "60px",
        prereqs: ["cap3", "idleShop2"],
        perm: "overclock",
    },
    vel1b: {
        bought: false,
        cost: 1.00e9,
        unlockCost: 1.00e9,
        unit: "J",
        resource: "energy",
        title: "Head start",
        description: "After an Overclock or Black Hole reset, automatically buy the first velocity upgrade for free. This is your new starting velocity",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: [],
        perm: "blackhole",
    },
    accelFinal: {
        bought: false,
        cost: resources.lightspeed/10,
        unlockCost: resources.lightspeed/100,
        unit: "m/s",
        resource: "velocity",
        title: "Lightspeed engine",
        description: "Remove the Mass-Velocity engine's efficiency cap and minimum mass requirement",
        img: "VelocityUpgrade.png",
        imgWidth: "60px",
        prereqs: ["accel1"],
    }
}

var prestige1Data = {
    overclock: {
        name: "Overclock",
        bought: 0,
        unlockCost: () => 1.25e6 * Math.pow(10, prestige1Data.overclock.bought) * Math.pow(100, Math.max(prestige1Data.overclock.bought - 1, 0)),
        unit: "J",
        resource: "energy",
        costDesc: "Reset mass, velocity, time, all bought particles, and all upgrades",
        title: "Overclock Mass-Velocity Engine",
        description: "Multiple usage by 4 and divide the minimum mass requirement by 2",
        img: "TimeEnginePrestigeUpgrade.png",
        imgWidth: "60px",
        prereqs: ["accel1"],
    },
    blackhole: {
        name: "Black Hole",
        bought: 0,
        unlockCost: () => 1.60e9 * Math.pow(100, prestige1Data.blackhole.bought),
        unit: "J",
        resource: "energy",
        costDesc: "Reset mass, velocity, time, all bought particles, the Mass-Velocity engine, and all upgrades",
        title: "Artificial Black Hole",
        description: "Create a black hole. Each black hole owned multiplies your post-reset velocity by 10 and divides the passage of time by 10<br><br>It is highly recommended not to buy this if your starting velocity is 0 m/s",
        img: "GoldenStart.png",
        imgWidth: "60px",
        prereqs: ["overclock"],
    },
    amplifier: {
        name: "Quantum Amplifier",
        bought: 0,
        unlockCost: () => 1.60e13 * Math.pow(100, prestige1Data.amplifier.bought),
        unit: "J",
        resource: "energy",
        costDesc: "Reset mass, velocity, time, all bought particles, all black holes, the Mass-Velocity engine, and all upgrades",
        title: "Quantum Amplifier",
        description: "Triple the Mass-Velocity engine's efficiency cap",
        img: "QuantumCurves.png",
        imgWidth: "60px",
        prereqs: ["blackhole"],
    },
}

var prestige2Data = {
    p1: {
        name: "Trickle-down resets",
        bought: 0,
        cost: 4,
        max: 1,
        description: "Keep all lower tier reset upgrades on a reset",
        img: "tempimg.png",
        imgWidth: "60px",
    },
    p2: {
        name: "Permanently unlock relativity",
        bought: 0,
        cost: 2,
        max: 1,
        description: "From now on, always have relativity unlocked",
        img: "tempimg.png",
        imgWidth: "60px",
    },
    p3: {
        name: "Holographic particle information",
        bought: 0,
        cost: 1,
        max: 1,
        description: "Keep all particles and particle caps on any reset",
        img: "tempimg.png",
        imgWidth: "60px",
    },
    p4: {
        name: "Higgs fluctuation",
        bought: 0,
        cost: 1,
        max: 5,
        description: "Multiply the mass of all shop particles by 10",
        img: "tempimg.png",
        imgWidth: "60px",
    },
    p5: {
        name: "Efficient scaling",
        bought: 0,
        cost: 1,
        max: 1,
        description: "Mutiply the Mass-Velocity engine's efficiency cap by 1 + current LP",
        img: "tempimg.png",
        imgWidth: "60px",
    },
}

const milestoneFunctions = {
    vel1: () => resources.velocity++,
    click1: () => clickParticleMass *= 2,
    click2: () => clickParticleMass *= 2,
    click1b: () => pClickNum += 1,
    vel2: () => resources.velocity *= 2,
    vel3: () => {resources.velocity *= 3; resources.time /= 3;},
    vel4: () => {resources.velocity *= 2; resources.time /= 1.8;},
    vel5: () => {resources.velocity *= 3; resources.time /= 3.2;},
    vel6: () => {resources.velocity *= 4; resources.time /= 5;},
    accel1: () => {resources.accelMass = 0.1; mvengine_doc.hidden = false},
    cap1: () => particleCap++,
    cap2: () => particleCap++,
    cap3: () => particleCap++,
    time1: () => resources.time *= 3,
    vel1b: () => {milestoneData.vel1.perm = "blackhole"},
    auto1: () => autoClickTime = 1000,
    auto2: () => autoClickTime /= 2,
    auto3: () => autoClickTime /= 2.5,
    auto4: () => autoClickTime /= 4,
    idleShop1: () => autoMassPerc = 0.01,
    idleShop2: () => autoMassPerc = 0.1,
    idleShop3: () => autoMassPerc = 0.5,
    cap4: () => isCapped = false,
    accelFinal: () => {resources.minAccelMass = 0; maxFriction = -1},
}

const prestige1Functions = {
    overclock: () => {
        basicPrestigeReset(0);

        resources.accelMass *= 4
        resources.minAccelMass /= 2
    },
    blackhole: () => {
        resources.blackholes++

        blackhole_doc.hidden = false
        
        basicPrestigeReset(1);
    },
    amplifier: () => {
        basicPrestigeReset(2);

        maxFriction *= 3
    }
}

const prestige2Functions = {
    p1: () => {},
    p2: () => {
        unlockRelativity(true)
    },
    p3: () => {},
    p4: () => {
        prestige2Data.p4.cost++

        for (var i = 0; i < allParticles.length; i++) {
            let name = allParticles[i]

            particleData[name].mass *= 10
            particleData[name].baseMass *= 10
        }
    },
    p5: () => {}
}