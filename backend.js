// استيراد المكتبات باستخدام روابط كاملة (ضروري للمتصفح)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyBDjEOWLQeAM3ooMA3_GCcbH5puxl-KSzQ",
    authDomain: "zenix-agency.firebaseapp.com",
    projectId: "zenix-agency",
    storageBucket: "zenix-agency.firebasestorage.app",
    messagingSenderId: "229626192092",
    appId: "1:229626192092:web:2b28520bec0c2e2666d419",
    measurementId: "G-VKDR63FB20"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let cart = [];

// --- دالة تحميل السلة ---
async function loadCartFromDB() {
    if (!currentUser) return;
    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && userDocSnap.data().cart) {
            cart = userDocSnap.data().cart;
            updateCartUI();
        } else {
            cart = [];
            updateCartUI();
        }
    } catch (error) {
        console.error("Error loading cart:", error);
    }
}

// --- تسجيل الدخول ---
// نستخدم window لجعل الدالة مرئية لملف HTML
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            lastLogin: new Date()
        }, { merge: true });
        console.log("Logged in:", user.displayName);
    } catch (error) {
        console.error("Login Error:", error);
        alert("فشل تسجيل الدخول: " + error.message);
    }
};

// --- تسجيل الخروج ---
window.logout = () => {
    signOut(auth).then(() => {
        alert("تم تسجيل الخروج");
        location.reload();
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
};

// --- مراقبة حالة المستخدم ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const loginBtn = document.getElementById("login-btn");
        const userInfo = document.getElementById("user-info");
        const userImg = document.getElementById("user-img");

        if(loginBtn) loginBtn.style.display = "none";
        if(userInfo) userInfo.style.display = "flex";
        if(userImg) userImg.src = user.photoURL;
        
        loadCartFromDB();
    } else {
        currentUser = null;
        cart = [];
        updateCartUI();
        
        const loginBtn = document.getElementById("login-btn");
        const userInfo = document.getElementById("user-info");
        
        if(loginBtn) loginBtn.style.display = "block";
        if(userInfo) userInfo.style.display = "none";
    }
});

// --- إضافة للسلة ---
window.addToCart = async (packageName, price) => {
    if (!currentUser) {
        alert("يرجى تسجيل الدخول أولاً لإضافة منتجات للسلة");
        return;
    }

    const item = { name: packageName, price: price, id: Date.now(), priceValue: price };
    cart.push(item);
    updateCartUI();
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            cart: arrayUnion(item)
        });
        alert(`تمت إضافة ${packageName} للسلة بنجاح!`);
    } catch (error) {
        cart.pop();
        updateCartUI();
        console.error("Error adding to DB:", error);
        alert("حدث خطأ في حفظ البيانات.");
    }
};

// --- حذف من السلة ---
window.removeFromCart = async (itemId) => {
    if (!currentUser) return;

    const itemToRemove = cart.find(item => item.id === itemId);
    if (!itemToRemove) return;

    cart = cart.filter(item => item.id !== itemId);
    updateCartUI();

    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            cart: arrayRemove(itemToRemove)
        });
    } catch (error) {
        console.error("Error removing from DB:", error);
    }
};

// --- تحديث واجهة السلة ---
function updateCartUI() {
    const cartItemsDiv = document.getElementById("cart-items");
    const cartCountSpan = document.getElementById("cart-count");
    const cartTotalSpan = document.getElementById("cart-total");
    
    if(!cartItemsDiv) return;

    cartItemsDiv.innerHTML = "";
    let total = cart.reduce((sum, item) => sum + item.priceValue, 0);

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="color:var(--text-gray);">Cart is empty.</p>';
    } else {
        cart.forEach((item) => {
            cartItemsDiv.innerHTML += `
                <div style="background:#222; padding:10px; margin-bottom:10px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#fff; display:block; font-size:0.9rem;">${item.name}</strong>
                        <span style="color:var(--primary);">$${item.priceValue}</span>
                    </div>
                    <button onclick="removeFromCart(${item.id})" style="color:#ff4444; background:none; border:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
            `;
        });
    }

    if(cartCountSpan) cartCountSpan.innerText = cart.length;
    if(cartTotalSpan) cartTotalSpan.innerText = "$" + total;
}

// --- فتح/غلق السلة ---
window.toggleCart = () => {
    const sidebar = document.getElementById("cart-sidebar");
    if(sidebar) {
        sidebar.style.right = (sidebar.style.right === "0px") ? "-400px" : "0px";
    }
};

// --- إتمام الطلب ---
window.checkout = async () => {
    if (cart.length === 0) return alert("السلة فارغة!");
    
    const total = cart.reduce((sum, item) => sum + item.priceValue, 0);
    const cartItemsList = cart.map(i => `- ${i.name} ($${i.priceValue})`).join('\n');
    const message = `مرحباً Zenix Agency، أريد شراء الباقات التالية:\n${cartItemsList}\n\nالإجمالي: $${total}`;
    
    // ضع رقم الواتساب الخاص بك هنا
    const whatsappNumber = "201xxxxxxxxx"; 
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
};