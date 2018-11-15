
function echoerr(nvim, msg) {
  return nvim.command(`echohl Error | echomsg "${msg}" | echohl None`);
}

function echowarn(nvim, msg) {
  return nvim.command(`echohl WarningMsg | echomsg "${msg}" | echohl None`);
}

function echomsg(nvim, msg) {
  return nvim.command(`echomsg "${msg}"`);
}

class ChromeDevTools {
  constructor(plugin) {
    this.state = {};
    this.state.plugin = plugin;
    this.state.nvim = plugin.nvim;

    var doCommand = (cmd) => {
      return (...args) => {
        // Hot reload the command handlers so we don't have to restart
        // the plugin provider during development.
        if (true || devMode) {
          delete this.commandHandlers;
          delete require.cache[require.resolve('./mainCommandHandlers.js')];
        }

        if (!this.commandHandlers) {
          var CDTCommandHandlers = require('./mainCommandHandlers.js');
          this.commandHandlers = new CDTCommandHandlers(this.state);
        }
        return this.commandHandlers[cmd](...args);
      }
    }

    process.on('uncaughtException', err => {
      console.error(err);
    });

    // plugin.setOptions({dev: true, alwaysInit: true});
    plugin.setOptions({dev: false, alwaysInit: false});
    // plugin.setOptions({dev: true, alwaysInit: false});

    plugin.registerCommand( 'SetMyLine', doCommand('setLine'));
    plugin.registerCommand( 'ChromeDevToolsConnect', doCommand('listOrConnect'), { nargs: '*' });
    plugin.registerCommand( 'ChromeDevToolsPageReload', doCommand('pageReload'), { sync: false, });
  }

}

module.exports = (plugin) => new ChromeDevTools(plugin);

// Or for convenience, exporting the class itself is equivalent to the above
// module.exports = MyPlugin;
