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
            --color-red: #de3e2d;
            --color-yellow: #a17a00;
            --color-green: #009e36;
            --color-blue: #0089d7;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --color-text: #e9ecef; /* 浅色文本 */
                --color-background: #212529; /* 深色背景 */
                --color-surface: #343a40; /* 略浅的深色 */
                --color-red: #ff7f6e;
                --color-yellow: #ad850b;
                --color-green: #15b34b;
                --color-blue: #1ca5f3;
            }
        }

        body {
            font-family: Calibri, sans-serif; 
            padding: 2rem; 
            max-width: 800px;
            min-width: 800px;
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
        table {
            border-collapse: collapse; /* This is crucial for tr borders to display correctly */
        }
        td {
            border: 1px solid gray;
            padding: 0.25em 0.75em;
        }
        td p {
            margin-block-start: 0;
            margin-block-end: 0;
        }
        th {
            padding: 0.25em 0.75em;
        }

        .bigger {
            font-size: 300%;
        }
        .bigger.half {
            font-size: 150%;
        }

        .big {
            font-size: 200%;
        }
        .big.half {
            font-size: 100%;
        }

        .lessbig {
            font-size: 140%;
        }
        .lessbig.half {
            font-size: 70%;
        }

        .small {
            font-size: 70%;
        }
        
        .half {
            font-size: 50%;
        }

        .red {
            color: var(--color-red);
        }

        .yellow {
            color: var(--color-yellow);
        }

        .green {
            color: var(--color-green);
        }

        .blue {
            color: var(--color-blue);
        }

        h1 { padding-left: 0em; }
        h2 { padding-left: 2em; }
        h3 { padding-left: 4em; }

        a { color: var(--color-blue); }
        
        .svg-stack {
            display: inline-block;
            vertical-align: -0.125em;
            overflow: visible;
        }
        
        @media (prefers-color-scheme: dark) {
            /* workaround for svg icon color */
            .svg-stack {
                filter: invert(1) hue-rotate(180deg);
            }
        }
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