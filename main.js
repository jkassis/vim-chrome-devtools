const util = require('./utils.js');

class CDT {
  constructor(plugin) {
    process.on('uncaughtException', err => {
      console.error(err);
    });

    this.state = {};
    this.state.plugin = plugin;
    this.state.nvim = plugin.nvim;

    // plugin.setOptions({dev: true, alwaysInit: true});
    plugin.setOptions({dev: false, alwaysInit: false});
    // plugin.setOptions({dev: true, alwaysInit: false});

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
    };


    plugin.registerCommand( 'SetMyLine', doCommand('setLine'));
    plugin.registerCommand( 'CDTToggle', doCommand('toggle'), { nargs: '*' });
    plugin.registerCommand( 'CDTConnect', doCommand('listOrConnect'), { nargs: '*' });
    plugin.registerCommand( 'CDTStepOver', doCommand('stepOver'), { nargs: '*' });
    plugin.registerCommand( 'CDTStepInto', doCommand('stepInto'), { nargs: '*' });
    plugin.registerCommand( 'CDTStepOut', doCommand('stepOut'), { nargs: '*' });
    plugin.registerCommand( 'CDTPageReload', doCommand('pageReload'), { sync: false, });
  }
}

module.exports = (plugin) => new CDT(plugin);

// Or for convenience, exporting the class itself is equivalent to the above
// module.exports = MyPlugin;
