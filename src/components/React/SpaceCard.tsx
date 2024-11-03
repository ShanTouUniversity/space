// STUSpaceCard.tsx
import { h } from "preact";
import { useRef } from "preact/hooks";
import type { FunctionComponent } from "preact";

// 下载图标组件
const DownloadIcon: FunctionComponent = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    class="text-amber-700 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
  >
    <path fill="currentColor" d="M12 16l-5-5h3V4h4v7h3l-5 5zm-5 4h10v-2H7z" />
  </svg>
);

const GithubIcon: FunctionComponent = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    class="text-amber-700 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
  >
    <path
      fill="currentColor"
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
    />
  </svg>
);

const STUSpaceCard: FunctionComponent = () => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3, // 提高导出质量
      });

      const link = document.createElement("a");
      link.download = "stu-space-card.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to download card:", err);
    }
  };

  return (
    <div
      ref={cardRef}
      class="w-full max-w-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50 rounded-lg hover:shadow-lg transition-shadow duration-300"
    >
      <div class="p-6 space-y-1">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-amber-900 dark:text-amber-100">
            ST.U Space
          </h2>
          <div class="w-8 h-8 bg-amber-900 dark:bg-amber-100 rounded-full flex items-center justify-center">
            <span class="text-amber-50 dark:text-amber-900 text-xs font-semibold">
              ST.U
            </span>
          </div>
        </div>
        <p class="text-amber-700 dark:text-amber-300">一块开放的试验田</p>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-amber-800 dark:text-amber-200">
          作为一个 Anonymous
          Space，这里包含无限可能。欢迎在这片试验田上探索与创造。
        </p>

        <div class="bg-amber-100 dark:bg-amber-800/30 p-4 rounded-lg space-y-2">
          <p class="text-amber-900 dark:text-amber-100 font-medium">参与共建</p>
          <ul class="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-1">
            <li>dev@ShanTou.University</li>
            <li>GitHub issue</li>
            <li>Fork & PR</li>
          </ul>
        </div>
      </div>

      <div class="px-6 py-4 flex justify-between items-center border-t border-amber-200 dark:border-amber-700/50">
        <a
          href="https://space.shantou.university"
          class="text-amber-900 dark:text-amber-100 hover:text-amber-600 dark:hover:text-amber-300 transition-colors duration-200"
        >
          space.shantou.university
        </a>
        <div class="flex gap-4 items-center">
          <button
            onClick={handleDownload}
            class="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
            title="下载为图片"
          >
            <DownloadIcon />
          </button>
          <a
            href="https://github.com/ShanTouUniversity/space"
            class="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
            aria-label="GitHub Repository"
          >
            <GithubIcon />
          </a>
        </div>
      </div>
    </div>
  );
};

export default STUSpaceCard;
