// Foundry VTT Bifrost Module
// Place this in: Data/modules/bifrost-foundry-vtt/bifrost-foundry-vtt.js
// 
// Open the Developer Tools by pressing F12 and consult the Console tab. Note that in the below example - the statements are logged at 
// different points in time. Depending on what scope of data you need to operate on - you may want to condition execution of module 
// code on certain events (called "hooks") which allow for module logic to interrupt, augment, or replace the default behavior of the VTT platform.
/*
console.log("Hello World! This code runs immediately when the file is loaded.");


Might be useful to add some hooks to react to Foundry events:


// React to token updates
Hooks.on("updateToken", (tokenDocument, change, options, userId) => {
    // Handle external controller state updates
});

// React to token selection
Hooks.on("controlToken", (token, controlled) => {
    // Update controller when tokens are selected/deselected
});
}); */

import { BifrostTokenManager } from "./token-manager.js";
import { BifrostWebSocketHandler } from "./websocket.js";

class BifrostModule {
    constructor() {
        this.websocket = null;
        this.isConnected = false;
        this.lastConnectionAttempt = null;
        this.config = {
            websocketPort: 30001,
            reconnectInterval: 5000,
            updateThrottle: 100
        };
        this.lastUpdate = {};
        this.tokenCache = new Map();
        this.markerSchema = {
            corner: [0, 1, 2, 3],
            player: [10, 25],    // 16 players (IDs 10-25)
            item: [30, 61],      // 32 standard items (IDs 30-61)
            custom: [62, 999]    // Custom markers (IDs 62+)
        };
        
        // Settings variables
        this.heimdallHost = null;
        this.websocketPort = null;
        this.autoCreateTokens = null;
        this.tokenImagePath = null;
        this.playerTokenImage = null;
        this.itemTokenImage = null;

        
    }

    async initialize() {
        console.log("Bifrost | Initializing module");
        
        this.webSocketHandler = new BifrostWebSocketHandler();
        this.bifrostTokenManager = this.webSocketHandler.bifrostTokenManager;
        this.bifrostTokenSync = this.webSocketHandler.bifrostTokenSync;

        this.isConnected = this.webSocketHandler.isConnected;

        // Load configuration and populate settings
        const config = await BifrostModule.loadConfiguration();
        this.populateSettingsFromConfig(config);
        
        // Add module settings
        //this.registerGameSettings(config);
        
        // Set up WebSocket connection
        //this.connectWebSocket();
        
        // Add UI controls
        this.addControls();
    }

    populateSettingsFromConfig(config) {
        this.heimdallHost = config.userSettings?.heimdallHost || config.gameSettings.heimdallHost?.default;
        this.websocketPort = config.userSettings?.websocketPort || config.gameSettings.websocketPort?.default;
        this.autoCreateTokens = config.userSettings?.autoCreateTokens !== undefined ? config.userSettings?.autoCreateTokens : config.gameSettings.autoCreateTokens?.default;
        this.tokenImagePath = config.userSettings?.tokenImagePath || config.gameSettings.tokenImagePath?.default;
        this.playerTokenImage = config.userSettings?.playerTokenImage || config.gameSettings.playerTokenImage?.default;
        this.itemTokenImage = config.userSettings?.itemTokenImage || config.gameSettings.itemTokenImage?.default;
        
        console.log("Bifrost | Settings populated from settings.json file.");
    }

    static async loadConfiguration() {
        let config = null;

        try {
            // Load default configuration
            const configFile = await window.fs.readFile(
                "modules/bifrost-foundry-conduit/config/settings.json",
                { encoding: 'utf8' }
            );
            config = JSON.parse(configFile);
            console.log("Bifrost | Settings file loaded.");

        } catch (error) {
            console.error("Bifrost | Failed to load configuration files: ", error);
            config = BifrostModule.getFallbackConfig();
        }

        return config;
    }

    static getFallbackConfig() {
        return {
            userSettings: {
                heimdallHost: "localhost",
                websocketPort: 30001,
                autoCreateTokens: true,
                tokenImagePath: "icons/svg/mystery-man.svg",
                playerTokenImage: "icons/svg/mystery-man.svg",
                itemTokenImage: "icons/svg/item-bag.svg"
            }
        };
    }

