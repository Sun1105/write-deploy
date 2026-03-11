console.log("Main.js loaded successfully!");

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? 'http://localhost:3002/api' : '/api';
let CURRENT_USER = null;
let currentEditingFile = null;
let currentEditingSha = null;
let currentEditingDate = null;

function apiUrl(pathname) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_BASE}${p}`;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initEditorToolbar();
  renderFrontendPosts();
  // If hash is present, route to it? For now default home
});

// ── AUTH ──
function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      CURRENT_USER = JSON.parse(localStorage.getItem('user_info') || '{}');
    } catch {
      CURRENT_USER = null;
    }
    if (CURRENT_USER) updateNavUser();
  }
}

async function handleLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch(apiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await safeJson(res) || {};
    
    if (data.success) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_info', JSON.stringify(data.user));
      CURRENT_USER = data.user;
      showToast('登录成功！欢迎回来 👋');
      updateNavUser();
      setTimeout(() => {
        setMode('admin');
      }, 500);
    } else {
      showToast('登录失败: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    showToast('登录请求出错，请确保后台服务已启动');
  }
}

function updateNavUser() {
  if (CURRENT_USER) {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;
    const initial = CURRENT_USER.name ? String(CURRENT_USER.name).slice(0, 1) : 'U';
    actions.innerHTML = `<div class="nav-avatar" onclick="setMode('admin')" title="进入后台">${escapeHtml(initial)}</div>`;
  }
}

// ── DATA FETCHING ──
async function fetchStats() {
  try {
    const res = await fetch(apiUrl('/stats'));
    const data = await safeJson(res) || {};
    if (document.getElementById('statPostCount')) document.getElementById('statPostCount').textContent = data.postCount;
    if (document.getElementById('statViewCount')) document.getElementById('statViewCount').textContent = Number(data.viewCount || 0).toLocaleString();
  } catch (err) { console.error('Failed to fetch stats', err); }
}

async function fetchPosts() {
  try {
    const res = await fetch(apiUrl('/posts'));
    const posts = await safeJson(res) || [];
    const tbody = document.getElementById('articleListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    posts.forEach(post => {
      const tr = document.createElement('tr');
      const statusClass = post.published ? 'status-published' : 'status-draft';
      const statusText = post.published ? '● 已发布' : '○ 草稿';
      const categoryName = pickFirstText(post.categories) || '文章';
      
      tr.innerHTML = `
        <td><div style="display:flex;align-items:center;gap:.75rem"><div class="article-thumb">📄</div><div style="font-size:13.5px;font-weight:500;color:var(--admin-text)">${post.title}</div></div></td>
        <td><span class="tag tag-gray" style="font-size:11px">${escapeHtml(categoryName)}</span></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">-</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">-</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${new Date(post.date).toLocaleDateString()}</td>
        <td><div style="display:flex;gap:.4rem">
          <button class="btn btn-admin-outline btn-sm" onclick="editPost('${post.filename}')">编辑</button>
          <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deletePost('${post.filename}')">删除</button>
        </div></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) { console.error('Failed to fetch posts', err); }
}

