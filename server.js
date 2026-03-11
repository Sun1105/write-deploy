import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Configuration
const POSTS_DIR = path.join(__dirname, 'source', '_posts');
const NOVELS_DIR = path.join(__dirname, 'source', '_novels');
const COMMENTS_FILE = path.join(__dirname, 'source', '_data', 'comments.json');
const CONFIG_FILE = path.join(__dirname, '_config.yml');

const USER_CREDENTIALS = {
    username: 'sun·1105',
    password: '521xiaoyue'
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/images', express.static(path.join(__dirname, 'source', 'images')));

// Helper: Ensure directory exists
[POSTS_DIR, NOVELS_DIR, path.dirname(COMMENTS_FILE)].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Helper: Read/Write Comments
const getComments = () => {
    if (!fs.existsSync(COMMENTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
    } catch (e) { return []; }
};
const saveComments = (comments) => {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
};


// --- Auth Routes ---

app.post('/api/login', (req, res) => {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    
    if (username === USER_CREDENTIALS.username && password === USER_CREDENTIALS.password) {
        console.log('Login success');
        // Simple token for demo purposes (in production use JWT)
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
        res.json({ success: true, token, user: { name: '某位作者', role: 'Administrator' } });
    } else {
        console.log('Login failed. Expected:', USER_CREDENTIALS, 'Received:', { username, password });
        res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
});

// --- Content Routes ---

// Get Stats (Dashboard)
app.get('/api/stats', (req, res) => {
    try {
        const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
        res.json({
            postCount: files.length,
            // Mock other stats for demo
            viewCount: 28451,
            commentCount: 342,
            userCount: 1284
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get All Posts (List)
app.get('/api/posts', (req, res) => {
    try {
        const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
        const posts = files.map(filename => {
            const filePath = path.join(POSTS_DIR, filename);
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);
            const stat = fs.statSync(filePath);
            
            return {
                filename,
                title: parsed.data.title || filename.replace('.md', ''),
                date: parsed.data.date || stat.birthtime,
                tags: parsed.data.tags || [],
                categories: parsed.data.categories || [],
                published: parsed.data.published !== false
            };
        });
        
        // Sort by date desc
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Get Single Post (Edit)
app.get('/api/post/:filename', (req, res) => {
    try {
        const filePath = path.join(POSTS_DIR, req.params.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        // We return raw content so the editor can show front-matter too if needed,
        // or we can parse it. For simplicity, let's return raw content for the editor.
        res.json({ content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read post' });
    }
});

app.get('/api/post', (req, res) => {
    try {
        const filename = req.query.filename;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });
        const filePath = path.join(POSTS_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Post not found' });
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read post' });
    }
});

// Create New Post
app.post('/api/post', (req, res) => {
    try {
        const { title, content, filename: requestedFilename } = req.body;
        const safeTitle = String(title || '').replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-').substring(0, 50);
        const filename = requestedFilename && typeof requestedFilename === 'string'
          ? requestedFilename
          : `${Date.now()}-${safeTitle || 'untitled'}.md`;
        const filePath = path.join(POSTS_DIR, filename);
        
        // Construct file content with front matter if not present
        let fileContent = content;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Missing content' });
        }
        if (!content.startsWith('---')) {
            fileContent = `---
title: ${title}
date: ${new Date().toISOString()}
tags: []
categories: []
---

${content}`;
        }
        
        fs.writeFileSync(filePath, fileContent, 'utf-8');
        res.json({ success: true, filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// Update Post
app.put('/api/post/:filename', (req, res) => {
    try {
        const filePath = path.join(POSTS_DIR, req.params.filename);
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Missing content' });
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

app.put('/api/post', (req, res) => {
    try {
        const filename = req.query.filename;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'Missing content' });
        }
        const filePath = path.join(POSTS_DIR, filename);
        fs.writeFileSync(filePath, content, 'utf-8');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Delete Post
app.delete('/api/post/:filename', (req, res) => {
    try {
        const filePath = path.join(POSTS_DIR, req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

app.delete('/api/post', (req, res) => {
    try {
        const filename = req.query.filename;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });
        const filePath = path.join(POSTS_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// --- Settings Routes ---

app.get('/api/settings', (req, res) => {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return res.json({});
        const config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        res.json({
            title: config.title,
            subtitle: config.subtitle,
            description: config.description,
            author: config.author,
            url: config.url
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

app.put('/api/settings', (req, res) => {
    try {
        if (!fs.existsSync(CONFIG_FILE)) return res.status(404).json({ error: 'Config not found' });
        let config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        
        // Update fields
        const { title, subtitle, description, author } = req.body;
        if (title) config.title = title;
        if (subtitle) config.subtitle = subtitle;
        if (description) config.description = description;
        if (author) config.author = author;
        
        fs.writeFileSync(CONFIG_FILE, yaml.dump(config));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// --- Comments Routes ---

app.get('/api/comments', (req, res) => {
    const { post } = req.query;
    let comments = getComments();
    if (post) {
        comments = comments.filter(c => c.post === post);
    }
    // Sort by date desc
    comments.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(comments);
});

app.post('/api/comments', (req, res) => {
    const { post, content, user } = req.body;
    const comments = getComments();
    const newComment = {
        id: Date.now().toString(),
        post,
        content,
        user: user || 'Anonymous',
        date: new Date().toISOString(),
        status: 'pending' // Default to pending
    };
    comments.push(newComment);
    saveComments(comments);
    res.json({ success: true, comment: newComment });
});

app.put('/api/comment/:id', (req, res) => {
    const { status } = req.body;
    const comments = getComments();
    const comment = comments.find(c => c.id === req.params.id);
    if (comment) {
        if (status) comment.status = status;
        saveComments(comments);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Comment not found' });
    }
});

app.put('/api/comment', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { status } = req.body;
    const comments = getComments();
    const comment = comments.find(c => c.id === id);
    if (comment) {
        if (status) comment.status = status;
        saveComments(comments);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Comment not found' });
    }
});

app.delete('/api/comment/:id', (req, res) => {
    let comments = getComments();
    comments = comments.filter(c => c.id !== req.params.id);
    saveComments(comments);
    res.json({ success: true });
});

app.delete('/api/comment', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    let comments = getComments();
    comments = comments.filter(c => c.id !== id);
    saveComments(comments);
    res.json({ success: true });
});

// --- Upload Route ---

app.post('/api/upload', (req, res) => {
    try {
        const { image, filename } = req.body; // image is base64 string
        if (!image || !filename) return res.status(400).json({ error: 'Missing image data' });
        
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return res.status(400).json({ error: 'Invalid base64 string' });
        
        const buffer = Buffer.from(matches[2], 'base64');
        const uploadDir = path.join(__dirname, 'source', 'images');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        const safeName = filename.replace(/[^a-z0-9.]/gi, '_');
        const filePath = path.join(uploadDir, safeName);
        fs.writeFileSync(filePath, buffer);
        
        res.json({ success: true, url: `/images/${safeName}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// --- Novel Routes ---

app.get('/api/novels', (req, res) => {
    try {
        const novels = fs.readdirSync(NOVELS_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const novelPath = path.join(NOVELS_DIR, dirent.name);
                const metaFile = path.join(novelPath, 'meta.json');
                let meta = { title: dirent.name };
                if (fs.existsSync(metaFile)) {
                    meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                }
                // Count chapters and get first
                const chapterFiles = fs.readdirSync(novelPath).filter(f => f.endsWith('.md'));
                const chapters = chapterFiles.length;
                const firstChapter = chapterFiles.length > 0 ? chapterFiles[0] : null;
                return { ...meta, id: dirent.name, chapters, firstChapter };
            });
        res.json(novels);
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/novel', (req, res) => {
    const { title, genre } = req.body;
    const id = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const novelPath = path.join(NOVELS_DIR, id);
    if (!fs.existsSync(novelPath)) {
        fs.mkdirSync(novelPath);
        fs.writeFileSync(path.join(novelPath, 'meta.json'), JSON.stringify({
            title, genre, status: 'ongoing', created: new Date()
        }));
        res.json({ success: true, id });
    } else {
        res.status(400).json({ error: 'Novel exists' });
    }
});

app.get('/api/novel/:id/chapter/:file', (req, res) => {
    try {
        const { id, file } = req.params;
        const novelPath = path.join(NOVELS_DIR, id);
        const filePath = path.join(novelPath, file);
        
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Chapter not found' });
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const meta = JSON.parse(fs.readFileSync(path.join(novelPath, 'meta.json'), 'utf-8'));
        
        // Get all chapters for TOC
        const chapters = fs.readdirSync(novelPath)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
                filename: f,
                title: f.replace('.md', '') // Simplified title extraction
            }));
            
        res.json({
            novelTitle: meta.title,
            title: file.replace('.md', ''),
            content,
            chapters
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load chapter' });
    }
});

app.get('/api/novel-chapter', (req, res) => {
    try {
        const id = req.query.novelId;
        const file = req.query.chapterFile;
        if (!id || !file) return res.status(400).json({ error: 'Missing novelId or chapterFile' });
        const novelPath = path.join(NOVELS_DIR, id);
        const filePath = path.join(novelPath, file);

        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Chapter not found' });

        const content = fs.readFileSync(filePath, 'utf-8');
        const meta = JSON.parse(fs.readFileSync(path.join(novelPath, 'meta.json'), 'utf-8'));

        const chapters = fs.readdirSync(novelPath)
            .filter(f => f.endsWith('.md'))
            .map(f => ({
                filename: f,
                title: f.replace('.md', '')
            }));

        res.json({
            novelTitle: meta.title,
            title: file.replace('.md', ''),
            content,
            chapters
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load chapter' });
    }
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
    } else {
        console.error('Server error:', e);
    }
});

// Prevent process from exiting
process.on('SIGINT', () => {
    console.log('Server stopping...');
    process.exit();
});

setInterval(() => {
    // Keep event loop alive
}, 10000);