    getMarkerType(arucoId) {
        if (this.markerSchema.corner.includes(arucoId)) {
            return 'corner';
        } else if (arucoId >= this.markerSchema.player[0] && arucoId <= this.markerSchema.player[1]) {
            return 'player';
        } else if (arucoId >= this.markerSchema.item[0] && arucoId <= this.markerSchema.item[1]) {
            return 'item';
        } else if (arucoId >= this.markerSchema.custom[0] && arucoId <= this.markerSchema.custom[1]) {
            return 'custom';
        }
        return 'unknown';
    }

    getItemName(arucoId) {
        const itemNames = {
            30: "Goblin", 31: "Orc", 32: "Skeleton", 33: "Dragon", 34: "Troll", 35: "Wizard_Enemy", 36: "Beast", 37: "Demon",
            40: "Treasure_Chest", 41: "Magic_Item", 42: "Gold_Pile", 43: "Potion", 44: "Weapon", 45: "Armor", 46: "Scroll", 47: "Key",
            50: "NPC_Merchant", 51: "NPC_Guard", 52: "NPC_Noble", 53: "NPC_Innkeeper", 54: "NPC_Priest",
            55: "Door", 56: "Trap", 57: "Fire_Hazard", 58: "Altar", 59: "Portal", 60: "Vehicle", 61: "Objective"
        };
        return itemNames[arucoId] || `Item_${arucoId}`;
    }

    generateTokenName(arucoId, markerType) {
        switch (markerType) {
            case 'player':
                const playerNum = arucoId - 10 + 1;
                return `Player_${playerNum.toString().padStart(2, '0')}`;
            case 'item':
                return this.getItemName(arucoId);
            case 'custom':
                return `Custom_${arucoId}`;
            case 'corner':
                return `Corner_${arucoId}`;
            default:
                return `ArUco_${arucoId}`;
        }
    }


    addControls() {
        // Add token controls to the scene controls
        Hooks.on("getSceneControlButtons", (controls) => {
            const tokenControls = controls.find(c => c.name === "token");
            this.isConnected = this.webSocketHandler.isConnected;
            if (tokenControls) {
                tokenControls.tools.push({
                    name: "bifrost-status",
                    title: "Bifrost Status",
                    icon: this.isConnected ? "fas fa-wifi" : "fas fa-exclamation-triangle",
                    onClick: () => this.showStatusDialog(),
                    button: true
                });
            }
        });
    }

    showStatusDialog() {
        const heimdallHost = this.heimdallHost;
        const port = this.websocketPort;
        this.tokenCache = this.bifrostTokenManager.knownTokens; // Get current token cache
        this.isConnected = this.webSocketHandler.isConnected;
        
        const content = `
            <div>
                <h3>Bifrost Status</h3>
                <p><strong>Heimdall Host:</strong> ${heimdallHost}:${port}</p>
                <p><strong>Connection:</strong> ${this.isConnected ? 'Connected ✓' : 'Disconnected ✗'}</p>
                <p><strong>Tracked Tokens:</strong> ${this.tokenCache.size}</p>
                <p><strong>Active Scene:</strong> ${game.scenes.active?.name || 'None'}</p>
                <p><strong>Foundry VTT Host:</strong> ${window.location.hostname}:${window.location.port || 30000}</p>
                
                <h4>ArUco Marker Schema (Optimized):</h4>
                <ul style="font-size: 0.9em;">
                    <li><strong>Corner markers:</strong> IDs 0-3 (calibration only)</li>
                    <li><strong>Player tokens:</strong> IDs 10-25 (16 players max)</li>
                    <li><strong>Item tokens:</strong> IDs 30-61 (32 standard items)</li>
                    <li><strong>Custom tokens:</strong> IDs 62+ (user defined)</li>
                </ul>
                
                <h4>Optimization Benefits:</h4>
                <ul style="font-size: 0.9em;">
                    <li>✓ Smaller physical markers (15mm minimum)</li>
                    <li>✓ Faster detection performance</li>
                    <li>✓ Total standard IDs: 52 (vs 90+ previously)</li>
                    <li>✓ Better for tabletop gaming use cases</li>
                </ul>
                
                <h4>Network Diagnostics:</h4>
                <p><strong>WebSocket URL:</strong> ws://${heimdallHost}:${port}</p>
                <p><strong>Last Connection Attempt:</strong> ${this.lastConnectionAttempt || 'Never'}</p>
                
                <h4>Tracked ArUco Markers:</h4>
                ${this.tokenCache.size > 0 ? `
                    <ul>
                        ${Array.from(this.tokenCache.entries()).map(([arucoId, data]) => {
                            const markerType = data.markerType || 'unknown';
                            const typeLabel = markerType.charAt(0).toUpperCase() + markerType.slice(1);
                            return `<li>ArUco ${arucoId} (${typeLabel}, Confidence: ${data.confidence?.toFixed(2) || 'N/A'}, Last seen: ${new Date(data.lastSeen).toLocaleTimeString()})</li>`;
                        }).join('')}
                    </ul>
                ` : '<p><em>No ArUco markers currently tracked</em></p>'}
                
                <div style="margin-top: 15px;">
                    <button type="button" onclick="game.modules.get('bifrost').api.testConnection()">
                        Test Connection
                    </button>
                </div>
                
                <h4>Troubleshooting:</h4>
                <ul style="font-size: 0.9em;">
                    <li>Ensure Heimdall is watching from ${heimdallHost}</li>
                    <li>Check that port ${port} is open and accessible</li>
                    <li>Verify Heimdall can see the Foundry host over the network</li>
                    <li>Check firewall settings on both machines</li>
                    <li>Make sure ArUco markers are properly generated and printed</li>
                </ul>
            </div>
        `;
        
        new Dialog({
            title: "Bifrost Status",
            content: content,
            buttons: {
                close: {
                    label: "Close"
                }
            },
            default: "close"
        }).render(true);
    }



