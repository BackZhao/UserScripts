// ==UserScript==
// @name         TMDB 搜索结果一键复制 ID
// @namespace    https://nasctl.com/
// @version      1.1.20261008
// @description  在 TMDB 搜索页面的每个结果旁添加复制 TMDB ID 按钮
// @author       you
// @match        https://www.themoviedb.org/search*
// @grant        GM_setClipboard
// @license      MIT
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/BackZhao/UserScripts/master/TmdbCopyId.user.js
// @updateURL    https://raw.githubusercontent.com/BackZhao/UserScripts/master/TmdbCopyId.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const PROCESSED_ATTR = 'data-tmdb-id-btn-added';

    // 从 href 中提取 TMDB ID 和类型
    function parseHref(href) {
        if (!href) return null;
        const m = href.match(/\/(tv|movie|person|collection|company|keyword|network)\/(\d+)/);
        if (!m) return null;
        return { type: m[1], id: m[2] };
    }

    function createCopyButton(id, type) {
        const typeMap = {
            tv: 'TV', movie: '电影', person: '人员',
            collection: '合集', company: '公司', keyword: '关键词', network: '平台'
        };
        const btn = document.createElement('button');
        btn.textContent = `复制 ${id}`;
        btn.title = `复制 TMDB ID (${typeMap[type] || type})`;
        btn.style.cssText = 'display:inline-block;padding:2px 8px;margin-left:8px;font-size:12px;color:#fff;background-color:#01b4e4;border:none;border-radius:3px;cursor:pointer;vertical-align:middle;transition:background-color 0.15s;font-weight:500;';
        btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = '#00a3cc'; });
        btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = '#01b4e4'; });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            GM_setClipboard(String(id), 'text', () => {
                const orig = btn.textContent;
                btn.textContent = '✓ 已复制';
                btn.style.backgroundColor = '#28a745';
                setTimeout(() => { btn.textContent = orig; btn.style.backgroundColor = '#01b4e4'; }, 1500);
            });
        });
        return btn;
    }

    // 处理单个 media-card
    function processCard(card) {
        if (card.hasAttribute(PROCESSED_ATTR)) return;

        // 在卡片中找详情链接（匹配 /tv/数字 或 /movie/数字 等）
        const detailLink = card.querySelector('a[href*="/tv/"], a[href*="/movie/"], a[href*="/person/"], a[href*="/collection/"]');
        if (!detailLink) return;

        const parsed = parseHref(detailLink.getAttribute('href'));
        if (!parsed) return;

        // 找标题链接——TMDB media-card 里标题是 h2 标签，其父 a 的 class 包含 font-normal
        const titleLink = card.querySelector('a.font-normal') || card.querySelector('h2').parentElement;
        const anchor = titleLink || detailLink;

        // 避免把按钮插进 <a> 标签导致嵌套问题：插到 anchor 的下一个兄弟
        const btn = createCopyButton(parsed.id, parsed.type);
        if (anchor.parentElement) {
            anchor.parentElement.insertBefore(btn, anchor.nextSibling);
        } else {
            card.appendChild(btn);
        }

        card.setAttribute(PROCESSED_ATTR, 'true');
    }

    // 核心：扫描搜索结果容器中的所有 media-card
    function processSearchPage() {
        // TMDB 每个结果卡片的 class 包含 "comp:media-card"
        const cards = document.querySelectorAll('[class*="comp:media-card"]');
        cards.forEach(processCard);
    }

    // 监听 SPA 导航（搜索 tab 切换、翻页）
    function setupNavigationWatcher() {
        const wrap = (orig) => function () {
            const r = orig.apply(this, arguments);
            setTimeout(processSearchPage, 200);
            return r;
        };
        history.pushState = wrap(history.pushState);
        history.replaceState = wrap(history.replaceState);
        window.addEventListener('popstate', () => setTimeout(processSearchPage, 200));
    }

    // 监听 DOM 变化（AJAX 加载新结果）
    function setupMutationObserver() {
        const observer = new MutationObserver(() => { processSearchPage(); });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        setupNavigationWatcher();
        setupMutationObserver();
        processSearchPage();
        // 懒加载补偿
        setTimeout(processSearchPage, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
