function echoerr(nvim, msg) {
  return nvim.command(`echohl Error | echomsg "${msg}" | echohl None`);
}

function echowarn(nvim, msg) {
  return nvim.command(`echohl WarningMsg | echomsg "${msg}" | echohl None`);
}

function echomsg(nvim, msg) {
  return nvim.command(`echomsg "${msg}"`);
}

async function getVisualSelection(nvim) {
  const buffer = await nvim.buffer;
  const [startLine, startCol] = await buffer.mark('<');
  const [endLine, endCol] = await buffer.mark('>');

  const lines = await buffer.getLines({ start: startLine - 1, end: endLine });
  if (lines.length == 0) {
    return '';
  } else if (startLine == endLine) {
    return lines[0].substring(startCol, endCol + 1);
  } else {
    const firstLine = lines[0].substring(startCol);
    const lastLine = lines[lines.length - 1].substring(0, endCol + 1);

    return [firstLine, ...lines, lastLine].join('\n');
  }
}


module.exports = {
  echoerr,
  echowarn,
  echomsg,
  getVisualSelection
};
