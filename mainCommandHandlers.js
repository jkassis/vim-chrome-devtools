const util = require('./utils.js');
const CRI = require('chrome-remote-interface');

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
    mapKey('<F5>', ':CDTConnect<CR>');
    mapKey('<F4>', ':CDTStepOver<CR>');
    mapKey('<F3>', ':CDTStepInto<CR>');
    mapKey('<F2>', ':CDTStepOut<CR>');
  };

  async _getDefaultOptions() {
    const port = await this.state.nvim.getVar('ChromeDevTools_port');
    const host = await this.state.nvim.getVar('ChromeDevTools_host');

    return {
      host: host && typeof host == 'string' ? host : 'localhost',
      port: port && typeof port == 'string' ? port : '9222'
    };
  }

  async connect (target)  {
    const defaultOptions = await this.state._getDefaultOptions();
    const chrome = await CDP({ ...defaultOptions, target });
    this.state.chrome = chrome;

    this.state.scripts = [];
    chrome.Debugger.scriptParsed(script => {
      this.state.scripts.push(script);
    });

    await chrome.Page.enable();
    await chrome.DOM.enable();
    await chrome.CSS.enable();
    await chrome.Runtime.enable();
    await chrome.Debugger.enable();

    chrome.once('disconnect', () => {
      util.echomsg(this.state.nvim, 'Disconnected from target.');
    });

    util.echomsg(this.state.nvim, 'Connected to target: ' + target);
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

  listOrConnect(args) {
    if (args.length == 0) {
      this.list();
    } else {
      const [target] = args[0].split(':');
      this.connect(target);
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

  async connect (target) {
    const defaultOptions = await this._getDefaultOptions();
    const chrome = await CRI({...defaultOptions, target});
    this.state.chrome = chrome;

    this.state.scripts = [];
    chrome.Debugger.scriptParsed(script => {
      this.state.scripts.push(script);
    });

    await this.state.chrome.Page.enable();
    await this.state.chrome.DOM.enable();
    await this.state.chrome.CSS.enable();
    await this.state.chrome.Runtime.enable();
    await this.state.chrome.Debugger.enable();

    this.state.chrome.once('disconnect', () => {
      util.echomsg(this.state.nvim, 'Disconnected from target.');
    });

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
