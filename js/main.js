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
let currentNovelMetaId = null;
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
let lastAdminStats = null;
let adminPostTitleIndex = null;

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
let currentFrontArticleId = '';
let currentFrontArticleCover = '';
let currentNovelChapterTitle = '';

const PREF_THEME_KEY = 'pref_theme';
const PREF_LANG_KEY = 'pref_lang';
let CURRENT_THEME = '';
let CURRENT_LANG = '';

const I18N = {
  'nav.home': { zh: '首页', ja: 'ホーム' },
  'nav.articles': { zh: '文章', ja: '記事' },
  'nav.novels': { zh: '小说', ja: '小説' },
  'nav.about': { zh: '关于', ja: 'このサイトについて' },
  'action.search': { zh: '搜索', ja: '検索' },
  'action.top': { zh: '置顶', ja: 'トップへ' },
  'action.login': { zh: '登录', ja: 'ログイン' },
  'action.register': { zh: '注册', ja: '登録' },
  'action.logout': { zh: '退出', ja: 'ログアウト' },
  'pref.theme.light': { zh: '暖白', ja: 'ライト' },
  'pref.theme.dark': { zh: '护眼黑', ja: 'ダーク' },
  'pref.lang.zh': { zh: '中文', ja: '中国語' },
  'pref.lang.ja': { zh: '日本語', ja: '日本語' },
  'section.serialNovels': { zh: '连载小说', ja: '連載小説' },
  'section.comments': { zh: '评论', ja: 'コメント' },
  'section.allArticles': { zh: '全部文章', ja: 'すべての記事' },
  'section.articleSubtitle': { zh: '文章、随笔与评论', ja: '記事・随筆・コメント' },
  'front.hero.eyebrow': { zh: '个人写作平台', ja: 'パーソナル執筆プラットフォーム' },
  'front.hero.title': { zh: '记录生命中的<br><em>每一刻灵光</em>', ja: '人生の中の<br><em>ひらめきの瞬間</em>を記す' },
  'front.hero.desc': { zh: '文字是我与世界的桥梁。这里有我对生活的思考、对文学的探索，以及那些尚未完成的故事。', ja: '言葉は私と世界をつなぐ橋。ここには日々の考察、文学への探求、そしてまだ完結していない物語がある。' },
  'front.hero.browseArticles': { zh: '浏览文章', ja: '記事を見る' },
  'front.hero.readNovels': { zh: '阅读小说', ja: '小説を読む' },
  'front.hero.latestWork': { zh: '最新作品', ja: '最新作' },
  'front.hero.stats.articles': { zh: '文章', ja: '記事' },
  'front.hero.stats.novels': { zh: '小说', ja: '小説' },
  'front.hero.stats.readers': { zh: '读者', ja: '読者' },
  'front.section.featured': { zh: '精选推荐', ja: '注目のおすすめ' },
  'front.featured.label': { zh: '编辑推荐', ja: '編集部のおすすめ' },
  'front.tab.all': { zh: '全部', ja: 'すべて' },
  'front.tab.essay': { zh: '随笔', ja: '随筆' },
  'front.action.viewAll': { zh: '查看全部 →', ja: 'すべて見る →' },
  'front.footer.desc': { zh: '一个关于文字、思考与创作的私人空间。感谢你的到来。', ja: '言葉・思考・創作のための個人的な場所。訪れてくれてありがとう。' },
  'front.footer.copyright': { zh: '© 2024 拾墨 · 保留所有权利', ja: '© 2024 拾墨 · All rights reserved' },
  'front.footer.powered': { zh: 'Powered by Next.js · Neon · Vercel', ja: 'Powered by Next.js · Neon · Vercel' },
  'front.media.panel': { zh: '配图与媒体', ja: '画像・メディア' },
  'front.media.caption': { zh: '媒体面板', ja: 'メディアパネル' },
  'front.novels.subtitle': { zh: '正在进行中的故事，以及那些已经画上句号的世界', ja: '進行中の物語と、すでに幕を下ろした世界' },
  'front.novelFilter.ongoing': { zh: '连载中', ja: '連載中' },
  'front.novelFilter.finished': { zh: '已完结', ja: '完結' },
  'front.genre.scifi': { zh: '科幻', ja: 'SF' },
  'front.genre.fantasy': { zh: '奇幻', ja: 'ファンタジー' },
  'front.genre.realism': { zh: '现实主义', ja: 'リアリズム' },
  'front.novel.noChapters': { zh: '暂无章节', ja: '章がありません' },
  'front.article.loadFailed': { zh: '文章加载失败', ja: '記事の読み込みに失敗しました' },
  'front.comment.empty': { zh: '评论内容不能为空', ja: 'コメント内容は必須です' },
  'front.comment.submitted': { zh: '评论已提交，等待审核', ja: 'コメントを送信しました（審査待ち）' },
  'front.comment.submitFailed': { zh: '评论提交失败', ja: 'コメント送信に失敗しました' },
  'front.chapter.backToList': { zh: '← 返回目录', ja: '← 目次へ戻る' },
  'front.chapter.reader': { zh: '小说阅读', ja: '小説を読む' },
  'front.chapter.prev': { zh: '← 上一章', ja: '← 前の章' },
  'front.chapter.next': { zh: '下一章 →', ja: '次の章 →' },
  'front.chapter.label': { zh: '章节', ja: '章' },
  'front.chapter.toc': { zh: '章节目录', ja: '目次' },
  'front.chapter.titlePlaceholder': { zh: '章节标题', ja: '章タイトル' },
  'front.search.title': { zh: '搜索文章', ja: '記事を検索' },
  'front.search.placeholder': { zh: '输入标题/摘要/分类/标签…', ja: 'タイトル/要約/カテゴリ/タグ…' },
  'front.search.empty': { zh: '暂无匹配结果', ja: '一致する結果がありません' },
  'front.action.close': { zh: '关闭', ja: '閉じる' },
  'front.user.enterAdmin': { zh: '进入后台', ja: '管理画面へ' },
  'front.user.profile': { zh: '个人信息', ja: 'プロフィール' },
  'front.loading': { zh: '加载中...', ja: '読み込み中…' },
  'front.empty': { zh: '暂无数据', ja: 'データなし' },
  'front.readMore': { zh: '点击阅读全文...', ja: '続きを読む…' },
  'front.anonymous': { zh: '匿名', ja: '匿名' },
  'about.author': { zh: '关于作者', ja: '作者について' },
  'about.tag.literature': { zh: '文学', ja: '文学' },
  'about.tag.philosophy': { zh: '哲学', ja: '哲学' },
  'about.tag.film': { zh: '电影', ja: '映画' },
  'about.tag.travel': { zh: '旅行', ja: '旅' },
  'front.author.placeholder': { zh: '某位写作者', ja: 'ある書き手' },
  'front.about.subtitlePlaceholder': { zh: '一个喜欢用文字思考的人', ja: '言葉で考えるのが好きな人' },
  'front.about.taglinePlaceholder': { zh: '作家 · 随笔作者 · 小说创作者', ja: '作家 · 随筆 · 小説' },
  'front.about.contentPlaceholder': { zh: '<p>这是一个关于文字与思考的私人空间。</p>', ja: '<p>言葉と思考のための個人的な場所です。</p>' },
  'auth.loginSubtitle': { zh: '登录你的账号，加入对话', ja: 'ログインして会話に参加' },
  'auth.welcomeBack': { zh: '欢迎回来', ja: 'おかえりなさい' },
  'auth.noAccount': { zh: '还没有账号？', ja: 'まだアカウントがありませんか？' },
  'auth.registerNow': { zh: '立即注册', ja: '今すぐ登録' },
  'auth.createAccount': { zh: '创建账号', ja: 'アカウント作成' },
  'auth.registerSubtitle': { zh: '加入读者社区，参与内容讨论', ja: '読者コミュニティに参加して、内容について語り合いましょう' },
  'auth.haveAccount': { zh: '已有账号？', ja: 'すでにアカウントをお持ちですか？' },
  'auth.directLogin': { zh: '直接登录', ja: 'すぐログイン' },
  'auth.toast.loginSuccess': { zh: '登录成功！欢迎回来', ja: 'ログインしました。おかえりなさい' },
  'auth.toast.loginRequestError': { zh: '登录请求出错，请确保后台服务已启动', ja: 'ログインに失敗しました。サーバーが起動しているか確認してください' },
  'auth.toast.fillCredentials': { zh: '请填写用户名和密码', ja: 'ユーザー名とパスワードを入力してください' },
  'auth.toast.passwordMin': { zh: '密码至少 6 位', ja: 'パスワードは6文字以上です' },
  'auth.toast.passwordMismatch': { zh: '两次密码不一致', ja: 'パスワードが一致しません' },
  'auth.toast.registerSuccess': { zh: '注册成功！请登录', ja: '登録しました。ログインしてください' },
  'auth.toast.registerRequestError': { zh: '注册请求出错', ja: '登録に失敗しました' },
  'form.email': { zh: '邮箱地址', ja: 'メールアドレス' },
  'form.emailPlaceholder': { zh: '输入邮箱', ja: 'メールアドレスを入力' },
  'form.password': { zh: '密码', ja: 'パスワード' },
  'form.passwordPlaceholder': { zh: '输入密码', ja: 'パスワードを入力' },
  'form.passwordMinPlaceholder': { zh: '至少 8 位字符', ja: '8文字以上' },
  'form.nickname': { zh: '昵称', ja: 'ニックネーム' },
  'form.nicknamePlaceholder': { zh: '输入昵称', ja: 'ニックネームを入力' },
  'form.confirmPassword': { zh: '确认密码', ja: 'パスワード確認' },
  'form.confirmPasswordPlaceholder': { zh: '再次输入密码', ja: 'もう一度入力' },
  'action.loginToComment': { zh: '登录后评论', ja: 'ログインしてコメント' },
  'action.pleaseLogin': { zh: '请先登录', ja: '先にログインしてください' },
  'comment.placeholderLogin': { zh: '写下你的想法……（登录后才能评论）', ja: '感想を書いてください…（ログイン後にコメントできます）' },
  'action.backHome': { zh: '返回主页', ja: 'ホームへ戻る' },
  'profile.username': { zh: '用户名', ja: 'ユーザー名' },
  'profile.role': { zh: '角色', ja: 'ロール' },
  'profile.createdAt': { zh: '注册时间', ja: '登録日時' },
  'admin.subtitle': { zh: '管理后台 · Admin', ja: '管理画面 · Admin' },
  'admin.section.content': { zh: '内容管理', ja: 'コンテンツ管理' },
  'admin.section.community': { zh: '社区管理', ja: 'コミュニティ管理' },
  'admin.section.system': { zh: '系统', ja: 'システム' },
  'admin.user.placeholderName': { zh: '某位作者', ja: '作者' },
  'admin.user.placeholderRole': { zh: 'Administrator', ja: '管理者' },
  'admin.dashboard': { zh: '数据概览', ja: 'ダッシュボード' },
  'admin.articles': { zh: '文章管理', ja: '記事管理' },
  'admin.editor': { zh: '写作编辑器', ja: 'エディター' },
  'admin.novels': { zh: '小说管理', ja: '小説管理' },
  'admin.comments': { zh: '评论审核', ja: 'コメント審査' },
  'admin.users': { zh: '用户管理', ja: 'ユーザー管理' },
  'admin.settings': { zh: '网站设置', ja: 'サイト設定' },
  'admin.preview': { zh: '前台预览', ja: 'プレビュー' }
  ,
  'admin.page.dashboard': { zh: '数据概览', ja: 'ダッシュボード' },
  'admin.dashboard.updatedAt': { zh: '最近 30 天 · 更新于 --', ja: '過去30日 · 更新 --' },
  'admin.updatedAt': { zh: '更新于', ja: '更新' },
  'admin.stat.totalViews': { zh: '总页面访问量', ja: '総ページビュー' },
  'admin.stat.users': { zh: '注册用户', ja: '登録ユーザー' },
  'admin.stat.comments': { zh: '评论总数', ja: 'コメント総数' },
  'admin.stat.publishedPosts': { zh: '已发布文章', ja: '公開記事' },
  'admin.chart.activity': { zh: '内容活跃度', ja: 'アクティビティ' },
  'admin.chart.topContent': { zh: '热门内容 TOP 5（按互动/阅读）', ja: '人気コンテンツ TOP5（反応/閲覧）' },
  'admin.chart.viewsTrend': { zh: '浏览量趋势', ja: '閲覧数推移' },
  'admin.chart.topPages': { zh: '页面访问量 TOP 5', ja: 'ページ閲覧 TOP5' },
  'admin.chart.topContentViews': { zh: '内容访问量 TOP 5', ja: 'コンテンツ閲覧 TOP5' },
  'admin.chart.latestPosts': { zh: '最新文章动态', ja: '最新記事' },
  'admin.chart.latestComments': { zh: '最新评论', ja: '最新コメント' },
  'admin.period.recent': { zh: '最近', ja: '最近' },
  'admin.period.last14days': { zh: '过去 14 天', ja: '過去14日' },
  'admin.period.last30days': { zh: '过去 30 天', ja: '過去30日' },
  'admin.period.total': { zh: '累计', ja: '累計' },
  'admin.period.recent8': { zh: '最近 8 条', ja: '最新8件' },
  'admin.today': { zh: '今日', ja: '今日' },
  'admin.action.viewMore': { zh: '查看更多', ja: 'もっと見る' },
  'admin.action.newPost': { zh: '+ 新建文章', ja: '+ 新規記事' },
  'admin.action.save': { zh: '保存', ja: '保存' },
  'admin.action.publish': { zh: '发布', ja: '公開' },
  'admin.action.saveChanges': { zh: '保存更改', ja: '変更を保存' },
  'admin.action.close': { zh: '关闭', ja: '閉じる' },
  'admin.action.cancel': { zh: '取消', ja: 'キャンセル' },
  'admin.action.edit': { zh: '编辑', ja: '編集' },
  'admin.action.read': { zh: '阅读', ja: '読む' },
  'admin.action.review': { zh: '审核', ja: '審査' },
  'admin.action.original': { zh: '原文', ja: '原文' },
  'admin.action.approve': { zh: '通过', ja: '承認' },
  'admin.action.hide': { zh: '隐藏', ja: '非表示' },
  'admin.action.delete': { zh: '删除', ja: '削除' },
  'admin.action.toDraft': { zh: '转草稿', ja: '下書きへ' },
  'admin.action.archive': { zh: '归档', ja: 'アーカイブ' },
  'admin.action.unarchive': { zh: '取消归档', ja: 'アーカイブ解除' },
  'admin.action.newNovel': { zh: '+ 新建小说', ja: '+ 新規小説' },
  'admin.action.newChapter': { zh: '新建章节', ja: '新規章' },
  'admin.action.saveChapter': { zh: '保存章节', ja: '章を保存' },
  'admin.action.deleteChapter': { zh: '删除章节', ja: '章を削除' },
  'admin.action.uploadCover': { zh: '上传封面', ja: 'カバーをアップロード' },
  'admin.filter.all': { zh: '全部', ja: 'すべて' },
  'admin.filter.published': { zh: '已发布', ja: '公開' },
  'admin.filter.draft': { zh: '草稿', ja: '下書き' },
  'admin.filter.archived': { zh: '已归档', ja: 'アーカイブ' },
  'admin.filter.pending': { zh: '待审核', ja: '審査待ち' },
  'admin.filter.approved': { zh: '已通过', ja: '承認済み' },
  'admin.filter.hidden': { zh: '已隐藏', ja: '非表示' },
  'admin.filter.allUsers': { zh: '全部用户', ja: '全ユーザー' },
  'admin.filter.active': { zh: '正常', ja: '正常' },
  'admin.filter.banned': { zh: '已封禁', ja: '停止' },
  'admin.filter.allCategories': { zh: '全部分类', ja: 'すべてのカテゴリ' },
  'admin.sort.latest': { zh: '最新', ja: '最新' },
  'admin.sort.byComments': { zh: '按评论数', ja: 'コメント数順' },
  'admin.section.articleList': { zh: '文章列表', ja: '記事一覧' },
  'admin.section.novelList': { zh: '小说列表', ja: '小説一覧' },
  'admin.section.chapterManage': { zh: '章节管理', ja: '章管理' },
  'admin.search.articles': { zh: '搜索文章…', ja: '記事を検索…' },
  'admin.search.users': { zh: '搜索用户…', ja: 'ユーザーを検索…' },
  'admin.pref.prioritizePending': { zh: '优先待审核', ja: '審査待ちを優先' },
  'admin.pageLabel.home': { zh: '首页', ja: 'ホーム' },
  'admin.pageLabel.articles': { zh: '文章列表', ja: '記事一覧' },
  'admin.pageLabel.article': { zh: '文章详情', ja: '記事詳細' },
  'admin.pageLabel.novels': { zh: '小说', ja: '小説' },
  'admin.pageLabel.chapter': { zh: '章节', ja: '章' },
  'admin.pageLabel.about': { zh: '关于', ja: 'このサイトについて' },
  'admin.quick.newPost': { zh: '写新文章', ja: '新規記事' },
  'admin.quick.reviewComments': { zh: '审核评论', ja: 'コメント審査' },
  'admin.quick.updateNovel': { zh: '更新小说', ja: '小説更新' },
  'admin.quick.settings': { zh: '网站设置', ja: 'サイト設定' },
  'admin.table.title': { zh: '标题', ja: 'タイトル' },
  'admin.table.category': { zh: '分类', ja: 'カテゴリ' },
  'admin.table.status': { zh: '状态', ja: 'ステータス' },
  'admin.table.views': { zh: '阅读量', ja: '閲覧' },
  'admin.table.comments': { zh: '评论', ja: 'コメント' },
  'admin.table.publishedAt': { zh: '发布时间', ja: '公開日' },
  'admin.table.updatedAt': { zh: '最后更新', ja: '更新日時' },
  'admin.table.actions': { zh: '操作', ja: '操作' },
  'admin.table.novelTitle': { zh: '小说名', ja: '小説名' },
  'admin.table.genre': { zh: '类型', ja: 'ジャンル' },
  'admin.table.chapterCount': { zh: '章节数', ja: '章数' },
  'admin.table.wordCount': { zh: '总字数', ja: '文字数' },
  'admin.table.user': { zh: '用户', ja: 'ユーザー' },
  'admin.table.email': { zh: '邮箱', ja: 'メール' },
  'admin.table.role': { zh: '角色', ja: 'ロール' },
  'admin.table.commentCount': { zh: '评论数', ja: 'コメント数' },
  'admin.table.createdAt': { zh: '注册时间', ja: '登録日時' },
  'admin.page.articles': { zh: '文章管理', ja: '記事管理' },
  'admin.page.editor': { zh: '写作编辑器', ja: 'エディター' },
  'admin.page.novels': { zh: '小说管理', ja: '小説管理' },
  'admin.page.comments': { zh: '评论审核', ja: 'コメント審査' },
  'admin.page.users': { zh: '用户管理', ja: 'ユーザー管理' },
  'admin.page.settings': { zh: '网站设置', ja: 'サイト設定' },
  'admin.editor.titlePlaceholder': { zh: '输入文章标题…', ja: 'タイトルを入力…' },
  'admin.editor.bold': { zh: '加粗', ja: '太字' },
  'admin.editor.italic': { zh: '斜体', ja: '斜体' },
  'admin.editor.underline': { zh: '下划线', ja: '下線' },
  'admin.editor.undo': { zh: '撤销', ja: '元に戻す' },
  'admin.editor.redo': { zh: '重做', ja: 'やり直し' },
  'admin.editor.contentPlaceholder': { zh: '开始写作…', ja: '執筆を開始…' },
  'admin.editor.settings': { zh: '文章设置', ja: '記事設定' },
  'admin.editor.contentType': { zh: '内容类型', ja: 'コンテンツ種別' },
  'admin.content.post': { zh: '文章', ja: '記事' },
  'admin.content.novelChapter': { zh: '小说章节', ja: '小説章' },
  'admin.editor.novel': { zh: '小说', ja: '小説' },
  'admin.editor.selectNovel': { zh: '选择小说…', ja: '小説を選択…' },
  'admin.editor.chapterFilename': { zh: '章节文件名', ja: '章ファイル名' },
  'admin.editor.chapterFilenamePlaceholder': { zh: '例如：001-第一章.md', ja: '例：001-第一章.md' },
  'admin.editor.category': { zh: '分类', ja: 'カテゴリ' },
  'admin.editor.categoryPlaceholder': { zh: '例如：文章, 随笔', ja: '例：記事, エッセイ' },
  'admin.editor.tags': { zh: '标签', ja: 'タグ' },
  'admin.editor.tagsPlaceholder': { zh: '例如：写作, 随想', ja: '例：執筆, 雑感' },
  'admin.editor.excerpt': { zh: '摘要', ja: '要約' },
  'admin.editor.excerptPlaceholder': { zh: '用于列表与 SEO', ja: '一覧とSEOに使用' },
  'admin.editor.slug': { zh: '文件名/Slug', ja: 'ファイル名/スラッグ' },
  'admin.editor.slugPlaceholder': { zh: '例如：memory-and-forgetting', ja: '例：memory-and-forgetting' },
  'admin.editor.coverUrl': { zh: '封面图 URL', ja: 'カバーURL' },
  'admin.editor.coverUrlPlaceholder': { zh: '例如：https://... 或 /images/xxx.jpg', ja: '例：https://... または /images/xxx.jpg' },
  'admin.editor.mediaUpload': { zh: '媒体上传', ja: 'メディアアップロード' },
  'admin.editor.uploadHint': { zh: '点击或拖拽上传<br>图片 / GIF / 视频 (≤100MB)', ja: 'クリックまたはドラッグ&ドロップでアップロード<br>画像 / GIF / 動画 (≤100MB)' },
  'admin.chapter.filenamePlaceholder': { zh: '章节文件名，如 001-第一章.md', ja: '章ファイル名（例：001-第一章.md）' },
  'admin.chapter.titlePlaceholder': { zh: '章节标题（展示用）', ja: '章タイトル（表示用）' },
  'admin.modal.editNovel': { zh: '编辑小说信息', ja: '小説情報を編集' },
  'admin.novel.titlePlaceholder': { zh: '小说标题', ja: '小説タイトル' },
  'admin.novel.genrePlaceholder': { zh: '类型，如 科幻', ja: 'ジャンル（例：SF）' },
  'admin.novel.status.ongoing': { zh: 'ongoing（连载中）', ja: 'ongoing（連載中）' },
  'admin.novel.status.finished': { zh: 'finished（已完结）', ja: 'finished（完結）' },
  'admin.novel.coverPlaceholder': { zh: '封面图 URL（可留空）', ja: 'カバーURL（任意）' },
  'admin.novel.noCover': { zh: '暂无封面', ja: 'カバーなし' },
  'admin.novel.noChapters': { zh: '暂无章节', ja: '章がありません' },
  'admin.novel.chapterListLoadFailed': { zh: '章节列表加载失败', ja: '章一覧の読み込みに失敗しました' },
  'admin.loadFailed': { zh: '加载失败', ja: '読み込み失敗' },
  'admin.prompt.chapterFilename': { zh: '请输入章节文件名（例如：001-第一章.md）', ja: '章ファイル名を入力してください（例：001-第一章.md）' },
  'admin.role.admin': { zh: '管理员', ja: '管理者' },
  'admin.role.user': { zh: '用户', ja: 'ユーザー' },
  'admin.user.rename': { zh: '改昵称', ja: '名前変更' },
  'admin.user.demote': { zh: '降为用户', ja: 'ユーザーに戻す' },
  'admin.user.promote': { zh: '设为管理员', ja: '管理者にする' },
  'admin.user.unban': { zh: '解封', ja: '解除' },
  'admin.user.ban': { zh: '封禁', ja: '停止' },
  'admin.prompt.renameUser': { zh: '请输入新的昵称（最多 30 个字符）', ja: '新しいニックネームを入力してください（最大30文字）' },
  'admin.error.nameEmpty': { zh: '昵称不能为空', ja: 'ニックネームは必須です' },
  'admin.error.nameTooLong': { zh: '昵称最多 30 个字符', ja: 'ニックネームは最大30文字です' },
  'admin.toast.nameUpdated': { zh: '已更新昵称', ja: 'ニックネームを更新しました' },
  'admin.toast.actionFailed': { zh: '操作失败', ja: '操作に失敗しました' },
  'admin.toast.success': { zh: '操作成功', ja: '操作しました' },
  'admin.toast.deleteFailed': { zh: '删除失败', ja: '削除に失敗しました' },
  'admin.toast.deleted': { zh: '已删除', ja: '削除しました' },
  'admin.toast.uploadSuccess': { zh: '上传成功', ja: 'アップロードしました' },
  'admin.toast.uploadFailed': { zh: '上传失败', ja: 'アップロードに失敗しました' },
  'admin.toast.uploadError': { zh: '上传出错', ja: 'アップロード中にエラーが発生しました' },
  'admin.toast.selectImage': { zh: '请选择图片文件', ja: '画像ファイルを選択してください' },
  'admin.toast.createSuccess': { zh: '创建成功', ja: '作成しました' },
  'admin.toast.createFailed': { zh: '创建失败', ja: '作成に失敗しました' },
  'admin.toast.requestError': { zh: '请求出错', ja: 'リクエストに失敗しました' },
  'admin.toast.loadFailed': { zh: '加载失败', ja: '読み込みに失敗しました' },
  'admin.toast.loadUsersFailed': { zh: '加载用户失败', ja: 'ユーザーの読み込みに失敗しました' },
  'admin.toast.saveSuccess': { zh: '保存成功', ja: '保存しました' },
  'admin.toast.saveFailed': { zh: '保存失败', ja: '保存に失敗しました' },
  'admin.toast.saveRequestError': { zh: '保存请求出错', ja: '保存リクエストに失敗しました' },
  'admin.toast.saveError': { zh: '保存出错', ja: '保存中にエラーが発生しました' },
  'admin.toast.loadPostFailed': { zh: '加载文章失败', ja: '記事の読み込みに失敗しました' },
  'admin.toast.titleContentRequired': { zh: '标题和内容不能为空', ja: 'タイトルと本文は必須です' },
  'admin.toast.selectNovel': { zh: '请选择小说', ja: '小説を選択してください' },
  'admin.toast.chapterFilenameRequired': { zh: '请填写章节文件名', ja: '章ファイル名を入力してください' },
  'admin.toast.chapterLoadFailed': { zh: '章节加载失败', ja: '章の読み込みに失敗しました' },
  'admin.toast.needOpenPost': { zh: '请先打开文章再操作', ja: '先に記事を開いてください' },
  'admin.toast.settingsSaved': { zh: '设置已保存', ja: '設定を保存しました' },
  'admin.toast.selectChapterFirst': { zh: '请先选择章节', ja: '先に章を選択してください' },
  'admin.toast.needAdmin': { zh: '需要管理员权限', ja: '管理者権限が必要です' },
  'admin.prompt.novelTitle': { zh: '请输入小说标题：', ja: '小説タイトルを入力してください：' },
  'admin.genre.uncategorized': { zh: '未分类', ja: '未分類' },
  'admin.novel.manageChapters': { zh: '管理章节', ja: '章管理' },
  'admin.novel.setOngoing': { zh: '设为连载', ja: '連載にする' },
  'admin.novel.setFinished': { zh: '设为完结', ja: '完結にする' },
  'admin.novel.statusBadge.ongoing': { zh: '连载中', ja: '連載中' },
  'admin.novel.statusBadge.finished': { zh: '已完结', ja: '完結' },
  'admin.error.novelTitleRequired': { zh: '请填写小说标题', ja: '小説タイトルを入力してください' },
  'admin.error.missingChapterPanel': { zh: '章节面板缺失', ja: '章パネルが見つかりません' },
  'admin.comments.summary': { zh: '0 条待审核', ja: '0件 審査待ち' },
  'admin.comments.pendingUnit': { zh: '条待审核', ja: '件 審査待ち' },
  'admin.empty': { zh: '暂无数据', ja: 'データなし' },
  'admin.confirm.deleteComment': { zh: '确定删除该评论？', ja: 'このコメントを削除しますか？' },
  'admin.confirm.deletePost': { zh: '确定要删除这篇文章吗？此操作不可恢复。', ja: 'この記事を削除しますか？この操作は取り消せません。' },
  'admin.confirm.deleteUser': { zh: '确定删除该用户？', ja: 'このユーザーを削除しますか？' },
  'admin.confirm.deleteNovel': { zh: '确定删除该小说及其全部章节？', ja: 'この小説と全章を削除しますか？' },
  'admin.confirm.deleteChapter': { zh: '确定删除该章节？', ja: 'この章を削除しますか？' },
  'admin.anonymous': { zh: '匿名', ja: '匿名' },
  'admin.comment.postLabel': { zh: '文章', ja: '記事' },
  'admin.settings.basic': { zh: '基本信息', ja: '基本情報' },
  'admin.settings.basicDesc': { zh: '网站名称、描述与联系方式', ja: 'サイト名・説明・連絡先' },
  'admin.settings.siteTitle': { zh: '网站名称', ja: 'サイト名' },
  'admin.settings.siteTitleDesc': { zh: '显示在浏览器标签和网站 Logo 处', ja: 'ブラウザタブとロゴに表示' },
  'admin.settings.siteDescription': { zh: '网站简介', ja: 'サイト概要' },
  'admin.settings.siteDescriptionDesc': { zh: '显示在 SEO meta description 和关于页', ja: 'SEOのdescriptionとAboutに表示' },
  'admin.settings.author': { zh: '作者名', ja: '著者名' },
  'admin.settings.authorDesc': { zh: '文章署名与关于页显示', ja: '記事の署名とAboutに表示' },
  'admin.settings.homeAbout': { zh: '首页与关于', ja: 'ホーム＆About' },
  'admin.settings.homeAboutDesc': { zh: '自定义首页文案与关于作者内容', ja: 'ホーム文言と著者紹介を編集' },
  'admin.settings.homeIntro': { zh: '首页介绍', ja: 'ホーム紹介文' },
  'admin.settings.homeIntroDesc': { zh: '显示在首页顶部大段文字', ja: 'ホーム上部の文章に表示' },
  'admin.settings.footerIntro': { zh: '页脚介绍', ja: 'フッター紹介文' },
  'admin.settings.footerIntroDesc': { zh: '显示在首页页脚', ja: 'ホームのフッターに表示' },
  'admin.settings.aboutSubtitle': { zh: '关于页副标题', ja: 'About副題' },
  'admin.settings.aboutSubtitleDesc': { zh: '显示在关于作者页顶部', ja: 'Aboutページ上部に表示' },
  'admin.settings.aboutSubtitlePlaceholder': { zh: '例如：一个喜欢用文字思考的人', ja: '例：文章で考えるのが好きな人' },
  'admin.settings.aboutTagline': { zh: '作者标签', ja: '著者タグ' },
  'admin.settings.aboutTaglineDesc': { zh: '显示在作者名下方', ja: '著者名の下に表示' },
  'admin.settings.aboutTaglinePlaceholder': { zh: '例如：作家 · 随笔作者 · 小说创作者', ja: '例：作家 · エッセイ · 小説' },
  'admin.placeholder.jaOptional': { zh: '日本語（可选）', ja: '日本語（任意）' },
  'admin.settings.aboutContent': { zh: '关于作者内容', ja: '著者紹介文' },
  'admin.settings.aboutContentDesc': { zh: '支持 Markdown', ja: 'Markdown対応' },
  'admin.settings.features': { zh: '功能开关', ja: '機能切替' },
  'admin.settings.featuresDesc': { zh: '控制前台功能的开启与关闭', ja: 'フロント機能の有効/無効を制御' },
  'admin.settings.allowRegister': { zh: '允许注册', ja: '登録を許可' },
  'admin.settings.allowRegisterDesc': { zh: '关闭后访客无法注册新账号', ja: 'オフにすると新規登録できません' }
};

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

