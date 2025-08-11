/**
 * Bifrost Token Management System
 * Handles token creation and updates from Heimdall ArUco marker tracking
 */

export class BifrostTokenManager {
    constructor() {
        // Track known tokens by their ArUco marker ID
        this.knownTokens = new Map();
        // Cache of existing actors for quick lookup
        this.actorCache = new Map();
        this.refreshActorCache();
    }

    /**
     * Refresh the actor cache for quick lookups
     */
    refreshActorCache() {
        this.actorCache.clear();
        game.actors.forEach(actor => {
            this.actorCache.set(actor.name.toLowerCase(), actor);
        });
    }

    /**
     * Main entry point for Heimdall messages
     * @param {Object} heimdallMessage - Message from Heimdall system
     * @param {string} heimdallMessage.markerId - ArUco marker ID
     * @param {string} heimdallMessage.tokenName - Name of the token/player
     * @param {number} heimdallMessage.x - X coordinate on table
     * @param {number} heimdallMessage.y - Y coordinate on table
     * @param {string} heimdallMessage.type - "player", "enemy", "item", or "unknown"
     * @param {Object} heimdallMessage.metadata - Additional data (size, rotation, etc.)
     * @returns {Promise<Object>} Result of token creation/update
     */
    async handleHeimdallMessage(heimdallMessage) {
        const { markerId, tokenName, x, y, type, metadata = {} } = heimdallMessage;

        try {
            // Check if we already know about this token
            const existingTokenId = this.knownTokens.get(markerId);
            
            if (existingTokenId) {
                // Update existing token position
                return await this.updateTokenPosition(existingTokenId, x, y, metadata);
            } else {
                // Create new token based on type
                return await this.createNewToken(markerId, tokenName, x, y, type, metadata);
            }

        } catch (error) {
            console.error(`Bifrost: Error handling Heimdall message for marker ${markerId}:`, error);
            return {
                success: false,
                markerId,
                error: error.message
            };
        }
    }

    /**
     * Create a new token based on type (player vs non-player)
     * @param {string} markerId - ArUco marker ID
     * @param {string} tokenName - Token name
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate  
     * @param {string} type - Token type
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Creation result
     */
    async createNewToken(markerId, tokenName, x, y, type, metadata) {
        console.log(`Bifrost: Creating new ${type} token "${tokenName}" for marker ${markerId}`);

        let result;

        if (type === "player") {
            // Player tokens must be linked to existing Actor
            result = await this.createPlayerToken(markerId, tokenName, x, y, metadata);
        } else {
            // Enemy/item tokens are standalone
            result = await this.createStandaloneToken(markerId, tokenName, x, y, type, metadata);
        }

        // Track the new token if creation succeeded
        if (result.success) {
            this.knownTokens.set(markerId, result.token.id);
            
            // Store marker ID in token flags for future reference
            await result.token.setFlag('bifrost', 'aruco', {
                markerId: markerId,
                type: type,
                createdAt: Date.now(),
                lastUpdate: Date.now()
            });
        }

        return result;
    }

    /**
     * Create a player token linked to existing Actor
     * @param {string} markerId - ArUco marker ID
     * @param {string} playerName - Player/Actor name
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Creation result
     */
    async createPlayerToken(markerId, playerName, x, y, metadata) {
        // Find existing Actor (case-insensitive)
        const actor = this.actorCache.get(playerName.toLowerCase());
        
        if (!actor) {
            const availableActors = Array.from(this.actorCache.keys());
            return {
                success: false,
                markerId,
                error: `Player Actor "${playerName}" not found. Available actors: ${availableActors.join(', ')}`
            };
        }

        // Check for existing token of this actor on current scene
        const existingToken = canvas.scene.tokens.find(t => t.actorId === actor.id);
        if (existingToken) {
            // Update existing token instead of creating duplicate
            await existingToken.update({ x, y });
            this.knownTokens.set(markerId, existingToken.id);
            
            return {
                success: true,
                markerId,
                token: existingToken,
                actor: actor,
                action: "updated_existing",
                message: `Updated existing token for player "${playerName}"`
            };
        }

        // Create new linked token using actor's prototype settings
        const prototypeData = actor.prototypeToken.toObject();
        
        const tokenData = foundry.utils.mergeObject(prototypeData, {
            name: actor.name,
            actorId: actor.id,
            actorLink: true,  // Critical for player characters
            x: x,
            y: y,
            
            // Player token defaults
            disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
            vision: true,
            displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            
            // Apply physical token metadata
            rotation: metadata.rotation || 0,
            hidden: metadata.hidden || false,
            elevation: metadata.elevation || 0
        });

        const [token] = await TokenDocument.createDocuments([tokenData], {
            parent: canvas.scene
        });

        console.log(`Bifrost: Created linked player token for "${playerName}"`);

        return {
            success: true,
            markerId,
            token: token,
            actor: actor,
            action: "created_player",
            message: `Created player token for "${playerName}" linked to Actor`
        };
    }

