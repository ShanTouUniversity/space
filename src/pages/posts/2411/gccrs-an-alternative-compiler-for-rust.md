---
layout: "../../../layouts/MarkdownLayout.astro"
title: "gccrs：另一个 Rust 编译器"
pubDate: 2024-11-07 
author: "Arthur Cohen on behalf of the gccrs project"
description: "gccrs 项目正在开发一个用于 Rust 的替代编译器，作为 GCC 的一部分。本文阐述了 gccrs 的目标、非目标，与 Rust 项目的关系，以及未来的合作机会，强调了 gccrs 致力于与 Rust 社区共同发展，而非分裂生态。"
tags: [Rust, gccrs, GCC, 编译器, 兼容性, 互操作性, 社区, 开源]
---

_本文由 gccrs 项目团队应 Rust 项目邀请撰写，旨在阐明 gccrs 与 Rust 项目的关系以及未来的合作机会。_

`gccrs` 是一个正在开发中的 Rust 替代编译器，它是 [GCC 项目](https://gcc.gnu.org/) 的一部分。GCC 是一套支持多种编程语言的编译器集合，它们共享一个通用的编译框架。你可能听说过 `gccgo`、`gfortran` 或 `g++`，它们都是这个项目——[GNU 编译器集合](https://gcc.gnu.org/)——中的二进制文件。`gccrs` 的目标是为 GCC 添加对 Rust 语言的支持，并力求与官方编译器 `rustc` 的行为完全一致。

首先要说明的是，启动 `gccrs` 项目的主要原因是它很有趣。开发编译器是一件非常有成就感的事情，将不同的组件组装起来也充满乐趣。这个项目始于 2014 年，彼时 Rust 1.0 版本尚未发布。由于当时 Rust 语言仍在快速演进，项目一度被搁置。大约在 2019 年，在 [Philip Herron](https://github.com/philberty) 的带领下，并在 [Open Source Security](https://opensrcsec.com/) 和 [Embecosm](https://www.embecosm.com/) 的资助下，`gccrs` 的开发工作重新启动。从那时起，我们一直在稳步推进对 Rust 语言的全面支持，我们的团队也在不断壮大，目前大约有十几位贡献者定期参与项目开发。在过去的四年里，我们参与了谷歌编程之夏 (GSoC) 项目，并有多名学生加入了我们的队伍。

`gccrs` 的主要目标是为编译 Rust 代码提供另一种选择。GCC 是一个历史悠久的项目，最初发布于 1987 年。多年来，它积累了大量的贡献，并支持多种目标平台，包括一些 `rustc` 的主要后端 LLVM 所不支持的平台。一个典型的例子是 Dreamcast 的自制游戏社区，一群充满激情的工程师们正在为 Dreamcast 游戏机开发游戏。Dreamcast 使用的 SuperH 处理器架构得到了 GCC 的支持，但 LLVM 并不支持。这意味着如果不借助 `gccrs` 或 `rustc-codegen-gcc` 后端之类的项目，Rust 就无法在这些平台上使用——它们的主要区别将在后文解释。

GCC 还受益于几十年来积累的大量使用非内存安全语言编写的软件。因此，GCC 开发了许多安全特性，以外部插件或内置静态分析器的形式存在。这些分析器和插件在 GCC 的内部表示上运行，这意味着它们与具体的编程语言无关，可以在 GCC 支持的所有编程语言上使用。同样地，许多 GCC 插件被用于提高关键项目的安全性，例如 Linux 内核，它最近也开始支持 Rust 语言。这使得 `gccrs` 成为分析不安全 Rust 代码，以及更广泛地分析与现有 C 代码交互的 Rust 代码的有用工具。我们也希望 `gccrs` 能够从另一个角度——尝试复制其他工具功能的工具的角度——为 Rust 规范的制定工作提供帮助，通常需要仔细的实验和源码阅读，因为现有的文档往往不够详尽。我们还在围绕 `gccrs` 和 `rustc` 开发各种工具，其唯一目的是确保 `gccrs` 与 `rustc` 一样正确——这有助于发现一些令人惊讶的行为、未预期的功能或未明确的假设。

需要指出的是，我们协助 Rust 规范工作并非为了将其变成一份认证其他编译器是否为“Rust 编译器”的文档。虽然我们相信该规范对 `gccrs` 很有用，但我们的主要目标是为其做出贡献，尽可能地对其进行审查和补充。

此外，`gccrs` 项目仍处于早期阶段，还有大量工作要做。这里有很多机会让你留下自己的印记，对于对编译器感兴趣的贡献者来说，也有很多容易上手的任务。我们一直致力于为团队成员和 GSoC 学生创造一个安全、有趣和富有吸引力的环境。我们鼓励任何感兴趣的朋友通过我们的[各种交流平台](https://rust-gcc.github.io/#get-involved)与我们联系，我们也乐于提供指导，帮助你学习如何为项目和编译器做出贡献。

然而，更重要的是，有些事情 `gccrs` 并**不**打算做。该项目有一些明确的非目标，我们对它们的重视程度与目标一样高。

其中最关键的非目标是，`gccrs` 不会成为替代或扩展 Rust 语言的途径。我们不打算创建 GNU 特有的 Rust 版本，它不会有不同的语义或略有不同的功能。`gccrs` 不是用来引入新的 Rust 特性的工具，也不会用于绕过 RFC 流程——如果我们希望在 Rust 中引入某些特性，我们会遵循 RFC 流程。Rust 不是 C，我们不打算通过让某些特性仅对 `gccrs` 用户可用而在标准中引入细微的差别。我们深知由编译器特定标准带来的痛苦，并从其他编程语言的历史中吸取了教训。

我们不希望 `gccrs` 成为 `rustc_codegen_gcc` 后端的竞争对手。虽然这两个项目最终都旨在使用 GCC 编译框架编译 Rust 代码，但它们为 Rust 语言带来的好处略有不同。例如，`rustc_codegen_gcc` 可以轻松利用 `rustc` 出色的诊断信息和友好的错误提示，并使 Rust 能够在 GCC 特定的平台上轻松使用。另一方面，它需要首先安装 `rustc`，而 `gccrs` 则完全是一个独立的项目。这对某些用户和 Linux 内核开发者来说非常重要，他们认为能够使用同一个编译器编译整个内核（包括 C 和 Rust 部分）至关重要。由于 `gccrs` 是一个独立的 GCC 前端，它还可以提供更多插件接入点。它也使得在不支持 `libgccjit` 的旧版 GCC 环境中，在 GCC 特定平台上使用 Rust 成为可能。尽管如此，我们与 `rustc_codegen_gcc` 的开发者们保持着良好的关系，并多次互相帮助，尤其是在处理 GCC 基于补丁的贡献流程方面。

所有这些都与一个更宏大的目标息息相关，可以概括为：我们不希望分裂 Rust 生态系统。我们希望 `gccrs` 能够帮助 Rust 语言触达更多用户和平台。

为了确保这一点，我们采取了多项措施，以确保尊重 Rust 项目的价值观并恰当地展现它们。其中一项我们非常重视的特性是在编译器中添加了一个略显烦人的命令行标志 `-frust-incomplete-and-experimental-compiler-do-not-use`。如果不使用这个标志，`gccrs` 将无法编译任何代码，并会输出以下错误信息：

> crab1: 致命错误：gccrs 尚未能够正确地编译 Rust 代码。目前生成的大部分错误是由 gccrs 导致的，而非你尝试编译的 crate 的问题。因此，请直接向我们报告错误，而不是在相关 crate 的代码仓库中提交 issue。
>
> 我们的 GitHub 仓库：<https://github.com/rust-gcc/gccrs>
>
> 我们的 Bugzilla 跟踪器：<https://gcc.gnu.org/bugzilla/buglist.cgi?bug\_status=\_\_open\_\_&component=rust&product=gcc>
>
> 如果你理解这一点，并且明白生成的二进制文件行为可能不符合预期，你可以通过添加以下标志以实验性的方式使用 gccrs：
>
> `-frust-incomplete-and-experimental-compiler-do-not-use`
>
> 或者设置以下环境变量（任意值均可）：
>
> `GCCRS_INCOMPLETE_AND_EXPERIMENTAL_COMPILER_DO_NOT_USE`
>
> 对于 cargo-gccrs，这意味着需要设置以下环境变量：
>
> `GCCRS_EXTRA_ARGS="-frust-incomplete-and-experimental-compiler-do-not-use"`

在 `gccrs` 能够正确编译 Rust 代码，更重要的是，能够拒绝不正确的 Rust 代码之前，我们将保留这个命令行选项。我们希望通过这种方式避免用户因代码无法编译而向 Rust crate 的维护者提交 issue，因为这很可能是由于我们尚未完全实现 Rust 语言的某些部分导致的。我们创建 Rust 替代编译器的目标绝不能对 Rust 社区的任何成员造成负面影响。当然，并非所有人都喜欢这个命令行标志，它也确实引起了一些争议……但我们相信它很好地体现了我们的核心价值观。

同样地，`gccrs` 与其他 GCC 项目的不同之处在于，它没有使用邮件列表作为主要的沟通方式。我们正在构建的编译器将由 Rust 社区使用，我们认为应该让 Rust 社区能够方便地与我们联系并报告他们遇到的问题。由于 Rustaceans 习惯使用 GitHub，因此在过去五年中，我们也一直使用 GitHub 作为主要的开发平台。此外，我们使用 [Zulip](https://gcc-rust.zulipchat.com/) 作为主要的沟通平台，并鼓励任何希望与我们交流的朋友加入。当然，我们也保留了邮件列表和 IRC 频道 (<gcc-rust@gcc.gnu.org> 和 [oftc.net](https://oftc.net/) 上的 #gccrust)，欢迎所有人加入。

为了进一步避免 `gccrs` 对 Rust 生态系统造成摩擦，我们对编译器的细节格外谨慎，这意味着在可行的情况下重用 `rustc` 的组件，在这些组件上共享开发工作，并与 Rust 社区的专家们进行广泛的沟通。`gccrs` 目前已经使用了两个 `rustc` 组件：一个稍旧版本的 `polonius`（下一代 Rust 借用检查器）和编译器的 [`rustc_parse_format`](https://github.com/rust-lang/rust/tree/master/compiler/rustc_parse_format) crate。重用这些 crate 的原因有很多，最主要的原因是确保正确性。借用检查是一个复杂的主题，也是 Rust 编程语言的基石。如果 `rustc` 和 `gccrs` 在借用规则上存在细微的差别，将会给用户带来困扰，降低生产力——但通过努力将 `polonius` 集成到我们的编译流水线中，我们可以确保 `gccrs` 的输出结果与 `rustc` 一致。您可以在这里[了解更多](https://rust-gcc.github.io/2024/09/20/reusing-rustc-components.html)我们使用的以及计划重用的组件信息。如果可能的话，我们也希望为 `polonius` 项目本身做出贡献，并帮助改进它。这种组件的交叉融合显然对我们有利，但我们相信它对整个 Rust 项目和生态系统也同样有益，并将有助于增强这些实现的稳健性。

重用 `rustc` 组件的策略还可以扩展到编译器的其他领域：类型系统的各种组件，例如 trait 解析器（一个重要且复杂的软件），都可以集成到 `gccrs` 中。类似解析器这样更简单的组件，例如我们已经完成的格式化字符串解析器和内联汇编解析器，对我们来说也很有意义。它们将有助于确保我们处理的内部表示与 Rust 标准库所期望的表示相对应。

最后，我们认为，为了避免 Rust 生态系统出现分裂，我们可以采取的最重要步骤之一是进一步加强与 Rust 社区的联系。我们已经得到了 Rust 社区的大力帮助，我们相信 `gccrs` 对广大 Rust 用户来说是一个有趣的项目。我们非常希望听到您对这个项目的期望，以及您关于如何减少生态系统分裂或降低您已发布的 crate 与 `gccrs` 兼容性摩擦的想法。我们在 2024 年 RustConf 大会上与大家愉快地交流了 `gccrs` 项目，每个人对项目的兴趣都让我们倍感鼓舞。如果您对我们如何进一步为 Rust 做出贡献有任何想法，欢迎与我们联系。
