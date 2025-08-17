// scripts/script.js
// SPA 路由 + 动态文章渲染 + 评论功能（localStorage） + 演示脚本
// - 列表卡片与表格：自动从 assets/articles.json 渲染
// - 评论：按 slug 存到 localStorage，安全渲染，页面即时更新
// - 保留 BOM 与 HTTP 状态码演示；不含 Cookie；XSS 按要求

// ---------- 小工具 ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// （保留的）文章“模态”DOM/事件小示例
(() => {
  const links = $$(".article-link");
  if (!links.length) return;
  const modal = document.createElement("div");
  Object.assign(modal.style, { position: "fixed", inset: "0", display: "none", background: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center", zIndex: "1050" });
  const content = document.createElement("div");
  Object.assign(content.style, { background: "#fff", borderRadius: "12px", padding: "20px", maxWidth: "560px", width: "92%" });
  modal.appendChild(content);
  document.body.appendChild(modal);

  links.forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      content.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>示例模态</strong>
          <button class="btn btn-sm btn-outline-secondary" id="modal-close">关闭</button>
        </div>
        <p>这是保留的“模态”示例，用于课堂演示 DOM 创建与事件处理。</p>
      `;
      modal.style.display = "flex";
      $("#modal-close", content).addEventListener("click", () => modal.style.display = "none");
    });
  });
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
})();

// ---------- 表单校验与反馈 ----------
(() => {
  const form = $("#contact-form");
  const result = $("#contact-result");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
    const data = new FormData(form);
    const name = data.get("name");
    const topic = data.get("topic");
    const message = data.get("message");
    result.textContent = `提交成功：${name}（主题：${topic}）说：“${message}”`;
    form.reset();
    form.classList.remove("was-validated");
  });
})();

// ---------- Flexbox 演示 ----------
(() => {
  const box = $("#flex-playground");
  const justify = $("#justify");
  const align = $("#align");
  if (!box || !justify || !align) return;
  const apply = () => { box.style.justifyContent = justify.value; box.style.alignItems = align.value; };
  justify.addEventListener("change", apply);
  align.addEventListener("change", apply);
  apply();
})();

// ---------- BOM 示例（保留） ----------
(() => {
  const info = $("#bom-info code");
  const btnTop = $("#goto-top");
  const btnBaidu = $("#goto-baidu");
  if (info) info.textContent = window.location.href;
  btnTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  btnBaidu?.addEventListener("click", () => { window.location.href = "https://www.baidu.com"; });
})();

// ---------- HTTP 状态码演示（保留） ----------
(() => {
  const sel = $("#status-select");
  const btn = $("#check-status");
  const out = $("#http-result");
  if (!sel || !btn || !out) return;
  btn.addEventListener("click", async () => {
    const code = sel.value;
    out.textContent = "请求中…请在 Network 面板观察。";
    try {
      const resp = await fetch(`https://httpstat.us/${code}`, { redirect: "follow" });
      out.textContent = `完成：HTTP ${resp.status} ${resp.statusText}`;
    } catch (err) {
      out.textContent = `请求失败：${String(err)}`;
    }
  });
})();

// ---------- XSS 风险演示（仅脚本输入时提示） ----------
(() => {
  const form = $("#message-form");
  const unsafe = $("#unsafe-display");
  const safe = $("#safe-display");
  if (!form || !unsafe || !safe) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#xss-name").value || "";
    const msg = $("#xss-message").value || "";

    // 不安全渲染：innerHTML（教学警示）
    unsafe.innerHTML = `<b>${name}</b> 留言： ${msg}`;
    // 安全渲染：textContent
    safe.textContent = `${name} 留言： ${msg}`;

    const hasScript = /<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/i.test(msg);
    if (hasScript) {
      try {
        alert("检测到脚本输入：<script>…</script>（教学提示：实际注入通常不会被执行）");
      } catch (err) {
        console.error(err);
        window.prompt?.("脚本提示失败（可能被策略阻止），请在控制台查看详情：", String(err));
      }
    }
  });
})();

// ======================================================================
// =================  文章数据加载 + 动态列表渲染  =======================
// ======================================================================
let ARTICLES = null;       // 缓存文章
let LIST_RENDERED = false; // 防止重复渲染列表

async function loadArticles() {
  if (ARTICLES) return ARTICLES;
  const resp = await fetch("assets/articles.json", { cache: "no-store" });
  ARTICLES = await resp.json();
  return ARTICLES;
}

async function renderList() {
  if (LIST_RENDERED) return;
  const postsSection = $("#posts");
  if (!postsSection) return;

  // 卡片
  const cardRow = postsSection.querySelector(".row.g-4") || (() => {
    const r = document.createElement("div");
    r.className = "row g-4";
    postsSection.insertBefore(r, postsSection.querySelector(".alert, .mt-4"));
    return r;
  })();

  const list = await loadArticles();
  cardRow.innerHTML = list.map(a => `
    <article class="col-md-6">
      <div class="card h-100">
        <img class="card-img-top" src="${a.cover}" alt="${a.title}封面">
        <div class="card-body">
          <h3 class="h5 card-title">${a.title}</h3>
          <p class="card-text">${a.excerpt ?? ""}</p>
          <a href="#/post/${a.slug}" class="stretched-link">阅读全文</a>
        </div>
      </div>
    </article>
  `).join("");

  // 表格
  const tbody = $("#post-table tbody");
  if (tbody) {
    tbody.innerHTML = list.map((a, idx) => `
      <tr>
        <th scope="row">${idx + 1}</th>
        <td><a href="#/post/${a.slug}">${a.title}</a></td>
        <td>${a.category ?? ""}</td>
        <td>${a.date ?? ""}</td>
      </tr>
    `).join("");
  }

  LIST_RENDERED = true;
}

