/**
 * fake115 核心逻辑: 注入 browserInterface 劫持 115 网页原生下载按钮
 *
 * 必须在 @run-at document-start 时最早执行, 这样 115 网页加载后读到的就是我们伪造的接口。
 *
 * 复用 secret.ts 的加密解密 (rsa + xor), 不再引入 BigInteger.js / blueimp-md5 等外部 @require。
 */
import { GM_xmlhttpRequest, unsafeWindow } from '$';
import { secret } from './secret';
import { getUA } from './utils';

/** fake115 拦截到的下载任务文件项 (115 网页 browserInterface 传来的格式) */
export interface HookFileItem {
    pc: string;         // pickcode
    file_name?: string; // 文件名 (可选, 部分场景可能缺失)
    sha1?: string;      // sha1 校验
    is_dir?: boolean;
    [key: string]: any;
}

/** fake115 解析后的真实下载链接项 */
export interface HookResolvedItem {
    pc: string;
    file_name: string;
    sha1: string;
    /** 真实下载 URL */
    url: { url: string };
    file_size: string | number;
    cookie?: string;
}

/** Dialog 回调注册 —— 由 main.tsx 在 DOM ready 后挂接 */
type DialogShowFn = (items: HookResolvedItem[]) => void;
let dialogShowFn: DialogShowFn | null = null;

/** 注册 Dialog 的显示函数 (供 main.tsx 调用) */
export function registerDialogShow(fn: DialogShowFn) {
    dialogShowFn = fn;
}

/** 从 downurl 接口解析单个文件的真实下载链接 */
function resolveSingleFile(
    file: HookFileItem
): Promise<HookResolvedItem | null> {
    return new Promise((resolve) => {
        const tm = Math.floor(Date.now() / 1000);
        const { data, key } = secret.encode(JSON.stringify({ pickcode: file.pc }), tm);

        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://proapi.115.com/app/chrome/downurl?t=${tm}`,
            data: `data=${encodeURIComponent(data)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': getUA(),
            },
            responseType: 'json',
            onload: (res: any) => {
                try {
                    const json = res.response || JSON.parse(res.responseText || '{}');
                    if (!json.state) {
                        console.warn('[115Enhance] downurl 状态异常:', json.msg || json);
                        return resolve(null);
                    }
                    const decoded = JSON.parse(secret.decode(json.data, key));
                    const first = Object.values(decoded).pop() as any;
                    if (first && first.url?.url) {
                        return resolve({
                            pc: file.pc,
                            file_name: first.file_name || file.file_name || file.pc,
                            sha1: first.sha1 || file.sha1 || '',
                            url: { url: first.url.url },
                            file_size: first.file_size || 0,
                            cookie: json.cookie,
                        });
                    }
                    resolve(null);
                } catch (err) {
                    console.warn('[115Enhance] downurl 解析异常:', err);
                    resolve(null);
                }
            },
            onerror: (err: any) => {
                console.warn('[115Enhance] downurl 请求失败:', err);
                resolve(null);
            },
        });
    });
}

/** 并发解析所有非目录文件, 然后调用 Dialog */
async function createDownloadTask(o: { list: HookFileItem[] }) {
    const files = (o.list || []).filter((f) => !f.is_dir);
    if (files.length === 0) return;

    // 并发解析, 用 Promise.allSettled 确保单个失败不影响整体
    const results = await Promise.allSettled(files.map((f) => resolveSingleFile(f)));
    const items: HookResolvedItem[] = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) items.push(r.value);
    }

    if (items.length === 0) {
        console.warn('[115Enhance] 所有文件解析失败');
        return;
    }

    if (dialogShowFn) {
        dialogShowFn(items);
    } else {
        // Dialog 还没挂载 (理论上 document-end 前不可能走到这里, 兜底)
        const urls = items.map((i) => i.url.url).join('\n');
        console.log('[115Enhance] 下载链接 (Dialog 未就绪):', urls);
    }
}

/** 注入 browserInterface —— 在 @run-at document-start 时立即调用
 *
 * 新版 115 SPA (storage/allfiles) 可能在 bundle 加载后重新给 window.browserInterface 赋值,
 * 所以用 defineProperty + setter 来 hook 一切赋值操作, 确保不会被覆盖。
 */
export function injectBrowserInterface() {
    const w = unsafeWindow as any;

    const makePatched = (original: any = {}) => ({
        ...original,
        /** 115 网页会调这个创建下载任务 */
        CreateDownloadTask(s: string) {
            try {
                const parsed = JSON.parse(decodeURIComponent(s));
                createDownloadTask(parsed);
            } catch (err: any) {
                console.error('[115Enhance] browserInterface.CreateDownloadTask 解析失败:', err);
            }
        },
        /** 115 网页检查浏览器版本, 需要大于 23.9.3 才会走 browserInterface */
        GetBrowserVersion() {
            return '100.0.0';
        },
    });

    const ci = w.cloneInto || ((x: any) => x);

    // 如果已经存在 (115 SPA 在我们之后赋值), 先 hook 一次
    if (w.browserInterface) {
        const patched = ci(makePatched(w.browserInterface), w, { cloneFunctions: true });
        try {
            Object.defineProperty(w, 'browserInterface', {
                configurable: true,
                enumerable: true,
                get() {
                    return patched;
                },
                set(v) {
                    // 新版 SPA 重新赋值时, 再次 hook 并存一份 patched
                    patched.CreateDownloadTask = makePatched(v).CreateDownloadTask;
                    patched.GetBrowserVersion = makePatched(v).GetBrowserVersion;
                },
            });
        } catch (e) {
            // 某些浏览器可能不允许 defineProperty, 兜底直接赋值
            w.browserInterface = patched;
        }
    } else {
        // 还不存在, 先设一个假的, 然后 hook setter
        // 新版 SPA 后续会通过 setter 触发重新 hook
        const fake = ci(makePatched(), w, { cloneFunctions: true });
        try {
            Object.defineProperty(w, 'browserInterface', {
                configurable: true,
                enumerable: true,
                get() {
                    return fake;
                },
                set(v) {
                    // 新版 SPA 赋值真实 browserInterface 时, 覆盖 CreateDownloadTask
                    fake.CreateDownloadTask = makePatched(v).CreateDownloadTask;
                    fake.GetBrowserVersion = makePatched(v).GetBrowserVersion;
                },
            });
        } catch (e) {
            w.browserInterface = fake;
        }
    }
}
