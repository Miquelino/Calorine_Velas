const storageKeys = {
  cart: "colorine-cart",
  user: "colorine-user",
  users: "colorine-users",
  favorites: "colorine-favorites",
  shipping: "colorine-shipping",
};

const apiBase = location.protocol === "file:" ? "http://localhost:8080" : "";

const seedProducts = [
  {
    id: "brisa-de-lavanda",
    name: "Brisa de Lavanda",
    scent: "Lavanda e alecrim",
    size: "250g",
    occasion: "classica",
    mood: "relaxante",
    price: 54.9,
    stock: 18,
    color: "sage",
    description: "Vela calmante em pote de vidro, ideal para banho relaxante ou leitura no fim do dia.",
  },
  {
    id: "doce-baunilha",
    name: "Doce Baunilha",
    scent: "Baunilha e tonka",
    size: "120g",
    occasion: "classica",
    mood: "aconchegante",
    price: 49.9,
    stock: 24,
    color: "honey",
    description: "Aroma acolhedor e cremoso, feito para deixar a casa com cheiro de sobremesa elegante.",
  },
  {
    id: "figo-rosado",
    name: "Figo Rosado",
    scent: "Figo, rosas e madeira",
    size: "250g",
    occasion: "presente",
    mood: "aconchegante",
    price: 64.9,
    stock: 10,
    color: "rose",
    description: "Uma vela marcante para presente, com perfume floral frutado e acabamento artesanal.",
  },
  {
    id: "mar-de-linho",
    name: "Mar de Linho",
    scent: "Algodao, sal e cedro",
    size: "120g",
    occasion: "classica",
    mood: "relaxante",
    price: 59.9,
    stock: 14,
    color: "ocean",
    description: "Fresca e limpa, perfeita para sala, lavabo e ambientes que pedem leveza.",
  },
];

const seedAdmin = {
  id: "admin-colorine",
  name: "Administradora Colorine",
  phone: "",
  email: "admin@colorine.com",
  password: "admin123",
  address: "",
  role: "ADMIN",
  acceptsMarketing: false,
  createdAt: "2026-05-25T00:00:00.000Z",
};

let products = seedProducts;
let cart = readStorage(storageKeys.cart, []);
let user = readStorage(storageKeys.user, null);
let users = readStorage(storageKeys.users, []);
let favoriteIds = readStorage(storageKeys.favorites, []);
let shippingQuote = readStorage(storageKeys.shipping, { cep: "", cost: null, days: null });
let currentProductId = null;

const productGrid = document.querySelector("#productGrid");
const productTemplate = document.querySelector("#productTemplate");
const relatedProducts = document.querySelector("#relatedProducts");
const searchInput = document.querySelector("#searchInput");
const sortProducts = document.querySelector("#sortProducts");
const cartDrawer = document.querySelector("#cartDrawer");
const favoritesDrawer = document.querySelector("#favoritesDrawer");
const cartItems = document.querySelector("#cartItems");
const favoriteItems = document.querySelector("#favoriteItems");
const cartCount = document.querySelector("#cartCount");
const favoriteCount = document.querySelector("#favoriteCount");
const cartTotal = document.querySelector("#cartTotal");
const cartSubtotal = document.querySelector("#cartSubtotal");
const checkoutItems = document.querySelector("#checkoutItems");
const cartDelivery = document.querySelector("#cartDelivery");
const checkoutMessage = document.querySelector("#checkoutMessage");
const accountOrders = document.querySelector("#accountOrders");
const adminList = document.querySelector("#adminList");
const sessionPill = document.querySelector("#sessionPill");
const productForm = document.querySelector("#productForm");
const productImageInput = document.querySelector("#productImage");
const productExtraImageOneInput = document.querySelector("#productExtraImageOne");
const productExtraImageTwoInput = document.querySelector("#productExtraImageTwo");
const productImagePreview = document.querySelector("#productImagePreview");
const productExtraImageOnePreview = document.querySelector("#productExtraImageOnePreview");
const productExtraImageTwoPreview = document.querySelector("#productExtraImageTwoPreview");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const registerCepInput = document.querySelector("#registerCep");
const adminLayout = document.querySelector("#adminLayout");
const adminLocked = document.querySelector("#adminLocked");
const menuLogoutButton = document.querySelector("#menuLogoutButton");
const cartCepInput = document.querySelector("#cartCep");
const shippingMessage = document.querySelector("#shippingMessage");
let selectedDetailView = "photo";
let accountOrderHistory = [];

