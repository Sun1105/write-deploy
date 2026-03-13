console.log("Main.js loaded successfully!");

const API_BASE = '/api';
let CURRENT_USER = null;
let currentEditingFile = null;
let currentEditingSha = null;
let currentEditingDate = null;
let currentNovelId = null;
let currentNovelChapterFile = null;
let currentNovelChapterSha = null;
let cachedNovelsForEditor = null;
let adminPostsCache = [];
let adminPostFilter = 'all';
let adminPostSearch = '';
let adminPostCategory = '';
let adminPostPage = 1;
let adminPostSort = 'date';
let adminPostCommentCounts = {};
let adminPostsUiBound = false;
let adminCommentsCache = [];
let adminCommentFilter = 'all';
let adminCommentsUiBound = false;
let adminUsersCache = [];
let adminUserFilter = 'all';
let adminUserSearch = '';
let adminUsersUiBound = false;

let frontUiBound = false;
let frontPostsCache = [];
let frontCommentsCache = null;
let frontHomeTab = 'all';
let frontArticlesTab = 'all';
let frontArticlesPage = 1;
let frontNovelsTab = 'all';
let frontFeaturedCache = null;
let frontLatestCache = null;
let frontNovelCache = null;
let frontChapterCtx = null;

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

function getAuthToken() {
  return localStorage.getItem('auth_token') || '';
}

function withAuthHeaders(headers) {
  const token = getAuthToken();
  if (!token) return headers || {};
  return { ...(headers || {}), Authorization: `Bearer ${token}` };
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initEditorToolbar();
  initEditorMode();
  initRegisterForm();
  renderFrontendPosts();
  trackView('page', 'home');
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
      if (CURRENT_USER && CURRENT_USER.role === 'admin') {
        setMode('admin');
      } else {
        setMode('front');
        showPage('home');
      }
    } else {
      const msg = data.message || data.error || '登录失败';
      showToast(`登录失败: ${msg}`);
    }
  } catch (err) {
    console.error(err);
    showToast('登录请求出错，请确保后台服务已启动');
  }
}

function initRegisterForm() {
  const page = document.getElementById('page-register');
  if (!page) return;
  const submit = page.querySelector('.form-submit');
  if (!submit) return;
  submit.onclick = handleRegister;
}

async function handleRegister() {
  const page = document.getElementById('page-register');
  if (!page) return;
  const inputs = Array.from(page.querySelectorAll('input'));
  const nameInput = inputs[0];
  const usernameInput = inputs[1];
  const passwordInput = inputs[2];
  const confirmInput = inputs[3];

  const name = nameInput ? nameInput.value.trim() : '';
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const confirm = confirmInput ? confirmInput.value : '';

  if (!username || !password) {
    showToast('请填写用户名和密码');
    return;
  }
  if (password.length < 6) {
    showToast('密码至少 6 位');
    return;
  }
  if (confirm && password !== confirm) {
    showToast('两次密码不一致');
    return;
  }

  try {
    const res = await fetch(apiUrl('/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name })
    });
    const data = await safeJson(res) || {};
    if (res.ok && data.success) {
      showToast('注册成功！请登录');
      showPage('login');
    } else {
      const msg = data.message || data.error || '注册失败';
      showToast(`注册失败: ${msg}`);
    }
  } catch (err) {
    console.error(err);
    showToast('注册请求出错');
  }
}

function updateNavUser() {
  if (CURRENT_USER) {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;
    const initial = CURRENT_USER.name ? String(CURRENT_USER.name).slice(0, 1) : 'U';
    const title = CURRENT_USER.role === 'admin' ? '进入后台' : '个人信息';
    actions.innerHTML = `<div class="nav-avatar" onclick="openUserCenter()" title="${escapeHtml(title)}">${escapeHtml(initial)}</div><button class="btn btn-ghost btn-sm" onclick="logout()">退出</button>`;

    const adminName = document.querySelector('.admin-user-name');
    const adminRole = document.querySelector('.admin-user-role');
    if (adminName) adminName.textContent = CURRENT_USER.name || CURRENT_USER.username || 'User';
    if (adminRole) adminRole.textContent = CURRENT_USER.role === 'admin' ? 'Administrator' : 'User';
  }
}

