const CDP = require('chrome-remote-interface');

class MyPlugin {
  constructor(plugin) {
    this.plugin = plugin;

    //plugin.setOptions({dev: true, alwaysInit: true});
    plugin.registerCommand('SetMyLine', [this, this.setLine]);
    plugin.registerCommand('ChromeDevToolsConnect', this.listOrConnect, {
      nargs: '*'
    });
    plugin.registerFunction('ChromeDevTools_Page_reload', this.pageReload, {
      sync: false,
    });
  }

  setLine() {
    debugger;
    this.plugin.nvim.setLine('A line, for your troubles');
  }

  async _getDefaultOptions() {
    debugger;
    const port = await this._nvim.getVar('ChromeDevTools_port');
    const host = await this._nvim.getVar('ChromeDevTools_host');

    return {
      host: host && typeof host == 'string' ? host : 'localhost',
      port: port && typeof port == 'string' ? port : '9222'
    };
  }

  async connect (target)  {
    debugger;
    const defaultOptions = await this._getDefaultOptions();
    const chrome = await (0, _chromeRemoteInterface2.default)(_extends({}, defaultOptions, { target }));
    this._chrome = chrome;

    this._js._chrome = chrome;
    this._scripts = [];
    chrome.Debugger.scriptParsed(script => {
      this._scripts.push(script);
    });

    await chrome.Page.enable();
    await chrome.DOM.enable();
    await chrome.CSS.enable();
    await chrome.Runtime.enable();
    await chrome.Debugger.enable();

    chrome.once('disconnect', () => {
      (0, _echo.echomsg)(this._nvim, 'Disconnected from target.');
    });

    (0, _echo.echomsg)(this._nvim, 'Connected to target: ' + target);
  }

  async runtimeEvaluate(args) {
    debugger;
    const expression =
      args.length > 0 ? args[0] : await getVisualSelection(this._nvim);

    const result = await this._chrome.Runtime.evaluate({
      expression,
      generatePreview: true,
    });

    if (result.exceptionDetails) {
      echoerr(
        this._nvim,
        `Failed with message: ${result.exceptionDetails.text}`,
      );
      return;
    }

    console.log(result);
  }

  listOrConnect(args) {
    debugger;

    if (args.length == 0) {
      this.list();
    } else {
      const [target] = args[0].split(':');
      this.connect(target);
    }
  }

  async list() {
    debugger;

    let targets;
    try {
      targets = await _chromeRemoteInterface2.default.List((await this._getDefaultOptions()));
    } catch (e) {
      (0, _echo.echoerr)(this._nvim, e.message);
    }

    if (!targets) {
      return;
    }

    const labels = targets.map(({ id, title, url }) => `${id}: ${title} - ${url}`);

    if (labels.length == 0) {
      (0, _echo.echomsg)(this._nvim, 'No targets available.');
    } else {
      await this._nvim.call('fzf#run', {
        down: '40%',
        sink: 'ChromeDevToolsConnect',
        source: labels
      });
      // Force focus on fzf.
      await this._nvim.input('<c-m>');
    }
  }

  async connect (target) {
    debugger;

    const defaultOptions = await this._getDefaultOptions();
    const chrome = await (0, _chromeRemoteInterface2.default)(_extends({}, defaultOptions, { target }));
    this._chrome = chrome;

    this._js._chrome = chrome;
    this._scripts = [];
    chrome.Debugger.scriptParsed(script => {
      this._scripts.push(script);
    });

    await chrome.Page.enable();
    await chrome.DOM.enable();
    await chrome.CSS.enable();
    await chrome.Runtime.enable();
    await chrome.Debugger.enable();

    chrome.once('disconnect', () => {
      (0, _echo.echomsg)(this._nvim, 'Disconnected from target.');
    });

    (0, _echo.echomsg)(this._nvim, 'Connected to target: ' + target);
  }

  pageReload () {
    this._chrome.Page.reload();
  };
}

module.exports = (plugin) => new MyPlugin(plugin);

// Or for convenience, exporting the class itself is equivalent to the above
// module.exports = MyPlugin;