function readStorage(key, fallback) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function encodeBasicAuth(email, password) {
  return `Basic ${btoa(`${email}:${password}`)}`;
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.authenticated && user?.authHeader ? { Authorization: user.authHeader } : {}),
    ...options.headers,
  };

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "Nao foi possivel concluir a operacao.";
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      if (response.status === 401 || response.status === 403) {
        message = "Acesso negado. Entre com uma conta administradora.";
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadProducts({ silent = false } = {}) {
  try {
    products = await apiRequest("/api/candles");
    cart = cart.filter((item) => products.some((product) => normalizeProductId(product.id) === normalizeProductId(item.productId)));
    writeStorage(storageKeys.cart, cart);
  } catch (error) {
    if (!silent) {
      productGrid.innerHTML = `<p class="empty-state">Nao consegui conectar com o banco agora. Exibindo vitrine local.</p>`;
    }
  }
}

function ensureAdminUser() {
  const hasAdmin = users.some((candidate) => candidate.email === seedAdmin.email);
  if (!hasAdmin) {
    users.push(seedAdmin);
    writeStorage(storageKeys.users, users);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

async function getProductImageFromForm() {
  const file = productImageInput.files[0];
  if (!file) return document.querySelector("#productImageCurrent").value || null;
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem valido.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Escolha uma imagem com ate 2 MB.");
  return fileToDataUrl(file);
}

async function getOptionalProductImage(input, currentSelector) {
  const file = input.files[0];
  if (!file) return document.querySelector(currentSelector).value || null;
  if (!file.type.startsWith("image/")) throw new Error("Selecione arquivos de imagem validos.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Escolha imagens com ate 2 MB.");
  return fileToDataUrl(file);
}

function renderImagePreview(imageUrl) {
  productImagePreview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Previa da vela" />` : "Sem imagem selecionada";
}

function renderExtraImagePreviews(firstImage, secondImage) {
  productExtraImageOnePreview.innerHTML = firstImage ? `<img src="${firstImage}" alt="Previa extra 1" />` : "Sem imagem extra";
  productExtraImageTwoPreview.innerHTML = secondImage ? `<img src="${secondImage}" alt="Previa extra 2" />` : "Sem imagem extra";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function paymentToApi(value) {
  return {
    pix: "PIX",
    card: "CREDIT_CARD",
    boleto: "BOLETO",
  }[value] || "PIX";
}

function paymentLabel(value) {
  return {
    PIX: "Pix",
    CREDIT_CARD: "Cartao de credito",
    BOLETO: "Boleto",
  }[value] || value;
}

function statusLabel(value) {
  return {
    CREATED: "Criado",
    PAID: "Pago",
    CANCELED: "Cancelado",
  }[value] || value;
}

function optionLabel(value) {
  return {
    classica: "Classica",
    presente: "Presente",
    aconchegante: "Aconchegante",
    relaxante: "Relaxante",
  }[value] || value || "-";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSelectedFilters() {
  return [...document.querySelectorAll(".filter-panel input[type='checkbox']:checked")].reduce((selected, input) => {
    const group = input.dataset.filter;
    if (!selected[group]) selected[group] = [];
    selected[group].push(input.value);
    return selected;
  }, {});
}

function getProductFacets(product) {
  const searchable = normalizeText(`${product.name} ${product.scent} ${product.description}`);
  const size = getProductSize(product);
  const occasion = product.occasion || (searchable.includes("presente") ? "presente" : "classica");
  const mood = product.mood || (/(lavanda|alecrim|algodao|sal|cedro|fresca|limpa|leveza)/.test(searchable) ? "relaxante" : "aconchegante");

  return {
    scent: searchable,
    size: normalizeText(size),
    occasion: normalizeText(occasion),
    mood: normalizeText(mood),
  };
}

function getProductSize(product) {
  return product.size || (Number(product.price) >= 55 ? "250g" : "120g");
}

function productMatchesFilters(product, selectedFilters) {
  const facets = getProductFacets(product);
  return Object.entries(selectedFilters).every(([group, values]) => {
    if (!values.length) return true;
    const facet = facets[group] || "";
    return values.some((value) => facet.includes(normalizeText(value)));
  });
}

function sortProductList(productList) {
  const sortedProducts = [...productList];
  const sortMode = sortProducts.value;

  if (sortMode === "price-asc") {
    sortedProducts.sort((first, second) => Number(first.price) - Number(second.price));
  }
  if (sortMode === "price-desc") {
    sortedProducts.sort((first, second) => Number(second.price) - Number(first.price));
  }
  if (sortMode === "newest") {
    sortedProducts.reverse();
  }

  return sortedProducts;
}

function normalizeProductId(value) {
  return String(value);
}

function findProduct(productIdValue) {
  return products.find((product) => normalizeProductId(product.id) === normalizeProductId(productIdValue));
}

function isFavoriteProduct(productIdValue) {
  return favoriteIds.map(normalizeProductId).includes(normalizeProductId(productIdValue));
}

function setRoute(route) {
  const routeName = route || "shop";
  const productRoute = routeName.startsWith("product-");
  const targetRoute = productRoute ? "product" : routeName;

  if (productRoute) {
    currentProductId = routeName.replace("product-", "");
    renderProductDetail();
    if (!currentProductId) return;
  }

  if (targetRoute === "account" && !user) {
    setFormMessage("#loginMessage", "Entre na sua conta para acessar essa area.", true);
    location.hash = "login";
    return;
  }

  if (targetRoute === "admin" && !isAdmin()) {
    setFormMessage("#loginMessage", "Entre com uma conta administradora para cadastrar velas.", true);
    location.hash = "login";
    return;
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === targetRoute);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === targetRoute);
  });
  updateAdminAccess();
  if (targetRoute === "account") loadAccountOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openProduct(id) {
  selectedDetailView = "photo";
  location.hash = `product-${normalizeProductId(id)}`;
}

function renderProductDetail() {
  const product = findProduct(currentProductId);
  if (!product) {
    currentProductId = null;
    location.hash = "shop";
    return;
  }

  const image = document.querySelector("#detailImage");
  const media = document.querySelector("#detailMedia");
  media.dataset.color = product.color || "";
  media.classList.toggle("has-photo", Boolean(product.imageUrl));
  image.src = product.imageUrl || "";
  image.alt = product.imageUrl ? product.name : "";
  document.querySelector("#detailBreadcrumb").textContent = product.name;
  document.querySelector("#detailScent").textContent = product.scent;
  document.querySelector("#detailName").textContent = product.name;
  document.querySelector("#detailDescription").textContent = product.description;
  document.querySelector("#detailAroma").textContent = product.scent;
  document.querySelector("#detailSize").textContent = getProductSize(product);
  document.querySelector("#detailStock").textContent = product.stock > 0 ? `${product.stock} em estoque` : "Esgotada";
  document.querySelector("#detailOccasion").textContent = optionLabel(product.occasion);
  document.querySelector("#detailMood").textContent = optionLabel(product.mood);
  document.querySelector("#detailPrice").textContent = formatCurrency(product.price);

  const favoriteButton = document.querySelector("#detailFavorite");
  const isFavorite = isFavoriteProduct(product.id);
  favoriteButton.classList.toggle("is-active", isFavorite);
  favoriteButton.setAttribute("aria-label", isFavorite ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`);

  const addButton = document.querySelector("#detailAddToCart");
  addButton.textContent = product.stock > 0 ? "Adicionar ao carrinho" : "Produto esgotado";
  addButton.disabled = product.stock <= 0;
  renderDetailThumbs(product);
  renderRelatedProducts(product);
}

function getRelatedProducts(currentProduct) {
  const currentFacets = getProductFacets(currentProduct);
  return products
    .filter((product) => normalizeProductId(product.id) !== normalizeProductId(currentProduct.id))
    .map((product, index) => {
      const facets = getProductFacets(product);
      let score = 0;
      if (product.color === currentProduct.color) score += 3;
      if (facets.mood === currentFacets.mood) score += 2;
      if (facets.size === currentFacets.size) score += 1;
      return { product, score, index };
    })
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, 3)
    .map((item) => item.product);
}

function renderRelatedProducts(currentProduct) {
  const related = getRelatedProducts(currentProduct);
  relatedProducts.innerHTML = "";

  if (!related.length) {
    relatedProducts.innerHTML = '<p class="empty-state">Cadastre mais velas para mostrar recomendacoes.</p>';
    return;
  }

  related.forEach((product) => {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.color = product.color;
    card.dataset.productId = normalizeProductId(product.id);
    if (product.imageUrl) {
      const photo = card.querySelector(".product-photo");
      photo.src = product.imageUrl;
      photo.alt = product.name;
      card.classList.add("has-photo");
    }
    card.querySelector(".tag").textContent = product.scent;
    card.querySelector("h3").textContent = product.name;
    card.querySelector("p").textContent = product.description;
    card.querySelector("strong").textContent = formatCurrency(product.price);

    const favoriteButton = card.querySelector(".product-favorite");
    const isFavorite = isFavoriteProduct(product.id);
    favoriteButton.classList.toggle("is-active", isFavorite);
    favoriteButton.setAttribute("aria-label", isFavorite ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`);
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(product.id);
    });

    const button = card.querySelector(".product-footer button");
    button.querySelector("span").textContent = product.stock > 0 ? "Adicionar" : "Esgotada";
    button.disabled = product.stock <= 0;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(product.id);
    });

    relatedProducts.append(card);
  });
}

