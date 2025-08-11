
/**
 * Logging utility
 */
export class Utils {
    /**
     * Logs a message to the console with a specific level.
     * @param {string} orig - The originator of the log message, typically the class instance.
     * @param {string} message - The message to log.
     * @param {string} [level='info'] - The log level ('debug', 'info', 'warn', 'error').
     */
    static log(orig, message, level = 'info') 
    {
        const prefix = 'Bifrost.' + (orig || 'Unknown') + ' ';
        const debugMode = game.settings.get('bifrost', 'debugMode');

        if (level === 'debug' && !debugMode) return;

        switch (level) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            case 'debug':
                console.debug(prefix, message);
                break;
            default:
                console.log(prefix, message);
        }
    }

    static addSceneControlButton(menuStructure, category, button) {
        let menuCategory
        if (game.release.generation <= 12) {
            menuCategory = menuStructure.find(c => c.layer === category)
            if (menuCategory) {
                menuCategory.tools.push(button)
            }
        } else {
            menuCategory = menuStructure[category]
            if (menuCategory) {
                menuCategory.tools[button.name] = button
            }
        }
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
            config = getFallbackConfig();
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
                itemTokenImage: "icons/svg/item-bag.svg",
                autoConnect: true,
                autoHeartbeat: true,
                debugMode: false
            }
        };
    }

}