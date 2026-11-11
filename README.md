# AT Text

文本整理、排序、大小写转换、拆合、抽取和对比工具。项目同时发布独立桌面应用和可安装到 AT Tool 的插件包。

## 开发

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm build
corepack pnpm build:plugin
corepack pnpm tauri:dev
```

插件身份为 `com.attson.text`，只申请 `host.theme.read` 权限。

## 发布

向 GitHub `prod` Environment 配置以下 Secrets：

- `ATTEXT_PUBLISHER_KEY_ID`
- `ATTEXT_PUBLISHER_PRIVATE_KEY`
- `ATTEXT_PUBLISHER_PUBLIC_KEY`

推送 `v` 前缀的 SemVer tag 后，Release workflow 会构建五个平台安装包和五个签名 `.atpkg`。