function pickFirstText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return pickFirstText(value[0]);
  return String(value);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function editPost(filename) {
  currentEditingFile = filename;
  currentEditingSha = null;
  currentEditingDate = null;
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`));
    const data = await safeJson(res) || {};
    if (!data.content) {
      showToast('加载文章失败');
      return;
    }

    currentEditingSha = data.sha || null;

    const parsed = splitFrontMatter(String(data.content));
    const fm = parsed.frontMatter;
    currentEditingDate = fm.date || null;

    const title = fm.title || filename.replace(/\.md$/i, '');
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) editorTitle.value = title;

    const editorContent = document.getElementById('editorContent');
    if (editorContent) editorContent.value = parsed.body || '';

    const tagsInput = document.getElementById('editorTags');
    if (tagsInput) tagsInput.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : '';

    const catInput = document.getElementById('editorCategory');
    if (catInput) catInput.value = Array.isArray(fm.categories) ? fm.categories.join(', ') : '';

    const excerptInput = document.getElementById('editorExcerpt');
    if (excerptInput) excerptInput.value = typeof fm.description === 'string' ? fm.description : '';

    const slugInput = document.getElementById('editorSlug');
    if (slugInput) slugInput.value = slugFromFilename(filename);

    showAdminPage('editor');
  } catch (err) {
    console.error(err);
    showToast('加载文章失败');
  }
}

async function savePost(publish = false) {
  const titleEl = document.getElementById('editorTitle');
  const contentEl = document.getElementById('editorContent');
  const title = titleEl ? titleEl.value.trim() : '';
  const body = contentEl ? contentEl.value : '';

  if (!title || !body.trim()) {
    showToast('标题和内容不能为空');
    return;
  }

  const tagsInput = document.getElementById('editorTags');
  const catInput = document.getElementById('editorCategory');
  const excerptInput = document.getElementById('editorExcerpt');
  const slugInput = document.getElementById('editorSlug');

  const tags = parseCommaList(tagsInput ? tagsInput.value : '');
  const categories = parseCommaList(catInput ? catInput.value : '');
  const description = excerptInput ? excerptInput.value.trim() : '';
  const slug = (slugInput ? slugInput.value : '') || title;

  const desiredSlug = slugify(slug);
  const filename = currentEditingFile
    ? renameFilenameWithSlug(currentEditingFile, desiredSlug)
    : `${Date.now()}-${desiredSlug}.md`;
  const date = currentEditingDate || new Date().toISOString();
  const content = buildMarkdown({
    title,
    date,
    tags,
    categories,
    description,
    published: publish ? undefined : false,
    body
  });

  const isUpdate = Boolean(currentEditingFile) && filename === currentEditingFile;

  try {
    if (currentEditingFile && filename !== currentEditingFile) {
      const createRes = await fetch(apiUrl('/post'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          content,
          message: `Rename ${currentEditingFile} -> ${filename}`
        })
      });
      const createData = await safeJson(createRes) || {};
      if (!createRes.ok || !(createData.success || createData.filename)) {
        showToast(createData.error ? `保存失败: ${createData.error}` : '保存失败');
        return;
      }

      await fetch(apiUrl(`/post?filename=${encodeURIComponent(currentEditingFile)}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Delete ${currentEditingFile} after rename` })
      }).catch(() => {});

      currentEditingFile = filename;
      currentEditingSha = null;
      currentEditingDate = date;

      showToast('保存成功');
      showAdminPage('articles');
      fetchPosts();
      return;
    }

    const res = await fetch(isUpdate ? apiUrl(`/post?filename=${encodeURIComponent(filename)}`) : apiUrl('/post'), {
      method: isUpdate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        content,
        sha: currentEditingSha,
        message: isUpdate ? `Update ${filename}` : `Create ${filename}`
      })
    });
    const data = await safeJson(res) || {};

    if (res.ok && (data.success || data.filename)) {
      showToast('保存成功');
      currentEditingFile = filename;
      if (data.sha) currentEditingSha = data.sha;
      showAdminPage('articles');
      fetchPosts();
    } else {
      showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
    }
  } catch (err) { 
    console.error(err); 
    showToast('保存请求出错');
  }
}

async function deletePost(filename) {
  if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Delete ${filename}` })
    });
    const data = await safeJson(res) || {};
    if (data.success) {
      showToast('已删除');
      if (currentEditingFile === filename) {
        currentEditingFile = null;
        currentEditingSha = null;
        currentEditingDate = null;
      }
      fetchPosts();
    } else {
      showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
    }
  } catch (err) { console.error(err); showToast('删除失败'); }
}

function parseCommaList(v) {
  return String(v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function slugify(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, '-');
  const cleaned = normalized.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'post';
}

function slugFromFilename(filename) {
  const base = String(filename || '').replace(/\\.md$/i, '');
  const m = base.match(/^\\d+-(.+)$/);
  return m ? m[1] : base;
}

function renameFilenameWithSlug(filename, slug) {
  const base = String(filename || '').replace(/\.md$/i, '');
  const m = base.match(/^(\d+)-(.+)$/);
  const prefix = m ? m[1] : String(Date.now());
  return `${prefix}-${slug}.md`;
}

function splitFrontMatter(markdown) {
  const text = String(markdown || '');
  if (!text.startsWith('---')) {
    return { frontMatter: {}, body: text };
  }
  const end = text.indexOf('\n---\n', 3);
  if (end === -1) {
    return { frontMatter: {}, body: text };
  }
  const fmText = text.slice(3, end).trim();
  const body = text.slice(end + 5);
  return { frontMatter: parseFrontMatter(fmText), body: body.replace(/^\n+/, '') };
}

function parseFrontMatter(fmText) {
  const lines = String(fmText || '').split('\n');
  const out = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === 'title') out.title = stripQuotes(value);
    else if (key === 'date') out.date = stripQuotes(value);
    else if (key === 'description') out.description = stripQuotes(value);
    else if (key === 'tags') out.tags = parseInlineArray(value);
    else if (key === 'categories') out.categories = parseInlineArray(value);
    else if (key === 'published') out.published = value === 'true';
  }
  return out;
}

