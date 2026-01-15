module.exports = {
  // 基础示例
  count: (args, { ctx }) => {
    ctx.counter = (ctx.counter || 0) + 1;
    return `计数: **${ctx.counter}** (参数: ${args})`;
  },

  def: (args, { ctx }) => {
    const [name, content] = args;
    if (name) {
      ctx.templates = ctx.templates || {};
      ctx.templates[name.trim()] = content;
    }
    return "";
  },

  call: (args, { md, env, ctx }) => {
    const [name, ...params] = args;
    const template = ctx.templates?.[name.trim()];
    if (!template) return null;

    const rendered = template.replace(/\{(\d+)\}/g, (m, i) => params[i] ?? m);
    return { html: md.render(rendered, env) };
  },

  box: (args, { md, env }) => {
    return {
      html: `<div class="macro-box" style="border:1.5px solid #555; padding:15px; border-radius:8px; background:#fafafa;">
               ${md.render(args[0], env)}
             </div>`
    };
  }
};