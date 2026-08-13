import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
const ADMIN_ID = process.env.ADMIN_ID;
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'https://virayar.github.io';


/* ==============================
   CORS
================================ 

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'X-Max-Init-Data'
    ]
  })
);
*/
app.use(cors());

/* ==============================
   JSON
================================ */

app.use(
  express.json({
    limit: '100kb'
  })
);


/* ==============================
   STATIC
   Можно оставить для локальной проверки
================================ */

app.use(
  express.static(
    path.join(__dirname, '../public')
  )
);


/* ==============================
   ПРОВЕРКА MAX INIT DATA
================================ */

/*function validateInitData(data, token) {

  if (!data || !token) {
    return false;
  }

  const pairs = data
    .split('&')
    .map(part => {

      const index =
        part.indexOf('=');

      return [
        part.slice(0, index),
        part.slice(index + 1)
      ];

    });


  const hashPairs =
    pairs.filter(
      ([key]) => key === 'hash'
    );


  if (hashPairs.length !== 1) {
    return false;
  }


  const originalHash =
    decodeURIComponent(
      hashPairs[0][1]
    );


  const dataCheckString =
    pairs
      .filter(
        ([key]) => key !== 'hash'
      )

      .map(
        ([key, value]) => [
          key,
          decodeURIComponent(value)
        ]
      )

      .sort(
        (a, b) =>
          a[0].localeCompare(b[0])
      )

      .map(
        ([key, value]) =>
          `${key}=${value}`
      )

      .join('\n');


  const secretKey =
    crypto
      .createHmac(
        'sha256',
        'WebAppData'
      )
      .update(token)
      .digest();


  const calculatedHash =
    crypto
      .createHmac(
        'sha256',
        secretKey
      )
      .update(dataCheckString)
      .digest('hex');


  try {

    return crypto.timingSafeEqual(
      Buffer.from(
        originalHash,
        'hex'
      ),
      Buffer.from(
        calculatedHash,
        'hex'
      )
    );

  } catch {

    return false;

  }
}
*/
function validateInitData(appData, botToken) {
  if (!appData || !botToken) {
    return false;
  }

  const params = appData
    .split('&')
    .map(part => {
      const index = part.indexOf('=');
      
      console.log('HASH RECEIVED:', originalHash[1]);
      console.log('HASH CALCULATED:', calculatedHash);
      
      return [
        part.slice(0, index),
        part.slice(index + 1)
      ];
    });

  if (
    params.filter(x => x[0] === 'hash').length !== 1
  ) {
    return false;
  }

  const originalHash =
    params.find(x => x[0] === 'hash');

  if (!originalHash || !originalHash[1]) {
    return false;
  }

  // MAX требует URL-декодировать значения
  for (const param of params) {
    param[1] = decodeURIComponent(param[1]);
  }

  // Сортируем параметры по имени
  params.sort(
    (a, b) => a[0].localeCompare(b[0])
  );

  // Формируем строку для подписи
  const launchParams = params
    .filter(x => x[0] !== 'hash')
    .map(x => `${x[0]}=${x[1]}`)
    .join('\n');

  // secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // hash = HMAC-SHA256(secret_key, launchParams)
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(launchParams)
    .digest('hex');

  return calculatedHash === originalHash[1];
}
/* ==============================
   ПОЛУЧЕНИЕ USER ИЗ INIT DATA
================================ */

function parseUser(data) {

  try {

    const params =
      new URLSearchParams(data);

    const userString =
      params.get('user');

    if (!userString) {
      return {};
    }

    return JSON.parse(
      decodeURIComponent(
        userString
      )
    );

  } catch {

    return {};

  }
}


/* ==============================
   ПРОСТОЙ HEALTH CHECK
================================ */

app.get('/health', (req, res) => {

  res.json({
    ok: true,
    service: 'MAX Shop Backend'
  });

});


/* ==============================
   СОЗДАНИЕ ЗАКАЗА
================================ */

app.post(
  '/api/orders',
  async (req, res) => {

    try {

      if (!BOT_TOKEN) {

        return res
          .status(500)
          .json({
            error:
              'BOT_TOKEN не настроен на сервере'
          });

      }


      if (!ADMIN_ID) {

        return res
          .status(500)
          .json({
            error:
              'ADMIN_ID не настроен на сервере'
          });

      }


      const initData =
        req.get(
          'X-Max-Init-Data'
        ) || '';
      
        console.log('BOT TOKEN EXISTS:', Boolean(BOT_TOKEN));
        console.log('BOT TOKEN LENGTH:', BOT_TOKEN?.length);
        console.log('INIT DATA HAS HASH:', initData.includes('hash='));
      /*
        Если заказ должен приниматься
        ТОЛЬКО из MAX — оставляем эту проверку.
      */

      if (
        !validateInitData( initData, BOT_TOKEN)
      ) {

        return res
          .status(401)
          .json({
            error:
              'Не удалось подтвердить запуск из MAX'
          });

      }


      const {
        name,
        contact,
        comment,
        items
      } = req.body || {};


      if (
        !Array.isArray(items) ||
        !items.length
      ) {

        return res
          .status(400)
          .json({
            error:
              'Корзина пуста'
          });

      }


      const total =
        items.reduce(
          (sum, item) => {

            return (
              sum +
              Number(item.price) *
              Number(item.quantity)
            );

          },
          0
        );


      const user =
        parseUser(initData);


      const lines =
        items
          .map(item => {

            const itemTotal =
              Number(item.price) *
              Number(item.quantity);

            return (
              `• ${item.name}` +
              ` × ${item.quantity}` +
              ` — ${itemTotal} ₽`
            );

          })
          .join('\n');


      const text =
`🛍 Новый заказ

${lines}

Итого: ${total} ₽

Имя: ${name || '—'}
Контакт: ${contact || user.username || '—'}
MAX user id: ${user.id || user.user_id || '—'}
Комментарий: ${comment || '—'}`;


      /* ==============================
         ОТПРАВКА АДМИНУ В MAX
      ================================ */

      const apiUrl =
        'https://platform-api2.max.ru/messages' +
        '?user_id=' +
        encodeURIComponent(
          ADMIN_ID
        );


      const maxResponse =
        await fetch(
          apiUrl,
          {
            method: 'POST',

            headers: {
              Authorization:
                BOT_TOKEN,

              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                text
              })
          }
        );


      const maxBody =
        await maxResponse.text();


      if (!maxResponse.ok) {

        console.error(
          'MAX API error:',
          maxResponse.status,
          maxBody
        );

        return res
          .status(502)
          .json({
            error:
              'MAX API не принял уведомление'
          });

      }


      console.log(
        'Новый заказ отправлен админу:',
        ADMIN_ID
      );


      return res.json({
        ok: true
      });


    } catch (error) {

      console.error(
        'Order error:',
        error
      );


      return res
        .status(500)
        .json({
          error:
            'Ошибка сервера при отправке заказа'
        });

    }

  }
);


/* ==============================
   ЗАПУСК
================================ */

app.listen(
  PORT,
  () => {

    console.log(
      `MAX shop backend запущен на порту ${PORT}`
    );

  }
);
