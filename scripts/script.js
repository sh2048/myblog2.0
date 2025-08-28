// scripts/script.js
// 去除“前端演示”相关代码；保留：SPA 路由、文章渲染、联系表单校验。

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------------- SPA 路由 ----------------
const routes = {
  '/': renderList,
  '/post': renderDetail,     // 使用 /post?slug=xxx
  '/contact': renderContact,
};

function navigate(hash) {
  const raw = (hash || location.hash || '#/').replace(/^#/, '');
  const [path, queryString] = raw.split('?');
  const url = new URLSearchParams(queryString || '');
  const view = routes[path] || renderList;
  view(url);
}

window.addEventListener('hashchange', () => navigate(location.hash));
window.addEventListener('DOMContentLoaded', () => {
  // 初始渲染
  navigate(location.hash);

  // 列表返回按钮事件（委托）
  const backBtn = $('#back-to-list');
  if (backBtn) backBtn.addEventListener('click', () => location.hash = '#/');
});

// ---------------- 文章数据加载与渲染 ----------------
async function loadArticles() {
  const res = await fetch('assets/articles.json');
  return res.json();
}

let articlesCache = null;

async function renderList() {
  $('#posts')?.classList.remove('d-none');
  $('#post-detail')?.classList.add('d-none');
  $('#contact')?.classList.add('d-none');
  $('#about')?.classList.remove('d-none');

  if (!articlesCache) articlesCache = await loadArticles();

  const container = $('#posts .row');
  if (!container) return;

  const searchInput = $('#search-input');
  const categoryList = $('#category-list');
  let currentCategory = '';

  function display(list) {
    container.innerHTML = '';
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'col-sm-6 col-lg-4';
      card.innerHTML = `
        <div class="card h-100 shadow-sm">
          <img src="${p.cover || ''}" class="card-img-top" alt="${p.title}" loading="lazy">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.title}</h5>
            <p class="card-text text-muted small mb-2">${p.category} · ${p.date}</p>
            <p class="card-text flex-grow-1">${p.excerpt || ''}</p>
            <a class="btn btn-primary mt-auto article-link" href="#/post?slug=${encodeURIComponent(p.slug)}">阅读全文</a>
          </div>
        </div>`;
      container.appendChild(card);
    });
  }

  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const list = articlesCache.filter(p => {
      const matchCategory = !currentCategory || p.category === currentCategory;
      const text = (p.title + (p.excerpt || '')).toLowerCase();
      return matchCategory && (!query || text.includes(query));
    });
    display(list);
  }

  searchInput?.addEventListener('input', applyFilters);
  categoryList?.addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    currentCategory = btn.dataset.category;
    applyFilters();
  });

  applyFilters();
}

async function renderDetail(params) {
  $('#posts')?.classList.add('d-none');
  $('#post-detail')?.classList.remove('d-none');
  $('#contact')?.classList.add('d-none');
  $('#about')?.classList.add('d-none');

  if (!articlesCache) articlesCache = await loadArticles();
  const slug = params.get('slug') || '';
  const idx = articlesCache.findIndex(p => p.slug === slug);
  const post = articlesCache.find(p => p.slug === slug);

  if (!post) {
    $('#post-detail-title').textContent = '未找到该文章';
    $('#post-content').textContent = '';
    return;
  }

  $('#post-detail-title').textContent = post.title;
  $('#post-meta').textContent = `${post.category} · ${post.date}`;
  $('#post-cover').src = post.cover || '';
  $('#post-cover').alt = post.title;

  // 支持 contentHtml 或 contentUrl
  const contentBox = $('#post-content');
  contentBox.innerHTML = ''; // 清空
  if (post.contentHtml) {
    contentBox.innerHTML = post.contentHtml;
  } else if (post.contentUrl) {
    try {
      const res = await fetch(post.contentUrl);
      const html = await res.text();
      contentBox.innerHTML = html;
    } catch (e) {
      contentBox.textContent = '加载正文失败。';
    }
  }

  // 上/下一篇
  const prev = $('#prev-post'), next = $('#next-post');
  const hasPrev = idx > 0, hasNext = idx >= 0 && idx < (articlesCache.length - 1);
  prev.classList.toggle('d-none', !hasPrev);
  next.classList.toggle('d-none', !hasNext);
  if (hasPrev) prev.onclick = () => location.hash = `#/post?slug=${encodeURIComponent(articlesCache[idx-1].slug)}`;
  if (hasNext) next.onclick = () => location.hash = `#/post?slug=${encodeURIComponent(articlesCache[idx+1].slug)}`;

}

// ---------------- 联系表单 ----------------
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

// ---------------- 跳转到联系/首页的入口逻辑 ----------------
function renderContact() {
  $('#posts')?.classList.add('d-none');
  $('#post-detail')?.classList.add('d-none');
  $('#contact')?.classList.remove('d-none');
  $('#about')?.classList.add('d-none');
}
