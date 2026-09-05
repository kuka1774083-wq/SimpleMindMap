# 飞牛 fnOS 应用开发与文件读写指南

本文沉淀 FnOffice 开发中验证过的通用实践。飞牛系统、`fnpack` 和开放 API 会随版本变化，开发前应以官方文档为准：

- <https://developer.fnnas.com/docs/guide/>
- <https://developer.fnnas.com/api/overview/>

## 1. 应用结构与打包

一个最小应用通常包含：

```text
manifest              应用元数据、桌面入口、依赖与权限声明
wizard/               安装向导
cmd/                  安装、升级、卸载生命周期脚本
app/                  服务端和前端资源
```

`manifest` 是应用中心识别应用的入口。应至少明确：

- `appname`：稳定且唯一的应用标识，后续不要随意改名。
- `version`：每次上传包都要递增；应用中心通常不允许同版本覆盖。
- `desktop_uidir`、`desktop_applaunchname`：桌面图标与默认打开页面。
- `install_dep_apps`：运行时依赖，例如 Node.js。
- `checkport=false`：没有独立服务端口、只走飞牛网关时使用。

构建前检查并打包：

```powershell
node --check app/server/index.mjs
..\fnpack.exe build -d .
```

Linux：

```bash
node --check app/server/index.mjs
../fnpack build -d .
```

## 2. 网关与服务运行

优先让应用运行在飞牛统一网关下，而不是为应用另开公网 TCP 端口。

- 前端路由统一放在 `/app/<AppName>/...` 下。
- 后端必须理解网关前缀，不能假设请求根路径就是应用根路径。
- 对外地址不要硬编码 NAS IP、`127.0.0.1` 或某个域名。生成回调/下载链接时优先读取 `X-Forwarded-Proto`、`X-Forwarded-Host`，再回退到 `Host`。
- 后端到 Docker 或其它内部服务可以使用 `127.0.0.1`、Unix Socket 或 Docker 网络地址；这些地址绝不能直接输出给浏览器。
- 代理 WebSocket 时需要保留 Upgrade 相关头，并特别处理上游服务自己的 JWT/Authorization，避免被飞牛网关的登录头混淆。

## 3. 生命周期脚本与持久化

### 生命周期职责

- `cmd/install_callback`：校验向导参数、写入首次配置、创建应用拥有的容器/网络、等待关键服务可用。
- `cmd/upgrade_init`：在飞牛替换目标目录前转移必须保留的数据。
- `cmd/upgrade_callback`：恢复数据、修复或重建应用拥有的服务。
- `cmd/uninstall_callback`：只清理本应用创建的 Docker 容器、网络等资源；不要删除用户文档。

### 目录原则

应用安装目录会在升级时被替换，不能保存配置、字体、数据库或用户上传内容。使用飞牛提供的持久化目录：

- `TRIM_PKGETC`：配置文件。
- `TRIM_PKGVAR`：可持久化运行数据。
- `TRIM_PKGTMP`：临时文件和安装日志。
- `TRIM_TEMP_LOGFILE`：安装/升级失败时应写入可诊断的错误信息。
- `TRIM_APPDEST`：当前应用目标目录；仅用于读取包内资源或推导应用路径，不能当作持久化数据目录。

不同 fnOS 版本可能不会在升级钩子中传入所有 `TRIM_*` 变量。脚本需要安全回退到应用卷中相邻的 `@appconf/<AppName>`、`@appdata/<AppName>`，并且升级恢复必须采用**合并**方式，不能用空目录覆盖旧数据。

### Docker 注意事项

- 自动安装的容器和网络必须使用应用专属名称，例如 `fnoffice-onlyoffice`。
- 仅停止/删除本应用拥有的资源，不能运行全局 Docker 清理命令。
- 自动安装应使用 `restart=always` 或明确的重启策略。
- 拉镜像可能持续数分钟；安装脚本应等待拉取和健康检查完成，失败时写入 `TRIM_TEMP_LOGFILE`。
- 安装向导、持久化配置、容器环境变量和设置页必须使用同一份端口/JWT 配置，不能由默认值覆盖向导值。

## 4. 身份、授权与文件读写

### 核心原则

浏览器传来的 `path`、用户名和文件权限都不可信。正确顺序是：

1. 规范化并限制文件路径。
2. 从飞牛网关注入的身份头读取当前用户。
3. 通过飞牛开放 API 校验当前用户对目标文件的读/写 ACL。
4. 再读取、下载、编辑或回写文件。

不要仅凭文件在磁盘上存在、Node 进程具有 Linux 文件权限、或前端曾调用授权窗口，就认为用户可以读写文件。

### 用户身份

飞牛网关会向应用请求传入用户信息。FnOffice 使用：

```js
const uid = String(req.headers['x-trim-userid'] || '');
const username = String(req.headers['x-trim-username'] || '飞牛用户');
const isAdmin = String(req.headers['x-trim-isadmin'] || '').toLowerCase() === 'true';
```

这些头只能在飞牛网关后的服务端使用，不能信任来自绕过网关的直接公网请求。

### 调用飞牛开放 API

应用运行环境中的 `TRIM_API_TOKEN` 用于调用飞牛开放 API。通过飞牛提供的 Unix Socket 调用，而不是把令牌下发到前端：

```js
const body = JSON.stringify({
  reqId: crypto.randomUUID(),
  req: 'trim.file.checkUserACL',
  appName: 'MyApp',
  data: { uid: Number(uid), path: filePath }
});

const request = http.request({
  socketPath: '/var/run/trim_open_gateway_apiscope.socket',
  path: '/api/v1/trimapp',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    authorization: `Bearer ${process.env.TRIM_API_TOKEN}`
  }
});
```

