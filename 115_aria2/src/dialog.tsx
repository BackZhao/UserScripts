/**
 * 下载链接对话框 —— fake115 拦截成功后弹出
 *
 * 三种操作:
 *   1. 单击单个条目 → 触发浏览器下载
 *   2. "复制所有链接" → 一键复制到剪贴板
 *   3. "全部推到 Aria2" → 调用 DownloadTool 批量推送
 */
import { render } from 'preact';
import { useState, useCallback, useEffect } from 'preact/hooks';
import { GM_setClipboard } from '$';
import { HookResolvedItem } from './hook';
import { getCurrentInstance } from './utils';
import { FileObjResolveType } from './types';
import { DownloadTool } from './download';

interface DialogProps {
    items: HookResolvedItem[];
    onClose: () => void;
}

/** 工具: 把字节数格式化为可读大小 */
function formatSize(bytes: string | number): string {
    const n = Number(bytes);
    if (!n || isNaN(n)) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(v < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

function Dialog({ items, onClose }: DialogProps) {
    const [copied, setCopied] = useState(false);
    const [aria2Status, setAria2Status] = useState<{
        pushing: boolean;
        success: number;
        fail: number;
        total: number;
    } | null>(null);

    // ESC 关闭
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const urlsText = items.map((i) => i.url.url).join('\n');

    const handleCopy = useCallback(() => {
        GM_setClipboard(urlsText, 'text');
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    }, [urlsText]);

    const handlePushAria2 = useCallback(async () => {
        const inst = getCurrentInstance();
        if (!inst?.url) {
            alert('请先在 115Enhance 设置中配置 aria2 实例');
            return;
        }
        setAria2Status({ pushing: true, success: 0, fail: 0, total: items.length });
        const tool = new DownloadTool();
        let success = 0;
        let fail = 0;
        for (const it of items) {
            const file: FileObjResolveType = {
                isdir: false,
                sha1: it.sha1,
                pick_code: it.pc,
                fileName: it.file_name,
                fileSize: Number(it.file_size) || 0,
                parent: '',
                tryTimes: 0,
                file_url: it.url.url,
                file_size: Number(it.file_size) || 0,
                cookie: it.cookie,
            };
            try {
                await tool.sendToAria2(file);
                success++;
            } catch (err) {
                console.warn('[115Enhance] 推送失败:', it.file_name, err);
                fail++;
            }
            setAria2Status({ pushing: true, success, fail, total: items.length });
        }
        setAria2Status({ pushing: false, success, fail, total: items.length });
    }, [items]);

    const handleSingleDownload = useCallback((item: HookResolvedItem) => {
        const a = document.createElement('a');
        a.href = item.url.url;
        a.download = item.file_name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.parentNode?.removeChild(a);
    }, []);

    const badge = (name: string) => {
        const parts = name.split('.');
        const ext = parts.length > 1 ? parts.pop()!.slice(0, 4).toUpperCase() : 'FILE';
        return ext;
    };

    return (
        <div
            className="enhance-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="enhance-panel" role="dialog" aria-modal="true">
                <div className="enhance-header">
                    <div>
                        <h3 className="enhance-title">下载链接</h3>
                        <p className="enhance-subtitle">
                            已解析 {items.length} 个真实下载链接 · 单击条目直接下载
                        </p>
                    </div>
                    <button
                        type="button"
                        className="enhance-close"
                        onClick={onClose}
                        aria-label="关闭"
                    >
                        ×
                    </button>
                </div>
                <div className="enhance-body">
                    <div className="enhance-toolbar">
                        <button
                            type="button"
                            className={`enhance-btn enhance-btn-primary ${copied ? 'enhance-btn-copied' : ''}`}
                            onClick={handleCopy}
                        >
                            {copied ? '已复制 ✓' : '复制所有链接'}
                        </button>
                        <button
                            type="button"
                            className="enhance-btn enhance-btn-aria2"
                            onClick={handlePushAria2}
                            disabled={aria2Status?.pushing}
                        >
                            {aria2Status?.pushing
                                ? `推送中 ${aria2Status.success + aria2Status.fail}/${aria2Status.total}...`
                                : '全部推到 Aria2'}
                        </button>
                        {aria2Status && !aria2Status.pushing && (
                            <span className="enhance-aria2-result">
                                成功 {aria2Status.success}/{aria2Status.total}
                                {aria2Status.fail > 0 && ` · 失败 ${aria2Status.fail}`}
                            </span>
                        )}
                    </div>
                    <div className="enhance-list">
                        {items.map((item) => (
                            <div
                                key={item.pc}
                                className="enhance-item"
                                onClick={() => handleSingleDownload(item)}
                            >
                                <div className="enhance-item-file">
                                    <span className="enhance-badge">{badge(item.file_name)}</span>
                                    <span className="enhance-item-name" title={item.file_name}>
                                        {item.file_name}
                                    </span>
                                </div>
                                <span className="enhance-item-size">{formatSize(item.file_size)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- 全局唯一的容器管理 ----
let dialogHost: HTMLDivElement | null = null;

function ensureHost(): HTMLDivElement {
    if (dialogHost && document.body.contains(dialogHost)) return dialogHost;
    dialogHost = document.createElement('div');
    dialogHost.id = 'enhance-dialog-root';
    document.body.appendChild(dialogHost);
    return dialogHost;
}

/** 显示下载链接对话框 —— 供 hook.ts 的 dialogShowFn 调用 */
export function showDownloadDialog(items: HookResolvedItem[]) {
    const host = ensureHost();
    const close = () => {
        render(null as any, host);
        host.remove();
        dialogHost = null;
    };
    // 每次都重新 render (Preact 10 的 render 是 replace)
    render(<Dialog items={items} onClose={close} />, host);
}
