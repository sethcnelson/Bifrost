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

import { BifrostWebSocketHandler } from "./websocket.js";
import { Utils } from "./utils.js";

class BifrostModule {
    constructor() {
        this.moduleId = 'bifrost';
        this.initialized = false;
        this.ready = false;
        
        
        // Settings variables
        this.settings = {};

        // Sub-system references
        this.webSocketHandler = null;
    }

    async initialize() {
        if (this.initialized) {
            console.warn('Bifrost | Module already initialized');
            return;
        }
        console.log("Bifrost | Initializing module");
        
        try {
            // Load configuration and populate settings
            const config = await Utils.loadConfiguration();
            this.settings = config;

            // Register module settings
            //this.registerSettings();

            
            // Initialize core systems (but don't start them yet)
            this.webSocketHandler = new BifrostWebSocketHandler(config);
            this.tokenManager = this.webSocketHandler.bifrostTokenManager;
            this.tokenSync = this.webSocketHandler.bifrostTokenSync;

            // Register API endpoints
            //this.registerAPI();

            // Set up hooks for later lifecycle events
            this.registerHooks();
            
            // Add UI controls
            this.addControls();

            this.initialized = true;
            console.log('Bifrost | Module initialized successfully');

        } catch (error) {
            console.error('Bifrost | Initialization failed:', error);
            throw error;
        }
        
        
    }

    /**
     * Start the module (called during 'ready' hook)
     * Begin actual functionality
     */
    async start() {
        if (!this.initialized) {
            console.error('Bifrost | Cannot start - module not initialized');
            return;
        }

        if (this.ready) {
            console.warn('Bifrost | Module already started');
            return;
        }

        console.log('Bifrost | Starting module...');

        try {
            
            // Start WebSocket connection if auto-connect enabled
            if (this.autoConnect) {
                setTimeout(() => {
                    this.webSocketHandler.connect();
                }, 2000); // Delay to ensure everything is loaded
            }

            this.ready = true;
            console.log('Bifrost | Module started successfully');

        } catch (error) {
            console.error('Bifrost | Startup failed:', error);
        }
    }

    /**
     * Register hooks for lifecycle events
     */
    registerHooks() {
        // Scene change handling
        Hooks.on('canvasReady', () => {
            if (this.ready && this.webSocketHandler.isConnected) {
                // Notify Heimdall of scene change
                this.webSocketHandler.send({
                    type: 'scene_changed',
                    scene_id: canvas.scene?.id,
                    scene_name: canvas.scene?.name
                });

                // Send updated token list
                setTimeout(() => {
                    this.tokenSync.sendTokenListToHeimdall();
                }, 1000);
            }
        });

        // Token change handling
        Hooks.on('createToken', async (tokenDoc) => {
            if (this.ready && this.webSocketHandler.isConnected) {
                await this.tokenSync.syncSpecificToken(tokenDoc.id);
            }
        });

        Hooks.on('updateToken', async (tokenDoc, changes) => {
            if (this.ready && this.webSocketHandler.isConnected) {
                // Only sync important changes
                if (changes.x !== undefined || changes.y !== undefined ||
                    changes.hidden !== undefined || changes.name !== undefined) {
                    await this.tokenSync.syncSpecificToken(tokenDoc.id);
                }
            }
        });

        Hooks.on('deleteToken', async (tokenDoc) => {
            if (this.ready && this.webSocketHandler.isConnected) {
                this.webSocketHandler.send({
                    type: 'token_deleted',
                    tokenId: tokenDoc.id,
                    timestamp: Date.now()
                });
            }
        });


        // Hook to refresh actor cache when actors change
        Hooks.on("createActor", () => this.tokenManager.refreshActorCache());
        Hooks.on("deleteActor", () => this.tokenManager.refreshActorCache());
        Hooks.on("updateActor", () => this.tokenManager.refreshActorCache());
        

        console.log('Bifrost | Hooks registered');
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
        this.tokenCache = this.tokenManager.knownTokens; // Get current token cache
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


    /**
     * Get overall module status
     */
    getModuleStatus() {
        return {
            initialized: this.initialized,
            ready: this.ready,
            websocket: this.webSocketHandler?.getStatus(),
            tokenManager: {
                trackedTokens: this.tokenManager?.getTrackedTokensStatus()?.length || 0
            },
            config: this.config
        };
    }

    /**
     * Shutdown the module cleanly
     */
    shutdown() {
        console.log('Bifrost | Shutting down module...');

        try {
            // Stop background tasks
            this.tokenSync?.stopAutoSync();

            // Disconnect WebSocket
            this.webSocketHandler?.disconnect();
            this.isConnected = false;

            // Clear tracking data
            this.tokenManager?.clearTracking();

            this.ready = false;
            console.log('Bifrost | Module shutdown complete');

        } catch (error) {
            console.error('Bifrost | Shutdown error:', error);
        }
    }

}


/**
 * MODULE INITIALIZATION
 * This is where the magic happens
 */

// Create the module instance
let bifrostModule;

// Initialize during 'init' hook (early lifecycle)
Hooks.once('init', async () => {
    console.log('Bifrost | Init hook fired');

    try {
        bifrostModule = new BifrostModule();
        await bifrostModule.initialize();

        // Set up cleanup when page/game is closed
        window.addEventListener("beforeunload", () => {
            // Clean up websockets and other resources
            if (bifrostModule) {
                bifrostModule.shutdown();
            }
        });
    } catch (error) {
        console.error('Bifrost | Failed to initialize:', error);
        ui.notifications.error('Bifrost module failed to initialize. Check console for details.');
    }
});

// Start during 'ready' hook (late lifecycle, everything loaded)
Hooks.once('ready', async () => {
    console.log('Bifrost | Ready hook fired');

    if (bifrostModule) {
        await bifrostModule.start();
        ui.notifications.info('Bifrost module loaded successfully');
    } else {
        console.error('Bifrost | Module instance not found');
        ui.notifications.error('Bifrost module failed to start');
    }
});

// Optional: Handle module disable
Hooks.on('bifrostDisabled', () => {
    if (bifrostModule) {
        bifrostModule.shutdown();
    }
});




console.log('Bifrost | Module initialization script loaded');

