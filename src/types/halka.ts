import type { Timestamp } from 'firebase/firestore';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type ChannelType = 'text' | 'voice' | 'announcement';
export type AppearanceTheme = 'oniks' | 'koyu' | 'gece';
export type BotId = 'turcord_bot' | 'mod_bot' | 'music_bot';

export type AvatarDecorationId =
  | 'none'
  | 'crimson-rose'
  | 'sakura-blossom'
  | 'sunflower-bloom'
  | 'enchanted-ivy'
  | 'kawaii-cat-ears'
  | 'anime-ki-aura'
  | 'sharingan-vortex'
  | 'mecha-hud'
  | 'arcane-sigil'
  | 'galaxy-butterfly'
  | 'celestial-angel'
  | 'glitch-cyber'
  | 'dragon-flame'
  | 'cyber-ring'
  | 'emerald-flame'
  | 'crimson-pulse'
  | 'gold-halo'
  | 'aurora-orbit';

export type ProfileEffectId =
  | 'none'
  | 'rose-petals'
  | 'sakura-rain'
  | 'anime-sparks'
  | 'hearts-float'
  | 'cyber-matrix'
  | 'starfall'
  | 'confetti-party';

export type NameplateId =
  | 'none'
  | 'sakura-mist'
  | 'crimson-rose'
  | 'cyber-grid'
  | 'aurora-glow'
  | 'gold-royal'
  | 'anime-speed';

export type ActivityType = 'playing' | 'listening' | 'watching' | 'streaming';

export interface UserActivity {
  type: ActivityType;
  name: string;
  details?: string;
}

export interface ChatPoll {
  question: string;
  options: string[];
  multiSelect?: boolean;
}

export const LIMITS = {
  USERNAME_MIN: 2,
  USERNAME_MAX: 32,
  DISPLAY_NAME_MAX: 40,
  BIO_MAX: 300,
  CUSTOM_STATUS_MAX: 100,
  STATUS_EMOJI_MAX: 16,
  PRONOUNS_MAX: 30,
  CLAN_TAG_MAX: 8,
  AVATAR_URL_MAX: 12000,
  BANNER_COLOR_MAX: 40,
  BANNER_URL_MAX: 12000,
  SERVER_NAME_MAX: 60,
  SERVER_DESC_MAX: 300,
  CHANNEL_NAME_MAX: 50,
  CHANNEL_TOPIC_MAX: 200,
  MESSAGE_MAX: 2000,
  ATTACHMENT_MAX: 280000,
  EMOJI_NAME_MIN: 2,
  EMOJI_NAME_MAX: 24,
  EMOJI_DATA_MAX: 155000,
};

export interface UserConnection {
  platform: 'Spotify' | 'Steam' | 'GitHub' | 'Roblox' | 'YouTube' | 'Twitch';
  handle: string;
}

export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bannerColor: string;
  bannerUrl?: string;
  bio: string;
  pronouns?: string;
  status: UserStatus;
  statusEmoji?: string;
  customStatus: string;
  clanTag?: string;
  avatarDecoration?: AvatarDecorationId;
  profileEffect?: ProfileEffectId;
  nameplate?: NameplateId;
  activity?: UserActivity;
  badges?: string[];
  unlockedCosmetics?: string[];
  claimedQuests?: string[];
  orbsBalance?: number;
  connections?: UserConnection[];
  theme?: AppearanceTheme;
  showTypingIndicator?: boolean;
  mentionNotifs?: boolean;
  botAlerts?: boolean;
  compactMode?: boolean;
  noiseSuppression?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserBookmark {
  id: string;
  authorName: string;
  content: string;
  channelLabel: string;
  createdAt?: Timestamp;
}

export interface UserNotification {
  id: string;
  type: 'mention' | 'reply' | 'system';
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  channelLabel: string;
  preview: string;
  isRead: boolean;
  createdAt?: Timestamp;
}

export interface UserMembership {
  serverId: string;
  userId: string;
  serverName: string;
  serverIcon: string;
  serverColor: string;
  role: MemberRole;
  joinedAt?: Timestamp;
}

export interface ServerDoc {
  id: string;
  name: string;
  description: string;
  iconEmoji: string;
  iconColor: string;
  bannerColor?: string;
  boostCount?: number;
  ownerId: string;
  isPublic: boolean;
  inviteCode: string;
  memberCount: number;
  enabledBots?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InviteDoc {
  code: string;
  serverId: string;
  serverName: string;
  serverDescription: string;
  serverIcon: string;
  serverColor: string;
  creatorId: string;
  createdAt?: Timestamp;
}

export interface ServerMember {
  uid: string;
  serverId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  role: MemberRole;
  roleColor: string;
  avatarDecoration?: AvatarDecorationId;
  clanTag?: string;
  nameplate?: NameplateId;
  activityText?: string;
  inviteCode?: string;
  joinedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChannelDoc {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  category: string;
  topic: string;
  position: number;
  slowmodeSeconds?: number;
  nsfw?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ServerEmoji {
  id: string;
  serverId: string;
  name: string;
  imageUrl: string;
  creatorId: string;
  creatorName: string;
  createdAt?: Timestamp;
}

export interface ChatMessage {
  id: string;
  serverId?: string;
  channelId?: string;
  threadId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRoleColor?: string;
  content: string;
  attachmentUrl: string;
  attachmentName: string;
  replyToId: string;
  replyToAuthor: string;
  replyToContent: string;
  reactions: Record<string, string[]>;
  poll?: ChatPoll;
  pinned?: boolean;
  edited: boolean;
  isBot?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FriendRequestDoc {
  id: string;
  fromUid: string;
  fromName: string;
  fromUsername: string;
  fromAvatar: string;
  toUid: string;
  toName: string;
  toUsername: string;
  toAvatar: string;
  participants: string[];
  status: 'pending' | 'accepted';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DmThreadDoc {
  id: string;
  participants: string[];
  participantProfiles: Record<
    string,
    {
      displayName: string;
      username: string;
      avatarUrl: string;
    }
  >;
  isGroup?: boolean;
  isBotThread?: boolean;
  groupName?: string;
  lastMessage: string;
  lastMessageAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VoiceParticipant {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
}

export interface IncomingCall {
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  roomKey: string;
  video: boolean;
}
