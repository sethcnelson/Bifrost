# 🎯 ArUco Token Tracker - FoundryVTT Module

A cutting-edge FoundryVTT module that bridges the gap between physical and digital tabletop gaming by integrating real-world ArUco marker tracking with virtual tokens. Move physical markers on your table and watch tokens update in real-time on your digital battlemap!

## 📋 Overview

The ArUco Token Tracker transforms your tabletop gaming experience by allowing you to use small, printed ArUco markers as physical representations of tokens that automatically sync with your FoundryVTT scenes. This creates an immersive hybrid gaming experience where players can physically move pieces while the digital map updates instantly.

### ✨ Key Features

**🔄 Real-Time Synchronization**
- Physical marker movements instantly update virtual tokens
- Sub-second latency for responsive gameplay
- Bidirectional sync support (coming soon)

**📱 Smart Marker Detection**
- Computer vision-based ArUco marker tracking
- Optimized marker schema for tabletop gaming
- Automatic token creation and management

**🎮 Seamless Integration**
- Native FoundryVTT module with professional UI
- Works with existing scenes and tokens
- No interruption to normal FoundryVTT workflow

**⚙️ Flexible Configuration**
- Customizable marker-to-token mapping
- Adjustable tracking sensitivity
- Support for multiple camera setups

## 🎯 ArUco Marker Schema

Our optimized marker system uses fewer IDs for better performance and smaller physical markers:

### **Corner Markers (Calibration Only)**
- **IDs 0-3**: Used for camera calibration and table boundaries
- **Purpose**: Define the play area and coordinate system
- **Size**: 20mm minimum for reliable detection

### **Player Tokens**
- **IDs 10-25**: Supports up to 16 players
- **Auto-naming**: Player_01, Player_02, etc.
- **Color**: Green indicators in UI
- **Size**: 15mm minimum

### **Item/NPC Tokens**
- **IDs 30-61**: 32 predefined game elements
- **Examples**: 
  - 30: Goblin, 31: Orc, 32: Skeleton, 33: Dragon
  - 40: Treasure Chest, 41: Magic Item, 42: Gold Pile
  - 50: NPC Merchant, 55: Door, 60: Vehicle
- **Color**: Orange indicators in UI
- **Size**: 15mm minimum

### **Custom Tokens**
- **IDs 62+**: User-defined markers
- **Auto-naming**: Custom_62, Custom_63, etc.
- **Color**: Purple indicators in UI
- **Size**: 15mm minimum

## 📥 Installation

### Method 1: Manifest URL (Recommended)
1. Open FoundryVTT and go to **Add-on Modules**
2. Click **Install Module**
3. Paste this manifest URL:
   ```
   https://github.com/your-username/foundry-aruco-tracker/releases/latest/download/module.json
   ```
4. Click **Install**

### Method 2: Manual Installation
1. Download the latest release from GitHub
2. Extract to your FoundryVTT modules directory:
   ```
   [FoundryVTT]/Data/modules/aruco-tracker/
   ```
3. Restart FoundryVTT
4. Enable the module in your world settings

### Required Files Structure
```
Data/modules/aruco-tracker/
├── module.json
├── aruco-tracker.js
├── aruco-tracker.css
├── lang/
│   └── en.json
├── assets/
│   └── icon.png
└── README.md
```

## ⚙️ Configuration

### Module Settings

Access module settings through **Configure Settings → Module Settings → ArUco Token Tracker**:

**🌐 Connection Settings**
- **ArUco Tracker Host**: IP address of your tracking device (default: localhost)
- **WebSocket Port**: Communication port (default: 30001)

**🎯 Token Settings**
- **Auto-Create Tokens**: Automatically create tokens for new markers
- **Default Token Image**: Image for general tokens
- **Player Token Image**: Specific image for player markers
- **Item Token Image**: Specific image for item/NPC markers

**🔧 Advanced Settings**
- **Enable CORS Headers**: For cross-origin requests
- **Update Throttle**: Minimum time between position updates (100ms default)

### Network Configuration

1. **Same Machine Setup** (Testing):
   ```
   Tracker Host: localhost
   WebSocket Port: 30001
   ```

2. **Raspberry Pi Setup** (Production):
   ```
   Tracker Host: 192.168.1.100  (Pi's IP address)
   WebSocket Port: 30001
   Firewall: Allow port 30001 on Pi
   ```

3. **Remote Setup** (Advanced):
   ```
   Tracker Host: your-domain.com
   WebSocket Port: 30001
   Security: Consider VPN for remote access
   ```

## 🎮 Usage Guide