function updateNavGuest() {
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;
  actions.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="showPage('login')">登录</button><button class="btn btn-primary btn-sm" onclick="showPage('register')">注册</button>`;
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  CURRENT_USER = null;
  updateNavGuest();
  setMode('front');
  showPage('home');
}

function openUserCenter() {
  if (!CURRENT_USER) return showPage('login');
  if (CURRENT_USER.role === 'admin') return setMode('admin');
  showPage('profile');
}

// ── DATA FETCHING ──
async function fetchStats() {
  try {
    const res = await fetch(apiUrl('/stats'), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) return;
    adminPostCommentCounts = data && typeof data.commentCountsByPost === 'object' && data.commentCountsByPost ? data.commentCountsByPost : {};

    const viewCount = Number(data.viewCount || 0);
    const viewToday = Number(data.viewToday || 0);
    const viewYesterday = Number(data.viewYesterday || 0);
    const userCount = Number(data.userCount || 0);
    const userToday = Number(data.userToday || 0);
    const userYesterday = Number(data.userYesterday || 0);
    const commentCount = Number(data.commentCount || 0);
    const commentToday = Number(data.commentToday || 0);
    const commentYesterday = Number(data.commentYesterday || 0);
    const publishedPostCount = Number(data.publishedPostCount ?? data.postCount ?? 0);
    const publishedPostToday = Number(data.publishedPostToday || 0);
    const publishedPostYesterday = Number(data.publishedPostYesterday || 0);
    const pendingCommentCount = Number(data.pendingCommentCount || 0);
    const statsUpdatedAt = data && data.statsUpdatedAt ? String(data.statsUpdatedAt) : '';

    const viewEl = document.getElementById('statViewCount');
    const viewChangeEl = document.getElementById('statViewChange');
    const userEl = document.getElementById('statUserCount');
    const userChangeEl = document.getElementById('statUserChange');
    const commentEl = document.getElementById('statCommentCount');
    const commentChangeEl = document.getElementById('statCommentChange');
    const postEl = document.getElementById('statPostCount');
    const postChangeEl = document.getElementById('statPostChange');

    if (viewEl) viewEl.textContent = viewCount.toLocaleString();
    if (viewChangeEl) {
      const diff = viewToday - viewYesterday;
      const sign = diff >= 0 ? '+' : '';
      viewChangeEl.textContent = `今日 ${viewToday.toLocaleString()} (${sign}${diff.toLocaleString()})`;
      viewChangeEl.classList.remove('stat-up', 'stat-down');
      viewChangeEl.classList.add(diff >= 0 ? 'stat-up' : 'stat-down');
    }
    if (userEl) userEl.textContent = userCount.toLocaleString();
    if (userChangeEl) {
      const diff = userToday - userYesterday;
      const sign = diff >= 0 ? '+' : '';
      userChangeEl.textContent = `今日 ${userToday.toLocaleString()} (${sign}${diff.toLocaleString()})`;
      userChangeEl.classList.remove('stat-up', 'stat-down');
      userChangeEl.classList.add(diff >= 0 ? 'stat-up' : 'stat-down');
    }
    if (commentEl) commentEl.textContent = commentCount.toLocaleString();
    if (commentChangeEl) {
      const diff = commentToday - commentYesterday;
      const sign = diff >= 0 ? '+' : '';
      commentChangeEl.textContent = `今日 ${commentToday.toLocaleString()} (${sign}${diff.toLocaleString()})`;
      commentChangeEl.classList.remove('stat-up', 'stat-down');
      commentChangeEl.classList.add(diff >= 0 ? 'stat-up' : 'stat-down');
    }
    if (postEl) postEl.textContent = publishedPostCount.toLocaleString();
    if (postChangeEl) {
      const diff = publishedPostToday - publishedPostYesterday;
      const sign = diff >= 0 ? '+' : '';
      postChangeEl.textContent = `今日 ${publishedPostToday.toLocaleString()} (${sign}${diff.toLocaleString()})`;
      postChangeEl.classList.remove('stat-up', 'stat-down');
      postChangeEl.classList.add(diff >= 0 ? 'stat-up' : 'stat-down');
    }

    const updatedAt = document.getElementById('dashboardUpdatedAt');
    if (updatedAt) {
      const t = statsUpdatedAt ? new Date(statsUpdatedAt) : null;
      const text = t && !Number.isNaN(t.getTime())
        ? `${t.toLocaleDateString()} ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updatedAt.textContent = `最近 30 天 · 更新于 ${text}`;
    }

    updatePendingCommentBadges(pendingCommentCount);

    const bars = document.getElementById('dashboardActivityBars');
    const activity = Array.isArray(data.activity14Days) ? data.activity14Days : [];
    if (bars) {
      const max = Math.max(1, ...activity.map(d => Number(d && d.value ? d.value : 0)));
      bars.innerHTML = activity
        .map(d => {
          const v = Number(d && d.value ? d.value : 0);
          const h = Math.max(6, Math.round((v / max) * 100));
          const label = d && d.label ? String(d.label) : '';
          return `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}%"></div><div class="chart-bar-label">${escapeHtml(label)}</div></div>`;
        })
        .join('');
    }

    const topWrap = document.getElementById('dashboardTopPosts');
    const topPosts = Array.isArray(data.topPosts) ? data.topPosts : [];
    if (topWrap) {
      const colors = ['var(--admin-accent)', 'rgba(16,185,129,.6)', 'rgba(16,185,129,.4)', 'rgba(16,185,129,.3)', 'rgba(16,185,129,.2)'];
      topWrap.innerHTML = topPosts.length
        ? topPosts
            .map((p, idx) => {
              const filename = p && p.filename ? String(p.filename) : '';
              const title = p && p.title ? String(p.title) : '';
              const count = Number(p && p.count ? p.count : 0);
              const no = String(idx + 1).padStart(2, '0');
              const color = colors[idx] || 'var(--admin-accent)';
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:${color};width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8)">${escapeHtml(title)}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${count}</span>
                  <button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')">编辑</button>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px">暂无数据</div>`;
    }

    const topViewedPagesWrap = document.getElementById('dashboardTopViewedPages');
    const topViewedPages = Array.isArray(data.topViewedPages) ? data.topViewedPages : [];
    if (topViewedPagesWrap) {
      const labelOf = (id) => {
        const m = {
          home: '首页',
          articles: '文章列表',
          article: '文章详情',
          novels: '小说',
          chapter: '章节',
          about: '关于'
        };
        return Object.prototype.hasOwnProperty.call(m, id) ? m[id] : id;
      };
      topViewedPagesWrap.innerHTML = topViewedPages.length
        ? topViewedPages
            .map((p, idx) => {
              const id = p && p.id ? String(p.id) : '-';
              const count = Number(p && p.count ? p.count : 0);
              const no = String(idx + 1).padStart(2, '0');
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--admin-muted);width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8)">${escapeHtml(labelOf(id))}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${count.toLocaleString()}</span>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px">暂无数据</div>`;
    }

    const topViewedPostsWrap = document.getElementById('dashboardTopViewedPosts');
    const topViewedPosts = Array.isArray(data.topViewedPosts) ? data.topViewedPosts : [];
    if (topViewedPostsWrap) {
      topViewedPostsWrap.innerHTML = topViewedPosts.length
        ? topViewedPosts
            .map((p, idx) => {
              const filename = p && p.filename ? String(p.filename) : '';
              const title = p && p.title ? String(p.title) : filename.replace(/\.md$/i, '');
              const count = Number(p && p.count ? p.count : 0);
              const no = String(idx + 1).padStart(2, '0');
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--admin-muted);width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${count.toLocaleString()}</span>
                  <button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')">编辑</button>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px">暂无数据</div>`;
    }

    const recentPostsWrap = document.getElementById('dashboardRecentPosts');
    const recentPosts = Array.isArray(data.recentPosts) ? data.recentPosts : [];
    if (recentPostsWrap) {
      recentPostsWrap.innerHTML = recentPosts.length
        ? recentPosts
            .map(p => {
              const filename = p && p.filename ? String(p.filename) : '';
              const title = p && p.title ? String(p.title) : filename.replace(/\.md$/i, '');
              const date = p && p.date ? new Date(p.date).toLocaleString() : '-';
              const published = p && p.published !== false;
              const archived = p && p.archived === true;
              const statusText = archived ? '已归档' : (published ? '已发布' : '草稿');
              const statusColor = archived ? 'var(--admin-muted)' : (published ? 'rgba(16,185,129,.8)' : 'rgba(251,191,36,.9)');
              return `
                <div style="display:flex;align-items:center;gap:.6rem">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:.5rem">
                      <div style="font-size:13.5px;color:rgba(249,250,251,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
                      <span style="font-size:12px;color:${statusColor}">${escapeHtml(statusText)}</span>
                    </div>
                    <div style="font-size:12px;color:var(--admin-muted)">${escapeHtml(date)}</div>
                  </div>
                  <div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end">
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')">编辑</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="togglePublishPost('${filename}')">${published ? '转草稿' : '发布'}</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardToggleArchivePost('${filename}')">${archived ? '取消归档' : '归档'}</button>
                  </div>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px">暂无数据</div>`;
    }

    const recentCommentsWrap = document.getElementById('dashboardRecentComments');
    const recentComments = Array.isArray(data.recentComments) ? data.recentComments : [];
    if (recentCommentsWrap) {
      recentCommentsWrap.innerHTML = recentComments.length
        ? recentComments
            .map(c => {
              const id = c && c.id ? String(c.id) : '';
              const user = c && c.user ? String(c.user) : 'Anonymous';
              const date = c && c.date ? new Date(c.date).toLocaleString() : '-';
              const post = c && c.post ? String(c.post) : '';
              const status = c && c.status ? String(c.status) : 'pending';
              const content = String(c && c.content ? c.content : '');
              const snippet = content.length > 80 ? `${content.slice(0, 80)}…` : content;
              const statusLabel = status === 'approved' ? '已通过' : (status === 'hidden' ? '已隐藏' : '待审核');
              const statusColor = status === 'approved' ? 'rgba(16,185,129,.8)' : (status === 'hidden' ? 'var(--admin-muted)' : 'rgba(251,191,36,.9)');
              return `
                <div style="display:flex;align-items:flex-start;gap:.6rem">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:.5rem">
                      <div style="font-size:13.5px;color:rgba(249,250,251,.85);font-weight:600">${escapeHtml(user)}</div>
                      <span style="font-size:12px;color:${statusColor}">${escapeHtml(statusLabel)}</span>
                    </div>
                    <div style="font-size:12px;color:var(--admin-muted)">${escapeHtml(date)} · ${escapeHtml(post)}</div>
                    <div style="margin-top:.25rem;font-size:13px;color:rgba(249,250,251,.78);line-height:1.55">${escapeHtml(snippet)}</div>
                  </div>
                  <div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end">
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardReviewComment('${id}', '${status}')">审核</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardViewOriginal('${post}', '${id}')">原文</button>
                    ${status !== 'approved' ? `<button class="btn btn-admin btn-sm" onclick="dashboardModerateComment('${id}', 'approved', '${status}')">通过</button>` : ''}
                    ${status !== 'hidden' ? `<button class="btn btn-sm" style="color:#f87171;border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="dashboardModerateComment('${id}', 'hidden', '${status}')">隐藏</button>` : ''}
                    <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="dashboardDeleteComment('${id}', '${status}')">删除</button>
                  </div>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px">暂无数据</div>`;
    }
  } catch (err) { console.error('Failed to fetch stats', err); }
}

function dashboardEditPost(filename) {
  if (!filename) return;
  editPost(filename);
}

function dashboardViewOriginal(postId, commentId) {
  if (!postId) return;
  window.__frontFocusCommentId = commentId || '';
  window.__frontScrollToComments = true;
  setMode('front');
  showPage('article', postId);
}

function dashboardGoReviewComments(status) {
  showAdminPage('comments');
  if (status === 'pending') {
    const root = document.getElementById('adminPage-comments');
    if (!root) return;
    const tab = root.querySelector('.top-tab[data-filter="pending"]');
    if (tab) tab.click();
  }
}

function dashboardReviewComment(id, status) {
  showAdminPage('comments');
  window.__adminCommentsFocusId = id || '';
  window.__adminCommentsPostActionScroll = false;

  const preferPending = getPreferPendingReview();
  const filterToUse = (preferPending && status === 'pending') ? 'pending' : (adminCommentFilter || 'all');
  setTimeout(() => {
    const root = document.getElementById('adminPage-comments');
    if (!root) return;
    const tab = root.querySelector(`.top-tab[data-filter="${filterToUse}"]`) || root.querySelector('.top-tab[data-filter="all"]');
    if (tab) tab.click();
  }, 0);
}

function getPreferPendingReview() {
  const raw = localStorage.getItem('prefer_pending_review');
  if (raw === null) return true;
  return raw === 'true';
}

function setPreferPendingReview(value) {
  localStorage.setItem('prefer_pending_review', value ? 'true' : 'false');
  syncDashboardPreferPendingToggle();
}

function syncDashboardPreferPendingToggle() {
  const el = document.getElementById('dashboardPreferPendingToggle');
  if (!el) return;
  const on = getPreferPendingReview();
  el.classList.toggle('on', on);
}

function initDashboardPreferPendingToggle() {
  const el = document.getElementById('dashboardPreferPendingToggle');
  if (!el || el.__bound) return;
  el.__bound = true;
  syncDashboardPreferPendingToggle();
  el.addEventListener('click', () => setPreferPendingReview(!getPreferPendingReview()));
}

function dashboardViewMorePosts(filter) {
  const f = filter === 'published' || filter === 'draft' || filter === 'archived' ? filter : 'all';
  adminPostFilter = f;
  adminPostSort = 'date';
  adminPostSearch = '';
  adminPostCategory = '';
  adminPostPage = 1;
  showAdminPage('articles');
  const searchEl = document.getElementById('adminArticleSearch');
  const categoryEl = document.getElementById('adminArticleCategoryFilter');
  if (searchEl) searchEl.value = '';
  if (categoryEl) categoryEl.value = '';
  setTimeout(() => {
    const root = document.getElementById('adminPage-articles');
    if (!root) return;
    const tab = root.querySelector(`.top-tab[data-filter="${f}"]`) || root.querySelector('.top-tab[data-filter="all"]');
    if (tab) tab.click();
  }, 0);
}

function dashboardViewMoreComments(filter) {
  showAdminPage('comments');
  const f = filter === 'approved' || filter === 'hidden' || filter === 'pending' ? filter : 'all';
  setTimeout(() => {
    const root = document.getElementById('adminPage-comments');
    if (!root) return;
    const tab = root.querySelector(`.top-tab[data-filter="${f}"]`) || root.querySelector('.top-tab[data-filter="all"]');
    if (tab) tab.click();
  }, 0);
}

function dashboardViewMoreTopPosts() {
  adminPostFilter = 'published';
  adminPostSort = 'comments';
  adminPostSearch = '';
  adminPostCategory = '';
  adminPostPage = 1;
  showAdminPage('articles');
  const searchEl = document.getElementById('adminArticleSearch');
  const categoryEl = document.getElementById('adminArticleCategoryFilter');
  const sortEl = document.getElementById('adminArticleSort');
  if (searchEl) searchEl.value = '';
  if (categoryEl) categoryEl.value = '';
  if (sortEl) sortEl.value = 'comments';
  setTimeout(() => {
    const root = document.getElementById('adminPage-articles');
    if (!root) return;
    const tab = root.querySelector('.top-tab[data-filter="published"]') || root.querySelector('.top-tab[data-filter="all"]');
    if (tab) tab.click();
  }, 0);
}

async function dashboardModerateComment(id, nextStatus, currentStatus) {
  dashboardReviewComment(id, currentStatus);
  window.__adminCommentsPostActionScroll = true;
  await moderateComment(id, nextStatus);
  await fetchStats();
}

async function dashboardDeleteComment(id, currentStatus) {
  if (!confirm('确定删除该评论？')) return;
  dashboardReviewComment(id, currentStatus);
  window.__adminCommentsPostActionScroll = true;
  await deleteComment(id);
  await fetchStats();
}

async function dashboardToggleArchivePost(filename) {
  await toggleArchivePost(filename);
  await fetchStats();
}

function updatePendingCommentBadges(pending) {
  const n = Number(pending || 0);
  const badge = document.getElementById('adminNavCommentsBadge');
  if (badge) {
    badge.textContent = String(n);
    badge.style.display = n > 0 ? '' : 'none';
  }
  const label = document.getElementById('dashboardPendingCommentLabel');
  if (label) label.textContent = `审核评论 (${n})`;
}

async function fetchPosts() {
  try {
    const res = await fetch(apiUrl('/posts'), { headers: withAuthHeaders({}) });
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载文章失败: ${raw.error}` : '加载文章失败');
      return;
    }
    adminPostsCache = Array.isArray(raw) ? raw : [];
    initAdminPostsUI();
    renderAdminPosts();
  } catch (err) { console.error('Failed to fetch posts', err); }
}

function initAdminPostsUI() {
  if (adminPostsUiBound) return;
  const root = document.getElementById('adminPage-articles');
  if (!root) return;

  const searchEl = document.getElementById('adminArticleSearch');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      adminPostSearch = String(searchEl.value || '').trim();
      adminPostPage = 1;
      renderAdminPosts();
    });
  }

  const categoryEl = document.getElementById('adminArticleCategoryFilter');
  if (categoryEl) {
    categoryEl.addEventListener('change', () => {
      adminPostCategory = String(categoryEl.value || '');
      adminPostPage = 1;
      renderAdminPosts();
    });
  }

  const sortEl = document.getElementById('adminArticleSort');
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      const v = String(sortEl.value || 'date');
      adminPostSort = v === 'comments' ? 'comments' : 'date';
      adminPostPage = 1;
      renderAdminPosts();
    });
  }

  root.querySelectorAll('.top-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminPostFilter = tab.getAttribute('data-filter') || 'all';
      adminPostPage = 1;
      renderAdminPosts();
    });
  });

  adminPostsUiBound = true;
}

function renderAdminPosts() {
  const tbody = document.getElementById('articleListBody');
  if (!tbody) return;

  const all = Array.isArray(adminPostsCache) ? adminPostsCache : [];
  const counts = countPosts(all);

  const countAll = document.getElementById('adminArticleCountAll');
  const countPublished = document.getElementById('adminArticleCountPublished');
  const countDraft = document.getElementById('adminArticleCountDraft');
  const countArchived = document.getElementById('adminArticleCountArchived');
  if (countAll) countAll.textContent = String(counts.all);
  if (countPublished) countPublished.textContent = String(counts.published);
  if (countDraft) countDraft.textContent = String(counts.draft);
  if (countArchived) countArchived.textContent = String(counts.archived);

  const categoryEl = document.getElementById('adminArticleCategoryFilter');
  if (categoryEl) {
    const categories = Array.from(
      new Set(
        all
          .map(p => pickFirstText(p && p.categories))
          .map(s => String(s || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const keep = String(categoryEl.value || '');
    const options = ['<option value="">全部分类</option>'].concat(
      categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    );
    categoryEl.innerHTML = options.join('');
    if (keep) categoryEl.value = keep;
  }

  const sortEl = document.getElementById('adminArticleSort');
  if (sortEl) sortEl.value = adminPostSort === 'comments' ? 'comments' : 'date';

  let filtered = all.slice();
  if (adminPostFilter === 'published') filtered = filtered.filter(p => p && p.published && !p.archived);
  else if (adminPostFilter === 'draft') filtered = filtered.filter(p => p && p.published === false && !p.archived);
  else if (adminPostFilter === 'archived') filtered = filtered.filter(p => p && p.archived);

  if (adminPostCategory) {
    filtered = filtered.filter(p => pickFirstText(p && p.categories) === adminPostCategory);
  }

  if (adminPostSearch) {
    const q = adminPostSearch.toLowerCase();
    filtered = filtered.filter(p => String(p && p.title ? p.title : '').toLowerCase().includes(q));
  }

  const getCommentCount = (post) => {
    if (!post || !post.filename) return 0;
    const v = adminPostCommentCounts && Object.prototype.hasOwnProperty.call(adminPostCommentCounts, post.filename)
      ? adminPostCommentCounts[post.filename]
      : 0;
    return Number(v || 0);
  };

  if (adminPostSort === 'comments') {
    filtered.sort((a, b) => {
      const diff = getCommentCount(b) - getCommentCount(a);
      if (diff !== 0) return diff;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  } else {
    filtered.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  adminPostPage = Math.min(Math.max(1, adminPostPage), pageCount);
  const pageItems = filtered.slice((adminPostPage - 1) * pageSize, adminPostPage * pageSize);

  tbody.innerHTML = pageItems.map(post => {
    const archived = Boolean(post.archived);
    const published = Boolean(post.published);
    const statusClass = archived ? 'status-hidden' : (published ? 'status-published' : 'status-draft');
    const statusText = archived ? '⚠ 已归档' : (published ? '● 已发布' : '○ 草稿');
    const categoryName = pickFirstText(post.categories) || '文章';
    const dateText = post.date ? new Date(post.date).toLocaleDateString() : '-';

    const publishLabel = published ? '转为草稿' : '发布';
    const archiveLabel = archived ? '取消归档' : '归档';

    const commentCount = getCommentCount(post);
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:.75rem"><div class="article-thumb">📄</div><div style="font-size:13.5px;font-weight:500;color:var(--admin-text)">${escapeHtml(post.title || '')}</div></div></td>
        <td><span class="tag tag-gray" style="font-size:11px">${escapeHtml(categoryName)}</span></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">-</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${commentCount}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${escapeHtml(dateText)}</td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-admin-outline btn-sm" onclick="editPost('${post.filename}')">编辑</button>
            <button class="btn btn-admin-outline btn-sm" onclick="togglePublishPost('${post.filename}')">${publishLabel}</button>
            <button class="btn btn-admin-outline btn-sm" onclick="toggleArchivePost('${post.filename}')">${archiveLabel}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deletePost('${post.filename}')">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderAdminPostsPagination(pageCount);
}

function renderAdminPostsPagination(pageCount) {
  const el = document.getElementById('adminArticlePagination');
  if (!el) return;
  const btns = [];

  const addBtn = (label, page, active, disabled) => {
    const cls = ['page-btn'].concat(active ? ['active'] : []).join(' ');
    const dis = disabled ? 'disabled' : '';
    btns.push(`<button class="${cls}" ${dis} onclick="setAdminPostPage(${page})">${escapeHtml(label)}</button>`);
  };

  addBtn('←', Math.max(1, adminPostPage - 1), false, adminPostPage <= 1);
  const maxButtons = 7;
  const start = Math.max(1, Math.min(adminPostPage - 2, pageCount - (maxButtons - 1)));
  const end = Math.min(pageCount, start + (maxButtons - 1));
  for (let p = start; p <= end; p += 1) addBtn(String(p), p, p === adminPostPage, false);
  addBtn('→', Math.min(pageCount, adminPostPage + 1), false, adminPostPage >= pageCount);

  el.innerHTML = btns.join('');
}

function setAdminPostPage(page) {
  adminPostPage = Number(page) || 1;
  renderAdminPosts();
}

function countPosts(list) {
  const all = Array.isArray(list) ? list : [];
  const archived = all.filter(p => p && p.archived).length;
  const draft = all.filter(p => p && p.published === false && !p.archived).length;
  const published = all.filter(p => p && p.published && !p.archived).length;
  return { all: all.length, published, draft, archived };
}

async function togglePublishPost(filename) {
  const post = (Array.isArray(adminPostsCache) ? adminPostsCache : []).find(p => p && p.filename === filename);
  const nextPublished = !(post && post.published);
  await updatePostFlags(filename, { published: nextPublished, archived: false });
}

async function toggleArchivePost(filename) {
  const post = (Array.isArray(adminPostsCache) ? adminPostsCache : []).find(p => p && p.filename === filename);
  const nextArchived = !(post && post.archived);
  await updatePostFlags(filename, { archived: nextArchived, published: nextArchived ? false : (post ? post.published : true) });
}

async function updatePostFlags(filename, next) {
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok || !data.content) {
      showToast(data && data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }

    const parsed = splitFrontMatter(String(data.content));
    const fm = parsed.frontMatter || {};
    const updated = buildMarkdown({
      title: fm.title || filename.replace(/\.md$/i, ''),
      date: fm.date || new Date().toISOString(),
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      categories: Array.isArray(fm.categories) ? fm.categories : [],
      description: typeof fm.description === 'string' ? fm.description : '',
      published: typeof next.published === 'boolean' ? next.published : (typeof fm.published === 'boolean' ? fm.published : true),
      archived: typeof next.archived === 'boolean' ? next.archived : Boolean(fm.archived),
      body: parsed.body || ''
    });

    const put = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ filename, content: updated, sha: data.sha })
    });
    const putData = await safeJson(put) || {};
    if (!put.ok) {
      showToast(putData && putData.error ? `操作失败: ${putData.error}` : '操作失败');
      return;
    }

    showToast('操作成功');
    await fetchPosts();
    renderFrontendPosts();
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
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

function escapeJsString(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

async function editPost(filename) {
  setEditorModeValue('post');
  currentEditingFile = filename;
  currentEditingSha = null;
  currentEditingDate = null;
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`), { headers: withAuthHeaders({}) });
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

    const coverInput = document.getElementById('editorCover');
    if (coverInput) coverInput.value = typeof fm.cover === 'string' ? fm.cover : '';

    showAdminPage('editor');
  } catch (err) {
    console.error(err);
    showToast('加载文章失败');
  }
}

function newPost() {
  setEditorModeValue('post');
  currentEditingFile = null;
  currentEditingSha = null;
  currentEditingDate = null;
  const coverInput = document.getElementById('editorCover');
  if (coverInput) coverInput.value = '';
  showAdminPage('editor');
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
  const coverInput = document.getElementById('editorCover');

  const tags = parseCommaList(tagsInput ? tagsInput.value : '');
  const categories = parseCommaList(catInput ? catInput.value : '');
  const description = excerptInput ? excerptInput.value.trim() : '';
  const cover = coverInput ? coverInput.value.trim() : '';
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
    cover,
    published: publish ? true : false,
    archived: false,
    body
  });

  const isUpdate = Boolean(currentEditingFile) && filename === currentEditingFile;

  try {
    if (currentEditingFile && filename !== currentEditingFile) {
      const createRes = await fetch(apiUrl('/post'), {
        method: 'POST',
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: `Delete ${currentEditingFile} after rename` })
      }).catch(() => {});

      currentEditingFile = filename;
      currentEditingSha = null;
      currentEditingDate = date;

      showToast('保存成功');
      fetchPosts();
      renderFrontendPosts();
      if (publish) showAdminPage('articles');
      return;
    }

    const res = await fetch(isUpdate ? apiUrl(`/post?filename=${encodeURIComponent(filename)}`) : apiUrl('/post'), {
      method: isUpdate ? 'PUT' : 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
      fetchPosts();
      renderFrontendPosts();
      if (publish) showAdminPage('articles');
    } else {
      showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
    }
  } catch (err) { 
    console.error(err); 
    showToast('保存请求出错');
  }
}