function t(key) {
  const lang = CURRENT_LANG === 'ja' ? 'ja' : 'zh';
  const hit = I18N && Object.prototype.hasOwnProperty.call(I18N, key) ? I18N[key] : null;
  if (!hit) return key;
  return hit[lang] || hit.zh || key;
}

function applyI18n() {
  const nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach((el) => {
    const key = el && el.dataset ? el.dataset.i18n : '';
    if (!key) return;
    el.textContent = t(key);
  });
  const htmlNodes = document.querySelectorAll('[data-i18n-html]');
  htmlNodes.forEach((el) => {
    const key = el && el.dataset ? el.dataset.i18nHtml : '';
    if (!key) return;
    el.innerHTML = t(key);
  });
  const ph = document.querySelectorAll('[data-i18n-placeholder]');
  ph.forEach((el) => {
    const key = el && el.dataset ? el.dataset.i18nPlaceholder : '';
    if (!key) return;
    el.setAttribute('placeholder', t(key));
  });
  const titles = document.querySelectorAll('[data-i18n-title]');
  titles.forEach((el) => {
    const key = el && el.dataset ? el.dataset.i18nTitle : '';
    if (!key) return;
    el.setAttribute('title', t(key));
  });
  const aria = document.querySelectorAll('[data-i18n-aria-label]');
  aria.forEach((el) => {
    const key = el && el.dataset ? el.dataset.i18nAriaLabel : '';
    if (!key) return;
    el.setAttribute('aria-label', t(key));
  });
}

