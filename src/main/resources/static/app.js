const storageKeys = {
  cart: "colorine-cart",
  user: "colorine-user",
  users: "colorine-users",
};

const apiBase = location.protocol === "file:" ? "http://localhost:8080" : "";

const seedProducts = [
  {
    id: crypto.randomUUID(),
    name: "Brisa de Lavanda",
    scent: "Lavanda e alecrim",
    price: 54.9,
    stock: 18,
    color: "sage",
    description: "Vela calmante em pote de vidro, ideal para banho relaxante ou leitura no fim do dia.",
  },
  {
    id: crypto.randomUUID(),
    name: "Doce Baunilha",
    scent: "Baunilha e tonka",
    price: 49.9,
    stock: 24,
    color: "honey",
    description: "Aroma acolhedor e cremoso, feito para deixar a casa com cheiro de sobremesa elegante.",
  },
  {
    id: crypto.randomUUID(),
    name: "Figo Rosado",
    scent: "Figo, rosas e madeira",
    price: 64.9,
    stock: 10,
    color: "rose",
    description: "Uma vela marcante para presente, com perfume floral frutado e acabamento artesanal.",
  },
  {
    id: crypto.randomUUID(),
    name: "Mar de Linho",
    scent: "Algodao, sal e cedro",
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

const productGrid = document.querySelector("#productGrid");
const productTemplate = document.querySelector("#productTemplate");
const searchInput = document.querySelector("#searchInput");
const cartDrawer = document.querySelector("#cartDrawer");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const checkoutMessage = document.querySelector("#checkoutMessage");
const adminList = document.querySelector("#adminList");
const sessionPill = document.querySelector("#sessionPill");
const productForm = document.querySelector("#productForm");
const productImageInput = document.querySelector("#productImage");
const productImagePreview = document.querySelector("#productImagePreview");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const registerCepInput = document.querySelector("#registerCep");
const adminLayout = document.querySelector("#adminLayout");
const adminLocked = document.querySelector("#adminLocked");
const menuLogoutButton = document.querySelector("#menuLogoutButton");

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
    cart = cart.filter((item) => products.some((product) => product.id === item.productId));
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

function renderImagePreview(imageUrl) {
  productImagePreview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Previa da vela" />` : "Sem imagem selecionada";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function setRoute(route) {
  const targetRoute = route || "shop";
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
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const searchable = `${product.name} ${product.scent} ${product.description}`.toLowerCase();
    return searchable.includes(query);
  });

  productGrid.innerHTML = "";

  if (!filteredProducts.length) {
    productGrid.innerHTML = '<p class="empty-state">Nenhuma vela encontrada.</p>';
    return;
  }

  filteredProducts.forEach((product) => {
    const card = productTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.color = product.color;
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

    const button = card.querySelector(".product-footer button");
    button.querySelector("span").textContent = product.stock > 0 ? "Adicionar" : "Esgotada";
    button.disabled = product.stock <= 0;
    button.addEventListener("click", () => addToCart(product.id));

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
        <p>${product.scent} - ${formatCurrency(product.price)} - ${product.stock} em estoque</p>
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

function renderCart() {
  cartItems.innerHTML = "";
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = formatCurrency(total);

  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty-state">Seu carrinho esta vazio.</p>';
    return;
  }

  cart.forEach((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return;

    const row = document.createElement("article");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <h3>${product.name}</h3>
        <p>${formatCurrency(product.price)} cada</p>
      </div>
      <div class="quantity">
        <button type="button" aria-label="Diminuir ${product.name}">-</button>
        <strong>${item.quantity}</strong>
        <button type="button" aria-label="Aumentar ${product.name}">+</button>
      </div>
    `;

    const [decreaseButton, increaseButton] = row.querySelectorAll("button");
    decreaseButton.addEventListener("click", () => updateCart(product.id, -1));
    increaseButton.addEventListener("click", () => updateCart(product.id, 1));
    cartItems.append(row);
  });
}

function addToCart(productId) {
  const product = products.find((candidate) => candidate.id === productId);
  const cartItem = cart.find((item) => item.productId === productId);

  if (!product || product.stock <= (cartItem?.quantity || 0)) return;

  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }

  writeStorage(storageKeys.cart, cart);
  renderCart();
  openCart();
}

function updateCart(productId, amount) {
  const item = cart.find((candidate) => candidate.productId === productId);
  const product = products.find((candidate) => candidate.id === productId);
  if (!item || !product) return;

  item.quantity += amount;
  if (item.quantity <= 0) {
    cart = cart.filter((candidate) => candidate.productId !== productId);
  }
  if (item.quantity > product.stock) {
    item.quantity = product.stock;
  }

  writeStorage(storageKeys.cart, cart);
  renderCart();
}

function editProduct(productId) {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) return;

  document.querySelector("#productId").value = product.id;
  document.querySelector("#productName").value = product.name;
  document.querySelector("#productScent").value = product.scent;
  document.querySelector("#productPrice").value = product.price;
  document.querySelector("#productStock").value = product.stock;
  document.querySelector("#productColor").value = product.color;
  document.querySelector("#productDescription").value = product.description;
  document.querySelector("#productImageCurrent").value = product.imageUrl || "";
  productImageInput.value = "";
  renderImagePreview(product.imageUrl);
  document.querySelector("#productName").focus();
}

function deleteProduct(productId) {
  deleteProductFromApi(productId);
}

function clearForm() {
  productForm.reset();
  document.querySelector("#productId").value = "";
  document.querySelector("#productImageCurrent").value = "";
  renderImagePreview(null);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function renderAll() {
  renderProducts();
  renderAdminList();
  renderUser();
  renderCart();
}

window.addEventListener("hashchange", () => setRoute(location.hash.replace("#", "")));

document.querySelector("#openCart").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) closeCart();
});

searchInput.addEventListener("input", renderProducts);
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
      imageUrl: await getProductImageFromForm(),
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
    renderUser();
    setFormMessage("#registerMessage", "Conta criada e salva no banco com sucesso.");
    location.hash = "shop";
  } catch (error) {
    setFormMessage("#registerMessage", error.message, true);
  }
});

document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!cart.length) {
    checkoutMessage.textContent = "Adicione uma vela antes de finalizar.";
    return;
  }

  const payment = document.querySelector("#paymentMethod").selectedOptions[0].textContent;
  const orderCode = Math.floor(100000 + Math.random() * 900000);
  checkoutMessage.textContent = `Pedido ${orderCode} criado com pagamento por ${payment}.`;

  cart.forEach((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.quantity);
  });

  cart = [];
  writeStorage(storageKeys.cart, cart);
  renderAll();
});

ensureAdminUser();
setRoute(location.hash.replace("#", "") || "shop");
loadProducts({ silent: true }).finally(renderAll);

async function deleteProductFromApi(productId) {
  try {
    await apiRequest(`/api/candles/${productId}`, {
      method: "DELETE",
      authenticated: true,
    });
    cart = cart.filter((item) => item.productId !== productId);
    writeStorage(storageKeys.cart, cart);
    await loadProducts({ silent: true });
    renderAll();
    setFormMessage("#productMessage", "Vela removida do banco.");
  } catch (error) {
    setFormMessage("#productMessage", error.message, true);
  }
}

