import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import db from "./src/db.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || "sufra-secret-key";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  // Socket.io connection logic
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("join-restaurant", (restaurantId) => {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant ${restaurantId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      
      // Check subscription for non-super-admins
      if (!decoded.isSuperAdmin) {
        const restaurant = db.prepare("SELECT * FROM restaurants WHERE owner_id = ?").get(decoded.id) as any;
        if (restaurant && restaurant.subscription_expires_at) {
          const expiresAt = new Date(restaurant.subscription_expires_at);
          if (expiresAt < new Date()) {
            return res.status(403).json({ error: "لقد انتهى اشتراكك. يرجى التواصل مع الإدارة للتجديد.", expired: true });
          }
        }
      }
      
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const authenticateSuperAdmin = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded.isSuperAdmin) return res.status(403).json({ error: "Forbidden" });
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Guest OTP for orders
  app.post("/api/auth/guest-send-otp", (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`
      =======================================================
      NOTIFICATION: WhatsApp OTP
      To: ${phone}
      Code: ${code}
      =======================================================
      `);

      db.prepare("INSERT OR REPLACE INTO phone_verifications (phone, code) VALUES (?, ?)").run(phone, code);
      res.json({ success: true, message: "تم إرسال كود التحقق عبر الواتساب" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/guest-verify-otp", (req, res) => {
    try {
      const { phone, code } = req.body;
      const row = db.prepare("SELECT * FROM phone_verifications WHERE phone = ?").get(phone) as any;
      
      if (!row || row.code !== code) {
        return res.status(400).json({ error: "كود التحقق غير صحيح" });
      }

      db.prepare("DELETE FROM phone_verifications WHERE phone = ?").run(phone);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Customer Auth (Phone + WhatsApp OTP) ---
  app.post("/api/auth/customer-send-otp", (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`
      =======================================================
      NOTIFICATION: Login OTP (Registration)
      To: ${phone}
      Code: ${code}
      =======================================================
      `);
      
      // Save/Update code in users table for customer
      let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
      if (!user) {
        const id = uuidv4();
        db.prepare("INSERT INTO users (id, phone, name, role, verification_code) VALUES (?, ?, ?, ?, ?)").run(id, phone, `زبون ${phone.slice(-4)}`, 'customer', code);
      } else {
        db.prepare("UPDATE users SET verification_code = ? WHERE id = ?").run(code, user.id);
      }

      res.json({ success: true, message: "تم إرسال كود التحقق عبر واتساب" });
    } catch (error) {
      console.error("Customer OTP Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/customer-verify-otp", (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ error: "البيانات ناقصة" });

      const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (user.verification_code !== code) {
        return res.status(401).json({ error: "كود التحقق غير صحيح" });
      }

      // Mark as verified
      db.prepare("UPDATE users SET phone_verified = 1, verification_code = NULL WHERE id = ?").run(user.id);

      const token = jwt.sign({ 
        id: user.id, 
        phone: user.phone, 
        role: user.role,
        isSuperAdmin: !!user.is_super_admin 
      }, JWT_SECRET, { expiresIn: '365d' }); // 1 year for customers as requested "يحفظ تسجيل الدخول"

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          phone: user.phone, 
          name: user.name, 
          role: user.role,
          isSuperAdmin: !!user.is_super_admin 
        } 
      });
    } catch (error) {
      console.error("Customer Verify Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Auth Routes ---
  app.post("/api/auth/send-otp", (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });

      // Generate a simple 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a real app, you would use an SMS gateway here
      console.log(`[SIMULATED SMS] Verification code for ${phone}: ${code}`);

      // Store code in DB for this user (or create user if doesn't exist)
      let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
      if (!user) {
        const id = uuidv4();
        db.prepare("INSERT INTO users (id, phone, name, verification_code) VALUES (?, ?, ?, ?)").run(id, phone, `User ${phone.slice(-4)}`, code);
      } else {
        db.prepare("UPDATE users SET verification_code = ? WHERE id = ?").run(code, user.id);
      }

      res.json({ success: true, message: "تم إرسال كود التحقق" });
    } catch (error) {
      console.error("OTP Route Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ error: "البيانات ناقصة" });

      const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as any;
      if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

      if (user.verification_code !== code) {
        return res.status(401).json({ error: "كود التحقق غير صحيح" });
      }

      // Mark as verified
      db.prepare("UPDATE users SET phone_verified = 1, verification_code = NULL WHERE id = ?").run(user.id);

      const token = jwt.sign({ id: user.id, email: user.email, isSuperAdmin: !!user.is_super_admin }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { id: user.id, email: user.email, phone: user.phone, name: user.name, isSuperAdmin: !!user.is_super_admin, dashboardColor: user.dashboard_color } });
    } catch (error) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Bootstrap first super admin if none exists
      const superAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_super_admin = 1").get() as any;
      if (superAdminCount.count === 0 && email === "admin@zantex.com") {
        const id = uuidv4();
        const hashedPassword = bcrypt.hashSync(password || "password", 10);
        db.prepare("INSERT INTO users (id, email, password, name, is_super_admin) VALUES (?, ?, ?, ?, 1)").run(id, email, hashedPassword, "Super Admin");
      }

      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      
      if (!user) {
        const id = uuidv4();
        const hashedPassword = bcrypt.hashSync(password || "password", 10);
        db.prepare("INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)").run(id, email, hashedPassword, email.split('@')[0]);
        user = { id, email, name: email.split('@')[0], is_super_admin: 0 };
      }

      if (!bcrypt.compareSync(password || "password", user.password)) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, isSuperAdmin: !!user.is_super_admin }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, isSuperAdmin: !!user.is_super_admin, dashboardColor: user.dashboard_color } });
    } catch (error) {
      console.error("Login Route Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Restaurant Routes ---
  app.get("/api/restaurants/me", authenticate, (req: any, res) => {
    try {
      const restaurant = db.prepare("SELECT * FROM restaurants WHERE owner_id = ?").get(req.user.id) as any;
      if (!restaurant) {
        // Create default restaurant for new user
        const id = uuidv4();
        const slug = `rest-${req.user.id.slice(0, 5)}`;
        db.prepare("INSERT INTO restaurants (id, owner_id, name, slug) VALUES (?, ?, ?, ?)").run(id, req.user.id, `${req.user.name}'s Restaurant`, slug);
        const newRest = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id) as any;
        return res.json({
          ...newRest,
          ownerId: newRest.owner_id,
          minOrder: newRest.min_order,
          isDeliveryEnabled: !!newRest.is_delivery_enabled,
          whatsappNumber: newRest.whatsapp_number,
          themeColor: newRest.theme_color,
          subscriptionStatus: newRest.subscription_status,
          subscriptionStartedAt: newRest.subscription_started_at,
          subscriptionExpiresAt: newRest.subscription_expires_at,
          address: newRest.address,
          phone: newRest.phone
        });
      }
      res.json({
        ...restaurant,
        ownerId: restaurant.owner_id,
        minOrder: restaurant.min_order,
        isDeliveryEnabled: !!restaurant.is_delivery_enabled,
        whatsappNumber: restaurant.whatsapp_number,
        themeColor: restaurant.theme_color,
        subscriptionStatus: restaurant.subscription_status,
        subscriptionStartedAt: restaurant.subscription_started_at,
        subscriptionExpiresAt: restaurant.subscription_expires_at,
        address: restaurant.address,
        phone: restaurant.phone
      });
    } catch (error) {
      console.error("Get Restaurant Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/restaurants/public/:slug", (req, res) => {
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE slug = ?").get(req.params.slug) as any;
    if (!restaurant) return res.status(404).json({ error: "Not found" });
    
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    let isIpBlocked = false;
    if (ip) {
      const blocked = db.prepare("SELECT 1 FROM blocked_ips WHERE restaurant_id = ? AND ip = ?").get(restaurant.id, ip);
      if (blocked) isIpBlocked = true;
    }

    res.json({
      ...restaurant,
      ownerId: restaurant.owner_id,
      minOrder: restaurant.min_order,
      isDeliveryEnabled: !!restaurant.is_delivery_enabled,
      whatsappNumber: restaurant.whatsapp_number,
      themeColor: restaurant.theme_color,
      subscriptionStatus: restaurant.subscription_status,
      subscriptionStartedAt: restaurant.subscription_started_at,
      subscriptionExpiresAt: restaurant.subscription_expires_at,
      address: restaurant.address,
      phone: restaurant.phone,
      isIpBlocked
    });
  });

  app.put("/api/restaurants/me", authenticate, (req: any, res) => {
    try {
      const { name, slug, logo, minOrder, isDeliveryEnabled, whatsappNumber, address, phone, themeColor, dashboardColor } = req.body;
      
      // Check if slug is taken by another restaurant
      const existing = db.prepare("SELECT id FROM restaurants WHERE slug = ? AND owner_id != ?").get(slug, req.user.id);
      if (existing) {
        return res.status(400).json({ error: "هذا الرابط مستخدم بالفعل، يرجى اختيار رابط آخر." });
      }

      db.prepare(`
        UPDATE restaurants 
        SET name = ?, slug = ?, logo = ?, min_order = ?, is_delivery_enabled = ?, whatsapp_number = ?, address = ?, phone = ?, theme_color = ?
        WHERE owner_id = ?
      `).run(name, slug, logo, minOrder, isDeliveryEnabled ? 1 : 0, whatsappNumber, address, phone, themeColor, req.user.id);

      // Update dashboard color in users table
      if (dashboardColor) {
        db.prepare("UPDATE users SET dashboard_color = ? WHERE id = ?").run(dashboardColor, req.user.id);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Update Restaurant Error:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث البيانات." });
    }
  });

  // --- Categories ---
  app.get("/api/restaurants/:id/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order ASC").all(req.params.id);
    res.json(categories.map((c: any) => ({
      ...c,
      order: c.sort_order
    })));
  });

  app.post("/api/restaurants/:id/categories", authenticate, (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    const count = (db.prepare("SELECT COUNT(*) as count FROM categories WHERE restaurant_id = ?").get(req.params.id) as any).count;
    db.prepare("INSERT INTO categories (id, restaurant_id, name, sort_order) VALUES (?, ?, ?, ?)").run(id, req.params.id, name, count);
    res.json({ id, name });
  });

  app.put("/api/categories/:id", authenticate, (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", authenticate, (req, res) => {
    // Also delete items in this category or set their category to null
    db.prepare("DELETE FROM items WHERE category_id = ?").run(req.params.id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Items ---
  app.get("/api/restaurants/:id/items", (req, res) => {
    const items = db.prepare("SELECT * FROM items WHERE restaurant_id = ?").all(req.params.id);
    res.json(items.map((i: any) => ({ 
      ...i, 
      isAvailable: !!i.is_available,
      categoryId: i.category_id,
      discountPrice: i.discount_price
    })));
  });

  app.post("/api/restaurants/:id/items", authenticate, (req, res) => {
    const { name, description, price, discountPrice, image, categoryId } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO items (id, restaurant_id, category_id, name, description, price, discount_price, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, req.params.id, categoryId, name, description, price, discountPrice, image);
    res.json({ id });
  });

  app.put("/api/items/:id", authenticate, (req, res) => {
    const { name, description, price, discountPrice, image, categoryId } = req.body;
    db.prepare("UPDATE items SET name = ?, description = ?, price = ?, discount_price = ?, image = ?, category_id = ? WHERE id = ?").run(name, description, price, discountPrice, image, categoryId, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/items/:id/toggle", authenticate, (req, res) => {
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id) as any;
    db.prepare("UPDATE items SET is_available = ? WHERE id = ?").run(item.is_available ? 0 : 1, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/items/:id", authenticate, (req, res) => {
    db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Zones ---
  app.get("/api/restaurants/:id/zones", (req, res) => {
    const zones = db.prepare("SELECT * FROM zones WHERE restaurant_id = ?").all(req.params.id);
    res.json(zones);
  });

  app.post("/api/restaurants/:id/zones", authenticate, (req, res) => {
    const { name, fee } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO zones (id, restaurant_id, name, fee) VALUES (?, ?, ?, ?)").run(id, req.params.id, name, fee);
    res.json({ id });
  });

  app.delete("/api/zones/:id", authenticate, (req, res) => {
    db.prepare("DELETE FROM zones WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Orders ---
  // --- Coupons ---
  app.get("/api/restaurants/:id/coupons", authenticate, (req, res) => {
    const coupons = db.prepare("SELECT * FROM coupons WHERE restaurant_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(coupons);
  });

  app.post("/api/restaurants/:id/coupons", authenticate, (req, res) => {
    const { code, discountPercentage, expiryDate, usageLimit, usageLimitPerUser, isFirstOrderOnly } = req.body;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO coupons (id, restaurant_id, code, discount_percentage, expiry_date, usage_limit, usage_limit_per_user, is_first_order_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, code, discountPercentage, expiryDate, usageLimit, usageLimitPerUser || 1, isFirstOrderOnly ? 1 : 0);
    res.json({ id });
  });

  app.put("/api/coupons/:id", authenticate, (req, res) => {
    const { code, discountPercentage, expiryDate, usageLimit, usageLimitPerUser, isFirstOrderOnly, isActive } = req.body;
    db.prepare(`
      UPDATE coupons 
      SET code = ?, discount_percentage = ?, expiry_date = ?, usage_limit = ?, usage_limit_per_user = ?, is_first_order_only = ?, is_active = ?
      WHERE id = ?
    `).run(code, discountPercentage, expiryDate, usageLimit, usageLimitPerUser || 1, isFirstOrderOnly ? 1 : 0, isActive ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/coupons/:id", authenticate, (req, res) => {
    db.prepare("DELETE FROM coupons WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/restaurants/:id/announce-coupon", authenticate, (req, res) => {
    const { code, discountPercentage } = req.body;
    const restaurantId = req.params.id;
    
    // Get restaurant name for the notification
    const restaurant = db.prepare("SELECT name, slug FROM restaurants WHERE id = ?").get(restaurantId) as any;
    
    const notificationData = { 
      code, 
      discountPercentage, 
      restaurantName: restaurant?.name || "مطعمنا",
      slug: restaurant?.slug
    };

    // Broadcast globally to all connected sockets
    io.emit("global-coupon-alert", notificationData);
    
    // Also keep the specific one for the menu page if needed
    io.emit(`coupon-alert-${restaurantId}`, notificationData);
    
    res.json({ success: true });
  });

  app.post("/api/restaurants/:id/validate-coupon", (req, res) => {
    try {
      const { code, customerPhone } = req.body;
      const restaurantId = req.params.id;
      
      if (!code) {
        return res.status(400).json({ error: "يرجى إدخال كود الخصم" });
      }

      // Find the coupon, being lenient with is_active
      const coupon = db.prepare(`
        SELECT * FROM coupons 
        WHERE restaurant_id = ? 
        AND code = ? 
        AND (is_active = 1 OR is_active = 'true' OR is_active IS NULL)
      `).get(restaurantId, code.trim()) as any;
      
      if (!coupon) {
        return res.status(404).json({ error: "كود الخصم غير صحيح أو غير مفعل حالياً" });
      }

      // Check expiry
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return res.status(400).json({ error: "لقد انتهت صلاحية كود الخصم" });
      }

      // Check total usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return res.status(400).json({ error: "لقد تم استنفاد عدد مرات استخدام هذا الكود بنجاح" });
      }

      // Check usage per user
      if (customerPhone) {
        const userUsage = db.prepare("SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND customer_phone = ? AND coupon_code = ?").get(restaurantId, customerPhone, code) as any;
        if (userUsage && userUsage.count >= (coupon.usage_limit_per_user || 1)) {
          return res.status(400).json({ error: "لقد استخدمت هذا الكود مسبقاً" });
        }

        // Check first order only
        if (coupon.is_first_order_only) {
          const previousOrder = db.prepare("SELECT 1 FROM orders WHERE restaurant_id = ? AND customer_phone = ?").get(restaurantId, customerPhone);
          if (previousOrder) {
            return res.status(400).json({ error: "كود الخصم مخصص للطلب الأول فقط" });
          }
        }
      }

      res.json({
        id: coupon.id,
        code: coupon.code,
        discountPercentage: coupon.discount_percentage
      });
    } catch (error) {
      console.error("Coupon Validation Error:", error);
      res.status(500).json({ error: "خطأ في التحقق من كود الخصم" });
    }
  });

  app.get("/api/restaurants/:id/orders", authenticate, (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC").all(req.params.id);
    const ordersWithItems = orders.map((o: any) => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(o.id);
      return { 
        ...o, 
        items,
        restaurantId: o.restaurant_id,
        deliveryFee: o.delivery_fee,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        customerZone: o.customer_zone,
        googleMapsLink: o.google_maps_link,
        tableNumber: o.table_number,
        customerIp: o.customer_ip,
        createdAt: new Date(o.created_at)
      };
    });
    res.json(ordersWithItems);
  });

  app.get("/api/orders/:id", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
    res.json({ 
      ...order, 
      items, 
      restaurantId: order.restaurant_id,
      deliveryFee: order.delivery_fee,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      customerZone: order.customer_zone,
      googleMapsLink: order.google_maps_link,
      tableNumber: order.table_number,
      customerIp: order.customer_ip,
      createdAt: new Date(order.created_at) 
    });
  });

  // --- Super Admin Routes ---
  app.get("/api/admin/restaurants", authenticateSuperAdmin, (req, res) => {
    const restaurants = db.prepare(`
      SELECT r.*, u.email as owner_email 
      FROM restaurants r 
      JOIN users u ON r.owner_id = u.id
    `).all();
    res.json(restaurants.map((r: any) => ({
      ...r,
      ownerEmail: r.owner_email,
      subscriptionStartedAt: r.subscription_started_at,
      subscriptionExpiresAt: r.subscription_expires_at
    })));
  });

  app.post("/api/admin/restaurants/:id/subscription", authenticateSuperAdmin, (req, res) => {
    const { duration } = req.body; // 'day', 'week', 'month'
    let days = 0;
    if (duration === 'day') days = 1;
    else if (duration === 'week') days = 7;
    else if (duration === 'month') days = 30;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const startedAt = new Date().toISOString();
    
    db.prepare("UPDATE restaurants SET subscription_expires_at = ?, subscription_started_at = ?, subscription_status = 'active' WHERE id = ?").run(expiresAt.toISOString(), startedAt, req.params.id);
    res.json({ success: true, expiresAt: expiresAt.toISOString() });
  });

  app.post("/api/admin/users", authenticateSuperAdmin, (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      db.prepare("INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)").run(id, email, hashedPassword, name);
      
      // Create default restaurant for the new user immediately so they appear in the admin list
      const restId = uuidv4();
      const slug = `rest-${id.replace(/-/g, '').slice(0, 10)}`;
      db.prepare("INSERT INTO restaurants (id, owner_id, name, slug) VALUES (?, ?, ?, ?)").run(restId, id, name, slug);
      
      console.log(`Admin created user: ${email} with restaurant slug: ${slug}`);
      res.json({ id });
    } catch (e: any) {
      console.error("Admin Add User Error:", e);
      if (e.message.includes("UNIQUE constraint failed: users.email")) {
        res.status(400).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
      } else if (e.message.includes("UNIQUE constraint failed: restaurants.slug")) {
        // Retry with a different slug if needed, but with 10 chars of UUID it's extremely unlikely
        res.status(400).json({ error: "حدث خطأ في إنشاء الرابط، يرجى المحاولة مرة أخرى" });
      } else {
        res.status(400).json({ error: "حدث خطأ أثناء إضافة المستخدم" });
      }
    }
  });

  app.get("/api/restaurants/:id", (req, res) => {
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(req.params.id) as any;
    if (!restaurant) return res.status(404).json({ error: "Not found" });
    res.json({
      ...restaurant,
      ownerId: restaurant.owner_id,
      minOrder: restaurant.min_order,
      isDeliveryEnabled: !!restaurant.is_delivery_enabled,
      whatsappNumber: restaurant.whatsapp_number,
      themeColor: restaurant.theme_color,
      subscriptionStatus: restaurant.subscription_status,
      subscriptionStartedAt: restaurant.subscription_started_at,
      subscriptionExpiresAt: restaurant.subscription_expires_at,
      address: restaurant.address,
      phone: restaurant.phone
    });
  });

  app.put("/api/restaurants/me", authenticate, (req: any, res) => {
    const { name, minOrder, isDeliveryEnabled, whatsappNumber, themeColor, dashboardColor, address, phone } = req.body;
    db.prepare(`
      UPDATE restaurants 
      SET name = ?, min_order = ?, is_delivery_enabled = ?, whatsapp_number = ?, theme_color = ?, address = ?, phone = ? 
      WHERE owner_id = ?
    `).run(name, minOrder, isDeliveryEnabled ? 1 : 0, whatsappNumber, themeColor, address, phone, req.user.id);
    
    if (dashboardColor) {
      db.prepare("UPDATE users SET dashboard_color = ? WHERE id = ?").run(dashboardColor, req.user.id);
    }
    
    res.json({ success: true });
  });

  app.delete("/api/admin/restaurants/:id", authenticateSuperAdmin, (req, res) => {
    const restaurant = db.prepare("SELECT owner_id FROM restaurants WHERE id = ?").get(req.params.id) as any;
    if (restaurant) {
      db.prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?)").run(req.params.id);
      db.prepare("DELETE FROM messages WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?)").run(req.params.id);
      db.prepare("DELETE FROM orders WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM items WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM categories WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM zones WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM blocked_users WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM blocked_ips WHERE restaurant_id = ?").run(req.params.id);
      db.prepare("DELETE FROM restaurants WHERE id = ?").run(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(restaurant.owner_id);
    }
    res.json({ success: true });
  });

  app.post("/api/orders", (req, res) => {
    const { restaurantId, type, items, subtotal, deliveryFee, total, customerName, customerPhone, customerAddress, customerZone, googleMapsLink, tableNumber, notes, couponCode, discountAmount } = req.body;
    
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    // Check if IP is blocked
    if (ip) {
      const isIpBlocked = db.prepare("SELECT 1 FROM blocked_ips WHERE restaurant_id = ? AND ip = ?").get(restaurantId, ip);
      if (isIpBlocked) {
        return res.status(403).json({ error: "عذراً، لقد تم حظر جهازك من قبل المطعم." });
      }
    }

    // Check if user is blocked
    if (customerPhone) {
      const isBlocked = db.prepare("SELECT 1 FROM blocked_users WHERE restaurant_id = ? AND phone = ?").get(restaurantId, customerPhone);
      if (isBlocked) {
        return res.status(403).json({ error: "عذراً، لا يمكن إتمام الطلب. يرجى التواصل مع المطعم." });
      }
    }

    const orderId = uuidv4();

    db.prepare(`
      INSERT INTO orders (id, restaurant_id, type, status, subtotal, delivery_fee, total, customer_name, customer_phone, customer_address, customer_zone, google_maps_link, table_number, customer_ip, notes, coupon_code, discount_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, restaurantId, type, 'pending', subtotal, deliveryFee, total, customerName, customerPhone, customerAddress, customerZone, googleMapsLink, tableNumber, ip, notes, couponCode || null, discountAmount || 0);

    // Update coupon usage if applicable
    if (couponCode) {
      db.prepare("UPDATE coupons SET usage_count = usage_count + 1 WHERE restaurant_id = ? AND code = ?").run(restaurantId, couponCode);
    }

    for (const item of items) {
      db.prepare("INSERT INTO order_items (id, order_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), orderId, item.name, item.price, item.quantity);
    }

    // Real-time Notification
    io.to(`restaurant-${restaurantId}`).emit("new-order", { 
      id: orderId, 
      type, 
      total, 
      customerName, 
      tableNumber,
      createdAt: new Date().toISOString()
    });

    res.json({ id: orderId });
  });

  app.patch("/api/orders/:id/status", authenticate, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/orders/:id/cancel", (req, res) => {
    const order = db.prepare("SELECT status FROM orders WHERE id = ?").get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: "لا يمكن إلغاء الطلب بعد البدء في تحضيره" });
    }
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/orders/:id", authenticate, (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    // Only allow deleting completed or cancelled orders
    if (order.status !== "completed" && order.status !== "cancelled") {
      return res.status(400).json({ error: "لا يمكن حذف الطلب إلا إذا كان مكتملاً أو ملغياً" });
    }
    
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(req.params.id);
    db.prepare("DELETE FROM messages WHERE order_id = ?").run(req.params.id);
    db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Chat Routes ---
  app.get("/api/orders/:id/messages", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE order_id = ? ORDER BY created_at ASC").all(req.params.id);
    res.json(messages.map((m: any) => ({
      ...m,
      orderId: m.order_id,
      createdAt: m.created_at
    })));
  });

  app.post("/api/orders/:id/messages", (req, res) => {
    const { sender, text } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO messages (id, order_id, sender, text) VALUES (?, ?, ?, ?)").run(id, req.params.id, sender, text);
    res.json({ id, sender, text, createdAt: new Date().toISOString() });
  });

  // --- Analytics ---
  app.get("/api/restaurants/:id/analytics", authenticate, (req, res) => {
    const totalRevenue = db.prepare("SELECT SUM(total) as total FROM orders WHERE restaurant_id = ? AND status = 'completed'").get(req.params.id) as any;
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ?").get(req.params.id) as any;
    const deliveryCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND type = 'delivery'").get(req.params.id) as any;
    const deliveryRevenue = db.prepare("SELECT SUM(total) as total FROM orders WHERE restaurant_id = ? AND type = 'delivery' AND status = 'completed'").get(req.params.id) as any;
    
    const zoneStats = db.prepare(`
      SELECT customer_zone as name, COUNT(*) as value 
      FROM orders 
      WHERE restaurant_id = ? AND type = 'delivery' 
      GROUP BY customer_zone
    `).all(req.params.id);

    res.json({
      totalRevenue: totalRevenue.total || 0,
      orderCount: orderCount.count || 0,
      deliveryCount: deliveryCount.count || 0,
      deliveryRevenue: deliveryRevenue.total || 0,
      zoneData: zoneStats
    });
  });

  // --- Blocked Users ---
  app.get("/api/restaurants/:id/blocked", authenticate, (req, res) => {
    const blocked = db.prepare("SELECT * FROM blocked_users WHERE restaurant_id = ?").all(req.params.id);
    res.json(blocked);
  });

  app.post("/api/restaurants/:id/block", authenticate, (req, res) => {
    const { phone } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO blocked_users (id, restaurant_id, phone) VALUES (?, ?, ?)").run(id, req.params.id, phone);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "المستخدم محظور بالفعل" });
    }
  });

  app.delete("/api/restaurants/:id/unblock/:phone", authenticate, (req, res) => {
    db.prepare("DELETE FROM blocked_users WHERE restaurant_id = ? AND phone = ?").run(req.params.id, req.params.phone);
    res.json({ success: true });
  });

  // --- Blocked IPs ---
  app.get("/api/restaurants/:id/blocked-ips", authenticate, (req, res) => {
    const blocked = db.prepare("SELECT * FROM blocked_ips WHERE restaurant_id = ?").all(req.params.id);
    res.json(blocked);
  });

  app.post("/api/restaurants/:id/block-ip", authenticate, (req, res) => {
    const { ip } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO blocked_ips (id, restaurant_id, ip) VALUES (?, ?, ?)").run(id, req.params.id, ip);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "IP محظور بالفعل" });
    }
  });

  app.delete("/api/restaurants/:id/unblock-ip/:ip", authenticate, (req, res) => {
    db.prepare("DELETE FROM blocked_ips WHERE restaurant_id = ? AND ip = ?").run(req.params.id, req.params.ip);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