function getDetailViews(product) {
  return [
    { id: "photo", label: "Foto", imageUrl: product.imageUrl || "", color: product.color || "clay" },
    { id: "extra-one", label: "Extra 1", imageUrl: product.extraImageUrlOne || "", color: "honey" },
    { id: "extra-two", label: "Extra 2", imageUrl: product.extraImageUrlTwo || "", color: product.color || "sage" },
  ];
}

function setDetailView(product, viewId) {
  const views = getDetailViews(product);
  const view = views.find((candidate) => candidate.id === viewId) || views[0];
  selectedDetailView = view.id;

  const image = document.querySelector("#detailImage");
  const media = document.querySelector("#detailMedia");
  media.dataset.color = view.color;
  media.classList.toggle("has-photo", Boolean(view.imageUrl));
  image.src = view.imageUrl;
  image.alt = view.imageUrl ? product.name : "";
}

function renderDetailThumbs(product) {
  const thumbs = document.querySelector("#detailThumbs");
  const views = getDetailViews(product);
  thumbs.innerHTML = "";

  views.forEach((view) => {
    const button = document.createElement("button");
    button.className = "detail-thumb";
    button.type = "button";
    button.dataset.color = view.color;
    button.classList.toggle("is-active", view.id === selectedDetailView);
    button.setAttribute("aria-label", `Ver ${view.label} de ${product.name}`);
    button.innerHTML = view.imageUrl ? `<img src="${view.imageUrl}" alt="" />` : '<span class="product-flame"></span><span class="product-jar"></span>';
    button.addEventListener("click", () => {
      setDetailView(product, view.id);
      renderDetailThumbs(product);
    });
    thumbs.append(button);
  });

  setDetailView(product, selectedDetailView);
}

