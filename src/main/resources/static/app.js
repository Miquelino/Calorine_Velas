const storageKeys = {
  cart: "calorine-cart",
  user: "calorine-user",
  adminUser: "calorine-admin-user",
  shipping: "calorine-shipping",
  coupon: "calorine-coupon",
  favorites: "calorine-favorites",
  pendingOrder: "calorine-pending-order",
};

const apiBase = location.protocol === "file:" || location.port !== "8080" ? "http://localhost:8080" : "";
const isAdminPortal = location.pathname === "/admin" || location.pathname === "/admin/" || location.hash === "#admin";
const activeUserStorageKey = isAdminPortal ? storageKeys.adminUser : storageKeys.user;
const storeWhatsAppNumber = "5516999999999";

const seedProducts = [
  { id: "brisa-de-lavanda", name: "Brisa de Lavanda", scent: "Lavanda e alecrim", size: "120g", occasion: "classica", mood: "relaxante", price: 54.9, stock: 18, minimumStock: 5, color: "sage", active: true, description: "Vela calmante em pote de vidro, ideal para banho relaxante ou leitura no fim do dia." },
  { id: "doce-baunilha", name: "Doce Baunilha", scent: "Baunilha e tonka", size: "120g", occasion: "classica", mood: "aconchegante", price: 49.9, stock: 24, minimumStock: 5, color: "honey", active: true, description: "Aroma acolhedor e cremoso, feito para deixar a casa com cheiro de sobremesa elegante." },
  { id: "figo-rosado", name: "Figo Rosado", scent: "Figo, rosas e madeira", size: "250g", occasion: "presente", mood: "aconchegante", price: 64.9, stock: 10, minimumStock: 5, color: "rose", active: true, description: "Uma vela marcante para presente, com perfume floral frutado e acabamento artesanal." },
  { id: "mar-de-linho", name: "Mar de Linho", scent: "Algodao, sal e cedro", size: "250g", occasion: "classica", mood: "relaxante", price: 59.9, stock: 14, minimumStock: 5, color: "ocean", active: true, description: "Fresca e limpa, perfeita para sala, lavabo e ambientes que pedem leveza." },
];

let products = seedProducts;
let cart = readStorage(storageKeys.cart, []);
let user = readStorage(activeUserStorageKey, null);
if (!isAdminPortal && user?.role === "ADMIN") {
  localStorage.removeItem(storageKeys.user);
  user = null;
}
if (isAdminPortal && user?.role !== "ADMIN") {
  localStorage.removeItem(storageKeys.adminUser);
  user = null;
}
let shippingQuote = readStorage(storageKeys.shipping, { cep: "", cost: null, days: null, service: "economico" });
let coupon = readStorage(storageKeys.coupon, { code: "", discount: 0, freeShipping: false });
if (coupon?.discount && !coupon.discountTotal) {
  coupon = { code: "", discountTotal: 0, shippingDiscount: 0, freeShipping: false, message: "" };
  localStorage.removeItem(storageKeys.coupon);
}
let currentProductId = null;
let accountOrderHistory = [];
let adminOrderHistory = [];
let adminOrdersLoadError = "";
let adminCoupons = [];
let selectedAdminOrderId = null;
let lastOrderSnapshot = readStorage(storageKeys.pendingOrder, null);
let favoriteIds = readStorage(storageKeys.favorites, []);
let reviews = [];
let eligibleReviews = [];
let highlightedReviewId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
document.body.classList.toggle("admin-portal", isAdminPortal);

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeProductId(value) {
  return String(value);
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value || "");
  return element.innerHTML;
}

function isFavorite(id) {
  return favoriteIds.map(normalizeProductId).includes(normalizeProductId(id));
}

function toggleFavorite(id) {
  const normalized = normalizeProductId(id);
  favoriteIds = isFavorite(normalized)
    ? favoriteIds.filter((item) => normalizeProductId(item) !== normalized)
    : [...favoriteIds, id];
  writeStorage(storageKeys.favorites, favoriteIds);
  renderProducts();
  renderFavorites();
  if (currentProductId) updateDetailFavorite();
}

function isAdmin() {
  return user?.role === "ADMIN" && user?.authHeader;
}

function isAuthenticated() {
  return Boolean(user?.id && user?.authHeader);
}

