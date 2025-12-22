export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) {
      // Fall through to fallback
    }
  }

  // Fallback for older browsers: temporary textarea + execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  let originalRange: Range | null = null;
  if (selection && selection.rangeCount > 0) {
    originalRange = selection.getRangeAt(0);
  }

  textarea.select();

  try {
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('Fallback copy failed (document.execCommand returned false)');
    }
  } finally {
    document.body.removeChild(textarea);
    if (selection) {
      selection.removeAllRanges();
      if (originalRange) selection.addRange(originalRange);
    }
  }
}
