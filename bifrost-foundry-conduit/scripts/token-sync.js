/**
 * Bifrost Token Query and Synchronization Methods
 * Methods to query Foundry tokens and sync with Heimdall
 */

export class BifrostTokenSync {
    constructor(webSocketHandler) {
        this.websocket = webSocketHandler;
        this.lastSyncTime = 0;
        this.syncInterval = null;
    }

    /**
     * Get all tokens from the current scene with detailed information
     * @param {Object} options - Query options
     * @param {boolean} options.includeHidden - Include hidden tokens
     * @param {string[]} options.filterTypes - Filter by token types
     * @param {boolean} options.includeActorData - Include actor information
     * @returns {Array} Array of token data objects
     */
    getCurrentSceneTokens(options = {}) {
        const {
            includeHidden = false,
            filterTypes = null,
            includeActorData = true
        } = options;

        if (!canvas.scene) {
            console.warn('Bifrost: No active scene');
            return [];
        }

        const tokens = [];
        
        for (const tokenDoc of canvas.scene.tokens) {
            // Skip hidden tokens if not requested
            if (!includeHidden && tokenDoc.hidden) {
                continue;
            }

            // Determine token type
            const tokenType = this.determineTokenType(tokenDoc);
            
            // Filter by type if specified
            if (filterTypes && !filterTypes.includes(tokenType)) {
                continue;
            }

            // Build token data object
            const tokenData = {
                id: tokenDoc.id,
                name: tokenDoc.name,
                type: tokenType,
                position: {
                    x: tokenDoc.x,
                    y: tokenDoc.y
                },
                properties: {
                    width: tokenDoc.width,
                    height: tokenDoc.height,
                    rotation: tokenDoc.rotation,
                    elevation: tokenDoc.elevation,
                    hidden: tokenDoc.hidden,
                    locked: tokenDoc.locked
                },
                display: {
                    img: tokenDoc.texture.src,
                    scale: tokenDoc.texture.scaleX,
                    alpha: tokenDoc.alpha,
                    disposition: tokenDoc.disposition
                },
                vision: {
                    vision: tokenDoc.sight.enabled,
                    brightSight: tokenDoc.sight.range,
                    dimSight: tokenDoc.sight.range,
                    brightLight: tokenDoc.light.bright,
                    dimLight: tokenDoc.light.dim
                },
                // Actor information
                actor: includeActorData ? this.getActorInfo(tokenDoc) : null,
                
                // Bifrost-specific data
                bifrost: {
                    isTracked: this.isTokenTracked(tokenDoc),
                    arUcoMarker: this.getArUcoMarker(tokenDoc),
                    lastUpdate: tokenDoc.getFlag('bifrost', 'aruco.lastUpdate') || null,
                    createdBy: tokenDoc.getFlag('bifrost', 'aruco.type') || 'manual'
                },
                
                // Metadata
                flags: tokenDoc.flags,
                createdTime: tokenDoc._stats?.createdTime,
                modifiedTime: tokenDoc._stats?.modifiedTime
            };

            tokens.push(tokenData);
        }

        return tokens;
    }

    /**
     * Determine the type of token (player, enemy, item, etc.)
     * @param {TokenDocument} tokenDoc - Token document
     * @returns {string} Token type
     */
    determineTokenType(tokenDoc) {
        // Check Bifrost flags first
        const bifrostType = tokenDoc.getFlag('bifrost', 'aruco.type');
        if (bifrostType) {
            return bifrostType;
        }

        // Check if token is linked to an actor
        if (tokenDoc.actorLink && tokenDoc.actor) {
            const actor = tokenDoc.actor;
            
            // Check actor type
            if (actor.type === 'character') {
                return 'player';
            } else if (actor.type === 'npc') {
                // Determine based on disposition or other factors
                switch (tokenDoc.disposition) {
                    case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
                        return 'ally';
                    case CONST.TOKEN_DISPOSITIONS.HOSTILE:
                        return 'enemy';
                    case CONST.TOKEN_DISPOSITIONS.NEUTRAL:
                        return 'npc';
                    default:
                        return 'npc';
                }
            } else {
                return actor.type; // vehicle, etc.
            }
        }
        
        // For unlinked tokens, check disposition and other properties
        if (!tokenDoc.actorId) {
            // Check name patterns or flags to determine type
            const name = tokenDoc.name.toLowerCase();
            if (name.includes('player') || name.includes('pc')) {
                return 'player';
            } else if (name.includes('item') || name.includes('treasure')) {
                return 'item';
            } else if (tokenDoc.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
                return 'enemy';
            } else {
                return 'unknown';
            }
        }

        return 'unknown';
    }