function setTheme(next) {
  const theme = next === 'dark' ? 'dark' : 'light';
  CURRENT_THEME = theme;
  try {
    localStorage.setItem(PREF_THEME_KEY, theme);
  } catch {
  }
  document.documentElement.setAttribute('data-theme', theme);
  refreshPrefButtons();
}

function toggleTheme() {
  setTheme(CURRENT_THEME === 'dark' ? 'light' : 'dark');
}

function setLang(next) {
  const lang = next === 'ja' ? 'ja' : 'zh';
  CURRENT_LANG = lang;
  try {
    localStorage.setItem(PREF_LANG_KEY, lang);
  } catch {
  }
  document.documentElement.setAttribute('lang', lang === 'ja' ? 'ja' : 'zh-CN');
  document.documentElement.setAttribute('data-lang', lang);
  applyI18n();
  refreshPrefButtons();
  applyFrontSettings();
  renderAdminDashboardDynamic();
  renderAdminCommentsSummary();
}

function toggleLang() {
  setLang(CURRENT_LANG === 'ja' ? 'zh' : 'ja');
}

function refreshPrefButtons() {
  const themeText = CURRENT_THEME === 'dark' ? `🌞 ${t('pref.theme.light')}` : `🌙 ${t('pref.theme.dark')}`;
  const langText = CURRENT_LANG === 'ja' ? t('pref.lang.zh') : t('pref.lang.ja');
  const ids = ['frontThemeToggle', 'adminThemeToggle'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = themeText;
  });
  const langIds = ['frontLangToggle', 'adminLangToggle'];
  langIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = langText;
  });
}

function initPreferences() {
  let theme = 'light';
  let lang = 'zh';
  try {
    theme = localStorage.getItem(PREF_THEME_KEY) || theme;
    lang = localStorage.getItem(PREF_LANG_KEY) || lang;
  } catch {
  }
  setTheme(theme);
  setLang(lang);
  applyI18n();
  refreshPrefButtons();
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  initPreferences();
  checkAuth();
  applyFrontSettings();
  initEditorToolbar();
  initEditorMode();
  initRegisterForm();
  renderFrontendPosts();
  trackView('page', 'home');
  // If hash is present, route to it? For now default home
});

async function applyFrontSettings() {
  try {
    const res = await fetch(apiUrl('/settings'));
    const data = await safeJson(res) || {};
    if (!res.ok || !data) return;

    const pick = (key) => {
      if (!data || typeof data !== 'object') return '';
      const jaKey = `${key}Ja`;
      if (CURRENT_LANG === 'ja') {
        if (data[jaKey] != null && String(data[jaKey]).trim()) return String(data[jaKey]);
        return '';
      }
      if (data[key] != null && String(data[key]).trim()) return String(data[key]);
      return '';
    };

    const homeIntroEl = document.getElementById('homeIntroText');
    const footerIntroEl = document.getElementById('footerIntroText');
    const aboutSubtitleEl = document.getElementById('aboutHeroSubtitle');
    const aboutNameEl = document.getElementById('aboutAuthorName');
    const aboutTaglineEl = document.getElementById('aboutAuthorTagline');
    const aboutContentEl = document.getElementById('aboutAuthorContent');

    const title = pick('title');
    const description = pick('description');
    const author = pick('author');
    const homeIntro = pick('homeIntro');
    const footerIntro = pick('footerIntro');
    const aboutSubtitle = pick('aboutSubtitle');
    const aboutTagline = pick('aboutTagline');
    const aboutContent = pick('aboutContent');

    if (title) document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute('content', description);

    const setText = (el, value, placeholderKey) => {
      if (!el) return;
      const v = value != null ? String(value).trim() : '';
      if (v) {
        el.textContent = v;
        el.removeAttribute('data-i18n');
        el.removeAttribute('data-i18n-html');
        return;
      }
      if (placeholderKey) {
        if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', placeholderKey);
      }
    };

    const setHtml = (el, value, placeholderKey) => {
      if (!el) return;
      const v = value != null ? String(value).trim() : '';
      if (v) {
        el.removeAttribute('data-i18n');
        el.removeAttribute('data-i18n-html');
        if (window.marked && window.DOMPurify) {
          el.innerHTML = DOMPurify.sanitize(marked.parse(v));
        } else {
          el.textContent = v;
        }
        return;
      }
      if (placeholderKey) {
        if (!el.getAttribute('data-i18n-html')) el.setAttribute('data-i18n-html', placeholderKey);
      }
    };

    setText(homeIntroEl, homeIntro, 'front.hero.desc');
    setText(footerIntroEl, footerIntro, 'front.footer.desc');
    setText(aboutSubtitleEl, aboutSubtitle || description, 'front.about.subtitlePlaceholder');
    setText(aboutNameEl, author, 'front.author.placeholder');
    setText(aboutTaglineEl, aboutTagline, 'front.about.taglinePlaceholder');
    setHtml(aboutContentEl, aboutContent, 'front.about.contentPlaceholder');

    applyI18n();
  } catch {
  }
}

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
  verifyAuthToken().catch(() => {});
}

async function verifyAuthToken() {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch(apiUrl('/me'), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    const ok = Boolean(data && data.authenticated);
    if (ok && data.user) {
      const nextUser = { ...(CURRENT_USER || {}), ...(data.user || {}) };
      CURRENT_USER = nextUser;
      localStorage.setItem('user_info', JSON.stringify({ name: nextUser.name, role: nextUser.role, username: nextUser.username, createdAt: nextUser.createdAt }));
      updateNavUser();
      return;
    }
  } catch {
  }
  handleUnauthorized(null, false);
}

