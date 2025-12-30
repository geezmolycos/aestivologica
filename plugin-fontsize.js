// plugin-fontsize.js
module.exports = function fontSizePlugin(md) {
  
  // 正则：匹配 ^^内容^^ 或 ,,内容,,
  // Group 1: 捕获符号 (^^ 或 ,,)
  // Group 2: 捕获内容 (非贪婪匹配)
  // \1: 确保结束符号和开始符号一致
  const REGEX = /(\^\^|,,|==)(.+?)\1/;

  md.core.ruler.push('font_size', function (state) {
    for (let i = 0; i < state.tokens.length; i++) {
      const blockToken = state.tokens[i];
      if (blockToken.type !== 'inline') continue;

      let tokens = blockToken.children;
      // 从后往前遍历，方便 splice 替换
      for (let j = tokens.length - 1; j >= 0; j--) {
        const token = tokens[j];

        if (token.type === 'text' && REGEX.test(token.content)) {
          
          // 使用 split 技巧：如果正则包含捕获组，split 会把捕获组也保留在数组里
          // "Text ^^Big^^ End" -> ["Text ", "^^", "Big", " End"]
          const parts = token.content.split(/(\^\^|,,|==)(.+?)\1/);
          
          const newTokens = [];
          
          // 遍历分割后的数组构建 Token
          for (let k = 0; k < parts.length; k++) {
            const part = parts[k];
            
            if (!part) continue; // 跳过空字符串

            // 检查当前部分是不是符号 (^^ 或 ,,)
            if (part === '^^' || part === ',,' || part == '==') {
              const symbol = part;
              const content = parts[k + 1]; // 下一部分肯定是内容
              
              // 根据符号决定样式
              let className = 'big';
              if (symbol === '==') {
                className = 'half';
              } else if (symbol === ',,') {
                className = 'small';
              } else {
                className = 'big';
              }
              
              // 1. 开头标签 <span class="...">
              const openToken = new state.Token('html_inline', '', 0);
              openToken.content = `<span class="${className}">`;
              newTokens.push(openToken);

              // 2. 中间内容 (作为 text token)
              // 关键点：我们保持它为 'text' 类型，这样后续的 SVG 插件就能在里面找到 ::icon::
              const contentToken = new state.Token('text', '', 0);
              contentToken.content = content;
              newTokens.push(contentToken);

              // 3. 结束标签 </span>
              const closeToken = new state.Token('html_inline', '', 0);
              closeToken.content = `</span>`;
              newTokens.push(closeToken);

              // 跳过内容部分，因为我们已经处理了
              k++; 
            } else {
              // 普通文本
              const t = new state.Token('text', '', 0);
              t.content = part;
              newTokens.push(t);
            }
          }

          // 替换掉旧的 token
          blockToken.children.splice(j, 1, ...newTokens);
        }
      }
    }
  });
};