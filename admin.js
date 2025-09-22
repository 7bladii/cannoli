// Paste the same firebaseConfig object here
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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// --- AUTHENTICATION & LOGOUT ---
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        fetchAndDisplayAdminProducts();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'login.html');
});

// --- ADD NEW PRODUCT LOGIC ---
const addProductForm = document.getElementById('add-product-form');
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-desc').value;
    const imageFiles = document.getElementById('product-image').files;
    const videoUrl = document.getElementById('product-video').value;
    const uploadStatus = document.getElementById('upload-status');

    if (!name || isNaN(price) || imageFiles.length === 0) {
        uploadStatus.textContent = 'Please fill all required fields and select at least one image.';
        return;
    }
    if (imageFiles.length > 6) {
        uploadStatus.textContent = 'You can only upload a maximum of 6 images.';
        return;
    }

    uploadStatus.textContent = `Uploading ${imageFiles.length} images...`;
    try {
        const uploadPromises = Array.from(imageFiles).map(file => {
            const storageRef = storage.ref(`product-images/${Date.now()}_${file.name}`);
            return storageRef.put(file);
        });
        const uploadSnapshots = await Promise.all(uploadPromises);
        const imageUrls = await Promise.all(uploadSnapshots.map(snapshot => snapshot.ref.getDownloadURL()));
        
        await db.collection('products').add({ name, price, description, imageUrls, videoUrl });
        
        uploadStatus.textContent = 'Product added successfully!';
        addProductForm.reset();
        fetchAndDisplayAdminProducts();
        setTimeout(() => uploadStatus.textContent = '', 3000);
    } catch (error) {
        console.error("Error adding product: ", error);
        uploadStatus.textContent = `Error: ${error.message}`;
    }
});

// --- MANAGE EXISTING PRODUCTS (READ, UPDATE, DELETE) ---
const existingProductsList = document.getElementById('existing-products-list');
let allProducts = [];

async function fetchAndDisplayAdminProducts() {
    existingProductsList.innerHTML = 'Loading products...';
    try {
        const snapshot = await db.collection('products').orderBy("name").get(); // Order alphabetically
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (allProducts.length === 0) {
            existingProductsList.innerHTML = 'No products found.';
            return;
        }

        existingProductsList.innerHTML = allProducts.map(product => `
            <div class="product-list-item">
                <div class="product-list-info">
                    <img src="${product.imageUrls[0]}" alt="${product.name}">
                    <span>${product.name} - $${product.price.toFixed(2)}</span>
                </div>
                <div class="product-list-actions">
                    <button class="cta-button edit-btn" data-id="${product.id}">Edit</button>
                    <button class="cta-button delete-btn" data-id="${product.id}">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error fetching products for admin: ", error);
        existingProductsList.innerHTML = 'Failed to load products.';
    }
}

existingProductsList.addEventListener('click', async (e) => {
    const productId = e.target.getAttribute('data-id');
    if (!productId) return;

    if (e.target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            try {
                // Note: Deleting images from storage is a more complex operation not included here for simplicity.
                await db.collection('products').doc(productId).delete();
                alert('Product deleted successfully.');
                fetchAndDisplayAdminProducts();
            } catch (error) {
                console.error("Error deleting product: ", error);
                alert(`Error: ${error.message}`);
            }
        }
    }

    if (e.target.classList.contains('edit-btn')) {
        const productToEdit = allProducts.find(p => p.id === productId);
        openEditModal(productToEdit);
    }
});


// --- EDIT MODAL LOGIC ---
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-product-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
let imagesToDelete = [];

function openEditModal(product) {
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-desc').value = product.description || '';
    document.getElementById('edit-product-video').value = product.videoUrl || '';
    
    const imageGrid = document.getElementById('edit-existing-images');
    imageGrid.innerHTML = product.imageUrls.map((url) => `
        <div class="image-preview" data-url="${url}">
            <img src="${url}">
            <button type="button" class="delete-img-btn" data-url="${url}">&times;</button>
        </div>
    `).join('');

    imagesToDelete = [];
    editModal.classList.add('is-visible');
}

function closeEditModal() {
    editModal.classList.remove('is-visible');
    editForm.reset();
}

document.getElementById('edit-existing-images').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-img-btn')) {
        const previewDiv = e.target.parentElement;
        const imageUrl = previewDiv.getAttribute('data-url');
        imagesToDelete.push(imageUrl);
        previewDiv.style.display = 'none';
    }
});


editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = document.getElementById('edit-product-id').value;
    const product = allProducts.find(p => p.id === productId);
    const editStatus = document.getElementById('edit-status');
    
    editStatus.textContent = 'Saving changes...';

    try {
        const newImageFiles = document.getElementById('edit-product-image').files;
        let newImageUrls = [];
        if (newImageFiles.length > 0) {
            const uploadPromises = Array.from(newImageFiles).map(file => {
                const storageRef = storage.ref(`product-images/${Date.now()}_${file.name}`);
                return storageRef.put(file);
            });
            const uploadSnapshots = await Promise.all(uploadPromises);
            newImageUrls = await Promise.all(uploadSnapshots.map(snapshot => snapshot.ref.getDownloadURL()));
        }

        const remainingImageUrls = product.imageUrls.filter(url => !imagesToDelete.includes(url));
        const finalImageUrls = [...remainingImageUrls, ...newImageUrls];

        const updatedData = {
            name: document.getElementById('edit-product-name').value,
            price: parseFloat(document.getElementById('edit-product-price').value),
            description: document.getElementById('edit-product-desc').value,
            videoUrl: document.getElementById('edit-product-video').value,
            imageUrls: finalImageUrls
        };
        
        await db.collection('products').doc(productId).update(updatedData);
        
        // Note: Deleting images from Storage is an advanced topic. The removed URLs are just removed from the database list.

        editStatus.textContent = 'Product updated successfully!';
        setTimeout(() => {
            closeEditModal();
            fetchAndDisplayAdminProducts();
        }, 1500);

    } catch (error) {
        console.error("Error updating product: ", error);
        editStatus.textContent = `Error: ${error.message}`;
    }
});

cancelEditBtn.addEventListener('click', closeEditModal);