---
layout: "../../../layouts/MarkdownLayout.astro"

title: "io_uring 在异步 Rust 中的取消安全性问题"
pubDate: 2024-11-03
upDate: 2024-11-03  # 如果有更新，修改日期
author: Tzu Gwo
description: 本文探讨了 io_uring 在异步 Rust 环境下存在的取消安全性问题，特别是 TCP 连接泄漏的风险，并分析了其与 epoll 的区别，以及 I/O 安全性和停止安全性的解决方案和挑战。
tags: [Rust, 异步, io_uring, epoll, 异步运行时,  取消安全性, TCP, 连接泄漏,  内存安全,  IO 安全,  线性类型, monoio, tokio, glommio, compio]
---

<!-- ## io_uring 在异步 Rust 中的取消安全性问题 -->

> 译自： <https://tonbo.io/blog/async-rust-is-not-safe-with-io-uring>

## TL;DR

1. 在支持 io_uring 的 Linux 系统上克隆[这个仓库](https://github.com/ethe/io-uring-is-not-cancellation-safe)。

2. 尝试切换[这两行代码](https://github.com/ethe/io-uring-is-not-cancellation-safe/blob/master/src/main.rs#L9-L10)。

3. 运行 `cargo run` 一段时间。

这个示例演示了，即使表面行为相似，使用 io_uring 驱动程序会导致 TCP 连接泄漏，而使用 epoll 驱动程序则不会。我还在[各种 io_uring 运行时](https://github.com/ethe/io-uring-is-not-cancellation-safe/branches/all)上测试了这个问题，发现这是一个普遍问题。

## Barbara 的 TCP 连接泄漏之谜

Barbara 是一位经验丰富的异步 Rust Web 服务开发者。有一天，她读到一篇关于 io_uring 的博客，它被誉为 Linux 的下一代异步 I/O 接口。Barbara 兴致勃勃，决定在她的辅助 Web 服务中尝试一下。

Rust 的“async/await”模型与异步运行时和 I/O 接口的实现是分离的，这使得在不同运行时之间切换非常容易。Barbara 非常熟悉 Tokio，这是 Rust 中最流行的异步运行时，它使用 epoll 作为 I/O 接口。因此，她开始寻找一个支持 io_uring 的异步运行时，以便将她的 Web 服务迁移到 io_uring。

一番搜索后，Barbara 发现了一些支持 io_uring 的异步运行时，例如 [glommio](https://github.com/DataDog/glommio)、[monoio](https://github.com/bytedance/monoio) 和 [compio](https://github.com/compio-rs/compio)。她决定尝试其中一个——monoio，因为它同时提供了 epoll 和 io_uring 接口，并且可以轻松切换。这看起来非常适合 Barbara 的 io_uring 探索之旅。

凭借她对 Tokio 的熟悉，Barbara 很快就写出了她的第一个 HTTP 服务器示例：

```rust
use monoio::io::{AsyncReadRentExt, AsyncWriteRentExt};
use monoio::net::TcpListener;

#[monoio::main(driver = "io_uring")]
async fn main() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    loop {
        let (mut stream, _) = listener.accept().await.unwrap();
        let (result, buf) = stream.read_exact(vec![0; 11]).await;
        let (result, _) = stream.write_all(buf).await;
    }
}
```

Barbara 心想：“不错，这看起来和一个典型的 Tokio 程序没什么两样——先绑定到一个地址，然后在循环中不断接受新的 TCP 连接并处理它们。”

接下来，Barbara 开始考虑如何实现异步控制，例如超时。如果 TCP 监听器一段时间内没有接受到连接，它可以切换去处理一些辅助任务（例如记录日志），然后再恢复监听：

```rust
use monoio::io::{AsyncReadRentExt, AsyncWriteRentExt};
use monoio::net::TcpListener;
use monoio::time::{Duration, sleep};

#[monoio::main(driver = "io_uring")]
async fn main() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    loop {
        select! {
            stream = listener.accept() => {
                let (mut stream, _) = stream.unwrap();
                let (result, buf) = stream.read_exact(vec![0; 11]).await;
                let (result, _) = stream.write_all(buf).await;
            }
            _ = sleep(Duration::from_secs(1)) => {
                println!("timeout");
                continue;
            }
        }
    }
}
```

使用并发原语 `select` 为 future 添加超时机制在 io_uring 下工作良好。Barbara 非常满意，并迅速将她的 Web 服务更新为使用 io_uring，最终部署上线。一切都很顺利，直到有一天，她注意到客户端日志中出现了一些异常：有些请求从未被处理。为了排查问题，Barbara 写了一个最小化的示例，却发现问题远比想象的复杂。

Barbara 发现，尽管在子线程中运行的客户端可以正常连接，但主线程中的服务器却无法正常工作。超时机制不断被触发，就好像客户端的连接凭空消失了。**TCP 连接泄漏了。**  而且不仅仅是 monoio，所有使用 io_uring 的异步运行时都存在这个问题。

## 问题根源

在理解为什么在基于 io_uring 的异步运行时中使用 `select` 进行超时控制会导致 TCP 连接泄漏之前，我们需要先了解为什么这个问题不会在 epoll 中出现。

整个异步 Rust 生态系统都构建在标准库的核心异步原语之上：Future。它的定义如下：

```rust
fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
```

在 Rust 中，所有异步操作——不仅是异步库开发者手动编写的，也包括用户使用 `async` 块编写的——都被定义为递归的 future 结构，这些结构在调用 `.await` 时被实例化。整个结构包含了所有需要在异步操作挂起时保存的状态。异步执行器负责反复调用 `poll` 方法来推进这个状态，直到操作完成。以下面的 `async` 块为例：

```rust
async fn foo(z: i32) { ... }

async fn bar(x: i32, y: i32) -> i32 {
    let z = x + y;
    foo(z).await;
    z
}
```

会被编译器转换为：

```rust
enum Bar {
    // 开始时，只包含参数
    Start { x: i32, y: i32 },
    // 第一个 await 时，包含 `z` 和 `Foo` future
    FirstAwait { z: i32, foo: Foo },
    // 完成时，不需要任何数据
    Complete { result: i32 },
}

impl Future for Bar {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        // 如果 self 是 Start，则推进到 FirstAwait
        // 如果 self 是 FirstAwait，则推进到 Complete
    }
}
```

更详细的关于 futures 以及它们如何执行的解释，可以参考 [ihciah 的博客](https://en.ihcblog.com/rust-runtime-design-1/)。他是 monoio 的核心作者之一。

异步 Rust 对 future 有几个核心假设：

1. future 的状态只在被轮询时才会改变。
2. future 可以通过不再轮询它们来隐式取消。

绑定到 epoll 的 future 符合这些假设，这与 epoll 的机制有关：epoll 不是异步系统调用机制，而是一个事件通知机制。在上面的例子中，`listener.accept()` future 的实际行为简化后如下：

```rust
impl Future for TcpListenerAccept {
    type Output = io::Result<TcpStream>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Item> {
        match self.accept() {
            Ok((stream, _)) => Poll::Ready(Ok(stream)),
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => {
                // 将 TcpListener 的文件描述符注册到 epoll 的兴趣列表
                Poll::Pending
            }
            Err(e) => Poll::Ready(Some(Err(e))),
        }
    }
}
```

`self.accept()` 同步运行，要么成功获取一个 TCP stream，要么遇到 “would block” 异常，进入等待状态，直到内核准备好。要取消这个操作，只需停止轮询即可，因为系统调用只在轮询期间发生。

然而，绑定到 io_uring 的 future 打破了这两个假设：

1. 系统调用由内核异步执行，而不是在轮询期间执行。内核将 TCP stream 放入内核/用户共享的环形缓冲区，这意味着 accept 事件是隐式完成的。
2. 不能简单地通过停止轮询来取消绑定到 io_uring 的 future，因为内核可能随时完成系统调用，**即使在取消过程中也是如此**。

下面逐步解释前面的例子，以便更清晰地理解这个过程：

```rust
loop { // <- 步骤 0. 第一轮循环。
    select! { // <- 步骤 1. 进入 select! 宏，accept 系统调用被提交到内核。
        stream = listener.accept() => {
            let (mut stream, _) = stream.unwrap();
            let (result, buf) = stream.read_exact(vec![0; 11]).await;
            let (result, _) = stream.write_all(buf).await;
        }
        _ = time::sleep(Duration::from_secs(1)) => { // <- 步骤 2. time::sleep 比 accept 先就绪
            println!("timeout"); // <- 步骤 3. 进入 timeout 分支，// 💥 listener.accept() 背后的 accept 系统调用仍在进行
            continue; // <- 步骤 4. 继续下一轮循环。
        }
    } // <- 步骤 5. 第二轮循环，// 💀 listener 开始下一个 accept 系统调用，丢失了处理上一个连接的机会。
}
```

## 解决方案

在讨论解决方案之前，我们需要将问题拆分为两部分：

1. **I/O 安全性**：确保已接受的 TCP stream 被正确关闭，避免连接泄漏。
2. **停止安全性**(由 Yoshua Wuyts 提出)：处理取消时已经打开的连接，允许它们继续被处理。

### I/O 安全性

幸运的是，I/O 安全性问题现在可以得到解决，这也是安全 Rust 的未来目标之一。Rust 提供了 `Drop` trait 来定义值被清理时的自定义行为。因此，我们可以这样做：

```rust
impl Drop for TcpListenerAccept {
    fn drop(&mut self) {
        // 取消 accept 操作
    }
}
```

我们只需要鼓励异步运行时实现这个修复即可。

### 停止安全性

停止安全性则更为复杂。Monoio 提供了一个名为“可取消 I/O”的组件来正确处理 io_uring 绑定 future 的取消。完整的示例可以在这里找到：[可取消 I/O 示例](https://github.com/ethe/io-uring-is-not-cancellation-safe/blob/cancelable-io/src/main.rs)。你可以运行这个分支来验证连接处理行为与 epoll 一致。这里展示一个简化的用法：

```rust
let canceler = monoio::io::Canceller::new();
let handle = canceler.handle();
let mut timer = pin!(time::sleep(Duration::from_millis(1)));
let mut accept = pin!(listener.cancelable_accept(handle));

select! {
    stream = &mut accept => {
        // ... 处理 stream
    }
    _ = &mut timer => {
        canceler.cancel();
        let stream = (&mut accept).await;
        if let Ok(stream) = stream {
            let (mut stream, _) = stream;
            let (result, buf) = stream.read_exact(vec![0; 11]).await;
            // ...
        }
    }
}
```

可以看到，除了在常规的 `select` 分支中执行 accept 操作外，超时分支会显式地取消 accept future。之后，它会再次 `.await` accept future，以确认在超时期间是否有 TCP stream 已经就绪。

Monoio 的组件部分解决了这个问题，但仍然存在一个问题：由于 future 是一个递归结构，io_uring 绑定 future 可能并不直接位于发生取消的地方：

```rust
let canceler = monoio::io::Canceller::new();
let handle = canceler.handle();

// 一些包含 io_uring 绑定 future 的复杂 future：
let stream = listener.cancelable_accept(handle).await;

// ... 在某个复杂 future 内部：
select! {
    // ...
    _ = timer => {
        // 如何取消内部的 accept future 并 `.await` 已完成的操作？
    }
}
```

取消一个包含 io_uring 绑定 future 的 future 也会影响其内部的 io_uring 绑定 future。这意味着 io_uring 绑定 future 的取消安全性是“具有传染性的”。简单地将 io_uring 绑定 future 转换为可取消 I/O 并不能解决所有问题。

另一个关键问题是，如果你忘记处理 io_uring 绑定 future 的取消，编译器并不会检查出来。对于 io_uring 绑定 future，你需要在取消后 `.await` 它们以查看它们是否已完成。这意味着它们必须**恰好使用一次**，这是一个被称为 [线性类型](https://en.wikipedia.org/wiki/Substructural_type_system) 的概念，它可以在编译时确保资源的正确使用。

不幸的是，Rust 缺少对这种类型系统的支持。关于为什么向 Rust 添加线性逻辑具有挑战性的更多细节，可以参考 Without Boats 的博客：[改变 Rust 的规则](https://without.boats/blog/changing-the-rules-of-rust/#:~:text=Let%E2%80%99s%20say%20you%20want%20Rust%20to%20support%20types%20which%20can%E2%80%99t%20go%20out%20of%20scope%20without%20running%20their%20destructor.%20This%20is%20one%20of%20the%20two%20different%20definitions%20of%20%E2%80%9Clinear%20types%2C%E2%80%9D)。

## 写作目的

关于 io_uring 上下文中的内存安全性已经有很多讨论。更多细节可以参考以下资源：

* [yoshuawuyts 的异步取消](https://blog.yoshuawuyts.com/async-cancellation-1/)
* [withoutboats 的 io_uring 笔记](https://without.boats/blog/io-uring/)
* [ihciah 的异步租用](https://github.com/bytedance/monoio/blob/master/docs/en/why-async-rent.md)

然而，社区很少讨论异步 Rust 中 io_uring 的 I/O 安全性和停止安全性。我通过一个具体的案例来引起大家对这个问题的关注。这篇文章的标题可能有点耸人听闻，但每个人对“安全”的定义和理解都不同。你对这个问题有什么看法：

* 维持现状；I/O 安全性和停止安全性不需要语言层面的保证。
* Rust 应该保证 I/O 安全性（这已经是 RFC 中的目标，但尚未在 Rust 中实现）。
* Rust 应该保证停止安全性（很少被讨论！）。
