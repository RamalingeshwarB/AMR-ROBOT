let socket = new WebSocket("ws://192.168.4.1:81/");
let scale = 1;
const mapContainer = document.querySelector(".map-container");
const pathCanvas = document.getElementById("pathCanvas");
const ctx = pathCanvas.getContext("2d");
let startBlock = null, destinationBlock = null;
const gridSize = 50;
let obstacles = new Set();

let robotPosition = { x: 20, y: 16 };
let robotAngle = 0;
let isFirstTask = true;
let lastCommandTime = Date.now();
let latestPath = [];

function resizeCanvas() {
    pathCanvas.width = mapContainer.clientWidth;
    pathCanvas.height = mapContainer.clientHeight;
    drawRobotArrow();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// WebSocket
socket.onopen = () => console.log("Connected to WebSocket");
socket.onmessage = (event) => {
    let data = JSON.parse(event.data);
    if (data.status) {
        document.getElementById("status").innerText = `Status: ${data.status}`;
    }
    if (data.distance) {
        document.getElementById("distance").innerText = `Distance: ${data.distance} cm`;
    }
    if (data.position) {
        robotPosition = data.position;
        drawPath(latestPath);
        drawRobotArrow();
    }
    if (data.status === "task_complete") {
        resetPath();
        updateStatus("✅ Task completed. Ready for next path.");
    }
    lastCommandTime = Date.now();
};

// Obstacle Detection
document.querySelectorAll(".block.obstacle").forEach(block => {
    let x = parseInt(block.style.left) / gridSize;
    let y = parseInt(block.style.top) / gridSize;
    obstacles.add(`${x},${y}`);
});

// Block Clicks
function handleBlockClick(event) {
    const block = event.target;
    if (!startBlock) {
        startBlock = block;
        block.classList.add("selected");
        updateStatus("Now select a destination.");
    } else if (!destinationBlock && block !== startBlock) {
        destinationBlock = block;
        block.classList.add("selected");
        updateStatus("Path is being generated...");
        setTimeout(() => generatePathSequence(startBlock, destinationBlock), 10);
    }
}
document.querySelectorAll(".block").forEach(block => block.addEventListener("click", handleBlockClick));

// A* Algorithm
class PriorityQueue {
    constructor() { this.items = []; }
    enqueue(element, priority) {
        this.items.push({ element, priority });
        this.items.sort((a, b) => a.priority - b.priority);
    }
    dequeue() { return this.items.shift().element; }
    isEmpty() { return this.items.length === 0; }
}

function findPath(startX, startY, endX, endY) {
    let openSet = new PriorityQueue();
    openSet.enqueue({ x: startX, y: startY, cost: 0, parent: null }, 0);
    let closedSet = new Set();
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    while (!openSet.isEmpty()) {
        let current = openSet.dequeue();
        let key = `${current.x},${current.y}`;
        if (closedSet.has(key)) continue;
        closedSet.add(key);

        if (current.x === endX && current.y === endY) {
            let path = [];
            while (current) {
                path.push({ x: current.x, y: current.y });
                current = current.parent;
            }
            return path.reverse();
        }

        for (let dir of dirs) {
            let nx = current.x + dir.x;
            let ny = current.y + dir.y;
            let newKey = `${nx},${ny}`;
            if (!obstacles.has(newKey) && !closedSet.has(newKey)) {
                let newCost = current.cost + 1;
                let heuristic = Math.abs(nx - endX) + Math.abs(ny - endY);
                openSet.enqueue({ x: nx, y: ny, cost: newCost, parent: current }, newCost + heuristic);
            }
        }
    }
    return [];
}

function generatePathSequence(start, end) {
    const startX = parseInt(start.style.left) / gridSize;
    const startY = parseInt(start.style.top) / gridSize;
    const endX = parseInt(end.style.left) / gridSize;
    const endY = parseInt(end.style.top) / gridSize;

    let path = [];

    if (isFirstTask) {
        const toStart = findPath(robotPosition.x, robotPosition.y, startX, startY);
        path = path.concat(toStart);
        isFirstTask = false;
    } else if (robotPosition.x !== startX || robotPosition.y !== startY) {
        const toStart = findPath(robotPosition.x, robotPosition.y, startX, startY);
        path = path.concat(toStart);
    }

    const toEnd = findPath(startX, startY, endX, endY);
    path = path.concat(toEnd);

    latestPath = path;
    drawPath(path);
    sendPathToRobot(path);
}

function drawPath(path) {
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    if (path.length === 0) return;

    const startX = parseInt(startBlock.style.left) / gridSize;
    const startY = parseInt(startBlock.style.top) / gridSize;
    const splitIndex = path.findIndex(p => p.x === startX && p.y === startY);

    if (splitIndex > 0) {
        ctx.strokeStyle = "green";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(path[0].x * gridSize + 25, path[0].y * gridSize + 25);
        for (let i = 1; i <= splitIndex; i++) {
            ctx.lineTo(path[i].x * gridSize + 25, path[i].y * gridSize + 25);
        }
        ctx.stroke();
    }

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(path[splitIndex].x * gridSize + 25, path[splitIndex].y * gridSize + 25);
    for (let i = splitIndex + 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * gridSize + 25, path[i].y * gridSize + 25);
    }
    ctx.stroke();

    drawStartArrow(path[0]);
    drawRobotArrow();
}