function authHeader() {
  return user?.authHeader ? { Authorization: user.authHeader } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.authenticated ? authHeader() : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let message = "Nao foi possivel concluir a operacao.";
    try {
      message = (await response.json()).message || message;
    } catch {
      message = await response.text() || message;
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function requestLogin(returnRoute, message = "Entre na sua conta para continuar.") {
  if (returnRoute) sessionStorage.setItem("calorine-after-login", returnRoute);
  sessionStorage.setItem("calorine-login-message", message);
  location.hash = "login";
}

function requestCustomerLogin() {
  user = null;
  localStorage.removeItem(activeUserStorageKey);
  accountOrderHistory = [];
  adminOrderHistory = [];
  renderUser();
  requestLogin("checkout", "Entre com uma conta de cliente para finalizar o pedido.");
}

async function loadProducts({ silent = false } = {}) {
  try {
    products = await apiRequest(isAdmin() ? "/api/candles/admin" : "/api/candles", { authenticated: isAdmin() });
  } catch (error) {
    if (!silent) $("#productGrid").innerHTML = '<p class="empty-state">Nao consegui conectar com o banco agora. Exibindo vitrine local.</p>';
  }
}

async function loadAccountOrders() {
  if (!user?.id || !user?.authHeader) {
    accountOrderHistory = [];
    return;
  }
  try {
    accountOrderHistory = await apiRequest(`/api/orders/customer/${user.id}`, { authenticated: true });
    eligibleReviews = await apiRequest("/api/reviews/eligible", { authenticated: true });
  } catch {
    accountOrderHistory = [];
    eligibleReviews = [];
  }
}

async function loadAdminOrders() {
  if (!isAdmin()) {
    adminOrderHistory = [];
    adminOrdersLoadError = "";
    return false;
  }
  try {
    const orders = await apiRequest("/api/orders", { authenticated: true });
    adminOrderHistory = Array.isArray(orders) ? orders : [];
    adminOrdersLoadError = "";
    return true;
  } catch (error) {
    adminOrderHistory = [];
    adminOrdersLoadError = error.status === 401 || error.status === 403
      ? "Sua sessao administrativa expirou. Entre novamente para carregar os pedidos."
      : `Nao foi possivel carregar os pedidos: ${error.message}`;
    return false;
  }
}

async function loadAdminCoupons() {
  if (!isAdmin()) {
    adminCoupons = [];
    return;
  }
  try {
    adminCoupons = await apiRequest("/api/coupons", { authenticated: true });
  } catch {
    adminCoupons = [];
  }
}

function findProduct(id) {
  return products.find((product) => normalizeProductId(product.id) === normalizeProductId(id));
}

function optionLabel(value) {
  return {
    classica: "Classica",
    presente: "Presente",
    aconchegante: "Aconchegante",
    relaxante: "Relaxante",
    economico: "Economico",
    expresso: "Expresso",
    PIX: "Pix",
    CREDIT_CARD: "Cartao de credito",
    BOLETO: "Boleto",
    PENDING: "Pagamento pendente",
    PAID: "Pago",
    REFUNDED: "Estornado",
    CREATED: "Recebido",
    PREPARING: "Preparando",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELED: "Cancelado",
    ADMIN: "Administrador",
    CUSTOMER: "Cliente",
  }[value] || value || "-";
}

function getMinimumStock(product) {
  return Number(product.minimumStock ?? 5);
}

function getSelectedFilters() {
  return $$(".filter-panel input:checked").reduce((filters, input) => {
    filters[input.dataset.filter] = filters[input.dataset.filter] || [];
    filters[input.dataset.filter].push(input.value);
    return filters;
  }, {});
}

function productMatchesFilters(product, filters) {
  return Object.entries(filters).every(([key, values]) => {
    if (key === "size") return values.includes(product.size);
    if (key === "mood") return values.includes(product.mood);
    if (key === "stock") return Number(product.stock) > 0;
    return true;
  });
}

function sortProductList(list) {
  const sorted = [...list];
  if ($("#sortProducts").value === "price-asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
  if ($("#sortProducts").value === "price-desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
  if ($("#sortProducts").value === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

function productImage(product) {
  if (product.imageUrl) return `<img src="${product.imageUrl}" alt="${product.name}" />`;
  return `<div class="product-art" data-color="${product.color || "clay"}"><span></span></div>`;
}

function renderProducts() {
  const query = normalizeText($("#searchInput").value);
  const filters = getSelectedFilters();
  const list = sortProductList(products.filter((product) => {
    if (product.active === false) return false;
    const text = normalizeText(`${product.name} ${product.scent} ${product.description}`);
    return text.includes(query) && productMatchesFilters(product, filters);
  }));

  $("#productGrid").innerHTML = list.length ? "" : '<p class="empty-state">Nenhuma vela encontrada.</p>';
  list.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <button class="favorite-button ${isFavorite(product.id) ? "is-active" : ""}" data-favorite type="button" aria-label="${isFavorite(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}">${isFavorite(product.id) ? "♥" : "♡"}</button>
      ${productImage(product)}
      <div>
        <span class="tag">${product.scent}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-meta"><span>${product.size}</span><span>${optionLabel(product.mood)}</span><span>${product.stock} disp.</span></div>
      </div>
      <footer><strong>${formatCurrency(product.price)}</strong><button class="product-add" type="button" ${product.stock <= 0 ? "disabled" : ""}>Adicionar</button></footer>
    `;
    card.addEventListener("click", (event) => {
      if (event.target.tagName === "BUTTON") return;
      openProduct(product.id);
    });
    card.querySelector("[data-favorite]").addEventListener("click", () => toggleFavorite(product.id));
    card.querySelector(".product-add").addEventListener("click", () => addToCart(product.id));
    $("#productGrid").append(card);
  });
}

async function openProduct(id, { navigate = true } = {}) {
  const product = findProduct(id);
  if (!product) return;
  currentProductId = product.id;
  $("#detailName").textContent = product.name;
  $("#detailScent").textContent = product.scent;
  $("#detailDescription").textContent = product.description;
  $("#detailMeta").innerHTML = `<span>${product.size}</span><span>${optionLabel(product.mood)}</span><span>${product.stock} disponiveis</span>`;
  $("#detailPrice").textContent = formatCurrency(product.price);
  $("#detailMedia").dataset.color = product.color || "clay";
  $("#detailImage").src = product.imageUrl || "";
  $("#detailImage").alt = product.imageUrl ? product.name : "";
  $("#detailMedia").classList.toggle("has-photo", Boolean(product.imageUrl));
  updateDetailFavorite();
  await loadProductReviews();
  renderRelated(product);
  if (navigate) location.hash = "product";
}

async function loadProductReviews() {
  if (!currentProductId) return;
  try {
    reviews = await apiRequest(`/api/reviews/product/${currentProductId}`);
  } catch {
    reviews = [];
  }
  renderProductReviews();
}

function renderRelated(product) {
  const similarity = (item) =>
    Number(item.mood === product.mood) * 3
    + Number(item.scent === product.scent) * 2
    + Number(item.size === product.size);
  const related = products
    .filter((item) => item.id !== product.id && item.active !== false)
    .sort((left, right) => similarity(right) - similarity(left))
    .slice(0, 3);
  $("#relatedProducts").innerHTML = "";
  related.forEach((item) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `${productImage(item)}<div><span class="tag">${item.scent}</span><h3>${item.name}</h3><p>${item.description}</p></div><footer><strong>${formatCurrency(item.price)}</strong><button class="product-add" type="button">Adicionar</button></footer>`;
    card.addEventListener("click", () => openProduct(item.id));
    card.querySelector("button").addEventListener("click", (event) => { event.stopPropagation(); addToCart(item.id); });
    $("#relatedProducts").append(card);
  });
}

function updateDetailFavorite() {
  if (!currentProductId) return;
  const active = isFavorite(currentProductId);
  $("#detailFavorite").textContent = active ? "Remover dos favoritos" : "Favoritar";
  $("#detailFavorite").classList.toggle("is-active", active);
}

function renderFavorites() {
  const list = products.filter((product) => isFavorite(product.id) && product.active !== false);
  $("#favoriteProducts").innerHTML = list.length ? "" : '<div class="orders-empty"><strong>Nenhuma vela favorita ainda.</strong><p>Use o coracao nos produtos para montar sua lista.</p><a class="primary-action" href="#shop">Explorar velas</a></div>';
  list.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `<button class="favorite-button is-active" type="button" aria-label="Remover dos favoritos">♥</button>${productImage(product)}<div><span class="tag">${product.scent}</span><h3>${product.name}</h3><p>${product.description}</p></div><footer><strong>${formatCurrency(product.price)}</strong><button class="product-add" type="button">Adicionar</button></footer>`;
    card.addEventListener("click", (event) => { if (event.target.tagName !== "BUTTON") openProduct(product.id); });
    card.querySelector(".favorite-button").addEventListener("click", () => toggleFavorite(product.id));
    card.querySelector(".product-add").addEventListener("click", () => addToCart(product.id));
    $("#favoriteProducts").append(card);
  });
}

function renderProductReviews() {
  const productReviews = reviews.filter((review) => normalizeProductId(review.productId) === normalizeProductId(currentProductId));
  const average = productReviews.length ? productReviews.reduce((sum, review) => sum + Number(review.rating), 0) / productReviews.length : 0;
  const stars = (rating) => `<span class="stars" aria-label="${rating} de 5 estrelas">${[1, 2, 3, 4, 5].map((value) => `<i class="${value <= Math.round(rating) ? "filled" : ""}">★</i>`).join("")}</span>`;
  $("#detailRatingSummary").innerHTML = productReviews.length ? `${stars(average)} <span>${average.toFixed(1)} (${productReviews.length})</span>` : `${stars(0)} <span>Sem avaliacoes</span>`;
  $("#reviewsOverview").innerHTML = productReviews.length ? `<strong>${average.toFixed(1)}</strong><div>${stars(average)}<span>${productReviews.length} avaliacao(oes) de compra verificada</span></div>` : '<p>As primeiras avaliacoes aparecerao aqui.</p>';
  $("#productReviews").innerHTML = productReviews.length ? productReviews.map((review) => `<article class="review-item ${Number(review.id) === Number(highlightedReviewId) ? "is-highlighted" : ""}" data-review-id="${review.id}"><div>${stars(review.rating)}<span>${escapeHtml(review.author)} - compra verificada</span></div><p>${escapeHtml(review.comment)}</p></article>`).join("") : '<p class="empty-state">Este produto ainda nao recebeu avaliacoes.</p>';
  $("#reviewForm").hidden = true;
  $("#reviewLocked").hidden = true;
}

async function submitReview(event) {
  event.preventDefault();
  if (!isAuthenticated()) return requestLogin("product", "Entre na sua conta para publicar uma avaliacao.");
  const comment = $("#reviewComment").value.trim();
  const rating = Number($("input[name='reviewRating']:checked")?.value || 0);
  if (!comment || !currentProductId || !rating) return setFormMessage("#reviewMessage", "Selecione as estrelas e escreva seu comentario.", true);
  try {
    await apiRequest("/api/reviews", { method: "POST", authenticated: true, body: JSON.stringify({ orderId: Number($("#reviewOrderId").value), productId: Number(currentProductId), rating, comment }) });
    $("#reviewForm").reset();
    setFormMessage("#reviewMessage", "Avaliacao publicada. Obrigada por compartilhar sua experiencia.");
    await loadAccountOrders();
    await loadProductReviews();
  } catch (error) {
    setFormMessage("#reviewMessage", error.message, true);
  }
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return product ? sum + Number(product.price) * item.quantity : sum;
  }, 0);
}

function getCouponDiscount() {
  return Number(coupon?.discountTotal || 0);
}

function getShippingCost(subtotal = getCartSubtotal()) {
  if (subtotal >= 180 || coupon?.freeShipping) return 0;
  return shippingQuote.cost === null ? 0 : Number(shippingQuote.cost || 0);
}

function getOrderTotals() {
  const subtotal = getCartSubtotal();
  const discount = getCouponDiscount(subtotal);
  const shipping = getShippingCost(subtotal);
  return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) };
}

function renderSummaryLines(target, totals = getOrderTotals(), snapshot = null) {
  if (!target) return;
  const items = snapshot?.itemCount ?? cart.reduce((sum, item) => sum + item.quantity, 0);
  const delivery = snapshot?.deliveryLabel ?? (shippingQuote.cost === null ? "A calcular" : (totals.shipping === 0 ? "Gratis" : formatCurrency(totals.shipping)));
  target.innerHTML = `
    <div><span>Itens</span><strong>${items}</strong></div>
    <div><span>Subtotal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
    ${totals.discount ? `<div><span>Desconto</span><strong>${formatCurrency(totals.discount)}</strong></div>` : ""}
    <div><span>Entrega</span><strong>${delivery}</strong></div>
    <hr />
    <div><span>Total</span><strong>${formatCurrency(totals.total)}</strong></div>
  `;
}

function renderCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  $("#cartCount").textContent = totalItems;
  $("#drawerItems").textContent = totalItems;
  $("#drawerTotal").textContent = formatCurrency(getOrderTotals().total);
  $("#cartItems").innerHTML = "";
  $("#cartPageItems").innerHTML = "";

  if (!cart.length) {
    $("#cartItems").innerHTML = '<p class="empty-state">Seu carrinho esta vazio.</p>';
    $("#cartPageItems").innerHTML = '<p class="empty-state">Seu carrinho esta vazio.</p>';
  }

  cart.forEach((item) => {
    const product = findProduct(item.productId);
    if (!product) return;
    const drawerRow = document.createElement("article");
    drawerRow.className = "cart-item";
    drawerRow.innerHTML = `<div><h3>${product.name}</h3><p>${item.quantity} un. x ${formatCurrency(product.price)}</p></div><div class="quantity"><button>-</button><strong>${item.quantity}</strong><button>+</button></div>`;
    const [minus, plus] = drawerRow.querySelectorAll("button");
    minus.addEventListener("click", () => updateCart(product.id, -1));
    plus.addEventListener("click", () => updateCart(product.id, 1));
    $("#cartItems").append(drawerRow);

    const pageRow = document.createElement("article");
    pageRow.className = "cart-page-row";
    pageRow.innerHTML = `
      <div class="cart-product-cell">${productImage(product)}<div><h3>${product.name}</h3><p>${product.scent} - ${product.size}</p><span>Em estoque</span></div></div>
      <strong>${formatCurrency(product.price)}</strong>
      <div class="quantity"><button>-</button><strong>${item.quantity}</strong><button>+</button></div>
      <div class="cart-page-total"><strong>${formatCurrency(product.price * item.quantity)}</strong><button class="remove-item">Remover</button></div>
    `;
    const [pageMinus, pagePlus] = pageRow.querySelectorAll(".quantity button");
    pageMinus.addEventListener("click", () => updateCart(product.id, -1));
    pagePlus.addEventListener("click", () => updateCart(product.id, 1));
    pageRow.querySelector(".remove-item").addEventListener("click", () => removeFromCart(product.id));
    $("#cartPageItems").append(pageRow);
  });

  renderSummaryLines($("#checkoutFinalSummary"));
  renderSummaryLines($("#checkoutSummary"));
  renderCheckoutItems();
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product || product.stock <= 0) return;
  const item = cart.find((candidate) => normalizeProductId(candidate.productId) === normalizeProductId(id));
  if (item) item.quantity += 1;
  else cart.push({ productId: id, quantity: 1 });
  writeStorage(storageKeys.cart, cart);
  renderCart();
  openCart();
}

function updateCart(id, amount) {
  const item = cart.find((candidate) => normalizeProductId(candidate.productId) === normalizeProductId(id));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter((candidate) => normalizeProductId(candidate.productId) !== normalizeProductId(id));
  writeStorage(storageKeys.cart, cart);
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => normalizeProductId(item.productId) !== normalizeProductId(id));
  writeStorage(storageKeys.cart, cart);
  renderCart();
}

function openCart() {
  $("#cartDrawer").classList.add("open");
}

function closeCart() {
  $("#cartDrawer").classList.remove("open");
}

function openCheckoutFromDrawer() {
  closeCart();
  location.hash = "cart";
}

function closeOrderFromCart() {
  if (!cart.length) return openCart();
  if (isAdmin()) return requestCustomerLogin();
  if (!isAuthenticated()) return requestLogin("checkout", "Entre na sua conta para finalizar o pedido.");
  location.hash = "checkout";
}

function calculateShipping() {
  const cep = onlyDigits($("#cartCep").value);
  $("#cartCep").value = formatCep(cep);
  if (cep.length !== 8) {
    shippingQuote = { cep: "", cost: null, days: null, service: "economico" };
    localStorage.removeItem(storageKeys.shipping);
    $("#shippingMessage").textContent = "Digite um CEP com 8 numeros.";
    renderCart();
    return false;
  }
  const baseCost = 12.9 + (Number(cep.slice(-2)) % 7);
  const days = 3 + (Number(cep[0]) % 4);
  shippingQuote = { cep: formatCep(cep), cost: Number(baseCost.toFixed(2)), days, service: "economico", baseCost: Number(baseCost.toFixed(2)), baseDays: days };
  writeStorage(storageKeys.shipping, shippingQuote);
  const shippingValue = getShippingCost();
  $("#shippingMessage").textContent = `Entrega estimada em ${days} dias uteis para ${shippingQuote.cep}. Frete: ${shippingValue === 0 ? "Gratis" : formatCurrency(shippingValue)}.`;
  renderCart();
  return true;
}

async function searchCheckoutCepAddress() {
  const cep = onlyDigits($("#checkoutCep").value);
  $("#checkoutCep").value = formatCep(cep);
  if (cep.length !== 8) return false;
  $("#checkoutShippingSummary").textContent = "Buscando endereco pelo CEP...";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) throw new Error();
    $("#deliveryStreet").value = data.logradouro || $("#deliveryStreet").value;
    $("#deliveryNeighborhood").value = data.bairro || $("#deliveryNeighborhood").value;
    $("#deliveryCity").value = data.localidade || $("#deliveryCity").value;
    $("#deliveryState").value = data.uf || $("#deliveryState").value;
  } catch {
    $("#checkoutShippingSummary").textContent = "Nao encontrei esse CEP. Preencha manualmente.";
  }
  return true;
}

async function calculateCheckoutShipping() {
  const cep = onlyDigits($("#checkoutCep").value);
  if (cep.length !== 8) {
    $("#checkoutShippingSummary").textContent = "Digite um CEP com 8 numeros.";
    return false;
  }
  await searchCheckoutCepAddress();
  $("#cartCep").value = formatCep(cep);
  const ok = calculateShipping();
  renderShippingOptions();
  $("#checkoutShippingSummary").textContent = ok ? `Entrega para ${shippingQuote.cep}: ${formatCurrency(getShippingCost())}, prazo de ${shippingQuote.days} dias uteis.` : "Nao foi possivel calcular.";
  return ok;
}

async function calculateFreightForCheckout() {
  const accountSelected = $("input[name='deliveryChoice']:checked")?.value === "account";
  if (accountSelected && hasCompleteAddress(user?.address)) {
    fillDeliveryAddress(user.address);
  }
  const ok = await calculateCheckoutShipping();
  if (ok) {
    const value = getShippingCost() === 0 ? "Gratis" : formatCurrency(getShippingCost());
    $("#checkoutShippingSummary").textContent = `Frete calculado: ${value}, ${optionLabel(shippingQuote.service)}, prazo de ${shippingQuote.days} dias uteis.`;
  }
  return ok;
}

function getShippingOptions() {
  if (!shippingQuote.cep || shippingQuote.cost === null) return [];
  const baseCost = Number(shippingQuote.baseCost ?? shippingQuote.cost);
  const baseDays = Number(shippingQuote.baseDays ?? shippingQuote.days ?? 4);
  return [
    { service: "economico", label: "Economico", cost: baseCost, days: baseDays },
    { service: "expresso", label: "Expresso", cost: Number((baseCost + 7.9).toFixed(2)), days: Math.max(1, baseDays - 2) },
  ];
}

function renderShippingOptions() {
  const options = getShippingOptions();
  $("#shippingOptions").innerHTML = options.map((option) => `<label class="${shippingQuote.service === option.service ? "is-selected" : ""}"><input name="shippingService" type="radio" value="${option.service}" ${shippingQuote.service === option.service ? "checked" : ""} /><span class="shipping-option-copy"><strong>${option.label}</strong><small>${option.days} dias uteis</small></span><strong>${getCartSubtotal() >= 180 ? "Gratis" : formatCurrency(option.cost)}</strong></label>`).join("");
  $$("#shippingOptions input").forEach((input) => input.addEventListener("change", () => selectShippingService(input.value)));
}

function selectShippingService(service) {
  const selected = getShippingOptions().find((option) => option.service === service);
  if (!selected) return;
  shippingQuote = { ...shippingQuote, service: selected.service, cost: selected.cost, days: selected.days };
  writeStorage(storageKeys.shipping, shippingQuote);
  renderShippingOptions();
  renderCart();
}

async function applyCoupon() {
  const code = $("#couponCode").value.trim().toUpperCase();
  const subtotal = getCartSubtotal();
  const shippingCost = shippingQuote.cost === null ? 0 : Number(shippingQuote.cost || 0);
  try {
    const result = await apiRequest("/api/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, subtotal, shippingCost }),
    });
    if (!result.valid) {
      coupon = { code: "", discountTotal: 0, shippingDiscount: 0, freeShipping: false, message: result.message };
      localStorage.removeItem(storageKeys.coupon);
      $("#couponMessage").textContent = result.message;
      renderCart();
      return;
    }
    coupon = {
      code: result.code,
      discountTotal: Number(result.discountTotal || 0),
      shippingDiscount: Number(result.shippingDiscount || 0),
      freeShipping: Boolean(result.freeShipping),
      message: result.message,
    };
    writeStorage(storageKeys.coupon, coupon);
    $("#couponMessage").textContent = result.message;
    renderCart();
  } catch (error) {
    $("#couponMessage").textContent = error.message;
  }
}

function fillDeliveryAddress(address) {
  if (!address) return;
  $("#checkoutCep").value = formatCep(address.cep || "");
  $("#deliveryStreet").value = address.street || "";
  $("#deliveryNumber").value = address.number || "";
  $("#deliveryComplement").value = address.complement || "";
  $("#deliveryNeighborhood").value = address.neighborhood || "";
  $("#deliveryCity").value = address.city || "";
  $("#deliveryState").value = address.state || "";
}

function hasCompleteAddress(address) {
  return Boolean(address?.cep && address?.street && address?.number && address?.neighborhood && address?.city && address?.state);
}

function accountAddressText(address) {
  if (!hasCompleteAddress(address)) return "";
  return `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ""}, ${address.neighborhood}, ${address.city} - ${address.state}`;
}

function renderAccountDeliverySummary(address) {
  const target = $("#accountDeliverySummary");
  if (!hasCompleteAddress(address)) {
    target.innerHTML = '<p class="hint-text">Nenhum endereco completo cadastrado nesta conta.</p>';
    return;
  }
  target.innerHTML = `
    <span class="status-pill is-active">Endereco cadastrado</span>
    <strong>${user?.name || "Cliente"}</strong>
    <p>${accountAddressText(address)}</p>
    <small>CEP ${formatCep(address.cep)}</small>
  `;
}

function clearDeliveryAddressFields() {
  ["checkoutCep", "deliveryStreet", "deliveryNumber", "deliveryComplement", "deliveryNeighborhood", "deliveryCity", "deliveryState"].forEach((id) => { $(`#${id}`).value = ""; });
}

function setDeliveryChoice(choice) {
  const accountAddress = user?.address;
  if (choice === "account" && hasCompleteAddress(accountAddress)) {
    fillDeliveryAddress(accountAddress);
    renderAccountDeliverySummary(accountAddress);
    $("#accountDeliverySummary").hidden = false;
    $("#otherAddressFields").hidden = true;
    $("#cartCep").value = formatCep(accountAddress.cep);
    if (shippingQuote.cep !== formatCep(accountAddress.cep) || shippingQuote.cost === null) calculateShipping();
    renderShippingOptions();
    $("#checkoutShippingSummary").textContent = `Entrega para ${formatCep(accountAddress.cep)}: ${getShippingCost() === 0 ? "Gratis" : formatCurrency(getShippingCost())}, prazo de ${shippingQuote.days} dias uteis.`;
  } else {
    if (choice === "account") {
      $("input[name='deliveryChoice'][value='other']").checked = true;
      renderAccountDeliverySummary(accountAddress);
    }
    $("#accountDeliverySummary").hidden = true;
    $("#otherAddressFields").hidden = false;
    clearDeliveryAddressFields();
    shippingQuote = { cep: "", cost: null, days: null, service: "economico" };
    localStorage.removeItem(storageKeys.shipping);
    renderShippingOptions();
    renderCart();
    $("#checkoutShippingSummary").textContent = "Informe o novo endereco e calcule o frete.";
  }
}

function buildDeliveryAddressText() {
  const street = $("#deliveryStreet").value.trim();
  const number = $("#deliveryNumber").value.trim();
  const neighborhood = $("#deliveryNeighborhood").value.trim();
  const city = $("#deliveryCity").value.trim();
  const state = $("#deliveryState").value.trim().toUpperCase();
  const complement = $("#deliveryComplement").value.trim();
  if (!street || !number || !neighborhood || !city || !state) return "";
  return `${street}, ${number}${complement ? `, ${complement}` : ""}, ${neighborhood}, ${city} - ${state}`;
}

function renderCheckout() {
  $("#checkoutUserName").textContent = user?.name || "-";
  $("#checkoutUserEmail").textContent = user?.email || "-";
  $("#checkoutUserPhone").textContent = user?.phone || "Telefone nao informado";
  const selectedChoice = $("input[name='deliveryChoice']:checked")?.value || "account";
  setDeliveryChoice(selectedChoice);
  renderPaymentSimulation();
}

function paymentToApi(value) {
  return { pix: "PIX", card: "CREDIT_CARD", boleto: "BOLETO", whatsapp: "PIX" }[value] || "PIX";
}

function paymentFromApi(value) {
  return { PIX: "pix", CREDIT_CARD: "card", BOLETO: "boleto" }[value] || "pix";
}

function renderPaymentSimulation() {
  const method = $("#paymentMethod").value;
  const total = getOrderTotals().total;
  const messages = {
    pix: `Pix simulado: copie a chave CALORINE-${Math.max(1, Math.round(total * 100))}.`,
    card: "Cartao simulado: pedido aprovado automaticamente neste ambiente.",
    boleto: "Boleto simulado: vencimento em 2 dias uteis.",
    whatsapp: "WhatsApp: sera aberta uma mensagem pronta para atendimento.",
  };
  $("#paymentSimulation").textContent = messages[method] || "";
}

function renderCheckoutItems() {
  $("#checkoutReviewItems").innerHTML = cart.map((item) => {
    const product = findProduct(item.productId);
    return product ? `<article class="checkout-review-item">${productImage(product)}<div><h3>${product.name}</h3><p>${item.quantity} un. x ${formatCurrency(product.price)}</p></div><strong>${formatCurrency(product.price * item.quantity)}</strong></article>` : "";
  }).join("");
}

async function submitCheckout(event) {
  event.preventDefault();
  if (!cart.length) return;
  if (isAdmin()) return requestCustomerLogin();
  if (!isAuthenticated()) return requestLogin("checkout", "Entre novamente para finalizar o pedido.");
  const address = buildDeliveryAddressText();
  if (!address) {
    $("#checkoutMessage").textContent = "Complete o endereco de entrega.";
    return;
  }
  if (shippingQuote.cost === null || shippingQuote.cep !== formatCep($("#checkoutCep").value)) {
    $("#checkoutShippingSummary").textContent = "Calcule o frete para este endereco antes de continuar.";
    return;
  }
  const totals = getOrderTotals();
  const payment = $("#paymentMethod").value;
  try {
    const order = await apiRequest("/api/orders", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        customerId: user.id,
        deliveryAddress: address,
        paymentMethod: paymentToApi(payment),
        couponCode: coupon.code || "",
        discountTotal: totals.discount,
        shippingCep: shippingQuote.cep,
        shippingService: shippingQuote.service,
        shippingCost: totals.shipping,
        shippingDays: shippingQuote.days,
        paymentSimulation: payment,
        items: cart.map((item) => ({ productId: Number(item.productId), quantity: item.quantity })),
      }),
    });
    const orderSubtotal = (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
    const orderTotals = {
      subtotal: orderSubtotal,
      discount: Number(order.discountTotal || 0),
      shipping: Number(order.shippingCost || 0),
      total: Number(order.total || 0),
    };
    lastOrderSnapshot = { order, address, payment, totals: orderTotals, shipping: { ...shippingQuote, cost: orderTotals.shipping, days: order.shippingDays, service: order.shippingService }, items: order.items || [] };
    writeStorage(storageKeys.pendingOrder, lastOrderSnapshot);
    cart = [];
    writeStorage(storageKeys.cart, cart);
    localStorage.removeItem(storageKeys.shipping);
    localStorage.removeItem(storageKeys.coupon);
    shippingQuote = { cep: "", cost: null, days: null, service: "economico" };
    coupon = { code: "", discountTotal: 0, shippingDiscount: 0, freeShipping: false, message: "" };
    await loadProducts({ silent: true });
    await loadAccountOrders();
    renderAll();
    location.hash = "payment";
  } catch (error) {
    if (error.status === 401) {
      user = null;
      localStorage.removeItem(activeUserStorageKey);
      return requestLogin("checkout", "Sua sessao expirou. Entre novamente para continuar o pagamento.");
    }
    $("#checkoutMessage").textContent = error.message;
  }
}

function renderPaymentPage() {
  if (!lastOrderSnapshot) return;
  const { order, address, payment, totals, shipping, items } = lastOrderSnapshot;
  $("#paymentOrderNumber").textContent = `CALORINE-${String(order.id).padStart(5, "0")}`;
  $("#paymentCustomerName").textContent = user?.name || order.customerName || "Cliente";
  $("#paymentDeliveryAddress").textContent = address;
  $("#paymentShippingInfo").textContent = `${optionLabel(shipping.service)} - ${shipping.days || "-"} dias uteis - ${formatCurrency(totals.shipping)}`;
  $("#paymentItems").innerHTML = items.map((item) => `<article class="payment-review-item"><div><h3>${item.productName}</h3><p>${item.quantity} un.</p></div><strong>${formatCurrency(Number(item.unitPrice || 0) * item.quantity)}</strong></article>`).join("");
  renderSummaryLines($("#paymentSummary"), totals, {
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    deliveryLabel: totals.shipping === 0 ? "Gratis" : formatCurrency(totals.shipping),
  });
  const pixCode = `CALORINE-PIX-${order.id}-${Math.round(totals.total * 100)}`;
  $("#paymentInstructions").innerHTML = {
    pix: `<h2>Pix a vista</h2><p>Escaneie o QR Code simulado ou copie o codigo abaixo.</p><div class="fake-qr"></div><button class="secondary-action" type="button" data-copy-pix="${pixCode}">Copiar codigo Pix</button><p class="hint-text">${pixCode}</p><button class="primary-action payment-confirm-button" type="button" data-confirm-payment>Confirmar pagamento Pix</button>`,
    card: `<h2>Cartao de credito</h2><p>Preencha os dados de teste para simular a aprovacao.</p><form class="card-payment-form" id="cardPaymentForm"><label>Nome no cartao<input required autocomplete="cc-name" /></label><label>Numero do cartao<input required inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" /></label><div><label>Validade<input required maxlength="5" placeholder="MM/AA" /></label><label>CVV<input required inputmode="numeric" maxlength="4" placeholder="000" /></label></div><button class="primary-action" type="submit">Pagar ${formatCurrency(totals.total)}</button></form>`,
    boleto: `<h2>Boleto bancario</h2><p>Boleto simulado gerado com vencimento em 2 dias uteis.</p><button class="primary-action payment-confirm-button" type="button" data-confirm-payment>Simular pagamento do boleto</button>`,
    whatsapp: `<h2>WhatsApp</h2><p>Esta forma de atendimento esta temporariamente indisponivel.</p><button class="secondary-action" type="button" disabled>Indisponivel</button>`,
  }[payment] || "";
  $("#paymentInstructions [data-copy-pix]")?.addEventListener("click", (event) => {
    navigator.clipboard?.writeText(event.currentTarget.dataset.copyPix);
    event.currentTarget.textContent = "Codigo copiado";
  });
  $("#paymentInstructions [data-confirm-payment]")?.addEventListener("click", confirmCurrentPayment);
  $("#cardPaymentForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmCurrentPayment();
  });
}

async function confirmCurrentPayment() {
  if (!lastOrderSnapshot?.order?.id) return;
  const button = $("#paymentInstructions .primary-action");
  if (button) button.disabled = true;
  try {
    const order = await apiRequest(`/api/orders/${lastOrderSnapshot.order.id}/payment/confirm`, { method: "PUT", authenticated: true });
    lastOrderSnapshot.order = order;
    localStorage.removeItem(storageKeys.pendingOrder);
    await loadAccountOrders();
    renderConfirmationPage();
    location.hash = "confirmation";
  } catch (error) {
    if (button) button.disabled = false;
    $("#paymentInstructions").insertAdjacentHTML("beforeend", `<p class="form-message error">${escapeHtml(error.message)}</p>`);
  }
}

function renderConfirmationPage() {
  if (!lastOrderSnapshot) return;
  const { order, address, totals, shipping, items = [] } = lastOrderSnapshot;
  $("#confirmationOrderNumber").textContent = `CALORINE-${String(order.id).padStart(5, "0")}`;
  $("#confirmationAddress").textContent = address;
  $("#confirmationShipping").textContent = `${optionLabel(shipping.service)} - ${shipping.days || "-"} dias uteis`;
  renderSummaryLines($("#confirmationSummary"), totals, {
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    deliveryLabel: totals.shipping === 0 ? "Gratis" : formatCurrency(totals.shipping),
  });
  const trackButton = $("#trackConfirmedOrder");
  if (trackButton) {
    trackButton.onclick = (event) => {
      event.preventDefault();
      openCustomerOrderDetailById(order.id);
    };
  }
}

async function openCustomerOrderDetailById(orderId) {
  if (!isAuthenticated()) return requestLogin("orders", "Entre na sua conta para acompanhar este pedido.");
  await loadAccountOrders();
  renderAll();
  const order = accountOrderHistory.find((item) => Number(item.id) === Number(orderId));
  location.hash = "orders";
  await setRoute("orders");
  if (order) renderCustomerOrderDetail(order);
}

function buildWhatsAppMessage() {
  const lines = cart.map((item) => {
    const product = findProduct(item.productId);
    return product ? `${item.quantity}x ${product.name} - ${formatCurrency(product.price * item.quantity)}` : "";
  }).filter(Boolean);
  const totals = getOrderTotals();
  return ["Ola, quero finalizar meu pedido na Calorine:", ...lines, `Entrega: ${totals.shipping === 0 ? "Gratis" : formatCurrency(totals.shipping)}`, `Total: ${formatCurrency(totals.total)}`, buildDeliveryAddressText() ? `Endereco: ${buildDeliveryAddressText()}` : ""].filter(Boolean).join("\n");
}

function openWhatsAppCheckout() {
  setFormMessage("#checkoutMessage", "A finalizacao pelo WhatsApp esta temporariamente indisponivel.", true);
}

function setFormMessage(selector, text, isError = false) {
  const element = $(selector);
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("error", isError);
}

function toAddressPayload(prefix) {
  return {
    cep: formatCep($(`#${prefix}Cep`).value) || "-",
    street: $(`#${prefix}Street`).value.trim(),
    number: $(`#${prefix}Number`).value.trim(),
    neighborhood: $(`#${prefix}Neighborhood`).value.trim(),
    complement: $(`#${prefix}Complement`).value.trim(),
    city: $(`#${prefix}City`).value.trim(),
    state: $(`#${prefix}State`).value.trim().toUpperCase(),
  };
}

async function searchRegisterCep() {
  const cep = onlyDigits($("#registerCep").value);
  $("#registerCep").value = formatCep(cep);
  if (!cep.length) {
    setFormMessage("#registerCepMessage", "Se nao souber o CEP, preencha o endereco e tentaremos localiza-lo.");
    return;
  }
  if (cep.length !== 8) {
    setFormMessage("#registerCepMessage", "CEP incompleto. Voce pode corrigi-lo ou continuar sem informar o CEP.", true);
    return;
  }
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) {
      setFormMessage("#registerCepMessage", "CEP nao encontrado. Confira o numero ou continue preenchendo o endereco manualmente.", true);
      return;
    }
    $("#registerStreet").value = data.logradouro || "";
    $("#registerNeighborhood").value = data.bairro || "";
    $("#registerCity").value = data.localidade || "";
    $("#registerState").value = data.uf || "";
    setFormMessage("#registerCepMessage", "Endereco localizado pelo CEP.");
  } catch {
    setFormMessage("#registerCepMessage", "Nao foi possivel consultar o CEP agora. O cadastro pode continuar normalmente.", true);
  }
}

