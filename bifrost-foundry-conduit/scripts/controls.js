/**
 * Bifrost Control Button Implementations
 * Various ways to add control buttons to Foundry VTT
 */
import { Utils } from './utils.js';

export class BifrostControlButtons {
    constructor(bifrostModule) {
        this.module = bifrostModule;
        this.controlsAdded = false;
    }

    /**
     * Initialize all control buttons
     * Call this from your module's ready hook
     */
    initialize() {
        Utils.log('Controls', 'Initializing control buttons...');
        
        // Add scene controls (left sidebar)
        this.addSceneControls();
        
        // Add token controls (when tokens are selected)
        //this.addTokenControls();
        
        // Add settings button (gear menu)
        //this.addSettingsButton();
        
        // Add floating control panel (optional)
        //this.addFloatingControls();

        this.addPerformanceStats();
        
        this.controlsAdded = true;
        Utils.log('Controls', 'Control buttons initialized');
    }

    /**
     * Add Bifrost controls to the scene controls (left sidebar)
     * This creates a new tool group like Token, Measure, etc.
     */
    addSceneControls() {
        // Add to scene controls
        Hooks.on('getSceneControlButtons', (controls) => {
            const bifrostControls = {
                name: 'bifrost',
                title: 'Bifrost Controls',
                icon: game.bifrost.isConnected ? "fas fa-wifi" : "fas fa-exclamation-triangle",
                layer: 'TokenLayer',
                visible: game.user.isGM, // Only show to GM
                tools: [
                    {
                        name: 'connect',
                        title: 'Connect to Heimdall',
                        icon: 'fas fa-plug',
                        button: true,
                        onClick: () => this.handleConnectClick()
                    },
                    {
                        name: 'disconnect', 
                        title: 'Disconnect from Heimdall',
                        icon: 'fas fa-unlink',
                        button: true,
                        onClick: () => this.handleDisconnectClick()
                    },
                    {
                        name: 'sync',
                        title: 'Sync Tokens with Heimdall',
                        icon: 'fas fa-sync',
                        button: true,
                        onClick: () => this.handleSyncClick()
                    },
                    {
                        name: 'status',
                        title: 'Show Bifrost Status',
                        icon: 'fas fa-info-circle',
                        button: true,
                        onClick: () => this.handleStatusClick()
                    },
                    {
                        name: 'calibrate',
                        title: 'Calibrate Camera',
                        icon: 'fas fa-camera',
                        button: true,
                        onClick: () => this.handleCalibrateClick()
                    }
                ]
            };

            //v12 and below used this method?
            //controls.push(bifrostControls);
            controls["bifrost"] = bifrostControls;
            Utils.log('Controls', 'Scene controls added');
        });
    }

    /**
     * Add controls to token HUD (when right-clicking tokens)
     */
    addTokenControls() {
        // Add button to token HUD
        Hooks.on('renderTokenHUD', (hud, html, data) => {
            Utils.log('Controls', 'User is GM: ' + (game?.user?.isGM || 'false'));
            if (!game.user.isGM) return;

            const token = canvas.tokens.get(data._id);
            if (!token) return;

            // Create Bifrost button
            const bifrostButton = $(`
                <button type="button" class="control-icon" data-tooltip="Bifrost Controls">
                    <i class="fas fa-wifi"></i>
                </button>
            `);

            // Add click handler
            bifrostButton.click((event) => {
                event.preventDefault();
                this.handleTokenBifrostClick(token);
            });

            // Insert button into HUD
            $('.col left').append(bifrostButton);
            
            Utils.log('Controls', 'Token HUD button added for token: ' + token.name);
        });

        // Alternative: Add to token context menu
        Hooks.on('getTokenDirectoryEntryContext', this.addTokenDirectoryContext.bind(this));
    }

    /**
     * Add Bifrost button to settings/configure menu
     */
    addSettingsButton() {
        // Add to settings menu
        Hooks.on('renderSettings', (app, html) => {
            if (!game.user.isGM) return;

            const bifrostButton = $(`
                <button type="button" id="bifrost-settings" data-action="openApp" data-app="bifrost-settings">
                    <i class="fas fa-wifi"></i>
                    Bifrost Settings
                </button>
            `);

            bifrostButton.click(() => {
                this.openBifrostSettings();
            });

            // Insert after module management button
            $('section.settings.flexcol').$('button[data-app="modules"]').after(bifrostButton);
        });
    }

