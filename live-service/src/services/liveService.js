const LiveSession = require('../models/LiveSession');

const listSessions = () => {
  return LiveSession.find().sort({ createdAt: -1 }).limit(50);
};

const createSession = payload => {
  return LiveSession.create(payload);
};

module.exports = {
  listSessions,
  createSession
};

