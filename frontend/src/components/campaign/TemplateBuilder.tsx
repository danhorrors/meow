import { Button, TextArea, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';

export type TemplateBlockType = 'heading' | 'paragraph' | 'button' | 'image' | 'divider';

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  content: string;
  href?: string;
}

export interface TemplateBuilderProps {
  value: string;
  onChange: (html: string) => void;
}

const makeId = () => Math.random().toString(36).slice(2);

const defaultBlockFor = (type: TemplateBlockType): TemplateBlock => {
  switch (type) {
    case 'heading':
      return { id: makeId(), type, content: 'Heading text' };
    case 'paragraph':
      return { id: makeId(), type, content: 'Paragraph text' };
    case 'button':
      return { id: makeId(), type, content: 'Call to action', href: 'https://example.com' };
    case 'image':
      return { id: makeId(), type, content: 'https://placehold.co/600x200' };
    case 'divider':
    default:
      return { id: makeId(), type, content: '' };
  }
};

const renderHtml = (blocks: TemplateBlock[]) => {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h2 style="font-family:Arial,sans-serif;">${block.content}</h2>`;
        case 'paragraph':
          return `<p style="font-family:Arial,sans-serif;">${block.content}</p>`;
        case 'button':
          return `<p><a href="${block.href || '#'}" style="display:inline-block;padding:10px 16px;background:#114b5f;color:#fff;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;">${block.content}</a></p>`;
        case 'image':
          return `<p><img src="${block.content}" alt="" style="max-width:100%;" /></p>`;
        case 'divider':
          return '<hr />';
        default:
          return '';
      }
    })
    .join('\n');
};

export const TemplateBuilder = ({ value, onChange }: TemplateBuilderProps) => {
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [sourceHtml, setSourceHtml] = useState(value);

  const active = blocks.find((item) => item.id === activeId);

  useEffect(() => {
    setSourceHtml(value || '');
  }, [value]);

  const addBlock = (type: TemplateBlockType) => {
    const next = [...blocks, defaultBlockFor(type)];
    setBlocks(next);
    setActiveId(next[next.length - 1].id);
    onChange(renderHtml(next));
  };

  const updateBlock = (patch: Partial<TemplateBlock>) => {
    if (!active) return;
    const next = blocks.map((item) => (item.id === active.id ? { ...item, ...patch } : item));
    setBlocks(next);
    onChange(renderHtml(next));
  };

  const removeBlock = (id: string) => {
    const next = blocks.filter((item) => item.id !== id);
    setBlocks(next);
    if (activeId === id) {
      setActiveId(next[0]?.id || null);
    }
    onChange(renderHtml(next));
  };

  const onDragStart = (id: string) => {
    setDragId(id);
  };

  const onDrop = (id: string) => {
    if (!dragId || dragId === id) return;
    const next = [...blocks];
    const fromIndex = next.findIndex((item) => item.id === dragId);
    const toIndex = next.findIndex((item) => item.id === id);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setBlocks(next);
    setDragId(null);
    onChange(renderHtml(next));
  };

  const previewHtml = useMemo(() => {
    if (blocks.length > 0) {
      return renderHtml(blocks);
    }
    return sourceHtml || value || '';
  }, [blocks, sourceHtml, value]);

  const updateSource = (next: string) => {
    setSourceHtml(next);
    setBlocks([]);
    onChange(next);
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="secondary" onPress={() => addBlock('heading')}>
          Add Heading
        </Button>
        <Button variant="secondary" onPress={() => addBlock('paragraph')}>
          Add Paragraph
        </Button>
        <Button variant="secondary" onPress={() => addBlock('button')}>
          Add Button
        </Button>
        <Button variant="secondary" onPress={() => addBlock('image')}>
          Add Image
        </Button>
        <Button variant="secondary" onPress={() => addBlock('divider')}>
          Add Divider
        </Button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {blocks.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => onDragStart(block.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(block.id)}
            onClick={() => setActiveId(block.id)}
            style={{
              padding: '10px',
              border: activeId === block.id ? '2px solid #114b5f' : '1px solid #e3ded4',
              cursor: 'grab',
              background: '#fff',
            }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase' }}>{block.type}</div>
            <div style={{ color: '#555' }}>{block.content || '(empty)'}</div>
            <Button variant="secondary" onPress={() => removeBlock(block.id)}>
              {Translations.DeleteButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        ))}
      </div>

      {active && (
        <div style={{ display: 'grid', gap: '8px' }}>
          <TextField
            label="Content"
            value={active.content}
            onChange={(value) => updateBlock({ content: value })}
          />
          {active.type === 'button' && (
            <TextField
              label="Button URL"
              value={active.href || ''}
              onChange={(value) => updateBlock({ href: value })}
            />
          )}
        </div>
      )}

      <div>
        <h4>HTML Preview</h4>
        <div
          style={{ border: '1px solid #e3ded4', padding: '12px', background: '#fff' }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        <TextArea
          label={Translations.CampaignHtmlLabel[DEFAULT_LANGUAGE]}
          value={sourceHtml}
          onChange={updateSource}
        />
      </div>
    </div>
  );
};