    /**
     * Add floating control panel (always visible)
     */
    addFloatingControls() {
        if (!game.user.isGM) return;

        // Create floating control panel
        const controlPanel = $(`
            <div id="bifrost-controls" style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #999;
                border-radius: 5px;
                padding: 10px;
                z-index: 1000;
                min-width: 150px;
                color: white;
            ">
                <h4 style="margin: 0 0 10px 0; text-align: center;">
                    <i class="fas fa-wifi"></i> Bifrost
                </h4>
                <div class="bifrost-status" style="margin-bottom: 10px;">
                    <small>Status: <span id="bifrost-connection-status">Disconnected</span></small>
                </div>
                <div class="bifrost-buttons" style="display: flex; flex-direction: column; gap: 5px;">
                    <button id="bifrost-toggle-connection" class="bifrost-btn" style="
                        background: #333;
                        color: white;
                        border: 1px solid #666;
                        padding: 5px;
                        cursor: pointer;
                        border-radius: 3px;
                    ">Connect</button>
                    <button id="bifrost-sync-tokens" class="bifrost-btn" style="
                        background: #333;
                        color: white;
                        border: 1px solid #666;
                        padding: 5px;
                        cursor: pointer;
                        border-radius: 3px;
                    ">Sync Tokens</button>
                    <button id="bifrost-show-status" class="bifrost-btn" style="
                        background: #333;
                        color: white;
                        border: 1px solid #666;
                        padding: 5px;
                        cursor: pointer;
                        border-radius: 3px;
                    ">Show Status</button>
                </div>
            </div>
        `);

        // Add to body
        $('body').append(controlPanel);

        // Add event handlers
        $('#bifrost-toggle-connection').click(() => {
            this.toggleConnection();
        });

        $('#bifrost-sync-tokens').click(() => {
            this.handleSyncClick();
        });

        $('#bifrost-show-status').click(() => {
            this.handleStatusClick();
        });

        // Update status periodically
        this.startStatusUpdates();

        Utils.log('Controls', 'Floating controls added');
    }

    addPerformanceStats() {
        if (!game.user.isGM) return;

        // Create performance stats panel
        //div.class= good|fair|poor
        // span.class = "average"
        const statsPanel1 = $(`
            <div id="bifrost-perf" class="">
                <label>Bifrost</label>
                <span class="average" id="bifrost-status"></span>
            </div>
            `);
        const statsPanel2 = $(`
            <div id="bifrost-tokens" class="">
                <label>Tokens</label>
                <span class="average" id="bifrost-token-status"></span>
            </div>
        `);
        
        $('#performance-stats').append(statsPanel1);
        $('#performance-stats').append(statsPanel2);

        $('#bifrost-perf').className = (game.bifrost.isConnected ? 'good' : 'poor');
        $('#bifrost-status').textContent = (game.bifrost.isConnected ? 'OK' : 'X');
        $('#bifrost-tokens').className = (game.bifrost.isConnected ? 'good' : 'fair');
        $('#bifrost-token-status').textContent = game.bifrost.getTrackedTokenCount;

        /*setInterval(() => {
            const connected = this.module.webSocketHandler?.isConnected || false;
            $('#bifrost-perf').className = (connected ? 'good' : 'poor');
            $('#bifrost-status').textContent = (connected ? 'OK' : 'X');
            $('#bifrost-tokens').className = (connected ? 'good' : 'fair');
            $('#bifrost-token-status').textContent = this.module.webSocketHandler?.getTrackedTokenCount;
        }, 5000);*/

        Utils.log('Controls', 'Performance stats panel added');
    }

