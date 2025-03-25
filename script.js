let socket = new WebSocket("ws://192.168.4.1:81/");
let scale = 1;
const mapContainer = document.querySelector(".map-container");
const pathCanvas = document.getElementById("pathCanvas");
const ctx = pathCanvas.getContext("2d");
let startBlock = null, destinationBlock = null;
const gridSize = 50;
let obstacles = new Set();

// Initialize canvas size
function resizeCanvas() {
    pathCanvas.width = mapContainer.clientWidth;
    pathCanvas.height = mapContainer.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// WebSocket Handling
socket.onopen = () => console.log("Connected to WebSocket");
socket.onmessage = (event) => {
    let data = JSON.parse(event.data);
    document.getElementById("status").innerText = `Status: ${data.status}`;
    document.getElementById("distance").innerText = `Distance: ${data.distance} cm`;
};

// Store obstacles
document.querySelectorAll(".block.obstacle").forEach(block => {
    let x = parseInt(block.style.left) / gridSize;
    let y = parseInt(block.style.top) / gridSize;
    obstacles.add(`${x},${y}`);
});

// Block Click Handler
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
        setTimeout(() => generatePath(startBlock, destinationBlock), 10);
    }
}

// Attach click event to grid blocks
document.querySelectorAll(".block").forEach(block => {
    block.addEventListener("click", handleBlockClick);
});

// Path Generation
function generatePath(start, end) {
    const startX = parseInt(start.style.left) / gridSize;
    const startY = parseInt(start.style.top) / gridSize;
    const endX = parseInt(end.style.left) / gridSize;
    const endY = parseInt(end.style.top) / gridSize;

    let path = findPath(startX, startY, endX, endY);
    console.log("Generated Path:", path); // Debugging
    drawPath(path);
}

// Priority Queue
class PriorityQueue {
    constructor() {
        this.items = [];
    }
    enqueue(element, priority) {
        this.items.push({ element, priority });
        this.items.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
        return this.items.shift().element;
    }
    isEmpty() {
        return this.items.length === 0;
    }
}

// A* Pathfinding Algorithm
function findPath(startX, startY, endX, endY) {
    let openSet = new PriorityQueue();
    openSet.enqueue({ x: startX, y: startY, cost: 0, parent: null }, 0);

    let closedSet = new Set();
    let directions = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 }
    ];

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

        for (let dir of directions) {
            let newX = current.x + dir.x;
            let newY = current.y + dir.y;
            let newKey = `${newX},${newY}`;

            if (!obstacles.has(newKey) && !closedSet.has(newKey)) {
                let newCost = current.cost + 1;
                let heuristic = Math.abs(newX - endX) + Math.abs(newY - endY);
                openSet.enqueue({ x: newX, y: newY, cost: newCost, parent: current }, newCost + heuristic);
            }
        }
    }
    return [];
}

// Path Drawing Function
function drawPath(path) {
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    
    if (path.length === 0) {
        updateStatus("No path found!");
        return;
    }

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(path[0].x * gridSize + gridSize / 2, path[0].y * gridSize + gridSize / 2);

    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * gridSize + gridSize / 2, path[i].y * gridSize + gridSize / 2);
    }

    ctx.stroke();
    updateStatus("Path generated successfully!");
}

// Reset Path
function resetPath() {
    ctx.clearRect(0, 0, pathCanvas.width, pathCanvas.height);
    document.querySelectorAll(".block").forEach(block => block.classList.remove("selected"));
    startBlock = null;
    destinationBlock = null;
    updateStatus("Click on 'Raw Load' first, then click on a destination.");
}

// Update Status Message
function updateStatus(message) {
    document.getElementById("status").innerText = message;
}

// Zoom Controls
document.addEventListener("wheel", (event) => {
    if (mapContainer.matches(":hover")) {
        event.preventDefault();
        adjustZoom(event.deltaY > 0 ? -0.1 : 0.1);
    }
});

document.querySelector(".zoom-controls button:first-child").addEventListener("click", () => adjustZoom(0.1));
document.querySelector(".zoom-controls button:last-child").addEventListener("click", () => adjustZoom(-0.1));

function adjustZoom(amount) {
    scale = Math.min(Math.max(scale + amount, 0.5), 2);
    mapContainer.style.transform = `scale(${scale})`;
}
