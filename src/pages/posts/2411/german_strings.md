---
layout: "../../../layouts/MarkdownLayout.astro"

title: "德式字符串：一种高性能的字符串实现"
pubDate: 2024-11-07 # 或者其他合适的日期
upDate: 2024-11-07 # 如果有更新，修改日期
author: "CedarDB 团队" 
description: "本文介绍了德式字符串的设计理念、实现细节以及优势。德式字符串是一种针对数据库场景优化的字符串类型，通过紧凑的内存布局、前缀存储和存储类别等特性，实现了高性能和高效的内存管理。文章还对比了 C 和 C++ 的字符串实现，并探讨了德式字符串的适用场景和权衡。"
tags: [字符串, 德式字符串,  高性能,  内存管理,  数据库,  "C++",  C, Rust,  不可变字符串, 短字符串优化,  CedarDB, Umbra]
---

> 译自： <https://cedardb.com/blog/german_strings/>

字符串的概念非常简单：本质上就是一串字符，对吧？但为什么每种编程语言都[各自](https://en.wikipedia.org/wiki/String_(computer_science)#String_datatypes)实现了略有不同的字符串类型呢？其实，字符串远不止“一串字符”这么简单<sup id="fnref:1"><a href="https://cedardb.com/blog/german_strings/#fn:1" role="doc-noteref">1</a></sup>。

我们也一样，创建了[自定义的字符串类型](https://xkcd.com/927/)，并针对数据处理进行了高度优化。虽然在我们最初的[Umbra 研究论文](https://db.in.tum.de/~freitag/papers/p29-neumann-cidr20.pdf)中并未预料到，但许多新系统，包括 [DuckDB](https://github.com/duckdb/duckdb/blob/main/src/include/duckdb/common/types/string_type.hpp)、[Apache Arrow](https://arrow.apache.org/docs/format/Columnar.html#variable-size-binary-view-layout)、[Polars](https://pola.rs/posts/polars-string-type/) 和 [Facebook Velox](https://15721.courses.cs.cmu.edu/spring2023/slides/23-velox.pdf)，都采用了我们的这种字符串格式。

本文将深入探讨这种我们称之为“德式字符串”的优势及其背后的权衡。

首先，让我们回顾一下常见的字符串实现方式。

## C 语言的实现

在 C 语言中，字符串就是一串字节，并约定以 `\0` 字节作为结尾。

![](https://cedardb.com/blog/german_strings/cstring.svg "C 字符串")

这种方式概念上很简单，但在实际使用中却有很多不便：

- 如果字符串没有 `\0` 结尾怎么办？稍有不慎，就可能读取到字符串以外的内存区域，造成严重的安全漏洞！
- 计算字符串长度需要遍历整个字符串。
- 扩展字符串需要手动分配新内存、复制数据，并释放旧内存。

## C++ 的实现

C++ 的标准库提供了更便捷的字符串类型。虽然 C++ 标准没有强制规定具体的实现，但[以 `libc++` 为例](https://joellaity.com/2020/01/31/string.html)：

![](https://cedardb.com/blog/german_strings/stdstring.svg "libc++ std::string")

每个字符串对象存储了字符串长度（比 C 语言好多了！）、指向实际数据的指针以及缓冲区容量。只要字符串长度不超过缓冲区容量，就可以直接追加字符，而无需手动分配内存；当字符串长度超过容量时，字符串类型会自动分配更大的缓冲区并释放旧缓冲区：`std::string` 是_可变的_。

这种实现还支持重要的“短字符串优化”：对于足够短的字符串，可以直接将其存储在字符串对象内部，将 `capacity` 字段的一部分用作标记，其余部分以及 `size` 和 `ptr` 字段直接存储字符串内容。这样，访问短字符串时就无需额外的内存分配和指针解引用。 顺便提一下，这种优化在 Rust 中是[无法实现的](https://doc.rust-lang.org/std/string/struct.String.html) ;)<sup id="fnref:2"><a href="https://cedardb.com/blog/german_strings/#fn:2" role="doc-noteref">2</a></sup>。

想了解更多细节，可以参考 [Raymond Chen 详细的博客文章](https://devblogs.microsoft.com/oldnewthing/?p=109742)，其中介绍了各种 `std::string` 的实现。

## 能不能做得更好？

C++ 的字符串，尤其是配合短字符串优化，已经相当不错了。但是，如果针对特定场景进行优化，还能做得更好<sup id="fnref:3"><a href="https://cedardb.com/blog/german_strings/#fn:3" role="doc-noteref">3</a></sup>。

在开发 CedarDB 的过程中，我们发现：

### 大多数字符串都很短

虽然字符串可以存储任意长度的文本，但在实际应用中，大多数字符串都比较短，而且内容可预测 (正如 Vogelsgesang 等人在“[Get Real](https://dl.acm.org/doi/10.1145/3209950.3209952)”论文中所述)。

例如：

- ISO 国家代码（`USA`、`DEU`、`GBR`），3 个字符
- IATA 机场代码（`LHR`、`MUC`），3 个字符
- 枚举值（`MALE/FEMALE/NONBINARY`、`YES/NO/MAYBE`），通常少于 10 个字符
- ISBN（`0465062881`），10 或 13 位数字

我们希望尽可能地对这些短字符串进行优化。

### 字符串通常不经常修改

大多数数据只写一次，但会读取很多次。`libc++` 为每个字符串预留 64 位存储容量，以便字符串扩展，但这在字符串很少修改的情况下显得有些浪费。

此外，如果并发地访问和修改字符串，如果没有采用昂贵的锁机制或精心设计程序，就可能导致数据竞争。

因此，我们希望尽可能使用_不可变_字符串。

### 通常只需要访问字符串的一部分

例如以下 SQL 查询：

```sql
select * from messages where starts_with(content, 'http');
```

我们只需要查看字符串的前四个字符。为了比较这四个字符而解引用指针似乎有些浪费。

需要注意的是，`libc++` 的短字符串优化在这里并不适用：如果字符串比较长，即使我们只关心前缀，也需要解引用指针。

再看另一个查询：

```sql
select sum(p.amount) from purchases p, books b where p.ISBN = b.ISBN and b.title = 'Gödel, Escher, Bach: An Eternal Golden Braid';
```

这里我们需要比较所有 ISBN，以及所有书名与一个字符串常量。虽然为了确保匹配，我们需要比较整个字符串，但大多数书名可能都不是“Gödel, Escher, Bach: An Eternal Golden Braid”（各位非德语读者，你们知道有多少书名是以“Gö”开头的吗？）。如果字符串开头就不同，就可以直接排除，无需继续比较后面的字符。

## 德式字符串

为了解决这些问题，CedarDB 的前身 Umbra 发明了[Andy Pavlo](https://x.com/andy_pavlo)戏称为“德式字符串”的这种字符串类型](<https://15721.courses.cs.cmu.edu/spring2024/slides/05-execution2.pdf)。>

## 深入剖析：德式字符串的结构

德式字符串最大的特点是使用 128 位的 `struct` 表示每个字符串。相比 `std::string`，它省去了 `capacity` 字段，减少了三分之一的开销；此外，它还可以通过两个寄存器传递字符串，避免了压栈操作。

> 想了解这对函数调用有何影响？可以参考我们关于[16B 布局对调用约定的好处](https://cedardb.com/blog/strings_deep_dive)的深度解析。

这个 `struct` 有两种表示形式：

### 短字符串表示

短字符串的内存布局如下：

![](https://cedardb.com/blog/german_strings/shortstring.svg "短德式字符串")

对于长度不超过 12 个字符的字符串，直接将其存储在 `struct` 内部。

访问字符串内容或前缀都很简单：直接从 `len` 字段后面读取即可，无需解引用指针！

### 长字符串表示

长度超过 12 个字符的字符串的表示方式略有不同：

![](https://cedardb.com/blog/german_strings/longstring.svg "长德式字符串")

与 C++ 字符串类似，我们也存储了 `len` 字段和指向数据的指针，但有一些区别：

#### 长度

为了将整个字符串压缩到 128 位，我们将长度字段缩短为 32 位。这意味着字符串长度不能超过 4 GiB，这是我们根据实际情况做出的权衡。

#### 前缀

在长度字段之后，我们存储了字符串的前四个字符。这在进行相等/不相等比较、字典排序或前缀比较时非常有用，因为它避免了指针解引用，大大提高了效率。

#### 指针

指针指向一块大小刚好等于字符串长度的内存区域，没有额外的缓冲区容量。

这样做的好处是节省了 `capacity` 字段的 64 位，并且可以紧密地存储不同字符串的数据，没有内存碎片。

由于指向的数据是不可变的，因此无需加锁即可安全读取。

当然，这也带来了一些缺点：追加数据到字符串的操作变得比较昂贵，因为它需要分配新的缓冲区并复制数据。不过，在数据库系统中，这种情况并不常见，因为数据库很少会原地更新数据。

#### 存储类别

在设计字符串的过程中，我们发现开发者对字符串生命周期的需求因使用场景而异。我们称之为“存储类别”，可以在创建字符串时指定。字符串可以是 `persistent`（持久）、`transient`（瞬态）或 `temporary`（临时）。为了表示存储类别，我们从指针中借用了两位。

首先来看一些常见的场景：

- `temporary` 字符串类似于 C++ 中的字符串：在构造时分配内存、存储数据，并在超出作用域时释放内存，符合 [RAII](https://en.wikipedia.org/wiki/Resource_acquisition_is_initialization) 的原则。
- `persistent` 字符串类似于字符串常量：它们始终有效。所有短字符串都是持久字符串，因为它们可以直接通过栈或寄存器传递。长字符串也可以是持久的，例如 C++ 中的字符串字面量。字符串字面量的数据存储在静态分配的内存中，程序运行期间始终有效。

还有一种特殊的情况：数据库系统中需要存储的数据量通常远大于内存容量，因此部分数据需要存储在磁盘上。如果使用传统的字符串，从磁盘加载包含字符串的页面时，需要：

- 首先将页面加载到内存；
- 然后初始化一个新的字符串对象，并将数据复制到新分配的内存中。

这个过程会将字符串数据复制两次，这在很多情况下是不必要的。例如，以下查询：

```sql
select * from books where starts_with(title,'Tutorial')
```

在过滤书名时，大多数字符串都不会符合条件，我们也无需将它们显示给用户，因此，如果之后不需要访问这些字符串，何必复制它们呢？

我们希望有一种字符串类型，可以低成本地构造，并且指向一块_当前_有效的内存区域，即使这块区域之后可能失效，而字符串本身无需管理它的生命周期。

`transient` 字符串就是为了解决这个问题而设计的。它们指向一块当前有效的内存区域，但这块区域之后可能失效，例如，当我们释放页面锁并将页面写回磁盘时。

创建 `transient` 字符串的开销极低：只需指向外部管理的内存地址即可，无需分配内存或复制数据！访问 `transient` 字符串时，字符串本身并不知道它指向的数据是否仍然有效，因此程序员需要确保访问的 `transient` 字符串确实有效.  如果之后需要再次访问，则需要将其复制到自己管理的内存中；如果之后不再需要，则无需进行任何昂贵的初始化操作！

### 如何区分不同的表示形式

如何判断一个德式字符串是短字符串还是长字符串？很简单！如果长度不超过 12 个字符，就是短字符串。由于德式字符串是不可变的，因此不存在长字符串变短或短字符串变长的情况。

如果只需要访问前缀，则无需判断字符串的类型，因为在两种情况下，第 32-63 位都存储了前四个字符。

## 总结

德式字符串有很多优点：节省空间、减少内存分配和数据复制，从而带来更高的性能。由于数据不可变，也更容易实现字符串处理代码的并行化。通过存储类别，可以更精细地控制字符串的生命周期，根据需要在性能和易用性之间进行权衡。

当然，它也有一些不足：德式字符串要求开发者更仔细地考虑字符串的生命周期：字符串的生命周期是怎样的？可以使用 `transient` 字符串吗，还是需要复制一份？字符串是否会经常修改？是否可以使用不可变字符串？

如果您愿意思考这些问题，即使不在数据库开发领域，也能从德式字符串中受益匪浅。
