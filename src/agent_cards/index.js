require('dotenv').config();

module.exports = {
  thai: require('./thai'),
  take_order: require('./take_order'),
  daji: require('./daji'),
  default: require('./default'),
  sweet_girl: require('./sweet_girl'),
  group_chat: require('./group_chat'),
  mcp_tencent_map: require('./mcp_tencent_map'),
};