async function searchCepByRegisterAddress() {
  if (onlyDigits($("#registerCep").value).length === 8) return;
  const street = $("#registerStreet").value.trim();
  const city = $("#registerCity").value.trim();
  const state = $("#registerState").value.trim().toUpperCase();
  if (street.length < 3 || city.length < 3 || state.length !== 2) return;
  try {
    const url = `https://viacep.com.br/ws/${encodeURIComponent(state)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`;
    const response = await fetch(url);
    const addresses = await response.json();
    if (!Array.isArray(addresses) || !addresses.length) {
      setFormMessage("#registerCepMessage", "Nao localizamos o CEP deste endereco. Voce pode concluir o cadastro sem ele.", true);
      return;
    }
    const neighborhood = normalizeText($("#registerNeighborhood").value);
    const match = addresses.find((address) => neighborhood && normalizeText(address.bairro) === neighborhood) || addresses[0];
    $("#registerCep").value = formatCep(match.cep);
    if (!$("#registerNeighborhood").value) $("#registerNeighborhood").value = match.bairro || "";
    setFormMessage("#registerCepMessage", `CEP ${formatCep(match.cep)} localizado a partir do endereco.`);
  } catch {
    setFormMessage("#registerCepMessage", "Nao foi possivel localizar o CEP agora. O cadastro pode continuar normalmente.", true);
  }
}

