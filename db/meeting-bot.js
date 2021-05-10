'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const opts = {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
};

async function connect() {
  const conn = await mongoose
    .createConnection(`mongodb+srv://bot:${process.env.BD_PASSWORD}@${process.env.DBM}`, opts)
    .catch((err) => {
      console.error('Error occurred during an attempt to establish connection with the database');
      console.error(err);
    });
  conn.model('info', require('../models/info'), 'info');
  return conn;
}

async function disconnect() {
  await mongoose
    .disconnect()
    .catch((err) => {
      console.error('Error occurred while trying to stop the connection to the database');
      console.error(err);
    });
}

module.exports = {
  connect,
  disconnect
};