function initEditorMode() {
  const modeEl = document.getElementById('editorMode');
  if (!modeEl) return;
  modeEl.onchange = () => {
    const mode = getEditorModeValue();
    syncEditorModeUI(mode);
  };
  syncEditorModeUI(getEditorModeValue());
}

function getEditorModeValue() {
  const modeEl = document.getElementById('editorMode');
  const v = modeEl ? String(modeEl.value || '') : '';
  return v === 'novel' ? 'novel' : 'post';
}

function setEditorModeValue(mode) {
  const modeEl = document.getElementById('editorMode');
  if (modeEl) modeEl.value = mode === 'novel' ? 'novel' : 'post';
  syncEditorModeUI(mode === 'novel' ? 'novel' : 'post');
}

function syncEditorModeUI(mode) {
  const postFields = document.getElementById('editorPostFields');
  const novelFields = document.getElementById('editorNovelFields');
  if (postFields) postFields.style.display = mode === 'post' ? '' : 'none';
  if (novelFields) novelFields.style.display = mode === 'novel' ? '' : 'none';

  if (mode === 'novel') {
    ensureEditorNovelsLoaded().catch(() => {});
  } else {
    currentNovelId = null;
    currentNovelChapterFile = null;
    currentNovelChapterSha = null;
  }
}

