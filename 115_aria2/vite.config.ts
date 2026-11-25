import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import monkey from 'vite-plugin-monkey';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 构建完成后, 把 dist/115pan_aria2.user.js 自动拆分并复制到仓库根目录:
 *   115Aria2.meta.js  ← 只含 UserScript header (updateURL 用)
 *   115Aria2.user.js  ← 完整文件 (安装用)
 */
function splitUserscriptToRepoRoot() {
    return {
        name: 'split-userscript',
        closeBundle: {
            sequential: true,
            order: 'post' as const,
            handler() {
                const projectRoot = path.resolve(__dirname, '..');        // UserScripts/
                const distFile   = path.resolve(__dirname, 'dist/115pan_aria2.user.js');
                const metaFile   = path.resolve(projectRoot, '115Aria2.meta.js');
                const userFile   = path.resolve(projectRoot, '115Aria2.user.js');

                if (!fs.existsSync(distFile)) {
                    console.warn(`[split-userscript] dist file not found: ${distFile}`);
                    return;
                }

                const content = fs.readFileSync(distFile, 'utf-8');
                const endMarker = '// ==/UserScript==';
                const endIdx = content.indexOf(endMarker);
                if (endIdx === -1) {
                    console.warn('[split-userscript] no endMarker found, skip');
                    return;
                }

                const header = content.slice(0, endIdx + endMarker.length);
                fs.writeFileSync(metaFile, header + '\n', 'utf-8');
                fs.writeFileSync(userFile, content, 'utf-8');

                const kb = (content.length / 1024).toFixed(2);
                const headerLines = header.split('\n').length;
                console.log(
                    `\n✅ [split-userscript] 产物已复制到仓库根目录:\n` +
                    `   ${path.basename(metaFile)}  (${headerLines} lines header)\n` +
                    `   ${path.basename(userFile)}  (${kb} KB)\n`
                );
            },
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        minify: false,
    },
    plugins: [
        preact(),
        monkey({
            entry: 'src/main.tsx',
            userscript: {
                name: '115网盘导出到 Aria2',
                icon: 'https://115.com/web_icon.jpg',
                namespace: 'https://nasctl.com/',
                author: 'fuxin052, BackZhao',
                description: '115网盘文件导出到 Aria2 下载, 支持多 aria2 实例切换',
                version: '2.0.20261125',
                license: 'MIT',
                grant: [
                    'GM_xmlhttpRequest',
                    'GM_setValue',
                    'GM_getValue',
                    'GM_registerMenuCommand',
                    'unsafeWindow',
                ],
                match: ['*://115.com/*'],
                connect: ['115.com', '*'],
                'run-at': 'document-end',
                downloadURL:
                    'https://raw.githubusercontent.com/BackZhao/UserScripts/master/115Aria2.user.js',
                updateURL:
                    'https://raw.githubusercontent.com/BackZhao/UserScripts/master/115Aria2.meta.js',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
        splitUserscriptToRepoRoot(),
    ],
});