    /**
     * Handle control button clicks
     */
    async handleConnectClick() {
        Utils.log('Controls', 'Connect button clicked');
        
        try {
            const success = await this.module.webSocketHandler.connect();
            if (success) {
                ui.notifications.info('Connected to Heimdall successfully');
            } else {
                ui.notifications.error('Failed to connect to Heimdall');
            }
        } catch (error) {
            Utils.log('Controls', 'Connection error: '+ error, 'error');
            ui.notifications.error('Connection error: ' + error.message);
        }
    }

    async handleDisconnectClick() {
        Utils.log('Controls', 'Disconnect button clicked');
        
        try {
            this.module.webSocketHandler.disconnect();
            ui.notifications.info('Disconnected from Heimdall');
        } catch (error) {
            Utils.log('Controls', 'Disconnect error: ' + error, 'error');
        }
    }

    async handleSyncClick() {
        Utils.log('Controls', 'Sync button clicked');
        
        try {
            const success = await this.module.tokenSync.sendTokenListToHeimdall();
            if (success) {
                ui.notifications.info('Tokens synced with Heimdall');
            } else {
                ui.notifications.warn('Failed to sync tokens - not connected?');
            }
        } catch (error) {
            Utils.log('Controls', 'Sync error: ' + error, 'error');
            ui.notifications.error('Sync error: ' + error.message);
        }
    }

    handleStatusClick() {
        Utils.log('Controls', 'Status button clicked');
        
        const status = this.module.getModuleStatus();
        const statusDialog = new Dialog({
            title: 'Bifrost Status',
            content: `
                <div style="font-family: monospace;">
                    <h3>Connection Status</h3>
                    <p><strong>Connected:</strong> ${status.websocket?.connected || false}</p>
                    <p><strong>URL:</strong> ${status.websocket?.url || 'Not set'}</p>
                    
                    <h3>Token Tracking</h3>
                    <p><strong>Tracked Tokens:</strong> ${status.tokenManager?.trackedTokens || 0}</p>
                    
                    <h3>Module Status</h3>
                    <p><strong>Initialized:</strong> ${status.initialized}</p>
                    <p><strong>Ready:</strong> ${status.ready}</p>
                    
                    <h3>Settings</h3>
                    <p><strong>Host:</strong> ${status.settings?.heimdallHost || 'localhost'}</p>
                    <p><strong>Port:</strong> ${status.settings?.heimdallPort || 8080}</p>
                    <p><strong>Auto-Connect:</strong> ${status.settings?.autoConnect || false}</p>
                </div>
            `,
            buttons: {
                close: {
                    label: 'Close'
                }
            },
            default: 'close'
        });
        
        statusDialog.render(true);
    }

    handleCalibrateClick() {
        Utils.log('Controls', ' Calibrate button clicked');
        
        ui.notifications.info('Bifrost humbly requests of Heimdall a survey of The Table Realm...');
        
        if (this.module.webSocketHandler.isConnected) {
            this.module.webSocketHandler.send({
                type: 'start_calibration',
                timestamp: Date.now()
            });
        } else {
            ui.notifications.warn('Bifrost is unseen by Heimdall!');
        }
    }

    handleTokenBifrostClick(token) {
        Utils.log('Controls', ' Token button clicked for:', token.name);
        
        const isTracked = this.module.tokenManager.knownTokens.has(token.document.getFlag('bifrost', 'aruco.markerId'));
        
        const dialog = new Dialog({
            title: `Bifrost Controls - ${token.name}`,
            content: `
                <div>
                    <p><strong>Token:</strong> ${token.name}</p>
                    <p><strong>ArUco Status:</strong> ${isTracked ? 'Tracked' : 'Not Tracked'}</p>
                    <p>What would you like to do?</p>
                </div>
            `,
            buttons: {
                assignMarker: {
                    label: 'Assign ArUco Marker',
                    callback: () => this.assignMarkerToToken(token)
                },
                syncPosition: {
                    label: 'Sync Position',
                    callback: () => this.syncTokenPosition(token)
                },
                removeTracking: {
                    label: 'Remove Tracking',
                    callback: () => this.removeTokenTracking(token)
                },
                close: {
                    label: 'Close'
                }
            },
            default: 'close'
        });
        
        dialog.render(true);
    }

