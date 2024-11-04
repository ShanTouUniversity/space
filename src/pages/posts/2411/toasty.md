---
layout: "../../../layouts/MarkdownLayout.astro"

title: "Toasty：一款致力于易用的 Rust 异步 ORM"
pubDate: 2024-10-23  # 根据原文发布日期修改
upDate: 2024-10-23  # 如果文章更新，修改日期
author: "Carl Lerche" # 作者根据原文推断
description: "Toasty 是一个面向 Rust 的异步 ORM，旨在简化数据库交互。它支持 SQL 和 NoSQL 数据库，优先考虑易用性而非极致性能，特别适合 Web 应用开发。本文介绍了 Toasty 的设计理念、使用方法和未来发展方向。"
tags: [Rust, ORM, 异步, 数据库, SQL, NoSQL, DynamoDB, Cassandra, Sqlite, 易用性,  代码生成,  Web 应用,  生产力]
---

> 译自： <https://tokio.rs/blog/2024-10-23-announcing-toasty>

Toasty 是一个面向 Rust 编程语言的异步 ORM，它优先考虑易用性。Toasty 支持 SQL 和 NoSQL 数据库，包括 DynamoDB 和 Sqlite，并即将支持 Cassandra。

Toasty 目前仍处于早期开发阶段，可视作预览版，尚未准备好用于生产环境，也尚未发布到 crates.io。公开 Github 仓库的目的是为了推动公开开发，并收集社区的宝贵反馈。

