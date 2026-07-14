const products = [
    { id: 1, name: "Classic Blue Denim Jacket", price: 4999, category: "Clothing", img: "denimjacket.jpg" },
    { id: 2, name: "Minimalist Grey Hoodie", price: 2499, category: "Clothing", img: "oversizedHoodie.png" },
    { id: 3, name: "Rose Gold Tachymeter Watch", price: 15500, category: "Accessories", img: "watch.png" },
    { id: 4, name: "Aviator Gold Sunglasses", price: 1800, category: "Accessories", img: "sunglasses.png" },
    { id: 5, name: "Urban Comfort Sneakers", price: 3500, category: "Footwear", img: "sneakers.png" },
    { id: 6, name: "Tan High-Rise Leather Boots", price: 6200, category: "Footwear", img: "leatherBoots.png" }
];

let cart = [];
let wishlist = [];

window.onload = () => {
    renderProducts(products);
};

function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = items.map(p => `
        <div class="col-6 col-md-4">
            <div class="card h-100 shadow-sm product-card">
                <div class="img-wrapper">
                    <div class="wishlist-icon" onclick="addToWishlist(${p.id})">
                        <i class="bi bi-heart"></i>
                    </div>
                    <img src="${p.img}" class="card-img-top" alt="${p.name}">
                </div>
                <div class="card-body text-center d-flex flex-column p-3">
                    <small class="text-secondary text-uppercase mb-1 fw-bold" style="font-size: 0.65rem;">${p.category}</small>
                    <h6 class="fw-bold mb-1 text-truncate">${p.name}</h6>
                    <p class="text-primary fw-bold mb-3">₹${p.price.toLocaleString('en-IN')}</p>
                    <button class="btn btn-dark btn-sm mt-auto w-100 py-2 fw-bold" onclick="addToCart(${p.id})">
                        ADD TO BAG
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Notification Logic
function showToast(message) {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toastMessage').innerText = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Cart Logic
function addToCart(id) {
    const item = products.find(p => p.id === id);
    cart.push(item);
    updateCartUI();
    showToast(`🛍️ ${item.name} added to Bag!`);
}

function removeFromCart(index) {
    const name = cart[index].name;
    cart.splice(index, 1);
    updateCartUI();
    showToast(`🗑️ ${name} removed from Bag.`);
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const list = document.getElementById('cart-items-list');
    let total = 0;
    list.innerHTML = cart.length === 0 ? `<div class="text-center mt-5 text-muted">Bag is empty.</div>` : 
        cart.map((item, index) => {
            total += item.price;
            return `
                <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                    <img src="${item.img}" style="width: 60px; height: 60px; object-fit: contain;" class="rounded border">
                    <div class="ms-3 flex-grow-1">
                        <div class="fw-bold small">${item.name}</div>
                        <div class="text-success small fw-bold">₹${item.price.toLocaleString('en-IN')}</div>
                    </div>
                    <button class="btn btn-sm text-danger" onclick="removeFromCart(${index})"><i class="bi bi-trash"></i></button>
                </div>`;
        }).join('');
    document.getElementById('cart-total').innerText = `₹${total.toLocaleString('en-IN')}`;
}

// Wishlist Logic
function addToWishlist(id) {
    const item = products.find(p => p.id === id);
    if (!wishlist.find(x => x.id === id)) {
        wishlist.push(item);
        updateWishlistUI();
        showToast(`❤️ ${item.name} added to Wishlist!`);
    } else {
        showToast(`Already in Wishlist!`);
    }
}

function removeFromWishlist(index) {
    wishlist.splice(index, 1);
    updateWishlistUI();
}

function updateWishlistUI() {
    document.getElementById('wishlist-count').innerText = wishlist.length;
    const list = document.getElementById('wishlist-items-list');
    list.innerHTML = wishlist.length === 0 ? `<div class="text-center mt-5 text-muted">Wishlist is empty.</div>` : 
        wishlist.map((item, index) => `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${item.img}" style="width: 50px; height: 50px; object-fit: contain;" class="border rounded">
                <div class="ms-3 flex-grow-1">
                    <div class="fw-bold small">${item.name}</div>
                    <button class="btn btn-link p-0 text-dark small" onclick="addToCart(${item.id})">Move to Bag</button>
                </div>
                <button class="btn btn-sm text-danger" onclick="removeFromWishlist(${index})">✕</button>
            </div>`).join('');
}

function filterItems(category, btnElement) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.replace('btn-dark', 'btn-outline-dark'));
    btnElement.classList.replace('btn-outline-dark', 'btn-dark');
    renderProducts(category === 'all' ? products : products.filter(p => p.category === category));
}

function checkout() {
    if(cart.length === 0) return showToast("Add items first!");
    alert(`🎉 Order Confirmed! Total: ${document.getElementById('cart-total').innerText}`);
    cart = [];
    updateCartUI();
}