function renderProducts() {
  const query = normalizeText(searchInput.value.trim());
  const selectedFilters = getSelectedFilters();
  const filteredProducts = sortProductList(products.filter((product) => {
    const searchable = normalizeText(`${product.name} ${product.scent} ${product.description}`);
    return searchable.includes(query) && productMatchesFilters(product, selectedFilters);
  }));

  productGrid.innerHTML = "";

  if (!filteredProducts.length) {
    productGrid.innerHTML = '<p class="empty-state">Nenhuma vela encontrada.</p>';
    return;
  }

  filteredProducts.forEach((product) => {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.color = product.color;
    card.dataset.productId = normalizeProductId(product.id);
    if (product.imageUrl) {
      const photo = card.querySelector(".product-photo");
      photo.src = product.imageUrl;
      photo.alt = product.name;
      card.classList.add("has-photo");
    }
    card.querySelector(".tag").textContent = product.scent;
    card.querySelector("h3").textContent = product.name;
    card.querySelector("p").textContent = product.description;
    card.querySelector("strong").textContent = formatCurrency(product.price);

    const favoriteButton = card.querySelector(".product-favorite");
    const isFavorite = isFavoriteProduct(product.id);
    favoriteButton.classList.toggle("is-active", isFavorite);
    favoriteButton.setAttribute("aria-label", isFavorite ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`);
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(product.id);
    });

    const button = card.querySelector(".product-footer button");
    button.querySelector("span").textContent = product.stock > 0 ? "Adicionar" : "Esgotada";
    button.disabled = product.stock <= 0;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(product.id);
    });

    productGrid.append(card);
  });
}

function renderAdminList() {
  adminList.innerHTML = "";

  if (!products.length) {
    adminList.innerHTML = '<p class="empty-state">Cadastre a primeira vela para ela aparecer na loja.</p>';
    return;
  }

  products.forEach((product) => {
    const item = document.createElement("article");
    item.className = "admin-item";
    item.innerHTML = `
      <div>
        <h3>${product.name}</h3>
        <p>${product.scent} - ${getProductSize(product)} - ${optionLabel(product.mood)} - ${formatCurrency(product.price)} - ${product.stock} em estoque</p>
      </div>
      <div class="admin-actions">
        <button class="small-button" type="button" aria-label="Editar ${product.name}">Editar</button>
        <button class="small-button" type="button" aria-label="Remover ${product.name}">Excluir</button>
      </div>
    `;

    const [editButton, deleteButton] = item.querySelectorAll("button");
    editButton.addEventListener("click", () => editProduct(product.id));
    deleteButton.addEventListener("click", () => deleteProduct(product.id));

    adminList.append(item);
  });
}

function renderUser() {
  sessionPill.textContent = user ? `${user.role === "ADMIN" ? "Admin" : "Cliente"}: ${user.name}` : "Visitante";
  document.querySelector("#loginEmail").value = user?.email || "";
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", !isAdmin());
  });
  document.querySelectorAll(".guest-only").forEach((element) => {
    element.classList.toggle("hidden", Boolean(user));
  });
  document.querySelectorAll(".logged-only").forEach((element) => {
    element.classList.toggle("hidden", !user);
  });
  renderAccount();
  updateAdminAccess();
}

function renderAccount() {
  document.querySelector("#accountTitle").textContent = user ? `Ola, ${user.name}` : "Conta";
  document.querySelector("#accountName").textContent = user?.name || "-";
  document.querySelector("#accountEmail").textContent = user?.email || "-";
  document.querySelector("#accountPhone").textContent = user?.phone || "-";
  renderAccountAddress(user?.address);
  document.querySelector("#accountRole").textContent = user?.role === "ADMIN" ? "Administrador" : user ? "Cliente" : "-";
  renderAccountOrders();
}

function renderAccountOrders() {
  if (!user) {
    accountOrders.innerHTML = '<p class="empty-state">Entre na conta para ver seus pedidos.</p>';
    return;
  }

  if (!accountOrderHistory.length) {
    accountOrders.innerHTML = '<p class="empty-state">Nenhum pedido salvo ainda.</p>';
    return;
  }

  accountOrders.innerHTML = "";
  accountOrderHistory.forEach((order) => {
    const item = document.createElement("article");
    item.className = "order-card";
    item.innerHTML = `
      <div>
        <h3>Pedido #${order.id}</h3>
        <p>${formatDate(order.createdAt)} - ${paymentLabel(order.paymentMethod)} - ${statusLabel(order.status)}</p>
      </div>
      <strong>${formatCurrency(order.total)}</strong>
    `;
    accountOrders.append(item);
  });
}

async function loadAccountOrders() {
  if (!user?.id || !user?.authHeader) {
    accountOrderHistory = [];
    renderAccountOrders();
    return;
  }

  try {
    accountOrderHistory = await apiRequest(`/api/orders/customer/${user.id}`, { authenticated: true });
  } catch {
    accountOrderHistory = [];
  }

  renderAccountOrders();
}

function updateAdminAccess() {
  adminLayout.classList.toggle("locked", !isAdmin());
  adminLocked.classList.toggle("visible", !isAdmin());
}

function setFormMessage(elementId, text, isError = false) {
  const message = document.querySelector(elementId);
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function setCepMessage(text, isError = false) {
  const message = document.querySelector("#cepMessage");
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function buildRegisterAddress() {
  const cep = onlyDigits(document.querySelector("#registerCep").value);
  const street = document.querySelector("#registerStreet").value.trim();
  const number = document.querySelector("#registerNumber").value.trim();
  const neighborhood = document.querySelector("#registerNeighborhood").value.trim();
  const complement = document.querySelector("#registerComplement").value.trim();
  const city = document.querySelector("#registerCity").value.trim();
  const state = document.querySelector("#registerState").value.trim().toUpperCase();

  if (cep.length !== 8) throw new Error("Informe um CEP valido.");
  if (!street || !number || !neighborhood || !city || !state) {
    throw new Error("Complete o endereco com rua, numero, bairro, cidade e UF.");
  }

  return {
    cep: formatCep(cep),
    street,
    number,
    neighborhood,
    complement,
    city,
    state,
  };
}

function renderAccountAddress(address) {
  const fallback = "-";

  if (!address) {
    document.querySelector("#accountAddressCep").textContent = fallback;
    document.querySelector("#accountAddressStreet").textContent = fallback;
    document.querySelector("#accountAddressNumber").textContent = fallback;
    document.querySelector("#accountAddressNeighborhood").textContent = fallback;
    document.querySelector("#accountAddressComplement").textContent = fallback;
    document.querySelector("#accountAddressCityState").textContent = fallback;
    return;
  }

  if (typeof address === "string") {
    document.querySelector("#accountAddressCep").textContent = fallback;
    document.querySelector("#accountAddressStreet").textContent = address || fallback;
    document.querySelector("#accountAddressNumber").textContent = fallback;
    document.querySelector("#accountAddressNeighborhood").textContent = fallback;
    document.querySelector("#accountAddressComplement").textContent = fallback;
    document.querySelector("#accountAddressCityState").textContent = fallback;
    return;
  }

  document.querySelector("#accountAddressCep").textContent = address.cep || fallback;
  document.querySelector("#accountAddressStreet").textContent = address.street || fallback;
  document.querySelector("#accountAddressNumber").textContent = address.number || fallback;
  document.querySelector("#accountAddressNeighborhood").textContent = address.neighborhood || fallback;
  document.querySelector("#accountAddressComplement").textContent = address.complement || fallback;
  document.querySelector("#accountAddressCityState").textContent = address.city && address.state ? `${address.city} - ${address.state}` : fallback;
}

async function searchCepAddress() {
  const cep = onlyDigits(registerCepInput.value);
  registerCepInput.value = formatCep(cep);

  if (cep.length === 0) {
    setCepMessage("Digite o CEP para preencher o endereco.");
    return;
  }
  if (cep.length !== 8) {
    setCepMessage("Digite um CEP com 8 numeros.", true);
    return;
  }

  setCepMessage("Buscando endereco pelo CEP...");
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data.erro) throw new Error();

    document.querySelector("#registerStreet").value = data.logradouro || "";
    document.querySelector("#registerNeighborhood").value = data.bairro || "";
    document.querySelector("#registerCity").value = data.localidade || "";
    document.querySelector("#registerState").value = data.uf || "";
    setCepMessage("Endereco encontrado. Complete numero e bairro se necessario.");
    document.querySelector("#registerNumber").focus();
  } catch {
    setCepMessage("Nao encontrei esse CEP. Preencha o endereco manualmente.", true);
  }
}

function findRegisteredUser(email) {
  const normalizedEmail = normalizeEmail(email);
  return users.find((candidate) => candidate.email === normalizedEmail);
}

function isAdmin() {
  return user?.role === "ADMIN";
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);
}

function getShippingCost(subtotal = getCartSubtotal()) {
  if (!cart.length || shippingQuote.cost === null) return 0;
  return subtotal >= 180 ? 0 : shippingQuote.cost;
}

function renderShipping(subtotal = getCartSubtotal()) {
  const shippingCost = getShippingCost(subtotal);
  cartCepInput.value = shippingQuote.cep || "";

  if (!cart.length) {
    cartDelivery.textContent = "A calcular";
    shippingMessage.textContent = "Informe o CEP para calcular uma entrega estimada.";
    return;
  }

  if (shippingQuote.cost === null) {
    cartDelivery.textContent = "A calcular";
    shippingMessage.textContent = "Informe o CEP para calcular uma entrega estimada.";
    return;
  }

  cartDelivery.textContent = shippingCost === 0 ? "Gratis" : formatCurrency(shippingCost);
  shippingMessage.textContent = `Entrega estimada em ${shippingQuote.days} dias uteis para ${shippingQuote.cep}.`;
}

function calculateShipping() {
  const cep = onlyDigits(cartCepInput.value);
  cartCepInput.value = formatCep(cep);

  if (cep.length !== 8) {
    shippingQuote = { cep: "", cost: null, days: null };
    localStorage.removeItem(storageKeys.shipping);
    renderCart();
    shippingMessage.textContent = "Digite um CEP com 8 numeros.";
    return;
  }

  const subtotal = getCartSubtotal();
  const baseCost = 12.9 + (Number(cep.slice(-2)) % 7);
  const days = 3 + (Number(cep[0]) % 4);
  shippingQuote = {
    cep: formatCep(cep),
    cost: Number(baseCost.toFixed(2)),
    days,
  };

  writeStorage(storageKeys.shipping, shippingQuote);
  renderCart();
  if (subtotal >= 180) {
    shippingMessage.textContent = `Entrega gratis estimada em ${days} dias uteis para ${shippingQuote.cep}.`;
  }
}

function renderCart() {
  cartItems.innerHTML = "";
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getCartSubtotal();
  const shippingCost = getShippingCost(subtotal);
  const total = subtotal + shippingCost;

  cartCount.textContent = totalItems;
  checkoutItems.textContent = totalItems;
  cartSubtotal.textContent = formatCurrency(subtotal);
  cartTotal.textContent = formatCurrency(total);
  renderShipping(subtotal);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty-state">Seu carrinho esta vazio.</p>';
    return;
  }

  cart.forEach((item) => {
    const product = findProduct(item.productId);
    if (!product) return;

    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <h3>${product.name}</h3>
        <p>${formatCurrency(product.price)} cada</p>
        <strong class="cart-line-total">${formatCurrency(product.price * item.quantity)}</strong>
      </div>
      <div class="cart-item-actions">
        <div class="quantity">
          <button type="button" aria-label="Diminuir ${product.name}">-</button>
          <strong>${item.quantity}</strong>
          <button type="button" aria-label="Aumentar ${product.name}">+</button>
        </div>
        <button class="remove-item" type="button" aria-label="Remover ${product.name} do carrinho">Remover</button>
      </div>
    `;

    const [decreaseButton, increaseButton] = row.querySelectorAll(".quantity button");
    const removeButton = row.querySelector(".remove-item");
    decreaseButton.addEventListener("click", () => updateCart(product.id, -1));
    increaseButton.addEventListener("click", () => updateCart(product.id, 1));
    removeButton.addEventListener("click", () => removeFromCart(product.id));
    cartItems.append(row);
  });
}

function renderFavorites() {
  favoriteItems.innerHTML = "";
  const favoriteProducts = favoriteIds
    .map((favoriteId) => findProduct(favoriteId))
    .filter(Boolean);

  favoriteCount.textContent = favoriteProducts.length;

  if (!favoriteProducts.length) {
    favoriteItems.innerHTML = '<p class="empty-state">Nenhuma vela favorita ainda.</p>';
    return;
  }

  favoriteProducts.forEach((product) => {
    const row = document.createElement("article");
    row.className = "cart-item favorite-item";
    row.innerHTML = `
      ${product.imageUrl ? `<img class="favorite-thumb" src="${product.imageUrl}" alt="${product.name}" />` : '<span class="favorite-thumb" aria-hidden="true"></span>'}
      <div>
        <h3>${product.name}</h3>
        <p>${product.scent} - ${formatCurrency(product.price)}</p>
      </div>
      <button class="small-button" type="button" aria-label="Remover ${product.name} dos favoritos">Remover</button>
    `;

    row.querySelector("button").addEventListener("click", () => toggleFavorite(product.id));
    favoriteItems.append(row);
  });
}

function toggleFavorite(id) {
  const normalizedId = normalizeProductId(id);
  if (isFavoriteProduct(normalizedId)) {
    favoriteIds = favoriteIds.filter((favoriteId) => normalizeProductId(favoriteId) !== normalizedId);
  } else {
    favoriteIds.push(normalizedId);
  }

  writeStorage(storageKeys.favorites, favoriteIds);
  renderProducts();
  renderFavorites();
  if (currentProductId) renderProductDetail();
}

function addToCart(id) {
  const normalizedId = normalizeProductId(id);
  const product = findProduct(normalizedId);
  const cartItem = cart.find((item) => normalizeProductId(item.productId) === normalizedId);

  if (!product || product.stock <= (cartItem?.quantity || 0)) return;

  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({ productId: normalizedId, quantity: 1 });
  }

  writeStorage(storageKeys.cart, cart);
  renderCart();
  openCart();
}