function handleUnauthorized(message, navigate = true) {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  CURRENT_USER = null;
  updateNavGuest();
  if (navigate) {
    setMode('front');
    showPage('login');
  }
  if (message) showToast(message);
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
      showToast(t('auth.toast.loginSuccess'));
      updateNavUser();
      if (CURRENT_USER && CURRENT_USER.role === 'admin') {
        setMode('admin');
      } else {
        setMode('front');
        showPage('home');
      }
    } else {
      const msg = data.message || data.error || `登录失败（HTTP ${res.status}）`;
      showToast(`登录失败: ${msg}`);
    }
  } catch (err) {
    console.error(err);
    showToast(t('auth.toast.loginRequestError'));
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
    showToast(t('auth.toast.fillCredentials'));
    return;
  }
  if (password.length < 6) {
    showToast(t('auth.toast.passwordMin'));
    return;
  }
  if (confirm && password !== confirm) {
    showToast(t('auth.toast.passwordMismatch'));
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
      showToast(t('auth.toast.registerSuccess'));
      showPage('login');
    } else {
      const msg = data.message || data.error || `注册失败（HTTP ${res.status}）`;
      showToast(`注册失败: ${msg}`);
    }
  } catch (err) {
    console.error(err);
    showToast(t('auth.toast.registerRequestError'));
  }
}

function updateNavUser() {
  if (CURRENT_USER) {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;
    const initial = CURRENT_USER.name ? String(CURRENT_USER.name).slice(0, 1) : 'U';
    const title = CURRENT_USER.role === 'admin' ? t('front.user.enterAdmin') : t('front.user.profile');
    actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="frontThemeToggle" onclick="toggleTheme()"></button><button class="btn btn-ghost btn-sm" id="frontLangToggle" onclick="toggleLang()"></button><div class="nav-actions-divider"></div><button class="btn btn-ghost btn-sm" onclick="openFrontSearch()" data-i18n="action.search">搜索</button><button class="btn btn-ghost btn-sm" onclick="scrollToTop()" data-i18n="action.top">置顶</button><div class="nav-actions-divider"></div><div class="nav-avatar" onclick="openUserCenter()" title="${escapeHtml(title)}">${escapeHtml(initial)}</div><button class="btn btn-ghost btn-sm" onclick="logout()" data-i18n="action.logout">退出</button>`;
    applyI18n();
    refreshPrefButtons();

    const adminName = document.querySelector('.admin-user-name');
    const adminRole = document.querySelector('.admin-user-role');
    if (adminName) adminName.textContent = CURRENT_USER.name || CURRENT_USER.username || 'User';
    if (adminRole) adminRole.textContent = CURRENT_USER.role === 'admin' ? 'Administrator' : 'User';
  }
}

function updateNavGuest() {
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;
  actions.innerHTML = `<button class="btn btn-ghost btn-sm" id="frontThemeToggle" onclick="toggleTheme()"></button><button class="btn btn-ghost btn-sm" id="frontLangToggle" onclick="toggleLang()"></button><div class="nav-actions-divider"></div><button class="btn btn-ghost btn-sm" onclick="openFrontSearch()" data-i18n="action.search">搜索</button><button class="btn btn-ghost btn-sm" onclick="scrollToTop()" data-i18n="action.top">置顶</button><div class="nav-actions-divider"></div><button class="btn btn-ghost btn-sm" onclick="showPage('login')" data-i18n="action.login">登录</button><button class="btn btn-primary btn-sm" onclick="showPage('register')" data-i18n="action.register">注册</button>`;
  applyI18n();
  refreshPrefButtons();
}

function scrollToTop() {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    window.scrollTo(0, 0);
  }
}

function ensureFrontSearchModal() {
  let modal = document.getElementById('frontSearchModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'frontSearchModal';
  modal.className = 'front-modal hidden';
  modal.innerHTML = `
    <div class="front-modal-backdrop" onclick="closeFrontSearch()"></div>
    <div class="front-modal-card" role="dialog" aria-modal="true">
      <div class="front-modal-head">
        <div class="front-modal-title" data-i18n="front.search.title">搜索文章</div>
        <button class="btn btn-ghost btn-sm" onclick="closeFrontSearch()" data-i18n="front.action.close">关闭</button>
      </div>
      <div class="front-modal-body">
        <input id="frontSearchInput" class="front-search-input" data-i18n-placeholder="front.search.placeholder" placeholder="输入标题/摘要/分类/标签…" />
        <div id="frontSearchResults" class="front-search-results"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFrontSearch();
  });
  applyI18n();
  return modal;
}

async function ensureFrontPostsForSearch() {
  if (Array.isArray(frontPostsCache) && frontPostsCache.length) return;
  try {
    const res = await fetch(apiUrl('/posts'));
    const data = await safeJson(res);
    if (res.ok && Array.isArray(data)) frontPostsCache = data;
  } catch {
  }
}

async function openFrontSearch() {
  const modal = ensureFrontSearchModal();
  modal.classList.remove('hidden');
  await ensureFrontPostsForSearch();
  const input = document.getElementById('frontSearchInput');
  const results = document.getElementById('frontSearchResults');
  if (!input || !results) return;

  const render = () => {
    const q = String(input.value || '').trim().toLowerCase();
    const list = Array.isArray(frontPostsCache) ? frontPostsCache : [];
    const hits = q
      ? list.filter(p => {
        const t = String(p && p.title ? p.title : '').toLowerCase();
        const d = String(p && p.description ? p.description : '').toLowerCase();
        const c = String(p && p.categories && p.categories[0] ? p.categories[0] : '').toLowerCase();
        const tags = Array.isArray(p && p.tags) ? p.tags.map(x => String(x || '').toLowerCase()).join(' ') : '';
        return t.includes(q) || d.includes(q) || c.includes(q) || tags.includes(q);
      })
      : list.slice(0, 20);

    const shown = hits.slice(0, 30);
    results.innerHTML = shown.length
      ? shown.map(p => {
        const filename = p && p.filename ? String(p.filename) : '';
        const title = p && p.title ? String(p.title) : filename.replace(/\.md$/i, '');
        const date = p && p.date ? new Date(p.date).toLocaleDateString() : '';
        const desc = p && p.description ? String(p.description) : '';
        const cat = p && p.categories && p.categories[0] ? String(p.categories[0]) : '';
        return `
          <div class="front-search-item" onclick="frontSearchOpenArticle('${escapeHtml(filename)}')">
            <div class="front-search-item-title">${escapeHtml(title)}</div>
            <div class="front-search-item-meta">${escapeHtml(cat)}${cat && date ? ' · ' : ''}${escapeHtml(date)}</div>
            <div class="front-search-item-desc">${escapeHtml(desc || '')}</div>
          </div>
        `;
      }).join('')
      : `<div class="front-search-empty" data-i18n="front.search.empty">暂无匹配结果</div>`;
    applyI18n();
  };

  input.oninput = render;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.front-search-item');
      if (first && first.getAttribute('onclick')) first.click();
    }
  };
  input.value = '';
  render();
  setTimeout(() => input.focus(), 0);
}

function closeFrontSearch() {
  const modal = document.getElementById('frontSearchModal');
  if (modal) modal.classList.add('hidden');
}