    /**
     * Get actor information for a token
     * @param {TokenDocument} tokenDoc - Token document
     * @returns {Object|null} Actor information
     */
    getActorInfo(tokenDoc) {
        if (!tokenDoc.actor) {
            return null;
        }

        const actor = tokenDoc.actor;
        
        return {
            id: actor.id,
            name: actor.name,
            type: actor.type,
            isLinked: tokenDoc.actorLink,
            img: actor.img,
            system: {
                // Include basic system data (HP, AC, etc.)
                // Adjust based on your game system
                attributes: actor.system.attributes || {},
                details: actor.system.details || {}
            },
            ownership: actor.ownership,
            items: actor.items?.size || 0,
            effects: actor.effects?.size || 0
        };
    }

    /**
     * Check if token is currently being tracked by ArUco system
     * @param {TokenDocument} tokenDoc - Token document
     * @returns {boolean} Whether token is tracked
     */
    isTokenTracked(tokenDoc) {
        const markerId = tokenDoc.getFlag('bifrost', 'aruco.markerId');
        if (!markerId) return false;
        
        // Check if token is in the known tokens map
        return window.BifrostTokenManager?.knownTokens?.has(markerId) || false;
    }

    /**
     * Get ArUco marker information for a token
     * @param {TokenDocument} tokenDoc - Token document
     * @returns {Object|null} ArUco marker data
     */
    getArUcoMarker(tokenDoc) {
        const arUcoData = tokenDoc.getFlag('bifrost', 'aruco');
        if (!arUcoData) return null;

        return {
            markerId: arUcoData.markerId,
            type: arUcoData.type,
            createdAt: arUcoData.createdAt,
            lastUpdate: arUcoData.lastUpdate
        };
    }

    /**
     * Send current token list to Heimdall
     * @param {Object} options - Query options
     * @param {string} options.requestId - Optional request ID for response tracking
     * @returns {Promise<boolean>} Success status
     */
    async sendTokenListToHeimdall(options = {}) {
        const tokens = this.getCurrentSceneTokens(options);
        
        const message = {
            type: 'token_list_update',
            timestamp: Date.now(),
            scene: {
                id: canvas.scene?.id,
                name: canvas.scene?.name,
                dimensions: {
                    width: canvas.scene?.width,
                    height: canvas.scene?.height,
                    gridSize: canvas.scene?.grid?.size
                }
            },
            tokens: tokens,
            summary: {
                total: tokens.length,
                byType: this.getTokenSummaryByType(tokens),
                tracked: tokens.filter(t => t.bifrost.isTracked).length,
                untracked: tokens.filter(t => !t.bifrost.isTracked).length
            }
        };

        if (options.requestId) {
            message.requestId = options.requestId;
        }

        try {
            const success = this.websocket.send(message);
            if (success) {
                this.lastSyncTime = Date.now();
                console.log(`Bifrost: Sent ${tokens.length} tokens to Heimdall`);
            }
            return success;
        } catch (error) {
            console.error('Bifrost: Failed to send token list to Heimdall:', error);
            return false;
        }
    }

    /**
     * Get summary of tokens by type
     * @param {Array} tokens - Token array
     * @returns {Object} Summary by type
     */
    getTokenSummaryByType(tokens) {
        const summary = {};
        for (const token of tokens) {
            summary[token.type] = (summary[token.type] || 0) + 1;
        }
        return summary;
    }

    /**
     * Send only player tokens to Heimdall
     * @returns {Promise<boolean>} Success status
     */
    async sendPlayerTokensToHeimdall() {
        return await this.sendTokenListToHeimdall({
            filterTypes: ['player'],
            includeHidden: false
        });
    }

    /**
     * Send only untracked tokens to Heimdall
     * @returns {Promise<boolean>} Success status
     */
    async sendUntrackedTokensToHeimdall() {
        const allTokens = this.getCurrentSceneTokens();
        const untrackedTokens = allTokens.filter(t => !t.bifrost.isTracked);
        
        const message = {
            type: 'untracked_tokens',
            timestamp: Date.now(),
            scene_id: canvas.scene?.id,
            tokens: untrackedTokens
        };

        return this.websocket.send(message);
    }

    /**
     * Request Heimdall to map specific tokens to ArUco markers
     * @param {Array} tokenIds - Array of token IDs to map
     * @returns {Promise<boolean>} Success status
     */
    async requestTokenMapping(tokenIds) {
        const tokens = tokenIds.map(id => {
            const tokenDoc = canvas.scene.tokens.get(id);
            if (!tokenDoc) return null;
            
            return {
                id: tokenDoc.id,
                name: tokenDoc.name,
                type: this.determineTokenType(tokenDoc),
                position: { x: tokenDoc.x, y: tokenDoc.y },
                suggestedMarkerId: this.suggestMarkerIdForToken(tokenDoc)
            };
        }).filter(Boolean);

        const message = {
            type: 'request_token_mapping',
            timestamp: Date.now(),
            tokens: tokens
        };

        return this.websocket.send(message);
    }