async function login(event) {
  event.preventDefault();
  try {
    const returnRoute = sessionStorage.getItem("calorine-after-login") || "account";
    const loggedUser = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("#loginEmail").value.trim().toLowerCase(), password: $("#loginPassword").value }),
    });
    if (returnRoute === "admin" && loggedUser.role !== "ADMIN") {
      throw new Error("Esta conta nao possui acesso administrativo.");
    }
    user = { ...loggedUser, authHeader: `Bearer ${loggedUser.token}` };
    writeStorage(activeUserStorageKey, user);
    await loadProducts({ silent: true });
    await loadAccountOrders();
    await loadAdminOrders();
    await loadAdminCoupons();
    renderAll();
    location.hash = returnRoute;
    sessionStorage.removeItem("calorine-after-login");
    sessionStorage.removeItem("calorine-login-message");
  } catch (error) {
    setFormMessage("#loginMessage", error.message, true);
  }
}

function renderLoginMode() {
  const adminMode = isAdminPortal;
  $("#loginScreen").classList.toggle("admin-login-mode", adminMode);
  $("#loginEyebrow").textContent = adminMode ? "administracao" : "acesso";
  $("#loginTitle").textContent = adminMode ? "Acessar painel" : "Entrar na loja";
  $("#loginDescription").textContent = adminMode
    ? "Area exclusiva para gerenciar a operacao da Calorine."
    : "Entre com sua conta para acompanhar pedidos e agilizar o checkout.";
  $("#loginFormTitle").textContent = adminMode ? "Login administrativo" : "Acesse sua conta";
  $("#showRegister").hidden = adminMode;
  $("#adminLoginHint").hidden = !adminMode;
  $("#logoutButton").hidden = !user;
  const message = sessionStorage.getItem("calorine-login-message") || "";
  setFormMessage("#loginMessage", message, Boolean(message));
}

function openAdminLogin() {
  sessionStorage.setItem("calorine-after-login", "admin");
  sessionStorage.setItem("calorine-login-message", "Use uma conta de administradora para continuar.");
  location.hash = "login";
}

async function register(event) {
  event.preventDefault();
  try {
    const registered = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: $("#registerName").value.trim(),
        phone: $("#registerPhone").value.trim(),
        email: $("#registerEmail").value.trim().toLowerCase(),
        password: $("#registerPassword").value,
        acceptsMarketing: $("#registerMarketing").checked,
        address: toAddressPayload("register"),
      }),
    });
    user = { ...registered, authHeader: `Bearer ${registered.token}` };
    writeStorage(activeUserStorageKey, user);
    await loadProducts({ silent: true });
    await loadAccountOrders();
    renderAll();
    location.hash = "account";
  } catch (error) {
    setFormMessage("#registerMessage", error.message, true);
  }
}

function populateProfileForm() {
  if (!user) return;
  const address = user.address || {};
  $("#profileName").value = user.name || "";
  $("#profilePhone").value = user.phone || "";
  $("#profileCep").value = address.cep === "-" ? "" : (address.cep || "");
  $("#profileStreet").value = address.street || "";
  $("#profileNumber").value = address.number || "";
  $("#profileNeighborhood").value = address.neighborhood || "";
  $("#profileComplement").value = address.complement || "";
  $("#profileCity").value = address.city || "";
  $("#profileState").value = address.state || "";
  $("#profileMarketing").checked = Boolean(user.acceptsMarketing);
}

async function updateProfile(event) {
  event.preventDefault();
  try {
    const updated = await apiRequest("/api/auth/me", {
      method: "PUT",
      authenticated: true,
      body: JSON.stringify({
        name: $("#profileName").value.trim(),
        phone: $("#profilePhone").value.trim(),
        acceptsMarketing: $("#profileMarketing").checked,
        address: {
          cep: formatCep($("#profileCep").value) || "-",
          street: $("#profileStreet").value.trim(),
          number: $("#profileNumber").value.trim(),
          neighborhood: $("#profileNeighborhood").value.trim(),
          complement: $("#profileComplement").value.trim(),
          city: $("#profileCity").value.trim(),
          state: $("#profileState").value.trim().toUpperCase(),
        },
      }),
    });
    user = { ...updated, authHeader: `Bearer ${updated.token}` };
    writeStorage(activeUserStorageKey, user);
    renderUser();
    setFormMessage("#profileMessage", "Dados atualizados com sucesso.");
  } catch (error) {
    setFormMessage("#profileMessage", error.message, true);
  }
}

async function changePassword(event) {
  event.preventDefault();
  if ($("#newPassword").value !== $("#confirmPassword").value) {
    return setFormMessage("#passwordMessage", "A confirmacao da nova senha nao confere.", true);
  }
  try {
    await apiRequest("/api/auth/password", { method: "PUT", authenticated: true, body: JSON.stringify({ currentPassword: $("#currentPassword").value, newPassword: $("#newPassword").value }) });
    $("#passwordForm").reset();
    setFormMessage("#passwordMessage", "Senha alterada com sucesso.");
  } catch (error) {
    setFormMessage("#passwordMessage", error.message, true);
  }
}

