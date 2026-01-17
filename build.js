// build.js
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
// 引入插件
const svgStackPlugin = require('./plugin-svg-stack');
const fontSizePlugin = require('./plugin-fontsize');
const accentQuickPlugin = require('./plugin-accent-quick');
const macroPlugin = require('./plugin-macro');
const myMacros = require('./macros'); // 导入外部宏定义
// --- 配置路径 ---
const SRC_FILE = path.join(__dirname, '夏理文v1.2设计文档.md');
const TEMPLATE_FILE = path.join(__dirname, 'template.html');
const OUT_FILE = path.join(__dirname, 'output.html');
const ICONS_DIR = path.join(__dirname, 'icons');

// --- 初始化 Markdown-it ---
// html: true 必须开启，因为我们的插件会输出原始 HTML (SVG代码)
const md = new MarkdownIt({
    html: true,
    breaks: true
});

md.use(macroPlugin, { macros: myMacros });
md.use(accentQuickPlugin);
// !!! 关键顺序 !!!
// 1. 先加载字体插件 (先把 ^^::icon::^^ 拆解成 span + text)
md.use(fontSizePlugin);

// 2. 后加载 SVG 插件 (在 span 里的 text 中查找 ::icon:: 并替换)
md.use(svgStackPlugin, {
  basePath: ICONS_DIR,      // 磁盘路径，用于检查文件
  publicPath: 'icons/',                         // HTML中引用的相对路径
  defaultFile: 'default.svg'                    // 默认库文件
});

// --- 主逻辑 ---
function build() {
    console.log('Building...');

    // 1. 读取 Markdown 文件
    if (!fs.existsSync(SRC_FILE)) {
        console.error(`Error: Source file not found at ${SRC_FILE}`);
        return;
    }
    const mdContent = fs.readFileSync(SRC_FILE, 'utf8');

    // 2. 渲染 HTML
    const resultBody = md.render(mdContent);

    // 3. 包装成一个完整的 HTML 页面结构
    const templatedContent = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    const finalHtml = templatedContent.replace('{0}', resultBody);

    // 4. 输出文件
    fs.writeFileSync(OUT_FILE, finalHtml);
    console.log(`Build success! Output saved to: ${OUT_FILE}`);
}

build();