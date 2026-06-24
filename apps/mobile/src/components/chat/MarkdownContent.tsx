import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { MONO, type ThemeColors } from '@/components/tokens';

// ─── Block-level types ───────────────────────────────────────────────────────

type Block =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: 1 | 2 | 3; content: string }
  | { type: 'fence'; lang: string; content: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'ordered_list'; items: string[] }
  | { type: 'blockquote'; content: string }
  | { type: 'hr' }
  | { type: 'image'; alt: string; url: string };

function tokenize(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```') || line.startsWith('~~~')) {
      const fence = line[0].repeat(3);
      const lang = line.slice(3).trim();
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        contentLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'fence', lang, content: contentLines.join('\n') });
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      blocks.push({ type: 'heading', level: Math.min(hm[1].length, 3) as 1 | 2 | 3, content: hm[2] });
      i++;
      continue;
    }

    // HR
    if (/^(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].startsWith('> ') ? lines[i].slice(2) : '');
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Bullet list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'bullet_list', items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ordered_list', items });
      continue;
    }

    // Standalone image
    const imgm = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgm) {
      blocks.push({ type: 'image', alt: imgm[1], url: imgm[2] });
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — accumulate until a block boundary
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('~~~') &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+[.)]\s/.test(lines[i]) &&
      !/^(---+|\*\*\*+|___+)\s*$/.test(lines[i]) &&
      !/^!\[/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') });
    }
  }

  return blocks;
}

// ─── Inline parsing ───────────────────────────────────────────────────────────

type Span =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'image'; alt: string; url: string };

const INLINE_RE = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*|`(.+?)`|!\[([^\]]*)\]\(([^)]+)\)|\[(.+?)\]\((.+?)\))/gs;

function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) {
      spans.push({ type: 'text', content: text.slice(last, m.index) });
    }
    const raw = m[0];
    if (raw.startsWith('***')) {
      spans.push({ type: 'bold', content: m[2] });
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      spans.push({ type: 'bold', content: m[3] ?? m[4] });
    } else if (raw.startsWith('_') || raw.startsWith('*')) {
      spans.push({ type: 'italic', content: m[5] ?? m[6] });
    } else if (raw.startsWith('`')) {
      spans.push({ type: 'code', content: m[7] });
    } else if (raw.startsWith('![')) {
      spans.push({ type: 'image', alt: m[8] ?? '', url: m[9] });
    } else if (raw.startsWith('[')) {
      spans.push({ type: 'link', label: m[10], url: m[11] });
    }
    last = m.index + raw.length;
  }

  if (last < text.length) {
    spans.push({ type: 'text', content: text.slice(last) });
  }

  return spans;
}

// ─── Renderers ────────────────────────────────────────────────────────────────

interface RenderProps {
  C: ThemeColors;
  textColor: string;
  codeBg: string;
  fontSize: number;
}

async function openLink(url: string) {
  if (Platform.OS === 'web') {
    const { Linking } = await import('react-native');
    await Linking.openURL(url);
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
}

function InlineContent({ text, rp }: { text: string; rp: RenderProps }) {
  const spans = useMemo(() => parseInline(text), [text]);
  const { textColor, codeBg, fontSize, C } = rp;

  return (
    <Text
      selectable
      style={{ fontSize, fontFamily: MONO, color: textColor, lineHeight: fontSize * 1.6 }}
    >
      {spans.map((span, i) => {
        if (span.type === 'bold') {
          return (
            <Text key={i} style={{ fontWeight: '700', color: textColor }}>
              {span.content}
            </Text>
          );
        }
        if (span.type === 'italic') {
          return (
            <Text key={i} style={{ fontStyle: 'italic', color: textColor }}>
              {span.content}
            </Text>
          );
        }
        if (span.type === 'code') {
          return (
            <Text
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: fontSize - 1,
                color: textColor,
                backgroundColor: codeBg,
              }}
            >
              {` ${span.content} `}
            </Text>
          );
        }
        if (span.type === 'link') {
          return (
            <Pressable key={i} onPress={() => void openLink(span.url)}>
              <Text
                style={{
                  color: C.accent,
                  textDecorationLine: 'underline',
                  fontSize,
                  fontFamily: MONO,
                }}
              >
                {span.label}
              </Text>
            </Pressable>
          );
        }
        if (span.type === 'image') {
          return (
            <Image
              key={i}
              source={{ uri: span.url }}
              accessibilityLabel={span.alt}
              style={{
                width: '100%',
                height: 180,
                borderRadius: 4,
                backgroundColor: C.backgroundSelected,
              }}
              contentFit="contain"
            />
          );
        }
        return <Text key={i}>{span.content}</Text>;
      })}
    </Text>
  );
}

