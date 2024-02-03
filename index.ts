import { Telegraf, Markup, Context } from 'telegraf';
import { getMessages, getMorningMessages, getNightMessages } from './helpers/messages.helper';
import schedule from 'node-schedule';


const bot = new Telegraf('6891725099:AAEQHVabrJh2ZxV_vKDBKnJLTJG8lWdBYFU');

const cuteMessages = getMessages();
const morningMessages = getMorningMessages();
const nightMessages = getNightMessages();

function sendCuteMessage(ctx: Context) {
  const message = cuteMessages[Math.floor(Math.random() * cuteMessages.length)];
  ctx.reply(message);
}

const userTimes = new Map<number, { morning: string, night: string }>();
// Добавляем карту состояний для отслеживания, ожидает ли пользователь установки времени утром или вечером.
const userStates = new Map<number, string>();

bot.start((ctx) => ctx.reply('Привет! Нажми на кнопку ниже, чтобы получить милую фразу.', Markup.inlineKeyboard([
  Markup.button.callback('Получить милую фразу', 'get_cute_message')
])));

bot.command('set_morning', (ctx) => {
  userStates.set(ctx.from.id, 'morning'); // Устанавливаем состояние пользователя на 'morning'
  ctx.reply('Введите время, когда вы планируете проснуться (в формате HH:mm)');
});

bot.command('set_night', (ctx) => {
  userStates.set(ctx.from.id, 'night'); // Устанавливаем состояние пользователя на 'night'
  ctx.reply('Введите время, когда вы планируете лечь спать (в формате HH:mm)');
});

bot.on('text', (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (state) {
    handleTimeInput(ctx, state);
    userStates.delete(ctx.from.id); // Удаляем состояние после обработки ввода времени
  }
});

function handleTimeInput(ctx: any, type: string) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (timeRegex.test(ctx.message?.text)) {
    const userId = ctx.from.id;
    if (!userTimes.has(userId)) {
      userTimes.set(userId, { morning: '', night: '' });
    }

    console.log(type + ': ' + ctx.message.text);

    ctx.reply(`${type === 'morning' ? 'Время подъёма' : 'Время слипа'} установлено на ${ctx.message.text}`);
    scheduleMessage(userId, ctx.message.text, type === 'morning' ? morningMessages[Math.floor(Math.random() * morningMessages.length)] 
      : nightMessages[Math.floor(Math.random() * nightMessages.length)] , type, ctx);
  } else {
    ctx.reply('Пожалуйста, введите время в правильном формате (HH:mm).');
  }
}

function scheduleMessage(userId: number, time: string, message: string, type: string, ctx: Context) {
  const [hour, minute] = time.split(':').map(Number);
  schedule.scheduleJob(`${minute} ${hour} * * *`, () => {
    ctx.telegram.sendMessage(userId, message);
    if (type === 'morning') {
      const nightTime = userTimes.get(userId)?.night;

      if (nightTime) {
        sendCuteMessagesUntilNight(userId, time, nightTime, ctx);
      }
    }
  });
}

function sendCuteMessagesUntilNight(userId: number, morningTime: string, nightTime: string, ctx: Context) {
  const [morningHour] = morningTime.split(':').map(Number);
  const [nightHour] = nightTime?.split(':').map(Number);
  let currentHour = morningHour + 1;
  while (currentHour < nightHour) {
    schedule.scheduleJob(`${currentHour} * * *`, () => {
      ctx.telegram.sendMessage(userId, cuteMessages[Math.floor(Math.random() * cuteMessages.length)]);
    });
    currentHour++;
  }
}

bot.command('reset_times', (ctx) => {
  userTimes.delete(ctx.from.id);
  ctx.reply('Время сброшено');
});

bot.command('get_milota', sendCuteMessage);
bot.action('get_cute_message', sendCuteMessage);
bot.launch();

console.log('Бот запущен. Чтобы остановить бота, нажмите Ctrl+C.');