function parseInlineArray(value) {
  const v = stripQuotes(value || '');
  const m = v.match(/^\[(.*)\]$/);
  if (!m) return [];
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map(s => stripQuotes(s.trim())).filter(Boolean);
}

function stripQuotes(s) {
  const str = String(s || '');
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

function buildMarkdown({ title, date, tags, categories, description, published, body }) {
  const fmLines = ['---', `title: ${escapeFrontMatter(title)}`, `date: ${escapeFrontMatter(date)}`];

  if (Array.isArray(tags) && tags.length) {
    fmLines.push(`tags: [${tags.map(t => escapeFrontMatter(t)).join(', ')}]`);
  } else {
    fmLines.push('tags: []');
  }

  if (Array.isArray(categories) && categories.length) {
    fmLines.push(`categories: [${categories.map(c => escapeFrontMatter(c)).join(', ')}]`);
  } else {
    fmLines.push('categories: []');
  }

  if (description) fmLines.push(`description: ${escapeFrontMatter(description)}`);
  if (typeof published === 'boolean') fmLines.push(`published: ${published ? 'true' : 'false'}`);

  fmLines.push('---', '');
  return `${fmLines.join('\n')}${String(body || '').replace(/^\n+/, '')}`;
}

function escapeFrontMatter(v) {
  const s = String(v ?? '');
  if (!s) return '""';
  if (/[:\n\r]/.test(s) || s.trim() !== s) {
    return JSON.stringify(s);
  }
  return s;
}

function initEditorToolbar() {
  const toolbar = document.querySelector('.editor-toolbar');
  if (!toolbar) return;
  
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;
    
    const title = btn.title || btn.textContent.trim();
    const textarea = document.getElementById('editorContent');
    
    if (title.includes('加粗') || title === 'B') insertText(textarea, '**', '**');
    else if (title.includes('斜体') || title === 'I') insertText(textarea, '*', '*');
    else if (title.includes('下划线') || title === 'U') insertText(textarea, '<u>', '</u>');
    else if (title === 'H1') insertText(textarea, '# ', '');
    else if (title === 'H2') insertText(textarea, '## ', '');
    else if (title === 'H3') insertText(textarea, '### ', '');
    else if (title === '❝') insertText(textarea, '> ', '');
    else if (title === '</>') insertText(textarea, '```\n', '\n```');
    else if (title === '🔗') insertText(textarea, '[链接文字](', ')');
    else if (title === '—') insertText(textarea, '\n---\n', '');
  });
}

function insertText(textarea, before, after) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  
  const replacement = before + selected + after;
  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  
  textarea.focus();
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + replacement.length - after.length;
}

// ── PAGE ROUTING ──
async function showPage(name, param) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Update nav
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navMap = { home:'navHome', articles:'navArticles', novels:'navNovels', about:'navAbout' };
  if (navMap[name]) {
    const navEl = document.getElementById(navMap[name]);
    if (navEl) navEl.classList.add('active');
  }

  // Page specific logic
  if (name === 'article' && param) {
    await loadArticle(param);
  }
  if (name === 'chapter' && param) {
    // param format: novelId/chapterFilename
    const [novelId, chapterFile] = param.split('/');
    await loadChapter(novelId, chapterFile);
  }
  if (name === 'articles' || name === 'home') {
    renderFrontendPosts();
  }
  if (name === 'novels') {
    renderFrontendNovels();
  }
}