function frontSearchOpenArticle(filename) {
  closeFrontSearch();
  if (!filename) return;
  showPage('article', filename);
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
    if (!res.ok) {
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(data && data.error ? `加载概览失败: ${data.error}` : '加载概览失败');
      return;
    }
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

    lastAdminStats = {
      viewCount,
      viewToday,
      viewYesterday,
      userCount,
      userToday,
      userYesterday,
      commentCount,
      commentToday,
      commentYesterday,
      publishedPostCount,
      publishedPostToday,
      publishedPostYesterday,
      pendingCommentCount,
      statsUpdatedAt
    };
    renderAdminDashboardDynamic();

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

    const views30Bars = document.getElementById('dashboardViews30Bars');
    const views30 = Array.isArray(data.views30Days) ? data.views30Days : [];
    if (views30Bars) {
      const max = Math.max(1, ...views30.map(d => Number(d && d.value ? d.value : 0)));
      views30Bars.innerHTML = views30.length
        ? views30
            .map(d => {
              const v = Number(d && d.value ? d.value : 0);
              const h = Math.max(4, Math.round((v / max) * 100));
              const label = d && d.label ? String(d.label) : '';
              return `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}%"></div><div class="chart-bar-label">${escapeHtml(label)}</div></div>`;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
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
              const kind = p && p.kind ? String(p.kind) : 'post';
              const metric = p && p.metric ? String(p.metric) : 'comments';
              const chapter = p && p.chapter ? String(p.chapter) : '';
              const no = String(idx + 1).padStart(2, '0');
              const color = colors[idx] || 'var(--admin-accent)';
              const icon = kind === 'chapter' ? '📖' : '📝';
              const countText = metric === 'views' ? `👁 ${count}` : `💬 ${count}`;
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:${color};width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(`${icon} ${title}`)}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${escapeHtml(countText)}</span>
                  ${filename ? `<button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')" data-i18n="admin.action.edit">编辑</button>` : ''}
                  ${!filename && chapter ? `<button class="btn btn-admin-outline btn-sm" onclick="setMode('front');showPage('chapter','${escapeJsString(chapter)}')" data-i18n="admin.action.read">阅读</button>` : ''}
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
    }

    const topViewedPagesWrap = document.getElementById('dashboardTopViewedPages');
    const topViewedPages = Array.isArray(data.topViewedPages) ? data.topViewedPages : [];
    if (topViewedPagesWrap) {
      const labelKeyOf = (id) => {
        const m = {
          home: 'admin.pageLabel.home',
          articles: 'admin.pageLabel.articles',
          article: 'admin.pageLabel.article',
          novels: 'admin.pageLabel.novels',
          chapter: 'admin.pageLabel.chapter',
          about: 'admin.pageLabel.about'
        };
        return Object.prototype.hasOwnProperty.call(m, id) ? m[id] : '';
      };
      topViewedPagesWrap.innerHTML = topViewedPages.length
        ? topViewedPages
            .map((p, idx) => {
              const id = p && p.id ? String(p.id) : '-';
              const count = Number(p && p.count ? p.count : 0);
              const no = String(idx + 1).padStart(2, '0');
              const key = labelKeyOf(id);
              const label = key ? `<span data-i18n="${escapeHtml(key)}">${escapeHtml(t(key))}</span>` : escapeHtml(id);
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--admin-muted);width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8)">${label}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${count.toLocaleString()}</span>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
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
              const kind = p && p.kind ? String(p.kind) : 'post';
              const chapter = p && p.chapter ? String(p.chapter) : '';
              const no = String(idx + 1).padStart(2, '0');
              const icon = kind === 'chapter' ? '📖' : '📝';
              return `
                <div style="display:flex;align-items:center;gap:.75rem">
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--admin-muted);width:20px">${no}</span>
                  <div style="flex:1;font-size:13.5px;color:rgba(249,250,251,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(`${icon} ${title}`)}</div>
                  <span style="font-family:'DM Mono',monospace;font-size:11.5px;color:var(--admin-muted)">${count.toLocaleString()}</span>
                  ${filename ? `<button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')" data-i18n="admin.action.edit">编辑</button>` : ''}
                  ${!filename && chapter ? `<button class="btn btn-admin-outline btn-sm" onclick="setMode('front');showPage('chapter','${escapeJsString(chapter)}')" data-i18n="admin.action.read">阅读</button>` : ''}
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
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
              const statusKey = archived ? 'admin.filter.archived' : (published ? 'admin.filter.published' : 'admin.filter.draft');
              const statusColor = archived ? 'var(--admin-muted)' : (published ? 'rgba(16,185,129,.8)' : 'rgba(251,191,36,.9)');
              return `
                <div style="display:flex;align-items:center;gap:.6rem">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:.5rem">
                      <div style="font-size:13.5px;color:rgba(249,250,251,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(title)}</div>
                      <span style="font-size:12px;color:${statusColor}" data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span>
                    </div>
                    <div style="font-size:12px;color:var(--admin-muted)">${escapeHtml(date)}</div>
                  </div>
                  <div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end">
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardEditPost('${filename}')" data-i18n="admin.action.edit">编辑</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="togglePublishPost('${filename}')" data-i18n="${escapeHtml(published ? 'admin.action.toDraft' : 'admin.action.publish')}">${escapeHtml(t(published ? 'admin.action.toDraft' : 'admin.action.publish'))}</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardToggleArchivePost('${filename}')" data-i18n="${escapeHtml(archived ? 'admin.action.unarchive' : 'admin.action.archive')}">${escapeHtml(t(archived ? 'admin.action.unarchive' : 'admin.action.archive'))}</button>
                  </div>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
    }

    const recentCommentsWrap = document.getElementById('dashboardRecentComments');
    const recentComments = Array.isArray(data.recentComments) ? data.recentComments : [];
    if (recentCommentsWrap) {
      recentCommentsWrap.innerHTML = recentComments.length
        ? recentComments
            .map(c => {
              const id = c && c.id ? String(c.id) : '';
              const user = c && c.user ? String(c.user) : t('admin.anonymous');
              const date = c && c.date ? new Date(c.date).toLocaleString() : '-';
              const post = c && c.post ? String(c.post) : '';
              const status = c && c.status ? String(c.status) : 'pending';
              const content = String(c && c.content ? c.content : '');
              const snippet = content.length > 80 ? `${content.slice(0, 80)}…` : content;
              const statusKey = status === 'approved' ? 'admin.filter.approved' : (status === 'hidden' ? 'admin.filter.hidden' : 'admin.filter.pending');
              const statusColor = status === 'approved' ? 'rgba(16,185,129,.8)' : (status === 'hidden' ? 'var(--admin-muted)' : 'rgba(251,191,36,.9)');
              return `
                <div style="display:flex;align-items:flex-start;gap:.6rem">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:.5rem">
                      <div style="font-size:13.5px;color:rgba(249,250,251,.85);font-weight:600">${escapeHtml(user)}</div>
                      <span style="font-size:12px;color:${statusColor}" data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span>
                    </div>
                    <div style="font-size:12px;color:var(--admin-muted)">${escapeHtml(date)}</div>
                    <div style="margin-top:.25rem;font-size:13px;color:rgba(249,250,251,.78);line-height:1.55">${escapeHtml(snippet)}</div>
                  </div>
                  <div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end">
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardReviewComment('${id}', '${status}')" data-i18n="admin.action.review">审核</button>
                    <button class="btn btn-admin-outline btn-sm" onclick="dashboardViewOriginal('${post}', '${id}')" data-i18n="admin.action.original">原文</button>
                    ${status !== 'approved' ? `<button class="btn btn-admin btn-sm" onclick="dashboardModerateComment('${id}', 'approved', '${status}')" data-i18n="admin.action.approve">通过</button>` : ''}
                    ${status !== 'hidden' ? `<button class="btn btn-sm" style="color:#f87171;border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="dashboardModerateComment('${id}', 'hidden', '${status}')" data-i18n="admin.action.hide">隐藏</button>` : ''}
                    <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="dashboardDeleteComment('${id}', '${status}')" data-i18n="admin.action.delete">删除</button>
                  </div>
                </div>
              `;
            })
            .join('')
        : `<div style="color:var(--admin-muted);font-size:13px" data-i18n="admin.empty">暂无数据</div>`;
    }
    applyI18n();
  } catch (err) { console.error('Failed to fetch stats', err); }
}

function renderAdminDashboardDynamic() {
  if (!lastAdminStats) return;
  const viewEl = document.getElementById('statViewCount');
  const viewChangeEl = document.getElementById('statViewChange');
  const userEl = document.getElementById('statUserCount');
  const userChangeEl = document.getElementById('statUserChange');
  const commentEl = document.getElementById('statCommentCount');
  const commentChangeEl = document.getElementById('statCommentChange');
  const postEl = document.getElementById('statPostCount');
  const postChangeEl = document.getElementById('statPostChange');

  if (viewEl) viewEl.textContent = Number(lastAdminStats.viewCount || 0).toLocaleString();
  if (userEl) userEl.textContent = Number(lastAdminStats.userCount || 0).toLocaleString();
  if (commentEl) commentEl.textContent = Number(lastAdminStats.commentCount || 0).toLocaleString();
  if (postEl) postEl.textContent = Number(lastAdminStats.publishedPostCount || 0).toLocaleString();

  const setChange = (el, today, yesterday) => {
    if (!el) return;
    const tdy = Number(today || 0);
    const yst = Number(yesterday || 0);
    const diff = tdy - yst;
    const sign = diff >= 0 ? '+' : '';
    el.textContent = `${t('admin.today')} ${tdy.toLocaleString()} (${sign}${diff.toLocaleString()})`;
    el.classList.remove('stat-up', 'stat-down');
    el.classList.add(diff >= 0 ? 'stat-up' : 'stat-down');
  };

  setChange(viewChangeEl, lastAdminStats.viewToday, lastAdminStats.viewYesterday);
  setChange(userChangeEl, lastAdminStats.userToday, lastAdminStats.userYesterday);
  setChange(commentChangeEl, lastAdminStats.commentToday, lastAdminStats.commentYesterday);
  setChange(postChangeEl, lastAdminStats.publishedPostToday, lastAdminStats.publishedPostYesterday);

  const updatedAt = document.getElementById('dashboardUpdatedAt');
  if (updatedAt) {
    const dt = lastAdminStats.statsUpdatedAt ? new Date(String(lastAdminStats.statsUpdatedAt)) : null;
    const text = dt && !Number.isNaN(dt.getTime())
      ? `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updatedAt.textContent = `${t('admin.period.last30days')} · ${t('admin.updatedAt')} ${text}`;
  }

  updatePendingCommentBadges(lastAdminStats.pendingCommentCount);
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
  if (!confirm(t('admin.confirm.deleteComment'))) return;
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
  const countEl = document.getElementById('dashboardPendingCommentCount');
  if (countEl) countEl.textContent = String(n);
}

function renderAdminCommentsSummary() {
  const countEl = document.getElementById('adminCommentsPendingCount');
  if (!countEl) return;
  const list = Array.isArray(adminCommentsCache) ? adminCommentsCache : [];
  const pending = list.filter(c => c && c.status === 'pending').length;
  countEl.textContent = String(pending);
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
    adminPostTitleIndex = null;
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
    const options = ['<option value="" data-i18n="admin.filter.allCategories">全部分类</option>'].concat(
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
    const statusKey = archived ? 'admin.filter.archived' : (published ? 'admin.filter.published' : 'admin.filter.draft');
    const statusIcon = archived ? '⚠' : (published ? '●' : '○');
    const categoryName = pickFirstText(post.categories) || '文章';
    const dateText = post.date ? new Date(post.date).toLocaleDateString() : '-';

    const publishKey = published ? 'admin.action.toDraft' : 'admin.action.publish';
    const archiveKey = archived ? 'admin.action.unarchive' : 'admin.action.archive';

    const commentCount = getCommentCount(post);
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:.75rem"><div class="article-thumb">📄</div><div style="font-size:13.5px;font-weight:500;color:var(--admin-text)">${escapeHtml(post.title || '')}</div></div></td>
        <td><span class="tag tag-gray" style="font-size:11px">${escapeHtml(categoryName)}</span></td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(statusIcon)} <span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">-</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${commentCount}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${escapeHtml(dateText)}</td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-admin-outline btn-sm" onclick="editPost('${post.filename}')" data-i18n="admin.action.edit">编辑</button>
            <button class="btn btn-admin-outline btn-sm" onclick="togglePublishPost('${post.filename}')" data-i18n="${escapeHtml(publishKey)}">${escapeHtml(t(publishKey))}</button>
            <button class="btn btn-admin-outline btn-sm" onclick="toggleArchivePost('${post.filename}')" data-i18n="${escapeHtml(archiveKey)}">${escapeHtml(t(archiveKey))}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deletePost('${post.filename}')" data-i18n="admin.action.delete">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  applyI18n();

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

    showToast(t('admin.toast.success'));
    await fetchPosts();
    renderFrontendPosts();
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.actionFailed'));
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
      showToast(t('admin.toast.loadPostFailed'));
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
    showToast(t('admin.toast.loadPostFailed'));
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
    showToast(t('admin.toast.titleContentRequired'));
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

      showToast(t('admin.toast.saveSuccess'));
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
      showToast(t('admin.toast.saveSuccess'));
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
    showToast(t('admin.toast.saveRequestError'));
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
    showToast(t('admin.toast.selectNovel'));
    return;
  }
  if (!filename) {
    showToast(t('admin.toast.chapterFilenameRequired'));
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
      if (res.status === 401) {
        handleUnauthorized('登录已失效，请重新登录');
        return;
      }
      showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
      return;
    }

    currentNovelId = novelId;
    currentNovelChapterFile = data.filename || filename;
    currentNovelChapterSha = data.sha || currentNovelChapterSha;
    showToast(t('admin.toast.saveSuccess'));
    frontNovelCache = null;
    await fetchNovels();
    await openNovelChapters(novelId);
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.saveRequestError'));
  }
}

async function deletePost(filename) {
  if (!confirm(t('admin.confirm.deletePost'))) return;
  try {
    const res = await fetch(apiUrl(`/post?filename=${encodeURIComponent(filename)}`), {
      method: 'DELETE',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: `Delete ${filename}` })
    });
    const data = await safeJson(res) || {};
    if (data.success) {
      showToast(t('admin.toast.deleted'));
      if (currentEditingFile === filename) {
        currentEditingFile = null;
        currentEditingSha = null;
        currentEditingDate = null;
      }
      fetchPosts();
    } else {
      showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
    }
  } catch (err) { console.error(err); showToast(t('admin.toast.deleteFailed')); }
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
  const raw = String(markdown || '');
  const text = raw.replace(/^\uFEFF/, '').replace(/^\s+/, '');
  const start = text.match(/^---\r?\n/);
  if (!start) return { frontMatter: {}, body: text };

  const startLen = start[0].length;
  const rest = text.slice(startLen);
  const endMatch = rest.match(/\r?\n---\r?\n/);
  if (!endMatch || endMatch.index == null) return { frontMatter: {}, body: text };

  const endIdx = startLen + endMatch.index;
  const endLen = endMatch[0].length;
  const fmText = text.slice(startLen, endIdx).trim();
  const body = text.slice(endIdx + endLen).replace(/^\r?\n+/, '');
  return { frontMatter: parseFrontMatter(fmText), body };
}

function parseFrontMatter(fmText) {
  const lines = String(fmText || '').split(/\r?\n/);
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
  if (name === 'home' || name === 'about') {
    await applyFrontSettings();
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
        <span class="chapter-toc-num">#</span>${escapeHtml(String(c && c.title ? c.title : c && c.filename ? c.filename : ''))}
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
    
  } catch (err) { showToast(t('admin.toast.chapterLoadFailed')); }
}

