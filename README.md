# UserScripts

一些常用的油猴脚本, 自用为主, 欢迎取用。全部使用 Tampermonkey 测试通过。

---

## 🧩 脚本列表

### 1. 115Enhance

| 项目 | 内容 |
|------|------|
| 描述 | 115 网盘增强: **伪装 115 浏览器下载** (fake115) + **导出到 Aria2** (多实例), 双入口自由选 |
| 匹配 | `*://115.com/*` |
| 作者 | 原版 [fuxin052](https://github.com/fuxin052/115_aria2), fake115 [kkHAIKE](https://github.com/kkHAIKE/fake115), 当前版本 BackZhao |
| 原始仓库 | <https://github.com/fuxin052/115_aria2>, <https://github.com/kkHAIKE/fake115> |
| 构建方式 | Preact + TypeScript + Vite, 源码见 `115_aria2/` 目录 |

**安装地址**

| 版本 | 链接 |
|------|------|
| 原版 115_aria2 (1.1.7) | <https://github.com/fuxin052/115_aria2/raw/main/dist/115pan_aria2.user.js> |
| fake115d (1.0.3) | <https://github.com/kkHAIKE/fake115/blob/master/fake115d.user.js> |
| 本仓库 (3.0, 整合版) | <https://raw.githubusercontent.com/BackZhao/UserScripts/master/115Enhance.user.js> |

**功能说明 (v3.0)**

1. **入口 A: 伪装 115 浏览器下载** (fake115 功能)
   - 脚本最早 (`@run-at document-start`) 注入 `browserInterface` 劫持 115 网页原生下载按钮
   - 用户在 115 网页点"下载"时, 不再唤起 115 客户端, 而是弹出下载链接对话框
   - 支持: 单击条目直接下载 / 一键复制所有链接 / 全部推到 Aria2
2. **入口 B: 手动选择文件导出到 Aria2** (115Aria2 功能)
   - 在 115 文件页面右上角显示 ARIA2 工具栏, 支持多 aria2 实例下拉切换
   - 左键 ARIA2 按钮导出选中文件/文件夹, 右键打开设置面板
   - 每个实例独立配置 URL / Token / 下载目录 / SHA-1 校验阈值
   - 新增"测试连接"按钮, 调用 `aria2.getVersion` 验证实例可用性
3. **技术整合**
   - fake115 的 RSA + XOR 加密逻辑复用本工程 TypeScript 版本 (`src/secret.ts`), 不再引入 `@require BigInteger.js` / `@require blueimp-md5` 外部依赖
   - BrowserInterface 劫持 + Preact UI 共存于同一入口, 无冲突

**使用方法**

1. 安装脚本后访问 [115.com](https://115.com) 文件管理页面
2. **被动入口** (fake115): 直接在 115 网页点原生"下载"按钮 → 弹出增强对话框
3. **主动入口** (Aria2): 页面右上角出现 ARIA2 按钮, 选中文件/文件夹后点击导出
4. **配置 aria2**: 右键 ARIA2 按钮打开设置面板, 添加实例并测试连接

**aria2 端配置**: 请确保 aria2 开启了 RPC, 且允许当前浏览器访问 (设置 `rpc-allow-origin-all=true`, `rpc-listen-all=true`)。

---

### 2. 一键复制磁力链和推送到115离线

| 项目 | 内容 |
|------|------|
| 描述 | 磁力搜索网站一键复制磁力链、推送到 115 离线下载, 支持批量操作。 |
| 匹配 | BT4G / BTDigg / BTSOW / Nyaa / DMHY / SeedHub / 观影 / LongWangBT / 雨花阁 / SOBT / CLB / BTMulu / 无极磁力 / 磁力帝 等 18+ 站点 |
| 作者 | 原版 wangzijian0@vip.qq.com, 当前版本 BackZhao |
| 原始来源 | <https://greasyfork.org/zh-CN/scripts/531685> (namespace: greasyfork.org/users/1453515) |

**安装地址**

| 版本 | 链接 |
|------|------|
| 本仓库 | <https://raw.githubusercontent.com/BackZhao/UserScripts/master/PushTo115.user.js> |

**使用方法**

1. 确保 115 网盘已登录 (脚本会调用 115 接口)
2. 在磁力搜索网站的搜索结果旁会出现 **复制 / 离线 / 打开** 三个按钮
3. 也可以在脚本菜单中打开"设置"面板, 配置启用的按钮、按钮顺序、是否自动翻页等

---

### 3. GitHub Releases Assets Proxy

| 项目 | 内容 |
|------|------|
| 描述 | 自动给 GitHub Releases 页面的资产下载链接加上 `hub.nasctl.com` 前缀, 走自建镜像加速。 |
| 匹配 | `https://github.com/*/*`, `.../releases/*` |
| 作者 | BackZhao |

**安装地址**

- <https://raw.githubusercontent.com/BackZhao/UserScripts/master/GithubReleaseProxy.user.js>

**使用方法**

- 右键油猴菜单 → "设置代理前缀", 填入自建镜像 URL (末尾需带 `/`)
- 或脚本已默认使用 `https://hub.nasctl.com/`

---

### 4. TMDB 搜索结果一键复制 ID

| 项目 | 内容 |
|------|------|
| 描述 | TMDB 搜索结果页每个条目旁显示"复制 ID"按钮, 复制 TMDB 自身 ID 或 影视 / 人员 / 合集 详情页 ID。 |
| 匹配 | `https://www.themoviedb.org/search*` |
| 作者 | BackZhao |

**安装地址**

- <https://raw.githubusercontent.com/BackZhao/UserScripts/master/TmdbCopyId.user.js>

---

## 📦 构建说明

仅 `115_aria2` 一个脚本需要构建 (TypeScript + Preact + Vite)。**构建自动触发产物拆分**，一行命令搞定：

```bash
cd 115_aria2
npm install        # 首次, 安装依赖 (node_modules 已在 .gitignore 忽略)
npm run build      # 115Enhance.meta.js + 115Enhance.user.js 自动出现在仓库根目录
```

`npm run build` 等价于 `tsc && vite build`。vite 构建完成后内置了一个 rollup hook (`splitUserscriptToRepoRoot`)，自动做两件事：

- 从 `dist/115_enhance.user.js` 切出 header → 写入 `../115Enhance.meta.js`（updateURL 用）
- 完整文件 → 写入 `../115Enhance.user.js`（安装用）

所以每次改完源码，只要 `npm run build`，然后 `git add -A && git commit` 就行，不用手动拆分。

---

## 🙏 鸣谢

| 脚本 | 原始作者 | 原始链接 |
|------|----------|----------|
| 115_aria2 | [fuxin052](https://github.com/fuxin052) | <https://github.com/fuxin052/115_aria2> |
| fake115 | [kkHAIKE](https://github.com/kkHAIKE) | <https://github.com/kkHAIKE/fake115> |
| PushTo115 | wangzijian0@vip.qq.com | <https://greasyfork.org/zh-CN/scripts/531685> |

以上脚本在原版基础上进行了结构优化和功能扩展, 保留原始 MIT 协议。