function updateCart(id, amount) {
  const normalizedId = normalizeProductId(id);
  const item = cart.find((candidate) => normalizeProductId(candidate.productId) === normalizedId);
  const product = findProduct(normalizedId);
  if (!item || !product) return;

  item.quantity += amount;
  if (item.quantity <= 0) {
    cart = cart.filter((candidate) => normalizeProductId(candidate.productId) !== normalizedId);
  }
  if (item.quantity > product.stock) {
    item.quantity = product.stock;
  }

  writeStorage(storageKeys.cart, cart);
  renderCart();
}

function removeFromCart(id) {
  const normalizedId = normalizeProductId(id);
  cart = cart.filter((candidate) => normalizeProductId(candidate.productId) !== normalizedId);
  writeStorage(storageKeys.cart, cart);
  renderCart();
}

function editProduct(productId) {
  const product = findProduct(productId);
  if (!product) return;

  document.querySelector("#productId").value = product.id;
  document.querySelector("#productName").value = product.name;
  document.querySelector("#productScent").value = product.scent;
  document.querySelector("#productPrice").value = product.price;
  document.querySelector("#productStock").value = product.stock;
  document.querySelector("#productColor").value = product.color;
  document.querySelector("#productSize").value = product.size || getProductSize(product);
  document.querySelector("#productOccasion").value = product.occasion || "classica";
  document.querySelector("#productMood").value = product.mood || "aconchegante";
  document.querySelector("#productDescription").value = product.description;
  document.querySelector("#productImageCurrent").value = product.imageUrl || "";
  document.querySelector("#productExtraImageOneCurrent").value = product.extraImageUrlOne || "";
  document.querySelector("#productExtraImageTwoCurrent").value = product.extraImageUrlTwo || "";
  productImageInput.value = "";
  productExtraImageOneInput.value = "";
  productExtraImageTwoInput.value = "";
  renderImagePreview(product.imageUrl);
  renderExtraImagePreviews(product.extraImageUrlOne, product.extraImageUrlTwo);
  document.querySelector("#productName").focus();
}

