'use strict';

const request = require('request');
const { formatDate, withoutTime } = require('./utils/date_service');
const findTour = require('./utils/find_tour_service');
const cron = require('./utils/create_job_service');
const regular = require('../../regular');
const Info = require('../../repositories/meeting-bot/info');
const Tourist = require('../../repositories/your-tour-bot/tourist');
const Tour = require('../../repositories/your-tour-bot/tour');
const City = require('../../repositories/your-tour-bot/city');

const end = {};
const show = async (message, send, users, sendLocation) => {
  const currentTour = await getTour(message, users);
  if (currentTour) {
    const note = await Info.getOne({ tour_id: currentTour._id });
    if (note && note.date >= withoutTime(new Date())) {
      const place = note.place_address;
      send(output(note), 'none');
      await sendMeetingPlace(place, send, sendLocation);
    } else {
      send('Извините, администратор ещё не добавил информацию о встрече группы. Пожалуйста, обратитесь к нему лично.', 'none');
      return 'WAITING COMMAND';
    }
  } else {
    send('Ваш тур ещё не начался.', 'none');
    return 'WAITING COMMAND';
  }
  return 'WAITING GEO';
};

const sendMeetingPlace = async (place, send, sendLocation) => {
  const options = `q=${encodeURIComponent(place)}&key=${process.env.GEO_API_KEY}`;
  const link = `https://api.opencagedata.com/geocode/v1/json?${options}`;
  await request(link, (error, response, body) => {
    if (error) console.error('error:', error);
    try {
      end.lat = JSON.parse(body).results[0].geometry.lat;
      end.lng = JSON.parse(body).results[0].geometry.lng;
      sendLocation(end.lat, end.lng);
      send('Что бы узнать маршрут к месту встречи отправьте боту свою локацию.', 'geo');
    } catch (err) {
      console.error(err);
      send('Ошибка доступа к данным.', 'none');
    }
  });
};

const getTour = async (message, users) => {
  const chatId = message.chat.id;
  const tourist = await Tourist.getOne({ full_name: users[chatId].name });
  return await findTour(tourist);
};

const output = (obj) => `❗️ Информация про встречу:\n
📅 Дата: ${formatDate(obj.date)} \r
🕑 Время: ${obj.time} \r
🏛 Место: ${obj.place_name} \r
🗺 Точный адрес: ${obj.place_address}`;

const showDirection = (message, send) => {
  const sentMessage = message.text;

  if (sentMessage !== 'Cancel operation') {
    const start = message.location;
    const options = `${start.latitude},${start.longitude}/${end.lat},${end.lng}`;
    const link = `https://www.google.com.ua/maps/dir/${options}?hl=ru`;
    send(`📍 Маршрут к месту встречи: \n${link}`, 'none');
  } else {
    send('Операция отменена.', 'none');
  }
  return 'WAITING COMMAND';
};

const setTime = async (message, tour, send, users) => {
  const chatId = message.chat.id;
  const sentMessage = message.text;

  if (timeValidation(sentMessage)) {
    const meetDate = new Date(tour.date.valueOf());
    const meetingDate = new Date(meetDate.setUTCDate(meetDate.getUTCDate() + (tour.day - 1)));

    const note = await Info.getOne({ tour_id: tour.id });
    if (!note) {
      Info.create(
        {
          tour_id: tour.id,
          date: meetingDate,
          time: sentMessage.replace(/\.|-/g, ':')
        }
      );
    } else {
      Info.updateOne({ _id: note._id },
        {
          date: meetingDate,
          time: sentMessage.replace(/\.|-/g, ':')
        });
    }

    const meetingTime = sentMessage.replace(/\.|-/g, ':');
    await settingCron(tour, send, meetingDate, meetingTime, users);

    send(chatId, 'Время успешно задано.', 'admin');
    return 'WAITING COMMAND';
  }
  send(chatId, 'Время введено в некорректном формате. Пожалуйста, введите снова.', 'none');
  return 'WAITING TIME AGAIN';
};

const settingCron = async (tour, send, meetingDate, meetingTime, users) => {
  const trip = await Tour.getOne({ _id: tour.id });
  let currentCityId;
  trip.cities.forEach((city) => {
    if (city.day.includes(tour.day)) currentCityId = city.city_id;
  });
  const currentCity = await City.getOne({ _id: currentCityId });
  const gmt = +currentCity.timezone.slice(3);

  await cron.createJob(15, send, meetingDate, meetingTime, gmt, tour, users);
  await cron.createJob(30, send, meetingDate, meetingTime, gmt, tour, users);
  await cron.createJob(60, send, meetingDate, meetingTime, gmt, tour, users);
};

const timeValidation = (day) => !!day.match(regular.validTime);

const setPlace = async (message, tour, send) => {
  const chatId = message.chat.id;
  const sentMessage = message.text;

  const trip = await Tour.getOne({ _id: tour.id });

  const flag = await cityHandller(trip, tour, sentMessage);
  if (flag) {
    send(chatId, 'Место успешно задано.', 'admin');
    return 'WAITING COMMAND';
  }

  send(chatId, 'Место встречи некорректное. Пожалуйста, попробуйте снова.', 'place', tour);
  return 'WAITING TIME AGAIN';
};

const cityHandller = async (trip, tour, sentMessage) => {
  const cities = await City.getAll();
  let currentPlace;
  let cityExist = false;

  cities.forEach((city) => {
    for (const town of trip.cities) {
      if (JSON.stringify(city._id) === JSON.stringify(town.city_id) && town.day.includes(tour.day)) {
        cityExist = true;
        currentPlace = city.meeting_places.find((place) => place.name === sentMessage);
      }
    }
  });
  if (cityExist) {
    await writeNote(tour, sentMessage, currentPlace.address);
  }
  return cityExist;
};

const writeNote = async (tour, sentMessage, address) => {
  const note = await Info.getOne({ tour_id: tour.id });
  if (!note) {
    Info.create(
      {
        tour_id: tour.id,
        place_name: sentMessage,
        place_address: address
      }
    );
  } else {
    Info.updateOne({ _id: note._id },
      {
        place_name: sentMessage,
        place_address: address
      });
  }
};

module.exports = {
  show,
  setPlace,
  setTime,
  showDirection
};