function BlockView({ block, rp }: { block: Block; rp: RenderProps }) {
  const { C, textColor, codeBg, fontSize } = rp;
  const lineHeight = fontSize * 1.6;

  switch (block.type) {
    case 'heading': {
      const hSize = block.level === 1 ? fontSize + 4 : block.level === 2 ? fontSize + 2 : fontSize + 1;
      return (
        <Text
          selectable
          style={{
            fontSize: hSize,
            fontWeight: '700',
            fontFamily: MONO,
            color: textColor,
            lineHeight: hSize * 1.4,
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          {block.content}
        </Text>
      );
    }

    case 'fence':
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            backgroundColor: codeBg,
            borderWidth: 1,
            borderColor: C.hairline,
            borderRadius: 4,
            marginVertical: 4,
          }}
        >
          <Text
            selectable
            style={{
              fontFamily: MONO,
              fontSize: fontSize - 1,
              color: textColor,
              lineHeight: (fontSize - 1) * 1.5,
              padding: 10,
            }}
          >
            {block.content}
          </Text>
        </ScrollView>
      );

    case 'blockquote':
      return (
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: C.hairlineStrong,
            paddingLeft: 10,
            paddingVertical: 2,
            marginVertical: 4,
            opacity: 0.8,
          }}
        >
          <InlineContent text={block.content} rp={rp} />
        </View>
      );

    case 'bullet_list':
      return (
        <View style={{ marginVertical: 2 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text style={{ fontSize, fontFamily: MONO, color: textColor, width: 16 }}>–</Text>
              <View style={{ flex: 1 }}>
                <InlineContent text={item} rp={rp} />
              </View>
            </View>
          ))}
        </View>
      );

    case 'ordered_list':
      return (
        <View style={{ marginVertical: 2 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text
                style={{
                  fontSize,
                  fontFamily: MONO,
                  color: textColor,
                  width: 20,
                  opacity: 0.6,
                }}
              >
                {i + 1}.
              </Text>
              <View style={{ flex: 1 }}>
                <InlineContent text={item} rp={rp} />
              </View>
            </View>
          ))}
        </View>
      );

    case 'hr':
      return (
        <View
          style={{
            height: 1,
            backgroundColor: C.hairline,
            marginVertical: 8,
          }}
        />
      );

    case 'image':
      return (
        <View style={{ marginVertical: 4 }}>
          <Image
            source={{ uri: block.url }}
            accessibilityLabel={block.alt}
            style={{
              width: '100%',
              height: 220,
              borderRadius: 4,
              backgroundColor: C.backgroundSelected,
            }}
            contentFit="contain"
          />
          {block.alt ? (
            <Text
              style={{
                fontSize: fontSize - 3,
                fontFamily: MONO,
                color: textColor,
                opacity: 0.5,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {block.alt}
            </Text>
          ) : null}
        </View>
      );

    case 'paragraph':
    default:
      return (
        <View style={{ marginBottom: 6 }}>
          <InlineContent text={block.content} rp={rp} />
        </View>
      );
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

interface MarkdownContentProps {
  content: string;
  C: ThemeColors;
  inverted?: boolean;
  streaming?: boolean;
  fontSize?: number;
}

export function MarkdownContent({
  content,
  C,
  inverted,
  streaming,
  fontSize = 14,
}: MarkdownContentProps) {
  const textColor = inverted ? C.onDark : C.text;
  const codeBg = inverted ? C.backgroundSelected : C.backgroundElement;

  const rp: RenderProps = { C, textColor, codeBg, fontSize };
  const blocks = useMemo(() => tokenize(content), [content]);

  if (!content.trim()) {
    return streaming ? (
      <Text style={{ fontSize, fontFamily: MONO, color: textColor }}>…</Text>
    ) : null;
  }

  return (
    <View>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} rp={rp} />
      ))}
    </View>
  );
}