// ======================================================================
// ==========================  评论功能  =================================
// ======================================================================
function commentKey(slug) {
  return `comments:${slug}`;
}
function loadComments(slug) {
  try {
    const raw = localStorage.getItem(commentKey(slug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveComments(slug, list) {
  localStorage.setItem(commentKey(slug), JSON.stringify(list));
}
function renderComments(slug) {
  const container = $("#comment-list");
  if (!container) return;
  const list = loadComments(slug);

  if (list.length === 0) {
    container.innerHTML = `<div class="text-muted">还没有评论，快来抢沙发～</div>`;
    return;
  }

  container.innerHTML = list.map(c => {
    const dateText = new Date(c.ts || Date.now()).toLocaleString();
    return `
      <div class="border rounded p-2">
        <div class="small text-muted">${dateText}</div>
        <div><strong></strong><span class="ms-2"></span></div>
      </div>
    `;
  }).join("");

  // 安全写入（避免XSS）
  const blocks = $$("#comment-list .border.rounded.p-2");
  blocks.forEach((el, i) => {
    const strong = el.querySelector("strong");
    const span = el.querySelector("span");
    strong.textContent = list[i].name;
    span.textContent = list[i].text;
  });
}

function initCommentForm(slug) {
  const form = $("#comment-form");
  const nameInput = $("#comment-name");
  const textInput = $("#comment-text");
  const slugHidden = $("#comment-slug");
  if (!form || !nameInput || !textInput || !slugHidden) return;

  slugHidden.value = slug;

  // 防止重复绑定：先替换成一个新函数
  form.onsubmit = (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const list = loadComments(slug);
    list.push({ name, text, ts: Date.now() });
    saveComments(slug, list);
    renderComments(slug);
    form.reset();
    form.classList.remove("was-validated");
  };
}

// ======================================================================
// ==========================  简易 SPA 路由  ============================
// ======================================================================
(() => {
  const listSection = document.getElementById("posts");
  const contactSection = document.getElementById("contact");
  const demoSection = document.getElementById("demo");
  const detailSection = document.getElementById("post-detail");
  if (!listSection || !detailSection) return;

  const titleEl = document.getElementById("post-detail-title");
  const metaEl  = document.getElementById("post-meta");
  const coverEl = document.getElementById("post-cover");
  const contentEl = document.getElementById("post-content");
  const backBtn = document.getElementById("back-to-list");
  const prevBtn = document.getElementById("prev-post");
  const nextBtn = document.getElementById("next-post");

  function showOnly(section) {
    for (const sec of [listSection, detailSection, contactSection, demoSection]) {
      if (!sec) continue;
      if (sec === section) sec.classList.remove("d-none");
      else sec.classList.add("d-none");
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function toList() { showOnly(listSection); }
  function toContact() { showOnly(contactSection); }
  function toDemo() { showOnly(demoSection); }

  function parseHash() {
    const hash = location.hash || "#/";
    const m = hash.match(/^#\/post\/([\w-]+)$/);
    if (m) return { view: "post", slug: m[1] };
    if (hash.startsWith("#/contact")) return { view: "contact" };
    if (hash.startsWith("#/demo")) return { view: "demo" };
    return { view: "list" };
  }

  function setupPrevNext(articles, idx) {
    const prev = idx > 0 ? articles[idx - 1] : null;
    const next = idx < articles.length - 1 ? articles[idx + 1] : null;

    if (prev) {
      prevBtn.classList.remove("d-none");
      prevBtn.onclick = () => { location.hash = `#/post/${prev.slug}`; };
    } else {
      prevBtn.classList.add("d-none");
      prevBtn.onclick = null;
    }

    if (next) {
      nextBtn.classList.remove("d-none");
      nextBtn.onclick = () => { location.hash = `#/post/${next.slug}`; };
    } else {
      nextBtn.classList.add("d-none");
      nextBtn.onclick = null;
    }
  }

  async function showDetailBySlug(slug) {
    const list = await loadArticles();
    const idx = list.findIndex(a => a.slug === slug);
    if (idx === -1) { toList(); return; }
    const article = list[idx];

    titleEl.textContent = article.title;
    metaEl.textContent = `${article.category ?? ""} · ${article.date ?? ""}`;
    coverEl.src = article.cover;
    coverEl.alt = article.title;
    contentEl.innerHTML = article.contentHtml; // 若改为 Markdown，可在此转成 HTML

    setupPrevNext(list, idx);

    // 初始化并渲染评论（关键）
    initCommentForm(slug);
    renderComments(slug);

    showOnly(detailSection);
  }

  async function router() {
    const { view, slug } = parseHash();
    switch (view) {
      case "post":
        await showDetailBySlug(slug);
        break;
      case "contact":
        toContact();
        break;
      case "demo":
        toDemo();
        break;
      default:
        await renderList(); // 动态渲染列表
        toList();
    }
  }

  backBtn?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.hash = "#/";
  });

  window.addEventListener("hashchange", router);
  router(); // 首次进入
})();
