/**
 * Provides utility functions.
 * All functions should have external dependencies (DB, etc.) passed as parameters
 * */
const constants = require('hypixelconstants');
const request = require('request');
const urllib = require('url');
const uuidV4 = require('uuid/v4');
const moment = require('moment');
const config = require('../config');
const contributors = require('../CONTRIBUTORS');

function betterFormatting(i) {
  if (typeof i !== 'string') {
    return (i);
  }
  return (i.replace(/Â§/g, '§').replace(/§/g, '&'));
}

function removeDashes(i) {
  return (i.replace(/-/g, ''));
}

/*
* Get ratio of x from y. Returns 2 decimal places.
 */
function getRatio(x = 0, y = 0) {
  if (y === 0) {
    return (Number.POSITIVE_INFINITY);
  }
  return Number((x / y).toFixed(2));
}

/*
 * Gets the correct weekly statistic from the two oscillating
 * weekly fields.
 */
function getWeeklyStat(a, b) {
  const delta = new Date() - new Date(1417237200000);
  const numWeeks = Math.floor(delta / 604800000);

  return numWeeks % 2 === 0 ? a : b;
}

/*
 * Gets the correct monthly statistic from the two oscillating
 * monthly fields.
 */
function getMonthlyStat(a, b) {
  const start = new Date();
  const end = new Date(1417410000000);

  const diffYear = end.getFullYear() - start.getFullYear();
  const diffMonth = diffYear * 12 + end.getMonth() - start.getMonth();

  return diffMonth % 2 === 0 ? a : b;
}

/*
 * Pick certain keys from obj.
 *
 * Options:
 *    regexp: A regex object that the keys must pass.
 *        Defaults to .*
 *    filter: A function that is passed both the key
 *        and value, and returns a boolean. Defaults
 *        to (() => true).
 *    keyMap: A function that remaps all keys that
 *        pass the above two tests. Defaults to
 *        (key => key).
 *    valueMap: Same as keyMap, but for the values.
 */
function pickKeys(obj, options) {
  const regexp = options.regexp || /.+/;
  const filter = options.filter || (() => true);
  const keyMap = options.keyMap || (key => key);
  const valueMap = options.valueMap || (value => value);

  return Object.entries(obj)
    .filter(([key, value]) => regexp.test(key) && filter(key, value))
    .map(([key, value]) => [keyMap(key), valueMap(value)])
    .reduce((prev, [key, value]) => ({ ...prev, [key]: value }), {});
}

/**
 * Converts minigames ID to standard name e.g. 3 => Walls
 */
function IDToStandardName(name = '') {
  const result = constants.game_types.find(game => game.id === Number(name));
  return result === undefined ? null : result.standard_name;
}

/**
 * Converts minigames database name to standard name e.g. GingerBread => TKR
 */
function DBToStandardName(name = '') {
  const result = constants.game_types.find(game => game.database_name === name);
  return result === undefined ? null : result.standard_name;
}

/**
* Converts minigames type to standard name e.g. QUAKECRAFT => Quake
 */
function typeToStandardName(name) {
  const result = constants.game_types.find(game => game.type_name === name);
  return result === undefined ? null : result.standard_name;
}

/**
 * Determines if a player has contributed to the development of OpenDota
 */
function isContributor(uuid) {
  return uuid in contributors;
}

/**
 * Creates a job object for enqueueing that contains details such as the Hypixel endpoint to hit
 * See https://github.com/HypixelDev/PublicAPI/tree/master/Documentation/methods
 * */
function generateJob(type, payload) {
  const apiUrl = 'https://api.hypixel.net';
  const apiKey = config.HYPIXEL_API_KEY;
  const opts = {
    boosters() {
      return {
        url: `${apiUrl}/boosters?key=${apiKey}`,
      };
    },
    findguild() {
      return {
        url: `${apiUrl}/findguild?key=${apiKey}&byUuid=${payload.id}`,
      };
    },
    friends() {
      return {
        url: `${apiUrl}/friends?key=${apiKey}&uuid=${payload.id}`,
      };
    },
    guild() {
      return {
        url: `${apiUrl}/guild?key=${apiKey}&id=${payload.id}`,
      };
    },
    key() {
      return {
        url: `${apiUrl}/key?key=${apiKey}`,
      };
    },
    session() {
      return {
        url: `${apiUrl}/session?key=${apiKey}&uuid=${payload.id}`,
      };
    },
    player() {
      return {
        url: `${apiUrl}/player?key=${apiKey}&uuid=${payload.id}`,
      };
    },
    watchdogstats() {
      return {
        url: `${apiUrl}/watchdogstats?key=${apiKey}`,
      };
    },

  };
  return opts[type]();
}