function logout() {
  user = null;
  localStorage.removeItem(activeUserStorageKey);
  accountOrderHistory = [];
  adminOrderHistory = [];
  selectedAdminOrderId = null;
  sessionStorage.removeItem("calorine-after-login");
  sessionStorage.removeItem("calorine-login-message");
  $("#loginForm").reset();
  renderAll();
  if (isAdminPortal) {
    sessionStorage.setItem("calorine-after-login", "admin");
    location.hash = "login";
  } else {
    location.hash = "login";
  }
}

function renderUser() {
  const adminProfile = user?.role === "ADMIN";
  $("#loginLink").textContent = isAdminPortal ? (user ? "Painel admin" : "Entrar") : (user ? "Minha conta" : "Conta");
  $("#loginLink").href = isAdminPortal ? (user ? "#admin" : "#login") : (user ? "#account" : "#login");
  const firstNameRaw = String(user?.name || "").trim().split(/\s+/)[0];
  const firstName = firstNameRaw ? `${firstNameRaw.charAt(0).toUpperCase()}${firstNameRaw.slice(1).toLowerCase()}` : "";
  $("#accountGreeting").textContent = adminProfile ? "Conta administrativa" : (firstName ? `Ola, ${firstName}` : "Ola");
  $("#accountName").textContent = user?.name || "-";
  $("#accountEmail").textContent = user?.email || "-";
  $("#accountPhone").textContent = user?.phone || "-";
  $("#accountRole").textContent = optionLabel(user?.role);
  const accountAddress = user?.address || {};
  $("#accountCep").textContent = accountAddress.cep || "-";
  $("#accountStreet").textContent = accountAddress.street || "-";
  $("#accountNumber").textContent = accountAddress.number || "-";
  $("#accountNeighborhood").textContent = accountAddress.neighborhood || "-";
  $("#accountComplement").textContent = accountAddress.complement || "-";
  $("#accountCityState").textContent = accountAddress.city
    ? `${accountAddress.city}${accountAddress.state ? ` - ${accountAddress.state}` : ""}`
    : "-";
  $("#accountScreen").classList.toggle("is-admin-profile", adminProfile);
  $("#accountPhoneCard").hidden = adminProfile;
  $("#accountAddressCard").hidden = adminProfile;
  $("#accountHeroDescription").textContent = adminProfile
    ? "Acesse o painel para gerenciar pedidos, produtos e clientes."
    : "Confira e mantenha seus dados pessoais organizados.";
  $("#accountAdminButton").style.display = isAdmin() ? "inline-flex" : "none";
  $("#accountDropdown").hidden = !user;
  $("#accountDataLink").hidden = adminProfile;
  $("#ordersLink").hidden = adminProfile;
  renderAccountOrders();
  updateAdminAccess();
}

function renderAccountOrders() {
  renderReviewNotifications();
  $("#accountOrders").innerHTML = accountOrderHistory.length ? "" : '<div class="orders-empty"><strong>Voce ainda nao fez nenhum pedido.</strong><p>Quando sua primeira compra for concluida, ela aparecera aqui.</p><a class="primary-action" href="#shop">Conhecer as velas</a></div>';
  accountOrderHistory.forEach((order) => {
    const pendingReviews = (order.items || [])
      .map((orderItem) => getOrderItemReviewEligibility(order, orderItem))
      .filter(Boolean);
    const nextReview = pendingReviews[0];
    const item = document.createElement("article");
    item.className = "customer-order-card";
    item.innerHTML = `<div><p class="eyebrow">pedido #${order.id}</p><h3>${formatDate(order.createdAt)}</h3><span>${(order.items || []).length} produto(s)</span></div><div><span class="status-pill">${optionLabel(order.status)}</span><strong>${formatCurrency(order.total)}</strong>${nextReview ? `<button class="review-order-button" data-review-product="${nextReview.productId}" data-review-order="${nextReview.orderId}" type="button">Avaliar produto${pendingReviews.length > 1 ? ` (${pendingReviews.length})` : ""}</button>` : ""}<button class="small-button" data-order-details type="button">Detalhes</button></div>`;
    item.querySelector("[data-order-details]").addEventListener("click", () => renderCustomerOrderDetail(order));
    item.querySelector("[data-review-product]")?.addEventListener("click", (event) => startProductReview(event.currentTarget.dataset.reviewProduct, event.currentTarget.dataset.reviewOrder));
    $("#accountOrders").append(item);
  });
}

function getReviewEligibility(orderId, productId) {
  return eligibleReviews.find((item) => Number(item.orderId) === Number(orderId) && Number(item.productId) === Number(productId));
}

function getOrderItemReviewEligibility(order, orderItem) {
  const eligibility = getReviewEligibility(order.id, orderItem.productId);
  if (eligibility) return eligibility;
  if (order.status === "DELIVERED" && orderItem.reviewEligible !== false) {
    return { orderId: order.id, productId: orderItem.productId, productName: orderItem.productName };
  }
  return null;
}

function renderReviewNotifications() {
  const target = $("#reviewNotifications");
  target.innerHTML = eligibleReviews.length ? eligibleReviews.map((item) => `<article><div><span class="notification-mark">★</span><p><strong>Como foi sua experiencia com ${escapeHtml(item.productName)}?</strong><small>O pedido foi entregue e sua avaliacao ja esta disponivel.</small></p></div><button class="secondary-action" data-review-product="${item.productId}" data-review-order="${item.orderId}" type="button">Avaliar produto</button></article>`).join("") : "";
  target.querySelectorAll("[data-review-product]").forEach((button) => button.addEventListener("click", () => startProductReview(button.dataset.reviewProduct, button.dataset.reviewOrder)));
}

async function startProductReview(productId, orderId) {
  await openProduct(productId, { navigate: false });
  const product = findProduct(productId);
  $("#reviewPageOrderId").value = orderId;
  $("#reviewPageProductName").textContent = product?.name || "Vela Calorine";
  $("#reviewPageOrderReference").textContent = `Pedido #${orderId} - compra entregue`;
  $("#reviewPageProductImage").src = product?.imageUrl || "";
  $("#reviewPageProductImage").alt = product?.imageUrl ? product.name : "";
  $("#reviewPageProductImage").classList.toggle("has-image", Boolean(product?.imageUrl));
  $("#reviewPageForm").reset();
  $("#reviewPageOrderId").value = orderId;
  setFormMessage("#reviewPageMessage", "");
  location.hash = "review";
}

async function submitReviewPage(event) {
  event.preventDefault();
  if (!isAuthenticated()) return requestLogin("orders", "Entre na sua conta para publicar uma avaliacao.");
  const comment = $("#reviewPageComment").value.trim();
  const rating = Number($("input[name='reviewPageRating']:checked")?.value || 0);
  const orderId = Number($("#reviewPageOrderId").value);
  if (!comment || !currentProductId || !rating || !orderId) return setFormMessage("#reviewPageMessage", "Selecione as estrelas e escreva seu comentario.", true);
  try {
    const createdReview = await apiRequest("/api/reviews", { method: "POST", authenticated: true, body: JSON.stringify({ orderId, productId: Number(currentProductId), rating, comment }) });
    highlightedReviewId = createdReview.id;
    await loadAccountOrders();
    await loadProductReviews();
    location.hash = "product";
    setTimeout(() => {
      $("#reviewsSection").scrollIntoView({ behavior: "smooth", block: "start" });
      $(`[data-review-id='${highlightedReviewId}']`)?.focus({ preventScroll: true });
    }, 80);
  } catch (error) {
    setFormMessage("#reviewPageMessage", error.message, true);
  }
}