async function ensureEditorNovelsLoaded() {
  const select = document.getElementById('editorNovelId');
  if (!select) return;
  if (Array.isArray(cachedNovelsForEditor)) {
    renderEditorNovelsSelect(cachedNovelsForEditor);
    return;
  }
  const res = await fetch(apiUrl('/novels'));
  const raw = await safeJson(res);
  const novels = Array.isArray(raw) ? raw : [];
  cachedNovelsForEditor = novels;
  renderEditorNovelsSelect(novels);
}

function renderEditorNovelsSelect(novels) {
  const select = document.getElementById('editorNovelId');
  if (!select) return;
  const current = select.value;
  const options = ['<option value="">选择小说…</option>']
    .concat(novels.map(n => `<option value="${escapeHtml(String(n.id || ''))}">${escapeHtml(String(n.title || n.id || ''))}</option>`));
  select.innerHTML = options.join('');
  if (current) {
    select.value = current;
  } else if (novels.length) {
    select.value = String(novels[0].id || '');
  }
}

async function saveEditor(publish = false) {
  const mode = getEditorModeValue();
  if (mode === 'novel') {
    await saveNovelChapterFromEditor();
    return;
  }
  await savePost(publish);
}

async function saveNovelChapterFromEditor() {
  const novelEl = document.getElementById('editorNovelId');
  const fileEl = document.getElementById('editorChapterFilename');
  const contentEl = document.getElementById('editorContent');

  const novelId = novelEl ? String(novelEl.value || '').trim() : '';
  const filename = fileEl ? String(fileEl.value || '').trim() : '';
  const content = contentEl ? String(contentEl.value || '') : '';

  if (!novelId) {
    showToast('请选择小说');
    return;
  }
  if (!filename) {
    showToast('请填写章节文件名');
    return;
  }

  const isUpdate = currentNovelId === novelId && currentNovelChapterFile === filename && Boolean(currentNovelChapterSha);
  const method = isUpdate ? 'PUT' : 'POST';

  try {
    const res = await fetch(apiUrl('/novel-chapter'), {
      method,
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        novelId,
        filename,
        content,
        sha: isUpdate ? currentNovelChapterSha : undefined
      })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
      return;
    }

    currentNovelId = novelId;
    currentNovelChapterFile = data.filename || filename;
    currentNovelChapterSha = data.sha || currentNovelChapterSha;
    showToast('保存成功');
    await fetchNovels();
    await openNovelChapters(novelId);
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
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
    else if (key === 'cover') out.cover = stripQuotes(value);
    else if (key === 'tags') out.tags = parseInlineArray(value);
    else if (key === 'categories') out.categories = parseInlineArray(value);
    else if (key === 'published') out.published = value === 'true';
    else if (key === 'archived') out.archived = value === 'true';
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

function buildMarkdown({ title, date, tags, categories, description, cover, published, archived, body }) {
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
  if (cover) fmLines.push(`cover: ${escapeFrontMatter(cover)}`);
  if (typeof published === 'boolean') fmLines.push(`published: ${published ? 'true' : 'false'}`);
  if (typeof archived === 'boolean') fmLines.push(`archived: ${archived ? 'true' : 'false'}`);

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
  if (name === 'profile') {
    if (!CURRENT_USER) {
      showPage('login');
      return;
    }
    renderProfilePage();
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
  if (name === 'home' || name === 'articles' || name === 'novels' || name === 'about') {
    trackView('page', name);
  }
}

function renderProfilePage() {
  const avatar = document.getElementById('profileAvatar');
  const nameEl = document.getElementById('profileName');
  const metaEl = document.getElementById('profileMeta');
  const usernameEl = document.getElementById('profileUsername');
  const roleEl = document.getElementById('profileRole');
  const createdEl = document.getElementById('profileCreatedAt');
  if (!CURRENT_USER) return;

  const name = CURRENT_USER.name || CURRENT_USER.username || 'User';
  const username = CURRENT_USER.username || '-';
  const role = CURRENT_USER.role || 'user';
  const createdAt = CURRENT_USER.createdAt ? new Date(CURRENT_USER.createdAt).toLocaleString() : '-';
  const initial = String(name).slice(0, 1) || 'U';

  if (avatar) avatar.textContent = initial;
  if (nameEl) nameEl.textContent = String(name);
  if (metaEl) metaEl.textContent = `@${username}`;
  if (usernameEl) usernameEl.textContent = String(username);
  if (roleEl) roleEl.textContent = role === 'admin' ? '管理员' : '普通用户';
  if (createdEl) createdEl.textContent = createdAt;
}

function trackView(kind, id) {
  try {
    if (!kind || !id) return;
    const key = `viewed:${kind}:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch(apiUrl('/view'), {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ kind, id })
    }).catch(() => {});
  } catch {}
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

    trackView('chapter', `${novelId}/${chapterFile}`);
    frontChapterCtx = {
      novelId,
      chapters: Array.isArray(data.chapters) ? data.chapters.map(x => ({ filename: String(x.filename || ''), title: String(x.title || '') })) : [],
      index: Array.isArray(data.chapters) ? data.chapters.findIndex(c => String(c && c.filename ? c.filename : '') === String(chapterFile)) : -1
    };
    syncChapterNavButtons();
    updateReadingProgress();
    
  } catch (err) { showToast('章节加载失败'); }
}

async function renderFrontendNovels() {
  try {
    let novels = Array.isArray(frontNovelCache) ? frontNovelCache : null;
    if (!novels) {
      const res = await fetch(apiUrl('/novels'));
      const raw = await safeJson(res);
      if (!res.ok) {
        showToast(raw && raw.error ? `加载小说失败: ${raw.error}` : '加载小说失败');
        return;
      }
      novels = Array.isArray(raw) ? raw : [];
      frontNovelCache = novels;
    }

    const tab = String(frontNovelsTab || 'all');
    let filtered = novels.slice();
    if (tab === 'ongoing') filtered = filtered.filter(n => n && n.status !== 'finished');
    else if (tab === 'finished') filtered = filtered.filter(n => n && n.status === 'finished');
    else if (tab.startsWith('genre:')) {
      const g = tab.slice('genre:'.length);
      filtered = filtered.filter(n => n && String(n.genre || '') === g);
    }

    const listGrid = document.querySelector('#page-novels .novels-list-grid');
    if (listGrid) {
      listGrid.innerHTML = filtered.map(n => {
        const title = n && n.title ? String(n.title) : '';
        const genre = n && n.genre ? String(n.genre) : '未分类';
        const status = n && n.status ? String(n.status) : 'ongoing';
        const chapters = Number(n && n.chapters ? n.chapters : 0);
        const firstChapter = n && n.firstChapter ? String(n.firstChapter) : '';
        const id = n && n.id ? String(n.id) : '';
        const canRead = Boolean(id && firstChapter);
        const click = canRead ? `showPage('chapter', '${id}/${firstChapter}')` : "showToast('暂无章节')";
        return `
          <div class="novel-list-card" onclick="${click}">
            <div class="novel-list-cover" style="background:${getRandomGradient(title)}">
              <div class="novel-list-cover-icon">📖</div>
              <div class="novel-list-cover-overlay"><div class="novel-list-title">${escapeHtml(title)}</div></div>
            </div>
            <div class="novel-list-body">
              <div style="display:flex;align-items:center;justify-content:space-between"><span class="tag tag-blue">${escapeHtml(genre)}</span><span class="tag tag-green" style="font-size:10px">${status === 'finished' ? '已完结' : '连载中'}</span></div>
              <div class="novel-info-row">
                <span class="novel-chapters-count">${chapters} 章</span>
                ${canRead
                  ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();showPage('chapter', '${id}/${firstChapter}')">开始阅读</button>`
                  : `<button class="btn btn-outline btn-sm" disabled>暂无章节</button>`
                }
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const homeGrid = document.getElementById('homeNovelsGrid');
    if (homeGrid) {
      const picks = novels.filter(n => n && n.firstChapter).slice(0, 4);
      homeGrid.innerHTML = picks.map(n => {
        const title = n && n.title ? String(n.title) : '';
        const genre = n && n.genre ? String(n.genre) : '未分类';
        const chapters = Number(n && n.chapters ? n.chapters : 0);
        const id = n && n.id ? String(n.id) : '';
        const firstChapter = n && n.firstChapter ? String(n.firstChapter) : '';
        return `
          <div class="novel-card" onclick="showPage('chapter', '${id}/${firstChapter}')">
            <div class="novel-cover">
              <div class="novel-cover-bg">📖</div>
              <div class="novel-cover-title">${escapeHtml(title)}</div>
            </div>
            <div class="novel-body">
              <div class="novel-genre">${escapeHtml(genre)}</div>
              <div class="novel-title">${escapeHtml(title)}</div>
              <div class="novel-stats"><span>${chapters} 章</span></div>
            </div>
          </div>
        `;
      }).join('');
      const novelsStat = document.getElementById('homeStatNovels');
      if (novelsStat) novelsStat.textContent = String(novels.length);
    }
  } catch (err) { console.error(err); }
}

async function loadArticle(filename) {
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`));
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data && data.error ? `文章加载失败: ${data.error}` : '文章加载失败');
      return;
    }
    
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

    syncArticleMediaPanel();
    
    // Update meta
    const metaItems = document.querySelectorAll('.article-meta-item');
    if (metaItems[0]) metaItems[0].textContent = `📅 ${date}`;
    const wordCount = String(body || '').replace(/\s+/g, '').length;
    const minutes = Math.max(1, Math.round(wordCount / 600));
    if (metaItems[1]) metaItems[1].textContent = `⏱ ${minutes} 分钟阅读`;
    
    // Update tags
     const tagContainer = document.querySelector('.article-tags');
     tagContainer.innerHTML = tags.map(t => `<span class="tag tag-gray">${escapeHtml(t)}</span>`).join('');
     
     // Load comments
     loadComments(filename);
     trackView('post', filename);

   } catch (err) {
     console.error(err);
     showToast('文章加载失败');
   }
 }

function syncArticleMediaPanel() {
  const panel = document.querySelector('.media-panel');
  const content = document.querySelector('.article-content');
  if (!panel || !content) return;
  const imgs = Array.from(content.querySelectorAll('img'));
  const videos = Array.from(content.querySelectorAll('video'));
  const audios = Array.from(content.querySelectorAll('audio'));
  const items = []
    .concat(imgs.map((el, idx) => ({ kind: 'img', el, idx })))
    .concat(videos.map((el, idx) => ({ kind: 'video', el, idx })))
    .concat(audios.map((el, idx) => ({ kind: 'audio', el, idx })));
  if (!items.length) {
    panel.innerHTML = `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px">暂无媒体</div>`;
    return;
  }
  panel.innerHTML = items.map((it, i) => {
    if (it.kind === 'img') {
      const src = it.el && it.el.getAttribute ? String(it.el.getAttribute('src') || '') : '';
      return `<div class="media-item" data-i="${i}"><img class="media-img" src="${escapeHtml(src)}" alt=""></div>`;
    }
    if (it.kind === 'video') return `<div class="media-item" data-i="${i}"><div class="media-img">🎬</div></div>`;
    return `<div class="media-item" data-i="${i}"><div class="media-img">🎵</div></div>`;
  }).join('');
  panel.querySelectorAll('.media-item').forEach(el => {
    el.addEventListener('click', () => {
      const i = Number(el.getAttribute('data-i') || -1);
      const it = items[i];
      if (!it || !it.el) return;
      it.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      it.el.style.outline = '2px solid rgba(59,130,246,.35)';
      setTimeout(() => { it.el.style.outline = ''; }, 1400);
    });
  });
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
     const raw = await safeJson(res);
     const comments = Array.isArray(raw) ? raw : [];
     
     // Update count
     document.querySelector('.comments-title').textContent = `评论 · ${comments.length}`;
     
     // Render list
     const list = container.querySelectorAll('.comment-item');
     // Remove old items but keep input area
     Array.from(list).forEach(el => el.remove());
     
     comments.forEach(c => {
      if (c.status !== 'approved' && (!CURRENT_USER || CURRENT_USER.role !== 'admin')) return;
       
      const userName = c && c.user ? String(c.user) : 'Anonymous';
      const commentId = c && c.id ? String(c.id) : '';
       const div = document.createElement('div');
       div.className = 'comment-item';
      if (commentId) div.id = `front-comment-${commentId}`;
      const liked = commentId ? sessionStorage.getItem(`liked:${commentId}`) === '1' : false;
      const likeCount = liked ? 1 : 0;
       div.innerHTML = `
        <div class="comment-avatar-lg" style="background:${getRandomGradient(userName)}">${escapeHtml(userName.slice(0, 1) || 'A')}</div>
         <div class="comment-body">
           <div class="comment-header">
            <span class="comment-name">${escapeHtml(userName)}</span>
             <span class="comment-time">${new Date(c.date).toLocaleDateString()} ${c.status === 'pending' ? '(待审核)' : ''}</span>
           </div>
          <div class="comment-text">${window.DOMPurify ? DOMPurify.sanitize(String(c.content || '')) : escapeHtml(String(c.content || ''))}</div>
           <div class="comment-actions">
            <div class="comment-action" onclick="toggleFrontCommentLike('${escapeJsString(commentId)}', this)">👍 ${likeCount}</div>
            <div class="comment-action" onclick="replyToComment('${escapeJsString(userName)}')">回复</div>
           </div>
         </div>
       `;
       container.appendChild(div);
     });

    const focusId = window.__frontFocusCommentId ? String(window.__frontFocusCommentId) : '';
    const shouldScroll = Boolean(window.__frontScrollToComments);
    if (focusId) {
      const el = document.getElementById(`front-comment-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 2px rgba(59,130,246,.35)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1800);
      } else if (shouldScroll) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (shouldScroll) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.__frontFocusCommentId = '';
    window.__frontScrollToComments = false;
     
   } catch (err) { console.error(err); }
 }

 async function submitComment(postId) {
   const textarea = document.querySelector('.comments-section textarea');
   const content = textarea.value.trim();
   if (!content) return showToast('评论内容不能为空');
   
   try {
     const res = await fetch(apiUrl('/comments'), {
       method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载文章失败: ${raw.error}` : '加载文章失败');
      return;
    }
    frontPostsCache = Array.isArray(raw) ? raw : [];
    initFrontUI();
    renderHomeLatestWork();
    renderHomeFeatured();
    renderHomeArticles();
    renderArticlesPage();
    renderFrontendNovels();

    const articlesStat = document.getElementById('homeStatArticles');
    if (articlesStat) articlesStat.textContent = String(frontPostsCache.length);
  } catch (err) { console.error('Failed to load posts', err); }
}

