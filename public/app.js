const state = {
  products: [],
  cart: new Map()
};
const $ = s => document.querySelector(s);
const wa = window.WebApp;
if (wa?.initDataUnsafe?.user?.first_name) {
  $('#hello').textContent =
    `${wa.initDataUnsafe.user.first_name}, добро пожаловать в наш каталог`;
}
async function load() {
  state.products = await fetch('./products.json', {
    cache: 'no-store'
  }).then(r => {
    if (!r.ok) throw new Error(`Ошибка загрузки каталога: ${r.status}`);
    return r.json();
  });
  [...new Set(state.products.map(x => x.category))].forEach(c =>
    $('#category').insertAdjacentHTML(
      'beforeend',
      `<option>${c}</option>`
    )
  );
  render();
}
function money(n) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}
/* ==============================
   КАТАЛОГ
================================ */
function render() {
  const search = $('#search').value.toLowerCase();
  const category = $('#category').value;
  const products = state.products.filter(
    p =>
      (!category || p.category === category) &&
      p.name.toLowerCase().includes(search)
  );
  $('#products').innerHTML =
    products.map(p => {
      const quantity = state.cart.get(String(p.id)) || 0;
      const cartControl = quantity === 0
        ? `
          <button
            class="add"
            data-add-id="${p.id}"
          >
            + В корзину
          </button>
        `
        : `
          <div class="product-qty">
            <span class="product-qty-number">${quantity}</span>
            <button
              type="button"
              data-product-act="plus"
              data-id="${p.id}"
              aria-label="Добавить ещё"
            >
              +
            </button>
            <button
              type="button"
              data-product-act="minus"
              data-id="${p.id}"
              aria-label="Убавить"
            >
              −
            </button>
          </div>
        `;
      const images = Array.isArray(p.images) && p.images.length
  ? p.images
  : p.image
    ? [p.image]
    : [];

const gallery = images.length
  ? `
    <div class="product-gallery" data-gallery>
      <div class="product-gallery-track">
        ${images.map((image, index) => `
          <img
            src="${image}"
            alt="${p.name}"
            class="product-gallery-image ${index === 0 ? 'active' : ''}"
            data-gallery-image
          >
        `).join('')}
      </div>

      ${images.length > 1 ? `
        <button
          type="button"
          class="gallery-arrow gallery-prev"
          data-gallery-prev
          aria-label="Предыдущее фото"
        >
          ‹
        </button>

        <button
          type="button"
          class="gallery-arrow gallery-next"
          data-gallery-next
          aria-label="Следующее фото"
        >
          ›
        </button>

        <div class="gallery-dots">
          ${images.map((_, index) => `
            <button
              type="button"
              class="gallery-dot ${index === 0 ? 'active' : ''}"
              data-gallery-dot="${index}"
              aria-label="Фото ${index + 1}"
            ></button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `
  : '';

return `
  <article class="product">
    ${gallery}
          <div class="pad">
            <div class="tag">
              ${p.category}
            </div>
           <h3>
              ${p.name}
           </h3>

          ${p.availability ? `
            <div class="availability">
              ${p.availability}
            </div>
              ` : ''}

          <p class="desc">
              ${p.description}
          </p>
            <div class="row">
              <span class="price">
                ${money(p.price)}
              </span>
              <div data-product-control="${p.id}">
                ${cartControl}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('') || '<p>Ничего не найдено</p>';
  /* Кнопка "+ В корзину" */
  bindProductControls();

  /* Галереи фотографий */
  bindProductGalleries();
}

function bindProductGalleries(root = document) {
  root.querySelectorAll('[data-gallery]').forEach(gallery => {
    const images = [...gallery.querySelectorAll('[data-gallery-image]')];
    const dots = [...gallery.querySelectorAll('[data-gallery-dot]')];
    const prev = gallery.querySelector('[data-gallery-prev]');
    const next = gallery.querySelector('[data-gallery-next]');

    if (images.length <= 1) return;

    let current = 0;

    function showImage(index) {
      current = (index + images.length) % images.length;

      images.forEach((image, i) => {
        image.classList.toggle('active', i === current);
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
      });
    }

    prev?.addEventListener('click', () => {
      showImage(current - 1);
    });

    next?.addEventListener('click', () => {
      showImage(current + 1);
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        showImage(Number(dot.dataset.galleryDot));
      });
    });
  });
}


function bindProductControls(root = document) {
  root.querySelectorAll('[data-add-id]').forEach(button => {
    button.addEventListener('click', () => {
      changeQty(button.dataset.addId, 1);
    });
  });

  root.querySelectorAll('[data-product-act]').forEach(button => {
    button.addEventListener('click', () => {
      const delta = button.dataset.productAct === 'plus'
          ? 1
          : -1;

      changeQty(button.dataset.id, delta);
    });
  });
}
/* ==============================
   ИЗМЕНЕНИЕ КОЛИЧЕСТВА
================================ */
function changeQty(id, delta) {
  id = String(id);
  const currentQuantity = state.cart.get(id) || 0;
  const newQuantity = currentQuantity + delta;
  
  if (newQuantity > 0) {
    state.cart.set(id,  newQuantity);
  } else {
    state.cart.delete(id);
  }
  /*
   Перерисовываем ОБА места.
   Поэтому количество всегда одинаковое
   в каталоге и в корзине.
  */
  updateCart();
  updateProductControl(id);
  
  try {
    wa?.HapticFeedback
      ?.impactOccurred
      ?.('light');
  } catch {}
}

function updateProductControl(id) {
  const quantity = state.cart.get(String(id)) || 0;
  const oldControl = document.querySelector( `[data-product-control="${id}"]` );

  if (!oldControl) return;

  if (quantity === 0) {
    oldControl.innerHTML = `
      <button
        class="add"
        data-add-id="${id}"
      >
        + В корзину
      </button>
    `;
  } else {
    oldControl.innerHTML = `
      <div class="product-qty">
        <span class="product-qty-number">${quantity}</span>

        <button
          type="button"
          data-product-act="plus"
          data-id="${id}"
          aria-label="Добавить ещё"
        >
          +
        </button>

        <button
          type="button"
          data-product-act="minus"
          data-id="${id}"
          aria-label="Убавить"
        >
          −
        </button>
      </div>
    `;
  }
  bindProductControls(oldControl);
}
/* ==============================
   КОРЗИНА
================================ */
function updateCart() {
  let sum = 0;
  let count = 0;
  $('#cartItems').innerHTML =
    [...state.cart]
      .map(([id, quantity]) => {
        const product =
          state.products.find(
            x => String(x.id) === String(id)
          );
        if (!product) {
          return '';
        }
        sum +=
          product.price * quantity;
        count += quantity;
        return `
          <div class="cartline">
            <div>
              <strong>
                ${product.name}
              </strong>
              <div>
                ${money(product.price)}
              </div>
            </div>
            <div class="qty">
              <button
                type="button"
                data-cart-act="minus"
                data-id="${id}"
              >
                −
              </button>
              <span>
                ${quantity}
              </span>
              <button
                type="button"
                data-cart-act="plus"
                data-id="${id}"
              >
                +
              </button>
            </div>
          </div>
        `;
      })
      .join('')
      ||
      '<p class="muted">Корзина пока пуста</p>';
  $('#total').textContent =
    money(sum);
  $('#cartCount').textContent =
    count;
  /* + и − внутри корзины */
  document.querySelectorAll('[data-cart-act]').forEach(button => {
    button.addEventListener('click', () => {
      const delta =
        button.dataset.cartAct === 'plus'
          ? 1
          : -1;
      changeQty(
        button.dataset.id,
        delta
      );
    });
  });
}
/* ==============================
   ДАННЫЕ ЗАКАЗА
================================ */
function cartPayload() {
  return [...state.cart]
    .map(([id, quantity]) => {
      const product =
        state.products.find(
          x => String(x.id) === String(id)
        );
      return {
        id,
        name: product.name,
        price: product.price,
        quantity
      };
    });
}
/* ==============================
   ПОИСК И КАТЕГОРИИ
================================ */
$('#search')
  .addEventListener(
    'input',
    render
  );
$('#category')
  .addEventListener(
    'change',
    render
  );
/* ==============================
   ОТКРЫТИЕ КОРЗИНЫ
================================ */
$('#cartBtn').onclick = () => {
  $('#drawer')
    .classList
    .add('open');
  $('#overlay')
    .classList
    .add('open');
};
function close() {
  $('#drawer')
    .classList
    .remove('open');
  $('#overlay')
    .classList
    .remove('open');
}
$('#closeCart').onclick =
  close;
$('#overlay').onclick =
  close;
/* ==============================
   ОФОРМЛЕНИЕ ЗАКАЗА
================================ */
$('#checkoutBtn').onclick = () => {
  if (!state.cart.size) {
    return;
  }
  close();
  $('#name').value =
    wa?.initDataUnsafe
      ?.user
      ?.first_name || '';
  $('#checkout').showModal();
};
$('#closeCheckout').onclick =
  () => $('#checkout').close();
$('#sendOrder').onclick =
  async () => {
    const status =
      $('#status');
    status.textContent =
      'Отправляем…';
    try {
      const response =
        await fetch(
          'https://virayar-github-io.onrender.com/api/orders',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              'X-Max-Init-Data':
                wa?.initData || ''
            },
            body:
              JSON.stringify({
                name:
                  $('#name')
                    .value
                    .trim(),
                contact:
                  $('#contact')
                    .value
                    .trim(),
                comment:
                  $('#comment')
                    .value
                    .trim(),
                items:
                  cartPayload()
              })
          }
        );
      const data =
        await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || 'Ошибка'
        );
      }
      status.textContent =
        'Заказ отправлен.\nМы напишем вам в MAX.';
      status.className =
        'status success';
      state.cart.clear();
      updateCart();
      /*
       Важно:
       после успешного заказа
       возвращаем карточки к
       "+ В корзину"
      */
      render();
    } catch (error) {
      status.textContent =
        'Не удалось отправить заказ: ' +
        error.message;
      status.className =
        'status';
    }
  };
load();
