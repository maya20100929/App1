import { ThemedText } from '@/components/themed-text';
import { ScrollView, StyleSheet } from 'react-native';

export default function HelpScreen() {
  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>Cura 使い方ガイド</ThemedText>

      <ThemedText style={styles.heading}>Curaとは</ThemedText>
      <ThemedText style={styles.text}>
        Curaは日々の勉強を記録し、学習状況を分析できる学習サポートアプリです。
      </ThemedText>

      <ThemedText style={styles.heading}>ログイン</ThemedText>
      <ThemedText style={styles.text}>
        メールアドレスまたはGoogleアカウントでログインできます。
      </ThemedText>

      <ThemedText style={styles.heading}>勉強記録</ThemedText>
      <ThemedText style={styles.text}>
        教科・教材・内容・学習量を記録するとポイントが加算されます。
      </ThemedText>

      <ThemedText style={styles.heading}>今までの記録</ThemedText>
      <ThemedText style={styles.text}>
        日別推移、科目別分析、教材ランキングを確認できます。
      </ThemedText>

      <ThemedText style={styles.heading}>通知機能</ThemedText>
      <ThemedText style={styles.text}>
        勉強予定を登録し、忘れ防止に活用できます。
      </ThemedText>

      <ThemedText style={styles.heading}>テスト対策</ThemedText>
      <ThemedText style={styles.text}>
        テスト日を登録して学習計画を立てられます。
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
});