async function renderFrontendNovels() {
  try {
    const res = await fetch(apiUrl('/novels'));
    const raw = await safeJson(res);
    if (!res.ok) {
      showToast(raw && raw.error ? `加载小说失败: ${raw.error}` : '加载小说失败');
      return;
    }
    const novels = Array.isArray(raw) ? raw : [];
    frontNovelCache = novels;

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
        const firstChapterTitle = n && n.firstChapterTitle ? String(n.firstChapterTitle) : '';
        const id = n && n.id ? String(n.id) : '';
        const cover = n && n.cover ? String(n.cover) : '';
        const canRead = Boolean(id && firstChapter);
        const click = canRead ? `showPage('chapter', '${id}/${firstChapter}')` : `showToast('${escapeJsString(t('front.novel.noChapters'))}')`;
        return `
          <div class="novel-list-card" onclick="${click}">
            <div class="novel-list-cover" style="background:${getRandomGradient(title)}">
              ${cover ? `<img class="novel-cover-img" src="${escapeHtml(cover)}" alt="">` : ''}
              <div class="novel-list-cover-icon">📖</div>
              <div class="novel-list-cover-overlay"><div class="novel-list-title">${escapeHtml(title)}</div></div>
            </div>
            <div class="novel-list-body">
              <div style="display:flex;align-items:center;justify-content:space-between"><span class="tag tag-blue">${escapeHtml(genre)}</span><span class="tag tag-green" style="font-size:10px">${status === 'finished' ? '已完结' : '连载中'}</span></div>
              ${firstChapterTitle ? `<div style="margin-top:.5rem;color:var(--ink-3);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">开篇：${escapeHtml(firstChapterTitle)}</div>` : ''}
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
        const firstChapterTitle = n && n.firstChapterTitle ? String(n.firstChapterTitle) : '';
        const cover = n && n.cover ? String(n.cover) : '';
        return `
          <div class="novel-card" onclick="showPage('chapter', '${id}/${firstChapter}')">
            <div class="novel-cover">
              ${cover ? `<img class="novel-cover-img" src="${escapeHtml(cover)}" alt="">` : ''}
              <div class="novel-cover-bg">📖</div>
              <div class="novel-cover-title">${escapeHtml(title)}</div>
            </div>
            <div class="novel-body">
              <div class="novel-genre">${escapeHtml(genre)}</div>
              <div class="novel-title">${escapeHtml(title)}</div>
              <div class="novel-stats"><span>${chapters} 章</span>${firstChapterTitle ? `<span style="margin-left:.5rem;color:var(--ink-4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;display:inline-block;vertical-align:bottom">· ${escapeHtml(firstChapterTitle)}</span>` : ''}</div>
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
    currentFrontArticleId = String(filename || '');
    
    // Parse front matter manually since we get raw content
    const content = String(data.content || '');
    const parsed = splitFrontMatter(content);
    const fm = parsed.frontMatter || {};
    let body = parsed.body || '';
    let title = filename.replace('.md', '');
    let date = new Date().toLocaleDateString();
    let tags = [];
    let cover = '';
    
    if (fm.title) title = fm.title;
    if (fm.date) date = new Date(fm.date).toLocaleDateString();
    if (Array.isArray(fm.tags)) tags = fm.tags;
    if (fm.cover) cover = String(fm.cover);
    if (!cover) {
      const cached = Array.isArray(frontPostsCache) ? frontPostsCache.find(p => p && String(p.filename || '') === String(filename)) : null;
      cover = cached && cached.cover ? String(cached.cover) : '';
    }
    currentFrontArticleCover = cover;
    
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
    if (metaItems[2]) {
      const cached = Array.isArray(frontPostsCache) ? frontPostsCache.find(p => p && String(p.filename || '') === String(filename)) : null;
      const views = Number(cached && cached.views ? cached.views : 0);
      metaItems[2].textContent = views ? `👁 ${views.toLocaleString()}` : `👁 --`;
    }
    if (metaItems[3]) metaItems[3].textContent = `💬 --`;
    
    // Update tags
     const tagContainer = document.querySelector('.article-tags');
     tagContainer.innerHTML = tags.map(t => `<span class="tag tag-gray">${escapeHtml(t)}</span>`).join('');
     
     // Load comments
     loadComments(filename);
     trackView('post', filename);
     refreshReactions();

   } catch (err) {
     console.error(err);
     showToast(t('front.article.loadFailed'));
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

  const label = `<div class="media-panel-label">配图与媒体</div>`;
  if (!items.length) {
    const cover = String(currentFrontArticleCover || '').trim();
    if (cover) {
      panel.innerHTML = `${label}<div class="media-item" data-kind="cover"><img class="media-img" src="${escapeHtml(cover)}" alt=""><div class="media-caption">封面</div></div>`;
      const el = panel.querySelector('.media-item[data-kind="cover"]');
      if (el) {
        el.addEventListener('click', () => {
          try { window.open(cover, '_blank'); } catch { }
          scrollToTop();
        });
      }
      return;
    }
    panel.innerHTML = `${label}<div class="media-empty">暂无媒体</div>`;
    return;
  }
  panel.innerHTML = label + items.map((it, i) => {
    if (it.kind === 'img') {
      const src = it.el && it.el.getAttribute ? String(it.el.getAttribute('src') || '') : '';
      const alt = it.el && it.el.getAttribute ? String(it.el.getAttribute('alt') || '') : '';
      const caption = alt ? alt : `图片 ${i + 1}`;
      return `<div class="media-item" data-i="${i}"><img class="media-img" src="${escapeHtml(src)}" alt=""><div class="media-caption">${escapeHtml(caption)}</div></div>`;
    }
    if (it.kind === 'video') {
      const src = it.el && it.el.getAttribute ? String(it.el.getAttribute('src') || '') : '';
      return src
        ? `<div class="media-item" data-i="${i}"><video class="media-img media-video-thumb" muted playsinline preload="metadata" src="${escapeHtml(src)}"></video><div class="media-caption">视频 ${i + 1}</div></div>`
        : `<div class="media-item" data-i="${i}"><div class="media-img">🎬</div><div class="media-caption">视频 ${i + 1}</div></div>`;
    }
    return `<div class="media-item" data-i="${i}"><div class="media-img">🎵</div><div class="media-caption">音频 ${i + 1}</div></div>`;
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
     const metaItems = document.querySelectorAll('.article-meta-item');
     if (metaItems[3] && String(currentFrontArticleId || '') === String(postId || '')) metaItems[3].textContent = `💬 ${comments.length}`;
     
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
   if (!content) return showToast(t('front.comment.empty'));
   
   try {
     const res = await fetch(apiUrl('/comments'), {
       method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ post: postId, content })
     });
     const data = await safeJson(res) || {};
    if (!res.ok) {
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(data && data.error ? `评论提交失败: ${data.error}` : '评论提交失败');
      return;
    }
    if (data && data.success) {
       showToast(t('front.comment.submitted'));
       textarea.value = '';
       loadComments(postId);
      return;
     }
    showToast(data && (data.message || data.error) ? `评论提交失败: ${data.message || data.error}` : '评论提交失败');
   } catch (err) { showToast(t('front.comment.submitFailed')); }
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

function translateFrontLabel(raw) {
  const s = String(raw || '');
  const map = {
    '文章': 'nav.articles',
    '随笔': 'front.tab.essay',
    '评论': 'section.comments',
    '连载中': 'front.novelFilter.ongoing',
    '已完结': 'front.novelFilter.finished',
    '科幻': 'front.genre.scifi',
    '奇幻': 'front.genre.fantasy',
    '现实主义': 'front.genre.realism'
  };
  const key = Object.prototype.hasOwnProperty.call(map, s) ? map[s] : '';
  if (!key) return s;
  return t(key);
}

function renderPostCard(post, badgeText) {
  const title = post && post.title ? String(post.title) : '';
  const filename = post && post.filename ? String(post.filename) : '';
  const dateText = post && post.date ? new Date(post.date).toLocaleDateString() : '';
  const cover = post && post.cover ? String(post.cover) : '';
  const views = Number(post && post.views ? post.views : 0);
  const excerpt = post && typeof post.description === 'string' && post.description.trim()
    ? post.description.trim()
    : t('front.readMore');
  const rawBadge = badgeText || (Array.isArray(post && post.categories) && post.categories.length ? String(post.categories[0]) : t('nav.articles'));
  const badge = translateFrontLabel(rawBadge);

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
          <div class="card-meta"><span>${escapeHtml(dateText)}</span>${views ? `<span>👁 ${escapeHtml(views.toLocaleString())}</span>` : ''}</div>
        </div>
      </div>
    </div>
  `;
}

function normalizePostRefToFilename(postRef) {
  const s = String(postRef || '').trim();
  if (!s) return '';
  const m = s.match(/[A-Za-z0-9][A-Za-z0-9._-]*\.md/i);
  if (m && m[0]) return m[0];
  return s;
}

async function ensureAdminPostTitleIndex() {
  if (adminPostTitleIndex) return adminPostTitleIndex;

  const build = (posts) => {
    const idx = new Map();
    const list = Array.isArray(posts) ? posts : [];
    list.forEach((p) => {
      if (!p || typeof p !== 'object') return;
      const filename = p.filename ? String(p.filename) : '';
      if (!filename) return;
      const title = p.title ? String(p.title) : '';
      idx.set(filename, title.trim() ? title : filename.replace(/\.md$/i, ''));
    });
    return idx;
  };

  if (Array.isArray(adminPostsCache) && adminPostsCache.length) {
    adminPostTitleIndex = build(adminPostsCache);
    return adminPostTitleIndex;
  }

  try {
    const res = await fetch(apiUrl('/posts'), { headers: withAuthHeaders({}) });
    const raw = await safeJson(res);
    adminPostTitleIndex = build(raw);
    return adminPostTitleIndex;
  } catch {
    adminPostTitleIndex = new Map();
    return adminPostTitleIndex;
  }
}

function getAdminPostDisplayTitle(postRef) {
  const filename = normalizePostRefToFilename(postRef);
  if (!filename) return '';
  const idx = adminPostTitleIndex;
  if (idx && typeof idx.get === 'function') {
    return idx.get(filename) || filename.replace(/\.md$/i, '');
  }
  return filename.replace(/\.md$/i, '');
}

async function renderHomeArticles() {
  const grid = document.getElementById('homeArticlesGrid');
  if (!grid) return;
  if (frontHomeTab === 'comment') {
    grid.innerHTML = `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px" data-i18n="front.loading">加载中...</div>`;
    applyI18n();
    const comments = await ensureFrontComments();
    const items = comments.slice(0, 6);
    grid.innerHTML = items.map(c => {
      const postId = c && c.post ? String(c.post) : '';
      const id = c && c.id ? String(c.id) : '';
      const user = c && c.user ? String(c.user) : t('front.anonymous');
      const date = c && c.date ? new Date(c.date).toLocaleDateString() : '';
      const content = c && c.content ? String(c.content) : '';
      const snippet = content.length > 90 ? `${content.slice(0, 90)}…` : content;
      return `
        <div class="article-card" onclick="frontOpenComment('${escapeJsString(postId)}','${escapeJsString(id)}')">
          <div class="card-cover" style="background:${getRandomGradient(user)}">
            <div class="card-category-badge">${escapeHtml(t('section.comments'))}</div>
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
  grid.innerHTML = filtered.slice(0, 6).map(p => renderPostCard(p)).join('') || `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px" data-i18n="front.empty">暂无数据</div>`;
  applyI18n();
}

async function renderArticlesPage() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;
  const pager = document.getElementById('frontArticlesPagination');
  if (frontArticlesTab === 'comment') {
    if (pager) pager.innerHTML = '';
    grid.innerHTML = `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px" data-i18n="front.loading">加载中...</div>`;
    applyI18n();
    const comments = await ensureFrontComments();
    const items = comments.slice(0, 24);
    grid.innerHTML = items.map(c => {
      const postId = c && c.post ? String(c.post) : '';
      const id = c && c.id ? String(c.id) : '';
      const user = c && c.user ? String(c.user) : t('front.anonymous');
      const date = c && c.date ? new Date(c.date).toLocaleDateString() : '';
      const content = c && c.content ? String(c.content) : '';
      const snippet = content.length > 120 ? `${content.slice(0, 120)}…` : content;
      return `
        <div class="article-card" onclick="frontOpenComment('${escapeJsString(postId)}','${escapeJsString(id)}')">
          <div class="card-cover" style="background:${getRandomGradient(user)}">
            <div class="card-category-badge">${escapeHtml(t('section.comments'))}</div>
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
    applyI18n();
    return;
  }

  const filtered = filterPostsByFrontTab(frontPostsCache, frontArticlesTab);
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  frontArticlesPage = Math.min(Math.max(1, frontArticlesPage), pageCount);
  const pageItems = filtered.slice((frontArticlesPage - 1) * pageSize, frontArticlesPage * pageSize);
  grid.innerHTML = pageItems.map(p => renderPostCard(p)).join('') || `<div style="color:var(--ink-4);font-family:'DM Mono',monospace;font-size:12px" data-i18n="front.empty">暂无数据</div>`;
  applyI18n();

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

async function refreshReactions() {
  const id = String(currentFrontArticleId || '').trim();
  if (!id) return;
  try {
    const res = await fetch(apiUrl(`/reactions?kind=post&id=${encodeURIComponent(id)}`), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized('登录已失效，请重新登录');
      }
      return;
    }
    renderReactions(data);
  } catch {
  }
}

function renderReactions(data) {
  const likeCountEl = document.getElementById('likeCount');
  const btnLike = document.getElementById('btnLike');
  const likes = Number(data && data.likes ? data.likes : 0);
  const liked = Boolean(data && data.liked);
  if (likeCountEl) likeCountEl.textContent = likes.toLocaleString();
  if (btnLike) btnLike.classList.toggle('active', liked);
}

async function toggleReaction(action) {
  if (!CURRENT_USER) {
    showPage('login');
    return;
  }
  if (action !== 'like') return;
  const id = String(currentFrontArticleId || '').trim();
  if (!id) {
    showToast(t('admin.toast.needOpenPost'));
    return;
  }
  try {
    const res = await fetch(apiUrl('/reactions'), {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ kind: 'post', id, action })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized('登录已失效，请重新登录');
        return;
      }
      showToast(data && data.error ? `操作失败: ${data.error}` : '操作失败');
      return;
    }
    renderReactions(data);
  } catch {
    showToast(t('admin.toast.actionFailed'));
  }
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
    'linear-gradient(135deg,#0f172a,#2563eb)',
    'linear-gradient(135deg,#0f172a,#06b6d4)',
    'linear-gradient(135deg,#111827,#10b981)',
    'linear-gradient(135deg,#111827,#f59e0b)',
    'linear-gradient(135deg,#111827,#ef4444)',
    'linear-gradient(135deg,#0f172a,#a855f7)',
    'linear-gradient(135deg,#111827,#fb7185)',
    'linear-gradient(135deg,#0b1220,#64748b)'
  ];
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function getRandomIcon(str) {
  const icons = ['🌿', '🔭', '🎬', '🌃', '🎵', '☕', '📚', '💭'];
  return icons[str.length % icons.length];
}

// ── ADMIN ROUTING ──
function showAdminPage(name) {
  // Check auth for admin pages
  if (!CURRENT_USER || CURRENT_USER.role !== 'admin') {
    showToast(t('action.pleaseLogin'));
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
    const titleEl = document.getElementById('settingsSiteTitle');
    const titleJaEl = document.getElementById('settingsSiteTitleJa');
    const descEl = document.getElementById('settingsSiteDescription');
    const descJaEl = document.getElementById('settingsSiteDescriptionJa');
    const authorEl = document.getElementById('settingsAuthorName');
    const authorJaEl = document.getElementById('settingsAuthorNameJa');
    const homeIntroEl = document.getElementById('settingsHomeIntro');
    const homeIntroJaEl = document.getElementById('settingsHomeIntroJa');
    const footerIntroEl = document.getElementById('settingsFooterIntro');
    const footerIntroJaEl = document.getElementById('settingsFooterIntroJa');
    const aboutSubtitleEl = document.getElementById('settingsAboutSubtitle');
    const aboutSubtitleJaEl = document.getElementById('settingsAboutSubtitleJa');
    const aboutTaglineEl = document.getElementById('settingsAboutTagline');
    const aboutTaglineJaEl = document.getElementById('settingsAboutTaglineJa');
    const aboutContentEl = document.getElementById('settingsAboutContent');
    const aboutContentJaEl = document.getElementById('settingsAboutContentJa');
    if (titleEl) titleEl.value = data.title || '';
    if (titleJaEl) titleJaEl.value = data.titleJa || '';
    if (descEl) descEl.value = data.description || '';
    if (descJaEl) descJaEl.value = data.descriptionJa || '';
    if (authorEl) authorEl.value = data.author || '';
    if (authorJaEl) authorJaEl.value = data.authorJa || '';
    if (homeIntroEl) homeIntroEl.value = data.homeIntro || '';
    if (homeIntroJaEl) homeIntroJaEl.value = data.homeIntroJa || '';
    if (footerIntroEl) footerIntroEl.value = data.footerIntro || '';
    if (footerIntroJaEl) footerIntroJaEl.value = data.footerIntroJa || '';
    if (aboutSubtitleEl) aboutSubtitleEl.value = data.aboutSubtitle || '';
    if (aboutSubtitleJaEl) aboutSubtitleJaEl.value = data.aboutSubtitleJa || '';
    if (aboutTaglineEl) aboutTaglineEl.value = data.aboutTagline || '';
    if (aboutTaglineJaEl) aboutTaglineJaEl.value = data.aboutTaglineJa || '';
    if (aboutContentEl) aboutContentEl.value = data.aboutContent || '';
    if (aboutContentJaEl) aboutContentJaEl.value = data.aboutContentJa || '';
    const toggle = document.querySelector('.settings-toggle');
    if (toggle) {
      const on = data.allowRegister !== false;
      toggle.classList.toggle('on', on);
    }
  } catch (err) { console.error(err); }
}

async function saveSettings() {
  const titleEl = document.getElementById('settingsSiteTitle');
  const titleJaEl = document.getElementById('settingsSiteTitleJa');
  const descEl = document.getElementById('settingsSiteDescription');
  const descJaEl = document.getElementById('settingsSiteDescriptionJa');
  const authorEl = document.getElementById('settingsAuthorName');
  const authorJaEl = document.getElementById('settingsAuthorNameJa');
  const homeIntroEl = document.getElementById('settingsHomeIntro');
  const homeIntroJaEl = document.getElementById('settingsHomeIntroJa');
  const footerIntroEl = document.getElementById('settingsFooterIntro');
  const footerIntroJaEl = document.getElementById('settingsFooterIntroJa');
  const aboutSubtitleEl = document.getElementById('settingsAboutSubtitle');
  const aboutSubtitleJaEl = document.getElementById('settingsAboutSubtitleJa');
  const aboutTaglineEl = document.getElementById('settingsAboutTagline');
  const aboutTaglineJaEl = document.getElementById('settingsAboutTaglineJa');
  const aboutContentEl = document.getElementById('settingsAboutContent');
  const aboutContentJaEl = document.getElementById('settingsAboutContentJa');
  const toggle = document.querySelector('.settings-toggle');
  const settings = {
    title: titleEl ? titleEl.value : '',
    titleJa: titleJaEl ? titleJaEl.value : '',
    description: descEl ? descEl.value : '',
    descriptionJa: descJaEl ? descJaEl.value : '',
    author: authorEl ? authorEl.value : '',
    authorJa: authorJaEl ? authorJaEl.value : '',
    homeIntro: homeIntroEl ? homeIntroEl.value : '',
    homeIntroJa: homeIntroJaEl ? homeIntroJaEl.value : '',
    footerIntro: footerIntroEl ? footerIntroEl.value : '',
    footerIntroJa: footerIntroJaEl ? footerIntroJaEl.value : '',
    aboutSubtitle: aboutSubtitleEl ? aboutSubtitleEl.value : '',
    aboutSubtitleJa: aboutSubtitleJaEl ? aboutSubtitleJaEl.value : '',
    aboutTagline: aboutTaglineEl ? aboutTaglineEl.value : '',
    aboutTaglineJa: aboutTaglineJaEl ? aboutTaglineJaEl.value : '',
    aboutContent: aboutContentEl ? aboutContentEl.value : '',
    aboutContentJa: aboutContentJaEl ? aboutContentJaEl.value : '',
    allowRegister: toggle ? toggle.classList.contains('on') : true
  };
  
  try {
    const res = await fetch(apiUrl('/settings'), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings)
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(data && data.error ? `${t('admin.toast.saveFailed')}: ${data.error}` : t('admin.toast.saveFailed'));
      return;
    }
    showToast(t('admin.toast.settingsSaved'));
    await applyFrontSettings();
  } catch (err) { showToast(t('admin.toast.saveError')); }
}

async function fetchAdminComments() {
  try {
    const res = await fetch(apiUrl('/comments'), { headers: withAuthHeaders({}) });
    const raw = await safeJson(res);
    if (!res.ok) {
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(raw && raw.error ? `加载评论失败: ${raw.error}` : '加载评论失败');
      return;
    }
    adminCommentsCache = Array.isArray(raw) ? raw : [];
    await ensureAdminPostTitleIndex();
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

  const pendingCountEl = document.getElementById('adminCommentsPendingCount');
  if (pendingCountEl) pendingCountEl.textContent = String(pending);
  updatePendingCommentBadges(pending);

  const oldCards = container.querySelectorAll('.comment-mod-card');
  oldCards.forEach(c => c.remove());

  let filtered = list.slice();
  if (adminCommentFilter !== 'all') filtered = filtered.filter(c => c && c.status === adminCommentFilter);

  filtered.forEach(c => {
    const card = document.createElement('div');
    card.className = 'comment-mod-card';
    card.id = `comment-${c && c.id ? String(c.id) : ''}`;

    const userName = c && c.user ? String(c.user) : t('admin.anonymous');
    const statusKey = c.status === 'pending' ? 'admin.filter.pending' : (c.status === 'approved' ? 'admin.filter.approved' : 'admin.filter.hidden');
    const statusBadge = c.status === 'pending'
      ? `<span class="status-badge status-pending">⏳ <span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span>`
      : c.status === 'approved'
        ? `<span class="status-badge status-published"><span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span>`
        : `<span class="status-badge status-hidden">⚠ <span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span>`;

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
        <div class="comment-mod-target" title="${escapeHtml(normalizePostRefToFilename(c.post))}">📝 <span data-i18n="admin.comment.postLabel">文章</span>：${escapeHtml(getAdminPostDisplayTitle(c.post))}</div>
        ${window.DOMPurify ? DOMPurify.sanitize(String(c.content || '')) : escapeHtml(String(c.content || ''))}
      </div>
      <div class="comment-mod-actions">
        ${c.status !== 'approved' ? `<button class="btn btn-admin btn-sm" onclick="moderateComment('${c.id}', 'approved')" data-i18n="admin.action.approve">通过</button>` : ''}
        ${c.status !== 'hidden' ? `<button class="btn btn-sm" style="color:#f87171;border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="moderateComment('${c.id}', 'hidden')" data-i18n="admin.action.hide">隐藏</button>` : ''}
        <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);background:transparent;border-radius:5px;padding:.3rem .7rem;font-size:12px" onclick="deleteComment('${c.id}')" data-i18n="admin.action.delete">删除</button>
      </div>
    `;

    if (c.status === 'pending') {
      card.style.borderColor = 'rgba(251,191,36,.3)';
      const header = card.querySelector('.comment-mod-header');
      if (header) header.style.background = 'rgba(251,191,36,.05)';
    }
    container.appendChild(card);
  });
  applyI18n();

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
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(raw && raw.error ? `加载用户失败: ${raw.error}` : '加载用户失败');
      return;
    }
    adminUsersCache = Array.isArray(raw) ? raw : [];
    initAdminUsersUI();
    renderAdminUsers();
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.loadUsersFailed'));
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

    const roleKey = role === 'admin' ? 'admin.role.admin' : 'admin.role.user';
    const roleBadge = role === 'admin'
      ? `<span class="status-badge status-published"><span data-i18n="${escapeHtml(roleKey)}">${escapeHtml(t(roleKey))}</span></span>`
      : `<span class="status-badge status-draft"><span data-i18n="${escapeHtml(roleKey)}">${escapeHtml(t(roleKey))}</span></span>`;

    const statusKey = status === 'banned' ? 'admin.filter.banned' : 'admin.filter.active';
    const statusBadge = status === 'banned'
      ? `<span class="status-badge status-hidden"><span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span>`
      : `<span class="status-badge status-published"><span data-i18n="${escapeHtml(statusKey)}">${escapeHtml(t(statusKey))}</span></span>`;

    const toggleTo = role === 'admin' ? 'user' : 'admin';
    const toggleKey = role === 'admin' ? 'admin.user.demote' : 'admin.user.promote';

    const banTo = status === 'banned' ? 'active' : 'banned';
    const banKey = status === 'banned' ? 'admin.user.unban' : 'admin.user.ban';

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
            <button class="btn btn-admin-outline btn-sm" onclick="setUserName('${id}', '${escapeJsString(name)}')" data-i18n="admin.user.rename">改昵称</button>
            <button class="btn btn-admin-outline btn-sm" onclick="setUserRole('${id}', '${toggleTo}')" data-i18n="${escapeHtml(toggleKey)}">${escapeHtml(t(toggleKey))}</button>
            <button class="btn btn-admin-outline btn-sm" onclick="setUserStatus('${id}', '${banTo}')" data-i18n="${escapeHtml(banKey)}">${escapeHtml(t(banKey))}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deleteUser('${id}')" data-i18n="admin.action.delete">删除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  applyI18n();
}

async function setUserName(id, currentName) {
  const next = prompt(t('admin.prompt.renameUser'), String(currentName || '').trim());
  if (next == null) return;
  const name = String(next).trim();
  if (!name) return showToast(t('admin.error.nameEmpty'));
  if (name.length > 30) return showToast(t('admin.error.nameTooLong'));
  try {
    const res = await fetch(apiUrl(`/user?id=${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `${t('admin.toast.actionFailed')}: ${data.error}` : t('admin.toast.actionFailed'));
      return;
    }
    showToast(t('admin.toast.nameUpdated'));
    await fetchAdminUsers();
  } catch {
    showToast(t('admin.toast.actionFailed'));
  }
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
      showToast(data.error ? `${t('admin.toast.actionFailed')}: ${data.error}` : t('admin.toast.actionFailed'));
      return;
    }
    await fetchAdminUsers();
    showToast(t('admin.toast.success'));
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.actionFailed'));
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
      showToast(data.error ? `${t('admin.toast.actionFailed')}: ${data.error}` : t('admin.toast.actionFailed'));
      return;
    }
    await fetchAdminUsers();
    showToast(t('admin.toast.success'));
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.actionFailed'));
  }
}

