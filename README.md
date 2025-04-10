# AMR-ROBOT
# 🤖 AMR Project – Autonomous Mobile Robot with ESP32

This project is an **Autonomous Mobile Robot (AMR)** powered by an **ESP32**, capable of navigating through a mapped indoor environment using real-time encoder feedback, obstacle avoidance, IR-based load detection, and a full web-based interface for live tracking, control, and path planning.

---

## 🚀 Features

- ✅ Autonomous path following using A* Algorithm
- 🌐 ESP32 WebSocket Server with static IP (192.168.4.1)
- 📍 Live tracking of robot position on a web-based interactive map
- 🎯 Custom destination selection via click-based interface
- 🎓 Path planning from current position to start & then to destination
- 🧠 Smart IR-based **load pickup** & **drop detection**
- 📦 Task starts **only if load is detected**
- 🛑 Task completes **only if load is removed**
- 🅿️ Auto-parking after 2 minutes of inactivity
- 📊 Live status updates (Distance, X/Y Position, Direction, Task Status)
- 🕹️ Manual controls: Start Now, Custom Start Delay, Stop, Change Path
- 📱 Zoomable and scalable warehouse/office grid map

---

## 🧰 Hardware Used

- [x] ESP32 Dev Module  
- [x] L298N Motor Driver  
- [x] 4x DC Motors  
- [x] 2x AS5600 Magnetic Encoders  
- [x] TCA9548A I2C Multiplexer  
- [x] IR Sensor for Load Detection  
- [x] 3x 18650 Battery Pack  
- [x] Chassis & Wheels  
- [x] Custom grid map (150cm x 100cm, 50px per grid cell)

---

## 🌐 Web Interface

The interface lets you:

- 🧭 Click to select start and destination
- 📉 Visualize real-time path & robot location
- ⚙️ Monitor distance traveled and live robot status
- 🟢 Trigger custom/manual start
- 🔁 Reset/change path dynamically
- ⛽ Auto-returns to parking if idle

> All robot communication is handled via WebSocket on IP `192.168.4.1:81`.

---

## 🧠 Behavior Logic

```mermaid
graph TD
    A[Robot in Parking] --> B{Path Received?}
    B -->|Yes| C[Move to Start Location]
    C --> D{IR Load Detected?}
    D -->|Yes| E[Execute Path to Destination]
    E --> F{IR Load Removed?}
    F -->|Yes| G[Task Completed]
    G --> H[Idle & Wait 2 min]
    H --> I{New Task?}
    I -->|Yes| B
    I -->|No| J[Auto-Park Triggered]