    /**
     * Toggle connection state
     */
    async toggleConnection() {
        if (this.module.webSocketHandler.isConnected) {
            await this.handleDisconnectClick();
        } else {
            await this.handleConnectClick();
        }
    }

    /**
     * Update floating control status
     */
    startStatusUpdates() {
        setInterval(() => {
            const connected = this.module.webSocketHandler?.isConnected || false;
            $('#bifrost-connection-status').text(connected ? 'Connected' : 'Disconnected');
            $('#bifrost-connection-status').css('color', connected ? '#4CAF50' : '#F44336');
            
            const toggleBtn = $('#bifrost-toggle-connection');
            toggleBtn.text(connected ? 'Disconnect' : 'Connect');
            toggleBtn.css('background', connected ? '#F44336' : '#4CAF50');
        }, 1000);
    }

    /**
     * Token-specific actions
     */
    // TODO: Token specific actions should be handled by the token manager!
    async assignMarkerToToken(token) {
        // Request Heimdall to assign a marker to this token
        if (this.module.webSocketHandler.isConnected) {
            this.module.webSocketHandler.send({
                type: 'assign_marker_to_token',
                token: {
                    id: token.id,
                    name: token.name,
                    position: { x: token.x, y: token.y }
                }
            });
            ui.notifications.info(`Bifrost requests Heimdall consign hereby token, ${token.name}, to his sight within The Table Realm.`);
        } else {
            ui.notifications.warn('Bifrost is unseen by Heimdall!');
        }
    }

    async syncTokenPosition(token) {
        await this.module.tokenSync.syncSpecificToken(token.id);
        ui.notifications.info(`Heimdall has observed the position of ${token.name}`);
    }

    async removeTokenTracking(token) {
        const markerId = token.document.getFlag('bifrost', 'aruco.markerId');
        if (markerId) {
            await this.module.tokenManager.removeToken(markerId);
            await token.document.unsetFlag('bifrost', 'aruco');
            ui.notifications.info(`Heimdall will no longer see the token ${token.name}`);
        }
    }

    /**
     * Add context menu to token directory
     */
    addTokenDirectoryContext(html, entryOptions) {
        entryOptions.push({
            name: 'Bifrost Controls',
            icon: '<i class="fas fa-wifi"></i>',
            condition: game.user.isGM,
            callback: (li) => {
                const token = game.actors.get(li.data('documentId'));
                if (token) {
                    // Open Bifrost controls for this actor
                    this.openActorBifrostControls(token);
                }
            }
        });
    }

    openActorBifrostControls(actor) {
        Utils.log('Controls', 'Opening controls for actor: ' + actor.name);
        // Implementation for actor-specific controls
    }

    /**
     * Open Bifrost settings dialog
     */
    openBifrostSettings() {
        const currentHost = game.settings.get('bifrost', 'heimdallHost');
        const currentPort = game.settings.get('bifrost', 'heimdallPort');
        const autoConnect = game.settings.get('bifrost', 'autoConnect');
        
        const dialog = new Dialog({
            title: 'Bifrost Settings',
            content: `
                <form>
                    <div class="form-group">
                        <label>Heimdall Host:</label>
                        <input type="text" name="host" value="${currentHost}" />
                    </div>
                    <div class="form-group">
                        <label>Heimdall Port:</label>
                        <input type="number" name="port" value="${currentPort}" />
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="autoConnect" ${autoConnect ? 'checked' : ''} />
                            Auto-Connect on Load
                        </label>
                    </div>
                </form>
            `,
            buttons: {
                save: {
                    label: 'Save',
                    callback: (html) => {
                        const formData = new FormData(html.find('form')[0]);
                        game.settings.set('bifrost', 'heimdallHost', formData.get('host'));
                        game.settings.set('bifrost', 'heimdallPort', parseInt(formData.get('port')));
                        game.settings.set('bifrost', 'autoConnect', formData.has('autoConnect'));
                        ui.notifications.info('Bifrost settings saved');
                    }
                },
                cancel: {
                    label: 'Cancel'
                }
            },
            default: 'save'
        });
        
        dialog.render(true);
    }
}