async function deleteUser(id) {
  if (!confirm(t('admin.confirm.deleteUser'))) return;
  try {
    const res = await fetch(apiUrl(`/user?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `${t('admin.toast.deleteFailed')}: ${data.error}` : t('admin.toast.deleteFailed'));
      return;
    }
    await fetchAdminUsers();
    showToast(t('admin.toast.deleted'));
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.deleteFailed'));
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
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(data.error ? `${t('admin.toast.actionFailed')}: ${data.error}` : t('admin.toast.actionFailed'));
      return;
    }
    await fetchAdminComments();
    showToast(t('admin.toast.success'));
  } catch (err) { showToast(t('admin.toast.actionFailed')); }
}

async function deleteComment(id) {
  try {
    const res = await fetch(apiUrl(`/comment?id=${encodeURIComponent(id)}`), { method: 'DELETE', headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      if (res.status === 401) return handleUnauthorized('登录已失效，请重新登录');
      showToast(data.error ? `${t('admin.toast.deleteFailed')}: ${data.error}` : t('admin.toast.deleteFailed'));
      return;
    }
    await fetchAdminComments();
    showToast(t('admin.toast.deleted'));
  } catch (err) { showToast(t('admin.toast.actionFailed')); }
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
        showToast(t('admin.toast.uploadSuccess'));
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
        showToast(t('admin.toast.uploadFailed'));
      }
    } catch (err) { showToast(t('admin.toast.uploadError')); }
  };
  reader.readAsDataURL(file);
}

async function createNovel() {
  const title = prompt(t('admin.prompt.novelTitle'));
  if (!title) return;
  
  try {
    const res = await fetch(apiUrl('/novel'), {
      method: 'POST',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, genre: '未分类' })
    });
    const data = await safeJson(res) || {};
    if (data.success) {
      showToast(t('admin.toast.createSuccess'));
      cachedNovelsForEditor = null;
      fetchNovels();
    } else {
      showToast(`${t('admin.toast.createFailed')}: ${data.error}`);
    }
  } catch (err) { showToast(t('admin.toast.requestError')); }
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
        <td><span class="tag tag-blue" style="font-size:11px">${escapeHtml(n.genre || t('admin.genre.uncategorized'))}</span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${n.chapters}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">--</td>
        <td><span class="status-badge ${n.status === 'finished' ? 'status-completed' : 'status-ongoing'}">${n.status === 'finished' ? '✓ ' : '● '}<span data-i18n="${escapeHtml(n.status === 'finished' ? 'admin.novel.statusBadge.finished' : 'admin.novel.statusBadge.ongoing')}">${escapeHtml(t(n.status === 'finished' ? 'admin.novel.statusBadge.finished' : 'admin.novel.statusBadge.ongoing'))}</span></span></td>
        <td style="font-family:'DM Mono',monospace;font-size:12px;color:var(--admin-muted)">${new Date(n.created || Date.now()).toLocaleDateString()}</td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn btn-admin-outline btn-sm" onclick="openNovelChapters('${n.id}')" data-i18n="admin.novel.manageChapters">管理章节</button>
            <button class="btn btn-admin-outline btn-sm" onclick="editNovelMeta('${n.id}')" data-i18n="admin.action.edit">编辑</button>
            <button class="btn btn-admin-outline btn-sm" onclick="toggleNovelStatus('${n.id}', '${n.status === 'finished' ? 'ongoing' : 'finished'}')" data-i18n="${escapeHtml(n.status === 'finished' ? 'admin.novel.setOngoing' : 'admin.novel.setFinished')}">${escapeHtml(t(n.status === 'finished' ? 'admin.novel.setOngoing' : 'admin.novel.setFinished'))}</button>
            <button class="btn btn-sm" style="color:var(--red);border:1px solid rgba(239,68,68,.3);border-radius:5px;padding:.3rem .7rem;font-size:12px;background:transparent" onclick="deleteNovel('${n.id}')" data-i18n="admin.action.delete">删除</button>
          </div>
        </td>
      </tr>
    `).join('');
    applyI18n();
  } catch (err) { console.error(err); }
}

async function editNovelMeta(novelId) {
  try {
    const res = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), { headers: withAuthHeaders({}) });
    const data = await safeJson(res) || {};
    if (!res.ok) {
      showToast(data.error ? `${t('admin.toast.loadFailed')}: ${data.error}` : t('admin.toast.loadFailed'));
      return;
    }
    openNovelMetaModal(novelId, data.meta || {});
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.loadFailed'));
  }
}

