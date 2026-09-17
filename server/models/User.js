const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['free', 'budget', 'moyen', 'pro', 'plus', 'proplus', 'entreprise', 'premium', 'kryn', 'oblivion', 'slyre', 'flexion', 'kazake'],
    default: 'free'
  },
  searchUsage: {
    dailyUsed: {
      type: Number,
      default: 0
    },
    dailyResetAt: {
      type: Date,
      default: () => new Date()
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  bio: {
    type: String,
    maxlength: 500
  },
  location: String,
  website: String,
  phone: String,
  company: String,
  jobTitle: String,
  timezone: {
    type: String,
    default: 'Europe/Paris'
  },
  language: {
    type: String,
    default: 'fr'
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
    showEmail: { type: Boolean, default: false },
    showLocation: { type: Boolean, default: true }
  },
  publicProfile: {
    displayName: String,
    username: String,
    bio: {
      type: String,
      maxlength: 500
    },
    avatar: {
      type: String,
      default: '/pdp.png'
    },
    website: String,
    location: String,
    backgroundUrl: String,
    backgroundType: {
      type: String,
      enum: ['image', 'video', 'gradient'],
      default: 'image'
    },
    backgroundPreset: {
      type: String,
      default: 'cool-blue'
    },
    profileAnimation: {
      type: String,
      enum: ['none', 'glow', 'pulse', 'float'],
      default: 'none'
    },
    profileTheme: {
      type: String,
      enum: ['dark', 'light', 'glass', 'invisible', 'custom'],
      default: 'dark'
    },
    cardStyle: {
      bgColor: { type: String, default: '#050505' },
      bgOpacity: { type: Number, default: 95 },
      blur: { type: Number, default: 0 },
      borderColor: { type: String, default: '#ffffff' },
      borderOpacity: { type: Number, default: 12 },
      textColor: { type: String, default: '#ffffff' },
      radius: { type: Number, default: 16 },
      overlay: { type: Number, default: 40 },
      shadow: { type: String, default: 'soft' }
    },
    socialLinks: [{ label: String, url: String }],
    links: [{ title: String, url: String }],
    videos: [{ title: String, url: String }],
    images: [{ title: String, url: String }],
    showEmail: Boolean,
    showLocation: Boolean,
    badges: [{
      id: String,
      label: String,
      image: String,
      awardedAt: { type: Date, default: Date.now }
    }],
    bugReports: [{
      title: String,
      url: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      createdAt: { type: Date, default: Date.now }
    }],
    discordId: String,
    discordBadgeVerified: { type: Boolean, default: false },
    verifiedBadge: { type: Boolean, default: false },
    spotify: {
      isConnected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      displayName: String,
      spotifyId: String,
      profileUrl: String,
      avatar: String,
      email: String,
      showProfile: { type: Boolean, default: true },
      lastTokenRefresh: Date
    }
  },
  integrations: {
    spotify: {
      isConnected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      expiresIn: Number,
      expiresAt: Date,
      displayName: String,
      spotifyId: String,
      profileUrl: String,
      avatar: String,
      email: String,
      showCurrentTrack: { type: Boolean, default: true }
    }
  },
  emailVerificationCode: {
    type: String
  },
  emailVerificationExpiresAt: {
    type: Date
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0
  },
  badgeVerificationCode: String,
  badgeVerificationExpiresAt: Date,
  security: {
    ipAddresses: [{ type: String, trim: true }],
    lastLoginIp: { type: String, trim: true },
    lastLoginAt: Date,
    accountBan: {
      isBanned: { type: Boolean, default: false },
      reason: String,
      bannedAt: Date
    },
    emailVerified: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);