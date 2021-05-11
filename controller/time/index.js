'use strict';

const show = async (req, send) => {
  const request = require('request');

  const loc = req.body.message.location;
  const sentMessage = req.body.message.text;

  if (sentMessage !== 'Cancel operation') {
    const lat = loc.latitude;
    const lng = loc.longitude;
    const options = `key=${process.env.WEATHER_API_KEY}&q=${lat},${lng}&aqi=no`;
    const link = `https://api.weatherapi.com/v1/forecast.json?${options}`;

    await request(link, (error, response, body) => {
      if (error) console.error('error:', error);
      try {
        const region = JSON.parse(body).location.name;
        const time = JSON.parse(body).location.localtime.split(' ')[1];
        send(`🕑 Текущее время в ${region} : ${time}`, 'none');
      } catch (err) {
        console.error(err);
        send('Ошибка доступа к данным.', 'none');
      }
    });
  } else {
    send('Операция отменена. Что бы узнать время, пожалуйста, разрешите отправку геолокации.', 'none');
  }
  return 'WAITING COMMAND';
};

module.exports = {
  show
};
