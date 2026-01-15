
module.exports = function svgUsePlugin(md, options) {
  // basePath 用于 Node.js 校验文件是否存在
  const basePath = options.basePath || __dirname;
  // publicPath 用于 HTML 中 <use> 标签的路径 (例如 'icons/')
  const publicPath = options.publicPath || '';
  const defaultFile = options.defaultFile || 'default.svg';

  // 正则：匹配 ::...:: 格式，内部允许任何字符
  const REGEX = /::(.+?)::/g;

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
            const rawPayload = match[1]; // 例如 "heart:star+w32:bg,icon"

            // 1. 插入之前的文本
            if (startIndex > lastIndex) {
              const t = new state.Token('text', '', 0);
              t.content = content.substring(lastIndex, startIndex);
              newTokens.push(t);
            }

            // --- 新增：处理冒號分隔的多个组 ---
            const groups = rawPayload.split(':');

            groups.forEach(group => {

              // 解析每个组内的 堆叠层 (例如 "bg,icon")
              const rawItems = group.split(',');

              // 2. 解析每个子项并生成 <use>
              let layersHtml = '';
              let hasValidItem = false;
              let targetWidth = 16;

              rawItems.forEach(item => {

                let color = null;
                let x = 0;
                let y = 0;
                let scale = 1;

                // 解析每个子項内的 可選參數 (例如 "star+w32")
                const [mainPart, ...options] = item.split('+');
                for (let opt of options) {
                  const optType = opt[0];
                  const optValue = opt.slice(1);
                  if (optType === 'w') {
                    targetWidth = optValue ? parseFloat(optValue) : targetWidth;
                  } else if (optType === 'h') { // half width
                    targetWidth = 8;
                  } else if (optType === 'z') { // zero width
                    targetWidth = 0;
                  } else if (optType === 'c') {
                    color = {
                      'r': 'red', 'y': 'yellow', 'g': 'green', 'b': 'blue',
                    }[optValue] || null;
                  } else if (optType === 'x') {
                    x = optValue ? parseFloat(optValue) : x;
                  } else if (optType === 'y') {
                    y = optValue ? parseFloat(optValue) : y;
                  } else if (optType === 's') { // scale
                    scale = optValue ? parseFloat(optValue) : scale;
                  }
                }
                let fileName = '';
                let idName = '';

                if (mainPart.includes('#')) {
                  const parts = mainPart.split('#');
                  fileName = parts[0];
                  idName = parts[1];
                } else {
                  fileName = defaultFile.replace('.svg', '')
                  idName = mainPart;
                }

                const fullFileName = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;

                if (idName.length === 0) { // 空格
                  hasValidItem = true;
                } else {
                  const fileUrl = `${publicPath}${fullFileName}`;
                  const filter = color ? `filter="url(./color-filter.svg#filter-${color})"` : '';
                  const transform = scale !== 1 ? `transform="scale(${scale})"` : '';
                  x /= scale;
                  y /= scale;
                  
                  if (fileName !== '') {
                    layersHtml += `<use href="${fileUrl}#${idName}" x="${x}" y="${y}" ${filter} ${transform}></use>`;
                  } else {
                    // 文件名爲空，格式類似 "#字"，直接插入文本
                    layersHtml += `<text x="${x}" y="${14+y}" font-size="16px" ${filter} ${transform}>${idName}</text>`
                  }
                  hasValidItem = true;
                }
              });

              // 3. 封装进统一的 SVG 容器
              if (hasValidItem) {
                const svgToken = new state.Token('html_inline', '', 0);
                // 设置 viewBox 爲 targetWidth 寬度，高度 1em
                svgToken.content = `<span class="svg-stack" style="width: ${targetWidth/16}em">` +
                  `<svg viewBox="0 0 16 16" width="1em" height="1em" style="overflow: visible;">` +
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