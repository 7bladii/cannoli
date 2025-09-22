document.addEventListener('DOMContentLoaded', () => {
    const cartSummaryDiv = document.getElementById('cart-summary');
    const formContainer = document.querySelector('.checkout-form-container');
    let cart = JSON.parse(localStorage.getItem('cannoliCart')) || [];

    // Save the cart to localStorage
    function saveCart() {
        localStorage.setItem('cannoliCart', JSON.stringify(cart));
    }

    // Update the quantity of a product
    function updateQuantity(productId, newQuantity) {
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            if (newQuantity <= 0) {
                // If quantity is 0 or less, remove the product
                cart = cart.filter(item => item.id !== productId);
            } else {
                cartItem.quantity = newQuantity;
            }
            saveCart();
            renderCart(); // Redraw the cart
        }
    }

    // Render the cart on the page
    function renderCart() {
        if (cart.length === 0) {
            cartSummaryDiv.innerHTML = `<div class="empty-cart-message"><h2>Your cart is empty</h2></div>`;
            formContainer.style.display = 'none'; // Hide form if cart is empty
            return;
        }

        let total = 0;
        let cartForEmail = '';
        cartSummaryDiv.innerHTML = ''; // Clear the view

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            cartForEmail += `${item.quantity} x ${item.name} - $${itemTotal.toFixed(2)}\n`;

            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <strong>${item.name}</strong><br>
                    <span>$${item.price.toFixed(2)} each</span>
                </div>
                <div class="item-controls">
                    <button class="quantity-change" data-id="${item.id}" data-change="-1">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-change" data-id="${item.id}" data-change="1">+</button>
                </div>
                <span><strong>$${itemTotal.toFixed(2)}</strong></span>
                <button class="remove-btn" data-id="${item.id}">Remove</button>
            `;
            cartSummaryDiv.appendChild(itemElement);
        });

        // Add the total at the end
        const totalElement = document.createElement('div');
        totalElement.innerHTML = `<p class="total-price" style="text-align: right; font-size: 1.5em; margin-top: 20px;">Total: <strong>$${total.toFixed(2)}</strong></p>`;
        cartSummaryDiv.appendChild(totalElement);
        
        // Show the form and update the hidden input
        formContainer.style.display = 'block';
        document.getElementById('cart-contents-input').value = cartForEmail + `\nTOTAL: $${total.toFixed(2)}`;
    }

    // Handle clicks on the buttons
    cartSummaryDiv.addEventListener('click', (event) => {
        const target = event.target;
        const productId = target.getAttribute('data-id');
        if (!productId) return;
        
        if (target.classList.contains('quantity-change')) {
            const change = parseInt(target.getAttribute('data-change'));
            const cartItem = cart.find(item => item.id === productId);
            if (cartItem) {
                updateQuantity(productId, cartItem.quantity + change);
            }
        }
        
        if (target.classList.contains('remove-btn')) {
            updateQuantity(productId, 0); // Setting quantity to 0 removes the item
        }
    });

    // Initial render of the cart when the page loads
    renderCart();
});