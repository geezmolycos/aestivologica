module.exports = function macroFinalPlugin(md, options = {}) {
  const macros = options.macros || {};
  const MAX_DEPTH = 10;

  function findClosingBrace(str, start) {
    let depth = 1;
    for (let i = start; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      if (depth === 0) return i;
    }
    return -1;
  }

  // --- 阶段 1: Core 扫描与编码保护 ---
  md.core.ruler.before('normalize', 'macro_protect', (state) => {
    let src = state.src;
    let result = '';
    let lastPos = 0;
    const regex = /@([a-zA-Z0-9_]+)\{/g;
    let match;

    while ((match = regex.exec(src)) !== null) {
      const name = match[1];
      let currentIdx = match.index + name.length + 1; // 第一个 '{'
      let payload = name; // 将名称存入负载

      // 提取所有连续的花括号块
      while (src[currentIdx] === '{') {
        const endIdx = findClosingBrace(src, currentIdx + 1);
        if (endIdx === -1) break;
        // 提取整个 {arg} 块
        payload += src.slice(currentIdx, endIdx + 1);
        currentIdx = endIdx + 1;
      }

      result += src.slice(lastPos, match.index);
      // 统一替换为 @{encoded}
      result += `@{${encodeURIComponent(payload)}}`;
      
      lastPos = currentIdx;
      regex.lastIndex = currentIdx;
    }
    result += src.slice(lastPos);
    state.src = result;
    return true;
  });

  // --- 阶段 2: Inline 解码与解析 ---
  md.inline.ruler.after('text', 'macro_execute', (state, silent) => {
    if (state.src[state.pos] !== '@' || state.src[state.pos + 1] !== '{') return false;

    const tail = state.src.slice(state.pos + 2);
    const endIdx = tail.indexOf('}');
    if (endIdx === -1) return false;

    if (silent) return true;

    const decoded = decodeURIComponent(tail.slice(0, endIdx));
    // 从解码后的内容中分离 name 和 args
    const nameMatch = decoded.match(/^([a-zA-Z0-9_]+)\{/);
    if (!nameMatch) return false;

    const name = nameMatch[1];
    const args = [];
    let argStr = decoded.slice(name.length);
    let searchIdx = 0;
    while (argStr[searchIdx] === '{') {
      const end = findClosingBrace(argStr, searchIdx + 1);
      if (end === -1) break;
      args.push(argStr.slice(searchIdx + 1, end));
      searchIdx = end + 1;
    }

    const ctx = state.env.macroContext || (state.env.macroContext = {});
    state.env.macroDepth = (state.env.macroDepth || 0) + 1;
    
    let result;
    if (state.env.macroDepth > MAX_DEPTH) {
      result = { html: `<span style="color:red; border-bottom:1px dotted red;">Error: max macro depth exceeded</span>` };
    } else if (macros[name]) {
      result = macros[name](args, { md: state.md, env: state.env, ctx });
    } else {
      result = { html: `<span style="color:red; border-bottom:1px dotted red;">Error: @${name} undefined</span>` };
    }

    if (typeof result === 'object' && result.html) {
      const token = state.push('html_inline', '', 0);
      token.content = result.html;
    } else if (typeof result === 'string' && result !== "") {
      md.inline.parse(result, state.md, state.env, state.tokens);
    }

    state.pos += endIdx + 3; // @{ + payload + }
    state.env.macroDepth--;
    return true;
  });
};