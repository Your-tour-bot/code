'use strict';

const { Schema } = require('mongoose');

const { ObjectId } = Schema.Types;

const citySchema = new Schema({
  _id: ObjectId,
  name: String,
  country: String,
  timezone: String,
  meeting_places: [
    {
      name: String,
      address: String
    }]
});
module.exports = citySchema;
