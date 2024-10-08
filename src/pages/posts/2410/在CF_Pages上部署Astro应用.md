---
layout: "../../../layouts/MarkdownLayout.astro"

title: 用 Cloudflare Pages 部署 Astro (yarn)
pubDate: 2024-10-03
upDate: 2024-10-03
author: 'ST.U'
description: '用 Cloudflare Pages 部署 Astro (yarn)'
tags: ["yarn", "cloudflare pages", "astro"]
---

为了统一 ST.U 的管理， Space 依然托管在 Cloudflare Pages 上。

Astro 是一个前端框架，所以在使用之前，需要选择一个包管理器，npm | yarn | pnpm 三者都可，衡量之后本站选择了 yarn。

为了保证 Cloudflare Pages 能够正确部署，请在 `package.json` 中指定 `packageManager` 为 `yarn`。

```json
// package.json
{
    // ...
    "packageManager": "yarn@1.22.19"
    // ...
}
```
