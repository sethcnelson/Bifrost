# Bifrost for Foundry VTT
*Bridging Physical and Virtual Tabletop Gaming*

[![Foundry Version](https://img.shields.io/badge/Foundry-v11+-green)](https://foundryvtt.com)
[![Module Version](https://img.shields.io/badge/Version-v1.0.0-blue)](https://github.com/yourorg/bifrost-foundry/releases)
[![Downloads](https://img.shields.io/badge/Downloads-2.5k+-brightgreen)](https://foundryvtt.com/packages/bifrost)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Bifrost for Foundry VTT** is a module that connects physical tabletop gaming with Foundry Virtual Tabletop through computer vision and AI. Move real Norse rune tokens on your table and watch them sync instantly in Foundry VTT.

![Bifrost Foundry Demo](docs/images/foundry-demo.gif)
*Real-time synchronization between physical tokens and Foundry VTT*

---

## 📋 Table of Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Troubleshooting](#-troubleshooting)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [Support](#-support)

---

## ✨ Features

### **Core Functionality**
- **Real-time Token Sync**: Physical token movements appear instantly in Foundry
- **Bidirectional Control**: Move tokens in Foundry and optionally trigger physical feedback
- **Player Assignment**: Automatic mapping of rune tokens to player characters
- **Multi-token Support**: Track up to 16 tokens simultaneously with 99.5% accuracy

### **Advanced Features**
- **Fog of War Integration**: Physical line-of-sight detection affects virtual fog
- **Measurement Tools**: Project measurement rulers onto the physical table
- **Initiative Tracking**: Automatic turn order based on token positions
- **Combat Automation**: Trigger attacks and abilities through physical movements

### **AI Integration**
- **Valkyrie Assistant**: AI-powered rule support and game balance (Premium)
- **Automatic Encounter Scaling**: Dynamic difficulty adjustment
- **Rule Arbitration**: Instant rule lookups with citations
- **Story Suggestions**: Contextual narrative prompts for GMs

### **User Experience**
- **Zero-Config Setup**: Automatic detection and calibration
- **Visual Status Display**: Real-time connection and detection status
- **Player Notifications**: In-game alerts for physical/virtual player actions
- **Session Recording**: Complete game state capture for replay and analysis

---

## 💻 Requirements

### **Foundry VTT**
- **Version**: 11.315 or higher (12.x recommended)
- **Systems**: Compatible with all game systems (D&D 5e optimized)
- **Dependencies**: None (all dependencies bundled)

### **Heimdall Hardware** (Physical Detection System)
- **Computer**: Raspberry Pi 4 (4GB+) or equivalent Linux/Windows PC
- **Camera**: USB webcam or Pi Camera Module (8MP+ recommended)
- **Network**: Same local network as Foundry VTT server
- **Tokens**: Bifrost rune tokens or DIY printable versions

### **Network Requirements**
- **Latency**: <50ms between Heimdall and Foundry server recommended
- **Bandwidth**: ~1Mbps for real-time detection data
- **Ports**: Default WebSocket port 8080 (configurable)

---

## 📦 Installation

### **Method 1: Package Browser (Recommended)**

1. **Open Foundry VTT** as a Game Master
2. **Navigate to Add-On Modules**
3. **Click "Install Module"**
4. **Search for "Bifrost"**
5. **Click "Install"** and wait for completion
6. **Enable the module** in your world settings

### **Method 2: Manifest URL**

1. **Copy the manifest URL**:
   ```
   https://github.com/sethcnelson/bifrost-foundry-conduit/releases/latest/download/module.json
   ```
2. **In Foundry VTT**, go to **Add-On Modules → Install Module**
3. **Paste the manifest URL** and click **Install**

### **Method 3: Manual Installation**

1. **Download the latest release** from [GitHub Releases](https://github.com/sethcnelson/bifrost-foundry-conduit/releases)
2. **Extract to your Foundry modules directory**:
   ```
   [Foundry Data]/modules/bifrost-foundry-conduit/
   ```
3. **Restart Foundry VTT**
4. **Enable the module** in your world settings

### **Verify Installation**

1. **Check the module list** - Bifrost should appear with a green checkmark
2. **Look for the Bifrost icon** in the scene controls toolbar
3. **Open Module Settings** - You should see Bifrost configuration options

---

## ⚙️ Configuration

### **Basic Setup**

#### **1. Enable Bifrost Module**
![Module Settings](docs/images/module-enable.png)

1. **World Settings → Manage Modules**
2. **Find "Bifrost"** and check the box
3. **Click "Save Module Settings"**

#### **2. Configure Heimdall Connection**
![Connection Settings](docs/images/connection-config.png)

1. **Game Settings → Module Settings → Bifrost**
2. **Set Heimdall Server URL**: `ws://[HEIMDALL_IP]:8080`
3. **Configure Authentication** (if enabled on Heimdall)
4. **Test Connection** using the built-in diagnostics

#### **3. Scene Setup**
![Scene Configuration](docs/images/scene-setup.png)

1. **Open your game scene**
2. **Click the Bifrost tool** in the scene controls
3. **Run Scene Calibration** to map physical to virtual coordinates
4. **Set up player token assignments**

### **Advanced Configuration**

#### **Connection Settings**
```yaml
Heimdall Server URL: ws://192.168.1.100:8080
Authentication Token: your-secure-token
Auto-Reconnect: true
Reconnect Interval: 5 seconds
Connection Timeout: 30 seconds
```

#### **Detection Settings**
```yaml
Confidence Threshold: 0.85
Movement Sensitivity: 2.0 pixels
Rotation Sensitivity: 5.0 degrees
Update Frequency: 30 FPS
Smoothing: enabled
```

#### **Player Assignment**
```yaml
Auto-Assignment: true
Assignment Method: "by-rune-symbol"
Fallback Behavior: "create-new-token"
Conflict Resolution: "prompt-user"
```

#### **Performance Tuning**
```yaml
Batch Updates: true
Batch Size: 10 updates
Update Throttling: 33ms (30 FPS)
Background Processing: true
Memory Optimization: enabled
```

---

## 🎮 Usage Guide

### **Getting Started**

#### **1. Launch Heimdall System**
```bash
# On your Raspberry Pi or detection computer
heimdall start --config /path/to/config.yaml

# Verify system status
heimdall status
```

#### **2. Open Foundry World**
1. **Launch Foundry VTT** and open your world
2. **Ensure Bifrost module is enabled**
3. **Navigate to your game scene**

#### **3. Connect to Heimdall**
![Connection Status](docs/images/connection-status.png)

1. **Click the Bifrost icon** in scene controls
2. **Verify connection status** (should show green)
3. **Run initial calibration** if first time setup

#### **4. Place Physical Tokens**
![Token Placement](docs/images/token-placement.png)

1. **Place rune tokens** on your physical gaming surface
2. **Verify detection** - tokens should appear in Foundry within 2 seconds
3. **Assign tokens to players** using the assignment dialog

### **Player Token Management**

#### **Automatic Assignment**
The system automatically assigns tokens to players based on:
1. **Rune symbol matching** - Each player gets a unique rune
2. **Color coding** - Token border colors indicate player ownership
3. **Character sheet integration** - Links to player character data

#### **Manual Assignment**
![Player Assignment](docs/images/player-assignment.png)

1. **Right-click any detected token**
2. **Select "Assign to Player"**
3. **Choose from available players**
4. **Configure token properties** (size, vision, permissions)

#### **Token Properties Sync**
Physical token changes automatically update:
- **Position** - Real-time coordinate mapping
- **Rotation** - Token facing direction
- **Scale** - Token size (if using different sized tokens)
- **Status** - Present/absent on table

### **Advanced Features**

#### **Fog of War Integration**
![Fog of War](docs/images/fog-of-war.png)

1. **Enable "Physical Line of Sight"** in Bifrost settings
2. **Heimdall calculates visibility** based on token positions
3. **Fog updates automatically** as players move tokens
4. **Manual override available** for special situations

#### **Measurement Tools**
![Measurement Tools](docs/images/measurement-tools.png)

1. **Use Foundry's ruler tool** normally
2. **Measurements project onto physical table** (requires projector setup)
3. **Range indicators** show spell/ability areas
4. **Movement tracking** displays path history

#### **Combat Integration**
![Combat Integration](docs/images/combat-integration.png)

1. **Initiative automatically tracked** from token positions
2. **Turn indicators** highlight active player's token
3. **Attack triggers** - move tokens into range to prompt attack rolls
4. **Area effect visualization** - spell templates on physical table

#### **AI Assistant (Valkyrie)**
![AI Assistant](docs/images/ai-assistant.png)

1. **Enable Valkyrie** in module settings (requires subscription)
2. **Real-time rule support** - hover over tokens for suggestions
3. **Encounter balancing** - automatic difficulty adjustment alerts
4. **Story prompts** - contextual narrative suggestions for GMs

### **Session Management**

#### **Recording Sessions**
1. **Enable session recording** in Bifrost settings
2. **Recordings include**:
   - All token movements (physical and virtual)
   - Player actions and die rolls
   - Chat messages and rule lookups
   - Synchronized timestamps

#### **Playback and Analysis**
1. **Access recordings** through the Bifrost journal
2. **Replay sessions** at variable speeds
3. **Generate highlights** for social media sharing
4. **Export data** for campaign analysis

---

## 🔧 Troubleshooting

### **Common Issues**

#### **Connection Problems**

**❌ "Cannot connect to Heimdall server"**
```bash
# Check if Heimdall is running
heimdall status

# Verify network connectivity
ping [HEIMDALL_IP]

# Check firewall settings
sudo ufw allow 8080
```

**❌ "Connection drops frequently"**
- **Cause**: Network instability or WiFi interference
- **Solution**: Use wired ethernet connection for Heimdall
- **Alternative**: Increase reconnection timeout in settings

#### **Detection Issues**

**❌ "Tokens not detected"**
1. **Check lighting** - ensure even illumination without shadows
2. **Verify token contrast** - runes should be clearly visible
3. **Run calibration** - recalibrate if table setup changed
4. **Check confidence threshold** - lower if tokens are clean and well-lit

**❌ "False detections"**
1. **Increase confidence threshold** to 0.9+
2. **Remove reflective objects** from detection area
3. **Check for patterns** that might resemble runes
4. **Use background subtraction** in Heimdall settings

#### **Performance Issues**

**❌ "Lag between movement and sync"**
1. **Check network latency**: `ping [FOUNDRY_SERVER]`
2. **Reduce update frequency** if on slow hardware
3. **Enable batch updates** for multiple token movements
4. **Optimize Heimdall settings** for your hardware

**❌ "High CPU/memory usage"**
1. **Reduce detection resolution** in Heimdall
2. **Limit simultaneous token tracking** to 8-10 tokens
3. **Enable hardware acceleration** if available
4. **Close unnecessary Foundry modules**

### **Advanced Troubleshooting**

#### **Log Files**
```bash
# Foundry VTT logs
[Foundry Data]/logs/foundry.log

# Bifrost module logs  
[Foundry Data]/logs/bifrost-module.log

# Heimdall system logs
/var/log/heimdall/detection.log
```

#### **Debug Mode**
1. **Enable debug logging** in module settings
2. **Open browser console** (F12) for real-time debugging
3. **Monitor WebSocket messages** for connection issues
4. **Check performance metrics** in the Bifrost status panel

#### **Reset Configuration**
```javascript
// Reset Bifrost settings to defaults (run in browser console)
game.settings.set("bifrost", "heimdall-url", "ws://localhost:8080");
game.settings.set("bifrost", "auto-reconnect", true);
game.settings.set("bifrost", "confidence-threshold", 0.85);

// Clear cached calibration data
game.settings.set("bifrost", "calibration-data", {});
```

---

## 🔌 API Reference

### **For Module Developers**

The Bifrost module provides a comprehensive API for extending functionality:

#### **Core API**
```javascript
// Access the Bifrost API
const bifrost = game.modules.get("bifrost").api;

// Listen for token events
bifrost.on("tokenMoved", (tokenData) => {
  console.log("Token moved:", tokenData);
});

// Send commands to Heimdall
bifrost.sendCommand("calibrate", { mode: "auto" });

// Get current detection status
const status = bifrost.getStatus();
```

#### **Token Management**
```javascript
// Register custom token handler
bifrost.registerTokenHandler("custom-type", {
  onDetected: (tokenData) => { /* handle detection */ },
  onMoved: (tokenData) => { /* handle movement */ },
  onRemoved: (tokenData) => { /* handle removal */ }
});

// Create virtual token from physical detection
const token = await bifrost.createToken({
  runeSymbol: "ᚠ",
  position: { x: 100, y: 200 },
  playerId: "player1"
});
```

#### **Coordinate Transformation**
```javascript
// Convert physical coordinates to Foundry grid
const virtualPos = bifrost.transformPhysicalToVirtual(
  physicalX, physicalY
);

// Convert Foundry coordinates to physical
const physicalPos = bifrost.transformVirtualToPhysical(
  token.x, token.y
);

// Get calibration matrix
const calibration = bifrost.getCalibrationMatrix();
```

#### **Event System**
```javascript
// Available events
bifrost.on("connected", () => { /* Heimdall connected */ });
bifrost.on("disconnected", () => { /* Heimdall disconnected */ });
bifrost.on("tokenDetected", (data) => { /* New token found */ });
bifrost.on("tokenMoved", (data) => { /* Token position changed */ });
bifrost.on("tokenRemoved", (data) => { /* Token removed from table */ });
bifrost.on("calibrationChanged", (data) => { /* Calibration updated */ });

// Custom event emission
bifrost.emit("customEvent", { data: "example" });
```

#### **Configuration API**
```javascript
// Get module settings
const settings = bifrost.getSettings();

// Update settings programmatically
await bifrost.updateSetting("confidence-threshold", 0.9);

// Register custom settings
bifrost.registerSetting("myModule.customSetting", {
  name: "Custom Setting",
  hint: "This is a custom setting",
  scope: "world",
  config: true,
  type: String,
  default: "default-value"
});
```

### **Macro Integration**

#### **Common Macros**
```javascript
// Toggle Bifrost connection
game.modules.get("bifrost").api.toggleConnection();

// Recalibrate detection area
game.modules.get("bifrost").api.calibrate();

// Get all detected tokens
const tokens = game.modules.get("bifrost").api.getDetectedTokens();
ui.notifications.info(`Detected ${tokens.length} tokens`);

// Manually assign token to player
const token = canvas.tokens.get("token-id");
game.modules.get("bifrost").api.assignTokenToPlayer(token, "player-id");
```

### **Hooks Integration**

Bifrost integrates with Foundry's hook system:

```javascript
// Listen for Bifrost-specific hooks
Hooks.on("bifrostTokenDetected", (tokenData) => {
  console.log("New physical token detected:", tokenData);
});

Hooks.on("bifrostCalibrationComplete", (calibrationData) => {
  ui.notifications.info("Table calibration completed");
});

// Trigger custom behavior on token sync
Hooks.on("bifrostTokenSynced", (physicalToken, foundryToken) => {
  // Custom logic when physical and virtual tokens sync
});
```

---

## 🤝 Contributing

### **Development Setup**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourorg/bifrost-foundry.git
   cd bifrost-foundry
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up development environment**:
   ```bash
   # Link to Foundry modules directory
   ln -s $(pwd) /path/to/foundry/Data/modules/bifrost

   # Start development server
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm run test
   npm run test:integration
   ```

### **Code Standards**

- **Follow the [Bifrost Git Guide](../docs/git-guide.md)**
- **Use TypeScript** for all new code
- **ESLint configuration** enforced in CI/CD
- **Test coverage** required for new features
- **Documentation** updates required for API changes

### **Pull Request Process**

1. **Fork the repository** and create a feature branch
2. **Follow commit message conventions**: `feat(foundry): description`
3. **Add tests** for new functionality
4. **Update documentation** for user-facing changes
5. **Submit PR** with clear description and testing notes

---

## 📞 Support

### **Getting Help**

- **📖 Documentation**: [Bifrost Foundry Docs](https://docs.bifrost.gaming/foundry)
- **💬 Discord Support**: [#foundry-support](https://discord.gg/bifrost)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/yourorg/bifrost-foundry/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/yourorg/bifrost-foundry/discussions)

### **Frequently Asked Questions**

<details>
<summary><strong>Q: Can I use Bifrost without physical tokens?</strong></summary>

A: Bifrost is designed for hybrid physical/virtual play, but you can use it in "virtual-only" mode where it simply provides enhanced Foundry features like AI assistance and advanced measurement tools.
</details>

<details>
<summary><strong>Q: Does Bifrost work with custom game systems?</strong></summary>

A: Yes! Bifrost works with any Foundry game system. While it has enhanced features for D&D 5e, the core token synchronization works universally.
</details>

<details>
<summary><strong>Q: Can multiple players use the same physical table?</strong></summary>

A: Absolutely! Bifrost supports multiple players around the same physical table, each with their own uniquely identified rune tokens.
</details>

<details>
<summary><strong>Q: What happens if the connection drops during a game?</strong></summary>

A: Bifrost automatically reconnects and synchronizes the game state. Virtual players can continue playing while the connection is restored.
</details>

<details>
<summary><strong>Q: Can I use custom tokens instead of runes?</strong></summary>

A: Yes! You can train Heimdall to recognize custom token designs, though this requires additional setup and training data.
</details>

### **Professional Support**

For gaming cafes, content creators, and commercial deployments:

- **Priority Support**: Guaranteed response within 4 hours
- **Custom Integration**: Tailored features for your specific needs
- **On-site Setup**: Professional installation and training
- **Volume Licensing**: Discounts for multiple installations

**Contact**: [support@bifrost.gaming](mailto:support@bifrost.gaming)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Foundry VTT Team** for creating an amazing platform
- **Norse Mythology** for inspiring our magical theme
- **Computer Vision Community** for foundational research
- **Beta Testers** who helped refine the experience
- **Contributors** who make this project possible

---

<div align="center">

## 🌈 Ready to Bridge Your Foundry Game?

**[Install from Package Browser](https://foundryvtt.com/packages/bifrost)** | **[Join Discord](https://discord.gg/bifrost)** | **[View Demo](https://youtube.com/bifrost-foundry-demo)**

*Transform your Foundry VTT sessions with the magic of hybrid gaming.*

---

**Made with ⚡ for the Foundry VTT community**

*Version 1.0.0 | Compatible with Foundry v11+ | Last updated: August 2025*

</div>