function initFrontUI() {
  if (frontUiBound) return;

  const bindTabs = (containerId, getValue, setValue, onChange) => {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.querySelectorAll('.cat-tab[data-tab]').forEach(tabEl => {
      tabEl.addEventListener('click', async () => {
        const v = tabEl.getAttribute('data-tab') || 'all';
        setValue(v);
        root.querySelectorAll('.cat-tab').forEach(x => x.classList.remove('active'));
        tabEl.classList.add('active');
        await onChange();
      });
    });
  };

  bindTabs('homeCatTabs', () => frontHomeTab, (v) => { frontHomeTab = v; }, async () => {
    await renderHomeArticles();
  });

  bindTabs('articlesCatTabs', () => frontArticlesTab, (v) => { frontArticlesTab = v; frontArticlesPage = 1; }, async () => {
    await renderArticlesPage();
  });

  const novelsTabs = document.querySelector('#page-novels .cat-tabs');
  if (novelsTabs) {
    novelsTabs.querySelectorAll('.cat-tab[data-tab]').forEach(tabEl => {
      tabEl.addEventListener('click', async () => {
        const v = tabEl.getAttribute('data-tab') || 'all';
        frontNovelsTab = v;
        novelsTabs.querySelectorAll('.cat-tab').forEach(x => x.classList.remove('active'));
        tabEl.classList.add('active');
        await renderFrontendNovels();
      });
    });
  }

  window.addEventListener('scroll', () => {
    const page = document.getElementById('page-chapter');
    if (!page || !page.classList.contains('active')) return;
    updateReadingProgress();
  }, { passive: true });

  frontUiBound = true;
}

function filterPostsByFrontTab(posts, tab) {
  const list = Array.isArray(posts) ? posts : [];
  if (tab === 'essay') return list.filter(p => Array.isArray(p && p.categories) && p.categories.includes('随笔'));
  if (tab === 'article') return list.filter(p => !(Array.isArray(p && p.categories) && p.categories.includes('随笔')));
  return list;
}

async function ensureFrontComments() {
  if (Array.isArray(frontCommentsCache)) return frontCommentsCache;
  const res = await fetch(apiUrl('/comments'));
  const raw = await safeJson(res);
  if (!res.ok) return [];
  frontCommentsCache = Array.isArray(raw) ? raw : [];
  return frontCommentsCache;
}

function renderPostCard(post, badgeText) {
  const title = post && post.title ? String(post.title) : '';
  const filename = post && post.filename ? String(post.filename) : '';
  const dateText = post && post.date ? new Date(post.date).toLocaleDateString() : '';
  const cover = post && post.cover ? String(post.cover) : '';
  const excerpt = post && typeof post.description === 'string' && post.description.trim()
    ? post.description.trim()
    : '点击阅读全文...';
  const badge = badgeText || (Array.isArray(post && post.categories) && post.categories.length ? String(post.categories[0]) : '文章');

  return `
    <div class="article-card" onclick="showPage('article', '${escapeJsString(filename)}')">
      <div class="card-cover" style="background:${getRandomGradient(title)}">
        <div class="card-category-badge">${escapeHtml(badge)}</div>
        ${cover ? `<img class="card-cover-img" src="${escapeHtml(cover)}" alt="">` : escapeHtml(getRandomIcon(title))}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <p class="card-excerpt">${escapeHtml(excerpt)}</p>
        <div class="card-footer">
          <div class="card-meta"><span>${escapeHtml(dateText)}</span></div>
        </div>
      </div>
    </div>
  `;
}

