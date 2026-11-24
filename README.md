# UserScripts

一些常用的油猴脚本, 自用为主, 欢迎取用。全部使用 Tampermonkey 测试通过。

---

## 🧩 脚本列表

### 1. 115网盘导出到 Aria2

| 项目 | 内容 |
|------|------|
| 描述 | 在 115 网盘文件页面添加按钮, 一键将选中文件/文件夹导出到 aria2 下载。**v2.0 起支持多 aria2 实例切换**。 |
| 匹配 | `*://115.com/*` |
| 作者 | 原版 [fuxin052](https://github.com/fuxin052/115_aria2), 当前版本 BackZhao |
| 原始仓库 | <https://github.com/fuxin052/115_aria2> |
| 构建方式 | Preact + TypeScript + Vite, 源码见 `115_aria2/` 目录 |

**安装地址**

| 版本 | 链接 |
|------|------|
| 原版 (1.1.7) | <https://github.com/fuxin052/115_aria2/raw/main/dist/115pan_aria2.user.js> |
| 本仓库 (2.0, 多实例) | <https://raw.githubusercontent.com/BackZhao/UserScripts/master/115Aria2.user.js> |

**主要改动 (vs 原版)**

- 修复 UserScript header (namespace 改为 URL 格式, 移除硬编码内网 IP, 补全 MIT 协议和 downloadURL)
- 支持多 aria2 实例管理: 添加 / 编辑 / 删除 / 切换 / 设置默认
- 每个实例独立配置 URL / Token / 下载目录 / SHA-1 校验阈值
- 新增"测试连接"按钮, 调用 `aria2.getVersion` JSON-RPC 验证实例可用性
- 工具栏新增实例下拉选择器, 一键切换推送目标
- 旧版本单实例配置首次运行时自动迁移

**使用方法**

1. 安装脚本后访问 [115.com](https://115.com) 文件管理页面
2. 页面右上角出现下拉选择器 (选择 aria2 实例) + ARIA2 按钮
3. **右键** ARIA2 按钮打开设置面板, 添加 aria2 实例 (填写 URL, 如 `http://127.0.0.1:6800/jsonrpc`)
4. 点击实例行的"测试"按钮验证连通性
5. 选中文件/文件夹, **左键** ARIA2 按钮开始导出

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

仅 `115_aria2` 一个脚本需要构建 (TypeScript + Preact + Vite):

```bash
cd 115_aria2
pnpm install        # 或 npm install
pnpm build          # 产物: dist/115pan_aria2.user.js
```

构建完成后, 将 `dist/115pan_aria2.user.js` 的 header 部分截取出来保存为根目录的 `.meta.js`, 完整文件保存为 `.user.js`:

```bash
# 假设 dist/115pan_aria2.user.js 已生成
awk '/^\/\/ ==\/UserScript==$/{exit} {print}' dist/115pan_aria2.user.js > ../115Aria2.meta.js
cp dist/115pan_aria2.user.js ../115Aria2.user.js
```

---

## 🙏 鸣谢

| 脚本 | 原始作者 | 原始链接 |
|------|----------|----------|
| 115Aria2 | [fuxin052](https://github.com/fuxin052) | <https://github.com/fuxin052/115_aria2> |
| PushTo115 | wangzijian0@vip.qq.com | <https://greasyfork.org/zh-CN/scripts/531685> |

以上两个脚本在原版基础上进行了结构优化和功能扩展, 保留原始 MIT 协议。
