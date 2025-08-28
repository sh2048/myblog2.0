#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量构建工具：
- 读取 content/*.md（带 frontmatter）
- 生成/更新 assets/articles.json （写入 contentHtml，与你的前端对齐）
- 可选生成 assets/articles/{slug}.html （独立全文预览）
只用标准库：pathlib、json、re、datetime
"""

from pathlib import Path
import json, re, datetime, sys

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR  = ROOT / "content"
ARTICLES_DIR = ROOT / "assets" / "articles"
JSON_PATH    = ROOT / "assets" / "articles.json"

ARTICLES_DIR.mkdir(parents=True, exist_ok=True)
(JSON_PATH.parent).mkdir(parents=True, exist_ok=True)

# ---------- 工具函数 ----------
def parse_md_with_frontmatter(p: Path):
    text = p.read_text("utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, flags=re.S)
    front, body = {}, text
    if m:
        fm, body = m.group(1), m.group(2)
        for line in fm.splitlines():
            line = line.strip()
            if not line or line.startswith("#"): 
                continue
            if ":" in line:
                k, v = line.split(":", 1)
                front[k.strip()] = v.strip()
    return front, body

def slugify(s: str):
    s = (s or "").lower()
    s = re.sub(r"[\u4e00-\u9fa5]+", "", s)     # 去中文（避免路径问题；你也可去掉这行）
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80] or f"post-{int(datetime.datetime.now().timestamp())}"

def esc(s: str):
    return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def md_to_html(md: str):
    """极简 Markdown：# ## ###、**加粗**、*斜体*、- 列表、空行分段"""
    h = esc(md)
    h = re.sub(r"^###\s?(.*)$", r"<h3>\1</h3>", h, flags=re.M)
    h = re.sub(r"^##\s?(.*)$", r"<h2>\1</h2>", h, flags=re.M)
    h = re.sub(r"^#\s?(.*)$",  r"<h1>\1</h1>", h, flags=re.M)
    h = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", h)
    h = re.sub(r"\*(.+?)\*", r"<em>\1</em>", h)
    h = re.sub(r"^- (.*)$", r"<li>\1</li>", h, flags=re.M)
    # 列表包裹
    h = re.sub(r"(<li>.*?</li>)(\n(?!<li>)|$)", r"<ul>\1</ul>", h, flags=re.S)
    # 段落
    blocks = re.split(r"\n\n+", h)
    blocks = [b if re.match(r"^(<h\d|<ul|<li)", b) else f"<p>{b.replace('\n','<br>')}</p>" for b in blocks]
    return "\n".join(blocks)

def build_full_html(meta: dict, body_html: str) -> str:
    title   = meta.get("title","Untitled")
    date    = meta.get("date","")
    klass   = meta.get("class","")
    student = meta.get("student","")
    cover   = meta.get("cover","")
    excerpt = (meta.get("excerpt","")).replace('"', "&quot;")
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{excerpt}" />
</head>
<body>
  <article>
    <h1>{title}</h1>
    <p><small>{date}｜{klass}｜{student}</small></p>
    {f'<p><img src="{cover}" alt="cover" loading="lazy"></p>' if cover else ''}
    {body_html}
  </article>
</body>
</html>"""

def load_articles_json():
    if JSON_PATH.exists():
        try:
            data = json.loads(JSON_PATH.read_text("utf-8"))
            if isinstance(data, list):
                return data
            print("⚠️ 现有 articles.json 不是数组，将重新生成。")
        except Exception as e:
            print(f"⚠️ 现有 articles.json 解析失败：{e}，将重新生成。")
    return []

# ---------- 主流程 ----------
def main(generate_html=True):
    items      = load_articles_json()
    by_slug    = { it.get("slug"): it for it in items if isinstance(it, dict) }
    md_files   = sorted(CONTENT_DIR.glob("*.md"))
    if not md_files:
        print(f"⚠️ 未在 {CONTENT_DIR} 发现 .md 文件。")
    updated = 0

    for md in md_files:
        fm, body = parse_md_with_frontmatter(md)
        # 基本校验
        title = fm.get("title","").strip()
        date  = fm.get("date","").strip()
        if not title or not date:
            print(f"跳过（缺少 title/date）：{md.name}")
            continue

        slug = (fm.get("slug","").strip() or slugify(title + "-" + date))
        body_html = md_to_html(body)

        # 可选输出独立 HTML（预览用；站点不依赖）
        if generate_html:
            html_name = f"{slug}.html"
            full_html = build_full_html(fm, body_html)
            (ARTICLES_DIR / html_name).write_text(full_html, "utf-8")

        # 写入 JSON 的条目（与你前端对齐：contentHtml）
        entry = {
            "slug": slug,
            "title": title,
            "date": date,
            "category": fm.get("category","课堂展示"),
            "class": fm.get("class",""),
            "student": fm.get("student",""),
            "cover": fm.get("cover",""),
            "excerpt": fm.get("excerpt",""),
            "tags": [t.strip() for t in (fm.get("tags","").split(",") if fm.get("tags") else []) if t.strip()],
            "contentHtml": body_html
        }
        by_slug[slug] = entry
        updated += 1

    # 重新排序 & 写回
    out = list(by_slug.values())
    out.sort(key=lambda x: x.get("date",""), reverse=True)
    JSON_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), "utf-8")

    print(f"✅ 完成：更新 {JSON_PATH}，新增/更新 {updated} 篇；可选 HTML 输出目录：{ARTICLES_DIR}")

if __name__ == "__main__":
    # 允许通过命令行参数关闭 HTML 产出：python build_articles.py --no-html
    gen_html = not ("--no-html" in sys.argv)
    main(generate_html=gen_html)