async function renderHomeArticles() {
  const grid = document.getElementById('homeArticlesGrid');
  if (!grid) return;
  if (frontHomeTab === 'comment') {
    grid.innerHTML = `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px">加载中...</div>`;
    const comments = await ensureFrontComments();
    const items = comments.slice(0, 6);
    grid.innerHTML = items.map(c => {
      const postId = c && c.post ? String(c.post) : '';
      const id = c && c.id ? String(c.id) : '';
      const user = c && c.user ? String(c.user) : 'Anonymous';
      const date = c && c.date ? new Date(c.date).toLocaleDateString() : '';
      const content = c && c.content ? String(c.content) : '';
      const snippet = content.length > 90 ? `${content.slice(0, 90)}…` : content;
      return `
        <div class="article-card" onclick="frontOpenComment('${escapeJsString(postId)}','${escapeJsString(id)}')">
          <div class="card-cover" style="background:${getRandomGradient(user)}">
            <div class="card-category-badge">评论</div>
            💬
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(user)}</h3>
            <p class="card-excerpt">${escapeHtml(snippet)}</p>
            <div class="card-footer">
              <div class="card-meta"><span>${escapeHtml(date)}</span></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  const filtered = filterPostsByFrontTab(frontPostsCache, frontHomeTab);
  grid.innerHTML = filtered.slice(0, 6).map(p => renderPostCard(p)).join('') || `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px">暂无数据</div>`;
}

async function renderArticlesPage() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;
  const pager = document.getElementById('frontArticlesPagination');
  if (frontArticlesTab === 'comment') {
    if (pager) pager.innerHTML = '';
    grid.innerHTML = `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px">加载中...</div>`;
    const comments = await ensureFrontComments();
    const items = comments.slice(0, 24);
    grid.innerHTML = items.map(c => {
      const postId = c && c.post ? String(c.post) : '';
      const id = c && c.id ? String(c.id) : '';
      const user = c && c.user ? String(c.user) : 'Anonymous';
      const date = c && c.date ? new Date(c.date).toLocaleDateString() : '';
      const content = c && c.content ? String(c.content) : '';
      const snippet = content.length > 120 ? `${content.slice(0, 120)}…` : content;
      return `
        <div class="article-card" onclick="frontOpenComment('${escapeJsString(postId)}','${escapeJsString(id)}')">
          <div class="card-cover" style="background:${getRandomGradient(user)}">
            <div class="card-category-badge">评论</div>
            💬
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(user)}</h3>
            <p class="card-excerpt">${escapeHtml(snippet)}</p>
            <div class="card-footer">
              <div class="card-meta"><span>${escapeHtml(date)}</span></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  const filtered = filterPostsByFrontTab(frontPostsCache, frontArticlesTab);
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  frontArticlesPage = Math.min(Math.max(1, frontArticlesPage), pageCount);
  const pageItems = filtered.slice((frontArticlesPage - 1) * pageSize, frontArticlesPage * pageSize);
  grid.innerHTML = pageItems.map(p => renderPostCard(p)).join('') || `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px">暂无数据</div>`;

  if (pager) {
    const btns = [];
    const add = (label, page, active, disabled) => {
      const cls = ['page-btn'].concat(active ? ['active'] : []).join(' ');
      const dis = disabled ? 'disabled' : '';
      const style = active ? 'style="background:var(--accent);border-color:var(--accent);color:white"' : 'style="border-color:var(--border-2);color:var(--ink-3)"';
      btns.push(`<button class="${cls}" ${style} ${dis} onclick="setFrontArticlesPage(${page})">${escapeHtml(label)}</button>`);
    };
    add('←', Math.max(1, frontArticlesPage - 1), false, frontArticlesPage <= 1);
    const maxButtons = 7;
    const start = Math.max(1, Math.min(frontArticlesPage - 2, pageCount - (maxButtons - 1)));
    const end = Math.min(pageCount, start + (maxButtons - 1));
    for (let p = start; p <= end; p += 1) add(String(p), p, p === frontArticlesPage, false);
    add('→', Math.min(pageCount, frontArticlesPage + 1), false, frontArticlesPage >= pageCount);
    pager.innerHTML = btns.join('');
  }
}

function setFrontArticlesPage(page) {
  frontArticlesPage = Number(page) || 1;
  renderArticlesPage();
}

function renderHomeLatestWork() {
  const card = document.getElementById('homeLatestWorkCard');
  if (!card) return;
  const list = Array.isArray(frontPostsCache) ? frontPostsCache.slice() : [];
  list.sort((a, b) => new Date(b && b.date ? b.date : 0).getTime() - new Date(a && a.date ? a.date : 0).getTime());
  const latest = list[0] || null;
  frontLatestCache = latest;
  const titleEl = document.getElementById('homeLatestWorkTitle');
  const metaEl = document.getElementById('homeLatestWorkMeta');
  if (titleEl) titleEl.textContent = latest ? `《${latest.title || latest.filename || ''}》` : '--';
  if (metaEl) {
    const date = latest && latest.date ? new Date(latest.date).toLocaleDateString() : '--';
    const cat = latest && Array.isArray(latest.categories) && latest.categories.length ? String(latest.categories[0]) : '文章';
    metaEl.textContent = `${cat} · ${date}`;
  }
  card.onclick = latest && latest.filename ? () => showPage('article', latest.filename) : null;
}

async function renderHomeFeatured() {
  const wrap = document.getElementById('homeFeatured');
  if (!wrap) return;
  if (!frontFeaturedCache) {
    try {
      const res = await fetch(apiUrl('/featured'));
      const raw = await safeJson(res);
      if (res.ok && raw) frontFeaturedCache = raw;
    } catch {
    }
  }
  const data = frontFeaturedCache || {};
  const featured = data && data.featured ? data.featured : null;
  const titleEl = document.getElementById('homeFeaturedTitle');
  const excerptEl = document.getElementById('homeFeaturedExcerpt');
  const metaEl = document.getElementById('homeFeaturedMeta');
  const coverEl = document.getElementById('homeFeaturedCover');
  if (!featured) {
    if (titleEl) titleEl.textContent = '暂无推荐';
    if (excerptEl) excerptEl.textContent = '暂无可展示的已发布文章。';
    if (metaEl) metaEl.innerHTML = '';
    wrap.onclick = null;
  } else {
    if (titleEl) titleEl.textContent = featured.title || featured.filename || '';
    if (excerptEl) excerptEl.textContent = featured.description || '点击阅读全文...';
    if (metaEl) {
      const date = featured.date ? new Date(featured.date).toLocaleDateString() : '';
      const mins = Number(featured.minutes || 0);
      const views = Number(featured.views || 0);
      metaEl.innerHTML = `<span>${escapeHtml(date)}</span><span>·</span><span>${escapeHtml(String(Math.max(1, mins)))} 分钟阅读</span><span>·</span><span>${escapeHtml(views.toLocaleString())} 次阅读</span>`;
    }
    if (coverEl) {
      const cover = featured.cover ? String(featured.cover) : '';
      coverEl.innerHTML = cover ? `<img class="card-cover-img" src="${escapeHtml(cover)}" alt="">` : '📖';
    }
    wrap.onclick = () => showPage('article', featured.filename);
  }
  const readersEl = document.getElementById('homeStatReaders');
  if (readersEl) {
    const totalViews = Number(data && data.totalViews ? data.totalViews : 0);
    readersEl.textContent = totalViews ? (totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : String(totalViews)) : '--';
  }
}

function frontOpenComment(postId, commentId) {
  if (!postId) return;
  window.__frontFocusCommentId = commentId || '';
  window.__frontScrollToComments = true;
  showPage('article', postId);
}

function toggleFrontCommentLike(commentId, el) {
  if (!commentId || !el) return;
  const key = `liked:${commentId}`;
  const liked = sessionStorage.getItem(key) === '1';
  sessionStorage.setItem(key, liked ? '0' : '1');
  el.textContent = `👍 ${liked ? 0 : 1}`;
}

function replyToComment(userName) {
  const container = document.querySelector('.comments-section');
  if (!container) return;
  const textarea = container.querySelector('textarea');
  if (!textarea) return;
  if (!CURRENT_USER) return showPage('login');
  const name = String(userName || '').trim();
  const prefix = name ? `@${name} ` : '';
  if (!textarea.value.includes(prefix)) textarea.value = `${prefix}${textarea.value || ''}`.trimStart();
  textarea.focus();
}

function syncChapterNavButtons() {
  const prevEnabled = frontChapterCtx && typeof frontChapterCtx.index === 'number' && frontChapterCtx.index > 0;
  const nextEnabled = frontChapterCtx && Array.isArray(frontChapterCtx.chapters) && typeof frontChapterCtx.index === 'number' && frontChapterCtx.index >= 0 && frontChapterCtx.index < frontChapterCtx.chapters.length - 1;
  document.querySelectorAll('#page-chapter .chapter-nav-btns .btn, #page-chapter .chapter-nav-footer .btn').forEach((btn, idx, all) => {
    const isPrev = btn.textContent.includes('上一章');
    const enabled = isPrev ? prevEnabled : nextEnabled;
    btn.disabled = !enabled;
  });
}

function goPrevChapter() {
  if (!frontChapterCtx || !Array.isArray(frontChapterCtx.chapters) || frontChapterCtx.index <= 0) return;
  const prev = frontChapterCtx.chapters[frontChapterCtx.index - 1];
  if (!prev || !prev.filename) return;
  showPage('chapter', `${frontChapterCtx.novelId}/${prev.filename}`);
}

function goNextChapter() {
  if (!frontChapterCtx || !Array.isArray(frontChapterCtx.chapters) || frontChapterCtx.index < 0 || frontChapterCtx.index >= frontChapterCtx.chapters.length - 1) return;
  const next = frontChapterCtx.chapters[frontChapterCtx.index + 1];
  if (!next || !next.filename) return;
  showPage('chapter', `${frontChapterCtx.novelId}/${next.filename}`);
}

function updateReadingProgress() {
  const bar = document.querySelector('.reading-progress-bar');
  const wrap = document.querySelector('.chapter-content-wrap');
  if (!bar || !wrap) return;
  const total = wrap.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  const progress = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;
  bar.style.width = `${Math.round(progress * 100)}%`;
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
  if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
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
  if (name === 'dashboard') {
    initDashboardPreferPendingToggle();
    fetchStats();
  }
  if (name === 'articles') fetchPosts();
  if (name === 'novels') fetchNovels();
  if (name === 'comments') fetchAdminComments();
  if (name === 'users') fetchAdminUsers();
  if (name === 'settings') fetchSettings();
  if (name === 'editor') {
    const mode = getEditorModeValue();
    syncEditorModeUI(mode);

    if (mode === 'post' && !currentEditingFile) {
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

    if (mode === 'novel') {
      const novelEl = document.getElementById('editorNovelId');
      const chapterEl = document.getElementById('editorChapterFilename');
      if (novelEl && !novelEl.value && Array.isArray(cachedNovelsForEditor) && cachedNovelsForEditor.length) {
        novelEl.value = String(cachedNovelsForEditor[0].id || '');
      }
      if (chapterEl && !chapterEl.value) chapterEl.value = '';
    }
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
    const toggle = document.querySelector('.settings-toggle');
    if (toggle) {
      const on = data.allowRegister !== false;
      toggle.classList.toggle('on', on);
    }
  } catch (err) { console.error(err); }
}

async function saveSettings() {
  const rows = document.querySelectorAll('.settings-row input');
  const toggle = document.querySelector('.settings-toggle');
  const settings = {
    title: rows[0].value,
    description: rows[1].value,
    author: rows[2].value,
    allowRegister: toggle ? toggle.classList.contains('on') : true
  };
  
  try {
    const res = await fetch(apiUrl('/settings'), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings)
    });
    if (res.ok) showToast('设置已保存');
    else showToast('保存失败');
  } catch (err) { showToast('保存出错'); }
}

async function fetchAdminComments() {
  try {
    const res = await fetch(apiUrl('/comments'), { headers: withAuthHeaders({}) });
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载评论失败: ${raw.error}` : '加载评论失败');
      return;
    }
    adminCommentsCache = Array.isArray(raw) ? raw : [];
    initAdminCommentsUI();
    renderAdminComments();
    
  } catch (err) { console.error(err); }
}

function initAdminCommentsUI() {
  if (adminCommentsUiBound) return;
  const root = document.getElementById('adminPage-comments');
  if (!root) return;

  root.querySelectorAll('.top-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminCommentFilter = tab.getAttribute('data-filter') || 'all';
      renderAdminComments();
    });
  });

  adminCommentsUiBound = true;
}

function renderAdminComments() {
  const root = document.getElementById('adminPage-comments');
  if (!root) return;
  const container = root.querySelector('.admin-content');
  if (!container) return;

  const list = Array.isArray(adminCommentsCache) ? adminCommentsCache : [];
  const pending = list.filter(c => c && c.status === 'pending').length;
  const approved = list.filter(c => c && c.status === 'approved').length;
  const hidden = list.filter(c => c && c.status === 'hidden').length;

  const countAll = document.getElementById('adminCommentCountAll');
  const countPending = document.getElementById('adminCommentCountPending');
  const countApproved = document.getElementById('adminCommentCountApproved');
  const countHidden = document.getElementById('adminCommentCountHidden');
  if (countAll) countAll.textContent = String(list.length);
  if (countPending) countPending.textContent = String(pending);
  if (countApproved) countApproved.textContent = String(approved);
  if (countHidden) countHidden.textContent = String(hidden);

  const summary = document.getElementById('adminCommentsSummary');
  if (summary) summary.textContent = `${pending} 条待审核`;
  updatePendingCommentBadges(pending);

  const oldCards = container.querySelectorAll('.comment-mod-card');
  oldCards.forEach(c => c.remove());

  let filtered = list.slice();
  if (adminCommentFilter !== 'all') filtered = filtered.filter(c => c && c.status === adminCommentFilter);

  filtered.forEach(c => {
    const card = document.createElement('div');
    card.className = 'comment-mod-card';
    card.id = `comment-${c && c.id ? String(c.id) : ''}`;

    const userName = c && c.user ? String(c.user) : 'Anonymous';
    const statusBadge = c.status === 'pending' ? '<span class="status-badge status-pending">⏳ 待审核</span>' :
                        c.status === 'approved' ? '<span class="status-badge status-published">已通过</span>' :
                        '<span class="status-badge status-hidden">⚠ 已隐藏</span>';

    card.innerHTML = `
      <div class="comment-mod-header">
        <div class="comment-mod-user">
          <div class="comment-mod-avatar" style="background:${getRandomGradient(userName)}">${escapeHtml(userName.slice(0, 1) || 'U')}</div>
          <div>
            <div class="comment-mod-name">${escapeHtml(userName)}</div>
            <div class="comment-mod-meta">${new Date(c.date).toLocaleString()}</div>
          </div>
        </div>
        ${statusBadge}
      </div>
      <div class="comment-mod-body">
        <div class="comment-mod-target">📝 文章：${escapeHtml(String(c.post || ''))}</div>
        ${window.DOMPurify ? DOMPurify.sanitize(String(c.content || '')) : escapeHtml(String(c.content || ''))}
      </div>
      <div class="comment-mod-actions">
        ${c.status !== 'approved' ? `<button class="btn btn-admin btn-sm" onclick="moderateComment('${c.id}', 'approved')">通过</button>` : ''}
        ${c.status !== 'hidden' ? `<button class="btn btn-sm" style="color:#f87171;border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="moderateComment('${c.id}', 'hidden')">隐藏</button>` : ''}
        <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="deleteComment('${c.id}')">删除</button>
      </div>
    `;

    if (c.status === 'pending') {
      card.style.borderColor = 'rgba(251,191,36,.3)';
      const header = card.querySelector('.comment-mod-header');
      if (header) header.style.background = 'rgba(251,191,36,.05)';
    }
    container.appendChild(card);
  });

  const focusId = window.__adminCommentsFocusId ? String(window.__adminCommentsFocusId) : '';
  if (focusId) {
    const el = document.getElementById(`comment-${focusId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = '0 0 0 2px rgba(59,130,246,.35)';
      setTimeout(() => { el.style.boxShadow = ''; }, 1800);
    } else if (window.__adminCommentsPostActionScroll) {
      const first = container.querySelector('.comment-mod-card');
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first.style.boxShadow = '0 0 0 2px rgba(251,191,36,.25)';
        setTimeout(() => { first.style.boxShadow = ''; }, 1200);
      }
    }
    window.__adminCommentsFocusId = '';
  } else if (window.__adminCommentsPostActionScroll) {
    const first = container.querySelector('.comment-mod-card');
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.style.boxShadow = '0 0 0 2px rgba(251,191,36,.25)';
      setTimeout(() => { first.style.boxShadow = ''; }, 1200);
    }
  }
  window.__adminCommentsPostActionScroll = false;
}

async function fetchAdminUsers() {
  try {
    const res = await fetch(apiUrl('/users'), { headers: withAuthHeaders({}) });
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载用户失败: ${raw.error}` : '加载用户失败');
      return;
    }
    adminUsersCache = Array.isArray(raw) ? raw : [];
    initAdminUsersUI();
    renderAdminUsers();
  } catch (err) {
    console.error(err);
    showToast('加载用户失败');
  }
}

function initAdminUsersUI() {
  if (adminUsersUiBound) return;
  const root = document.getElementById('adminPage-users');
  if (!root) return;

  const search = document.getElementById('adminUserSearch');
  if (search) {
    search.addEventListener('input', () => {
      adminUserSearch = String(search.value || '').trim();
      renderAdminUsers();
    });
  }

  root.querySelectorAll('.top-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminUserFilter = tab.getAttribute('data-filter') || 'all';
      renderAdminUsers();
    });
  });

  adminUsersUiBound = true;
}

function renderAdminUsers() {
  const tbody = document.getElementById('adminUserTableBody');
  if (!tbody) return;

  const all = Array.isArray(adminUsersCache) ? adminUsersCache : [];
  const activeCount = all.filter(u => !u || (u.status || 'active') !== 'banned').length;
  const bannedCount = all.filter(u => u && (u.status || 'active') === 'banned').length;

  const cAll = document.getElementById('adminUserCountAll');
  const cActive = document.getElementById('adminUserCountActive');
  const cBanned = document.getElementById('adminUserCountBanned');
  if (cAll) cAll.textContent = String(all.length);
  if (cActive) cActive.textContent = String(activeCount);
  if (cBanned) cBanned.textContent = String(bannedCount);

  let filtered = all.slice();
  if (adminUserFilter === 'active') filtered = filtered.filter(u => !u || (u.status || 'active') !== 'banned');
  else if (adminUserFilter === 'banned') filtered = filtered.filter(u => u && (u.status || 'active') === 'banned');

  if (adminUserSearch) {
    const q = adminUserSearch.toLowerCase();
    filtered = filtered.filter(u => {
      const name = u && u.name ? String(u.name) : '';
      const username = u && u.username ? String(u.username) : '';
      return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
    });
  }

  tbody.innerHTML = filtered.map(u => {
    const name = u && u.name ? String(u.name) : (u && u.username ? String(u.username) : 'User');
    const username = u && u.username ? String(u.username) : '';
    const role = u && u.role ? String(u.role) : 'user';
    const status = u && u.status ? String(u.status) : 'active';
    const created = u && u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
    const id = u && u.id ? String(u.id) : username;

    const roleBadge = role === 'admin'
      ? '<span class="status-badge status-published">管理员</span>'
      : '<span class="status-badge status-draft">用户</span>';

    const statusBadge = status === 'banned'
      ? '<span class="status-badge status-hidden">已封禁</span>'
      : '<span class="status-badge status-published">正常</span>';

    const toggleTo = role === 'admin' ? 'user' : 'admin';
    const toggleLabel = role === 'admin' ? '降为用户' : '设为管理员';

    const banTo = status === 'banned' ? 'active' : 'banned';
    const banLabel = status === 'banned' ? '解封' : '封禁';

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:.75rem">
            <div class="comment-mod-avatar" style="background:${getRandomGradient(username || name)}">${escapeHtml((name || 'U').slice(0, 1))}</div>
            <div>
              <div style="font-size:13.5px;font-weight:600;color:var(--admin-text)">${escapeHtml(name)}</div>
              <div style="font-size:12px;color:var(--admin-muted)">@${escapeHtml(username || '-')}</div>
            </div>
          </div>
        </td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${escapeHtml(username || '-')}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">-</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${escapeHtml(created)}</td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-admin-outline btn-sm" onclick="setUserRole('${id}', '${toggleTo}')">${toggleLabel}</button>
            <button class="btn btn-admin-outline btn-sm" onclick="setUserStatus('${id}', '${banTo}')">${banLabel}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deleteUser('${id}')">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function setUserRole(id, role) {
  try {
    const res = await fetch(apiUrl(`/user?id=${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }
    await fetchAdminUsers();
    showToast('操作成功');
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
}

async function setUserStatus(id, status) {
  try {
    const res = await fetch(apiUrl(`/user?id=${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }
    await fetchAdminUsers();
    showToast('操作成功');
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
}

async function deleteUser(id) {
  if (!confirm('确定删除该用户？')) return;
  try {
    const res = await fetch(apiUrl(`/user?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
      return;
    }
    await fetchAdminUsers();
    showToast('已删除');
  } catch (err) {
    console.error(err);
    showToast('删除失败');
  }
}

async function moderateComment(id, status) {
  try {
    const res = await fetch(apiUrl(`/comment?id=${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }
    await fetchAdminComments();
    showToast('操作成功');
  } catch (err) { showToast('操作失败'); }
}

async function deleteComment(id) {
  try {
    const res = await fetch(apiUrl(`/comment?id=${encodeURIComponent(id)}`), { method: 'DELETE', headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
      return;
    }
    await fetchAdminComments();
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
        headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ image: base64, filename: file.name })
      });
      const data = await safeJson(res) || {};
      if (data.success) {
        showToast('上传成功');
        const textarea = document.getElementById('editorContent');
        const url = data.url;
        const fullUrl = url;
        const isImage = String(file.type || '').startsWith('image/');
        const isVideo = String(file.type || '').startsWith('video/');
        const isAudio = String(file.type || '').startsWith('audio/');
        if (isImage) insertText(textarea, `\n![${file.name}](${fullUrl})\n`, '');
        else if (isVideo) insertText(textarea, `\n<video controls src="${fullUrl}"></video>\n`, '');
        else if (isAudio) insertText(textarea, `\n<audio controls src="${fullUrl}"></audio>\n`, '');
        else insertText(textarea, `\n[${file.name}](${fullUrl})\n`, '');

        if (isImage) {
          const coverInput = document.getElementById('editorCover');
          if (coverInput && !String(coverInput.value || '').trim()) coverInput.value = fullUrl;
        }
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
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, genre: '未分类' })
    });
    const data = await safeJson(res) || {};
    if (data.success) {
      showToast('创建成功');
      cachedNovelsForEditor = null;
      fetchNovels();
    } else {
      showToast('创建失败: ' + data.error);
    }
  } catch (err) { showToast('请求出错'); }
}

async function fetchNovels() {
  try {
    const res = await fetch(apiUrl('/novels'));
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载小说失败: ${raw.error}` : '加载小说失败');
      return;
    }
    const novels = Array.isArray(raw) ? raw : [];
    cachedNovelsForEditor = novels;
    const tbody = document.getElementById('novelListBody');
    if (!tbody) return;
    tbody.innerHTML = novels.map(n => `
      <tr>
        <td style="font-weight:500;color:var(--admin-text)">${n.title}</td>
        <td><span class="tag tag-blue" style="font-size:11px">${n.genre || '未分类'}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${n.chapters}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">--</td>
        <td><span class="status-badge ${n.status === 'finished' ? 'status-completed' : 'status-ongoing'}">${n.status === 'finished' ? '✓ 已完结' : '● 连载中'}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${new Date(n.created || Date.now()).toLocaleDateString()}</td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-admin-outline btn-sm" onclick="openNovelChapters('${n.id}')">管理章节</button>
            <button class="btn btn-admin-outline btn-sm" onclick="editNovelMeta('${n.id}')">编辑</button>
            <button class="btn btn-admin-outline btn-sm" onclick="toggleNovelStatus('${n.id}', '${n.status === 'finished' ? 'ongoing' : 'finished'}')">${n.status === 'finished' ? '设为连载' : '设为完结'}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deleteNovel('${n.id}')">删除</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function editNovelMeta(novelId) {
  try {
    const res = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `加载失败: ${data.error}` : '加载失败');
      return;
    }

    const meta = data.meta || {};
    const title = prompt('小说标题：', meta.title || '');
    if (title == null) return;
    const genre = prompt('类型：', meta.genre || '未分类');
    if (genre == null) return;
    const status = prompt('状态（ongoing/finished）：', meta.status || 'ongoing');
    if (status == null) return;

    const put = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, genre, status })
    });
    const putData = await safeJson(put) || {};
    if (!put.ok) {
      showToast(putData.error ? `保存失败: ${putData.error}` : '保存失败');
      return;
    }
    showToast('保存成功');
    cachedNovelsForEditor = null;
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast('保存失败');
  }
}

async function toggleNovelStatus(novelId, nextStatus) {
  try {
    const put = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await safeJson(put) || {};
    if (!put.ok) {
      showToast(data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }
    showToast('操作成功');
    cachedNovelsForEditor = null;
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
}

async function deleteNovel(novelId) {
  if (!confirm('确定删除该小说及其全部章节？')) return;
  try {
    const del = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), {
      method: 'DELETE',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const data = await safeJson(del) || {};
    if (!del.ok) {
      showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
      return;
    }
    showToast('已删除');
    cachedNovelsForEditor = null;
    const card = document.getElementById('novelChaptersCard');
    if (card) card.style.display = 'none';
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast('删除失败');
  }
}

async function openNovelChapters(novelId) {
  currentNovelId = novelId;
  currentNovelChapterFile = null;
  currentNovelChapterSha = null;

  const card = document.getElementById('novelChaptersCard');
  if (!card) {
    showToast('章节面板缺失');
    return;
  }
  card.style.display = 'block';

  await refreshNovelChaptersList();
}

async function refreshNovelChaptersList() {
  if (!currentNovelId) return;
  const listEl = document.getElementById('novelChaptersList');
  const titleEl = document.getElementById('novelChaptersTitle');
  if (!listEl || !titleEl) return;

  const res = await fetch(apiUrl(`/novel-chapter?novelId=${encodeURIComponent(currentNovelId)}`));
  const data = await safeJson(res) || {};
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  titleEl.textContent = data.novelTitle ? `章节管理 · ${data.novelTitle}` : '章节管理';

  listEl.innerHTML = chapters.length
    ? chapters.map(c => `<div class="chapter-toc-item" onclick="loadNovelChapterForEdit('${currentNovelId}','${c.filename}')">${escapeHtml(c.title || c.filename)}</div>`).join('')
    : `<div style="color:var(--admin-muted);font-size:13px;padding:.5rem 0">暂无章节</div>`;

  const filenameInput = document.getElementById('novelChapterFilename');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = '';
  if (contentInput) contentInput.value = '';
}

async function newNovelChapter() {
  if (!currentNovelId) return;
  const filename = prompt('请输入章节文件名（例如：001-第一章.md）');
  if (!filename) return;
  const normalized = filename.endsWith('.md') ? filename : `${filename}.md`;

  currentNovelChapterFile = normalized;
  currentNovelChapterSha = null;

  const filenameInput = document.getElementById('novelChapterFilename');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = normalized;
  if (contentInput) contentInput.value = '';
}

async function loadNovelChapterForEdit(novelId, chapterFile) {
  currentNovelId = novelId;
  currentNovelChapterFile = chapterFile;
  currentNovelChapterSha = null;

  const filenameInput = document.getElementById('novelChapterFilename');
  if (filenameInput) filenameInput.value = chapterFile;

  const res = await fetch(apiUrl(`/novel-chapter?novelId=${encodeURIComponent(novelId)}&chapterFile=${encodeURIComponent(chapterFile)}`));
  const data = await safeJson(res) || {};
  const contentInput = document.getElementById('novelChapterContent');
  if (contentInput) contentInput.value = String(data.content || '');
  currentNovelChapterSha = data.sha || null;
}

async function saveNovelChapter() {
  if (!currentNovelId) return;
  const filenameInput = document.getElementById('novelChapterFilename');
  const contentInput = document.getElementById('novelChapterContent');
  const filename = filenameInput ? filenameInput.value.trim() : '';
  const content = contentInput ? contentInput.value : '';
  if (!filename) {
    showToast('请填写章节文件名');
    return;
  }

  const isCreate = !currentNovelChapterSha;
  const method = isCreate ? 'POST' : 'PUT';
  const res = await fetch(apiUrl('/novel-chapter'), {
    method,
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      novelId: currentNovelId,
      filename,
      content,
      sha: currentNovelChapterSha || undefined
    })
  });
  const data = await safeJson(res) || {};
  if (!res.ok) {
    showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
    return;
  }

  currentNovelChapterFile = data.filename || filename;
  currentNovelChapterSha = data.sha || currentNovelChapterSha;
  showToast('已保存');
  await refreshNovelChaptersList();
}

async function deleteNovelChapter() {
  if (!currentNovelId || !currentNovelChapterFile) {
    showToast('请先选择章节');
    return;
  }
  if (!confirm('确定删除该章节？')) return;

  const res = await fetch(apiUrl('/novel-chapter'), {
    method: 'DELETE',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      novelId: currentNovelId,
      filename: currentNovelChapterFile,
      sha: currentNovelChapterSha || undefined
    })
  });
  const data = await safeJson(res) || {};
  if (!res.ok) {
    showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
    return;
  }

  currentNovelChapterFile = null;
  currentNovelChapterSha = null;
  const filenameInput = document.getElementById('novelChapterFilename');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = '';
  if (contentInput) contentInput.value = '';
  showToast('已删除');
  await refreshNovelChaptersList();
}

// ── MODE SWITCH ──
function setMode(mode) {
  if (mode === 'admin' && (!CURRENT_USER || CURRENT_USER.role !== 'admin')) {
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
document.addEventListener('mouseover', (e) => {
  const bar = e.target && e.target.closest ? e.target.closest('.chart-bar') : null;
  if (!bar) return;
  bar.style.opacity = '0.85';
});

document.addEventListener('mouseout', (e) => {
  const bar = e.target && e.target.closest ? e.target.closest('.chart-bar') : null;
  if (!bar) return;
  bar.style.opacity = '';
});

// Expose functions to window for HTML onclick access
window.showPage = showPage;
window.setFrontArticlesPage = setFrontArticlesPage;
window.frontOpenComment = frontOpenComment;
window.toggleFrontCommentLike = toggleFrontCommentLike;
window.replyToComment = replyToComment;
window.goPrevChapter = goPrevChapter;
window.goNextChapter = goNextChapter;
window.logout = logout;
window.openUserCenter = openUserCenter;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.setMode = setMode;
window.showAdminPage = showAdminPage;
window.saveEditor = saveEditor;
window.savePost = savePost;
window.editPost = editPost;
window.deletePost = deletePost;
window.setAdminPostPage = setAdminPostPage;
window.togglePublishPost = togglePublishPost;
window.toggleArchivePost = toggleArchivePost;
window.newPost = newPost;
window.uploadMedia = uploadMedia;
window.createNovel = createNovel;
window.editNovelMeta = editNovelMeta;
window.toggleNovelStatus = toggleNovelStatus;
window.deleteNovel = deleteNovel;
window.openNovelChapters = openNovelChapters;
window.newNovelChapter = newNovelChapter;
window.saveNovelChapter = saveNovelChapter;
window.deleteNovelChapter = deleteNovelChapter;
window.loadNovelChapterForEdit = loadNovelChapterForEdit;
window.showToast = showToast;
window.moderateComment = moderateComment;
window.deleteComment = deleteComment;
window.submitComment = submitComment;
window.fetchAdminUsers = fetchAdminUsers;
window.setUserRole = setUserRole;
window.setUserStatus = setUserStatus;
window.deleteUser = deleteUser;
window.dashboardEditPost = dashboardEditPost;
window.dashboardViewOriginal = dashboardViewOriginal;
window.dashboardGoReviewComments = dashboardGoReviewComments;
window.dashboardReviewComment = dashboardReviewComment;
window.dashboardModerateComment = dashboardModerateComment;
window.dashboardDeleteComment = dashboardDeleteComment;
window.dashboardToggleArchivePost = dashboardToggleArchivePost;
window.dashboardViewMorePosts = dashboardViewMorePosts;
window.dashboardViewMoreComments = dashboardViewMoreComments;
window.dashboardViewMoreTopPosts = dashboardViewMoreTopPosts;
