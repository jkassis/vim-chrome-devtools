const util = require('./utils.js');
const CRI = require('chrome-remote-interface');
// https://www.npmjs.com/package/walk
const walk = require('walk');
const fs = require('fs');
const Fuse = require('fuse.js');

//
// Note... console.log in this file will crash the process
// neovim will report that the channel is closed
class ChromeDevToolsCommandHandlers {
  constructor(state) {
    this.state = state;
  }

  setLine() {
    this.state.plugin.nvim.setLine('A line, for your troubles');
  }

  async toggle() {
    var mapKey = (lhs, rhs) => {
      this.state.nvim.command(`map ${lhs} ${rhs}`);
    };
    mapKey('<F9>', ':CDTPageReload<CR>');
    mapKey('<F5>', ':CDTConnect<CR>');
    mapKey('<F4>', ':CDTStepOver<CR>');
    mapKey('<Leader><F4>', ':CDTPlay<CR>');
    mapKey('<F3>', ':CDTStepInto<CR>');
    mapKey('<F2>', ':CDTStepOut<CR>');

    this.index();
  };

  index() {
    var cwd = process.cwd();
    util.echomsg(this.state.nvim, `Debugger Enabled: Indexing '${cwd}'`);

    var fuseList = [];

    var walker = walk.walk(cwd, {
      followLinks: false
      , filters: ["Temp", "_Temp", "node_modules"]
    });

    walker.on("file", (root, fileStats, next) => {
      fuseList.push({ path: `${root}/${fileStats.name}` });
      next();
    });

    walker.on("errors", (root, nodeStatsArray, next) => {
      next();
    });

    walker.on("end", () => {
      var options = {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        tokenize: true,
        keys: [
          "path"
        ]
      };
      this.state.fuzzyFileIndex = new Fuse(fuseList, options); // "list" is the item array
      util.echomsg(this.state.nvim, `...indexing complete.`);
    });
  }

  async _getDefaultOptions() {
    const port = await this.state.nvim.getVar('ChromeDevTools_port');
    const host = await this.state.nvim.getVar('ChromeDevTools_host');

    return {
      host: host && typeof host == 'string' ? host : 'localhost',
      port: port && typeof port == 'string' ? port : '9222'
    };
  }

  onPaused(evt) {
    var url = evt.callFrames[0].url;
    var lineNumber = evt.callFrames[0].location.lineNumber;
    var columnNumber = evt.callFrames[0].location.columnNumber;

    // Search the index for the file.
    var results = this.state.fuzzyFileIndex.search(url);
    this.state.nvim.command(`e ${results[0].path }`);
    this.state.nvim.command(`${ lineNumber }G`);
    this.state.nvim.command(`${ columnNumber }|`);
  }

  async runtimeEvaluate(args) {
    const expression =
      args.length > 0 ? args[0] : await getVisualSelection(this.state.nvim);

    const result = await this.state.chrome.Runtime.evaluate({
      expression,
      generatePreview: true,
    });

    if (result.exceptionDetails) {
      util.echoerr(
        this.state.nvim,
        `Failed with message: ${result.exceptionDetails.text}`,
      );
      return;
    }

    console.log(result);
  }

  listOrConnect(doCommand, ...args) {
    var target = args[0] ? args[0][0] : undefined;
    if (!target) {
      this.list();
    } else {
      this.connect(doCommand, target.split(':')[0]);
    }
  }

  async list() {
    let targets;
    try {
      targets = await CRI.List(await this._getDefaultOptions());
    } catch (e) {
      util.echoerr(this.state.nvim, e.message);
    }

    if (!targets) {
      return;
    }

    const labels = targets.map(({ id, title, url }) => `${id}: ${title} - ${url}`);

    if (labels.length == 0) {
      util.echomsg(this.state.nvim, 'No targets available.');
    } else {
      await this.state.nvim.call('fzf#run', {
        down: '40%',
        sink: 'CDTConnect',
        source: labels
      });
      // Force focus on fzf.
      await this.state.nvim.input('<c-m>');
    }
  }

  async connect (doCommand, target) {
    // TODO needs to disconnect if chrome already exists and is connected
    const defaultOptions = await this._getDefaultOptions();
    if (this.state.chrome) {
      util.echomsg(this.state.nvim, 'Already connected.');
      return;
    }

    this.state.chrome = await CRI({...defaultOptions, target});

    await this.state.chrome.Page.enable();
    await this.state.chrome.DOM.enable();
    await this.state.chrome.CSS.enable();
    await this.state.chrome.Runtime.enable();
    await this.state.chrome.Debugger.enable();


    // Cache parsed scripts
    this.state.scripts = [];
    this.state.chrome.Debugger.scriptParsed(script => {
      this.state.scripts.push(script);
    });

    // Clear on disconnect
    this.state.chrome.once('disconnect', () => {
      delete this.state.chrome;
      util.echomsg(this.state.nvim, 'Disconnected from target.');
    });

    // Handle paused events
    this.state.chrome.Debugger.paused(doCommand('onPaused'));

    util.echomsg(this.state.nvim, 'Connected to target: ' + target);
  }

  requireTarget() {
    if (!this.state.chrome){
      util.echomsg(this.state.nvim, 'Connect to target first.');
      return false;
    }
    return true;
  }

  pageReload (args) {
    if (!this.requireTarget())
      return;
    this.state.chrome.Page.reload();
  };

  play (args) {
    if (!this.requireTarget())
      return;
    this.state.chrome.Debugger.resume();
  };

  stepOver (args) {
    if (!this.requireTarget())
      return;
    this.state.chrome.Debugger.stepOver();
  };

  stepInto (args) {
    if (!this.requireTarget())
      return;
    this.state.chrome.Debugger.stepInto();
  };

  stepOut (args) {
    if (!this.requireTarget())
      return;
    this.state.chrome.Debugger.stepOut();
  };
};

module.exports = ChromeDevToolsCommandHandlers;
