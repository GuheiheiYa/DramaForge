/** 移除 lone surrogate，避免 JSON / API 编码失败 */
export function sanitizeSurrogates(value: string): string {
  return value.replace(/[\uD800-\uDFFF]/g, '');
}

/** 从创作方案 Markdown 或用户输入提取简短项目名 */
export function normalizeProjectName(value: string, maxLen = 50): string {
  const text = sanitizeSurrogates(value).trim();
  if (!text) return '创作项目';

  const bookMatch = text.match(/[《「【]([^》」】]{1,40})[》」】]/);
  if (bookMatch?.[1]?.trim()) {
    return bookMatch[1].trim().slice(0, maxLen);
  }

  const headingMatch = text.match(/^#{1,3}\s*(.+?)(?:\n|$)/m);
  if (headingMatch?.[1]) {
    const heading = headingMatch[1]
      .replace(/创作方案$/u, '')
      .replace(/[《》]/g, '')
      .trim();
    if (heading) return heading.slice(0, maxLen);
  }

  const cleaned = text
    .replace(/^(帮我|给我|请|麻烦)\s*(做|生成|创作|制作|写|设计)\s*(一个|一部)?\s*/u, '')
    .trim();

  if (cleaned) {
    const firstLine = cleaned.split('\n')[0]?.trim() || cleaned;
    return firstLine.slice(0, maxLen);
  }

  return text.slice(0, maxLen) || '创作项目';
}
