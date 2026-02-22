const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema(
  {
    hostId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    thumbnailUrl: {
      type: String
    },
    thumbnailPublicId: {
      type: String
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled'
    },
    viewerCount: {
      type: Number,
      default: 0
    },
    startsAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveSession', liveSessionSchema);

