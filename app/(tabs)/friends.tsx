import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Friend = { id: string; name: string; handle: string; color: string; initial: string; status: string };

const initialFriends: Friend[] = [
  { id: '1', name: 'さくら', handle: '@sakura_study', color: '#F7C6D9', initial: 'さ', status: '英語の長文をがんばったよ' },
  { id: '2', name: 'りく', handle: '@riku_math', color: '#BCE5D0', initial: 'り', status: '青チャート 例題12問' },
  { id: '3', name: 'みお', handle: '@mio_goal', color: '#C9D5FF', initial: 'み', status: '今日の目標を達成！' },
];

export default function FriendsScreen() {
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState([{ id: 'r1', name: 'ゆう', handle: '@yu_study', initial: 'ゆ', color: '#FFE2AB' }]);
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'study'>('friends');
  const [search, setSearch] = useState('');
  const [shareToday, setShareToday] = useState(true);
  const [composerVisible, setComposerVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const visibleFriends = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return friends;
    return friends.filter(friend => `${friend.name} ${friend.handle}`.toLowerCase().includes(keyword));
  }, [friends, search]);

  const acceptRequest = (id: string) => {
    const request = requests.find(item => item.id === id);
    if (!request) return;
    setFriends(previous => [...previous, { ...request, status: 'よろしくね！' }]);
    setRequests(previous => previous.filter(item => item.id !== id));
  };

  const sendMessage = () => {
    if (!message.trim() || !selectedFriend) return;
    setComposerVisible(false);
    Alert.alert('送信しました', `${selectedFriend.name}さんにメッセージを送りました。`);
    setMessage('');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}><ThemedText style={styles.avatarText}>ま</ThemedText></View>
          <View style={styles.profileCopy}>
            <ThemedText style={styles.eyebrow}>MY STUDY PROFILE</ThemedText>
            <ThemedText style={styles.name}>まや</ThemedText>
            <ThemedText style={styles.handle}>@maya_study · あなただけのID</ThemedText>
          </View>
          <TouchableOpacity style={styles.editProfile} onPress={() => Alert.alert('プロフィール編集', 'アイコンと表示名はプロフィール設定から変更できます。')}>
            <Ionicons name="create-outline" size={18} color="#7464E8" />
          </TouchableOpacity>
        </View>
        <View style={styles.shareRow}>
          <View style={styles.shareIcon}><Ionicons name="sparkles" size={17} color="#7464E8" /></View>
          <View style={styles.shareText}><ThemedText style={styles.shareTitle}>今日のがんばりを友達に共有</ThemedText><ThemedText style={styles.shareSub}>勉強時間と達成したことだけを送ります</ThemedText></View>
          <Switch value={shareToday} onValueChange={setShareToday} trackColor={{ false: '#D9D5E9', true: '#B7AEFA' }} thumbColor="#FFFFFF" />
        </View>
      </View>

      <View style={styles.tabBar}>
        {([['friends', '友達'], ['groups', 'コミュニティ'], ['study', '勉強会']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setActiveTab(key)} style={[styles.tab, activeTab === key && styles.tabActive]}>
            <ThemedText style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'friends' && <>
        <View style={styles.searchBox}><Ionicons name="search" size={19} color="#827B9A" /><TextInput value={search} onChangeText={setSearch} placeholder="ユーザー名・IDで検索" placeholderTextColor="#9D97AE" style={styles.searchInput} /><TouchableOpacity onPress={() => Alert.alert('友達を探す', 'IDまたはユーザー名で検索できます。')}><ThemedText style={styles.searchAction}>検索</ThemedText></TouchableOpacity></View>
        {requests.length > 0 && <View style={styles.section}><View style={styles.sectionHeading}><ThemedText style={styles.sectionTitle}>友達リクエスト</ThemedText><View style={styles.badge}><ThemedText style={styles.badgeText}>{requests.length}</ThemedText></View></View>{requests.map(request => <View key={request.id} style={styles.requestCard}><MiniAvatar initial={request.initial} color={request.color} /><View style={styles.flex}><ThemedText style={styles.cardName}>{request.name}</ThemedText><ThemedText style={styles.cardSub}>{request.handle} が友達になりたがっています</ThemedText></View><TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(request.id)}><ThemedText style={styles.acceptText}>承認</ThemedText></TouchableOpacity></View>)}</View>}
        <View style={styles.section}><View style={styles.sectionHeading}><ThemedText style={styles.sectionTitle}>友達</ThemedText><ThemedText style={styles.count}>{friends.length}人</ThemedText></View>{visibleFriends.map(friend => <TouchableOpacity key={friend.id} style={styles.friendCard} onPress={() => { setSelectedFriend(friend); setComposerVisible(true); }}><MiniAvatar initial={friend.initial} color={friend.color} /><View style={styles.flex}><ThemedText style={styles.cardName}>{friend.name}</ThemedText><ThemedText style={styles.cardSub}>{friend.status}</ThemedText></View><Ionicons name="chatbubble-ellipses-outline" size={21} color="#7464E8" /></TouchableOpacity>)}{visibleFriends.length === 0 && <ThemedText style={styles.empty}>該当するユーザーがいません</ThemedText>}</View>
      </>}

      {activeTab === 'groups' && <View style={styles.section}><ThemedText style={styles.sectionTitle}>同じ目標の仲間とつながろう</ThemedText><ThemedText style={styles.description}>目標や受験年度が近いコミュニティに参加できます。</ThemedText><GroupCard icon="school-outline" color="#E8DEFF" title="2027年 大学受験" members="1,248人が参加中" action="参加する" /><GroupCard icon="book-outline" color="#D7F1E3" title="毎日3時間チャレンジ" members="386人が参加中" action="参加する" /><GroupCard icon="language-outline" color="#FFE5C0" title="英検準1級を目指す会" members="742人が参加中" action="見る" /></View>}

      {activeTab === 'study' && <View style={styles.section}><ThemedText style={styles.sectionTitle}>一緒に勉強する</ThemedText><ThemedText style={styles.description}>全体公開またはコミュニティ内で、集中する時間を共有できます。</ThemedText><View style={styles.studyCard}><View style={styles.live}><View style={styles.liveDot} /><ThemedText style={styles.liveText}>いま開催中</ThemedText></View><ThemedText style={styles.studyTitle}>夜の自習室</ThemedText><ThemedText style={styles.cardSub}>19:00 - 21:00 · 42人が集中中</ThemedText><TouchableOpacity style={styles.joinButton} onPress={() => Alert.alert('勉強会に参加', '夜の自習室に参加しました。')}><Ionicons name="enter-outline" size={19} color="#FFF" /><ThemedText style={styles.joinText}>参加する</ThemedText></TouchableOpacity></View><TouchableOpacity style={styles.createStudy} onPress={() => Alert.alert('勉強会を作成', '公開範囲と時間を選んで、仲間を募集できます。')}><Ionicons name="add-circle-outline" size={22} color="#7464E8" /><ThemedText style={styles.createStudyText}>勉強会をつくる</ThemedText></TouchableOpacity></View>}

      <Modal visible={composerVisible} transparent animationType="slide" onRequestClose={() => setComposerVisible(false)}><View style={styles.modalShade}><View style={styles.modal}><View style={styles.modalHeader}><View><ThemedText style={styles.modalTitle}>{selectedFriend?.name}さんにメッセージ</ThemedText><ThemedText style={styles.cardSub}>1対1の近況共有</ThemedText></View><TouchableOpacity onPress={() => setComposerVisible(false)}><Ionicons name="close" size={24} color="#56506A" /></TouchableOpacity></View><TextInput multiline value={message} onChangeText={setMessage} placeholder="今日やったこと、応援メッセージなど" placeholderTextColor="#9D97AE" style={styles.messageInput} /><TouchableOpacity style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} onPress={sendMessage}><ThemedText style={styles.sendText}>送信する</ThemedText></TouchableOpacity></View></View></Modal>
    </ScrollView>
  );
}

