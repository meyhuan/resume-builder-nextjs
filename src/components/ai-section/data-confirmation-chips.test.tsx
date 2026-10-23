import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { DataConfirmationChips } from './data-confirmation-chips';

afterEach(() => {
  cleanup();
});

describe('DataConfirmationChips', () => {
  it('renders nothing when html has no [X] placeholders', () => {
    const { container } = render(
      <DataConfirmationChips
        html="<ul><li><strong>前端开发：</strong>完成页面开发与交互调试。</li></ul>"
        onChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders confirmation chips for each [X] placeholder and fills or removes them', () => {
    const onChange = vi.fn();
    const initialHtml =
      '<ul><li><strong>前端开发：</strong>视觉还原度达 [X]% 以上，累计闭环 [X] 个缺陷。</li></ul>';

    render(<DataConfirmationChips html={initialHtml} onChange={onChange} />);

    expect(screen.getByTestId('data-confirmation-chips')).toBeDefined();
    expect(screen.getByText(/待确认数据（2 处 \[X\] 需确认）/)).toBeDefined();

    // Fill the first placeholder with 95
    const input = screen.getByPlaceholderText(/输入真实/);
    fireEvent.change(input, { target: { value: '95' } });
    fireEvent.click(screen.getByText('填入'));

    expect(onChange).toHaveBeenCalledWith(
      '<ul><li><strong>前端开发：</strong>视觉还原度达 95% 以上，累计闭环 [X] 个缺陷。</li></ul>',
    );

    // Click "不写此数据" to remove a placeholder
    fireEvent.click(screen.getByText('不写此数据'));
    const lastCallArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallArg).not.toContain('视觉还原度达 [X]%');
  });
});