async function loadChapter(novelId, chapterFile) {
  try {
    const res = await fetch(apiUrl(`/novel-chapter?novelId=${encodeURIComponent(novelId)}&chapterFile=${encodeURIComponent(chapterFile)}`));
    const data = await safeJson(res) || {};
    
    document.querySelector('.chapter-title-bar').textContent = data.novelTitle;
    document.querySelector('.chapter-title').textContent = data.title;
    if (window.marked && window.DOMPurify) {
      document.querySelector('.chapter-body').innerHTML = DOMPurify.sanitize(marked.parse(data.content || ''));
    } else {
      document.querySelector('.chapter-body').textContent = data.content || '';
    }
    
    // Update TOC
    const tocList = document.querySelector('.chapter-toc-list');
    tocList.innerHTML = data.chapters.map(c => `
      <div class="chapter-toc-item ${c.filename === chapterFile ? 'current' : ''}" onclick="showPage('chapter', '${novelId}/${c.filename}')">
        <span class="chapter-toc-num">#</span>${c.title}
      </div>
    `).join('');
    
  } catch (err) { showToast('章节加载失败'); }
}

async function renderFrontendNovels() {
  try {
    const res = await fetch(apiUrl('/novels'));
    const novels = await safeJson(res) || [];
    const grid = document.querySelector('.novels-list-grid');
    if (!grid) return;
    
    grid.innerHTML = novels.map(n => `
      <div class="novel-list-card" onclick="alert('Select a chapter')">
        <div class="novel-list-cover" style="background:${getRandomGradient(n.title)}">
          <div class="novel-list-cover-icon">📖</div>
          <div class="novel-list-cover-overlay"><div class="novel-list-title">${n.title}</div></div>
        </div>
        <div class="novel-list-body">
          <div style="display:flex;align-items:center;justify-content:space-between"><span class="tag tag-blue">${n.genre || '未分类'}</span><span class="tag tag-green" style="font-size:10px">${n.status === 'finished' ? '已完结' : '连载中'}</span></div>
          <div class="novel-info-row">
            <span class="novel-chapters-count">${n.chapters} 章</span>
            ${n.firstChapter ? 
              `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();showPage('chapter', '${n.id}/${n.firstChapter}')">开始阅读</button>` :
              `<button class="btn btn-outline btn-sm" disabled>暂无章节</button>`
            }
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function loadArticle(filename) {
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`));
    const data = await safeJson(res) || {};
    
    // Parse front matter manually since we get raw content
    const content = String(data.content || '');
    const parsed = splitFrontMatter(content);
    const fm = parsed.frontMatter || {};
    let body = parsed.body || '';
    let title = filename.replace('.md', '');
    let date = new Date().toLocaleDateString();
    let tags = [];
    
    if (fm.title) title = fm.title;
    if (fm.date) date = new Date(fm.date).toLocaleDateString();
    if (Array.isArray(fm.tags)) tags = fm.tags;
    
    // Update UI
    document.querySelector('.article-headline').textContent = title;
    if (window.marked && window.DOMPurify) {
      document.querySelector('.article-content').innerHTML = DOMPurify.sanitize(marked.parse(body));
    } else {
      document.querySelector('.article-content').textContent = body;
    }
    
    // Update meta
    const metaItems = document.querySelectorAll('.article-meta-item');
    if (metaItems[0]) metaItems[0].textContent = `📅 ${date}`;
    
    // Update tags
     const tagContainer = document.querySelector('.article-tags');
     tagContainer.innerHTML = tags.map(t => `<span class="tag tag-gray">${t}</span>`).join('');
     
     // Load comments
     loadComments(filename);

   } catch (err) {
     console.error(err);
     showToast('文章加载失败');
   }
 }

 async function loadComments(postId) {
   const container = document.querySelector('.comments-section');
   // Reset input
   const textarea = container.querySelector('textarea');
   const footer = container.querySelector('.comment-input-footer');
   
   if (CURRENT_USER) {
     textarea.readOnly = false;
     textarea.onclick = null;
     textarea.placeholder = "写下你的想法……";
     footer.innerHTML = `
       <div class="comment-user-info">
         <div class="comment-avatar">${escapeHtml((CURRENT_USER.name ? String(CURRENT_USER.name) : 'U').slice(0, 1))}</div>
         <span>${escapeHtml(CURRENT_USER.name || 'User')}</span>
       </div>
       <button class="btn btn-primary btn-sm" onclick="submitComment('${postId}')">发布评论</button>
     `;
   } else {
     textarea.readOnly = true;
     textarea.onclick = () => showPage('login');
     textarea.placeholder = "写下你的想法……（登录后才能评论）";
     footer.innerHTML = `
       <div class="comment-user-info">
         <div class="comment-avatar">?</div>
         <span>请先登录</span>
       </div>
       <button class="btn btn-primary btn-sm" onclick="showPage('login')">登录后评论</button>
     `;
   }

   try {
     const res = await fetch(apiUrl(`/comments?post=${encodeURIComponent(postId)}`));
     const comments = await safeJson(res) || [];
     
     // Update count
     document.querySelector('.comments-title').textContent = `评论 · ${comments.length}`;
     
     // Render list
     const list = container.querySelectorAll('.comment-item');
     // Remove old items but keep input area
     Array.from(list).forEach(el => el.remove());
     
     comments.forEach(c => {
       if (c.status !== 'approved' && (!CURRENT_USER || CURRENT_USER.role !== 'Administrator')) return;
       
       const div = document.createElement('div');
       div.className = 'comment-item';
       div.innerHTML = `
         <div class="comment-avatar-lg" style="background:${getRandomGradient(c.user)}">${c.user[0]}</div>
         <div class="comment-body">
           <div class="comment-header">
             <span class="comment-name">${c.user}</span>
             <span class="comment-time">${new Date(c.date).toLocaleDateString()} ${c.status === 'pending' ? '(待审核)' : ''}</span>
           </div>
           <div class="comment-text">${window.DOMPurify ? DOMPurify.sanitize(c.content) : escapeHtml(c.content)}</div>
           <div class="comment-actions">
             <div class="comment-action">👍 0</div>
             <div class="comment-action" onclick="showPage('login')">回复</div>
           </div>
         </div>
       `;
       container.appendChild(div);
     });
     
   } catch (err) { console.error(err); }
 }

 async function submitComment(postId) {
   const textarea = document.querySelector('.comments-section textarea');
   const content = textarea.value.trim();
   if (!content) return showToast('评论内容不能为空');
   
   try {
     const res = await fetch(apiUrl('/comments'), {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ post: postId, content, user: CURRENT_USER ? CURRENT_USER.name : 'Anonymous' })
     });
     const data = await safeJson(res) || {};
     if (data.success) {
       showToast('评论已提交，等待审核');
       textarea.value = '';
       loadComments(postId);
     }
   } catch (err) { showToast('评论提交失败'); }
 }

 async function renderFrontendPosts() {
  try {
    const res = await fetch(apiUrl('/posts'));
    const posts = await safeJson(res) || [];
    
    // Update Home Page Grid
    const homeGrid = document.querySelector('#page-home .articles-grid');
    if (homeGrid) {
      homeGrid.innerHTML = posts.slice(0, 6).map(post => `
        <div class="article-card" onclick="showPage('article', '${post.filename}')">
          <div class="card-cover" style="background:${getRandomGradient(post.title)}">
            <div class="card-category-badge">文章</div>
            ${getRandomIcon(post.title)}
          </div>
          <div class="card-body">
            <h3 class="card-title">${post.title}</h3>
            <p class="card-excerpt">点击阅读全文...</p>
            <div class="card-footer">
              <div class="card-meta">
                <span>${new Date(post.date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Update Articles Page List
    const articlesGrid = document.querySelector('#page-articles .articles-grid');
    if (articlesGrid && document.getElementById('page-articles').classList.contains('active')) {
      articlesGrid.innerHTML = posts.map(post => `
        <div class="article-card" onclick="showPage('article', '${post.filename}')">
          <div class="card-cover" style="background:${getRandomGradient(post.title)}">
            <div class="card-category-badge">文章</div>
            ${getRandomIcon(post.title)}
          </div>
          <div class="card-body">
            <h3 class="card-title">${post.title}</h3>
            <div class="card-footer">
              <div class="card-meta"><span>${new Date(post.date).toLocaleDateString()}</span></div>
            </div>
          </div>
        </div>
      `).join('');
    }
    
  } catch (err) { console.error('Failed to load posts', err); }
}

function getRandomGradient(str) {
  const colors = [
    'linear-gradient(135deg,#1a3a2e,#2d6b52)',
    'linear-gradient(135deg,#3d2a1a,#7a4f2d)',
    'linear-gradient(135deg,#0a1a2a,#1a3a5c)',
    'linear-gradient(135deg,#1a0a2a,#3d1a5c)',
    'linear-gradient(135deg,#1a2a0a,#3d5c1a)'
  ];
  return colors[str.length % colors.length];
}

function getRandomIcon(str) {
  const icons = ['🌿', '🔭', '🎬', '🌃', '🎵', '☕', '📚', '💭'];
  return icons[str.length % icons.length];
}

// ── ADMIN ROUTING ──
function showAdminPage(name) {
  // Check auth for admin pages
  if (!CURRENT_USER) {
    showToast('请先登录');
    setMode('front');
    showPage('login');
    return;
  }

  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('adminPage-' + name);
  if (target) target.classList.add('active');
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  const navItem = document.getElementById('adminNav-' + name);
  if (navItem) navItem.classList.add('active');
  
  // Load data based on page
  if (name === 'dashboard') fetchStats();
  if (name === 'articles') fetchPosts();
  if (name === 'novels') fetchNovels();
  if (name === 'comments') fetchAdminComments();
  if (name === 'settings') fetchSettings();
  if (name === 'editor' && !currentEditingFile) {
     // Clear editor for new post
     const titleEl = document.getElementById('editorTitle');
     const contentEl = document.getElementById('editorContent');
     const tagsEl = document.getElementById('editorTags');
     const catEl = document.getElementById('editorCategory');
     const excerptEl = document.getElementById('editorExcerpt');
     const slugEl = document.getElementById('editorSlug');
     if (titleEl) titleEl.value = '';
     if (contentEl) contentEl.value = '';
     if (tagsEl) tagsEl.value = '';
     if (catEl) catEl.value = '';
     if (excerptEl) excerptEl.value = '';
     if (slugEl) slugEl.value = '';
     currentEditingSha = null;
     currentEditingDate = null;
  }
}

async function fetchSettings() {
  try {
    const res = await fetch(apiUrl('/settings'));
    const data = await safeJson(res) || {};
    const rows = document.querySelectorAll('.settings-row input');
    if (rows.length >= 3) {
      rows[0].value = data.title || '';
      rows[1].value = data.description || '';
      rows[2].value = data.author || '';
    }
  } catch (err) { console.error(err); }
}

async function saveSettings() {
  const rows = document.querySelectorAll('.settings-row input');
  const settings = {
    title: rows[0].value,
    description: rows[1].value,
    author: rows[2].value
  };
  
  try {
    const res = await fetch(apiUrl('/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) showToast('设置已保存');
    else showToast('保存失败');
  } catch (err) { showToast('保存出错'); }
}

async function fetchAdminComments() {
  try {
    const res = await fetch(apiUrl('/comments'));
    const comments = await safeJson(res) || [];
    
    // Update tabs
    const pending = comments.filter(c => c.status === 'pending').length;
    const approved = comments.filter(c => c.status === 'approved').length;
    const hidden = comments.filter(c => c.status === 'hidden').length;
    
    const tabs = document.querySelectorAll('#adminPage-comments .top-tab .tab-count');
    if (tabs.length >= 4) {
      tabs[0].textContent = comments.length;
      tabs[1].textContent = pending;
      tabs[2].textContent = approved;
      tabs[3].textContent = hidden;
    }
    
    // Render list (showing all for now, or could filter)
    const container = document.querySelector('#adminPage-comments .admin-content');
    // Keep header and tabs, remove old cards
    const oldCards = container.querySelectorAll('.comment-mod-card');
    oldCards.forEach(c => c.remove());
    
    comments.forEach(c => {
      const card = document.createElement('div');
      card.className = 'comment-mod-card';
      if (c.status === 'pending') {
        card.style.borderColor = 'rgba(251,191,36,.3)';
        card.querySelector('.comment-mod-header')?.style.background = 'rgba(251,191,36,.05)';
      }
      
      const statusBadge = c.status === 'pending' ? '<span class="status-badge status-pending">⏳ 待审核</span>' :
                          c.status === 'approved' ? '<span class="status-badge status-published">已通过</span>' :
                          '<span class="status-badge status-hidden">⚠ 已隐藏</span>';
                          
      card.innerHTML = `
        <div class="comment-mod-header">
          <div class="comment-mod-user">
            <div class="comment-mod-avatar" style="background:${getRandomGradient(c.user)}">${c.user[0]}</div>
            <div>
              <div class="comment-mod-name">${c.user}</div>
              <div class="comment-mod-meta">${new Date(c.date).toLocaleString()}</div>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="comment-mod-body">
          <div class="comment-mod-target">📝 文章：${c.post}</div>
          ${window.DOMPurify ? DOMPurify.sanitize(c.content) : escapeHtml(c.content)}
        </div>
        <div class="comment-mod-actions">
          ${c.status !== 'approved' ? `<button class="btn btn-admin btn-sm" onclick="moderateComment('${c.id}', 'approved')">通过</button>` : ''}
          ${c.status !== 'hidden' ? `<button class="btn btn-sm" style="color:#f87171;border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="moderateComment('${c.id}', 'hidden')">隐藏</button>` : ''}
          <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="deleteComment('${c.id}')">删除</button>
        </div>
      `;
      container.appendChild(card);
    });
    
  } catch (err) { console.error(err); }
}

async function moderateComment(id, status) {
  try {
    await fetch(apiUrl(`/comment?id=${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchAdminComments();
    showToast('操作成功');
  } catch (err) { showToast('操作失败'); }
}

async function deleteComment(id) {
  if (!confirm('确定删除?')) return;
  try {
    await fetch(apiUrl(`/comment?id=${encodeURIComponent(id)}`), { method: 'DELETE' });
    fetchAdminComments();
    showToast('已删除');
  } catch (err) { showToast('操作失败'); }
}

async function uploadMedia(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    try {
      const res = await fetch(apiUrl('/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, filename: file.name })
      });
      const data = await safeJson(res) || {};
      if (data.success) {
        showToast('上传成功');
        const textarea = document.getElementById('editorContent');
        const url = data.url;
        const fullUrl = IS_LOCAL ? `http://localhost:3002${url}` : url;
        insertText(textarea, `\n![${file.name}](${fullUrl})\n`, '');
      } else {
        showToast('上传失败');
      }
    } catch (err) { showToast('上传出错'); }
  };
  reader.readAsDataURL(file);
}

async function createNovel() {
  const title = prompt("请输入小说标题：");
  if (!title) return;
  
  try {
    const res = await fetch(apiUrl('/novel'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, genre: '未分类' })
    });
    const data = await safeJson(res) || {};
    if (data.success) {
      showToast('创建成功');
      fetchNovels();
    } else {
      showToast('创建失败: ' + data.error);
    }
  } catch (err) { showToast('请求出错'); }
}

async function fetchNovels() {
  try {
    const res = await fetch(apiUrl('/novels'));
    const novels = await safeJson(res) || [];
    const tbody = document.querySelector('#adminPage-novels tbody');
    if (!tbody) return;
    tbody.innerHTML = novels.map(n => `
      <tr>
        <td style="font-weight:500;color:var(--admin-text)">${n.title}</td>
        <td><span class="tag tag-blue" style="font-size:11px">${n.genre || '未分类'}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${n.chapters}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">--</td>
        <td><span class="status-badge ${n.status === 'finished' ? 'status-completed' : 'status-ongoing'}">${n.status === 'finished' ? '✓ 已完结' : '● 连载中'}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${new Date(n.created || Date.now()).toLocaleDateString()}</td>
        <td><div style="display:flex;gap:.4rem">
          <button class="btn btn-admin-outline btn-sm" onclick="alert('TODO: Add Chapter UI')">新增章节</button>
          <button class="btn btn-admin-outline btn-sm">编辑</button>
        </div></td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

// ── MODE SWITCH ──
function setMode(mode) {
  if (mode === 'admin' && !CURRENT_USER) {
    showToast('需要管理员权限');
    showPage('login');
    return;
  }

  const front = document.getElementById('frontendApp');
  const admin = document.getElementById('adminApp');
  
  if (mode === 'front') {
    front.classList.remove('hidden');
    admin.classList.add('hidden');
  } else {
    front.classList.add('hidden');
    admin.classList.remove('hidden');
    // Load dashboard by default
    showAdminPage('dashboard');
  }
  window.scrollTo({ top: 0 });
}

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── CHART BAR HOVER TOOLTIPS ──
document.querySelectorAll('.chart-bar').forEach(bar => {
  bar.addEventListener('mouseenter', function(e) {
    this.style.opacity = '0.85';
  });
  bar.addEventListener('mouseleave', function() {
    this.style.opacity = '';
  });
});

// Expose functions to window for HTML onclick access
window.showPage = showPage;
window.handleLogin = handleLogin;
window.setMode = setMode;
window.showAdminPage = showAdminPage;
window.savePost = savePost;
window.editPost = editPost;
window.deletePost = deletePost;
window.uploadMedia = uploadMedia;
window.createNovel = createNovel;
window.showToast = showToast;
window.moderateComment = moderateComment;
window.deleteComment = deleteComment;
window.submitComment = submitComment;
