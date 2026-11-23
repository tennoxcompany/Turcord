import type { Timestamp } from 'firebase/firestore';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type ChannelType = 'text' | 'voice' | 'announcement';
export type AppearanceTheme = 'oniks' | 'koyu' | 'gece';
export type BotId = 'turcord_bot' | 'mod_bot' | 'music_bot';
export type AvatarDecorationId =
  | 'none'
  | 'cyber-ring'
  | 'emerald-flame'
  | 'crimson-pulse'
  | 'gold-halo'
  | 'aurora-orbit';

export const LIMITS = {
  USERNAME_MIN: 2,
  USERNAME_MAX: 32,
  DISPLAY_NAME_MAX: 40,
  BIO_MAX: 300,
  CUSTOM_STATUS_MAX: 100,
  CLAN_TAG_MAX: 8,
  SERVER_NAME_MAX: 60,
  SERVER_DESC_MAX: 300,
  CHANNEL_NAME_MAX: 50,
  CHANNEL_TOPIC_MAX: 200,
  MESSAGE_MAX: 2000,
  ATTACHMENT_MAX: 280000,
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
  bio: string;
  status: UserStatus;
  customStatus: string;
  clanTag?: string;
  avatarDecoration?: AvatarDecorationId;
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
