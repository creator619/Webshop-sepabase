// --- SEGÉDFÜGGVÉNYEK ---

// Toast értesítés megjelenítése
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>✨</span> ${message}`;

    container.appendChild(toast);

    // Eltüntetés 3 másodperc után
    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Felhasználói állapot ellenőrzése és menü frissítése
function updateAuthUI() {
    const user = JSON.parse(localStorage.getItem("user"));
    const userNav = document.getElementById("user-nav");

    if (user && userNav) {
        const adminLink = user.is_admin ? `<span class="username" onclick="window.location.href='admin.html'" style="color: var(--accent); margin-right: 15px;">⚙️ Admin</span>` : '';
        userNav.innerHTML = `
            <li class="user-info">
                ${adminLink}
                <span class="username" onclick="window.location.href='profile.html'" title="Profil megtekintése">👤 ${user.name}</span>
                <button class="logout-btn" onclick="logout()">Kijelentkezés</button>
            </li>
        `;
    }
}

function logout() {
    localStorage.removeItem("user");
    showToast("Sikeres kijelentkezés!");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);
}

// Funkciók inicializálása
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();

    // Mobil menü kapcsoló
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const menu = document.getElementById("main-menu");
    if (toggleBtn && menu) {
        toggleBtn.addEventListener("click", () => {
            menu.classList.toggle("active");
            toggleBtn.textContent = menu.classList.contains("active") ? "✕" : "☰";
        });
    }
});

// --- SUPABASE INICIALIZÁLÁS ---
var SUPABASE_URL = "https://vktmrcvvujnwnogmqktk.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdG1yY3Z2dWpud25vZ21xa3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzA1NTQsImV4cCI6MjA4OTMwNjU1NH0.fFgyD-GfcFGiUwtAti_rUE2U21cwIebQXRczVlYP1-I";
var supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
window.supabaseClient = supabaseClient;

// Segédfüggvény a termékek megjelenítéséhez
function renderProducts(list, containerId = "product-list") {
    const container = document.getElementById(containerId) || document.getElementById("wishlist-list") || document.getElementById("related-list");
    if (!container) return;

    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 50px;'>Nincs megjeleníthető termék.</p>";
        return;
    }

    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    list.forEach((p, index) => {
        const isHearted = wishlist.includes(p.id) ? 'active' : '';
        const heartIcon = isHearted ? '❤️' : '🤍';
        
        // Kép útvonal kezelése: Ha tartalmazza a Supabase URL-t vagy sima URL, akkor hagyjuk, 
        // ha pedig régi helyi fájl, akkor alapértelmezett.
        const imgSrc = p.image;

        const currentStock = (p.stock === null || p.stock === undefined) ? 10 : p.stock;
        const stockStatus = currentStock > 0 ? `<p class="stock-info">Készleten: ${currentStock} db</p>` : `<p class="stock-info out-of-stock">Elfogyott</p>`;
        const disableClass = currentStock > 0 ? '' : 'disabled';

        container.innerHTML += `
            <div class="product-card ${disableClass}" onclick="${currentStock > 0 ? `openProduct(${p.id})` : ''}" style="animation-delay: ${index * 0.1}s">
                <button class="wishlist-btn ${isHearted}" onclick="toggleWishlist(event, ${p.id})">${heartIcon}</button>
                <img src="${imgSrc}" alt="${p.name}" onerror="this.src='hatter.jpg'">
                <h3>${p.name}</h3>
                <p>${p.price.toLocaleString()} Ft</p>
                ${stockStatus}
            </div>
        `;
    });
}

// Termékek lekérése Supabase-ről
async function fetchProducts() {
    try {
        if (!supabaseClient) throw new Error("Supabase nincs betöltve");
        
        const { data, error } = await supabaseClient
            .from('products')
            .select('*');

        if (error) throw error;
        
        // Összefésüljük a backend adatokat a frontend méret adatokkal
        const mergedData = data.map(p => {
            const staticInfo = (typeof productsData !== 'undefined') ? productsData.find(sp => sp.id === p.id) : null;
            return { ...p, sizes: staticInfo ? staticInfo.sizes : [] };
        });

        window.allProducts = mergedData;
        renderProducts(mergedData);
    } catch (error) {
        console.warn("Hiba a termékek letöltésekor, statikus adatok használata:", error);
        if (typeof productsData !== 'undefined') {
            window.allProducts = productsData;
            renderProducts(productsData);
        } else {
            showToast("Hiba a termékek betöltésekor!");
        }
    }
}

if (document.getElementById("product-list")) {
    fetchProducts();
}

function openProduct(id) {
    if (!supabaseClient) {
        const product = window.allProducts?.find(p => p.id === id);
        if (product) {
            localStorage.setItem("selectedProduct", JSON.stringify(product));
            window.location.href = "product.html";
        }
        return;
    }

    // A termék adatit Supabase-ről kérjük le
    supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
            if (error) throw error;
            
            const staticInfo = (typeof productsData !== 'undefined') ? productsData.find(sp => sp.id === data.id) : null;
            const fullProduct = { ...data, sizes: staticInfo ? staticInfo.sizes : [] };

            localStorage.setItem("selectedProduct", JSON.stringify(fullProduct));
            window.location.href = "product.html";
        })
        .catch(err => {
            console.error(err);
            const product = window.allProducts?.find(p => p.id === id);
            if (product) {
                localStorage.setItem("selectedProduct", JSON.stringify(product));
                window.location.href = "product.html";
            }
        });
}

// --- TERMÉK OLDAL ÉS HASONLÓ TERMÉKEK ---
if (window.location.pathname.includes("product.html")) {
    let product = JSON.parse(localStorage.getItem("selectedProduct"));

    // FIGYELEM: Itt korábban egy 'productsData' alapú frissítés volt, ami felülírta a backend adatokat.
    // Mivel a backend a hiteles forrás a készletre (stock), így ezt a részt eltávolítottuk/javítottuk.

    if (product) {
        const imgSrc = product.image.startsWith('uploads/') ? `${API_URL}/${product.image}` : product.image;
        document.getElementById("product-img").src = imgSrc;
        document.getElementById("product-name").textContent = product.name;
        document.getElementById("product-price").textContent = product.price.toLocaleString() + " Ft";
        document.getElementById("product-desc").textContent = product.description;

        const stockDetail = document.getElementById("product-stock-detail");
        const addToCartBtn = document.querySelector(".add-to-cart");

        if (stockDetail) {
            if (product.stock !== undefined && product.stock > 0) {
                stockDetail.textContent = `Készleten: ${product.stock} db`;
                stockDetail.classList.remove("out-of-stock");
                if (addToCartBtn) {
                    addToCartBtn.disabled = false;
                    addToCartBtn.textContent = "Kosárba";
                }
            } else {
                stockDetail.textContent = "Sajnos elfogyott";
                stockDetail.classList.add("out-of-stock");
                if (addToCartBtn) {
                    addToCartBtn.disabled = true;
                    addToCartBtn.textContent = "Elfogyott";
                    addToCartBtn.style.opacity = "0.5";
                    addToCartBtn.style.cursor = "not-allowed";
                }
            }
        }

        const sizeContainer = document.getElementById("size-options");
        if (sizeContainer && product.sizes) {
            sizeContainer.innerHTML = "";
            product.sizes.forEach(size => {
                const btn = document.createElement("button");
                btn.className = "size-btn";
                btn.textContent = size;
                btn.onclick = () => {
                    document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    window.selectedSize = size;
                };
                sizeContainer.appendChild(btn);
            });
        }

        // Hasonló termékek betöltése
        renderRelatedProducts(product);
    }
}

function renderRelatedProducts(currentProduct) {
    const container = document.getElementById("related-list");
    if (!container || !window.allProducts) return;

    // Ugyanaz a kategória, de nem az aktuális termék
    const related = window.allProducts
        .filter(p => p.category_id === currentProduct.category_id && p.id !== currentProduct.id)
        .slice(0, 4); // Max 4 termék

    renderProducts(related, "related-list");
}

// --- KOSÁR KEZELÉS ---
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    const countSpan = document.getElementById("cart-count");
    if (countSpan) {
        countSpan.textContent = `(${count})`;
    }
}

updateCartCount();

function addToCart(product, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Készlet ellenőrzése
    if (product.stock !== undefined && product.stock < quantity) {
        showToast("Sajnos nincs elég készlet ebből a termékből.");
        return;
    }

    // Ellenőrizzük, hogy benne van-e már ez a termék ezzel a mérettel
    const existingItem = cart.find(item => item.id === product.id && item.size === product.size);

    if (existingItem) {
        const totalQty = (existingItem.quantity || 1) + quantity;
        if (product.stock !== undefined && totalQty > product.stock) {
            showToast("Nincs több készleten!");
            return;
        }
        existingItem.quantity = totalQty;
    } else {
        product.quantity = quantity;
        cart.push(product);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    showToast("Hozzáadva a kosárhoz!");
    updateCartCount();
}

if (window.location.pathname.includes("product.html")) {
    const addToCartBtn = document.querySelector(".add-to-cart");
    if (addToCartBtn) {
        addToCartBtn.addEventListener("click", () => {
            const product = JSON.parse(localStorage.getItem("selectedProduct"));
            if (!window.selectedSize) {
                showToast("Kérlek válassz méretet!");
                return;
            }

            const qtyInput = document.getElementById("product-qty");
            const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

            if (quantity < 1) {
                showToast("Érvénytelen mennyiség!");
                return;
            }

            const productWithSize = { ...product, size: window.selectedSize };
            addToCart(productWithSize, quantity);
        });
    }
}

if (window.location.pathname.includes("cart.html")) {
    renderCart();
}

function renderCart() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = document.getElementById("cart-items");
    let total = 0;

    if (container) {
        container.innerHTML = "";
        if (cart.length === 0) {
            container.innerHTML = "<p>A kosár üres.</p>";
        } else {
            cart.forEach((item, index) => {
                const itemTotal = item.price * (item.quantity || 1);
                total += itemTotal;
                container.innerHTML += `
                    <div class="cart-item">
                        <img src="${item.image}">
                        <div class="cart-item-info">
                            <h3>${item.name} ${item.size ? `(${item.size})` : ''}</h3>
                            <p>${item.price.toLocaleString()} Ft / db</p>
                            <div class="cart-item-qty">
                                <button class="qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                                <span>${item.quantity || 1} db</span>
                                <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="cart-item-actions">
                            <p class="item-total">${itemTotal.toLocaleString()} Ft</p>
                            <button class="remove-btn" onclick="removeItem(${index})">Törlés</button>
                        </div>
                    </div>
                `;
            });
        }
        const totalSpan = document.getElementById("cart-total");
        if (totalSpan) {
            totalSpan.textContent = total.toLocaleString() + " Ft";
            
            // Ingyenes szállítás info megjelenítése
            const summaryDiv = document.querySelector(".cart-summary");
            if (summaryDiv) {
                let shippingInfo = document.getElementById("cart-shipping-info");
                if (!shippingInfo) {
                    shippingInfo = document.createElement("p");
                    shippingInfo.id = "cart-shipping-info";
                    shippingInfo.style.fontSize = "0.9rem";
                    shippingInfo.style.marginTop = "10px";
                    summaryDiv.insertBefore(shippingInfo, totalSpan.parentElement.nextSibling);
                }
                
                if (total >= 10000) {
                    shippingInfo.innerHTML = "🎉 <strong>Ingyenes szállítás!</strong>";
                    shippingInfo.style.color = "var(--accent)";
                } else {
                    const diff = 10000 - total;
                    shippingInfo.innerHTML = `Vásárolj még <strong>${diff.toLocaleString()} Ft</strong> értékben az ingyenes szállításhoz!`;
                    shippingInfo.style.color = "#666";
                }
            }
        }
    }

    const checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            if (cart.length === 0) {
                showToast("A kosár üres!");
                return;
            }
            window.location.href = "checkout.html";
        });
    }
}

function changeQuantity(index, delta) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + delta;
        if (cart[index].quantity < 1) {
            removeItem(index);
            return;
        }
        localStorage.setItem("cart", JSON.stringify(cart));
        renderCart();
        updateCartCount();
    }
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    if (window.location.pathname.includes("cart.html")) {
        renderCart();
    } else {
        location.reload();
    }
    updateCartCount();
}

// --- CHECKOUT ---
if (window.location.pathname.includes("checkout.html")) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const container = document.getElementById("checkout-items");
    let total = 0;

    if (container) {
        container.innerHTML = "";
        cart.forEach(item => {
            const itemQty = item.quantity || 1;
            total += item.price * itemQty;
            container.innerHTML += `
                <div class="checkout-item">
                    <span>${item.name} ${item.size ? `(${item.size})` : ''} x ${itemQty}</span>
                    <span>${(item.price * itemQty).toLocaleString()} Ft</span>
                </div>
            `;
        });

        const totalLabel = document.getElementById("checkout-total");

        function updateCheckoutTotal() {
            const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'home';
            let shippingFee = 0;

            if (total < 10000) {
                shippingFee = (shippingMethod === 'home') ? 1500 : 990;
            }

            const finalTotal = total + shippingFee;
            
            // Frissítjük a kijelzést
            let shippingDisplay = document.getElementById("shipping-fee-display");
            if (!shippingDisplay) {
                shippingDisplay = document.createElement("div");
                shippingDisplay.id = "shipping-fee-display";
                shippingDisplay.className = "checkout-item shipping-row";
                shippingDisplay.style.borderTop = "1px solid #eee";
                shippingDisplay.style.marginTop = "10px";
                shippingDisplay.style.paddingTop = "10px";
                container.appendChild(shippingDisplay);
            }
            
            shippingDisplay.innerHTML = `
                <span>Szállítási díj:</span>
                <span>${shippingFee > 0 ? shippingFee.toLocaleString() + " Ft" : "Ingyenes"}</span>
            `;

            totalLabel.textContent = finalTotal.toLocaleString() + " Ft";
            return finalTotal;
        }

        // Kezdeti számítás
        updateCheckoutTotal();

        // Eseménykezelők a szállítási mód váltáshoz
        document.querySelectorAll('input[name="shipping"]').forEach(input => {
            input.addEventListener('change', updateCheckoutTotal);
        });
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        if (document.getElementById("name")) document.getElementById("name").value = user.name;
        if (document.getElementById("email")) document.getElementById("email").value = user.email;
    }

    const orderBtn = document.querySelector(".place-order-btn");
    if (orderBtn) {
        orderBtn.addEventListener("click", async () => {
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const address = document.getElementById("address").value;
            const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'home';
            const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

            if (!name || !email || !phone || !address) {
                showToast("Kérlek tölts ki minden mezőt!");
                return;
            }

            // Rendelés küldése Supabase-re
            if (!supabaseClient) {
                showToast("Szerver hiba (Supabase missing)");
                return;
            }

            try {
                // 1. Session lekérése (fontos, hogy az aktuálisat kapjuk meg)
                const { data: { session } } = await supabaseClient.auth.getSession();
                const userId = session?.user?.id || null;

                // A végleges árat az updateCheckoutTotal-tól kérjük el újra
                const checkoutTotal = parseInt(document.getElementById("checkout-total").textContent.replace(/\D/g, ''));

                // 2. Rendelés beszúrása
                const { data: order, error: orderError } = await supabaseClient.from('orders').insert({
                    user_email: email,
                    user_id: userId,
                    total_price: checkoutTotal,
                    status: 'pending',
                    shipping_method: shippingMethod, // Hozzáadjuk a szállítási módot is ha van ilyen oszlop
                    payment_method: paymentMethod
                }).select().single();

                if (orderError) throw orderError;

                // 3. Tételek beszúrása
                const orderItems = cart.map(item => ({
                    order_id: order.id,
                    product_name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1
                }));

                const { error: itemsError } = await supabaseClient.from('order_items').insert(orderItems);
                if (itemsError) throw itemsError;

                // 4. Készlet levonása RPC-vel (biztonságosabb és atomi)
                const updatePromises = cart.map(item => {
                    return supabaseClient.rpc('increment_stock', { 
                        product_id: item.id, 
                        amount: -(item.quantity || 1) 
                    });
                });

                await Promise.all(updatePromises);

                showToast("Rendelés sikeresen leadva!");
                localStorage.removeItem("cart");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            } catch (err) {
                console.error(err);
                showToast("Hiba történt a rendelés leadásakor: " + (err.message || "Ismeretlen hiba"));
            }
        });
    }
}

// --- AUTH ---
if (window.location.pathname.includes("register.html")) {
    const regBtn = document.getElementById("register-btn");
    if (regBtn) {
        regBtn.addEventListener("click", async () => {
            const name = document.getElementById("reg-name").value;
            const email = document.getElementById("reg-email").value;
            const password = document.getElementById("reg-password").value;

            if (!name || !email || !password) {
                showToast("Kérlek tölts ki minden mezőt!");
                return;
            }

            try {
                if (!supabaseClient) throw new Error("Supabase nincs betöltve");
                
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });

                if (error) throw error;

                showToast("Regisztráció sikeres! Kérlek igazold vissza az e-mailt.");
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            } catch (error) {
                showToast(error.message || "Hiba a regisztráció során!");
            }
        });
    }
}

if (window.location.pathname.includes("login.html")) {
    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                if (!supabaseClient) throw new Error("Supabase nincs betöltve");
                
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Lekérjük a profil adatokat is, hogy tudjuk admin-e
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                const userData = {
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name || data.user.user_metadata?.full_name || "Felhasználó",
                    is_admin: profile?.is_admin || false
                };

                localStorage.setItem("user", JSON.stringify(userData));
                localStorage.setItem("token", data.session?.access_token);
                
                showToast("Sikeres bejelentkezés!");
                setTimeout(() => {
                    window.location.href = userData.is_admin ? "admin.html" : "index.html";
                }, 1000);
            } catch (error) {
                showToast(error.message || "Hibás email vagy jelszó!");
            }
        });
    }
}

// --- PROFIL ÉS RENDELÉSEK ---
if (window.location.pathname.includes('profile.html')) {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        showToast('Kérlek jelentkezz be a profilod megtekintéséhez!');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } else {
        const detailsCard = document.getElementById('user-details-card');
        if (detailsCard) {
            detailsCard.innerHTML = `
                <div class="user-data-item">
                    <strong>Név</strong>
                    <span>${user.name}</span>
                </div>
                <div class="user-data-item">
                    <strong>E-mail cím</strong>
                    <span>${user.email}</span>
                </div>
                <div class="user-data-item">
                    <strong>Telefonszám</strong>
                    <span>${user.phone || "<i>Nincs megadva</i>"}</span>
                </div>
                <div class="user-data-item">
                    <strong>Szállítási cím</strong>
                    <span>${user.address || "<i>Nincs megadva</i>"}</span>
                </div>
            `;
        }

        // Szerkesztés gomb eseménykezelő
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => toggleEditForm(true));
        }

        const ordersList = document.getElementById('orders-list');
        // Rendelések lekérése Supabase-ről
        if (supabaseClient) {
            supabaseClient
                .from('orders')
                .select(`
                    id, total_price, status, created_at,
                    order_items (product_name, price, quantity)
                `)
                .eq('user_email', user.email)
                .order('created_at', { ascending: false })
                .then(({ data: userOrders, error }) => {
                    if (error) throw error;
                    
                    if (ordersList) {
                        ordersList.innerHTML = '';
                        if (!userOrders || userOrders.length === 0) {
                            ordersList.innerHTML = '<p>Még nincsenek rendeléseid.</p>';
                        } else {
                            userOrders.forEach(order => {
                                const dateObj = new Date(order.created_at);
                                const formattedDate = dateObj.toLocaleDateString('hu-HU') + ' ' + dateObj.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

                                let itemsHtml = order.order_items ? order.order_items.map(item => `
                                    <li class="order-item">
                                        <span>${item.product_name} ${item.quantity > 1 ? `x ${item.quantity}` : ''}</span>
                                        <span>${(item.price * item.quantity).toLocaleString()} Ft</span>
                                    </li>
                                `).join('') : '<p>Tételek betöltése...</p>';

                                const statusText = order.status === 'pending' ? 'Feldolgozás alatt' :
                                    order.status === 'shipped' ? 'Szállítás alatt' :
                                        order.status === 'delivered' ? 'Kézbesítve' : order.status;

                                ordersList.innerHTML += `
                                    <div class="order-card">
                                        <div class="order-header">
                                            <div>
                                                <span class="order-id" style="display: block; font-size: 0.8rem; color: #999;">#${order.id}</span>
                                                <span class="order-date">${formattedDate}</span>
                                            </div>
                                            <div class="order-total">${order.total_price.toLocaleString()} Ft</div>
                                        </div>
                                        <ul class="order-item-list" style="list-style: none; padding: 0; margin-bottom: 0;">
                                            ${itemsHtml}
                                        </ul>
                                        <div class="order-footer" style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                                            <span class="status-badge status-${order.status}" style="font-size: 0.75rem;">${statusText}</span>
                                        </div>
                                    </div>
                                `;
                            });
                        }
                    }
                })
                .catch(err => {
                    console.error(err);
                    if (ordersList) ordersList.innerHTML = '<p>Hiba történt a rendelések betöltésekor.</p>';
                });
        }
    }
}

function toggleEditForm(show) {
    const form = document.getElementById('edit-profile-form');
    const user = JSON.parse(localStorage.getItem('user'));

    if (show && user) {
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-phone').value = user.phone || "";
        document.getElementById('edit-address').value = user.address || "";
        form.style.display = 'block';
        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    } else {
        form.style.display = 'none';
    }
}

async function saveProfileChanges() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !supabaseClient) return;

    const updatedData = {
        name: document.getElementById('edit-name').value,
        phone: document.getElementById('edit-phone').value,
        address: document.getElementById('edit-address').value
    };

    if (!updatedData.name) {
        showToast("A név megadása kötelező!");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .upsert({ id: user.id, ...updatedData })
            .select()
            .single();

        if (error) throw error;

        localStorage.setItem('user', JSON.stringify({ ...user, ...data }));
        showToast("Profil sikeresen frissítve!");
        toggleEditForm(false);
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        showToast(error.message || "Szerver hiba történt!");
    }
}

// --- KÍVÁNSÁGLISTA ---
function toggleWishlist(event, productId) {
    event.stopPropagation();
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.indexOf(productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Eltávolítva a kívánságlistáról.');
    } else {
        wishlist.push(productId);
        showToast('Hozzáadva a kívánságlistához!');
    }

    localStorage.setItem('wishlist', JSON.stringify(wishlist));

    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlist();
    } else {
        applyFilters();
    }
}

function renderWishlist() {
    if (typeof window.allProducts === 'undefined') return;
    let wishlistIds = JSON.parse(localStorage.getItem('wishlist')) || [];
    const wishlistedProducts = window.allProducts.filter(p => wishlistIds.includes(p.id));
    renderProducts(wishlistedProducts, "wishlist-list");
}

if (window.location.pathname.includes('wishlist.html')) {
    document.addEventListener('DOMContentLoaded', renderWishlist);
}

// Kategóriák lekérése a backendről és dinamikus megjelenítése
// Kategóriák lekérése Supabase-ről
async function fetchCategories() {
    try {
        if (!supabase) throw new Error("Supabase nincs betöltve");
        
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) throw error;
        
        renderMenu(data);
        console.log("Kategóriák sikeresen betöltve Supabase-ről.");
    } catch (error) {
        console.warn("Hiba a kategóriák betöltésekor, statikus lista használata.");
        const staticCategories = [
            { id: 1, name: "Ing" }, { id: 2, name: "Zakó" }, { id: 3, name: "Nadrág" }, { id: 4, name: "Cipő" }
        ];
        renderMenu(staticCategories);
    }
}

function renderMenu(categories) {
    const menu = document.getElementById("main-menu");
    if (!menu) return;

    // Eltávolítjuk a régi statikus kategória elemeket
    const existingItems = menu.querySelectorAll("li[data-category]");
    existingItems.forEach(item => item.remove());

    // Új kategóriák beszúrása a menü elejére
    categories.slice().reverse().forEach(cat => {
        const li = document.createElement("li");
        li.setAttribute("data-category", cat.id);
        li.textContent = cat.name;
        menu.prepend(li);
    });
}

// --- SZŰRÉS ÉS RENDEZÉS LOGIKA ---
function applyFilters() {
    // Elsősorban a window.allProducts-ra támaszkodunk (ami már összefésült)
    const source = window.allProducts || (typeof productsData !== 'undefined' ? productsData : []);
    if (!source || source.length === 0) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const activeCategory = document.querySelector('.menu li.active')?.getAttribute('data-category');
    const sortBy = document.getElementById('sort-select')?.value || 'default';
    const maxPrice = parseInt(document.getElementById('price-filter')?.value) || 100000;

    let filtered = source.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm));
        const matchesCategory = !activeCategory || p.category_id == activeCategory;
        const matchesPrice = p.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });

    if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));

    renderProducts(filtered);
}

// Kategória szűrés eseménykezelő (Delegált megoldás a dinamikus elemekhez)
const menuList = document.getElementById("main-menu");
if (menuList) {
    menuList.addEventListener("click", (e) => {
        const item = e.target.closest("li");
        if (!item || item.classList.contains("cart-menu")) return;

        const cat = item.getAttribute("data-category");
        const isMainPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/");

        if (cat !== null || item.innerText.includes("Főoldal")) {
            if (isMainPage) {
                // Ha a főoldalon vagyunk, csak szűrünk (eredeti működés)
                document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
                item.classList.add("active");
                applyFilters();
            } else {
                // Ha más oldalon (pl. kosár), akkor visszaugrunk a főoldalra a paraméterrel
                const targetCat = cat || ""; // Főoldal esetén üres
                window.location.href = `index.html${targetCat ? `?category=${targetCat}` : ""}`;
            }

            // Mobil menü bezárása
            menuList.classList.remove("active");
            const toggleBtn = document.getElementById("mobile-menu-toggle");
            if (toggleBtn) toggleBtn.textContent = "☰";
        }
    });
}

// Szűrés eseménykezelők inicializálása
document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('sort-select');
    const priceFilter = document.getElementById('price-filter');
    const priceDisplay = document.getElementById('price-display');
    const searchInput = document.getElementById('search-input');

    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    if (priceFilter) {
        priceFilter.addEventListener('input', (e) => {
            const val = e.target.value;
            if (priceDisplay) priceDisplay.textContent = parseInt(val).toLocaleString() + ' Ft';
            applyFilters();
        });
    }
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    fetchProducts().then(() => {
        // Miután betöltődtek a termékek, megnézzük van-e kategória a URL-ben
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            const menuItem = document.querySelector(`.menu li[data-category="${catParam}"]`);
            if (menuItem) {
                document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
                menuItem.classList.add("active");
                applyFilters();
            }
        }
    });
    fetchCategories();
    updateCartCount();
});