### For Game Masters

**📋 Initial Setup**
1. Enable the ArUco Tracker module in your world
2. Configure connection settings to point to your tracking device
3. Test connection using the status dialog
4. Print and prepare ArUco markers

**🗺️ Scene Preparation**
1. Open your scene in FoundryVTT
2. Click the ArUco status button in scene controls
3. Verify connection status is "Connected ✓"
4. Place corner markers (IDs 0-3) on your physical table

**🎯 Token Management**
- **Auto-Creation**: New markers automatically create tokens
- **Manual Mapping**: Assign existing tokens to specific ArUco IDs
- **Token Flags**: View ArUco ID and marker type in token configuration

**📊 Monitoring**
- Use the status dialog to monitor tracked markers
- View connection quality and diagnostic information
- Check recent marker detections and confidence levels

### For Players

**🎲 Physical Setup**
1. Receive your player marker (ID 10-25) from the GM
2. Place marker on the play area within camera view
3. Watch your token appear automatically on the digital map

**🕹️ Gameplay**
1. **Move Naturally**: Simply move your physical marker
2. **Real-Time Updates**: Watch your token follow instantly
3. **Visual Feedback**: Your token shows a blue glow when tracked
4. **Marker Management**: Keep markers visible to the camera

**⚠️ Best Practices**
- Keep markers flat against the surface
- Avoid covering markers with hands or objects
- Use good lighting for reliable detection
- Handle markers carefully to prevent damage

## 🖨️ ArUco Marker Preparation

### Generating Markers

**Option 1: Online Generator**
1. Visit an ArUco generator website
2. Select **4x4_50** dictionary (recommended)
3. Generate IDs: 0-3 (corners), 10-25 (players), 30-61 (items), 62+ (custom)
4. Set size to at least 15mm for gameplay markers, 20mm for corners

**Option 2: OpenCV Script**
```python
import cv2
import numpy as np

# Generate ArUco marker
aruco_dict = cv2.aruco.Dictionary_get(cv2.aruco.DICT_4X4_50)
marker_size = 200  # pixels
marker_id = 15  # Your desired ID

marker_image = cv2.aruco.drawMarker(aruco_dict, marker_id, marker_size)
cv2.imwrite(f'aruco_marker_{marker_id}.png', marker_image)
```

**Option 3: Provided Templates**
- Download pre-generated marker sets from the releases page
- Includes complete player and item marker sets
- Print on standard paper or cardstock

### Printing Guidelines

**📄 Paper Selection**
- **Standard Paper**: Adequate for testing and short sessions
- **Cardstock**: Better durability for regular use
- **Laminated**: Best protection for frequent handling

**🖨️ Print Settings**
- **Quality**: High/Best quality setting
- **Color**: Black and white sufficient
- **Scaling**: Ensure actual size (100% scale)
- **Margins**: Minimum margins to maximize marker size

**✂️ Preparation**
1. Cut markers with clean edges
2. Mount on cardboard for stability
3. Consider adding player names or icons
4. Store in protective sleeves when not in use

### Physical Setup

**📹 Camera Positioning**
- Mount camera 60-100cm above the play surface
- Ensure good, even lighting across the table
- Minimize shadows and reflections
- Test with corner markers before gameplay

**🗺️ Play Area Setup**
- Use a flat, non-reflective surface
- Place corner markers (IDs 0-3) at table corners
- Ensure 15cm minimum space around play area
- Mark physical boundaries if needed

## 🔧 Troubleshooting

### Connection Issues

**❌ "Failed to connect to ArUco tracker"**
- Verify tracker device is running and accessible
- Check IP address and port settings
- Test network connectivity: `ping tracker-ip`
- Ensure firewall allows WebSocket connections

**🔄 "Connection keeps dropping"**
- Check network stability between devices
- Verify power supply stability for tracking device
- Consider using Ethernet instead of WiFi
- Monitor system resources on tracking device

**⚠️ "WebSocket timeout"**
- Increase reconnection interval in settings
- Check for network congestion
- Verify no proxy servers are interfering
- Test with minimal network load

### Tracking Issues

**📍 "Markers not detected"**
- Improve lighting conditions
- Clean camera lens
- Verify marker quality and contrast
- Check marker size (15mm minimum)
- Ensure markers are flat and unobstructed

**🎯 "Position updates are jumpy"**
- Increase update throttle in settings
- Improve camera mounting stability
- Check for surface reflections
- Verify marker orientation consistency

