# 🔑 Environment Variables pentru Netlify

## 📝 **Cum să adaugi în Netlify Dashboard:**

1. **Mergi la:** Netlify Dashboard → Site Settings → Environment Variables
2. **Click:** "Add a variable" (conform screenshot-ului tău)
3. **Adaugă fiecare variabilă** din lista de mai jos:

---

## 🗂️ **Lista completă Environment Variables:**

### **1. DATABASE (REQUIRED)**

```bash
Key: DATABASE_URL
Value: postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
Secret: ✅ (bifează "Contains secret values")
Scope: All scopes
```

### **2. FIREBASE API KEY (REQUIRED)**

```bash
Key: VITE_FIREBASE_API_KEY
Value: [YOUR_FIREBASE_API_KEY_HERE]
Secret: ✅ (bifează "Contains secret values")
Scope: All scopes
```

### **2b. FIREBASE ADMIN SDK (REQUIRED for backend functions)**
```
Key: FIREBASE_PROJECT_ID
Value: your-project-id
Secret: ❌ (nu bifezi)
Scope: All scopes

Key: FIREBASE_PRIVATE_KEY_ID
Value: [YOUR_PRIVATE_KEY_ID]
Secret: ✅ (bifează "Contains secret values")
Scope: All scopes

Key: FIREBASE_PRIVATE_KEY
Value: [YOUR_PRIVATE_KEY_WITH_NEWLINES]
Secret: ✅ (bifează "Contains secret values")
Scope: All scopes

Key: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
Secret: ❌ (nu bifezi)
Scope: All scopes

Key: FIREBASE_CLIENT_ID
Value: [YOUR_CLIENT_ID]
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **3. FIREBASE AUTH DOMAIN (REQUIRED)**
```
Key: VITE_FIREBASE_AUTH_DOMAIN
Value: your-project-id.firebaseapp.com
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **4. FIREBASE PROJECT ID (REQUIRED)**
```
Key: VITE_FIREBASE_PROJECT_ID
Value: your-project-id
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **5. FIREBASE STORAGE BUCKET (REQUIRED)**
```
Key: VITE_FIREBASE_STORAGE_BUCKET
Value: your-project-id.appspot.com
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **6. FIREBASE MESSAGING SENDER ID (REQUIRED)**
```
Key: VITE_FIREBASE_MESSAGING_SENDER_ID
Value: 123456789012
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **7. FIREBASE APP ID (REQUIRED)**
```
Key: VITE_FIREBASE_APP_ID
Value: 1:123456789012:web:abcdef1234567890abcdef
Secret: ❌ (nu bifezi)
Scope: All scopes
```

### **8. GOOGLE ANALYTICS (OPTIONAL)**
```
Key: VITE_GA_TRACKING_ID
Value: G-XXXXXXXXXX
Secret: ❌ (nu bifezi)
Scope: All scopes
```

---

## 🎯 **Unde găsești valorile:**

### **DATABASE_URL:**
- Mergi în **Neon Console**
- Click **"Connect"** button
- Copiază connection string-ul

### **Firebase Values:**
- Mergi în **Firebase Console**
- Project Settings → General tab
- Scroll la "Your apps" → Web app
- Copiază config object values

### **Google Analytics:**
- Mergi în **Google Analytics**
- Admin → Property → Data Streams
- Copiază Measurement ID

---

## ✅ **Verificare:**
După ce adaugi toate variabilele, fă un deploy nou în Netlify și verifică că totul funcționează!
