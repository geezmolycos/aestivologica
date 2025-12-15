// build.js
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
// 引入两个插件
const svgStackPlugin = require('./plugin-svg-stack');
const fontSizePlugin = require('./plugin-fontsize');
// --- 配置路径 ---
const SRC_FILE = path.join(__dirname, '夏理文v1.2设计文档.md');
const OUT_FILE = path.join(__dirname, 'output.html');
const ICONS_DIR = path.join(__dirname, 'icons');

// --- 初始化 Markdown-it ---
// html: true 必须开启，因为我们的插件会输出原始 HTML (SVG代码)
const md = new MarkdownIt({
    html: true,
    breaks: true
});

// !!! 关键顺序 !!!
// 1. 先加载字体插件 (先把 ^^::icon::^^ 拆解成 span + text)
md.use(fontSizePlugin);

// 2. 后加载 SVG 插件 (在 span 里的 text 中查找 ::icon:: 并替换)
md.use(svgStackPlugin, { basePath: ICONS_DIR });

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
    const finalHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <title>夏理文v1.2設計文檔</title>
    <style>
        :root {
            /* 文本颜色 */
            --color-text: #212529; 
            /* 背景颜色 */
            --color-background: #ffffff;
            /* 次级背景/高亮 (例如代码块背景) */
            --color-surface: #f8f9fa; 
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --color-text: #e9ecef; /* 浅色文本 */
                --color-background: #212529; /* 深色背景 */
                --color-surface: #343a40; /* 略浅的深色 */
            }
        }

        body {
            font-family: sans-serif; 
            padding: 2rem; 
            max-width: 800px; 
            margin: 0 auto; 
            line-height: 1.6;
            
            /* 应用变量到主体 */
            color: var(--color-text);
            background-color: var(--color-background);
            font-size: 16px;
        }
        code { 
            background: var(--color-surface); 
            padding: 2px 4px; 
            border-radius: 4px; 
        }

        h1 { padding-left: 0em; }
        h2 { padding-left: 2em; }
        h3 { padding-left: 4em; }
        
        /* 也可以在这里全局控制，但插件已经内联了关键样式 */
        .svg-stack { margin: 0 2px; }
    </style>
</head>
<body>
    ${resultBody}
</body>
</html>
    `;

    // 4. 输出文件
    fs.writeFileSync(OUT_FILE, finalHtml);
    console.log(`Build success! Output saved to: ${OUT_FILE}`);
}

build();