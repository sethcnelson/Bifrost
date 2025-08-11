
/**
 * Logging utility
 */
export class Utils {
    /**
     * Logs a message to the console with a specific level.
     * @param {Object} orig - The originator of the log message, typically the class instance.
     * @param {string} message - The message to log.
     * @param {string} [level='info'] - The log level ('debug', 'info', 'warn', 'error').
     */
    static log(orig, message, level = 'info') 
    {
        const prefix = 'Bifrost: ' + (orig?.constructor?.name || 'Unknown');
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
}