---
layout: "../../../layouts/MarkdownLayout.astro"
title: "在 Jupyter Notebook 中创建交互式幻灯片"
pubDate: 2024-03-15 # 请根据实际发布日期修改
upDate: 2024-11-04 # 如果文章更新，请修改日期
author: "geeksforgeeks.org" #  或根据实际作者修改
description: "本文将介绍在 Jupyter Notebook 中创建交互式幻灯片的多种方法，包括使用 RISE、Jupyter 内置功能、Jupyter 小部件和 ipywidgets，以及 Voila 和 Voila-Reveal。同时，还将探讨创建交互式幻灯片的重要性、自定义幻灯片的方法以及导出幻灯片的流程。"
tags: [Python, Jupyter Notebook, 幻灯片, 交互式, RISE, ipywidgets, Voila, Reveal.js, 数据可视化, 演示文稿]
---

> 译自： <https://www.geeksforgeeks.org/creating-interactive-slideshows-in-jupyter-notebooks/>

## 在 Jupyter Notebook 中制作交互式幻灯片

我们日常生活中经常使用 Microsoft PowerPoint 制作幻灯片，无论是用于学校、大学还是办公室。但你是否想过在 Jupyter Notebook 中也能轻松创建幻灯片？利用 Python 和 Jupyter 制作幻灯片的优势在于版本控制、动态内容、便捷的代码共享以及单一文档管理。当然，它也有一些不足，比如主题样式相对较少，导致最终效果可能略显朴素。

本文将介绍几种在 Jupyter Notebook 中创建交互式幻灯片的方法，包括使用 RISE、Jupyter 内置的幻灯片功能、Jupyter 小部件和 ipywidgets，以及 Voila 和 Voila-Reveal。同时，我们将探讨创建交互式幻灯片的重要性、自定义幻灯片的方法以及导出幻灯片的流程。

首先，让我们来思考一个每个人都会关心的问题：

### 为什么需要交互式幻灯片？

交互式幻灯片备受欢迎的原因有很多，例如：

1. **引人入胜：** 交互式幻灯片通过可点击元素、丰富的色彩、图像、视频等，更能抓住观众的注意力，让演示更加生动难忘。

2. **数据深入挖掘：** 对于数据驱动的演示，交互式幻灯片允许用户深入探索数据可视化图表。用户可以过滤数据、放大特定数据点，从而获得更深入的洞察。

3. **实时反馈收集：** 通过嵌入调查问卷和小测试等功能，交互式幻灯片可以实时收集观众反馈，评估理解程度，这对于培训和教学场景尤为实用。

4. **个性化体验：** 交互式幻灯片允许演示者根据观众的需求调整内容。用户可以根据自己的兴趣和重点，自主选择浏览路径，获得更个性化的体验。

## 在 Jupyter Notebook 中自定义幻灯片

自定义幻灯片意味着根据个人喜好，对每张幻灯片的外观、内容和行为进行个性化设置。Jupyter Notebook 也支持幻灯片自定义，方法是为单元格中的幻灯片添加元数据。元数据位于单元格的元数据标签中，可以通过“单元格工具栏”选项访问。在这里，您可以根据需要自定义幻灯片（元数据可以理解为描述幻灯片信息的数据，用于控制笔记本的功能和行为）。

