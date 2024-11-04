---
layout: "../../../layouts/MarkdownLayout.astro"

title: "Toasty：一款易于使用的 Rust 异步 ORM"
pubDate: 2024-10-23  # 根据原文发布日期修改
upDate: 2024-10-23  # 如果文章更新，修改日期
author: "Carl Lerche" # 作者根据原文推断
description: "Toasty 是一个面向 Rust 的异步 ORM，旨在简化数据库交互。它支持 SQL 和 NoSQL 数据库，优先考虑易用性而非极致性能，特别适合 Web 应用开发。本文介绍了 Toasty 的设计理念、使用方法和未来发展方向。"
tags: [Rust, ORM, 异步, 数据库, SQL, NoSQL, DynamoDB, Cassandra, Sqlite, 易用性,  代码生成,  Web 应用,  生产力]
---

> 译自： <https://tokio.rs/blog/2024-10-23-announcing-toasty>

Toasty 是一个面向 Rust 编程语言的异步 ORM，它优先考虑易用性。Toasty 支持 SQL 和 NoSQL 数据库，包括 DynamoDB 和 Cassandra（即将推出）。

Toasty 目前处于开发的早期阶段，应该被视为“预览版”（尚未准备好用于实际应用）。它也尚未在 crates.io 上发布。我现在宣布它是因为我已经公开了 Github 仓库，并将继续公开开发，并希望获得反馈。

