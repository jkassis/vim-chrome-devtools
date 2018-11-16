const util = require('./utils.js');

class CDT {
  constructor(plugin) {
    process.on('uncaughtException', err => {
      util.echoerr(this.state.nvim, err);
    });

    this.state = {};
    this.state.plugin = plugin;
    this.state.nvim = plugin.nvim;

    // plugin.setOptions({dev: true, alwaysInit: true});
    plugin.setOptions({dev: false, alwaysInit: false});
    // plugin.setOptions({dev: true, alwaysInit: false});

    var doCommand = (cmd, ...staticArgs) => {
      return (...args) => {
        // Hot reload the command handlers so we don't have to restart
        // the plugin provider during development.
        if (true || devMode) {
          delete this.commandHandlers;
          delete require.cache[require.resolve('./mainCommandHandlers.js')];
        }

        if (!this.commandHandlers) {
          try {
            var CDTCommandHandlers = require('./mainCommandHandlers.js');
            this.commandHandlers = new CDTCommandHandlers(this.state);
          } catch(err) {
            debugger;
            util.echoerr(this.state.nvim, err);
          }
        }

        return this.commandHandlers[cmd](...staticArgs, ...args);
      }
    };

    plugin.registerCommand( 'SetMyLine', doCommand('setLine'));
    plugin.registerCommand( 'CDTToggle', doCommand('toggle'), { nargs: '*' });
    plugin.registerCommand( 'CDTConnect', doCommand('listOrConnect', doCommand), { nargs: '*' });
    plugin.registerCommand( 'CDTPlay', doCommand('play'), { sync: false, nargs: '*' });
    plugin.registerCommand( 'CDTStepOver', doCommand('stepOver'), { sync: false, nargs: '*' });
    plugin.registerCommand( 'CDTStepInto', doCommand('stepInto'), { sync: false, nargs: '*' });
    plugin.registerCommand( 'CDTStepOut', doCommand('stepOut'), { sync: false, nargs: '*' });
    plugin.registerCommand( 'CDTPageReload', doCommand('pageReload'), { sync: false, });

    var cwd = process.cwd();
    util.echomsg(this.state.nvim, `Debugger ready... mapping files to '${cwd}'`);
  }
}

module.exports = (plugin) => new CDT(plugin);

// Or for convenience, exporting the class itself is equivalent to the above
// module.exports = MyPlugin;