文件 ACL 检查示例：

```js
const records = await trimApi('trim.file.checkUserACL', { uid, path: filePath });
const record = Array.isArray(records)
  ? records.find(item => item?.path === filePath) || records[0]
  : undefined;

const allowed = mode === 'write' ? record?.writable === true : record?.readable === true;
if (!allowed) throw new Error('file_access_denied');
```

开放 API 的准确请求名、参数和返回字段必须以当前官方 API 文档为准。开发模式可在没有 `TRIM_API_TOKEN` 时使用本地 `fs.access` 降级，但生产环境必须使用 ACL API。

### 路径规范化

只允许绝对路径、消除重复分隔符并拒绝目录穿越；同时限制扩展名：

```js
function canonicalFile(input) {
  if (!input || !input.startsWith('/')) throw new Error('invalid_path');
  const file = path.posix.normalize(input);
  if (file === '/' || file.includes('..')) throw new Error('invalid_path');

  const ext = path.posix.extname(file).slice(1).toLowerCase();
  if (!allowedExtensions.has(ext)) throw new Error('unsupported_extension');
  return file;
}
```

不要使用 `decodeURIComponent` 后直接拼接文件系统路径，也不要接受客户端提供的相对路径。

### 安全读取与下载

读取或流式下载前再次校验读权限。下载响应应：

- 根据扩展名设置正确的 `Content-Type`。
- 使用 `Content-Disposition: attachment` 和 RFC 5987 `filename*` 支持中文文件名。
- 设置 `X-Content-Type-Options: nosniff` 与 `Cache-Control: no-store`。
- 对文件名移除换行、引号、反斜杠，防止响应头注入。

### 安全回写

回写前再次校验写权限。先写入同一目录的随机临时文件，再原子重命名覆盖原文件：

```js
async function atomicReplace(file, contents, user) {
  await assertWritable(file, user);
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.myapp-${crypto.randomUUID()}.tmp`
  );

  try {
    await fsp.writeFile(temp, contents, { mode: 0o600, flag: 'wx' });
    await fsp.rename(temp, file);
  } finally {
    await fsp.rm(temp, { force: true }).catch(() => {});
  }
}
```

临时文件必须与原文件处于同一文件系统，`rename` 才能保持原子性。不要先删除源文件再写新文件，否则崩溃时可能丢失文档。

## 5. 文件默认打开方式

在应用元数据中声明桌面/文件入口，并在文件页面处理 `?path=` 参数。推荐流程：

1. 接收路径参数。
2. 调用客户端授权能力（如 `authorizeUserFile(path)`）申请飞牛侧的用户授权。
3. 后端进行路径规范化与 ACL 校验。
4. 根据扩展名选择编辑器配置。

客户端授权仅用于触发飞牛系统的授权体验；后端 ACL 校验才是实际安全边界。

## 6. 在线编辑器与回调

以 OnlyOffice 一类服务为例：

- 为每次编辑会话生成难预测的短期文档 URL、回调 URL 和会话标识。
- 动态传入 `document.fileType`、`document.key`、`document.url`、`editorConfig.callbackUrl`、`editorConfig.user.id`、`editorConfig.user.name`。
- 用户名应来自 `X-Trim-Username`，用户 ID 使用飞牛用户 ID；不要由前端传入。
- 回调下载编辑结果后，用“安全回写”流程写回源文件。
- 对 `status=2/6` 保存结果；对 `status=3/7` 保留有限时间供重试；会话关闭后清理短期令牌、桥接文件和会话记录。
- OnlyOffice JWT 仅在服务端生成和验证。JWT Secret 放在持久化配置并使用 `0600` 权限，不能回显到普通用户或浏览器。

在公网、fnConnect、域名、内网 IP 等多入口下都要测试。Document Server 访问文件下载 URL 时经过的网络路径与浏览器不同，最常见问题是回调/下载 URL 的主机名、协议、端口或网关前缀错误。

## 7. 前端与设置页

- 首次配置来源是安装向导；设置页只能读取并修改同一份持久化配置。
- 修改 Docker 端口时，先验证范围和占用；成功后同步持久化配置、容器环境和设置页。重启失败要恢复旧配置。
- 管理类页面同时做两层限制：在 `manifest`/桌面入口设置管理员可见性，并在服务端按 `X-Trim-Isadmin` 拒绝直接 URL 绕过。
- 不要使用浏览器原生 `alert`、`confirm` 处理关键流程，使用应用内模态框。
- 长时任务应由服务端记录状态；前端重新打开页面后通过 API 同步。不能只依赖浏览器内存或 `localStorage`。
- 处理中的状态应能自动恢复：服务端检测依赖服务恢复、任务成功/失败、以及合理超时，避免永久锁死 UI。

## 8. 发布前检查清单

- [ ] `manifest`、服务端显示版本、前端静态资源缓存版本一致。
- [ ] 安装向导非默认端口会同步到设置页和 Docker 实际绑定。
- [ ] 配置、字体、数据库等数据在升级后仍存在。
- [ ] 卸载只删除本应用 Docker 资源，不删除用户文件。
- [ ] 普通用户不能访问仅管理员页面，也不能通过 API 绕过。
- [ ] 非授权用户不能读取、下载、回写任意路径。
- [ ] 保存/回调失败不会覆盖源文件，临时文件会清理。
- [ ] 内网 IP、域名、fnConnect、公网和移动端均验证文档加载、协作与保存。
- [ ] 失败信息写入 `TRIM_TEMP_LOGFILE`，日志中不包含 JWT Secret、访问令牌或文档内容。