    cleanup() {
        console.log("Bifrost | Cleaning up resources");


        //Cleanup token manager
        this.bifrostTokenManager.clearTracking();

        //Cleanup websocket handler
        this.bifrostWebSocket.disconnect();

        this.isConnected = false;
    }
}

// Initialize the module
let bifrost = null;

Hooks.once('init', () => {
    console.log("Bifrost | Module initializing");
    bifrost = new BifrostModule();

    // Set up cleanup when page/game is closed
    window.addEventListener("beforeunload", () => {
        // Clean up websockets and other resources
        if (bifrost) {
            bifrost.cleanup();
        }
    });
});

Hooks.once('ready', () => {
    bifrost.initialize();
    
    // Expose API for console access
    game.modules.get('bifrost').api = {
        getStatus: () => ({
            connected: bifrost.isConnected,
            trackedTokens: bifrost.tokenCache.size,
            heimdallHost: this.heimdallHost,
            websocketPort: this.websocketPort
        }),
        getTrackedTokens: () => Array.from(bifrost.tokenCache.entries()),
        getMarkerSchema: () => bifrost.markerSchema
    };

    // Store internal reference
    game.modules.get('bifrost').instance = bifrost;
});

// Clean up on module disable
Hooks.on('bifrostDisabled', () => {
    bifrost.cleanup();
});

// Auto-sync when tokens are created, updated, or deleted
Hooks.on('createToken', async (tokenDoc) => {
    if (window.BifrostWebSocket?.isConnected) {
        await BifrostTokenSync.syncSpecificToken(tokenDoc.id);
    }
});

Hooks.on('updateToken', async (tokenDoc, changes) => {
    // Only sync if position or other important properties changed
    if (changes.x !== undefined || changes.y !== undefined ||
        changes.hidden !== undefined || changes.name !== undefined) {
        if (window.BifrostWebSocket?.isConnected) {
            await BifrostTokenSync.syncSpecificToken(tokenDoc.id);
        }
    }
});

Hooks.on('deleteToken', async (tokenDoc) => {
    if (window.BifrostWebSocket?.isConnected) {
        window.BifrostWebSocket.send({
            type: 'token_deleted',
            tokenId: tokenDoc.id,
            timestamp: Date.now()
        });
    }
});

// Hook to refresh actor cache when actors change
Hooks.on("createActor", () => BifrostTokenManager.refreshActorCache());
Hooks.on("deleteActor", () => BifrostTokenManager.refreshActorCache());
Hooks.on("updateActor", () => BifrostTokenManager.refreshActorCache());

// Hook to clear tracking when scene changes
Hooks.on("canvasReady", () => {
    console.log("Bifrost | Scene changed, clearing token tracking. Will await new tracking update.");
    BifrostTokenManager.clearTracking();

    setTimeout(async () => {
        if (window.BifrostWebSocket?.isConnected) {
            await BifrostTokenSync.sendTokenListToHeimdall();
        }
    }, 1000);
});



window.BifrostTokenManager = new BifrostTokenManager();
window.BifrostWebSocket = new BifrostWebSocketHandler();

//const bifrostModule = new BifrostModule()
window.BifrostModule = new BifrostModule();