function deleteProduct(productId) {
  deleteProductFromApi(productId);
}

function clearForm() {
  productForm.reset();
  document.querySelector("#productId").value = "";
  document.querySelector("#productImageCurrent").value = "";
  document.querySelector("#productExtraImageOneCurrent").value = "";
  document.querySelector("#productExtraImageTwoCurrent").value = "";
  renderImagePreview(null);
  renderExtraImagePreviews(null, null);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function openFavorites() {
  favoritesDrawer.classList.add("open");
  favoritesDrawer.setAttribute("aria-hidden", "false");
}

function closeFavorites() {
  favoritesDrawer.classList.remove("open");
  favoritesDrawer.setAttribute("aria-hidden", "true");
}

function renderAll() {
  renderProducts();
  renderAdminList();
  renderUser();
  renderCart();
  renderFavorites();
  if (currentProductId) renderProductDetail();
}

window.addEventListener("hashchange", () => setRoute(location.hash.replace("#", "")));

document.querySelector("#openCart").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
document.querySelector("#openFavorites").addEventListener("click", openFavorites);
document.querySelector("#closeFavorites").addEventListener("click", closeFavorites);
document.querySelector("#detailFavorite").addEventListener("click", () => {
  if (currentProductId) toggleFavorite(currentProductId);
});
document.querySelector("#detailAddToCart").addEventListener("click", () => {
  if (currentProductId) addToCart(currentProductId);
});
cartCepInput.addEventListener("input", () => {
  cartCepInput.value = formatCep(cartCepInput.value);
});
document.querySelector("#calculateShipping").addEventListener("click", calculateShipping);
cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) closeCart();
});
favoritesDrawer.addEventListener("click", (event) => {
  if (event.target === favoritesDrawer) closeFavorites();
});

