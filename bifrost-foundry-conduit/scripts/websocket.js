/**
 * Bifrost WebSocket Connection Handler
 * Manages WebSocket connection to Heimdall ArUco tracking system
 */
import { BifrostTokenManager } from "./token-manager.js";
import { BifrostTokenSync } from "./token-sync.js";
import { Utils } from "./utils.js";

export class BifrostWebSocketHandler {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
        this.heartbeatInterval = null;
        this.getTrackedTokenCount = 0; // Placeholder, will be set in initialize
        
        this.connectionConfig = {
            url: `ws://${game.settings.get('bifrost', 'heimdallHost') }:${game.settings.get('bifrost', 'heimdallPort') }`,
            port: game.settings.get('bifrost', 'heimdallPort'),
            host: game.settings.get('bifrost', 'heimdallHost')
        };

        this.bifrostTokenManager = new BifrostTokenManager(); // Token manager instance
        this.bifrostTokenSync = new BifrostTokenSync(this); // Token sync instance
    }

    initialize() {
        this.bifrostTokenManager.initialize();

        this.getTrackedTokenCount = this.bifrostTokenManager.getTrackedTokenCount();
    }


    /**
     * Connect to Heimdall WebSocket server
     * @returns {Promise<boolean>} Connection success
     */
    async connect() {
        if (this.isConnected) {
            Utils.log("WebSocket",'Already connected to Heimdall');
            return true;
        }

        Utils.log("WebSocket",`Attempting to connect to Heimdall at ${this.connectionConfig.url}`);

        try {
            this.socket = new WebSocket(this.connectionConfig.url);
            
            // Set up event handlers
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onerror = this.onError.bind(this);

            // Wait for connection to establish
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    Utils.log("WebSocket",'Connection timeout');
                    resolve(false);
                }, 10000);

                this.socket.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve(true);
                }, { once: true });

                this.socket.addEventListener('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                }, { once: true });
            });

        } catch (error) {
            Utils.log("WebSocket",`Connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * WebSocket connection opened
     */
    onOpen(event) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        Utils.log("WebSocket",'Connected to Heimdall successfully');
        
        // Send initial handshake
        this.send({
            type: 'handshake',
            client: 'bifrost',
            version: '1.0.0',
            foundry_version: game.version,
            scene_id: canvas.scene?.id,
            timestamp: Date.now()
        });

        // Start heartbeat if enabled
        if (game.settings.get('bifrost', 'enableHeartbeat')) {
            this.startHeartbeat();
        }

        // Notify UI
        ui.notifications.info("Bifrost: Our Realm basks in the light of Heimdall's Sight!");
        
        // Fire hook for other modules
        Hooks.callAll('bifrost.connected', this);
    }

    /**
     * Handle incoming WebSocket messages
     */
    async onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            Utils.log("WebSocket",`Received message: ${message.type}`, 'debug');
            
            const response = await this.processMessage(message);
            
            // Send response if message has an ID (request-response pattern)
            if (message.id && response) {
                response.id = message.id;
                this.send(response);
            }

        } catch (error) {
            Utils.log("WebSocket",`Error processing message: ${error.message}`, 'error');
            
            // Send error response if possible
            if (message?.id) {
                this.send({
                    id: message.id,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Process incoming messages from Heimdall
     * @param {Object} message - Parsed message object
     * @returns {Promise<Object>} Response to send back
     */
    async processMessage(message) {
        switch (message.type) {
            case 'ping':
                return { type: 'pong', timestamp: Date.now() };

            case 'marker_detected':
                return await this.handleMarkerDetected(message);

            case 'marker_updated':
                return await this.handleMarkerUpdated(message);

            case 'marker_lost':
                return await this.handleMarkerLost(message);

            case 'calibration_update':
                return await this.handleCalibrationUpdate(message);

            case 'get_scene_info':
                return this.getSceneInfo();

            case 'get_tracked_tokens':
                return this.getTrackedTokens();

            case 'clear_all_tracking':
                return this.clearAllTracking();

            case 'query_tokens':
                return await this.bifrostTokenSync.handleTokenQuery(message);
            
                case 'request_token_list':
                await this.bifrostTokenSync.sendTokenListToHeimdall({
                    requestId: message.id,
                    ...message.parameters
                });
                return { success: true, message: 'Token list sent' };
            
            case 'compare_token_state':
                const comparison = this.bifrostTokenSync.compareWithHeimdallState(message.tokens);
                return { success: true, comparison };
            

            default:
                Utils.log("WebSocket",`Unknown message type: ${message.type}`, 'warn');
                return {
                    success: false,
                    error: `Unknown message type: ${message.type}`
                };
        }
    }

    /**
     * Handle marker detected message
     */
    async handleMarkerDetected(message) {
        const result = await this.bifrostTokenManager.handleHeimdallMessage({
            markerId: message.marker_id,
            tokenName: message.token_name,
            x: message.x,
            y: message.y,
            type: message.token_type,
            metadata: message.metadata || {}
        });

        Utils.log("WebSocket",`Marker detected: ${message.marker_id} (${message.token_name})`);
        return result;
    }

    /**
     * Handle marker position update
     */
    async handleMarkerUpdated(message) {
        const tokenId = this.bifrostTokenManager.knownTokens.get(message.marker_id);
        
        if (tokenId) {
            const result = await this.bifrostTokenManager.updateTokenPosition(
                tokenId,
                message.x,
                message.y,
                message.metadata || {}
            );
            
            Utils.log("WebSocket",`Updated marker: ${message.marker_id}`, 'debug');
            return result;
        } else {
            // Unknown marker, treat as new detection
            return await this.handleMarkerDetected(message);
        }
    }

    /**
     * Handle marker lost message
     */
    async handleMarkerLost(message) {
        const result = await this.bifrostTokenManager.removeToken(message.marker_id);
        Utils.log("WebSocket",`Marker lost: ${message.marker_id}`);
        return result;
    }

    /**
     * Handle camera calibration update
     */
    async handleCalibrationUpdate(message) {
        // Store calibration data for coordinate transformation
        await game.settings.set('bifrost', 'calibrationData', {
            corners: message.corners,
            scene_bounds: message.scene_bounds,
            updated_at: Date.now()
        });

        Utils.log("WebSocket",'Camera calibration updated');
        return { success: true, message: 'Calibration updated' };
    }

    /**
     * Get current scene information
     */
    getSceneInfo() {
        const scene = canvas.scene;
        if (!scene) {
            return {
                success: false,
                error: 'No active scene'
            };
        }

        return {
            success: true,
            scene: {
                id: scene.id,
                name: scene.name,
                width: scene.width,
                height: scene.height,
                grid_size: scene.grid.size,
                grid_type: scene.grid.type,
                token_count: scene.tokens.size
            }
        };
    }

    /**
     * Get currently tracked tokens
     */
    getTrackedTokens() {
        return {
            success: true,
            tracked_tokens: this.bifrostTokenManager.getTrackedTokensStatus()
        };
    }

    

    /**
     * Clear all token tracking
     */
    clearAllTracking() {
        this.bifrostTokenManager.clearTracking();
        return {
            success: true,
            message: 'All tracking cleared'
        };
    }

    /**
     * WebSocket connection closed
     */
    onClose(event) {
        this.isConnected = false;
        this.stopHeartbeat();
        
        Utils.log("WebSocket",`Connection closed: ${event.code} - ${event.reason}`);
        ui.notifications.warn('Bifrost: The Sight of Heimdall does not reach us..');

        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        }

        // Fire hook for other modules
        Hooks.callAll('bifrost.disconnected', this, event);
    }

    /**
     * WebSocket error occurred
     */
    onError(event) {
        Utils.log('WebSocket',`WebSocket error occurred`, 'error');
        ui.notifications.error("Bifrost: Heimdall's unfailing Sight is failed!");
    }

    /**
     * Attempt to reconnect to Heimdall
     */
    async attemptReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        Utils.log('WebSocket',`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            const connected = await this.connect();
            if (!connected && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect();
            } else if (!connected) {
                Utils.log('WebSocket','Max reconnection attempts reached', 'error');
                ui.notifications.error('Bifrost: Heimdall has forsaken this realm to the darkness!');
            }
        }, delay);
    }

    /**
     * Send message to Heimdall
     * @param {Object} message - Message to send
     * @returns {boolean} Send success
     */
    send(message) {
        if (!this.isConnected || !this.socket) {
            Utils.log('WebSocket','Cannot send message: not connected', 'warn');
            return false;
        }

        try {
            const messageString = JSON.stringify(message);
            this.socket.send(messageString);
            Utils.log('WebSocket',`Sent message: ${message.type}`, 'debug');
            return true;
        } catch (error) {
            Utils.log('WebSocket',`Failed to send message: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Start heartbeat to maintain connection
     */
    startHeartbeat() {
        this.stopHeartbeat(); // Clear any existing interval
        
        this.heartbeatInterval = setInterval(() => {
            this.send({
                type: 'ping',
                timestamp: Date.now()
            });
        }, 30000); // Every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Disconnect from Heimdall
     */
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.close(1000, 'Intentional disconnect');
            this.socket = null;
        }
        this.bifrostTokenManager.clearTracking();
        Utils.log('WebSocket','Disconnected from Heimdall');
        this.isConnected = false;
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            url: this.connectionConfig.url,
            reconnect_attempts: this.reconnectAttempts,
            socket_state: this.socket?.readyState
        };
    }

}