    /**
     * Suggest an ArUco marker ID for a token based on its properties
     * @param {TokenDocument} tokenDoc - Token document
     * @returns {string|null} Suggested marker ID
     */
    suggestMarkerIdForToken(tokenDoc) {
        const tokenType = this.determineTokenType(tokenDoc);
        const name = tokenDoc.name.toLowerCase();
        
        // Suggest marker IDs based on patterns
        if (tokenType === 'player') {
            if (name.includes('player 1') || name.includes('pc1')) return 'aruco_0';
            if (name.includes('player 2') || name.includes('pc2')) return 'aruco_1';
            if (name.includes('player 3') || name.includes('pc3')) return 'aruco_2';
            if (name.includes('player 4') || name.includes('pc4')) return 'aruco_3';
        }
        
        return null; // Let Heimdall decide
    }

    /**
     * Start automatic token synchronization
     * @param {number} intervalMs - Sync interval in milliseconds
     */
    startAutoSync(intervalMs = 30000) {
        this.stopAutoSync();
        
        this.syncInterval = setInterval(async () => {
            if (this.websocket.isConnected) {
                await this.sendTokenListToHeimdall();
            }
        }, intervalMs);
        
        console.log(`Bifrost: Started auto-sync every ${intervalMs}ms`);
    }

    /**
     * Stop automatic token synchronization
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('Bifrost: Stopped auto-sync');
        }
    }

    /**
     * Sync specific token with Heimdall
     * @param {string} tokenId - Token ID to sync
     * @returns {Promise<boolean>} Success status
     */
    async syncSpecificToken(tokenId) {
        const tokenDoc = canvas.scene.tokens.get(tokenId);
        if (!tokenDoc) {
            console.warn(`Bifrost: Token ${tokenId} not found`);
            return false;
        }

        const tokenData = this.getCurrentSceneTokens().find(t => t.id === tokenId);
        if (!tokenData) {
            console.warn(`Bifrost: Could not get data for token ${tokenId}`);
            return false;
        }

        const message = {
            type: 'token_sync',
            timestamp: Date.now(),
            token: tokenData
        };

        return this.websocket.send(message);
    }

    /**
     * Handle requests from Heimdall for token information
     * @param {Object} request - Request from Heimdall
     * @returns {Promise<Object>} Response data
     */
    async handleTokenQuery(request) {
        const { queryType, parameters = {} } = request;
        
        switch (queryType) {
            case 'all_tokens':
                return {
                    success: true,
                    tokens: this.getCurrentSceneTokens(parameters)
                };
                
            case 'players_only':
                return {
                    success: true,
                    tokens: this.getCurrentSceneTokens({
                        filterTypes: ['player'],
                        ...parameters
                    })
                };
                
            case 'untracked_only':
                const allTokens = this.getCurrentSceneTokens(parameters);
                return {
                    success: true,
                    tokens: allTokens.filter(t => !t.bifrost.isTracked)
                };
                
            case 'by_type':
                return {
                    success: true,
                    tokens: this.getCurrentSceneTokens({
                        filterTypes: parameters.types || [],
                        ...parameters
                    })
                };
                
            case 'token_summary':
                const tokens = this.getCurrentSceneTokens();
                return {
                    success: true,
                    summary: {
                        total: tokens.length,
                        byType: this.getTokenSummaryByType(tokens),
                        tracked: tokens.filter(t => t.bifrost.isTracked).length,
                        scene: {
                            id: canvas.scene?.id,
                            name: canvas.scene?.name
                        }
                    }
                };
                
            default:
                return {
                    success: false,
                    error: `Unknown query type: ${queryType}`
                };
        }
    }

    /**
     * Compare current tokens with Heimdall's known state
     * @param {Array} heimdallTokens - Tokens known to Heimdall
     * @returns {Object} Comparison results
     */
    compareWithHeimdallState(heimdallTokens) {
        const foundryTokens = this.getCurrentSceneTokens();
        const heimdallMap = new Map(heimdallTokens.map(t => [t.id, t]));
        const foundryMap = new Map(foundryTokens.map(t => [t.id, t]));
        
        const results = {
            onlyInFoundry: [],
            onlyInHeimdall: [],
            positionMismatches: [],
            propertyMismatches: [],
            inSync: []
        };
        
        // Check tokens in Foundry
        for (const foundryToken of foundryTokens) {
            const heimdallToken = heimdallMap.get(foundryToken.id);
            
            if (!heimdallToken) {
                results.onlyInFoundry.push(foundryToken);
            } else {
                // Compare positions
                const positionDiff = Math.sqrt(
                    Math.pow(foundryToken.position.x - heimdallToken.position.x, 2) +
                    Math.pow(foundryToken.position.y - heimdallToken.position.y, 2)
                );
                
                if (positionDiff > 10) { // 10 pixel tolerance
                    results.positionMismatches.push({
                        token: foundryToken,
                        heimdallPosition: heimdallToken.position,
                        foundryPosition: foundryToken.position,
                        difference: positionDiff
                    });
                } else {
                    results.inSync.push(foundryToken);
                }
            }
        }
        
        // Check tokens only in Heimdall
        for (const heimdallToken of heimdallTokens) {
            if (!foundryMap.has(heimdallToken.id)) {
                results.onlyInHeimdall.push(heimdallToken);
            }
        }
        
        return results;
    }
}