function drawRobotArrow() {
    const x = robotPosition.x * gridSize + 25;
    const y = robotPosition.y * gridSize + 25;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(robotAngle * Math.PI / 180);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 10);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawStartArrow(pos) {
    const x = pos.x * gridSize + 25;
    const y = pos.y * gridSize + 25;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 10);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function sendPathToRobot(path) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    let commands = [];

    for (let i = 1; i < path.length; i++) {
        let dx = path[i].x - path[i - 1].x;
        let dy = path[i].y - path[i - 1].y;

        let direction = "";
        if (dx === 1) direction = "right";
        else if (dx === -1) direction = "left";
        else if (dy === 1) direction = "down";
        else if (dy === -1) direction = "up";

        commands.push({ direction, distance: gridSize });

        if (direction === "up") robotAngle = 0;
        else if (direction === "right") robotAngle = 90;
        else if (direction === "down") robotAngle = 180;
        else if (direction === "left") robotAngle = 270;
    }

    socket.send(JSON.stringify({ command: "follow_path", path: commands }));
}

function resetPath() {
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    document.querySelectorAll(".block").forEach(b => b.classList.remove("selected"));
    startBlock = null;
    destinationBlock = null;
    isFirstTask = true;
    latestPath = [];
    updateStatus("Click on Start block first.");
    drawRobotArrow();
}

function updateStatus(msg) {
    document.getElementById("status").innerText = msg;
}

// Zoom
document.addEventListener("wheel", (e) => {
    if (mapContainer.matches(":hover")) {
        e.preventDefault();
        adjustZoom(e.deltaY > 0 ? -0.1 : 0.1);
    }
});
document.querySelector(".zoom-controls button:first-child").addEventListener("click", () => adjustZoom(0.1));
document.querySelector(".zoom-controls button:last-child").addEventListener("click", () => adjustZoom(-0.1));
function adjustZoom(amount) {
    scale = Math.min(Math.max(scale + amount, 0.5), 2);
    mapContainer.style.transform = `scale(${scale})`;
}

// Idle Return
setInterval(() => {
    const now = Date.now();
    if (now - lastCommandTime >= 4 * 60 * 1000) {
        sendJson({ command: "auto_park" });
        updateStatus("Idle 4 min — Returning to parking.");
    }
}, 60000);

function sendJson(obj) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(obj));
        lastCommandTime = Date.now();
    } else {
        console.log("WebSocket not connected.");
    }
}

// Control Buttons
function startNow() {
    if (latestPath.length > 0) {
        sendJson({ command: "start_now", path: latestPath });
        updateStatus("Robot started immediately.");
    } else {
        updateStatus("No path available.");
    }
}

function customStart() {
    const delay = prompt("Delay (sec)?");
    const delayMs = parseInt(delay) * 1000;
    if (!isNaN(delayMs) && delayMs > 0) {
        updateStatus(`Starting in ${delay} seconds...`);
        setTimeout(startNow, delayMs);
    } else {
        updateStatus("Invalid delay.");
    }
}

function stopNow() {
    sendJson({ command: "stop_now" });
    updateStatus("Stopped.");
}

function customStop() {
    const mode = prompt("1 - Delay (sec)\n2 - Repeat count");
    if (mode === "1") {
        const delay = prompt("Delay (sec)?");
        const ms = parseInt(delay) * 1000;
        if (!isNaN(ms) && ms > 0) {
            setTimeout(stopNow, ms);
            updateStatus(`Stopping in ${delay} seconds.`);
        }
    } else if (mode === "2") {
        const reps = prompt("Repetitions?");
        if (!isNaN(reps) && reps > 0) {
            sendJson({ command: "custom_stop", stop_after_repeats: parseInt(reps) });
            updateStatus(`Stopping after ${reps} repetitions.`);
        }
    }
}

function changeDestination() {
    destinationBlock = null;
    sendJson({ command: "change_destination" });
    updateStatus("Select new Destination.");
}