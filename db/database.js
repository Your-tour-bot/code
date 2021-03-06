'use strict';

const mongoose = require('mongoose');

module.exports = function connectionPool(host, db) {
  const opts = {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    poolSize: 5
  };
  return mongoose.createConnection(`${host}/${db}`, opts);
};
