echo "Be sure to add this to your vim.init..."
echo "let g:ChromeDevTools_port = '9330'"
node --inspect-brk=9330 testNodeServerMain.js