function renderCustomerOrderDetail(order) {
  const target = $("#customerOrderDetail");
  target.hidden = false;
  const canPay = order.paymentStatus === "PENDING" && order.status !== "CANCELED";
  const canCustomerCancel = !["CANCELED", "SHIPPED", "DELIVERED"].includes(order.status) && ["PENDING", "PAID"].includes(order.paymentStatus);
  target.innerHTML = `<div class="customer-detail-head"><div><p class="eyebrow">pedido #${order.id}</p><h2>${optionLabel(order.status)}</h2><p>${optionLabel(order.paymentStatus)}</p></div><button class="icon-button" data-close-detail type="button" aria-label="Fechar">×</button></div>${canPay ? '<div class="order-payment-pending"><span>O pedido ainda aguarda pagamento.</span><button class="primary-action" data-pay-order type="button">Pagar agora</button></div>' : ""}${order.reviewNotification ? `<div class="order-review-notice">${escapeHtml(order.reviewNotification)}</div>` : ""}<div class="order-progress">${["CREATED", "PREPARING", "SHIPPED", "DELIVERED"].map((status) => `<span class="${status === order.status ? "is-current" : ""}">${optionLabel(status)}</span>`).join("")}</div><div class="customer-detail-grid"><article><span>Entrega</span><strong>${escapeHtml(order.deliveryAddress)}</strong><p>${optionLabel(order.shippingService)} - ${order.shippingDays || "-"} dias</p></article><article><span>Pagamento</span><strong>${optionLabel(order.paymentMethod)}</strong><p>${optionLabel(order.paymentStatus)} - ${formatCurrency(order.total)}</p></article></div><div class="admin-detail-items customer-order-items"><h4>Itens</h4>${(order.items || []).map((item) => `<div><span>${item.quantity}x ${escapeHtml(item.productName)}</span><span><strong>${formatCurrency(item.quantity * Number(item.unitPrice || 0))}</strong>${getOrderItemReviewEligibility(order, item) ? `<button class="small-button" data-review-product="${item.productId}" data-review-order="${order.id}" type="button">Avaliar produto</button>` : ""}</span></div>`).join("")}</div>${canCustomerCancel ? `<button class="secondary-action" data-cancel-order="${order.id}" type="button">Cancelar pedido</button>` : ""}`;
  target.querySelector("[data-close-detail]").addEventListener("click", () => { target.hidden = true; });
  target.querySelector("[data-pay-order]")?.addEventListener("click", () => resumeOrderPayment(order));
  target.querySelector("[data-cancel-order]")?.addEventListener("click", () => cancelOrder(order.id, { context: "customer" }));
  target.querySelectorAll("[data-review-product]").forEach((button) => button.addEventListener("click", () => startProductReview(button.dataset.reviewProduct, button.dataset.reviewOrder)));
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resumeOrderPayment(order) {
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  const discount = Number(order.discountTotal || 0);
  const shipping = Number(order.shippingCost || 0);
  lastOrderSnapshot = {
    order,
    address: order.deliveryAddress,
    payment: paymentFromApi(order.paymentMethod),
    totals: { subtotal, discount, shipping, total: Number(order.total || 0) },
    shipping: { cep: order.shippingCep, service: order.shippingService, cost: shipping, days: order.shippingDays },
    items: order.items || [],
  };
  writeStorage(storageKeys.pendingOrder, lastOrderSnapshot);
  location.hash = "payment";
}

function renderAdminDashboard() {
  const orders = getCommerceAdminOrders();
  const paidOrders = orders.filter((order) => order.paymentStatus === "PAID" && order.status !== "CANCELED");
  const sales = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  $("#adminTotalOrders").textContent = orders.length;
  $("#adminTotalSales").textContent = formatCurrency(sales);
  $("#adminActiveProducts").textContent = products.filter((product) => product.active !== false).length;
  $("#adminLowStock").textContent = products.filter((product) => product.active !== false && Number(product.stock) <= getMinimumStock(product)).length;
  $("#adminAverageTicket").textContent = formatCurrency(paidOrders.length ? sales / paidOrders.length : 0);
  renderAdminSalesChart(orders);
  renderAdminTopProducts(orders);
  $("#adminDashboardMessage").textContent = adminOrdersLoadError;
  $("#adminDashboardMessage").hidden = !adminOrdersLoadError;
}

function renderAdminSalesChart(orders) {
  const statuses = ["CREATED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"];
  const maximum = Math.max(1, ...statuses.map((status) => orders.filter((order) => order.status === status).length));
  $("#adminSalesChart").innerHTML = statuses.map((status) => { const count = orders.filter((order) => order.status === status).length; return `<div><span>${optionLabel(status)}</span><i style="--bar:${Math.round((count / maximum) * 100)}%"></i><strong>${count}</strong></div>`; }).join("");
}

function exportOrdersCsv() {
  const rows = [["Pedido", "Data", "Cliente", "E-mail", "Telefone", "Entrega", "Pagamento", "Forma", "Endereco", "Cupom", "Desconto", "Frete", "Total"], ...getFilteredAdminOrders().map((order) => [order.id, formatDate(order.createdAt), order.customerName, order.customerEmail, order.customerPhone, optionLabel(order.status), optionLabel(order.paymentStatus), optionLabel(order.paymentMethod), order.deliveryAddress, order.couponCode, Number(order.discountTotal || 0).toFixed(2), Number(order.shippingCost || 0).toFixed(2), Number(order.total || 0).toFixed(2)])];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  link.download = `pedidos-calorine-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getCommerceAdminOrders() {
  return adminOrderHistory;
}

function getAdminCustomerOrders() {
  const adminEmail = user?.role === "ADMIN" ? normalizeText(user.email) : "";
  return adminOrderHistory.filter((order) => !adminEmail || normalizeText(order.customerEmail) !== adminEmail);
}

function setAdminMessage(message, isError = false) {
  const target = $("#adminDashboardMessage");
  if (!target) return;
  target.textContent = message || "";
  target.hidden = !message;
  target.classList.toggle("error", Boolean(isError));
}

function renderAdminStockAlerts() {
  const low = products.filter((product) => product.active !== false && Number(product.stock) <= getMinimumStock(product)).slice(0, 4);
  $("#adminStockAlerts").innerHTML = low.length ? low.map((product) => `<article class="admin-item"><div><h3>${product.name}</h3><p>${product.stock} em estoque - minimo ${getMinimumStock(product)}</p></div><span class="status-pill is-muted">Repor</span></article>`).join("") : '<p class="empty-state">Nenhum produto com estoque baixo.</p>';
}

function renderAdminTopProducts(orders = getCommerceAdminOrders()) {
  const totals = new Map();
  orders.filter((order) => order.status !== "CANCELED").forEach((order) => {
    (order.items || []).forEach((item) => {
      const current = totals.get(item.productId) || { name: item.productName, quantity: 0, total: 0 };
      current.quantity += Number(item.quantity || 0);
      current.total += Number(item.unitPrice || 0) * Number(item.quantity || 0);
      totals.set(item.productId, current);
    });
  });
  const best = [...totals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  $("#adminTopProducts").innerHTML = best.length
    ? best.map((item) => `<article class="admin-item"><div><h3>${escapeHtml(item.name)}</h3><p>${item.quantity} unidade(s) vendidas</p></div><strong>${formatCurrency(item.total)}</strong></article>`).join("")
    : '<p class="empty-state">Nenhuma venda registrada ainda.</p>';
}

function getFilteredAdminOrders() {
  const query = normalizeText($("#adminOrderSearch")?.value || "");
  const status = $("#adminOrderStatusFilter")?.value || "ALL";
  return getCommerceAdminOrders().filter((order) => {
    const text = normalizeText([order.id, order.customerName, order.customerEmail, order.customerPhone, order.deliveryAddress, ...(order.items || []).map((item) => item.productName)].join(" "));
    return (status === "ALL" || order.status === status) && (!query || text.includes(query));
  });
}

function renderAdminOrders() {
  renderAdminDashboard();
  const orders = getFilteredAdminOrders();
  if (adminOrdersLoadError) {
    $("#adminOrders").innerHTML = `<div class="admin-load-error"><strong>Pedidos indisponiveis</strong><p>${escapeHtml(adminOrdersLoadError)}</p><button class="small-button" data-reload-admin-orders type="button">Tentar novamente</button></div>`;
    $("#adminOrders [data-reload-admin-orders]").addEventListener("click", refreshAdminOrders);
    $("#adminRecentOrders").innerHTML = `<p class="admin-load-error">${escapeHtml(adminOrdersLoadError)}</p>`;
    return;
  }
  if (!orders.length) {
    $("#adminOrders").innerHTML = '<p class="empty-state">Nenhum pedido encontrado.</p>';
  } else {
    $("#adminOrders").innerHTML = "";
    orders.forEach((order) => {
      const item = document.createElement("article");
      item.className = "admin-order-card";
      item.innerHTML = `
        <div class="admin-order-summary">
          <p class="eyebrow">pedido #${order.id}</p>
          <h3>${escapeHtml(order.customerName)}</h3>
          <p>${formatDate(order.createdAt)} - ${optionLabel(order.paymentMethod)} - ${formatCurrency(order.total)}</p>
          <p>${order.customerEmail || ""}</p>
          <p>Telefone: ${order.customerPhone || "-"}</p>
        </div>
        <div class="admin-actions admin-order-state">
          <span class="status-pill"><small>Pagamento</small>${optionLabel(order.paymentStatus)}</span>
          <span class="status-pill"><small>Andamento</small>${optionLabel(order.status)}</span>
        </div>`;
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Abrir pedido ${order.id}`);
      const openDetail = () => {
        selectedAdminOrderId = order.id;
        renderAdminOrderDetail(order);
        switchAdminSection("order-detail");
      };
      item.addEventListener("click", openDetail);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      });
      $("#adminOrders").append(item);
    });
  }
  $("#adminRecentOrders").innerHTML = getCommerceAdminOrders().slice(0, 4).map((order) => `<article class="admin-order-card"><div class="admin-order-summary"><p class="eyebrow">pedido #${order.id}</p><h3>${escapeHtml(order.customerName)}</h3><p>${formatCurrency(order.total)}</p></div><div class="admin-actions admin-order-state"><span class="status-pill"><small>Pagamento</small>${optionLabel(order.paymentStatus)}</span><span class="status-pill"><small>Andamento</small>${optionLabel(order.status)}</span></div></article>`).join("") || '<p class="empty-state">Nenhum pedido recebido ainda.</p>';
}

function getAllowedAdminStatuses(order) {
  if (!order || ["CANCELED", "DELIVERED"].includes(order.status) || order.paymentStatus !== "PAID") return [order?.status].filter(Boolean);
  const next = { CREATED: "PREPARING", PREPARING: "SHIPPED", SHIPPED: "DELIVERED" }[order.status];
  return next ? [order.status, next] : [order.status];
}