searchInput.addEventListener("input", renderProducts);
sortProducts.addEventListener("change", renderProducts);
productGrid.addEventListener("click", (event) => {
  if (event.target.closest("button, a, input, select, textarea")) return;
  const card = event.target.closest(".product-card");
  if (card?.dataset.productId) openProduct(card.dataset.productId);
});
relatedProducts.addEventListener("click", (event) => {
  if (event.target.closest("button, a, input, select, textarea")) return;
  const card = event.target.closest(".product-card");
  if (card?.dataset.productId) openProduct(card.dataset.productId);
});
document.querySelectorAll(".filter-panel input[type='checkbox']").forEach((input) => {
  input.addEventListener("change", renderProducts);
});
document.querySelector("#clearForm").addEventListener("click", clearForm);
registerCepInput.addEventListener("input", () => {
  registerCepInput.value = formatCep(registerCepInput.value);
  setCepMessage("Digite o CEP para preencher o endereco.");
});
registerCepInput.addEventListener("blur", searchCepAddress);
if (productImageInput) productImageInput.addEventListener("change", async () => {
  try {
    renderImagePreview(await getProductImageFromForm());
  } catch (error) {
    productImageInput.value = "";
    setFormMessage("#productMessage", error.message, true);
  }
});
if (productExtraImageOneInput) productExtraImageOneInput.addEventListener("change", async () => {
  try {
    const imageUrl = await getOptionalProductImage(productExtraImageOneInput, "#productExtraImageOneCurrent");
    productExtraImageOnePreview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Previa extra 1" />` : "Sem imagem extra";
  } catch (error) {
    productExtraImageOneInput.value = "";
    setFormMessage("#productMessage", error.message, true);
  }
});
if (productExtraImageTwoInput) productExtraImageTwoInput.addEventListener("change", async () => {
  try {
    const imageUrl = await getOptionalProductImage(productExtraImageTwoInput, "#productExtraImageTwoCurrent");
    productExtraImageTwoPreview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Previa extra 2" />` : "Sem imagem extra";
  } catch (error) {
    productExtraImageTwoInput.value = "";
    setFormMessage("#productMessage", error.message, true);
  }
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const productId = document.querySelector("#productId").value;

  try {
    const formProduct = {
      name: document.querySelector("#productName").value.trim(),
      scent: document.querySelector("#productScent").value.trim(),
      description: document.querySelector("#productDescription").value.trim(),
      price: Number(document.querySelector("#productPrice").value),
      stock: Number(document.querySelector("#productStock").value),
      color: document.querySelector("#productColor").value,
      size: document.querySelector("#productSize").value,
      occasion: document.querySelector("#productOccasion").value,
      mood: document.querySelector("#productMood").value,
      imageUrl: await getProductImageFromForm(),
      extraImageUrlOne: await getOptionalProductImage(productExtraImageOneInput, "#productExtraImageOneCurrent"),
      extraImageUrlTwo: await getOptionalProductImage(productExtraImageTwoInput, "#productExtraImageTwoCurrent"),
    };
    if (productId) {
      await apiRequest(`/api/candles/${productId}`, {
        method: "PUT",
        authenticated: true,
        body: JSON.stringify(formProduct),
      });
      setFormMessage("#productMessage", "Vela atualizada no banco.");
    } else {
      await apiRequest("/api/candles", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify(formProduct),
      });
      setFormMessage("#productMessage", "Vela cadastrada no banco.");
    }

    clearForm();
    await loadProducts({ silent: true });
    renderAll();
    location.hash = "shop";
  } catch (error) {
    setFormMessage("#productMessage", error.message, true);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = normalizeEmail(document.querySelector("#loginEmail").value);
  const password = document.querySelector("#loginPassword").value;

  try {
    const loggedUser = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    user = {
      ...loggedUser,
      role: loggedUser.role || "CUSTOMER",
      authHeader: encodeBasicAuth(email, password),
    };
    writeStorage(storageKeys.user, user);
    await loadAccountOrders();
    renderUser();
    setFormMessage("#loginMessage", "Login realizado com sucesso.");
    location.hash = "shop";
  } catch (error) {
    setFormMessage("#loginMessage", error.message, true);
  }
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  logout();
});