使用 Toasty 的第一步是创建一个 schema 文件来定义应用程序的数据模型。[`hello-toasty/schema.toasty`](https://github.com/tokio-rs/toasty/blob/main/examples/hello-toasty/schema.toasty) 文件就是一个例子：

```rust
model User {
    #[key]
    #[auto]
    id: Id,

    name: String,

    #[unique]
    email: String,

    todos: [Todo],

    moto: Option<String>,
}

model Todo {
    #[key]
    #[auto]
    id: Id,

    #[index]
    user_id: Id<User>,

    #[relation(key = user_id, references = id)]
    user: User,

    title: String,
}
```

使用 Toasty 的命令行工具，可以根据 schema 文件生成所有必要的 Rust 代码，方便操作数据模型。上述 schema 生成的代码位于[这里](https://github.com/tokio-rs/toasty/tree/main/examples/hello-toasty/src/db)。

生成代码后，即可轻松操作数据模型：

```rust
// 创建一个新用户并添加一些待办事项
User::create()
    .name("John Doe")
    .email("john@example.com")
    .todo(Todo::create().title("做披萨"))
    .todo(Todo::create().title("完成 Toasty"))
    .todo(Todo::create().title("睡觉"))
    .exec(&db)
    .await?;

// 从数据库加载用户
let user = User::find_by_email("john@example.com").get(&db).await?;

// 加载并遍历用户的待办事项
let mut todos = user.todos().all(&db).await.unwrap();
while let Some(todo) = todos.next().await {
    let todo = todo.unwrap();
    println!("{:#?}", todo);
}
```

## 为什么需要 ORM？

Rust 长期以来被定位为系统级编程语言，在服务器端，Rust 在数据库、代理和其他基础设施领域的应用增长迅速。然而，越来越多的团队开始将 Rust 用于更高级别的应用，例如传统的 Web 应用程序。

普遍的共识是，在性能要求不那么苛刻的情况下，应该优先考虑开发效率。构建 Web 应用时，性能通常是次要于生产力的。那么，为什么团队在性能要求不那么高的情况下也更多地采用 Rust 呢？ 因为一旦掌握了 Rust，开发效率实际上非常高。

生产力是一个复杂的多方面问题。Rust 的编辑-编译-测试周期确实有提升空间。但更少的 bug、生产环境问题以及强大的长期维护性（Rust 的借用检查器鼓励编写更易维护的代码）弥补了这一不足。此外，Rust 能够胜任多种应用场景，无论是基础设施级别的服务器应用、高级 Web 应用，还是客户端应用（通过 WASM 运行在浏览器，或原生运行在 iOS、MacOS、Windows 等平台），都体现了 Rust 出色的代码复用能力。内部库只需编写一次，即可在各种场景下复用。

因此，尽管 Rust 可能不是原型开发的最佳选择，但对于长期项目而言，它极具竞争力。

回到 ORM 的话题。一个功能完善的库生态系统对于提升生产力至关重要。Rust 拥有一个充满活力的生态系统，但传统上更侧重于基础设施领域。面向高级 Web 应用的库相对较少（尽管这种情况正在改变）。而且，许多现有库的 API 设计更注重性能，而牺牲了易用性。Rust 的生态系统中存在这一缺口。许多团队反映，Rust 的 ORM 库现状是一个主要的痛点（一些团队甚至选择自行实现数据库抽象层来解决这个问题）。Toasty 旨在填补这一缺口，专注于高级应用场景，并将易用性置于性能之上。

## 如何提升 ORM 的易用性？

这无疑是一个关键问题。Rust 社区仍在探索如何设计易于使用的库。Rust 的 trait 和生命周期功能强大，可以提高性能，实现一些有趣的模式（例如 [typestate](https://cliffle.com/blog/rust-typestate/) 模式）。然而，过度使用这些特性也会导致库难以使用。

因此，在构建 Toasty 时，我们尽量减少 trait 和生命周期的使用。以下代码片段摘自 Toasty 生成的代码，预计 95% 的 Toasty 用户遇到的最复杂的类型签名也不过如此：

```rust
pub fn find_by_email<'a>(
	email: impl stmt::IntoExpr<'a, String>
) -> FindByEmail<'a> {

	let expr = User::EMAIL.eq(email);
	let query = Query::from_expr(expr);
	FindByEmail { query }
}
```

这段代码中包含了生命周期 `'a`，是为了避免将数据复制到查询构建器中，但我仍在考虑是否移除它。根据用户反馈，未来可能会完全移除生命周期。

易用性的另一个方面是减少样板代码。Rust 已经拥有一个强大的工具：过程宏。很多人都用过 Serde，并体会到它的便捷。然而，Toasty 目前没有使用过程宏，至少在初期阶段不会使用。

过程宏会在编译时生成大量隐藏代码。对于 Serde 这样的库来说，这不成问题，因为 Serde 宏生成的是公共 trait（Serialize 和 Deserialize）的实现。Serde 用户通常不需要了解这些 trait 的实现细节。

但 Toasty 的情况不同。Toasty 会生成许多用户会直接使用的公共方法和类型。在 “Hello Toasty” 示例中，Toasty 生成了 `User::find_by_email` 方法。Toasty 采用显式的代码生成步骤，将代码生成到用户可以查看和阅读的文件中，而不是使用过程宏。Toasty 会尽量使生成的代码易于阅读，方便用户发现生成的方法。这种可发现性将提升库的易用性。

Toasty 仍处于早期开发阶段，API 会根据用户反馈不断演进。如果您遇到任何问题，请积极反馈，我们会尽力解决。


## SQL 与 NoSQL 的兼容性

Toasty 同时支持 SQL 和 NoSQL 数据库。目前已支持 Sqlite 和 DynamoDB，未来添加其他 SQL 数据库的支持应该比较 straightforward。Cassandra 的支持也即将推出，并希望社区能够贡献更多数据库的实现。

需要明确的是，Toasty 虽然同时支持 SQL 和 NoSQL 数据库，但**并不会**抽象化底层数据库的差异。使用 Toasty 为 SQL 数据库编写的应用无法直接在 NoSQL 数据库上运行。Toasty 也不会抽象化 NoSQL 数据库的差异，您需要了解如何根据目标数据库的特性来建模 schema。我们发现，无论后端数据存储是什么，大多数数据库库的核心功能都是相同的：将数据映射到结构体，并执行基本的 Get、Insert 和 Update 查询.

Toasty 从这些标准功能出发，并根据需要提供特定于数据库的特性。它还会通过选择性地生成查询方法，帮助您避免生成针对目标数据库低效的查询。

## 未来规划

欢迎大家试用 Toasty，体验示例，并积极探索。Toasty 目前仍在积极开发中，尚未准备好用于生产环境。我们的首要目标是完善 Toasty 的功能，使其能够在明年（预计是接近年底）投入实际应用。

Toasty 这种同时支持 SQL 和 NoSQL 数据库的方式较为新颖（据我们所知）。如果您了解类似的先例，特别是其中遇到的问题，欢迎分享您的经验。我们也希望听到大家关于数据库、ORM 等方面的想法和建议。可以在 Tokio 的 [Discord](https://discord.gg/tokio) 服务器上的 #toasty 频道进行讨论。您也可以在 [Github 仓库](https://github.com/tokio-rs/toasty) 上创建 issue 来提议新功能，或参与 API 设计和发展方向的讨论。