使用 Toasty 的项目首先要创建一个 schema 文件来定义应用程序的数据模型。例如，这是 [`hello-toasty/schema.toasty`](https://github.com/tokio-rs/toasty/blob/main/examples/hello-toasty/schema.toasty) 文件的内容。

```rust
model User { #[key] #[auto] id: Id, name: String, #[unique] email: String, todos: [Todo], moto: Option<String>, } model Todo { #[key] #[auto] id: Id, #[index] user_id: Id<User>, #[relation(key = user_id, references = id)] user: User, title: String, }
```

使用 Toasty CLI 工具，您将生成使用此数据模型所需的所有 Rust 代码。上述 schema 生成的代码位于[此处](https://github.com/tokio-rs/toasty/tree/main/examples/hello-toasty/src/db)。

然后，您可以轻松地使用数据模型：

```rust
// 创建一个新用户并给他们一些待办事项。
User::create()
    .name("John Doe")
    .email("john@example.com")
    .todo(Todo::create().title("Make pizza"))
    .todo(Todo::create().title("Finish Toasty"))
    .todo(Todo::create().title("Sleep"))
    .exec(&db)
    .await?;

// 从数据库加载用户
let user = User::find_by_email("john@example.com").get(&db).await?

// 加载并迭代用户的待办事项
let mut todos = user.todos().all(&db).await.unwrap();
while let Some(todo) = todos.next().await {
    let todo = todo.unwrap();
    println!("{:#?}", todo);
}
```

## 为什么选择 ORM？

历史上，Rust 一直被定位为系统级编程语言。在服务器端，Rust 在数据库、代理和其他基础设施级应用等用例中的增长最快。然而，在与将 Rust 用于这些基础设施级用例的团队交谈时，经常听到他们开始更频繁地将 Rust 用于更高级别的用例，例如更传统的 Web 应用程序。

普遍的看法是在性能不太重要时最大限度地提高生产力。我同意这个观点。在构建 Web 应用程序时，性能是次于生产力的考虑因素。那么，为什么团队在性能不太重要的情况下更频繁地采用 Rust 呢？这是因为一旦你学会了 Rust，你就能非常高效。

生产力是复杂且多方面的。我们都同意 Rust 的编辑-编译-测试周期可以更快。这种摩擦被更少的错误、生产问题和强大的长期维护故事所抵消（Rust 的借用检查器倾向于鼓励更易于维护的代码）。此外，由于 Rust 可以很好地适用于许多用例，无论是基础设施级服务器用例、更高级别的 Web 应用程序，还是客户端（通过 WASM 的浏览器以及 iOS、MacOS、Windows 等原生客户端），Rust 都有出色的代码重用故事。内部库可以编写一次并在所有这些上下文中重用。

因此，虽然 Rust 可能不是用于原型设计的最高效的编程语言，但对于将持续多年的项目来说，它非常有竞争力。

好的，那么为什么要选择 ORM 呢？针对给定用例的全功能库生态系统是生产力难题的重要组成部分。Rust 有一个充满活力的生态系统，但历史上更多地关注基础设施级用例。针对更高级别的 Web 应用程序用例的库较少（尽管最近这种情况正在发生变化）。此外，今天存在的许多库都强调以牺牲易用性为代价来最大化性能的 API。Rust 的生态系统中存在缺口。我与之交谈的许多团队报告说，Rust 的 ORM 库的现状是一个很大的摩擦点（不止一个团队选择实现他们内部的数据库抽象来处理这种摩擦）。Toasty 旨在通过关注更高级别的用例并优先考虑易用性而不是最大化性能来填补这一空白。

## 是什么让 ORM 易于使用？

当然，这是价值百万美元的问题。Rust 社区仍在探索如何设计易于使用的库。Rust 的 trait 和生命周期非常引人注目，可以提高性能并实现有趣的模式（例如，[typestate](https://cliffle.com/blog/rust-typestate/) 模式）。然而，过度使用这些功能也会导致库难以使用。

因此，在构建 Toasty 时，我试图对此保持敏感，并专注于尽量少地使用 trait 和生命周期。这段代码片段是由 Toasty 从 schema 文件生成的，我预计这将是 95% 的 Toasty 用户遇到的最复杂的类型签名。

```rust
pub fn find_by_email<'a>(
    email: impl stmt::IntoExpr<'a, String>
) -> FindByEmail<'a> {
    let expr = User::EMAIL.eq(email);
    let query = Query::from_expr(expr);
    FindByEmail { query }
}
```

这确实包含了一个生命周期以避免将数据复制到查询构建器中，我对此仍然持观望态度。根据用户反馈，我将来可能会完全删除生命周期。

易用性的另一个方面是最大限度地减少样板代码。Rust 已经为此提供了一个杀手级功能：过程宏。你们大多数人已经使用过 Serde，所以你们知道这有多令人高兴。也就是说，我选择不将过程宏用于 Toasty，至少在最初阶段不使用。

过程宏在构建时会生成大量隐藏代码。对于像 Serde 这样的库来说，这没什么大不了的，因为 Serde 宏生成公共 trait（Serialize 和 Deserialize）的实现。Serde 的用户并不真正需要了解这些 trait 的实现细节。

Toasty 则不同。Toasty 将生成许多您将直接使用的公共方法和类型。在“Hello Toasty”示例中，Toasty 生成了 `User::find_by_email` 方法。我没有使用过程宏，而是使用了一个显式的代码生成步骤，其中 Toasty 将代码生成到您可以打开和阅读的文件中。Toasty 将尝试使生成的代码尽可能易于阅读，以便轻松发现生成的方法。这种增加的可发现性将使库更易于使用。

Toasty 仍在开发早期，API 将根据您的反馈进行改进。最终，如果您遇到摩擦，我希望听到您的意见并进行修复。

## SQL 和 NoSQL

Toasty 同时支持 SQL 和 NoSQL 数据库。截至今天，这意味着 Sqlite 和 DynamoDB，尽管添加对其他 SQL 数据库的支持应该非常简单。我还计划很快添加对 Cassandra 的支持，但我希望其他人也能为不同数据库的实现做出贡献。

需要明确的是，Toasty 同时适用于 SQL 和 NoSQL 数据库，但**不会**抽象化目标数据库。使用 Toasty 为 SQL 数据库编写的应用程序不会透明地在 NoSQL 数据库上运行。相反，Toasty 不会抽象化 NoSQL 数据库，您需要了解如何建模您的 schema 以利用目标数据库。我注意到数据库库的大部分功能都相同，无论后端数据存储是什么：将数据映射到结构体并发出基本的 Get、Insert 和 Update 查询。

Toasty 从这个标准功能集开始，并根据选择提供特定于数据库的功能。它还将通过选择性地生成查询方法来帮助您避免为目标数据库发出低效的查询。

## 后续步骤

您应该尝试 Toasty，尝试示例，并进行一些试验。今天，Toasty 仍处于积极开发中，尚未准备好用于实际应用。紧接着的下一步将是填补这些空白。我的目标是让 Toasty 在明年某个时候（实际上是接近年底）准备好用于实际应用。

此外，尝试以 Toasty 的方式支持 SQL 和 NoSQL 是新颖的（据我所知）。如果您知道以前的类似尝试，尤其是以前的尝试遇到的陷阱，我很想听听。我也知道你们中的许多人对使用数据库、ORM 等有强烈的意见，我期待着这些讨论。在 Tokio 的 [Discord](https://discord.gg/tokio) 中有一个 #toasty 频道供讨论。此外，请随时在 [Github 仓库](https://github.com/tokio-rs/toasty) 上创建 issue 来提出功能或开始关于 API 设计和方向的对话。