function MiniAvatar({ initial, color }: { initial: string; color: string }) { return <View style={[styles.miniAvatar, { backgroundColor: color }]}><ThemedText style={styles.miniAvatarText}>{initial}</ThemedText></View>; }
function GroupCard({ icon, color, title, members, action }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; members: string; action: string }) { return <View style={styles.groupCard}><View style={[styles.groupIcon, { backgroundColor: color }]}><Ionicons name={icon} size={24} color="#5E5680" /></View><View style={styles.flex}><ThemedText style={styles.cardName}>{title}</ThemedText><ThemedText style={styles.cardSub}>{members}</ThemedText></View><TouchableOpacity style={styles.outlineButton} onPress={() => Alert.alert(title, `${title}を開きます。`)}><ThemedText style={styles.outlineText}>{action}</ThemedText></TouchableOpacity></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF9FF' }, content: { padding: 16, paddingBottom: 44, maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#EAE7F5', shadowColor: '#554B78', shadowOpacity: .06, shadowRadius: 14, elevation: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#CFC7FF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#453A73', fontWeight: '800', fontSize: 24 }, profileCopy: { marginLeft: 12, flex: 1 }, eyebrow: { color: '#8B82A8', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, name: { color: '#211B37', fontWeight: '800', fontSize: 21, marginTop: 1 }, handle: { color: '#827B9A', fontSize: 12, marginTop: 2 }, editProfile: { backgroundColor: '#F0EEFF', borderRadius: 18, padding: 10 },
  shareRow: { marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEEAF6', flexDirection: 'row', alignItems: 'center' }, shareIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 9 }, shareText: { flex: 1 }, shareTitle: { color: '#413B57', fontWeight: '700', fontSize: 13 }, shareSub: { color: '#8B84A1', fontSize: 11, marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#EEEAF7', padding: 4, borderRadius: 16, marginTop: 20 }, tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 }, tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#534A74', shadowOpacity: .1, shadowRadius: 5, elevation: 1 }, tabText: { color: '#817994', fontSize: 13, fontWeight: '700' }, tabTextActive: { color: '#5F50D1' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E0EF', borderRadius: 16, paddingHorizontal: 13, marginTop: 20, height: 52 }, searchInput: { flex: 1, color: '#302A42', fontSize: 14, paddingHorizontal: 9, outlineStyle: 'none' as any }, searchAction: { color: '#7464E8', fontWeight: '800', fontSize: 13 },
  section: { marginTop: 24 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }, sectionTitle: { color: '#29233E', fontSize: 17, fontWeight: '800' }, count: { color: '#8C84A3', fontSize: 13 }, badge: { backgroundColor: '#7464E8', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EDFF', borderRadius: 18, padding: 13, marginBottom: 8 }, friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: '#EAE7F4' }, miniAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, miniAvatarText: { color: '#51496D', fontSize: 16, fontWeight: '800' }, flex: { flex: 1 }, cardName: { color: '#373047', fontWeight: '800', fontSize: 14 }, cardSub: { color: '#817A91', fontSize: 12, marginTop: 3 }, acceptButton: { backgroundColor: '#7464E8', borderRadius: 13, paddingVertical: 9, paddingHorizontal: 14 }, acceptText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, empty: { textAlign: 'center', color: '#8B84A1', paddingVertical: 28 },
  description: { color: '#827B96', fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 14 }, groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: '#EAE7F4' }, groupIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, outlineButton: { borderWidth: 1, borderColor: '#B8B0ED', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }, outlineText: { color: '#6758D1', fontSize: 12, fontWeight: '800' },
  studyCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E7E2F3', padding: 18, marginTop: 15 }, live: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FCE9EE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E66B89', marginRight: 5 }, liveText: { color: '#BD546E', fontSize: 11, fontWeight: '800' }, studyTitle: { color: '#302A42', fontSize: 19, fontWeight: '800', marginTop: 13 }, joinButton: { backgroundColor: '#7464E8', borderRadius: 14, marginTop: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, joinText: { color: '#FFF', fontWeight: '800', fontSize: 14 }, createStudy: { borderRadius: 17, padding: 16, borderWidth: 1.5, borderColor: '#B8B0ED', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 11 }, createStudyText: { color: '#6556CD', fontWeight: '800', fontSize: 14 },
  modalShade: { flex: 1, backgroundColor: 'rgba(32, 26, 55, .36)', justifyContent: 'flex-end' }, modal: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 32 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: '#29233E', fontWeight: '800', fontSize: 17 }, messageInput: { height: 116, marginTop: 18, backgroundColor: '#F6F4FB', borderRadius: 14, color: '#302A42', padding: 13, textAlignVertical: 'top', outlineStyle: 'none' as any }, sendButton: { backgroundColor: '#7464E8', borderRadius: 14, alignItems: 'center', paddingVertical: 13, marginTop: 12 }, sendButtonDisabled: { backgroundColor: '#C9C4DB' }, sendText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
