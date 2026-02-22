const liveService = require('../services/liveService');

const list = async (req, res, next) => {
  try {
    const sessions = await liveService.listSessions();
    res.json(sessions);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const session = await liveService.createSession(req.body);
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const liveEvents = require('../websocket/events');
    const stats = liveEvents.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  create,
  getStats
};