![metadata](https://media.geeksforgeeks.org/wp-content/uploads/20231005162315/metadata-(1)-(1).webp)

上图演示了如何为所有幻灯片应用“编辑元数据”。

![edit-metadata](https://media.geeksforgeeks.org/wp-content/uploads/20231005162342/edit-metadata.webp)

如上图所示，您现在可以添加任意元数据来定制幻灯片。

## 在 Jupyter Notebook 中导出幻灯片

完成幻灯片的创建和自定义后，您可以将其从 Jupyter Notebook 导出到本地计算机。Jupyter 支持多种导出格式，包括 HTML、PDF、LaTeX、Reveal JS、Markdown (md)、ReStructured Text (rst) 和可执行脚本。导出后，请将文件保存在 Jupyter Notebook 所在的文件夹中。这样，您就可以方便地从本地系统向外界展示您的幻灯片了。

导出幻灯片需要使用 nbconvert 工具。nbconvert 是一个 Jupyter Notebook 工具，它可以通过 Jinja 模板将笔记本转换为各种其他格式。使用 nbconvert 工具需要遵循其基本命令格式：

在命令行中，使用 nbconvert 将 Jupyter Notebook（输入）转换为不同的格式（输出）。基本命令结构如下：

```bash
jupyter nbconvert --to <输出格式> <输入笔记本>
```

其中`<输出格式>` 指的是您希望转换成的目标格式，`<输入笔记本>` 指的是您要转换的 Jupyter Notebook 文件名。

例如，将 Jupyter Notebook 幻灯片转换为 HTML：

```bash
jupyter nbconvert --to html slideshow.ipynb
```

此命令将创建一个名为 `slideshow.html` 的 HTML 文件。

## 使用 RISE 在 Jupyter Notebook 中创建交互式幻灯片

### 步骤 1：安装所需工具

**安装 Python 和 Jupyter Notebook**

首先，您需要安装 Python 和 Jupyter Notebook。推荐使用 Anaconda Navigator 进行安装。

**安装 RISE**

RISE 是“Reveal.js - Jupyter/IPython Slideshow Extension”的缩写，它是一个 Jupyter Notebook 扩展，可以将您的笔记本转换为基于 Reveal.js 的动态幻灯片。使用 RISE，您可以在幻灯片放映过程中执行代码、显示图表，并演示您在 Notebook 中进行的任何操作。

如果您使用 Anaconda，可以使用以下命令安装 RISE：

```bash
conda install -c conda-forge rise
```

如果您使用命令提示符或终端，可以使用 pip 安装：

```bash
pip install rise
```

您无法直接与 RISE 交互，而是需要通过 Jupyter Notebook 使用它。

### 步骤 2：创建幻灯片

#### 启用幻灯片模式

首先，启动 Jupyter Notebook 并创建一个新笔记本（必须在安装 RISE 之后执行此操作）。在新笔记本中，您需要启用幻灯片模式。步骤如下：

1. 点击 Jupyter Notebook 工具栏中的“视图”选项卡。
2. 在下拉菜单中选择“单元格工具栏”。
3. 在弹出的子菜单中选择“幻灯片放映”。

![cell-toolbar](https://media.geeksforgeeks.org/wp-content/uploads/20231005162415/cell-toolbar.webp)

现在，您已经启用了幻灯片模式。

#### 使用单元格创建幻灯片内容

接下来，使用单元格工具栏来创建幻灯片内容。

![first-cell](https://media.geeksforgeeks.org/wp-content/uploads/20231005162445/first-cell.webp)

在每个单元格的右上角，您会看到一个“幻灯片类型”下拉菜单。这个菜单决定了每个单元格在幻灯片放映中的角色。选项包括：

* **Slide:**  将当前单元格作为一张新幻灯片的起始单元格。
* **Sub-slide:** 将当前单元格作为当前幻灯片下的一个子幻灯片，会以新的页面展示。
* **Fragment:** 将当前单元格的内容作为当前幻灯片中逐步显示的片段。
* **Skip:**  在幻灯片放映中跳过当前单元格。
* **Notes:** 将当前单元格的内容作为演讲者备注，在放映时不会显示给观众。
* **—:**  使当前单元格继承上一个单元格的幻灯片类型。

### 步骤 3：查看和操作幻灯片

#### 查看幻灯片

创建好幻灯片内容后，可以直接在 Notebook 中查看。

有两种方式进入幻灯片放映模式：

1. 使用快捷键 `Alt + R` (Windows 系统)。
2. 点击 Notebook 工具栏中的“演示模式”按钮（仅在成功安装 RISE 后才会出现）。

![toolbar](https://media.geeksforgeeks.org/wp-content/uploads/20230923210650/toolbar.PNG)

点击后，将打开一个新的窗口，如下所示：

![Screenshot-2023-10-30-062436](https://media.geeksforgeeks.org/wp-content/uploads/20231030122407/Screenshot-2023-10-30-062436.png)

这表明幻灯片放映已经开始了。

#### 操作幻灯片

##### 切换幻灯片

在幻灯片放映窗口的右下角，您会看到四个箭头按钮，用于控制幻灯片的切换。 虽然使用 `←` 和 `→` 键看起来很方便，但可能会导致跳过一些子幻灯片。建议使用空格键 (SPACE) 向后翻页，使用 Shift + 空格键向前翻页。

此外，您还可以点击左下角的问号 (?) 查看更多快捷键操作。

##### 运行和编辑代码

RISE 的一大亮点在于，您可以在幻灯片放映过程中运行和修改代码，因为它运行在一个实时的 Python 环境中。

如果一个代码单元格被设置为“Slide”、“Sub-slide”、“Fragment”或“—”，那么它在幻灯片放映中将是可编辑和可运行的。如下所示：

![ezgif-2-9ff6822d6c](https://media.geeksforgeeks.org/wp-content/uploads/20231030130045/ezgif-2-9ff6822d6c.gif)

至此，您已经完成了幻灯片的制作，可以向他人展示了。

## 使用 Jupyter 内置幻灯片功能创建交互式幻灯片

除了 RISE，Jupyter Notebook 也内置了幻灯片功能。以下是使用内置功能创建幻灯片的步骤：

**步骤 1：创建一个新笔记本**

首先，创建一个新的 Jupyter Notebook 并命名。

**步骤 2：创建幻灯片内容**

在新笔记本中，根据需要创建多个单元格，每个单元格代表一张幻灯片的内容。

**步骤 3：启用幻灯片模式并设置幻灯片类型**

创建好所有幻灯片内容后，为每个单元格设置相应的幻灯片类型，例如“Slide”、“Sub-slide”、“Fragment”、“Skip”、“Notes”或“Markdown”。 然后，通过 Notebook 工具栏中的“视图” -> “单元格工具栏” -> “幻灯片放映”启用幻灯片模式。

**步骤 4：运行 Notebook 并生成幻灯片**

保存并关闭 Notebook。打开命令提示符或终端，导航到 Notebook 所在的目录，并执行以下命令：

```bash
jupyter nbconvert myslideshow.ipynb --to slides --post serve
```

将 `myslideshow.ipynb` 替换成您的 Notebook 文件名。该命令会将您的 Notebook 转换为幻灯片，并在浏览器中打开。

![ezgif-2-8842323dfb](https://media.geeksforgeeks.org/wp-content/uploads/20231030130936/ezgif-2-8842323dfb.gif)

## 使用 Jupyter 小部件和 IPywidgets 创建交互式幻灯片

IPywidgets，也称为 Jupyter 小部件或简称为小部件，是一个 Python 库，可以用来创建在 Jupyter Notebook 中显示的交互式 HTML 小部件。这些交互式 GUI 元素可以将用户交互融入到您的代码中，使 Notebook 更具吸引力和实用性，尤其适用于数据探索、数据分析、参数调整和概念演示等场景。

Jupyter 小部件提供了各种控件，包括按钮、滑块、文本输入框、下拉菜单、复选框等等。这些控件允许您实时操作和展示数据、修改参数、触发动作，而无需重新运行代码单元格。

使用 Jupyter 小部件或 ipywidgets 创建交互式幻灯片的步骤如下：

### 步骤 1：安装 IPywidgets

使用 pip 安装 ipywidgets：

```bash
pip install ipywidgets
```

### 步骤 2：导入库

在 Notebook 中导入必要的库：

```python
import ipywidgets as widgets
from IPython.display import display
```

### 步骤 3：创建交互式小部件

选择您想要添加到幻灯片中的小部件类型。例如，创建一个滑块小部件：

```python
slider = widgets.IntSlider(min=0, max=10, step=1, description='滑动我:')
```

这里，您可以设置滑块的最小值 (`min`)、最大值 (`max`)、步长 (`step`) 和描述 (`description`)。

### 步骤 4：显示小部件

使用 `display` 函数显示小部件：

```python
display(slider)
```

![display](https://media.geeksforgeeks.org/wp-content/uploads/20230926174454/display.PNG)

### 步骤 5：启用幻灯片模式并设置幻灯片类型

创建好所有小部件后，启用幻灯片模式（“视图” -> “单元格工具栏” -> “幻灯片放映”）。 并使用单元格工具栏中的“幻灯片类型”下拉菜单为每个单元格设置幻灯片类型（例如，“Slide”、“Sub-slide”、“Fragment”、“Skip”、“Notes”）。

### 步骤 6：开始幻灯片放映

点击工具栏中的“进入/退出实时 Reveal 幻灯片”按钮开始放映。您的演示文稿将开始，并且交互式小部件也将正常工作。

![ezgif-2-c1375a5833](https://media.geeksforgeeks.org/wp-content/uploads/20231030130421/ezgif-2-c1375a5833.gif)

## 使用 Voila 和 Voila-Reveal 创建交互式幻灯片

Voila 是一个开源框架或 Web 应用程序，可以将 Jupyter Notebook 转换为仪表板和交互式 Web 应用。 虽然 Voila 主要用于创建 Web 应用，但它也可以用来创建 Jupyter Notebook 的交互式幻灯片。

Voila-Reveal 是 Voila 的一个扩展，它可以将 Jupyter Notebook 转换为基于 Reveal.js 的交互式幻灯片。

以下是使用 Voila 和 Voila-Reveal 创建幻灯片的步骤：

### 步骤 1：安装 Voila

使用 pip 安装 Voila：

```bash
pip install voila
```

### 步骤 2：创建幻灯片内容

创建或打开一个 Jupyter Notebook，用于制作幻灯片。 如果您希望使用 Reveal.js 的功能来自定义幻灯片（例如背景、过渡效果和主题），可以向 Markdown 单元格添加相应的元数据。

![voila2](https://media.geeksforgeeks.org/wp-content/uploads/20231030122757/voila2-(1)-(1).webp)

### 步骤 3：运行 Voila

关闭 Notebook。 在命令提示符或终端中，导航到 Notebook 所在的目录：

```bash
cd /path/to/your/notebook
```

将 `/path/to/your/notebook` 替换为您的 Notebook 所在的路径。

然后，使用以下命令运行 Voila：

```bash
voila Voila.ipynb
```

将 `Voila.ipynb` 替换成您的 Notebook 文件名。

Voila 将启动一个本地服务器，并将您的 Notebook 转换为基于 Reveal.js 的幻灯片。它会提供一个 URL，通常类似于 `http://localhost:8866`。 在浏览器中打开这个 URL 即可查看您的交互式幻灯片。

![voila-output](https://media.geeksforgeeks.org/wp-content/uploads/20231030122851/voila-output-(1)-(1)-(1).webp)

**注意：** Voila 会将 Notebook 中的所有单元格都转换为仪表板形式。
