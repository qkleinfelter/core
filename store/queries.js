/* eslint-disable no-unused-vars */
const db = require('./db');
const { profileFields } = require('../store/profileFields');
const {
  Player, Guild,
} = require('../store/models');

function insertPlayer(uuid, player, cb) {
  Player.findOneAndUpdate({ uuid }, player, { upsert: true }, (err) => {
    if (err) {
      console.log(err);
    }
    return cb(err, player);
  });
}

function getPlayer(uuid, cb) {
  Player.findOne({ uuid }, (err, player) => {
    if (err) {
      console.log(err);
    }
    return cb(err, player);
  });
}

function getPlayerProfile(uuid, cb) {
  Player.findOne({ uuid }, profileFields, (err, player) => {
    if (err) {
      console.log(err);
    }
    return cb(err, player);
  });
}

function insertGuild(id, guild, cb) {
  Guild.findOneAndUpdate({ id }, guild, { upsert: true }, (err) => {
    if (err) {
      console.log(err);
    }
    return cb(err, guild);
  });
}

function getGuild(id, cb) {
  Guild.findOne({ id }, (err, guild) => {
    if (err) {
      console.log(err);
    }
    return cb(err, guild);
  });
}

function getGuildByPlayer(uuid, cb) {
  Guild.findOne({ members: { $elemMatch: { uuid } } }, (err, guild) => {
    if (err) {
      console.log(err);
    }
    return cb(err, guild);
  });
}

module.exports = {
  insertPlayer,
  getPlayer,
  getPlayerProfile,
  insertGuild,
  getGuild,
  getGuildByPlayer,
};