**🔢 "Wrong tokens being updated"**
- Verify ArUco ID assignments in token flags
- Check for duplicate markers in play area
- Ensure markers are correctly generated
- Clear token cache and reconnect

### Performance Issues

**🐌 "Slow response times"**
- Reduce update frequency in tracker settings
- Check system resources on tracking device
- Optimize camera resolution settings
- Close unnecessary applications

**💾 "High memory usage"**
- Clear tracked token cache regularly
- Limit number of simultaneous markers
- Restart tracking session periodically
- Monitor FoundryVTT performance metrics

### Module-Specific Issues

**⚙️ "Module not loading"**
- Verify all module files are present
- Check browser console for error messages
- Ensure FoundryVTT version compatibility
- Try disabling other modules temporarily

**🎮 "Settings not saving"**
- Check user permissions in FoundryVTT
- Verify world ownership settings
- Clear browser cache and cookies
- Restart FoundryVTT completely

## 🔌 Integration with Tracking Hardware

### Mock Server Testing

For development and testing without physical hardware:

1. **Download Mock Server**: Get the mock FoundryVTT server from releases
2. **Run Mock Server**: `python3 mock_foundry_server.py --port 30000 --ws-port 30001`
3. **Configure Module**: Set tracker host to `localhost`
4. **Test Connection**: Use the built-in connection test

### Raspberry Pi Setup

For production deployment with real camera tracking:

1. **Hardware Requirements**:
   - Raspberry Pi 4 (2GB+ RAM recommended)
   - USB camera or Pi Camera Module
   - Stable mounting system
   - Adequate lighting

2. **Software Installation**:
   - Install OpenCV and ArUco libraries
   - Configure camera settings
   - Set up tracking script
   - Enable WebSocket server

3. **Network Configuration**:
   - Assign static IP to Raspberry Pi
   - Configure firewall rules
   - Test connectivity from FoundryVTT host

### Custom Tracking Solutions

The module supports any tracking system that can:
- Connect via WebSocket to port 30001
- Send position updates in JSON format
- Handle the defined message protocol

See the API documentation for integration details.

## 📚 API Reference

### WebSocket Message Format

**Client → Server (Handshake)**
```json
{
    "type": "foundry_ready",
    "scene_id": "scene-id-string",
    "foundry_host": "localhost",
    "foundry_port": 30000,
    "user_id": "user-id-string",
    "marker_system": "aruco",
    "timestamp": 1627747200000
}
```

**Server → Client (Token Update)**
```json
{
    "type": "token_update",
    "aruco_id": 15,
    "token_id": "optional-token-id",
    "x": 250,
    "y": 300,
    "confidence": 0.95,
    "scene_id": "scene-id-string",
    "marker_type": "player"
}
```

### Console API

Access module functions via browser console:

```javascript
// Get connection status
game.modules.get('aruco-tracker').api.getStatus()

// Force reconnection
game.modules.get('aruco-tracker').api.reconnect()

// Test connection
game.modules.get('aruco-tracker').api.testConnection()

// Get tracked tokens
game.modules.get('aruco-tracker').api.getTrackedTokens()

// View marker schema
game.modules.get('aruco-tracker').api.getMarkerSchema()
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** with proper testing
4. **Submit a pull request** with detailed description

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-username/foundry-aruco-tracker.git

# Create development environment
cd foundry-aruco-tracker
npm install  # If using build tools

# Link to FoundryVTT modules directory
ln -s $(pwd) /path/to/foundrydata/Data/modules/aruco-tracker
```

### Testing

- Test with mock server for basic functionality
- Test with real hardware for integration
- Verify compatibility across FoundryVTT versions
- Check performance with multiple concurrent markers

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

**📖 Documentation**: Check this README and the wiki for detailed guides

**🐛 Bug Reports**: Use GitHub Issues with detailed reproduction steps

**💡 Feature Requests**: Submit enhancement proposals via GitHub Issues

**💬 Community Support**: 
- FoundryVTT Discord: `#module-development`
- Reddit: `/r/FoundryVTT`
- Official Forums: FoundryVTT Community

**🔧 Technical Support**:
- Include FoundryVTT version
- Provide browser console logs
- Describe your hardware setup
- Test with mock server first

## 🎉 Acknowledgments

- **FoundryVTT Team**: For creating an amazing platform
- **OpenCV Community**: For computer vision tools
- **ArUco Developers**: For the marker detection system
- **Beta Testers**: For feedback and bug reports

---

**Transform your tabletop gaming experience with the ArUco Token Tracker!** 🎲✨

*For technical support or questions, please open an issue on GitHub or contact us through the FoundryVTT community channels.*