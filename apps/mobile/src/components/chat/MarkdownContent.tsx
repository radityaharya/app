import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Markdown, { renderRules, type RenderRules } from 'react-native-markdown-display';

import { MONO, type ThemeColors } from '@/components/tokens';

function createMarkdownRules(textColor: string): RenderRules {
  return {
    ...renderRules,
    textgroup: (node, children, _parent, styles) => (
      <Text key={node.key} selectable style={[styles.textgroup, { color: textColor }]}>
        {children}
      </Text>
    ),
    fence: (node, _children, _parent, styles) => (
      <Text key={node.key} selectable style={[styles.fence, styles.code_block, { color: textColor }]}>
        {node.content}
      </Text>
    ),
    code_block: (node, _children, _parent, styles) => (
      <Text key={node.key} selectable style={[styles.code_block, styles.fence, { color: textColor }]}>
        {node.content}
      </Text>
    ),
  };
}

interface MarkdownContentProps {
  content: string;
  C: ThemeColors;
  inverted?: boolean;
  streaming?: boolean;
}

function buildMarkdownStyles(C: ThemeColors, textColor: string, codeBg: string, linkColor: string) {
  const baseText = {
    color: textColor,
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 20,
  };

  return StyleSheet.create({
    body: baseText,
    text: baseText,
    textgroup: baseText,
    hardbreak: baseText,
    softbreak: baseText,
    bullet_list_content: baseText,
    ordered_list_content: baseText,
    bullet_list_icon: baseText,
    list_item: {
      ...baseText,
      marginBottom: 4,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 8,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    heading1: {
      fontFamily: MONO,
      fontSize: 16,
      fontWeight: '700',
      color: textColor,
      marginBottom: 8,
      marginTop: 4,
    },
    heading2: {
      fontFamily: MONO,
      fontSize: 14,
      fontWeight: '700',
      color: textColor,
      marginBottom: 6,
      marginTop: 4,
    },
    heading3: {
      fontFamily: MONO,
      fontSize: 13,
      fontWeight: '700',
      color: textColor,
      marginBottom: 4,
      marginTop: 4,
    },
    strong: {
      fontWeight: '700',
      color: textColor,
    },
    em: {
      fontStyle: 'italic',
      color: textColor,
    },
    link: {
      color: linkColor,
      textDecorationLine: 'underline',
    },
    blockquote: {
      backgroundColor: codeBg,
      borderLeftWidth: 2,
      borderLeftColor: C.hairlineStrong,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
    },
    code_inline: {
      fontFamily: MONO,
      fontSize: 12,
      color: textColor,
      backgroundColor: codeBg,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    fence: {
      fontFamily: MONO,
      fontSize: 12,
      lineHeight: 18,
      color: textColor,
      backgroundColor: codeBg,
      borderWidth: 1,
      borderColor: C.hairline,
      borderRadius: 4,
      padding: 10,
      marginBottom: 8,
    },
    code_block: {
      fontFamily: MONO,
      fontSize: 12,
      lineHeight: 18,
      color: textColor,
    },
    hr: {
      backgroundColor: C.hairline,
      height: 1,
      marginVertical: 10,
    },
  });
}

export function MarkdownContent({ content, C, inverted, streaming }: MarkdownContentProps) {
  const textColor = inverted ? C.onDark : C.text;
  const codeBg = inverted ? C.backgroundSelected : C.backgroundElement;
  const linkColor = inverted ? C.onDark : C.accent;
  const styles = useMemo(
    () => buildMarkdownStyles(C, textColor, codeBg, linkColor),
    [C, textColor, codeBg, linkColor],
  );
  const rules = useMemo(() => createMarkdownRules(textColor), [textColor]);

  async function openLink(url: string) {
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  }

  if (!content.trim()) {
    return streaming ? (
      <Text selectable style={{ fontSize: 13, fontFamily: MONO, color: textColor }}>…▍</Text>
    ) : null;
  }

  return (
    <View>
      <Markdown
        style={styles}
        mergeStyle={false}
        rules={rules}
        onLinkPress={(url) => {
          void openLink(url);
          return false;
        }}
      >
        {content}
      </Markdown>
      {streaming ? (
        <Text selectable style={{ fontSize: 13, fontFamily: MONO, color: textColor, marginTop: -4 }}>▍</Text>
      ) : null}
    </View>
  );
}
