const firebaseConfig = {
  apiKey: "AIzaSyD01LKZxpJaforldiwTm8SoR5BO0_ANkDY",
  authDomain: "cannoli-f1d4d.firebaseapp.com",
  projectId: "cannoli-f1d4d",
  storageBucket: "cannoli-f1d4d.firebasestorage.app",
  messagingSenderId: "370614675260",
  appId: "1:370614675260:web:d68b860b7f80ce3868a039",
  measurementId: "G-PLX34LSTRB"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const productsGrid = document.getElementById('products-grid');
    const cartCountDesktop = document.getElementById('cart-count-desktop');
    const cartCountMobile = document.getElementById('cart-count-mobile');
    const cartIconDesktop = document.getElementById('cart-icon-wrapper-desktop');
    const cartIconMobile = document.getElementById('cart-icon-wrapper-mobile');
    const mobileCartBar = document.querySelector('.mobile-cart-bar');
    const miniCartOverlay = document.getElementById('mini-cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const miniCartItemsContainer = document.getElementById('mini-cart-items');
    
    let cart = JSON.parse(localStorage.getItem('cannoliCart')) || [];
    let allProducts = [];

    // --- PRODUCT FETCHING AND RENDERING ---
    async function fetchAndRenderProducts() {
        if (!productsGrid) return;
        productsGrid.innerHTML = '<p style="text-align:center;">Loading flavors...</p>';
        try {
            const snapshot = await db.collection('products').orderBy('name').get();
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProductCards(allProducts);
        } catch (error) {
            console.error("Error fetching products: ", error);
            productsGrid.innerHTML = '<p style="text-align:center;">Could not load flavors. Please try again later.</p>';
        }
    }

    function renderProductCards(products) {
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="text-align:center;">No flavors have been added yet.</p>';
            return;
        }
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-aos', 'fade-up');

            const galleryContainer = document.createElement('div');
            galleryContainer.className = 'product-image-gallery';

            // Preparamos la descripción para la galería
            const subHtmlContent = `<h4>${product.name}</h4><p>${product.description || 'No description available.'}</p>`;

            if (product.imageUrls && product.imageUrls.length > 0) {
                product.imageUrls.forEach((imageUrl, index) => {
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.setAttribute('data-sub-html', subHtmlContent);

                    if (index === 0) {
                        // La primera imagen es la que se muestra en la tarjeta
                        link.innerHTML = `<img src="${imageUrl}" alt="${product.name}" loading="lazy">`;
                    }
                    galleryContainer.appendChild(link);
                });
            } else {
                // Fallback si no hay imageUrls
                const link = document.createElement('a');
                link.href = 'https://via.placeholder.com/300';
                link.setAttribute('data-sub-html', subHtmlContent);
                link.innerHTML = `<img src="https://via.placeholder.com/300" alt="${product.name}" loading="lazy">`;
                galleryContainer.appendChild(link);
            }
            
            card.appendChild(galleryContainer);
            card.innerHTML += `
                <h3>${product.name}</h3>
                <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
            `;
            productsGrid.appendChild(card);
        });

        // Inicializamos lightGallery UNA VEZ que todos los productos se han renderizado
        lightGallery(productsGrid, {
            selector: '.product-image-gallery > a',
            download: false,
            licenseKey: '0000-0000-000-0000', // Clave para proyectos de código abierto/personales
        });
    }

    // --- CART LOGIC ---
    function saveCart() { localStorage.setItem('cannoliCart', JSON.stringify(cart)); }
    function addToCart(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            cart.push({ 
                id: productId, 
                name: product.name, 
                price: product.price, 
                quantity: 1, 
                image: (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://via.placeholder.com/150' 
            });
        }
        saveCart();
        updateCartDisplay();
        openMiniCart();
    }
    function updateQuantity(productId, newQuantity) {
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            if (newQuantity <= 0) {
                cart = cart.filter(item => item.id !== productId);
            } else {
                cartItem.quantity = newQuantity;
            }
            saveCart();
            updateCartDisplay();
        }
    }

    // --- DISPLAY LOGIC ---
    function updateCartDisplay() {
        renderMiniCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCountDesktop) cartCountDesktop.textContent = totalItems;
        if (cartCountMobile) cartCountMobile.textContent = totalItems;
        
        const checkoutButtonMenu = document.getElementById('checkout-btn-menu');
        if (checkoutButtonMenu) checkoutButtonMenu.style.display = totalItems > 0 ? 'block' : 'none';

        if (mobileCartBar) {
            const cartCountMobileElement = document.querySelector('.cart-count-mobile');
            const cartTotalPriceElement = document.querySelector('.cart-total-price');
            const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            if (totalItems > 0) {
                cartCountMobileElement.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
                cartTotalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
                mobileCartBar.classList.add('is-visible');
            } else {
                mobileCartBar.classList.remove('is-visible');
            }
        }
    }
    
    // --- MINI CART LOGIC ---
    function renderMiniCart() {
        if (!miniCartItemsContainer) return;
        const miniCartSubtotal = document.getElementById('mini-cart-subtotal');
        if (cart.length === 0) {
            miniCartItemsContainer.innerHTML = '<p style="text-align: center; color: #888;">Your cart is empty.</p>';
        } else {
            miniCartItemsContainer.innerHTML = cart.map(item => `
                <div class="mini-cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="mini-cart-item-info">
                        <h4>${item.name}</h4>
                        <p>$${parseFloat(item.price).toFixed(2)}</p>
                        <div class="mini-cart-controls">
                            <button class="quantity-change" data-id="${item.id}" data-change="-1">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-change" data-id="${item.id}" data-change="1">+</button>
                        </div>
                    </div>
                    <button class="mini-cart-remove-btn" data-id="${item.id}">Remove</button>
                </div>
            `).join('');
        }
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        if (miniCartSubtotal) {
            miniCartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        }
    }
    
    function openMiniCart() { renderMiniCart(); miniCartOverlay.classList.add('is-open'); document.body.classList.add('no-scroll'); }
    function closeMiniCart() { miniCartOverlay.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }
    
    // --- EVENT LISTENERS ---
    if (productsGrid) {
        productsGrid.addEventListener('click', (event) => {
            const button = event.target.closest('.add-to-cart-btn');
            if (button) {
                addToCart(button.getAttribute('data-id'));
            }
        });
    }

    if (miniCartItemsContainer) {
        miniCartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const productId = target.getAttribute('data-id');
            if (!productId) return;
            if (target.classList.contains('quantity-change')) {
                const change = parseInt(target.getAttribute('data-change'));
                const item = cart.find(i => i.id === productId);
                if (item) updateQuantity(productId, item.quantity + change);
            }
            if (target.classList.contains('mini-cart-remove-btn')) {
                updateQuantity(productId, 0);
            }
        });
    }

    if (cartIconDesktop) cartIconDesktop.addEventListener('click', openMiniCart);
    if (cartIconMobile) cartIconMobile.addEventListener('click', openMiniCart);
    if (mobileCartBar) mobileCartBar.addEventListener('click', openMiniCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeMiniCart);
    
    // --- SMOOTH SCROLLING ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- FLOATING MENU LOGIC ---
    const menuToggle = document.getElementById('menu-toggle');
    const menuToggleDesktop = document.getElementById('menu-toggle-desktop');
    const floatingNav = document.getElementById('floating-nav');
    
    if (floatingNav) {
        const navLinks = floatingNav.querySelectorAll('a');

        const toggleMenu = () => {
            if (menuToggle) menuToggle.classList.toggle('is-open');
            if (menuToggleDesktop) menuToggleDesktop.classList.toggle('is-open');
            floatingNav.classList.toggle('is-open');
            document.body.classList.toggle('no-scroll');
        };

        if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
        if (menuToggleDesktop) menuToggleDesktop.addEventListener('click', toggleMenu);

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (floatingNav.classList.contains('is-open')) {
                    setTimeout(toggleMenu, 300);
                }
            });
        });
    }

    // --- INITIALIZATION ---
    fetchAndRenderProducts();
    updateCartDisplay();
});