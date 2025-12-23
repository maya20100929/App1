import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function SettingsScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#aaacf5ff');
  const [lastLogin, setLastLogin] = useState('');
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', onPress: () => Alert.alert('ログアウトしました') },
    ]);
  };

  const themeColors = [
    '#aaacf5ff', // パープル
    '#007AFF', // ブルー
    '#30d5c8', // ミント
    '#ff7eb9', // ピンク
    '#1a1a1a', // ブラック
  ];

  // 最終ログイン取得
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('lastLogin');
      if (saved) {
        const d = new Date(saved);
        setLastLogin(
          `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(
            d.getMinutes()
          ).padStart(2, '0')}`
        );
      }
    })();
  }, []);

  // テーマカラー保存
  const handleSelectColor = async (color: string) => {
    setSelectedColor(color);
    await AsyncStorage.setItem('themeColor', color);
  };

  const handleDeleteAccount = () => {
    Alert.alert('アカウント削除', '本当に削除しますか？\nこの操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => Alert.alert('アカウントを削除しました') },
    ]);
  };

  // --- 追加: 設定項目リスト ---
  const settingsItems = [
    { section: 'テーマカラー', label: 'テーマカラー', type: 'color' },
    { section: '利用履歴', label: '最終ログイン', type: 'text' },
    { section: '通知', label: '通知オン/オフ（後で実装）', type: 'text' },
    { section: 'プライバシー', label: '利用規約を見る', action: () => setTermsModalVisible(true) },
    { section: 'プライバシー', label: 'プライバシーポリシー', action: () => setPrivacyModalVisible(true) },
    { section: '言語', label: '日本語' },
    { section: 'パスワード', label: 'パスワード変更' },
    { section: 'データ', label: 'バックアップ / 復元' },
    { section: 'ヘルプ', label: '使い方ガイドを見る' },
    { section: '情報', label: 'バージョン: 1.0.0' },
    { section: '情報', label: '開発者: あなたの名前' },
    { section: 'アカウント', label: 'ログアウト', action: handleLogout },
    { section: 'アカウント', label: 'アカウント削除', action: handleDeleteAccount },
  ]; // --- 追加ここまで ---

  // --- 追加: 検索で絞り込む ---
  const filteredItems = settingsItems.filter(item =>
    item.label.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      {/* 設定内検索 */}
      <TextInput
        style={styles.searchInput}
        placeholder="設定内を検索"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* --- 変更: 既存のUIを配列で置き換え --- */}
      {filteredItems.map((item, index) => {
        if (item.type === 'color') {
          // テーマカラー
          return (
            <View key={index}>
              <Text style={styles.sectionTitle}>{item.label}</Text>
              <View style={styles.colorRow}>
                {themeColors.map((color, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedDot,
                    ]}
                    onPress={() => handleSelectColor(color)}
                  />
                ))}
              </View>
            </View>
          );
        }

        // 通常のボタンやテキスト
        return (
          <View key={index}>
            <Text style={styles.sectionTitle}>{item.section}</Text>
            <View style={styles.box}>
              <TouchableOpacity
                style={styles.itemButton}
                onPress={item.action}
                disabled={!item.action}
              >
                <Text style={styles.itemText}>{item.label}</Text>
              </TouchableOpacity>
              {item.label === '最終ログイン' && (
                <Text style={styles.boxText}>最終ログイン：{lastLogin || 'データなし'}</Text>
              )}
            </View>
          </View>
        );
      })}

      {/* 利用規約モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>利用規約</Text>
              <Text style={styles.modalText}>
                第1条（適用）{'\n'}
                1.本規約は、ユーザーと当社との間の本アプリの利用に関する一切の関係に適用されます。{'\n'}
                2.当社は本規約を随時変更できるものとし、変更後の規約は本アプリ上に表示された時点から効力を生じます。{'\n'}
                {'\n'}
                第2条（利用登録）{'\n'}
                1.本アプリの利用希望者は、当社の定める方法により利用登録を行うものとします。{'\n'}
                2.利用登録の申請に対し、当社が承認した時点で利用契約が成立します。{'\n'}
                3.当社は、利用登録の申請を承認しない場合があります。その理由については開示しません。{'\n'}
                {'\n'}
                第3条（ユーザーの責任）{'\n'}
                1.ユーザーは自己の責任において本アプリを利用するものとします。{'\n'}
                2.ユーザーは、以下の行為を行ってはなりません。{'\n'}
                ・法令または公序良俗に反する行為{'\n'}
                ・他のユーザー、第三者、当社に損害を与える行為{'\n'}
                ・本アプリの運営を妨げる行為{'\n'}
                ・不正アクセスやデータ改ざん等の不正行為{'\n'}
                {'\n'}
                第4条（知的財産権）{'\n'}
                1.本アプリに関する著作権、商標権、特許権その他の知的財産権はすべて当社または当社にライセンスを許諾した第三者に帰属します。{'\n'}
                2.ユーザーは本アプリを個人的に利用する範囲内でのみ使用でき、無断で複製・配布・商用利用することはできません。{'\n'}
                {'\n'}
                第5条（禁止事項）{'\n'}
                ユーザーは、以下の行為を行ってはなりません。{'\n'}
                1.本アプリの改変、リバースエンジニアリング{'\n'}
                2.ウイルスや有害なプログラムの送信{'\n'}
                3.他のユーザーの個人情報の収集・利用{'\n'}
                4.本アプリを営利目的で利用すること{'\n'}
                {'\n'}
                第6条（本アプリの提供の停止等）{'\n'}
                1.当社は、以下の場合にユーザーへの事前通知なく本アプリの提供を停止または中断することがあります。{'\n'}
                ・本アプリの保守・更新を行う場合{'\n'}
                ・火災、停電、天災地変などやむを得ない事由がある場合{'\n'}
                2.当社は、本条に基づく停止・中断によりユーザーまたは第三者に生じた損害について、一切責任を負いません。{'\n'}
                {'\n'}
                第7条（免責事項）{'\n'}
                1.当社は、本アプリに関して、その完全性、正確性、最新性、特定目的適合性等について一切保証しません。{'\n'}
                2.ユーザーが本アプリを利用したことにより生じた損害について、当社は一切責任を負いません。{'\n'}
                {'\n'}
                第8条（利用規約の変更）{'\n'}
                当社は、必要に応じて本規約を変更することができ、変更後の規約は本アプリ上に掲示された時点で効力を生じます。ユーザーは変更後も本アプリを利用した時点で、変更に同意したものとみなされます。{'\n'}
                {'\n'}
                第9条（準拠法・管轄）{'\n'}
                1.本規約の解釈にあたっては、日本法を準拠法とします。{'\n'}
                2.本アプリに関して紛争が生じた場合、当社所在地の管轄裁判所を第一審の専属的合意管轄裁判所とします。{'\n'}
                {'\n'}
                第10条（未成年者の利用）{'\n'}
                1.ユーザーが未成年者（日本法上18歳未満を指します）の場合、本アプリを利用するにあたって、必ず親権者その他の法定代理人の同意を得るものとします。{'\n'}
                2.未成年者のユーザーが本アプリを利用した場合、当社は、親権者等の同意を得たうえでの利用であるとみなします。{'\n'}
                3.未成年者が親権者等の同意を得ずに本アプリを利用し、または虚偽の申告を行った場合でも、当社は一切の責任を負いません。{'\n'}
                4.ユーザーが利用開始後に成年に達した場合、当該ユーザーは成年到達後も引き続き本アプリを利用する意思をもって本規約に同意したものとみなします。{'\n'}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setTermsModalVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* プライバシーポリシーモーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>プライバシーポリシー</Text>
              <Text style={styles.modalText}>
                本プライバシーポリシー（以下「本ポリシー」といいます。）は、当社（以下「当社」といいます。）が提供する勉強アプリ「○○」（以下「本アプリ」といいます。）における、ユーザーの個人情報の取り扱いについて定めるものです。ユーザーは本アプリを利用することで、本ポリシーに同意したものとみなされます。{'\n'}
                {'\n'}
                第1条（収集する情報）{'\n'}
                本アプリでは、以下の情報を収集する場合があります。{'\n'}
                1. ユーザーが登録時に提供する情報{'\n'}
                ・氏名（ニックネーム可）{'\n'}
                ・メールアドレス{'\n'}
                ・学年や学校名（任意）{'\n'}
                2. 利用状況に関する情報{'\n'}
                ・アプリの利用ログ（学習時間、進捗、達成度など）{'\n'}
                ・デバイス情報（OS、端末種類、アプリのバージョンなど）{'\n'}
                3. お問い合わせ時に提供される情報{'\n'}
                ・問い合わせ内容{'\n'}
                ・連絡先情報（メールアドレスなど）{'\n'}
                {'\n'}
                第2条（個人情報の利用目的）{'\n'}
                収集した情報は、以下の目的で利用します。{'\n'}
                ・本アプリの運営・管理{'\n'}
                ・ユーザーへのサポート対応{'\n'}
                ・アプリ機能の改善や新機能の開発{'\n'}
                ・法令に基づく対応{'\n'}
                ・本アプリに関する通知（更新情報やお知らせ）{'\n'}
                {'\n'}
                第3条（個人情報の第三者提供）{'\n'}
                当社は、法令に定める場合を除き、ユーザーの同意なしに個人情報を第三者に提供しません。{'\n'}
                {'\n'}
                第4条（未成年者の個人情報）{'\n'}
                1. 未成年者（18歳未満）のユーザーが個人情報を提供する場合は、必ず親権者等の同意を得たうえで提供するものとします。{'\n'}
                2. 当社は、未成年者が親権者等の同意を得ずに個人情報を提供した場合の責任を負いません。{'\n'}
                {'\n'}
                第5条（情報の安全管理）{'\n'}
                当社は、個人情報の漏えい・紛失・改ざんを防ぐために、合理的な安全対策を講じます。{'\n'}
                {'\n'}
                第6条（個人情報の開示・訂正・削除）{'\n'}
                ユーザーは、当社に対して自己の個人情報の開示、訂正、利用停止または削除を求めることができます。請求方法や手順については、本アプリ内の問い合わせフォームにてご連絡ください。{'\n'}
                {'\n'}
                第7条（プライバシーポリシーの変更）{'\n'}
                本ポリシーは、必要に応じて変更されることがあります。変更後のプライバシーポリシーは、本アプリ上に掲示された時点で効力を生じます。{'\n'}
                {'\n'}
                第8条（お問い合わせ窓口）{'\n'}
                本ポリシーに関するお問い合わせは、以下の窓口までお願いします。{'\n'}
                ○○株式会社{'\n'}
                E-mail: support@example.com{'\n'}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setPrivacyModalVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// --- スタイルはそのまま ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },

  searchInput: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },

  colorRow: { flexDirection: 'row', marginBottom: 16 },

  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  selectedDot: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },

  box: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },

  boxText: { fontSize: 16 },

  itemButton: {
    paddingVertical: 12,
  },

  itemText: {
    fontSize: 16,
    color: '#007AFF',
  },

  accountButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  accountButtonText: { color: '#fff', fontSize: 16 },

  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontSize: 16 },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { margin: 20, backgroundColor: 'white', borderRadius: 8, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalText: { fontSize: 16, lineHeight: 24 },
  modalButton: { marginTop: 12, backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16 },
});