function renderAdminOrderDetail(order) {
  if (!order) {
    $("#adminOrderDetail").innerHTML = '<p class="empty-state">Selecione um pedido.</p>';
    return;
  }
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice || 0) * item.quantity, 0);
  const statusOptions = getAllowedAdminStatuses(order);
  const canAdvance = statusOptions.length > 1;
  const canConfirmPayment = order.paymentStatus === "PENDING" && order.status === "CREATED";
  const hasInvalidPaymentFlow = order.paymentStatus === "PENDING" && !["CREATED", "CANCELED"].includes(order.status);
  const canCancel = order.status !== "CANCELED" && !["SHIPPED", "DELIVERED"].includes(order.status);
  $("#adminOrderDetail").innerHTML = `
    <div class="admin-detail-head"><div><p class="eyebrow">pedido #${order.id}</p><h3>${order.customerName}</h3><p>${formatDate(order.createdAt)}</p><p><strong>Pagamento:</strong> ${optionLabel(order.paymentStatus)} · <strong>Andamento:</strong> ${optionLabel(order.status)}</p></div><label>Andamento<select data-order-status="${order.id}" ${canAdvance ? "" : "disabled"}>${statusOptions.map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${optionLabel(status)}</option>`).join("")}</select></label></div>
    <div class="admin-order-actions">
      ${canConfirmPayment ? `<button class="primary-action" data-admin-confirm-payment="${order.id}" type="button">Confirmar pagamento</button>` : ""}
      ${canCancel ? `<button class="secondary-action" data-admin-cancel-order="${order.id}" type="button">Cancelar pedido</button>` : ""}
      <button class="secondary-action" data-admin-print-order="${order.id}" type="button">Imprimir/separar pedido</button>
    </div>
    <div class="admin-detail-grid">
      <article><span>Cliente</span><strong>${order.customerEmail || "-"}</strong><p>${order.customerPhone || "-"}</p></article>
      <article><span>Pagamento</span><strong>${optionLabel(order.paymentStatus)}</strong><p>${optionLabel(order.paymentMethod)} - ${order.paymentSimulation || "Simulado"}</p></article>
      <article><span>Entrega</span><strong>${order.shippingCep || "-"}</strong><p>${order.deliveryAddress || "-"}</p><p>${optionLabel(order.shippingService)} - ${order.shippingDays || "-"} dias - ${formatCurrency(order.shippingCost)}</p></article>
      <article><span>Resumo</span><strong>${formatCurrency(order.total)}</strong><p>Subtotal ${formatCurrency(subtotal)}</p><p>Desconto ${formatCurrency(order.discountTotal)}</p><p>Cupom ${order.couponCode || "-"}</p></article>
    </div>
    <div class="admin-detail-items"><h4>Itens</h4>${(order.items || []).map((item) => `<div><span>${item.quantity}x ${item.productName}</span><strong>${formatCurrency(item.quantity * Number(item.unitPrice || 0))}</strong></div>`).join("")}</div>
    <div class="admin-order-history"><h4>Historico do pedido</h4>${(order.events || []).length ? order.events.map((event) => `<article><span>${formatDate(event.createdAt)}</span><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.description)}</p></article>`).join("") : '<p class="empty-state">Historico sera registrado nas proximas movimentacoes.</p>'}</div>
    <p class="hint-text">${order.emailNotification || ""}</p>
  `;
  $("#adminOrderDetail select")?.addEventListener("change", (event) => updateOrderStatus(order.id, event.target.value));
  $("#adminOrderDetail [data-admin-confirm-payment]")?.addEventListener("click", () => confirmAdminPayment(order.id));
  $("#adminOrderDetail [data-admin-cancel-order]")?.addEventListener("click", () => cancelOrder(order.id, { context: "admin-detail" }));
  $("#adminOrderDetail [data-admin-print-order]")?.addEventListener("click", () => printOrderPickingList(order));
}

function renderAdminOrderDetail(order) {
  if (!order) {
    $("#adminOrderDetail").innerHTML = '<p class="empty-state">Selecione um pedido.</p>';
    return;
  }
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice || 0) * item.quantity, 0);
  const statusOptions = getAllowedAdminStatuses(order);
  const canAdvance = statusOptions.length > 1;
  const canConfirmPayment = order.paymentStatus === "PENDING" && order.status === "CREATED";
  const hasInvalidPaymentFlow = order.paymentStatus === "PENDING" && !["CREATED", "CANCELED"].includes(order.status);
  const canCancel = order.status !== "CANCELED" && !["SHIPPED", "DELIVERED"].includes(order.status);
  $("#adminOrderDetail").innerHTML = `
    <div class="admin-detail-head"><div><p class="eyebrow">pedido #${order.id}</p><h3>${escapeHtml(order.customerName)}</h3><p>${formatDate(order.createdAt)}</p><p><strong>Pagamento:</strong> ${optionLabel(order.paymentStatus)} - <strong>Andamento:</strong> ${optionLabel(order.status)}</p></div><label>Andamento<select data-order-status="${order.id}" ${canAdvance ? "" : "disabled"}>${statusOptions.map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${optionLabel(status)}</option>`).join("")}</select></label></div>
    ${hasInvalidPaymentFlow ? `<p class="admin-flow-warning">Pedido com andamento avancado e pagamento pendente. Confira o historico antes de seguir.</p>` : ""}
    <div class="admin-order-actions">
      ${canConfirmPayment ? `<button class="primary-action" data-admin-confirm-payment="${order.id}" type="button">Confirmar pagamento</button>` : ""}
      ${canCancel ? `<button class="secondary-action" data-admin-cancel-order="${order.id}" type="button">Cancelar pedido</button>` : ""}
      <button class="secondary-action" data-admin-print-order="${order.id}" type="button">Imprimir/separar pedido</button>
    </div>
    <div class="admin-detail-grid">
      <article><span>Cliente</span><strong>${order.customerEmail || "-"}</strong><p>${order.customerPhone || "-"}</p></article>
      <article><span>Pagamento</span><strong>${optionLabel(order.paymentStatus)}</strong><p>${optionLabel(order.paymentMethod)} - ${order.paymentSimulation || "Simulado"}</p></article>
      <article><span>Entrega</span><strong>${order.shippingCep || "-"}</strong><p>${order.deliveryAddress || "-"}</p><p>${optionLabel(order.shippingService)} - ${order.shippingDays || "-"} dias - ${formatCurrency(order.shippingCost)}</p></article>
      <article><span>Resumo</span><strong>${formatCurrency(order.total)}</strong><p>Subtotal ${formatCurrency(subtotal)}</p><p>Desconto ${formatCurrency(order.discountTotal)}</p><p>Cupom ${order.couponCode || "-"}</p></article>
    </div>
    <div class="admin-detail-items"><h4>Itens</h4>${(order.items || []).map((item) => `<div><span>${item.quantity}x ${escapeHtml(item.productName)}</span><strong>${formatCurrency(item.quantity * Number(item.unitPrice || 0))}</strong></div>`).join("")}</div>
    <div class="admin-order-history"><h4>Historico do pedido</h4>${(order.events || []).length ? order.events.map((event) => `<article><time>${formatDate(event.createdAt)}</time><div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.description)}</p></div></article>`).join("") : '<p class="empty-state">Historico sera registrado nas proximas movimentacoes.</p>'}</div>
    <p class="hint-text">${order.emailNotification || ""}</p>
  `;
  $("#adminOrderDetail select")?.addEventListener("change", (event) => updateOrderStatus(order.id, event.target.value));
  $("#adminOrderDetail [data-admin-confirm-payment]")?.addEventListener("click", () => confirmAdminPayment(order.id));
  $("#adminOrderDetail [data-admin-cancel-order]")?.addEventListener("click", () => cancelOrder(order.id, { context: "admin-detail" }));
  $("#adminOrderDetail [data-admin-print-order]")?.addEventListener("click", () => printOrderPickingList(order));
}

function renderAdminCustomers() {
  const customers = new Map();
  getAdminCustomerOrders().forEach((order) => {
    const key = order.customerEmail || order.customerName;
    const current = customers.get(key) || { name: order.customerName, email: order.customerEmail, orders: 0, total: 0 };
    current.orders += 1;
    current.total += order.status === "CANCELED" ? 0 : Number(order.total || 0);
    customers.set(key, current);
  });
  $("#adminCustomers").innerHTML = [...customers.values()].map((customer) => `<article class="admin-item"><div><h3>${customer.name}</h3><p>${customer.email || "E-mail nao informado"}</p><p>${customer.orders} pedido(s)</p></div><strong>${formatCurrency(customer.total)}</strong></article>`).join("") || '<p class="empty-state">Nenhum cliente com pedido ainda.</p>';
}

function renderAdminCoupons() {
  $("#adminCoupons").innerHTML = adminCoupons.length ? adminCoupons.map((couponItem) => {
    const usage = couponItem.usageLimit ? `${couponItem.usedCount}/${couponItem.usageLimit}` : `${couponItem.usedCount} uso(s)`;
    return `
      <article class="admin-item">
        <div>
          <h3>${escapeHtml(couponItem.code)}</h3>
          <p>${couponTypeLabel(couponItem.type)} - valor ${formatCouponValue(couponItem)}</p>
          <p>Minimo ${formatCurrency(couponItem.minimumSubtotal)} - Uso ${usage}${couponItem.validUntil ? ` - ate ${couponItem.validUntil}` : ""}</p>
          <span class="status-pill ${couponItem.active ? "is-active" : "is-muted"}">${couponItem.active ? "Ativo" : "Inativo"}</span>
        </div>
        <div class="admin-actions"><button class="small-button" data-edit-coupon="${couponItem.id}" type="button">Editar</button></div>
      </article>`;
  }).join("") : '<p class="empty-state">Nenhum cupom cadastrado.</p>';
  $$("[data-edit-coupon]").forEach((button) => button.addEventListener("click", () => editCoupon(button.dataset.editCoupon)));
}

function couponTypeLabel(type) {
  return { PERCENTAGE: "Percentual", FIXED_AMOUNT: "Valor fixo", FREE_SHIPPING: "Frete gratis" }[type] || type;
}

function formatCouponValue(couponItem) {
  if (couponItem.type === "PERCENTAGE") return `${Number(couponItem.value || 0).toFixed(0)}%`;
  if (couponItem.type === "FREE_SHIPPING") return "frete";
  return formatCurrency(couponItem.value);
}

function editCoupon(id) {
  const couponItem = adminCoupons.find((item) => Number(item.id) === Number(id));
  if (!couponItem) return;
  $("#couponId").value = couponItem.id;
  $("#adminCouponCode").value = couponItem.code;
  $("#adminCouponType").value = couponItem.type;
  $("#adminCouponValue").value = couponItem.value;
  $("#adminCouponMinimum").value = couponItem.minimumSubtotal;
  $("#adminCouponLimit").value = couponItem.usageLimit || "1";
  $("#adminCouponValidUntil").value = couponItem.validUntil || "";
  $("#adminCouponActive").checked = couponItem.active;
  switchAdminSection("coupon-create");
  $("#adminCouponCode").focus();
}

function clearCouponForm() {
  $("#couponForm").reset();
  $("#couponId").value = "";
  $("#adminCouponValue").value = "10";
  $("#adminCouponMinimum").value = "0";
  $("#adminCouponLimit").value = "1";
  $("#adminCouponActive").checked = true;
}

async function submitCoupon(event) {
  event.preventDefault();
  try {
    const payload = {
      code: $("#adminCouponCode").value.trim().toUpperCase(),
      type: $("#adminCouponType").value,
      value: Number($("#adminCouponValue").value || 0),
      minimumSubtotal: Number($("#adminCouponMinimum").value || 0),
      usageLimit: Number($("#adminCouponLimit").value || 1),
      validUntil: $("#adminCouponValidUntil").value || null,
      active: $("#adminCouponActive").checked,
    };
    const id = $("#couponId").value;
    await apiRequest(id ? `/api/coupons/${id}` : "/api/coupons", {
      method: id ? "PUT" : "POST",
      authenticated: true,
      body: JSON.stringify(payload),
    });
    clearCouponForm();
    await loadAdminCoupons();
    renderAdminCoupons();
    setFormMessage("#couponAdminMessage", id ? "Cupom atualizado." : "Cupom cadastrado.");
  } catch (error) {
    setFormMessage("#couponAdminMessage", error.message, true);
  }
}

function renderAdminList() {
  $("#adminList").innerHTML = products.map((product) => `
    <article class="admin-item ${Number(product.stock || 0) <= 5 ? "is-low-stock" : ""}">
      <div><h3>${product.name}</h3><p>${product.scent} - ${product.size} - ${formatCurrency(product.price)} - <strong>${product.stock} em estoque</strong></p><p>Estoque minimo: ${getMinimumStock(product)}</p><div class="product-admin-badges">${Number(product.stock || 0) <= 5 ? '<span class="stock-alert-badge">Estoque baixo</span>' : ""}<span class="status-pill ${product.active ? "is-active" : "is-muted"}">${product.active ? "Ativa" : "Oculta"}</span></div></div>
      <div class="admin-actions"><button class="small-button" data-edit="${product.id}">Editar</button><button class="small-button" data-toggle="${product.id}">${product.active ? "Desativar" : "Ativar"}</button></div>
    </article>`).join("") || '<p class="empty-state">Cadastre a primeira vela.</p>';
  $$("[data-edit]").forEach((button) => button.addEventListener("click", () => editProduct(button.dataset.edit)));
  $$("[data-toggle]").forEach((button) => {
    const product = findProduct(button.dataset.toggle);
    button.addEventListener("click", () => toggleProductActive(product.id, !product.active));
  });
  renderAdminStockAlerts();
}

function updateAdminAccess() {
  const locked = !isAdmin();
  $("#adminLayout").classList.toggle("locked", locked);
  $("#adminLocked").classList.toggle("visible", locked);
  $("#adminScreen").classList.toggle("is-locked", locked);
}

async function switchAdminSection(section) {
  $$(".admin-view").forEach((view) => view.classList.toggle("active", view.dataset.adminView === section));
  if ((section === "overview" || section === "orders") && isAdmin()) {
    if (section === "orders") $("#adminOrderStatusFilter").value = "ALL";
    await refreshAdminOrders();
  }
  if ((section === "coupons" || section === "coupon-create") && isAdmin()) {
    await loadAdminCoupons();
    renderAdminCoupons();
  }
  if (section === "customers" && isAdmin()) renderAdminCustomers();
  if (section === "product-create") $("#productName")?.focus();
  if (section === "coupon-create") $("#adminCouponCode")?.focus();
  $$(".admin-sidebar button[data-admin-section]").forEach((button) => button.classList.toggle("active", button.dataset.adminSection === section));
}

async function refreshAdminOrders() {
  $("#adminOrders").innerHTML = '<p class="empty-state">Carregando pedidos...</p>';
  await loadAdminOrders();
  renderAdminOrders();
  renderAdminCustomers();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

async function getImage(input, currentSelector) {
  const file = input.files[0];
  if (!file) return $(currentSelector).value || null;
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem valida.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Escolha uma imagem com ate 3 MB.");
  return uploadProductImage(file);
}

async function uploadProductImage(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiBase}/api/uploads/images`, {
    method: "POST",
    headers: authHeader(),
    body: form,
  });
  if (!response.ok) {
    let message = "Nao foi possivel salvar a imagem.";
    try {
      message = (await response.json()).message || message;
    } catch {
      message = await response.text() || message;
    }
    throw new Error(message);
  }
  const payload = await response.json();
  return payload.url;
}

function previewImage(target, url, text = "Sem imagem") {
  target.innerHTML = url ? `<img src="${url}" alt="Previa" />` : text;
}

function validateProduct(product) {
  $$("#productForm .field-error").forEach((field) => field.classList.remove("field-error"));
  const checks = [
    ["#productName", product.name.length >= 3, "Informe um nome com pelo menos 3 caracteres."],
    ["#productScent", product.scent.length >= 3, "Informe um aroma com pelo menos 3 caracteres."],
    ["#productDescription", product.description.length >= 20, "A descricao precisa ter pelo menos 20 caracteres."],
    ["#productPrice", Number.isFinite(product.price) && product.price >= 1, "Informe um preco valido."],
    ["#productStock", Number.isInteger(product.stock) && product.stock >= 0, "Informe um estoque valido."],
    ["#productMinimumStock", Number.isInteger(product.minimumStock) && product.minimumStock >= 0, "Informe um estoque minimo valido."],
  ];
  const error = checks.find(([, ok]) => !ok);
  if (error) {
    $(error[0]).classList.add("field-error");
    $(error[0]).focus();
    throw new Error(error[2]);
  }
}

