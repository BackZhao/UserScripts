// ==UserScript==
// @name         GitHub Releases Assets Proxy
// @namespace    https://nasctl.com/
// @version      1.2.20260730
// @description  为 GitHub Releases assets 自动添加 hub.nasctl.com 前缀
// @author       you
// @match        https://github.com/*/*
// @match        https://github.com/*/*/releases*
// @match        https://github.com/*/*/releases/tags/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/BackZhao/UserScripts/master/GithubReleaseProxy.user.js
// @updateURL    https://raw.githubusercontent.com/BackZhao/UserScripts/master/GithubReleaseProxy.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_PREFIX = "https://hub.nasctl.com/";
    const STORAGE_KEY = 'proxyPrefix';

    function getPrefix() {
        let prefix = GM_getValue(STORAGE_KEY, DEFAULT_PREFIX);
        if (!prefix) prefix = DEFAULT_PREFIX;
        if (!prefix.endsWith('/')) prefix += '/';
        return prefix;
    }

    function setPrefix(newPrefix) {
        if (!newPrefix || !newPrefix.trim()) {
            alert('前缀不能为空');
            return;
        }
        newPrefix = newPrefix.trim();
        if (!/^https?:\/\//.test(newPrefix)) {
            alert('前缀必须以 http:// 或 https:// 开头');
            return;
        }
        if (!newPrefix.endsWith('/')) newPrefix += '/';
        GM_setValue(STORAGE_KEY, newPrefix);
        alert('前缀已更新为：\n' + newPrefix + '\n\n刷新页面后生效');
    }

    function resetPrefix() {
        GM_setValue(STORAGE_KEY, DEFAULT_PREFIX);
        alert('前缀已重置为默认值：\n' + DEFAULT_PREFIX + '\n\n刷新页面后生效');
    }

    function isReleasesPage(url) {
        return /\/releases(\/|$)/.test(url);
    }

    function rewriteLinks() {
        const prefix = getPrefix();
        const links = document.querySelectorAll('a[href*="/releases/download/"]');

        links.forEach(link => {
            const href = link.getAttribute("href");
            if (!href) return;

            let fullUrl = href.startsWith("http") ? href : "https://github.com" + href;

            if (!fullUrl.startsWith(prefix)) {
                link.href = prefix + fullUrl;
            }
        });
    }

    function runIfReleases() {
        if (isReleasesPage(window.location.pathname)) {
            rewriteLinks();
        }
    }

    // 注册油猴菜单
    GM_registerMenuCommand('设置代理前缀', () => {
        const current = getPrefix();
        const input = prompt('请输入代理前缀（需以 http:// 或 https:// 开头）：', current);
        if (input !== null) {
            setPrefix(input);
            rewriteLinks();
        }
    });

    GM_registerMenuCommand('重置为默认前缀', () => {
        resetPrefix();
        rewriteLinks();
    });

    GM_registerMenuCommand('查看当前前缀', () => {
        alert('当前代理前缀：\n' + getPrefix());
    });

    // 初始执行
    runIfReleases();

    // 监听 DOM 变化
    const observer = new MutationObserver(() => {
        runIfReleases();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 监听 SPA 导航（GitHub 使用 AJAX 路由，不会触发页面刷新）
    let navTimer = null;

    function onNavigate() {
        clearTimeout(navTimer);
        navTimer = setTimeout(() => {
            runIfReleases();
        }, 300);
    }

    // 拦截 history.pushState 和 history.replaceState
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    history.pushState = function () {
        const result = origPushState.apply(this, arguments);
        onNavigate();
        return result;
    };

    history.replaceState = function () {
        const result = origReplaceState.apply(this, arguments);
        onNavigate();
        return result;
    };

    // 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', onNavigate);

    // 监听 hashchange 事件
    window.addEventListener('hashchange', onNavigate);
})();
