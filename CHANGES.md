# 更改概览
- 将单页应用（SPA）中的“联系表单”和“前端演示”拆分为两个独立页面：`contact.html` 与 `demo.html`。
- `index.html`：导航改为跳转到新页面，并移除了原有的 `#contact` 与 `#demo` 两个区块，其余文章列表/详情与哈希路由保持不变。
- `scripts/script.js` 未修改：它会按需绑定到页面上存在的元素。在 `contact.html` 与 `demo.html` 中同样复用该脚本以获得原有交互（表单校验、BOM/HTTP/XSS 演示等）。

## 受影响/新增文件
- 修改：`index.html`
- 新增：`contact.html`
- 新增：`demo.html`

## 使用方式
- 首页文章与详情：打开 `index.html`（原有哈希路由：`#/`、`#/post/:slug` 仍然可用）。
- 联系页面：打开 `contact.html`。
- 演示页面：打开 `demo.html`。

> 如果你有构建/部署流程（如 GitHub Pages、Nginx），将这三个文件一并部署即可。
