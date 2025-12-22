/**
 * Tests for copyToClipboard utility.
 *
 * Assumes Jest environment with jsdom.
 */
import { copyToClipboard } from '../copyToClipboard';

describe('copyToClipboard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses navigator.clipboard.writeText when available and succeeds', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    await expect(copyToClipboard('hello')).resolves.toBeUndefined();
    // @ts-ignore
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  test('falls back to execCommand when navigator.clipboard.writeText throws or not present', async () => {
    // @ts-ignore
    delete (navigator as any).clipboard;

    const execCommandMock = jest.spyOn(document, 'execCommand').mockImplementation(() => true);

    await expect(copyToClipboard('fallback')).resolves.toBeUndefined();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  test('throws when fallback execCommand returns false', async () => {
    // @ts-ignore
    delete (navigator as any).clipboard;
    jest.spyOn(document, 'execCommand').mockImplementation(() => false);

    await expect(copyToClipboard('bad')).rejects.toThrow();
  });
});
