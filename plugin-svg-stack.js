// plugin-svg-stack.js (修复版)
const fs = require('fs');
const path = require('path');

module.exports = function svgStackPlugin(md, options) {
  const basePath = options.basePath || __dirname;

  // 正则：匹配 ::name:: 或 ::name1+name2::
  const REGEX = /::([a-zA-Z0-9_\-\+]+)::/g; // !!! 关键：添加全局标志 /g !!!

  // 辅助函数：清理SVG内容
  function cleanSvg(content) {
    return content
      .replace(/<svg([^>]*)>/, (match, attrs) => {
        let newAttrs = attrs.replace(/\s(width|height)="[^"]*"/gi, '');
        if (!newAttrs.includes('xmlns=')) {
          newAttrs += ' xmlns="http://www.w3.org/2000/svg"';
        }
        return `<svg${newAttrs}>`;
      });
  }

  md.core.ruler.push('svg_stack', function (state) {
    for (let i = 0; i < state.tokens.length; i++) {
      const blockToken = state.tokens[i];
      if (blockToken.type !== 'inline') continue;

      let tokens = blockToken.children;
      // 从后往前遍历子 Token
      for (let j = tokens.length - 1; j >= 0; j--) {
        const token = tokens[j];

        if (token.type === 'text' && REGEX.test(token.content)) {
          
          const content = token.content;
          const newTokens = []; // 存储所有新生成的 Token
          
          let lastIndex = 0; // 记录上次匹配结束的位置
          let match;
          
          // 重置正则的 lastIndex，因为这里需要对同一个 token 循环匹配
          REGEX.lastIndex = 0; 

          // !!! 核心修复逻辑：循环匹配 !!!
          while ((match = REGEX.exec(content)) !== null) {
            const fullMatch = match[0];       // 例如 "::bg+star::"
            const iconString = match[1];      // 例如 "bg+star"
            const startIndex = match.index;   // 匹配开始的索引

            // 1. 插入匹配前的普通文本
            if (startIndex > lastIndex) {
              const textToken = new state.Token('text', '', 0);
              textToken.content = content.substring(lastIndex, startIndex);
              newTokens.push(textToken);
            }

            // 2. 生成 SVG 容器 Token
            const iconNames = iconString.split('+');
            let svgsHtml = '';
            let isValid = false;

            iconNames.forEach((name, index) => {
              const svgPath = path.join(basePath, `${name}.svg`);
              try {
                if (fs.existsSync(svgPath)) {
                  let svgContent = fs.readFileSync(svgPath, 'utf8');
                  svgContent = cleanSvg(svgContent);

                  const style = index === 0 
                    ? 'position: relative; display: block; height: 1em; width: auto; overflow: visible;' 
                    : 'position: absolute; top: 0; left: 0; height: 1em; width: auto; overflow: visible; pointer-events: none;';
                  
                  
                  const className = index === 0 ? 'svg-layer-base' : 'svg-layer-overlay';
                  
                  svgContent = svgContent.replace('<svg', `<svg class="${className}" style="${style}"`);
                  
                  svgsHtml += svgContent;
                  isValid = true;
                } else {
                  console.warn(`[Markdown Plugin] Warning: SVG not found: ${name}`);
                }
              } catch (e) {
                console.error(e);
              }
            });

            if (isValid) {
              const wrapperToken = new state.Token('html_inline', '', 0);
              wrapperToken.content = `<span class="svg-stack" style="display: inline-block; position: relative; overflow: visible;">${svgsHtml}</span>`;
              newTokens.push(wrapperToken);
            } else {
                 // 如果无效，则将原始的 ::icon:: 文本作为普通文本插入，避免丢失
                const textToken = new state.Token('text', '', 0);
                textToken.content = fullMatch;
                newTokens.push(textToken);
            }

            // 更新上次匹配结束的位置
            lastIndex = startIndex + fullMatch.length;
          }

          // 3. 插入最后一个匹配项之后的文本
          if (lastIndex < content.length) {
            const textToken = new state.Token('text', '', 0);
            textToken.content = content.substring(lastIndex);
            newTokens.push(textToken);
          }

          // 用新生成的节点替换掉原来的 text 节点
          blockToken.children.splice(j, 1, ...newTokens);
        }
      }
    }
  });
};