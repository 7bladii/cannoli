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

    // DOM Elements
    const productsGrid = document.getElementById('products-grid');
    const cartCountElement = document.getElementById('cart-count'); // Desktop
    const cartIcon = document.getElementById('cart-icon'); // Desktop
    const mobileCartBar = document.querySelector('.mobile-cart-bar'); // Mobile
    const miniCartOverlay = document.getElementById('mini-cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const miniCartItemsContainer = document.getElementById('mini-cart-items');
    
    let cart = JSON.parse(localStorage.getItem('cannoliCart')) || [];
    let allProducts = []; // Cache for product data

    async function fetchAndRenderProducts() {
        if (!productsGrid) return;
        productsGrid.innerHTML = '<h2>Loading flavors...</h2>';
        try {
            const snapshot = await db.collection('products').get();
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProductCards(allProducts);
        } catch (error) {
            console.error("Error fetching products: ", error);
            productsGrid.innerHTML = '<h2>Could not load flavors. Please try again later.</h2>';
        }
    }

    function renderProductCards(products) {
        productsGrid.innerHTML = '';
        if (products.length === 0) {
            productsGrid.innerHTML = '<h2>No flavors have been added yet.</h2>';
            return;
        }
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            // This logic handles both old products (with 'image') and new products (with 'imageUrls')
            let primaryImage = 'https://via.placeholder.com/300'; // A fallback image
            let imagesForGallery = [];

            if (product.imageUrls && product.imageUrls.length > 0) {
                primaryImage = product.imageUrls[0]; // Use new multi-image format
                imagesForGallery = product.imageUrls;
            } else if (product.image) {
                primaryImage = product.image; // Use old single-image format
                imagesForGallery = [product.image];
            }
            
            const imagesData = JSON.stringify(imagesForGallery);

            // Add icons for gallery and video if they exist
            let iconsHTML = `<div class="icon gallery-icon">🖼️</div>`;
            if (product.videoUrl) {
                iconsHTML += `<div class="icon video-icon" data-video-url="${product.videoUrl}">▶️</div>`;
            }

            card.innerHTML = `
                <div class="product-image-container" data-images='${imagesData}'>
                    <img src="${primaryImage}" alt="${product.name} Cannoli" loading="lazy">
                    <div class="product-card-icons">${iconsHTML}</div>
                </div>
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
            `;
            productsGrid.appendChild(card);
        });
    }

    // --- CART LOGIC ---
    function saveCart() { localStorage.setItem('cannoliCart', JSON.stringify(cart)); }
    function addToCart(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) { cartItem.quantity += 1; } else { cart.push({ id: productId, name: product.name, price: product.price, quantity: 1 }); }
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
        // Desktop
        if (cartCountElement) { cartCountElement.textContent = totalItems; }
        const checkoutButton = document.getElementById('checkout-btn');
        if (checkoutButton) { checkoutButton.style.display = totalItems > 0 ? 'block' : 'none'; }
        // Mobile
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
        const miniCartItemsContainer = document.getElementById('mini-cart-items');
        const miniCartSubtotal = document.getElementById('mini-cart-subtotal');
        if (cart.length === 0) {
            miniCartItemsContainer.innerHTML = '<p style="text-align: center; color: #888;">Your cart is empty.</p>';
        } else {
            miniCartItemsContainer.innerHTML = cart.map(item => {
                const product = allProducts.find(p => p.id === item.id) || {};
                const image = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : (product.image || 'https://via.placeholder.com/150');
                return `
                <div class="mini-cart-item">
                    <img src="${image}" alt="${item.name}">
                    <div class="mini-cart-item-info">
                        <h4>${item.name}</h4>
                        <p>$${item.price.toFixed(2)}</p>
                        <div class="mini-cart-controls">
                            <button class="quantity-change" data-id="${item.id}" data-change="-1">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-change" data-id="${item.id}" data-change="1">+</button>
                        </div>
                    </div>
                    <button class="mini-cart-remove-btn" data-id="${item.id}">Remove</button>
                </div>
                `;
            }).join('');
        }
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        if (miniCartSubtotal) {
            miniCartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        }
    }
    
    function openMiniCart() { renderMiniCart(); miniCartOverlay.classList.add('is-open'); document.body.classList.add('no-scroll'); }
    function closeMiniCart() { miniCartOverlay.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }
    
    // --- LIGHTBOX GALLERY LOGIC ---
    function showLightbox(source) {
        if (!source) return;
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox-overlay';
        let contentHTML = '';

        // Check if the source is a video URL
        if (typeof source === 'string' && (source.includes('youtube.com') || source.includes('youtu.be'))) {
            // Extract YouTube video ID
            const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = source.match(youtubeRegex);
            const videoId = (match && match[2].length === 11) ? match[2] : null;
            if (videoId) {
                contentHTML = `<div class="lightbox-video-wrapper"><iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
            }
        } 
        // Check if the source is an array of images
        else if (Array.isArray(source) && source.length > 0) {
            let currentIndex = 0;
            contentHTML = `<button class="lightbox-nav prev">&lt;</button><img src="${source[currentIndex]}" class="lightbox-image"><button class="lightbox-nav next">&gt;</button>`;
            
            // We need to add logic for the buttons inside this block
            setTimeout(() => {
                const imgElement = lightbox.querySelector('.lightbox-image');
                const prevBtn = lightbox.querySelector('.prev');
                const nextBtn = lightbox.querySelector('.next');
                
                function updateImage() {
                    imgElement.src = source[currentIndex];
                    prevBtn.style.display = currentIndex === 0 ? 'none' : 'block';
                    nextBtn.style.display = currentIndex === source.length - 1 ? 'none' : 'block';
                }
                
                prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateImage(); } });
                nextBtn.addEventListener('click', () => { if (currentIndex < source.length - 1) { currentIndex++; updateImage(); } });
                
                updateImage();
            }, 0);
        }

        if (!contentHTML) return;

        lightbox.innerHTML = `<div class="lightbox-content"><button class="lightbox-close">&times;</button>${contentHTML}</div>`;
        document.body.appendChild(lightbox);
        document.body.classList.add('no-scroll');
        
        function closeLightbox() { document.body.removeChild(lightbox); document.body.classList.remove('no-scroll'); }
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    }
    
    // --- EVENT LISTENERS ---
    if (productsGrid) {
        productsGrid.addEventListener('click', (event) => {
            const button = event.target.closest('.add-to-cart-btn');
            const galleryIcon = event.target.closest('.gallery-icon');
            const videoIcon = event.target.closest('.video-icon');

            if (button) {
                addToCart(button.getAttribute('data-id'));
            } else if (galleryIcon) {
                const images = JSON.parse(galleryIcon.closest('.product-image-container').getAttribute('data-images'));
                showLightbox(images);
            } else if (videoIcon) {
                const videoUrl = videoIcon.getAttribute('data-video-url');
                showLightbox(videoUrl);
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

    if (cartIcon) cartIcon.addEventListener('click', openMiniCart);
    if (mobileCartBar) mobileCartBar.addEventListener('click', openMiniCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeMiniCart);
    
    // Smooth scrolling
    document.querySelectorAll('nav a, .cta-button, .mobile-logo, .admin-link').forEach(anchor => {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#')) {
             anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) { targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
        }
    });

    // Mobile navigation
    const navToggle = document.querySelector('.mobile-nav-toggle'), navMenu = document.querySelector('.navigation-section'), body = document.body;
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('is-open');
            navToggle.classList.toggle('is-open');
            body.classList.toggle('no-scroll');
        });
    }

    document.querySelectorAll('.navigation-section a').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('is-open')) {
                navMenu.classList.remove('is-open');
                navToggle.classList.remove('is-open');
                body.classList.remove('no-scroll');
            }
        });
    });

    // --- INITIALIZATION ---
    fetchAndRenderProducts();
    updateCartDisplay();
});