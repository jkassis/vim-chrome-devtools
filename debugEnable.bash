echo "> source debugEnable.bash"
echo "Launch neovim"
echo "Run :UpdateRemotePlugins"
echo "Open chrome and this url... 'chrome://inspect' "
echo "> tail -f /tmp/neovim.node-client.log"
export NVIM_NODE_HOST_DEBUG=localhost
export NVIM_NODE_LOG_LEVEL=silly
export NVIM_NODE_LOG_FILE=/tmp/neovim.node-client.log

