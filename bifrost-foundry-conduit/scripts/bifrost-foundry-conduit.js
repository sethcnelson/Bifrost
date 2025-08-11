
import { BifrostWebSocketHandler } from "./websocket.js";
import { Utils } from "./utils.js";
import { BifrostControlButtons } from "./controls.js";

console.log('Bifrost | Module initialization script started');

class BifrostModule {
    constructor() {
        this.moduleId = 'bifrost';
        this.initialized = false;
        this.ready = false;
        
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
            //const config = await Utils.loadConfiguration();
            //this.settings = config;

            // Register module settings
            this.registerSettings();

            
            // Initialize core systems (but don't start them yet)
            this.webSocketHandler = new BifrostWebSocketHandler();
            this.tokenManager = this.webSocketHandler.bifrostTokenManager;
            this.tokenSync = this.webSocketHandler.bifrostTokenSync;

            // Register API endpoints
            this.registerAPI();

            // Set up hooks for later lifecycle events
            this.registerHooks();
            
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
            this.webSocketHandler.initialize();

            // Start WebSocket connection if auto-connect enabled
            if (game.settings.get(this.moduleId, 'autoConnect')) {
                setTimeout(() => {
                    this.webSocketHandler.connect();
                }, 2000); // Delay to ensure everything is loaded
            }

            // Initialize control buttons
            this.controlButtons = new BifrostControlButtons(this);
            this.controlButtons.initialize();

            this.ready = true;
            console.log('Bifrost | Module started successfully');

        } catch (error) {
            console.error('Bifrost | Startup failed:', error);
        }
    }

    /**
     * Register module settings
     */
    registerSettings() {
        // WebSocket settings
        game.settings.register(this.moduleId, 'heimdallHost', {
            name: 'Heimdall Server Host',
            hint: 'Hostname or IP address of the Heimdall server',
            scope: 'world',
            config: true,
            type: String,
            default: 'localhost'
        });

        game.settings.register(this.moduleId, 'heimdallPort', {
            name: 'Heimdall Server Port',
            hint: 'Port number for Heimdall WebSocket server',
            scope: 'world',
            config: true,
            type: Number,
            default: 3001
        });

        game.settings.register(this.moduleId, 'autoCreateTokens', {
            name: 'Auto-Create Tokens',
            hint: 'Automatically create tokens for ArUco markers when detected',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register(this.moduleId, 'autoConnect', {
            name: 'Auto-Connect to Heimdall',
            hint: 'Automatically connect to Heimdall when module loads',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        });

        game.settings.register(this.moduleId, 'autoHeartbeat', {
            name: 'Auto Heartbeat',
            hint: 'Automatically send heartbeat messages to Heimdall',
            scope: 'world',
            config: true,
            type: Boolean,
            default: true
        });

        game.settings.register(this.moduleId, 'debugMode', {
            name: 'Debug Mode',
            hint: 'Enable detailed logging for debugging',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false
        });

        // Hidden settings for internal data
        game.settings.register(this.moduleId, 'calibrationData', {
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });

        console.log('Bifrost | Settings registered');
    }


    /**
     * Register the module API
     */
    registerAPI() {
        // Method 1: Add to game.modules (Recommended for Foundry)
        /*const moduleData = game.modules.get(this.moduleId);
        if (moduleData) {
            moduleData.api = {
                // Core module access
                instance: this,

                // WebSocket methods
                connect: () => this.webSocketHandler.connect(),
                disconnect: () => this.webSocketHandler.disconnect(),
                getConnectionStatus: () => this.webSocketHandler.getStatus(),
                isConnected: this.webSocketHandler.isConnected,
                send: (message) => this.webSocketHandler.send(message),
                getTrackedTokenCount: this.webSocketHandler.getTrackedTokenCount,

                // Token management
                tokenManager: this.tokenManager,
                syncTokens: () => this.tokenSync.sendTokenListToHeimdall(),
                syncPlayers: () => this.tokenSync.sendPlayerTokensToHeimdall(),
                getTokens: (options) => this.tokenSync.getCurrentSceneTokens(options),

                // Convenience methods
                startAutoSync: (interval) => this.tokenSync.startAutoSync(interval),
                stopAutoSync: () => this.tokenSync.stopAutoSync(),
                clearTracking: () => this.tokenManager.clearTracking(),

                // Status and debugging
                getStatus: () => this.getModuleStatus(),
                isReady: () => this.ready,
                getVersion: () => moduleData.version || '1.0.0'
            };
        }
        */
        
        // Method 2: Add to game object (Alternative approach)
        game.bifrost = {
            module: this,

            connect: () => this.webSocketHandler.connect(),
            disconnect: () => this.webSocketHandler.disconnect(),
            getConnectionStatus: () => this.webSocketHandler.getStatus(),
            isConnected: this.webSocketHandler.isConnected,
            send: (message) => this.webSocketHandler.send(message),
            getTrackedTokenCount: this.webSocketHandler.getTrackedTokenCount,

            // Token management
            tokenManager: this.tokenManager,
            syncTokens: () => this.tokenSync.sendTokenListToHeimdall(),
            syncPlayers: () => this.tokenSync.sendPlayerTokensToHeimdall(),
            getTokens: (options) => this.tokenSync.getCurrentSceneTokens(options),

            // Convenience methods
            startAutoSync: (interval) => this.tokenSync.startAutoSync(interval),
            stopAutoSync: () => this.tokenSync.stopAutoSync(),
            clearTracking: () => this.tokenManager.clearTracking(),

            // Status and debugging
            getStatus: () => this.getModuleStatus(),
            isReady: () => this.ready,
            getVersion: () => moduleData.version || '1.0.0'
        };
        

        Utils.log('Main', 'API registered successfully');
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

