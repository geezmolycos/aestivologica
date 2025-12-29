// plugin-accent-quick.js
module.exports = function accentQuickPlugin(md) {
  // 1. 字符映射库 (在此处轻松添加新字符)
  const map = {
    // --- 组合符号 (自动吸附到左侧字符) ---
    "'": "\u0301", // 锐音 (acute)
    "\"": "\u0300", // 钝音 (grave)
    ",": "\u0328", // 下加钩 (ogonek)
    ".": "\u032E", // 下加圆弧 (breve below)

    // --- 独立特殊字符 ---
    "i": "\u0269", // latin iota (ɩ)
    "u": "\u028A", // latin upsilon (ʊ)
  };

  // 正则：匹配 \+x\+ 格式，x 是 map 里的任何一个 key
  // 使用捕获组提取中间的字符
  const REGEX = /\+([^\+ \n\r\t]+)\+/g;

  md.core.ruler.push('accent_quick', function (state) {
    state.tokens.forEach(blockToken => {
      if (blockToken.type !== 'inline') return;

      blockToken.children.forEach(token => {
        if (token.type === 'text') {
          // 执行替换逻辑
          token.content = token.content.replace(REGEX, (match, code) => {
            const val = map[code];
            
            // 如果在 map 中找到了定义，则返回定义的 Unicode 字符
            // 如果是组合字符（如 \u0301），它会自动吸附在文本中它前面的那个字符上
            if (val !== undefined) {
              return val;
            }
            
            // 如果没有定义，原样返回，不破坏原始内容
            return match;
          });
        }
      });
    });
  });
};