/**
 * A wrapper around HTTPS requests that handles:
 *
 *
 * */
function getData(url, cb) {
  let u;
  if (typeof url === 'object' && url && url.url) {
    u = url.url;
  } else {
    u = url;
  }
  const parse = urllib.parse(u, true);
  const hypixelApi = parse.host === 'api.hypixel.net';
  const mojangApi = parse.host === 'api.mojang.com';
  const target = urllib.format(parse);
  return request({
    url: target,
    json: hypixelApi,
  }, (err, res, body) => {
    if (err
      || !res
      || res.statusCode !== 200
      || !body
    ) {
      console.error('[INVALID] status: %s', res ? res.statusCode : '');
      return cb('Request failed', null);
    } if (hypixelApi && !body.success) {
      console.error(`[Hypixel API Error]: ${body.cause}`);
      return cb(`${body.cause}`, null);
    } if (mojangApi && body.error) {
      console.error(`[Mojang API Error]: ${body.error} : ${body.errorMessage}`);
      return cb(`${body.error} : ${body.errorMessage}`, null);
    }
    return cb(null, body);
  });
}

/**
 * Returns the unix timestamp at the beginning of a block of n minutes
 * Offset controls the number of blocks to look ahead
 * */
function getStartOfBlockMinutes(size, offset = 0) {
  const blockS = size * 60;
  const curTime = Math.floor(new Date() / 1000);
  const blockStart = curTime - (curTime % blockS);
  return (blockStart + (offset * blockS)).toFixed(0);
}

function getEndOfMonth() {
  return moment().endOf('month').unix();
}

function redisCount(redis, prefix) {
  const key = `${prefix}:${moment().startOf('hour').format('X')}`;
  redis.pfadd(key, uuidV4());
  redis.expireat(key, moment().startOf('hour').add(1, 'day').format('X'));
}

function getRedisCountDay(redis, prefix, cb) {
  // Get counts for last 24 hour keys (including current partial hour)
  const keyArr = [];
  for (let i = 0; i < 24; i += 1) {
    keyArr.push(`${prefix}:${moment().startOf('hour').subtract(i, 'hour').format('X')}`);
  }
  redis.pfcount(...keyArr, cb);
}

function getRedisCountHour(redis, prefix, cb) {
  // Get counts for previous full hour
  const keyArr = [];
  for (let i = 1; i < 2; i += 1) {
    keyArr.push(`${prefix}:${moment().startOf('hour').subtract(i, 'hour').format('X')}`);
  }
  redis.pfcount(...keyArr, cb);
}

function colorNameToCode(color) {
  if (color === null) {
    return (null);
  }
  switch (color.toLowerCase()) {
    case 'gray':
      return ('&7');
    case 'red':
      return ('&c');
    case 'green':
      return ('&a');
    case 'gold':
      return ('&6');
    case 'light_purple':
      return ('&d');
    case 'yellow':
      return ('&e');
    case 'white':
      return ('&f');
    case 'blue':
      return ('&9');
    case 'dark_green':
      return ('&2');
    case 'dark_red':
      return ('&4');
    case 'dark_aqua':
      return ('&3');
    case 'dark_purple':
      return ('&5');
    case 'dark_gray':
      return ('&8');
    case 'black':
      return ('&0');
    default:
      return (null);
  }
}

function generateFormattedRank(rank, plusColor, prefix) {
  if (prefix) {
    return prefix;
  }
  switch (rank) {
    case 'VIP':
      return '&a[VIP]';
    case 'VIP_PLUS':
      return '&a[VIP&6+&a]';
    case 'MVP':
      return '&b[MVP]';
    case 'MVP_PLUS':
      return `&b[MVP${plusColor}+&b]`;
    case 'MVP_PLUS_PLUS':
      return `&6[MVP${plusColor}++&6]`;
    case 'HELPER':
      return '&9[HELPER]';
    case 'MODERATOR':
      return '&2[MOD]';
    case 'ADMIN':
      return '&c[ADMIN]';
    case 'YOUTUBER':
      return '&c[&fYOUTUBER&c]';
    default:
      return '&7';
  }
}

module.exports = {
  betterFormatting,
  IDToStandardName,
  DBToStandardName,
  typeToStandardName,
  isContributor,
  generateJob,
  getData,
  getStartOfBlockMinutes,
  getEndOfMonth,
  redisCount,
  getRedisCountDay,
  getRedisCountHour,
  removeDashes,
  getRatio,
  colorNameToCode,
  generateFormattedRank,
  getWeeklyStat,
  getMonthlyStat,
  pickKeys,
};