function openNovelMetaModal(novelId, meta) {
  currentNovelMetaId = novelId;
  const modal = document.getElementById('novelMetaModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const titleEl = document.getElementById('novelMetaTitle');
  const genreEl = document.getElementById('novelMetaGenre');
  const statusEl = document.getElementById('novelMetaStatus');
  const coverEl = document.getElementById('novelMetaCover');
  if (titleEl) titleEl.value = meta && meta.title ? String(meta.title) : '';
  if (genreEl) genreEl.value = meta && meta.genre ? String(meta.genre) : '未分类';
  if (statusEl) statusEl.value = meta && meta.status ? String(meta.status) : 'ongoing';
  if (coverEl) coverEl.value = meta && meta.cover ? String(meta.cover) : '';
  syncNovelCoverPreview();
}

function closeNovelMetaModal() {
  const modal = document.getElementById('novelMetaModal');
  if (modal) modal.classList.add('hidden');
  currentNovelMetaId = null;
}

function syncNovelCoverPreview() {
  const coverEl = document.getElementById('novelMetaCover');
  const preview = document.getElementById('novelMetaCoverPreview');
  if (!preview) return;
  const url = coverEl ? String(coverEl.value || '').trim() : '';
  if (url) {
    preview.removeAttribute('data-i18n');
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
  } else {
    preview.setAttribute('data-i18n', 'admin.novel.noCover');
    preview.textContent = t('admin.novel.noCover');
  }
  applyI18n();
}

async function uploadNovelCoverFile(file) {
  if (!file) return;
  if (!String(file.type || '').startsWith('image/')) {
    showToast(t('admin.toast.selectImage'));
    return;
  }
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
      if (!res.ok || !data.success) {
        showToast(data && data.error ? `${t('admin.toast.uploadFailed')}: ${data.error}` : t('admin.toast.uploadFailed'));
        return;
      }
      const coverEl = document.getElementById('novelMetaCover');
      if (coverEl) coverEl.value = String(data.url || '');
      syncNovelCoverPreview();
      showToast(t('admin.toast.uploadSuccess'));
    } catch (err) {
      showToast(t('admin.toast.uploadError'));
    }
  };
  reader.readAsDataURL(file);
}

async function saveNovelMetaModal() {
  if (!currentNovelMetaId) return;
  const titleEl = document.getElementById('novelMetaTitle');
  const genreEl = document.getElementById('novelMetaGenre');
  const statusEl = document.getElementById('novelMetaStatus');
  const coverEl = document.getElementById('novelMetaCover');

  const title = titleEl ? String(titleEl.value || '').trim() : '';
  const genre = genreEl ? String(genreEl.value || '').trim() : '未分类';
  const status = statusEl ? String(statusEl.value || '').trim() : 'ongoing';
  const cover = coverEl ? String(coverEl.value || '').trim() : '';

  if (!title) {
    showToast(t('admin.error.novelTitleRequired'));
    return;
  }

  try {
    const put = await fetch(apiUrl(`/novel?id=${encodeURIComponent(currentNovelMetaId)}`), {
      method: 'PUT',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, genre, status, cover })
    });
    const putData = await safeJson(put) || {};
    if (!put.ok) {
      showToast(putData.error ? `${t('admin.toast.saveFailed')}: ${putData.error}` : t('admin.toast.saveFailed'));
      return;
    }
    showToast(t('admin.toast.saveSuccess'));
    closeNovelMetaModal();
    cachedNovelsForEditor = null;
    frontNovelCache = null;
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.saveFailed'));
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
      showToast(data.error ? `${t('admin.toast.actionFailed')}: ${data.error}` : t('admin.toast.actionFailed'));
      return;
    }
    showToast(t('admin.toast.success'));
    cachedNovelsForEditor = null;
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.actionFailed'));
  }
}

async function deleteNovel(novelId) {
  if (!confirm(t('admin.confirm.deleteNovel'))) return;
  try {
    const del = await fetch(apiUrl(`/novel?id=${encodeURIComponent(novelId)}`), {
      method: 'DELETE',
      headers: withAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const data = await safeJson(del) || {};
    if (!del.ok) {
      showToast(data.error ? `${t('admin.toast.deleteFailed')}: ${data.error}` : t('admin.toast.deleteFailed'));
      return;
    }
    showToast(t('admin.toast.deleted'));
    cachedNovelsForEditor = null;
    const card = document.getElementById('novelChaptersCard');
    if (card) card.style.display = 'none';
    await fetchNovels();
  } catch (err) {
    console.error(err);
    showToast(t('admin.toast.deleteFailed'));
  }
}

async function openNovelChapters(novelId) {
  currentNovelId = novelId;
  currentNovelChapterFile = null;
  currentNovelChapterSha = null;

  const card = document.getElementById('novelChaptersCard');
  if (!card) {
    showToast(t('admin.error.missingChapterPanel'));
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

  const res = await fetch(apiUrl(`/novel-chapter?novelId=${encodeURIComponent(currentNovelId)}`), { headers: withAuthHeaders({}) });
  const data = await safeJson(res) || {};
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized('登录已失效，请重新登录');
      return;
    }
    const msg = data && (data.error || data.message) ? String(data.error || data.message) : t('admin.loadFailed');
    showToast(`${t('admin.novel.chapterListLoadFailed')}: ${msg}`);
    listEl.innerHTML = `<div style="color:var(--admin-muted);font-size:13px;padding:.5rem 0">${escapeHtml(msg)}</div>`;
    titleEl.textContent = t('admin.section.chapterManage');
    return;
  }
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  titleEl.textContent = data.novelTitle ? `${t('admin.section.chapterManage')} · ${data.novelTitle}` : t('admin.section.chapterManage');

  listEl.innerHTML = chapters.length
    ? chapters.map(c => `<div class="chapter-toc-item" onclick="loadNovelChapterForEdit('${currentNovelId}','${c.filename}')">${escapeHtml(c.title || c.filename)}</div>`).join('')
    : `<div style="color:var(--admin-muted);font-size:13px;padding:.5rem 0" data-i18n="admin.novel.noChapters">暂无章节</div>`;
  applyI18n();

  const filenameInput = document.getElementById('novelChapterFilename');
  const titleInput = document.getElementById('novelChapterTitle');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = '';
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';
}

async function newNovelChapter() {
  if (!currentNovelId) return;
  const filename = prompt(t('admin.prompt.chapterFilename'));
  if (!filename) return;
  const normalized = filename.endsWith('.md') ? filename : `${filename}.md`;

  currentNovelChapterFile = normalized;
  currentNovelChapterSha = null;
  currentNovelChapterTitle = '';

  const filenameInput = document.getElementById('novelChapterFilename');
  const titleInput = document.getElementById('novelChapterTitle');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = normalized;
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';
}

async function loadNovelChapterForEdit(novelId, chapterFile) {
  currentNovelId = novelId;
  currentNovelChapterFile = chapterFile;
  currentNovelChapterSha = null;
  currentNovelChapterTitle = '';

  const filenameInput = document.getElementById('novelChapterFilename');
  if (filenameInput) filenameInput.value = chapterFile;
  const titleInput = document.getElementById('novelChapterTitle');

  const res = await fetch(apiUrl(`/novel-chapter?novelId=${encodeURIComponent(novelId)}&chapterFile=${encodeURIComponent(chapterFile)}`), { headers: withAuthHeaders({}) });
  const data = await safeJson(res) || {};
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized('登录已失效，请重新登录');
      return;
    }
    showToast(data && data.error ? `加载失败: ${data.error}` : '加载失败');
    return;
  }
  const contentInput = document.getElementById('novelChapterContent');
  if (contentInput) contentInput.value = String(data.content || '');
  const title = data && data.title ? String(data.title) : '';
  currentNovelChapterTitle = title;
  if (titleInput) titleInput.value = title;
  currentNovelChapterSha = data.sha || null;
}

async function saveNovelChapter() {
  if (!currentNovelId) return;
  const filenameInput = document.getElementById('novelChapterFilename');
  const titleInput = document.getElementById('novelChapterTitle');
  const contentInput = document.getElementById('novelChapterContent');
  const filename = filenameInput ? filenameInput.value.trim() : '';
  const title = titleInput ? titleInput.value.trim() : '';
  const content = contentInput ? contentInput.value : '';
  if (!filename) {
    showToast(t('admin.toast.chapterFilenameRequired'));
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
      title,
      content,
      sha: currentNovelChapterSha || undefined
    })
  });
  const data = await safeJson(res) || {};
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized('登录已失效，请重新登录');
      return;
    }
    showToast(data.error ? `保存失败: ${data.error}` : '保存失败');
    return;
  }

  currentNovelChapterFile = data.filename || filename;
  currentNovelChapterSha = data.sha || currentNovelChapterSha;
  currentNovelChapterTitle = title;
  showToast(t('admin.toast.saveSuccess'));
  frontNovelCache = null;
  await refreshNovelChaptersList();
}

async function deleteNovelChapter() {
  if (!currentNovelId || !currentNovelChapterFile) {
    showToast(t('admin.toast.selectChapterFirst'));
    return;
  }
  if (!confirm(t('admin.confirm.deleteChapter'))) return;

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
    if (res.status === 401) {
      handleUnauthorized('登录已失效，请重新登录');
      return;
    }
    showToast(data.error ? `删除失败: ${data.error}` : '删除失败');
    return;
  }

  currentNovelChapterFile = null;
  currentNovelChapterSha = null;
  currentNovelChapterTitle = '';
  const filenameInput = document.getElementById('novelChapterFilename');
  const titleInput = document.getElementById('novelChapterTitle');
  const contentInput = document.getElementById('novelChapterContent');
  if (filenameInput) filenameInput.value = '';
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';
  showToast(t('admin.toast.deleted'));
  frontNovelCache = null;
  await refreshNovelChaptersList();
}

// ── MODE SWITCH ──
function setMode(mode) {
  if (mode === 'admin' && (!CURRENT_USER || CURRENT_USER.role !== 'admin')) {
    showToast(t('admin.toast.needAdmin'));
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
window.toggleReaction = toggleReaction;
window.openFrontSearch = openFrontSearch;
window.closeFrontSearch = closeFrontSearch;
window.frontSearchOpenArticle = frontSearchOpenArticle;
window.scrollToTop = scrollToTop;
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
window.closeNovelMetaModal = closeNovelMetaModal;
window.saveNovelMetaModal = saveNovelMetaModal;
window.uploadNovelCoverFile = uploadNovelCoverFile;
window.syncNovelCoverPreview = syncNovelCoverPreview;
window.toggleNovelStatus = toggleNovelStatus;
window.deleteNovel = deleteNovel;
window.openNovelChapters = openNovelChapters;
window.newNovelChapter = newNovelChapter;
window.saveNovelChapter = saveNovelChapter;
window.deleteNovelChapter = deleteNovelChapter;
window.loadNovelChapterForEdit = loadNovelChapterForEdit;
window.toggleTheme = toggleTheme;
window.toggleLang = toggleLang;
window.showToast = showToast;
window.moderateComment = moderateComment;
window.deleteComment = deleteComment;
window.submitComment = submitComment;
window.fetchAdminUsers = fetchAdminUsers;
window.setUserName = setUserName;
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