async function submitProduct(event) {
  event.preventDefault();
  try {
    const product = {
      name: $("#productName").value.trim(),
      scent: $("#productScent").value.trim(),
      description: $("#productDescription").value.trim(),
      price: Number($("#productPrice").value),
      stock: Number($("#productStock").value),
      minimumStock: Number($("#productMinimumStock").value),
      active: $("#productActive").checked,
      color: $("#productColor").value,
      size: $("#productSize").value,
      occasion: $("#productOccasion").value,
      mood: $("#productMood").value,
      imageUrl: await getImage($("#productImage"), "#productImageCurrent"),
      extraImageUrlOne: await getImage($("#productExtraImageOne"), "#productExtraImageOneCurrent"),
      extraImageUrlTwo: await getImage($("#productExtraImageTwo"), "#productExtraImageTwoCurrent"),
    };
    validateProduct(product);
    const productId = $("#productId").value;
    await apiRequest(productId ? `/api/candles/${productId}` : "/api/candles", {
      method: productId ? "PUT" : "POST",
      authenticated: true,
      body: JSON.stringify(product),
    });
    clearForm();
    await loadProducts({ silent: true });
    renderAll();
    setFormMessage("#productMessage", productId ? "Vela atualizada." : "Vela cadastrada.");
  } catch (error) {
    setFormMessage("#productMessage", error.message, true);
  }
}

function editProduct(id) {
  const product = findProduct(id);
  if (!product) return;
  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productScent").value = product.scent;
  $("#productPrice").value = product.price;
  $("#productStock").value = product.stock;
  $("#productMinimumStock").value = getMinimumStock(product);
  $("#productActive").checked = product.active !== false;
  $("#productColor").value = product.color;
  $("#productSize").value = product.size;
  $("#productOccasion").value = product.occasion;
  $("#productMood").value = product.mood;
  $("#productDescription").value = product.description;
  $("#productImageCurrent").value = product.imageUrl || "";
  $("#productExtraImageOneCurrent").value = product.extraImageUrlOne || "";
  $("#productExtraImageTwoCurrent").value = product.extraImageUrlTwo || "";
  previewImage($("#productImagePreview"), product.imageUrl);
  previewImage($("#productExtraImageOnePreview"), product.extraImageUrlOne);
  previewImage($("#productExtraImageTwoPreview"), product.extraImageUrlTwo);
  switchAdminSection("product-create");
  $("#productName").focus();
}

function clearForm() {
  $("#productForm").reset();
  $("#productId").value = "";
  $("#productImageCurrent").value = "";
  $("#productExtraImageOneCurrent").value = "";
  $("#productExtraImageTwoCurrent").value = "";
  $("#productMinimumStock").value = "5";
  $("#productActive").checked = true;
  previewImage($("#productImagePreview"), null);
  previewImage($("#productExtraImageOnePreview"), null);
  previewImage($("#productExtraImageTwoPreview"), null);
}

async function toggleProductActive(productId, active) {
  try {
    await apiRequest(`/api/candles/${productId}/active/${active}`, { method: "PUT", authenticated: true });
    await loadProducts({ silent: true });
    renderAll();
  } catch (error) {
    setFormMessage("#productMessage", error.message, true);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await apiRequest(`/api/orders/${orderId}/status`, { method: "PUT", authenticated: true, body: JSON.stringify({ status }) });
    await loadProducts({ silent: true });
    await loadAdminOrders();
    await loadAccountOrders();
    renderAll();
    setAdminMessage(status === "CANCELED" ? "Pedido cancelado." : "Status atualizado.");
  } catch (error) {
    setAdminMessage(error.message, true);
  }
}

async function cancelOrder(orderId, options = {}) {
  try {
    try {
      await apiRequest(`/api/orders/${orderId}/cancel`, { method: "PUT", authenticated: true });
    } catch (error) {
      if (error.status !== 404 && !/404|not found|encontrado/i.test(error.message)) throw error;
      await apiRequest(`/api/orders/${orderId}/status`, { method: "PUT", authenticated: true, body: JSON.stringify({ status: "CANCELED" }) });
    }
    await loadProducts({ silent: true });
    await loadAdminOrders();
    await loadAccountOrders();
    renderAll();
    const updatedOrder = accountOrderHistory.find((order) => Number(order.id) === Number(orderId))
      || adminOrderHistory.find((order) => Number(order.id) === Number(orderId));
    if (options.context === "customer" && updatedOrder) {
      renderCustomerOrderDetail(updatedOrder);
    }
    if (options.context === "admin-detail" && updatedOrder) {
      renderAdminOrderDetail(updatedOrder);
      switchAdminSection("order-detail");
    }
    if (options.context !== "customer") setAdminMessage("Pedido cancelado.");
  } catch (error) {
    if (options.context === "customer") {
      alert(error.message);
    } else {
      setAdminMessage(error.message, true);
    }
  }
}

async function confirmAdminPayment(orderId) {
  try {
    await apiRequest(`/api/orders/${orderId}/payment/confirm`, { method: "PUT", authenticated: true });
    await refreshAdminOrders();
    setAdminMessage("Pagamento confirmado.");
  } catch (error) {
    setAdminMessage(error.message, true);
  }
}

function printOrderPickingList(order) {
  const lines = [
    `Pedido #${order.id}`,
    `Cliente: ${order.customerName}`,
    `Telefone: ${order.customerPhone || "-"}`,
    `Entrega: ${order.deliveryAddress}`,
    "",
    "Itens:",
    ...(order.items || []).map((item) => `- ${item.quantity}x ${item.productName}`),
    "",
    `Total: ${formatCurrency(order.total)}`,
  ];
  const printWindow = window.open("", "_blank", "width=720,height=720");
  if (!printWindow) return;
  printWindow.document.write(`<pre style="font:16px/1.5 Arial, sans-serif; white-space:pre-wrap">${escapeHtml(lines.join("\n"))}</pre>`);
  printWindow.document.close();
  printWindow.print();
}

async function setRoute(route) {
  const next = route || "shop";
  if (next === "admin" && !isAdminPortal) return location.hash = "shop";
  if (next === "admin" && isAdminPortal && !isAdmin()) return openAdminLogin();
  if (isAdminPortal && next !== "admin" && next !== "login") return location.hash = isAdmin() ? "admin" : "login";
  if (next === "account" && !isAuthenticated()) return requestLogin("account", "Entre na sua conta para acessar seus dados.");
  if (next === "orders" && !isAuthenticated()) return requestLogin("orders", "Entre na sua conta para consultar seus pedidos.");
  if (next === "review" && (!isAuthenticated() || !currentProductId)) return location.hash = isAuthenticated() ? "orders" : "login";
  if ((next === "favorites" || next === "profile-edit") && !isAuthenticated()) return requestLogin(next, "Entre na sua conta para continuar.");
  if (next === "checkout" && !cart.length) return location.hash = "cart";
  if (next === "checkout" && isAdmin()) return requestCustomerLogin();
  if (next === "checkout" && !isAuthenticated()) return requestLogin("checkout", "Entre na sua conta para finalizar o pedido.");
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === next));
  if (next === "login") renderLoginMode();
  if (next === "checkout") renderCheckout();
  if (next === "payment") renderPaymentPage();
  if (next === "confirmation") renderConfirmationPage();
  if (next === "product" && currentProductId) renderProductReviews();
  if (next === "profile-edit") populateProfileForm();
  if (next === "favorites") renderFavorites();
  if (next === "admin") {
    updateAdminAccess();
    $("#adminOrderStatusFilter").value = "ALL";
    await refreshAdminOrders();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderProducts();
  renderCart();
  renderUser();
  renderAdminList();
  renderAdminOrders();
  renderAdminCustomers();
  renderAdminCoupons();
  renderFavorites();
}

$("#openCart").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#goCheckout").addEventListener("click", openCheckoutFromDrawer);
$("#closeOrder").addEventListener("click", closeOrderFromCart);
$("#cartDrawer").addEventListener("click", (event) => { if (event.target.id === "cartDrawer") closeCart(); });
$("#calculateShipping").addEventListener("click", calculateShipping);
$("#calculateCheckoutShipping").addEventListener("click", searchCheckoutCepAddress);
$("#calculateCheckoutFreight").addEventListener("click", calculateFreightForCheckout);
$("#applyCoupon").addEventListener("click", applyCoupon);
$("#checkoutForm").addEventListener("submit", submitCheckout);
$("#whatsappCheckout").addEventListener("click", openWhatsAppCheckout);
$("#loginForm").addEventListener("submit", login);
$("#logoutButton").addEventListener("click", logout);
$("#headerLogoutButton").addEventListener("click", logout);
$("#adminLogoutButton").addEventListener("click", logout);
$("#registerForm").addEventListener("submit", register);
$("#registerCep").addEventListener("blur", searchRegisterCep);
$("#registerStreet").addEventListener("blur", searchCepByRegisterAddress);
$("#registerCity").addEventListener("blur", searchCepByRegisterAddress);
$("#registerState").addEventListener("blur", searchCepByRegisterAddress);
$("#showRegister").addEventListener("click", () => { location.hash = "register"; });
$("#adminLoginButton").addEventListener("click", openAdminLogin);
$("#loginLink").addEventListener("click", () => {
  if (user) return;
  sessionStorage.removeItem("calorine-after-login");
  sessionStorage.removeItem("calorine-login-message");
});
$("#searchInput").addEventListener("input", renderProducts);
$("#sortProducts").addEventListener("change", renderProducts);
$("#clearFilters").addEventListener("click", () => { $$(".filter-panel input").forEach((input) => { input.checked = false; }); renderProducts(); });
$$(".filter-panel input").forEach((input) => input.addEventListener("change", renderProducts));
$$("input[name='deliveryChoice']").forEach((input) => input.addEventListener("change", () => setDeliveryChoice(input.value)));
$$("input[name='paymentChoice']").forEach((input) => input.addEventListener("change", () => { $("#paymentMethod").value = input.value; renderPaymentSimulation(); }));
$$("[data-admin-section]").forEach((button) => button.addEventListener("click", () => switchAdminSection(button.dataset.adminSection)));
$("#adminOrderSearch").addEventListener("input", renderAdminOrders);
$("#adminOrderStatusFilter").addEventListener("change", renderAdminOrders);
$("#productForm").addEventListener("submit", submitProduct);
$("#clearForm").addEventListener("click", clearForm);
$("#couponForm").addEventListener("submit", submitCoupon);
$("#clearCouponForm").addEventListener("click", clearCouponForm);
$("#detailAddToCart").addEventListener("click", () => { if (currentProductId) addToCart(currentProductId); });
$("#detailFavorite").addEventListener("click", () => { if (currentProductId) toggleFavorite(currentProductId); });
$("#detailRatingSummary").addEventListener("click", () => $("#reviewsSection").scrollIntoView({ behavior: "smooth", block: "start" }));
$("#reviewForm").addEventListener("submit", submitReview);
$("#reviewPageForm").addEventListener("submit", submitReviewPage);
$("#profileForm").addEventListener("submit", updateProfile);
$("#passwordForm").addEventListener("submit", changePassword);
$("#exportOrders").addEventListener("click", exportOrdersCsv);
$("#productImage").addEventListener("change", async () => previewImage($("#productImagePreview"), $("#productImage").files[0] ? await fileToDataUrl($("#productImage").files[0]) : $("#productImageCurrent").value));
$("#productExtraImageOne").addEventListener("change", async () => previewImage($("#productExtraImageOnePreview"), $("#productExtraImageOne").files[0] ? await fileToDataUrl($("#productExtraImageOne").files[0]) : $("#productExtraImageOneCurrent").value));
$("#productExtraImageTwo").addEventListener("change", async () => previewImage($("#productExtraImageTwoPreview"), $("#productExtraImageTwo").files[0] ? await fileToDataUrl($("#productExtraImageTwo").files[0]) : $("#productExtraImageTwoCurrent").value));

window.addEventListener("hashchange", () => setRoute(location.hash.replace("#", "") || "shop"));
$("#menuButton").addEventListener("click", () => document.body.classList.toggle("mobile-menu-open"));
window.addEventListener("hashchange", () => document.body.classList.remove("mobile-menu-open"));
window.addEventListener("keydown", (event) => { if (event.key === "Escape") document.body.classList.remove("mobile-menu-open"); });

setRoute(location.hash.replace("#", "") || (isAdminPortal ? "admin" : "shop"));
loadProducts({ silent: true }).finally(async () => {
  await loadAccountOrders();
  await loadAdminOrders();
  await loadAdminCoupons();
  renderAll();
});
