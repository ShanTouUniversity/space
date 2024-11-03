---
layout: "../../../layouts/MarkdownLayout.astro"

title: 从一次成功的 Rust 重写中汲取的经验教训
pubDate: 2024-10-30
upDate: 2024-10-30 # 如果文章更新，修改日期
author: Gaultier
description: 本文回顾了一次成功的 C/C++ 代码库到 Rust 的增量式重写过程，总结了重写过程中的优点和缺点，并讨论了 Rust 在 FFI、ABI 稳定性、工具链等方面存在的挑战。
tags: [Rust, C++, 重写, 互操作, FFI, ABI, Miri, Valgrind, cbindgen, 内存安全, 未定义行为,  交叉编译,  内存分配器,  复杂性]
---

> 译自： <https://gaultier.github.io/blog/lessons_learned_from_a_successful_rust_rewrite.html>

- [工作得好的方面](#工作得好的方面)
- [工作得不太好的方面](#工作得不太好的方面)
  - [我仍在追查未定义行为](#我仍在追查未定义行为)
  - [Miri 并非总是有效，我仍然需要使用 Valgrind](#miri-并非总是有效我仍然需要使用-valgrind)
  - [我仍在追查内存泄漏](#我仍在追查内存泄漏)
  - [交叉编译并非总是有效](#交叉编译并非总是有效)
  - [Cbindgen 并非总是有效](#cbindgen-并非总是有效)
  - [不稳定的 ABI](#不稳定的-abi)
  - [不支持自定义内存分配器](#不支持自定义内存分配器)
  - [复杂性](#复杂性)
- [总结](#总结)

我在工作中进行了一项持续的 Rust 重写工作，并写过几篇文章：[1](https://gaultier.github.io/blog/you_inherited_a_legacy_cpp_codebase_now_what.md), [2](https://gaultier.github.io/blog/how_to_rewrite_a_cpp_codebase_successfully.md), [3](https://gaultier.github.io/blog/rust_c++_interop_trick.html)。现在重写已经完成，这意味着代码库 100% 是 Rust，0% 是 C++ —— 公开的 C API 没有改变，只是内部实现变了，我们一个函数一个函数地重写，直到最后全部完成。让我们回顾一下哪些方面做得好，哪些方面做得不好，以及可以如何改进。

需要说明的是，我之前写过纯 Rust 项目，所以我不会提及所有常见的 Rust 抱怨，例如“学习曲线陡峭”，这些并没有在这个项目中影响到我。

## 工作得好的方面

重写是增量进行的，采用了一种走走停停的方式。正如我预料的那样，在重写进行的过程中，我们不得不添加一些全新的功能，而这种方法使添加新功能的过程非常顺利。这与（错误的）从头开始并行开发一个新代码库的方法形成对比，后者会导致新功能必须实现两次。

新代码更加简洁，更容易理解。它的代码行数与旧的 C++ 代码库大致相同，或者略多一些。有些人认为等效的 Rust 代码会更短（我听说过 1/2 或 2/3 的比例），但根据我的经验，并非如此。C++ 在某些情况下会非常冗长，但 Rust 也是如此。而且 C++ 代码通常会忽略一些 Rust 编译器强制开发者处理的错误，这是一件好事，但也使得代码库略大一些。

进行重写，即使像我们这样逐个 bug 地重写，也为性能提升打开了新的大门。例如，C++ 中的一些字段被假定为动态大小，但我们意识到根据业务规则，它们总是 16 字节，因此我们将它们存储在一个固定大小的数组中，从而简化了大量代码并减少了堆分配。这并非严格意义上归功于 Rust，只是对代码库进行整体审视会带来很多好处。

与此相关：我们删除了大量的死代码。我估计我们删除了整个 C++ 代码库的三分之一甚至一半，因为它们根本没有被使用。其中一些是早已离去的客户要求的半成品功能，还有一些根本没有运行，甚至更糟，根本没有被构建（它们是 CMake 构建系统中不存在的 C++ 文件）。我觉得像 Rust 或 Go 这样的现代编程语言在标记和提醒开发者处理死代码方面更加积极，这同样是一件好事。

我们不必担心越界访问和算术运算的溢出/下溢。这些是 C++ 代码中的主要问题。即使 C++ 容器有 `.at()` 方法来进行边界检查，根据我的经验，大多数人并不使用它们。默认情况下就能进行这些检查真是太好了。而且 C 和 C++ 代码库通常从不处理溢出/下溢检查。

交叉编译非常顺利，虽然并非总是如此，请参阅下一节。

Rust 内置的测试框架非常实用。我在 C++ 中使用的所有测试框架都很糟糕，即使是编译也需要很长时间。

Rust 比 C++ 更注重代码的正确性，因此引发了许多有益的讨论。例如：哦，当我尝试将这个字节数组转换为字符串时，Rust 编译器强制我检查它是否是有效的 UTF8。旧的 C++ 代码没有进行这样的检查。让我们添加这个检查。

删除所有 CMake 文件的感觉真是太好了。在我参与过的所有 C 或 C++ 项目中，我从未觉得 CMake 物有所值，而且我总是要花很多时间才能让它按照我的需求工作。

## 工作得不太好的方面

令人惊讶的是，这一节很长，而且在我看来也是最有趣的。Rust 是否兑现了它的承诺？

### 我仍在追查未定义行为

在从 C/C++ 增量重写到 Rust 的过程中，我们不得不使用大量的原始指针和 `unsafe{}` 块。即使将这些限制在库的入口点，它们也仍然是一个很大的麻烦。

Rust 的所有严格规则在这些块内部仍然适用，但编译器只是停止为你检查它们，所以你只能靠自己。因此，很容易引入未定义行为。老实说，根据这次的经验，我认为在 Rust 中比在 C++ 中更容易无意中引入未定义行为，而 C++ 又比 C 更容易引入未定义行为。

Rust 中的主要规则是： _多个只读引用 XOR 一个可变引用_。这就是借用检查器总是困扰你的原因。

但是在使用原始指针时，很容易默默地违反这个规则，尤其是在按原样移植 C 或 C++ 代码时，这些代码充满了修改和指针操作：

_注意：敏锐的读者指出，下面代码片段中的问题是存在多个可变_引用*，而不是指针，并且在最近的 Rust 版本中使用语法 `let a = &raw mut x;`，或者在旧版本中使用 `addr_of_mut`，可以避免创建多个可变引用。*

```rust
fn main() {
    let mut x = 1;
    unsafe {
        let a: *mut usize = &mut x;
        let b: *mut usize = &mut x;
        *a = 2;
        *b = 3;
    }
}
```

你可能会认为这段代码很蠢，而且明显是错误的，但在一个大型的真实代码库中，这并不容易发现，尤其是在这些操作隐藏在辅助函数或层层抽象之后时，正如 Rust 喜欢做的那样。

`cargo run` 对上面的代码完全没有意见。Rust 编译器可以而且会默默地假设只有一个可变指针指向 `x`，并基于这个假设进行优化并生成机器代码，而这段代码违反了这个假设。

这里唯一的救星是 [Miri](https://github.com/rust-lang/miri)：

```sh
$ cargo +nightly-2024-09-01 miri r
error: Undefined Behavior: attempting a write access using <2883> at alloc1335[0x0], but that tag does not exist in the borrow stack for this location
 --> src/main.rs:7:9
  |
7 | *a = 2;
  | ^^^^^^
  | |
  | attempting a write access using <2883> at alloc1335[0x0], but that tag does not exist in the borrow stack for this location
  | this error occurs as part of an access at alloc1335[0x0..0x8]
  | [...]
 --> src/main.rs:4:29
  |
4 | let a: *mut usize = &mut x;
  | ^^^^^^
  |
  | help: <2883> was later invalidated at offsets [0x0..0x8] by a Unique retag
 --> src/main.rs:5:29
  |
5 | let b: *mut usize = &mut x;
  | ^^^^^^
[...]
```

所以，本来可以是一个编译时错误，现在变成了一个运行时错误。太好了。我希望你有 100% 的测试覆盖率！感谢上帝，我们还有 Miri。

如果你在编写 `unsafe{}` 代码时没有使用 Miri 进行检查，或者你在并非绝对必要的情况下这样做，我认为这是愚蠢的。它迟早会给你带来麻烦。

Miri 非常棒。但是……

### Miri 并非总是有效，我仍然需要使用 Valgrind

我指的不是 Miri 的某些实验性功能。也不是在 Miri 下运行代码极其缓慢的事实。也不是 Miri 只在 `nightly` 版本中工作的事实。

不，我指的是 Miri 根本无法运行的代码：

```rust
| 471 | let pkey_ctx = LcPtr::new(unsafe { EVP_PKEY_CTX_new_id(EVP_PKEY_EC, null_mut()) })?;
| ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ can't call foreign function `␁aws_lc_0_16_0_EVP_PKEY_CTX_new_id` on OS `linux`
| = help: if this is a basic API commonly used on this target, please report an issue with Miri
= help: however, note that Miri does not aim to support every FFI function out there; for instance, we will not support APIs for things such as GUIs, scripting languages, or databases
```

如果你使用的库有部分是用 C 或汇编语言编写的，这在密码学库、视频压缩库等中很常见，那么你就没那么幸运了。

所以我们不得不添加一个功能标志来将代码库拆分为使用这个问题库的部分和不使用的部分。Miri 只运行禁用了该功能的测试。

这意味着现在有很多 `unsafe` 代码根本没有被检查。真糟糕.

也许可以为这些库提供一个完全用软件（并且是纯 Rust）实现的回退方案. 但对于大多数库来说，维护两个实现只是为了 Rust 开发者并不现实。

我只好像以前处理纯 C/C++ 代码那样，在 `valgrind` 中运行有问题的测试。它无法检测到 Miri 可以检测到的许多问题，例如，拥有多个指向相同值的 mutable 指针，这在 C/C++/汇编中完全没问题，但在 Rust 中不行。

### 我仍在追查内存泄漏

我们的库提供了一个 C API，类似于这样：

```cpp
void* handle = MYLIB_init();
// 使用 handle 进行一些操作...
MYLIB_release(handle);
```

在底层，`MYLIB_init` 分配一些内存，而 `MYLIB_release()` 释放它。这是 C 库中非常常见的模式，例如 `curl_easy_init()/curl_easy_cleanup()`。

所以你马上会想到：很容易在某些代码路径中忘记调用 `MYLIB_release`，从而导致内存泄漏。你说得对。让我们实现它们来说明一下。我们是优秀的、有原则的开发者，所以我们编写了一个 Rust 测试：

```rust
#[no_mangle]
pub extern "C" fn MYLIB_init() -> *mut std::ffi::c_void {
    let alloc = Box::leak(Box::new(1usize));
    alloc as *mut usize as *mut std::ffi::c_void
}

#[no_mangle]
pub extern "C" fn MYLIB_do_stuff(_handle: *mut std::ffi::c_void) {
    // 做一些事情。
}

#[no_mangle]
pub extern "C" fn MYLIB_release(handle: *mut std::ffi::c_void) {
    let _ = unsafe { Box::from_raw(handle as *mut usize) };
}

fn main() {}

#[cfg(test)]
mod test {
    #[test]
    fn test_init_release() {
        let x = super::MYLIB_init();
        super::MYLIB_do_stuff(x);
        super::MYLIB_release(x);
    }
}
```

Rust 开发者的第一直觉是通过创建一个实现 `Drop` 的包装对象来使用 RAII，并自动调用清理函数。然而，我们希望使用库的公共 C API 编写测试，就像普通的 C 应用程序那样，而它无法访问这个 Rust 特性。此外，当有几十种类型都有分配/释放函数时，这会变得很笨拙。会产生大量的样板代码！

而且通常情况下，会有包含大量代码路径的复杂逻辑，我们需要确保始终调用清理函数。在 C 语言中，这通常是通过 `goto` 到一个始终清理资源的 `end:` 标签来完成的。但 Rust 不支持这种形式的 `goto`。

所以我们用 Rust 中的 [defer](https://docs.rs/scopeguard/latest/scopeguard/) crate 和在 C++ 中实现 [defer](https://www.gingerbill.org/article/2015/08/19/defer-in-cpp/) 语句来解决这个问题。

然而，Rust 的借用检查器真的不喜欢 `defer` 模式。通常情况下，一个清理函数会将 `&mut` 引用作为参数，这会阻止代码的其余部分存储和使用指向相同值的第二个 `&mut` 引用。所以我们不能总是在 Rust 端使用 `defer`。

### 交叉编译并非总是有效

与 Miri 的问题相同，使用带有 Rust API 但部分用 C 或汇编实现的库会导致 `cargo build --target=...` 无法开箱即用。这不会影响到所有开发者，也许可以通过像 C 或 C++ 那样提供 sysroot 来解决。但这仍然是一个令人失望的问题。例如，我认为 Zig 平稳地处理了大多数目标的这种情况，因为它自带 C 编译器和标准库，而 `cargo` 没有。

### Cbindgen 并非总是有效

[cbindgen](https://github.com/mozilla/cbindgen) 是一个常用的工具，用于从 Rust 代码库生成 C 头文件。它大部分情况下都能工作，直到它失效。我遇到了很多限制或 bug。我曾想过贡献 PR，但我发现对于大多数这些问题，都已经存在一个停滞的未合并 PR，所以我没有这么做。每一次，我都想放弃 `cbindgen` 并手动编写所有的 C 原型。我认为最终这可能会更简单。

再次作为比较，我认为 Zig 有一个内置的 C 头文件生成工具。

### 不稳定的 ABI

我在之前的文章中讨论过这一点，所以这里就不赘述了。基本上，所有有用的标准库类型，例如 `Option`，都没有稳定的 ABI，因此必须使用 `repr(C)` 注解手动复制它们，以便它们可以从 C 或 C++ 中使用。这又是一个令人失望的问题，并造成了摩擦。请注意，我对 C++ 的 ABI 问题同样感到恼火，原因相同。

如果 Rust 和 C++ 像 C 那样采用[稳定的 ABI](https://daniel.haxx.se/blog/2024/10/30/eighteen-years-of-abi-stability/)，就可以避免许多令人头疼的问题。

### 不支持自定义内存分配器

许多 C 库允许用户在运行时提供自己的分配器，这通常非常有用。在 Rust 中，开发者只能在编译时选择全局分配器。所以我们没有尝试在库 API 中提供这个功能。

此外，所有前面提到的关于清理资源的问题都可以通过使用[arena 分配器](https://gaultier.github.io/blog/tip_of_the_day_2.html)立即解决，但这在 Rust 中并不常见，并且与标准库不兼容（即使有一些 crate 可以做到）。再次，Zig 和 Odin 都原生支持 arena，并且在 C 中实现和使用它们非常简单。在追查微妙的内存泄漏时，我真的很渴望一个 arena。

### 复杂性

从一开始，我就决定不碰异步 Rust，而且在这个项目中，我完全没有错过它。

当我第四次阅读 `UnsafeCell` 的文档，并思考我应该使用它还是 `RefCell`，同时又刚刚被 `MaybeUninit` 的陷阱烧到，并问自己是否需要 `Pin` 时，我真地问自己是什么样的人生选择让我走到了这一步。

纯 Rust 已经非常复杂，再加上主要用于处理 FFI 的整个层，它就真的变成了一个怪兽。尤其是对于 Rust 新手来说。

我们团队中的一些开发者直接拒绝在这个代码库上工作，理由是 Rust 真实的或感知到的复杂性。现在，我认为 Rust 仍然比 C++ 更容易学习，但诚然，差距并不大，尤其是在这种大量使用 FFI 的情况下。

## 总结

我对这次 Rust 重写总体上感到满意，但在某些方面感到失望，而且总的来说，它比我预期的要花费更多精力。在大量使用 C 互操作的情况下使用 Rust 感觉就像使用一门与纯 Rust 完全不同的语言。有很多摩擦，很多陷阱，以及 C++ 中许多 Rust 声称已经解决的问题，实际上根本没有真正解决。

我非常感谢 Rust、Miri、cbindgen 等的开发者。他们做了大量的工作。尽管如此，在进行大量 C FFI 时，语言和工具感觉还不成熟，几乎像是 v1.0 之前的版本。如果 `unsafe` 的人机工程学（在最近的版本中已经有所改进）、标准库、文档、工具和不稳定的 ABI 都能在未来得到改进，那么使用体验可能会变得更愉快。

我认为所有这些问题都被微软和谷歌注意到了，这就是为什么他们正在投入真金白银来改进这些方面的原因.

如果你还不了解 Rust，我建议你的第一个项目使用纯 Rust，并远离整个 FFI 主题。

我最初考虑使用 Zig 或 Odin 进行这次重写，但我真的不想在企业生产代码库中使用 v1.0 之前的语言（而且我预料说服其他工程师和经理会很困难）。现在，我想知道如果使用 Zig 或 Odin，体验是否真的会比 Rust 更糟。也许 Rust 模型与 C 模型（或者就此而言，与 C++ 模型）真的格格不入，并且在将两者一起使用时存在太多的摩擦。

如果我将来不得不进行类似的工作，我想我会认真考虑使用 Zig。到时候再说吧。无论如何，下次有人说“用 Rust 重写就行了”时，把这篇文章给他们看，问问他们是否改变了主意 ;)