menuLogoutButton.addEventListener("click", () => {
  logout();
});

function logout() {
  user = null;
  accountOrderHistory = [];
  localStorage.removeItem(storageKeys.user);
  renderUser();
  setFormMessage("#loginMessage", "Voce saiu da conta.");
  location.hash = "login";
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#registerPassword").value;
  const passwordConfirm = document.querySelector("#registerPasswordConfirm").value;
  const email = normalizeEmail(document.querySelector("#registerEmail").value);

  if (password !== passwordConfirm) {
    setFormMessage("#registerMessage", "As senhas precisam ser iguais.", true);
    return;
  }

  try {
    const registerPayload = {
      name: document.querySelector("#registerName").value.trim(),
      phone: document.querySelector("#registerPhone").value.trim(),
      email,
      password,
      address: buildRegisterAddress(),
      acceptsMarketing: document.querySelector("#registerMarketing").checked,
    };

    const registeredUser = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerPayload),
    });

    user = {
      ...registeredUser,
      role: registeredUser.role || "CUSTOMER",
      authHeader: encodeBasicAuth(email, password),
    };
    writeStorage(storageKeys.user, user);
    registerForm.reset();
    await loadAccountOrders();
    renderUser();
    setFormMessage("#registerMessage", "Conta criada e salva no banco com sucesso.");
    location.hash = "shop";
  } catch (error) {
    setFormMessage("#registerMessage", error.message, true);
  }
});

document.querySelector("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!cart.length) {
    checkoutMessage.textContent = "Adicione uma vela antes de finalizar.";
    return;
  }

  if (!user?.id || !user?.authHeader) {
    checkoutMessage.textContent = "Entre na sua conta para salvar e finalizar o pedido.";
    location.hash = "login";
    return;
  }

  if (shippingQuote.cost === null) {
    checkoutMessage.textContent = "Calcule o frete com o CEP antes de finalizar.";
    return;
  }

  const address = document.querySelector("#deliveryAddress").value.trim();
  if (!address) {
    checkoutMessage.textContent = "Informe o endereco de entrega.";
    return;
  }

  const subtotal = getCartSubtotal();
  const shippingCost = getShippingCost(subtotal);
  const payment = document.querySelector("#paymentMethod").value;

  try {
    const order = await apiRequest("/api/orders", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        customerId: user.id,
        deliveryAddress: address,
        paymentMethod: paymentToApi(payment),
        items: cart.map((item) => ({
          productId: Number(item.productId),
          quantity: item.quantity,
        })),
      }),
    });

    checkoutMessage.textContent = `Pedido #${order.id} confirmado. ${paymentLabel(order.paymentMethod)}, entrega ${shippingCost === 0 ? "gratis" : formatCurrency(shippingCost)} em ${shippingQuote.days} dias uteis.`;
    cart = [];
    writeStorage(storageKeys.cart, cart);
    await loadProducts({ silent: true });
    await loadAccountOrders();
    renderAll();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
});

ensureAdminUser();
setRoute(location.hash.replace("#", "") || "shop");
loadProducts({ silent: true }).finally(async () => {
  await loadAccountOrders();
  renderAll();
});

async function deleteProductFromApi(productId) {
  try {
    await apiRequest(`/api/candles/${productId}`, {
      method: "DELETE",
      authenticated: true,
    });
    cart = cart.filter((item) => normalizeProductId(item.productId) !== normalizeProductId(productId));
    favoriteIds = favoriteIds.filter((favoriteId) => normalizeProductId(favoriteId) !== normalizeProductId(productId));
    writeStorage(storageKeys.cart, cart);
    writeStorage(storageKeys.favorites, favoriteIds);
    await loadProducts({ silent: true });
    renderAll();
    setFormMessage("#productMessage", "Vela removida do banco.");
  } catch (error) {
    setFormMessage("#productMessage", error.message, true);
  }
}

