import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { MONO, type ThemeColors } from '@/components/tokens';

interface MarkdownContentProps {
  content: string;
  C: ThemeColors;
  inverted?: boolean;
  streaming?: boolean;
}

function buildMarkdownStyles(C: ThemeColors, textColor: string, codeBg: string, linkColor: string) {
  return StyleSheet.create({
    body: {
      color: textColor,
      fontFamily: MONO,
      fontSize: 13,
      lineHeight: 20,
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
    list_item: {
      marginBottom: 4,
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
  const textColor = inverted ? C.background : C.text;
  const codeBg = inverted ? C.backgroundSelected : C.backgroundElement;
  const linkColor = inverted ? C.background : C.accent;
  const styles = useMemo(
    () => buildMarkdownStyles(C, textColor, codeBg, linkColor),
    [C, textColor, codeBg, linkColor],
  );

  async function openLink(url: string) {
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  }

  if (!content.trim()) {
    return streaming ? (
      <Text style={{ fontSize: 13, fontFamily: MONO, color: textColor }}>…▍</Text>
    ) : null;
  }

  return (
    <View>
      <Markdown
        style={styles}
        onLinkPress={(url) => {
          void openLink(url);
          return false;
        }}
      >
        {content}
      </Markdown>
      {streaming ? (
        <Text style={{ fontSize: 13, fontFamily: MONO, color: textColor, marginTop: -4 }}>▍</Text>
      ) : null}
    </View>
  );
}