    /**
     * Create a standalone token for enemies/items
     * @param {string} markerId - ArUco marker ID
     * @param {string} tokenName - Token name
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Token type (enemy, item, etc.)
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Creation result
     */
    async createStandaloneToken(markerId, tokenName, x, y, type, metadata) {
        // Determine token image and properties based on type
        const tokenConfig = this.getTokenConfigForType(type, metadata);
        
        const tokenData = {
            name: tokenName,
            img: tokenConfig.image,
            x: x,
            y: y,
            width: tokenConfig.width,
            height: tokenConfig.height,
            
            // No actorId - standalone token
            disposition: tokenConfig.disposition,
            vision: tokenConfig.vision,
            
            // Physical properties from metadata
            rotation: metadata.rotation || 0,
            hidden: metadata.hidden || false,
            elevation: metadata.elevation || 0,
            alpha: metadata.alpha || 1.0,
            
            // Display settings
            displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
            displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
            
            // Store original type in flags
            flags: {
                bifrost: {
                    type: type,
                    standalone: true,
                    physicalToken: true
                }
            }
        };

        const [token] = await TokenDocument.createDocuments([tokenData], {
            parent: canvas.scene
        });

        console.log(`Bifrost: Created standalone ${type} token "${tokenName}"`);

        return {
            success: true,
            markerId,
            token: token,
            action: "created_standalone",
            message: `Created standalone ${type} token "${tokenName}"`
        };
    }

    /**
     * Get token configuration based on type
     * @param {string} type - Token type
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Token configuration
     */
    getTokenConfigForType(type, metadata) {
        const configs = {
            enemy: {
                image: metadata.image || "icons/svg/mystery-man-red.svg",
                width: metadata.size || 1,
                height: metadata.size || 1,
                disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
                vision: false
            },
            item: {
                image: metadata.image || "icons/svg/item-bag.svg", 
                width: metadata.size || 0.5,
                height: metadata.size || 0.5,
                disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                vision: false
            },
            npc: {
                image: metadata.image || "icons/svg/mystery-man.svg",
                width: metadata.size || 1,
                height: metadata.size || 1,
                disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                vision: false
            },
            unknown: {
                image: metadata.image || "icons/svg/hazard.svg",
                width: metadata.size || 1,
                height: metadata.size || 1,
                disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
                vision: false
            }
        };

        return configs[type] || configs.unknown;
    }

    /**
     * Update position of existing token
     * @param {string} tokenId - Existing token ID
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Update result
     */
    async updateTokenPosition(tokenId, x, y, metadata) {
        const token = canvas.scene.tokens.get(tokenId);
        
        if (!token) {
            // Token was deleted, remove from tracking
            const markerId = Array.from(this.knownTokens.entries())
                .find(([_, id]) => id === tokenId)?.[0];
            if (markerId) {
                this.knownTokens.delete(markerId);
            }
            
            return {
                success: false,
                error: `Token ${tokenId} no longer exists`
            };
        }

        // Update position and metadata
        const updateData = { 
            x, 
            y,
            rotation: metadata.rotation !== undefined ? metadata.rotation : token.rotation,
            elevation: metadata.elevation !== undefined ? metadata.elevation : token.elevation,
            hidden: metadata.hidden !== undefined ? metadata.hidden : token.hidden
        };

        await token.update(updateData);

        // Update last seen timestamp
        await token.setFlag('bifrost', 'aruco.lastUpdate', Date.now());

        return {
            success: true,
            token: token,
            action: "position_updated",
            message: `Updated token position to (${x}, ${y})`
        };
    }

    /**
     * Remove token when ArUco marker is no longer detected
     * @param {string} markerId - ArUco marker ID
     * @returns {Promise<Object>} Removal result
     */
    async removeToken(markerId) {
        const tokenId = this.knownTokens.get(markerId);
        
        if (!tokenId) {
            return {
                success: false,
                error: `No token tracked for marker ${markerId}`
            };
        }

        const token = canvas.scene.tokens.get(tokenId);
        if (token) {
            await token.delete();
        }

        this.knownTokens.delete(markerId);

        return {
            success: true,
            action: "token_removed",
            message: `Removed token for marker ${markerId}`
        };
    }

    /**
     * Get status of all tracked tokens
     * @returns {Array} Status of all known tokens
     */
    getTrackedTokensStatus() {
        const status = [];
        
        for (const [markerId, tokenId] of this.knownTokens.entries()) {
            const token = canvas.scene.tokens.get(tokenId);
            const flags = token?.getFlag('bifrost', 'aruco');
            
            status.push({
                markerId,
                tokenId,
                exists: !!token,
                name: token?.name,
                type: flags?.type,
                position: token ? { x: token.x, y: token.y } : null,
                lastUpdate: flags?.lastUpdate
            });
        }
        
        return status;
    }

    /**
     * Clear all tracking data (useful for scene changes)
     */
    clearTracking() {
        this.knownTokens.clear();
        console.log("Bifrost: Cleared all token tracking data");
    }
}
