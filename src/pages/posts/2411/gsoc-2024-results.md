---
layout: "../../../layouts/MarkdownLayout.astro"
title: "Rust 编程之夏 2024 项目成果"
pubDate: 2024-11-07  # 这里使用原文发布日期
upDate: 2024-11-07 # 如果文章更新，修改日期
author: " Jakub Beránek, Jack Huey and Paul Len" # 作者根据原文推断
description: "Rust 项目首次参与 Google 编程之夏 (GSoC) 并取得圆满成功！九位贡献者在编译器性能、工具链改进和 .NET 互操作性等方面做出了重大贡献。本文总结了每个项目的成果和贡献者的反馈。"
tags: [Rust, GSoC, 编程之夏, 编译器, Cranelift, cargo, rustfmt, miri, .NET, WebAssembly, 性能, 工具链]
---

> 译自： <https://blog.rust-lang.org/2024/11/07/gsoc-2024-results.html>

正如我们先前[宣布](https://blog.rust-lang.org/2024/05/01/gsoc-2024-selected-projects.html)的，Rust 项目在今年首次参与了[谷歌编程之夏 (GSoC)](https://summerofcode.withgoogle.com/) 活动。九位贡献者在过去几个月里孜孜不倦地推进着他们各自的项目。这些项目的周期长短不一，有些在八月结束，而最后一个则持续到十月中旬。现在，所有项目的最终报告均已提交，我们高兴地宣布，九位贡献者全部顺利通过了最终审核！这表明我们认为他们的项目都取得了成功，即便有些项目可能并未完全实现最初设定的所有目标（但这也在意料之中）。

我们与各位 GSoC 贡献者保持着良好的互动，从他们的反馈来看，他们对 GSoC 项目感到满意，并从中获益匪浅。当然，我们也由衷感谢他们所做出的贡献——其中一些贡献者甚至在项目结束后仍在继续贡献，这非常令人鼓舞。总而言之，我们认为 2024 年的谷歌编程之夏对 Rust 项目而言是一次成功，我们期待在不久的将来再次参与 GSoC 或类似的项目。如果您有意成为 GSoC 贡献者，不妨看看我们的[项目创意列表](https://github.com/rust-lang/google-summer-of-code)。

下文将简要概述我们每个 GSoC 2024 项目，包括来自贡献者和导师的反馈。您可以在[此处](https://github.com/rust-lang/google-summer-of-code/blob/main/gsoc/past/2024.md)找到更多项目信息。

### 为 cargo-semver-checks 添加 lint 级别配置

* 贡献者：[Max Carr](https://github.com/suaviloquence/)
* 导师：[Predrag Gruevski](https://github.com/obi1kenobi)
* [最终报告](https://blog.mcarr.one/gsoc-final/)

[cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) 是一款用于自动检测语义化版本冲突的工具，未来计划集成到 Cargo 中。该项目旨在让 cargo-semver-checks 支持更多 _可选_ 的 lint，允许用户配置在不同情况下启用哪些 lint，以及将 lint 结果报告为错误还是警告。Max 通过实现一个[完善的系统](https://github.com/obi1kenobi/cargo-semver-checks?tab=readme-ov-file#lint-level-configuration)，让用户可以直接在 `Cargo.toml` 清单文件中配置 `cargo-semver-checks` 的 lint，从而实现了这一目标。他还与 Cargo 团队深入探讨了设计方案，以确保其与其他 Cargo lint 的配置方式兼容，并且不会在 cargo-semver-checks 并入 Cargo 时造成兼容性问题。

Predrag 是 `cargo-semver-checks` 的作者，也是 Max 在本项目中的导师。他对 Max 的贡献非常满意，认为其成果甚至超出了最初的项目范围：

> Max 设计并构建了我们最需要的功能之一，还为其他几个用户期待的功能制作了设计原型。此外，他还发现编写高质量的命令行界面和功能测试并非易事，因此他改进测试系统，以便更轻松地编写优质测试。Max 在今年夏天的辛勤付出让 cargo-semver-checks 的未来发展更加顺畅。

Max，优秀！

### 为 Cranelift 实现更快的寄存器分配器

* 贡献者：[Demilade Sonuga](https://github.com/d-sonuga)
* 导师：[Chris Fallin](https://github.com/cfallin) 和 [Amanieu d'Antras](https://github.com/Amanieu)
* [最终报告](https://d-sonuga.netlify.app/gsoc/regalloc-iii/)

Rust 编译器可以使用多种 _后端_ 生成可执行代码。主要的当然是 LLVM 后端，但也有一些其他的后端，例如 [GCC](https://github.com/rust-lang/rustc_codegen_gcc)、[.NET](https://blog.rust-lang.org/2024/11/07/gsoc-2024-results.html#rust-to-net-compiler---add-support-for-compiling--running-cargo-tests) 和 [Cranelift](https://github.com/rust-lang/rustc_codegen_cranelift)。Cranelift 是一个面向多种硬件架构的代码生成器，其功能类似于 LLVM。Cranelift 后端使用 Cranelift 将 Rust 代码编译为可执行代码，目标是提升编译性能，尤其针对调试（未优化）构建。虽然 Cranelift 后端的速度已经超过 LLVM 后端，但我们发现 Cranelift 使用的寄存器分配器拖慢了它的速度。

寄存器分配是编译器中一项重要的任务，编译器需要决定哪些寄存器用于存放程序的变量和临时表达式。通常，寄存器分配的目标是以最大化程序运行时性能的方式进行分配。然而，对于未优化的构建，我们通常更关注编译速度。

因此，Demilade 提议实现一个名为 `fastalloc` 的全新 Cranelift 寄存器分配器，目标是尽可能提高速度，即使会牺牲一些生成的代码质量。他准备得非常充分，甚至在 GSoC 项目开始之前就完成了原型实现！不过，寄存器分配是一个复杂的问题，因此他花费了数月时间来完成并优化实现。Demilade 还广泛地使用了模糊测试，以确保他的分配器即使在各种边缘情况下也能保持稳健。

分配器完成后，Demilade 使用编译器[基准测试套件](https://github.com/rust-lang/rustc-perf) 对比了使用原有分配器和新分配器的 Cranelift 后端的性能。结果令人振奋！新的寄存器分配器让 Rust 编译器在多个基准测试中的指令执行量减少了 18%，其中包括一些复杂的测试，例如对 Cargo 本身进行调试构建。值得注意的是，这是对编译整个 crate 所需时间的 _端到端_ 性能提升，非常令人印象深刻。如果您想更详细地了解测试结果，甚至亲自运行基准测试，请查看 Demilade 的[最终报告](https://d-sonuga.netlify.app/gsoc/regalloc-iii/)，其中包含了如何复现基准测试的详细说明。

除了提升 Rust 代码的编译速度外，新的寄存器分配器还可以用于其他场景，因为它可以独立用于 Cranelift（在 Cranelift 代码生成后端之外）。我们对 Demilade 的工作非常满意！需要注意的是，新的寄存器分配器目前尚未在 Cranelift 代码生成后端中默认启用，但我们预计它最终会成为调试构建的默认选择，从而在未来加快使用 Cranelift 后端编译 Rust crate 的速度。

### 改进 Rust 基准测试套件

* 贡献者：[Eitaro Kubotera](https://github.com/s7tya)
* 导师：[Jakub Beránek](https://github.com/kobzol)
* [最终报告](https://gist.github.com/s7tya/96dc1cae4ca9e59841a95f0f48d023d6)

这个项目的定义比较开放，主要目标是改进 [Rust 编译器基准测试套件](https://github.com/rust-lang/rustc-perf) 的用户界面。Eitaro 从多个角度着手解决了这个问题。他改进了运行时基准测试的可视化——它们之前在基准测试套件中 somewhat 被忽视——方法是将它们添加到我们的[仪表板](https://perf.rust-lang.org/dashboard.html) 并实现了运行时基准测试结果的[历史图表](https://github.com/rust-lang/rustc-perf/pull/1922)，这有助于我们了解特定基准测试在较长时间内的表现。

他进行的另一项改进是直接在 `rustc-perf` 网站中嵌入了分析器轨迹可视化工具. 这项任务颇具挑战性，需要他对多个可视化工具进行评估，并找到一种以非侵入式的方式将它们集成到基准测试套件的源代码中的方法。最终，他成功地将 [Perfetto](https://ui.perfetto.dev/) 集成到了网站中，并进行了各种[优化](https://github.com/rust-lang/rustc-perf/pull/1968)来提升加载编译配置文件的性能。

最后同样重要的是，Eitaro 还为基准测试套件创建了一个全新的用户界面，完全在[终端](https://github.com/rust-lang/rustc-perf/pull/1955)中运行。通过这个界面，Rust 编译器贡献者无需启动 rustc-perf 网站（在本地部署该网站可能比较麻烦）即可查看编译器的性能。

除了上述贡献之外，Eitaro 还对基准测试套件的各个部分进行了许多其他小的改进。感谢他所有的工作！

### 将 cargo shell 补全迁移到 Rust

* 贡献者：[shanmu](https://github.com/shannmu)
* 导师：[Ed Page](https://github.com/epage)
* [最终报告](https://hackmd.io/@PthRWaPvSmS_2Yu_GLbGpg/Hk-ficKpC)

Cargo 的补全脚本一直以来都是手动维护的，并且在修改时容易出错。这项工作的目标是根据 Cargo 命令行的定义自动生成补全，并提供扩展点以便动态生成结果。

shanmu 采用了 [clap](https://github.com/clap-rs/clap)（Cargo 使用的命令行解析器）中动态补全的原型，并使其能够在常用 shell 中正常工作和测试，同时扩展了解析器以覆盖更多情况。然后，他们添加了 CLI 的扩展点，以便提供可动态生成的自定义补全结果。

在下一阶段，shanmu 将其添加到了 nightly Cargo 中，并添加了不同的自定义补全器来匹配手写补全的功能。例如，启用此功能后，当您输入 `cargo test --test=` 并按下 Tab 键时，shell 将自动补全当前 Rust crate 中的所有测试目标！如果您感兴趣，可以查看[说明](https://doc.rust-lang.org/nightly/cargo/reference/unstable.html#native-completions)进行试用。该链接还列出了您可以提供反馈的途径。

您还可以查看以下 issue，了解在稳定此功能之前还有哪些工作要做：

* [clap#3166](https://github.com/clap-rs/clap/issues/3166)
* [cargo#14520](https://github.com/rust-lang/cargo/issues/14520)

### 使用强大的 Rust 特性重写晦涩难懂且容易出错的 Makefile 测试

* 贡献者：[Julien Robert](https://github.com/Oneirical)
* 导师：[Jieyou Xu](https://github.com/jieyouxu)
* [最终报告](https://oneirical.github.io/gsocfinal/)

Rust 编译器有多个测试套件，用于确保其在各种条件下都能正常工作。其中一个套件是 [`run-make` 测试套件](https://github.com/rust-lang/rust/tree/master/tests/run-make)，其测试先前是使用 `Makefile` 编写的。然而，这种设置[存在一些问题](https://github.com/rust-lang/rust/issues/40713)。它无法在 Tier 1 Windows MSVC 目标 (`x86_64-pc-windows-msvc`) 上运行，并且要让它在 Windows 上运行也相当困难。此外，`Makefile` 的语法晦涩难懂，即使经过多人的审查，也常常会忽略错误。

Julien 帮助将基于 `Makefile` 的 `run-make` 测试转换为了基于纯 Rust 的测试，并由名为 [`run_make_support`](https://github.com/rust-lang/rust/tree/master/src/tools/run-make-support) 的测试支持库提供支持。然而，这并非简单的“用 Rust 重写”即可。在这个项目中，Julien：

* 大幅改进了测试文档；
* 修复了 `Makefile` 版本中存在多年却一直未被注意到的多个 bug——一些测试实际上并未进行任何测试，或者悄悄地忽略了错误，因此即使被测试的组件出现回归，这些测试也无法捕获。
* 补充并改进了测试支持库的 API 和实现；以及
* 优化了测试代码的组织结构，使其更易于理解和维护。

为了让您了解他工作量的庞大，他在 GSoC 项目期间移植了近 [250](https://github.com/rust-lang/rust/pulls?q=is%3Apr+author%3Aoneirical+is%3Amerged) 个 Makefile 测试！如果您喜欢双关语，可以看看 Julien 的 PR 的分支名称，它们真的很有趣。

最终，Julien 大幅提高了 `run-make` 测试套件的稳健性，并显著改善了修改现有 `run-make` 测试和编写新测试的体验。多位贡献者表示，相比之前的 `Makefile` 版本，他们更愿意使用基于 Rust 的 `run-make` 测试。

现在，绝大多数 `run-make` 测试[都已使用基于 Rust 的测试基础设施](https://github.com/rust-lang/rust/issues/121876)，仅少数测试由于各种特殊原因仍保留着原有方式。在这些问题解决后，我们终于可以移除遗留的 `Makefile` 测试基础设施了。

### 重写 Rewrite trait

* 贡献者：[SeoYoung Lee](https://github.com/ding-young)
* 导师：[Yacin Tmimi](https://github.com/ytmimi)
* [最终报告](https://ding-young.github.io/posts/gsoc-final/)

[rustfmt](https://github.com/rust-lang/rustfmt) 是一款 Rust 代码格式化工具，由于它与 Cargo 直接集成，因此在 Rust 生态系统中被广泛使用。通常，您只需运行 `cargo fmt` 即可获得格式良好的 Rust 项目。然而，在某些边缘情况下，`rustfmt` 可能会格式化失败。这本身问题不大，但如果它_静默地_失败，不向用户提供任何上下文信息来解释出错原因，就会比较麻烦。这正是 `rustfmt` 之前存在的问题，因为许多函数只返回 `Option` 而不是 `Result`，导致难以添加合适的错误报告机制。

SeoYoung 的项目目标是对 `rustfmt` 进行一次大规模的内部重构，以便跟踪格式化过程中出错的上下文信息。这将有助于将静默失败转换为更友好的错误消息，帮助用户检查和调试问题，甚至让 `rustfmt` 能够在更多情况下重试格式化。

乍听之下，这似乎是一项简单的任务，但在 `rustfmt` 这样复杂的项目中进行如此大规模的重构并不容易。SeoYoung 需要找到一种方法来逐步应用这些重构，以便它们易于审查，并且不会一次性影响整个代码库。她引入了一个新的 trait 来增强原有的 `Rewrite` trait，并修改了现有的实现以与其保持一致。她还必须处理项目开始前未预料到的各种边缘情况。SeoYoung 采用了一种细致而系统的方法，确保没有遗漏任何格式化函数或方法。

最终，重构取得了成功！`rustfmt` 现在可以跟踪更多与格式化失败相关的上下文信息，包括以前无法报告的错误，例如宏格式化问题。它现在还可以提供有关源代码跨度的信息，这有助于识别在超过最大行宽时需要调整间距的代码片段。我们目前尚未将这些额外的错误上下文信息传播到用户侧的错误消息中，因为这是一个我们没有时间完成的延伸目标，但 SeoYoung 表示有兴趣在未来继续完善这方面的工作。

除了改进错误上下文信息的传播外，SeoYoung 还进行了其他各种改进以提高代码库的整体质量，她也一直在帮助其他贡献者理解 `rustfmt`。感谢她为所有人奠定了更好的代码格式化基础！

### Rust 到 .NET 编译器 - 添加对编译和运行 cargo 测试的支持

* 贡献者：[Michał Kostrubiec](https://github.com/FractalFir)
* 导师：[Jack Huey](https://github.com/jackh726)
* [最终报告](https://fractalfir.github.io/generated_html/rustc_codegen_clr_v0_2_0.html)

如前所述，Rust 编译器可以搭配各种代码生成后端使用。其中之一是 [.NET 后端](https://github.com/FractalFir/rustc_codegen_clr)，它可以将 Rust 代码编译为公共中间语言 (CIL)，然后由 .NET 公共语言运行时 (CLR) 执行。这个后端使得 Rust 和 .NET（例如 C#）代码可以互操作，从而拉近这两个生态系统之间的距离。

在今年年初的时候，.NET 后端已经可以编译复杂的 Rust 程序，但仍缺少一些关键特性。这个 GSoC 项目的目标，由后端作者 Michał  负责实施，旨在从多个方面扩展该后端的功能。他的目标是扩展后端，使其能够使用 `cargo test` 命令运行测试。尽管听起来很简单，但要正确地编译和运行 Rust 测试框架并非易事，因为它使用了许多复杂特性，例如动态 trait 对象、原子操作、panic、展开和多线程。在 .NET 后端中实现这些特性尤其棘手，因为 LLVM 中间表示 (IR) 和 CIL 之间存在根本差异，并非所有 LLVM intrinsic 函数都有对应的 .NET 等效函数。

但这并没有难倒 Michał。他不知疲倦地投入到项目中，实现新功能，修复各种问题，每天都在学习编译器内部的更多知识。他还通过在 Zulip 上几乎每天[更新](https://rust-lang.zulipchat.com/#narrow/channel/421156-gsoc/topic/Project.3A.20Rust.20to.20.2ENET.20compiler)来记录他的开发历程，这些更新非常值得一读。在达成最初目标后，他更进一步，尝试使用 .NET 后端运行编译器自身的测试套件。这帮助他发现了更多边缘情况，并促使他对整个后端进行了重构，从而带来了显著的性能提升。

到 GSoC 项目结束时，.NET 后端已经能够正确编译和运行近 90% 的标准库 `core` 和 `std` 测试套件。这是一个非常了不起的成就，因为该套件包含数千个测试，其中一些测试相当复杂。即使在项目结束后，Michał 的步伐也没有放慢，他仍在持续改进后端。对了，我们是否提到过，他的后端还实验性地支持输出 _C_ 代码，实际上可以充当 _C_ 代码生成后端？！ Michał 在这个夏天确实非常忙碌。

我们感谢 Michał 为 .NET 后端所做出的所有贡献，他的工作极具启发性，并引发了与其他代码生成后端相关的富有成效的讨论。Michał 的下一个目标是将他的后端合并到上游，并创建一个官方的 .NET 编译目标，这将为 Rust 成为 .NET 生态系统中的一等公民打开大门。

### 使用 WebAssembly 实现沙盒化和确定性 proc 宏

* 贡献者：[Apurva Mishra](https://github.com/mav3ri3k)
* 导师：[David Lattimore](https://github.com/davidlattimore)
* [最终报告](https://github.com/mav3ri3k/rust/blob/gsoc24/gsoc24.md)

Rust 过程宏 (proc macro) 目前作为原生代码运行，编译成共享对象后直接加载到 Rust 编译器的进程中。由于这种设计，过程宏可以执行任何操作，例如任意访问文件系统或通过网络通信。这不仅存在明显的安全隐患，还会影响性能，因为这种设计使得缓存过程宏调用变得困难。多年来，人们一直在讨论如何让过程宏更加 _封闭_，例如将它们编译为 WebAssembly 模块，这样就可以轻松地在沙盒环境中执行。这还将带来通过 crates.io 分发预编译过程宏的可能性，从而加快依赖过程宏的 crate 的全新构建速度。

该项目的目标是探索如何为过程宏实现 WebAssembly 模块支持，并创建一个原型。我们知道这是一个雄心勃勃的目标，尤其考虑到 Apurva 之前没有为 Rust 编译器贡献代码的经验，而且过程宏的内部机制非常复杂。尽管如此，该项目还是取得了一些进展。在导师 David 的帮助下，Apurva 创建了一个原型，可以通过共享对象将 WebAssembly 代码加载到编译器中。他还进行了一些工作，尝试利用编译器 `proc_macro` crate 中现有的 `TokenStream` 序列化和反序列化代码。

虽然该项目并未完全实现其最初的目标，未来还需要更多工作来构建一个功能完善的 WebAssembly 过程宏原型，但我们仍然感谢 Apurva 的贡献。WebAssembly 加载原型是一个良好的开端，Apurva 对过程宏内部机制的探索也将为未来从事此功能开发的人员提供有益的参考。今后，我们会尽量为 GSoC 项目设定更细化的目标，因为这个项目最初的目标可能过于宏大。

### 为 Miri 添加 Tokio 异步支持

* 贡献者：[Tiffany Pek Yuan](https://github.com/tiif)
* 导师：[Oli Scherer](https://github.com/oli-obk)
* [最终报告](https://gist.github.com/tiif/3e08ba6e8cfb1d078e6155410108ae48)

[Miri](https://github.com/rust-lang/miri) 是一个可以检测 Rust 代码中未定义行为的解释器。它在 Rust 生态系统中被广泛使用，但之前无法在使用 [Tokio](https://tokio.rs/) 的程序（特别是那些使用 `await` 的程序）上运行，因为它缺少一项关键特性：对 Linux 上的 `epoll` 系统调用（以及其他主要平台上的类似 API）的支持。

Tiffany 通过编写纯 `libc` 代码示例来测试 `epoll` 操作，然后在 Miri 中实现对这些操作的模拟，从而实现了支持 Tokio 测试套件所需的大部分核心 `epoll` 操作。有时，这需要重构 Miri 的核心组件，例如文件描述符处理，因为它们最初的设计并未考虑 `epoll` 等系统调用。

令所有人（除了 Tokio 内部专家）感到惊讶的是，在实现了这些核心 `epoll` 操作后，Miri 竟然可以直接支持异步文件读写操作！由于操作系统提供的非阻塞文件操作的限制，Tokio 将这些文件操作包装在专用线程中，而 Miri 已经支持多线程。

在完成了项目（包括实现异步文件操作等延伸目标）后，Tiffany 联系了 Tokio 的维护者，并与他们合作在持续集成 (CI) 中对大部分 Tokio 测试运行 Miri。好消息是：到目前为止，还没有发现任何 soundness 问题！Tiffany 已经成为 Miri 的定期贡献者，并专注于继续扩展其支持的文件描述符操作。感谢她的所有贡献！

## 总结

我们很荣幸能够参与 2024 年谷歌编程之夏计划，并向所有贡献者表达诚挚的感谢！我们期待明年再次参与 GSoC 计划。
