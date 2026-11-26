import { render } from 'preact';
import { App } from './app';
import './index.css';
import { FileObjType, FolderObjType } from './types';
import { injectBrowserInterface, registerDialogShow } from './hook';
import { showDownloadDialog } from './dialog';

// ========== 第一优先级: 注入 browserInterface ==========
// @run-at document-start 时立即执行, 劫持 115 网页原生下载按钮。
// 这行必须在所有异步操作之前, 确保 115 网页脚本加载时读到的就是我们伪造的接口。
injectBrowserInterface();

// Dialog 独立渲染到 body (hook 异步回调时触发),
// 无需等待 Pan115 UI 挂载完成即可工作。
registerDialogShow((items) => {
    // Dialog 依赖 document.body, 在 document-start 时可能还不存在,
    // 但 115 网页的下载按钮只会在页面完全加载后出现, 所以此处 body 一定存在。
    showDownloadDialog(items);
});

/** 检测是否新版 SPA 界面 (https://115.com/storage/allfiles) */
function isNewUI(): boolean {
    // 新版特征: 使用 .file-list-item + data-file-id 的 React SPA 结构
    return (
        !!document.querySelector('.file-list-item[data-file-id]') ||
        location.pathname.includes('/storage/')
    );
}

/** 老版界面: 从 li[rel="item"].selected 读取 */
function selectFromOldUI(): {
    selectedFile: FileObjType[];
    selectedFolder: FolderObjType[];
} {
    const list = document.querySelectorAll('li[rel="item"].selected');
    const selectedFile: FileObjType[] = [];
    const selectedFolder: FolderObjType[] = [];
    Array.from(list).forEach((item) => {
        const type = item.getAttribute('file_type');
        if (type === '1') {
            selectedFile.push({
                isdir: false,
                sha1: item.getAttribute('sha1')!,
                pick_code: item.getAttribute('pick_code')!,
                parent: '',
                fileName: item.getAttribute('title')!,
                fileSize: Number(item.getAttribute('file_size')) || 0,
                tryTimes: 0,
            });
        }
        if (type === '0') {
            selectedFolder.push({
                isdir: true,
                cate_id: item.getAttribute('cate_id')!,
                parent: '',
                folderName: item.getAttribute('title')!,
            });
        }
    });
    return { selectedFile, selectedFolder };
}

/**
 * 新版界面: 从 .file-list-item[data-file-id] + checked checkbox 读取。
 * 注意: 新版 DOM 上没有 pick_code/sha1 (在 React state 里),
 * 所以通过工具栏按钮直接触发下载时拿不到完整参数。
 * 完整下载路径依赖 hook.ts 劫持 browserInterface,
 * 用户点 115 原生"下载 → 浏览器下载"时会自动触发。
 */
function selectFromNewUI(): {
    selectedFile: FileObjType[];
    selectedFolder: FolderObjType[];
} {
    const selectedFile: FileObjType[] = [];
    const selectedFolder: FolderObjType[] = [];

    const items = document.querySelectorAll('.file-list-item[data-file-id]');
    items.forEach((item) => {
        // 跳过内层嵌套的 file-list-item (两层结构)
        if (item.parentElement?.closest('.file-list-item[data-file-id]')) return;

        const cb = item.querySelector(
            'input[type=checkbox]'
        ) as HTMLInputElement | null;
        if (!cb || !cb.checked) return;

        const fileName =
            item.querySelector('.file-name-responsive')?.textContent?.trim() || '';
        const img = item.querySelector('img[src*="/icons/types/"]');
        const iconSrc = img?.getAttribute('src') || '';
        const isFolder = iconSrc.includes('folder');

        if (isFolder) {
            selectedFolder.push({
                isdir: true,
                cate_id: item.getAttribute('data-file-id')!,
                parent: '',
                folderName: fileName,
            });
        } else {
            selectedFile.push({
                isdir: false,
                sha1: '',
                pick_code: '',
                parent: '',
                fileName,
                fileSize: 0,
                tryTimes: 0,
            });
        }
    });

    return { selectedFile, selectedFolder };
}

/** 入口方法, 并从页面获取数据供后面使用 */
export class Pan115 {
    /** 当前是否新版 SPA 界面 */
    readonly isNewUI: boolean;

    constructor() {
        this.isNewUI = isNewUI();
        this._initUi();
    }

    /** 获取已选择的文件 (新版/老版通用) */
    selectFileList() {
        if (this.isNewUI) return selectFromNewUI();
        return selectFromOldUI();
    }

    async fetchFolder(_folderItem: FolderObjType) {
        return [];
    }

    private async _waitForElement(
        selector: string,
        timeoutMs = 15000
    ): Promise<HTMLElement | null> {
        const start = Date.now();
        return new Promise((resolve) => {
            const check = () => {
                const el = document.querySelector(selector) as HTMLElement | null;
                if (el) return resolve(el);
                if (Date.now() - start > timeoutMs) return resolve(null);
                requestAnimationFrame(check);
            };
            check();
        });
    }

    /** 新版: 等待页面加载后创建浮动工具栏挂载点 */
    private async _newUIMountPoint(): Promise<HTMLElement | null> {
        // 等待文件列表出现
        const ok = await this._waitForElement('.file-list-item[data-file-id]');
        if (!ok) return null;

        // 等 body 就绪
        if (!document.body) return null;

        // 创建浮动工具栏容器
        const wrap = document.createElement('div');
        wrap.id = 'bdp-newui-toolbar';
        wrap.setAttribute(
            'style',
            'position:fixed;top:8px;right:170px;z-index:2147483646;display:flex;gap:6px;'
        );
        document.body.appendChild(wrap);
        return wrap;
    }

    private async _initUi() {
        let mountPoint: HTMLElement | null = null;

        if (this.isNewUI) {
            mountPoint = await this._newUIMountPoint();
        } else {
            // 老版: 等待 #js_top_panel_box
            mountPoint = await this._waitForElement('#js_top_panel_box');
        }

        if (mountPoint) {
            const mountEl = mountPoint; // 捕获非 null 引用
            render(<App pan115={this} />, mountEl);
            // 新版页面的 Next.js 全局按钮 reset (button { background: transparent })
            // 会覆盖 Preact 渲染后的 CSS, 必须用 DOM API 强制设 inline style 才能赢
            if (this.isNewUI) {
                setTimeout(() => {
                    const btn = mountEl.querySelector(
                        '.bdp-button'
                    ) as HTMLElement | null;
                    const sel = mountEl.querySelector(
                        '.bdp-instance-select'
                    ) as HTMLElement | null;
                    if (btn) {
                        btn.style.setProperty(
                            'background-color',
                            '#09aaff',
                            'important'
                        );
                        btn.style.setProperty('color', '#ffffff', 'important');
                        btn.style.setProperty(
                            'border-color',
                            '#09aaff',
                            'important'
                        );
                    }
                    if (sel) {
                        sel.style.setProperty(
                            'background-color',
                            '#ffffff',
                            'important'
                        );
                    }
                }, 0);
            }
        } else {
            console.warn('[115Enhance] 找不到工具栏挂载点');
        }
    }
}

// DOM ready 后再挂载 Pan115 工具栏 (Aria2 多实例管理面板)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Pan115());
} else {
    new Pan115();
}
