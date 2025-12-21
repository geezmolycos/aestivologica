const fs = require('fs');
const path = require('path');

module.exports = function svgUsePlugin(md, options) {
  // basePath 用于 Node.js 校验文件是否存在
  const basePath = options.basePath || __dirname;
  // publicPath 用于 HTML 中 <use> 标签的路径 (例如 'icons/')
  const publicPath = options.publicPath || '';
  const defaultFile = options.defaultFile || 'default.svg';

  // 正则：匹配 ::...:: 格式，内部允许字母、数字、下划线、横杠、点、加号和井号
  const REGEX = /::([a-zA-Z0-9_\-\.\,#;:]+)::/g;

  md.core.ruler.push('svg_use_stack', function (state) {
    for (let i = 0; i < state.tokens.length; i++) {
      const blockToken = state.tokens[i];
      if (blockToken.type !== 'inline') continue;

      let tokens = blockToken.children;
      for (let j = tokens.length - 1; j >= 0; j--) {
        const token = tokens[j];

        if (token.type === 'text' && REGEX.test(token.content)) {
          const content = token.content;
          const newTokens = [];
          let lastIndex = 0;
          let match;

          REGEX.lastIndex = 0;
          while ((match = REGEX.exec(content)) !== null) {
            const fullMatch = match[0];
            const startIndex = match.index;
            const rawPayload = match[1]; // 例如 "heart;star:32;bg+icon"

            // 1. 插入之前的文本
            if (startIndex > lastIndex) {
              const t = new state.Token('text', '', 0);
              t.content = content.substring(lastIndex, startIndex);
              newTokens.push(t);
            }

            // --- 新增：处理冒號分隔的多个组 ---
            const groups = rawPayload.split(':');

            groups.forEach(group => {
              // 解析每个组内的 宽度 (例如 "star;32")
              const [mainPart, widthPart] = group.split(';');
              const targetWidth = widthPart ? parseInt(widthPart, 10) : 16;

              // 解析每个组内的 堆叠层 (例如 "bg+icon")
              const rawItems = mainPart.split(',');

              // 2. 解析每个子项并生成 <use>
              let layersHtml = '';
              let hasValidItem = false;

              rawItems.forEach(item => {
                let fileName = '';
                let idName = '';

                if (item.includes('#')) {
                  const parts = item.split('#');
                  fileName = parts[0] || defaultFile.replace('.svg', ''); // ::#id:: 情况
                  idName = parts[1];
                } else {
                  fileName = defaultFile.replace('.svg', '')
                  idName = item;
                }

                const fullFileName = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
                const filePath = path.join(basePath, fullFileName); // 不用校驗文件路徑了

                if (idName.length === 0) { // 空格
                  hasValidItem = true;
                } else {
                  const fileUrl = `${publicPath}${fullFileName}`;
                  
                  layersHtml += `<use href="${fileUrl}#${idName}" x="0" y="0"></use>`;
                  hasValidItem = true;
                }
              });

              // 3. 封装进统一的 SVG 容器
              if (hasValidItem) {
                const svgToken = new state.Token('html_inline', '', 0);
                // 设置 viewBox 爲 targetWidth 寬度，高度 1em
                svgToken.content = `<span class="svg-stack">` +
                  `<svg viewBox="0 0 ` + targetWidth.toString() + ` 16" width="auto" height="1em" fill="currentColor" style="overflow: visible;">` +
                  layersHtml +
                  `</svg></span>`;
                newTokens.push(svgToken);
              } else {
                const t = new state.Token('text', '', 0);
                t.content = fullMatch;
                newTokens.push(t);
              }

              lastIndex = startIndex + fullMatch.length;
            });
          }

          if (lastIndex < content.length) {
            const t = new state.Token('text', '', 0);
            t.content = content.substring(lastIndex);
            newTokens.push(t);
          }

          blockToken.children.splice(j, 1, ...newTokens);
        }
      }
    }
  });
};