import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import monkey from 'vite-plugin-monkey';

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
                version: '2.0.20261124',
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
            // 构建时同时产出 meta.js 文件
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
    ],
});
