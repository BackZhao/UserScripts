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

/** 入口方法, 并从页面获取数据供后面使用 */
export class Pan115 {
    constructor() {
        this._initUi();
    }

    /** 获取已选择的文件 */
    selectFileList() {
        const list = document.querySelectorAll('li[rel="item"].selected');
        return this._selectFileList(list);
    }

    private _selectFileList(list: NodeListOf<Element>) {
        const selectedFile: FileObjType[] = [];
        const selectedFolder: FolderObjType[] = [];
        Array.from(list).forEach((item) => {
            const type = item.getAttribute('file_type');
            // file
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
            // fold
            if (type === '0') {
                selectedFolder.push({
                    isdir: true,
                    cate_id: item.getAttribute('cate_id')!,
                    parent: '',
                    folderName: item.getAttribute('title')!,
                });
            }
        });
        return {
            selectedFile,
            selectedFolder,
        };
    }

    async fetchFolder(folderItem: FolderObjType) {
        var result: any = [];

        return result;
    }

    private async _initUi() {
        // Pan115 工具栏 UI 需要等待 115 页面 DOM 就绪 (document-start 时 DOM 还没构建好)
        var select = '#js_top_panel_box';
        let $toolWrap = document.querySelector(select);
        while (!$toolWrap) {
            await new Promise((r) => setTimeout(r, 20));
            $toolWrap = document.querySelector(select);
        }
        render(<App pan115={this} />, $toolWrap);
    }
}

// DOM ready 后再挂载 Pan115 工具栏 (Aria2 多实例管理面板)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Pan115());
} else {
    new Pan115();
}
