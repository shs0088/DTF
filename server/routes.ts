import { Router, Request, Response } from 'express';
import { dbInstance, UserAccount, StockReservation } from './db';
import { Product, Order, CartItem, Design, DesignerProfile, WithdrawalRequest, BusinessSettings } from '../src/types';

import { generatePdfReport, generateWordReport } from './reportGenerator';

export const apiRouter = Router();

// Helper to authenticate role
async function getAuthenticatedUser(req: Request): Promise<UserAccount | null> {
  const authHeader = req.headers['authorization'];
  const roleHeader = req.headers['x-role'] as string;
  const userHeader = req.headers['x-user-id'] as string;

  const allUsers = await dbInstance.getUsers();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = allUsers.find(u => u.id === token || u.email === token);
    if (user) return user;
  }

  if (userHeader) {
    const user = allUsers.find(u => u.id === userHeader);
    if (user) return user;
  }

  if (roleHeader) {
    const defaultUserForRole = allUsers.find(u => u.role === roleHeader);
    if (defaultUserForRole) return defaultUserForRole;
  }

  return null;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & SESSIONS
// -------------------------------------------------------------
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    let user = await dbInstance.getUserByEmail(email || '');
    
    // If user doesn't exist yet, but email provided in sandbox, create or resolve
    if (!user && email) {
      user = {
        id: `user_${Date.now()}`,
        name: email.split('@')[0],
        email: email,
        passwordHash: password || 'default',
        role: role || 'customer',
        createdAt: new Date().toISOString()
      };
      await dbInstance.createUser(user);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({
      token: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        address: user.address,
        designerProfileId: user.designerProfileId
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone, city, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existing = await dbInstance.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const assignedRole = role === 'admin' ? 'customer' : (role || 'customer');
    const newUser: UserAccount = {
      id: `user_${Date.now()}`,
      name,
      email,
      passwordHash: password || 'pass123',
      role: assignedRole,
      phone,
      city,
      address,
      createdAt: new Date().toISOString()
    };

    await dbInstance.createUser(newUser);

    return res.status(201).json({
      token: newUser.id,
      user: newUser
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register' });
  }
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// -------------------------------------------------------------
// 2. PRODUCTS & INVENTORY
// -------------------------------------------------------------
apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { category, type } = req.query;
    let products = await dbInstance.getProducts();

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    if (type) {
      products = products.filter(p => p.type === type);
    }

    return res.json({ products });
  } catch (error: any) {
    console.error('Failed to get products:', error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

apiRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await dbInstance.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ product });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Admin Product Management
apiRouter.post('/admin/products', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const newProduct: Product = {
      id: req.body.id || `prod_${Date.now()}`,
      name: req.body.name || 'New Product',
      nameAr: req.body.nameAr || 'منتج جديد',
      description: req.body.description || '',
      descriptionAr: req.body.descriptionAr || '',
      type: req.body.type || 'ready_to_sell',
      basePrice: Number(req.body.basePrice) || 10,
      rating: 5.0,
      reviewsCount: 0,
      isBestSeller: false,
      category: req.body.category || 't_shirts',
      tags: req.body.tags || ['apparel'],
      images: req.body.images || { primary: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80' },
      colors: req.body.colors || [{ name: 'Black', hex: '#0B0F17' }],
      sizes: req.body.sizes || ['S', 'M', 'L', 'XL'],
      variants: req.body.variants || [],
      printableAreas: req.body.printableAreas || [],
      stock: Number(req.body.stock) || 100
    };

    const saved = await dbInstance.saveProduct(newProduct);
    return res.status(201).json({ product: saved });
  } catch (error: any) {
    console.error('Failed to create product:', error);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

apiRouter.put('/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const existing = await dbInstance.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = {
      ...existing,
      ...req.body
    };

    const saved = await dbInstance.saveProduct(updated);
    return res.json({ product: saved });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

apiRouter.delete('/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    await dbInstance.deleteProduct(req.params.id);
    return res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// -------------------------------------------------------------
// 3. DESIGNS & GALLERY
// -------------------------------------------------------------
apiRouter.get('/designs', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let designs = await dbInstance.getDesigns();

    if (category && category !== 'all') {
      designs = designs.filter(d => d.category === category || (d.tags && d.tags.includes(category as string)));
    }

    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      designs = designs.filter(d => d.status === 'published' || d.status === 'approved');
    }

    return res.json({ designs });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

apiRouter.post('/designs/upload-check', async (req: Request, res: Response) => {
  try {
    const { fileType, sizeBytes, widthPx, heightPx, hasTransparency } = req.body;
    const settings = await dbInstance.getSettings();

    const allowedFormats = settings.artworkValidationRules.allowedFormats;
    const maxBytes = settings.artworkValidationRules.maxFileSizeBytes;

    const reasons: string[] = [];

    if (sizeBytes && sizeBytes > maxBytes) {
      reasons.push(`File exceeds maximum size of ${Math.round(maxBytes / (1024 * 1024))}MB.`);
    }

    if (fileType && !allowedFormats.some(fmt => fileType.toLowerCase().includes(fmt))) {
      reasons.push(`File format .${fileType} is not supported. Please upload PNG, SVG, PDF, AI, or PSD.`);
    }

    const isValid = reasons.length === 0;

    return res.json({
      isValid,
      reasons,
      warning: !hasTransparency ? 'Image does not appear to contain alpha transparency. Dark backgrounds will be printed unless modified.' : undefined,
      recommendedDpi: 300
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Artwork validation error' });
  }
});

// -------------------------------------------------------------
// 4. STOCK RESERVATION & CART VALIDATION (ATOMIC)
// -------------------------------------------------------------
apiRouter.post('/cart/validate', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: CartItem[] };
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const validatedItems: CartItem[] = [];
    let calculatedSubtotal = 0;
    const errors: string[] = [];

    const products = await dbInstance.getProducts();

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        errors.push(`Product ${item.productId} is no longer available.`);
        continue;
      }

      let availableStock = product.stock;
      let priceModifier = 0;

      if (item.selectedSize || item.selectedColor) {
        const variant = product.variants?.find(v => 
          (!item.selectedSize || v.size === item.selectedSize) &&
          (!item.selectedColor || v.colorName?.toLowerCase() === item.selectedColor.toLowerCase())
        );
        if (variant) {
          availableStock = variant.stock;
          priceModifier = variant.priceModifier || 0;
        }
      }

      if (availableStock < item.quantity) {
        errors.push(`Not enough stock for ${product.name} (${item.selectedSize || ''} ${item.selectedColor || ''}). Available: ${availableStock}`);
        continue;
      }

      let trustedUnitPrice = product.basePrice + priceModifier;
      if (item.design?.royaltyRate) {
        trustedUnitPrice += item.design.royaltyRate;
      }

      const printableArea = product.printableAreas?.find(a => a.location === item.productionSpec?.printLocation) 
        || product.printableAreas?.[0];
      
      let validatedWidthCm = item.productionSpec?.widthCm || 10;
      let validatedHeightCm = item.productionSpec?.heightCm || 10;

      if (printableArea) {
        if (validatedWidthCm > printableArea.maxWidthCm) validatedWidthCm = printableArea.maxWidthCm;
        if (validatedHeightCm > printableArea.maxHeightCm) validatedHeightCm = printableArea.maxHeightCm;
      }

      const validatedItem: CartItem = {
        ...item,
        unitPrice: trustedUnitPrice,
        productionSpec: {
          ...item.productionSpec,
          widthCm: validatedWidthCm,
          heightCm: validatedHeightCm
        }
      };

      calculatedSubtotal += trustedUnitPrice * item.quantity;
      validatedItems.push(validatedItem);
    }

    const settings = await dbInstance.getSettings();
    const deliveryFee = calculatedSubtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee;
    const calculatedTotal = calculatedSubtotal + deliveryFee;

    return res.json({
      valid: errors.length === 0,
      errors,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      deliveryFee,
      total: calculatedTotal,
      currency: settings.currency
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Cart validation failed' });
  }
});

apiRouter.post('/cart/reserve', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const customerId = user ? user.id : (req.body.customerId || `guest_${Date.now()}`);
    const { items } = req.body as { items: CartItem[] };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items required for reservation' });
    }

    const settings = await dbInstance.getSettings();
    const reservationMinutes = settings.bankTransferReservationMinutes || 15;
    const reservations: StockReservation[] = [];

    for (const item of items) {
      let variantId: string | undefined;
      const prod = await dbInstance.getProductById(item.productId);
      if (!prod) continue;

      if (item.selectedSize || item.selectedColor) {
        const v = prod.variants?.find(variant => 
          (!item.selectedSize || variant.size === item.selectedSize) &&
          (!item.selectedColor || variant.colorName?.toLowerCase() === item.selectedColor.toLowerCase())
        );
        if (v) variantId = v.id;
      }

      const result = await dbInstance.createAtomicReservation(
        item.productId,
        variantId,
        item.quantity,
        customerId,
        reservationMinutes
      );

      if (result.success && result.reservation) {
        reservations.push(result.reservation);
      }
    }

    const expiresAt = new Date(Date.now() + reservationMinutes * 60 * 1000).toISOString();

    return res.json({
      success: true,
      expiresAt,
      reservationMinutes,
      reservations
    });
  } catch (error: any) {
    console.error('Reservation error:', error);
    return res.status(500).json({ error: 'Failed to reserve stock' });
  }
});

// -------------------------------------------------------------
// 5. ORDERS & CHECKOUT
// -------------------------------------------------------------
apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const customerId = user ? user.id : (req.body.customerId || `cust_${Date.now()}`);

    const { customerInfo, items, deliveryType, paymentMethod, giftWrapping } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const settings = await dbInstance.getSettings();
    const products = await dbInstance.getProducts();

    let trustedSubtotal = 0;
    const verifiedItems: CartItem[] = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} is invalid or removed` });
      }

      let priceModifier = 0;
      if (item.selectedSize || item.selectedColor) {
        const v = product.variants?.find(variant => 
          (!item.selectedSize || variant.size === item.selectedSize) &&
          (!item.selectedColor || variant.colorName?.toLowerCase() === item.selectedColor.toLowerCase())
        );
        if (v) priceModifier = v.priceModifier || 0;
      }

      let unitPrice = product.basePrice + priceModifier;
      if (item.design?.royaltyRate) {
        unitPrice += item.design.royaltyRate;
      }

      const printableArea = product.printableAreas?.find(a => a.location === item.productionSpec?.printLocation) 
        || product.printableAreas?.[0];
      
      let w = item.productionSpec?.widthCm || 10;
      let h = item.productionSpec?.heightCm || 10;
      if (printableArea) {
        w = Math.min(w, printableArea.maxWidthCm);
        h = Math.min(h, printableArea.maxHeightCm);
      }

      const verifiedItem: CartItem = {
        ...item,
        unitPrice,
        productionSpec: {
          ...item.productionSpec,
          widthCm: w,
          heightCm: h
        }
      };

      trustedSubtotal += unitPrice * item.quantity;
      verifiedItems.push(verifiedItem);

      // Credit Designer
      if (item.design?.designerId) {
        const designer = await dbInstance.getDesignerProfileById(item.design.designerId);
        if (designer) {
          const royalty = (item.design.royaltyRate || 1.5) * item.quantity;
          designer.totalEarnings += royalty;
          designer.withdrawableBalance += royalty;
          designer.totalSoldOrUsed += item.quantity;
          designer.salesCount = designer.totalSoldOrUsed;
          designer.balance = designer.withdrawableBalance;
          await dbInstance.saveDesignerProfile(designer);
        }
      }
    }

    const deliveryFee = deliveryType === 'store_pickup' 
      ? 0 
      : (trustedSubtotal >= settings.freeDeliveryThreshold ? 0 : settings.standardDeliveryFee);

    const giftWrappingFee = giftWrapping ? 1.5 : 0;
    const trustedTotal = trustedSubtotal + deliveryFee + giftWrappingFee;

    const orderNumber = `#DTF-${Math.floor(100000 + Math.random() * 900000)}`;
    const reservationMinutes = settings.bankTransferReservationMinutes || 15;
    const reservationExpiresAt = paymentMethod === 'bank_transfer'
      ? new Date(Date.now() + reservationMinutes * 60 * 1000).toISOString()
      : undefined;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      customerId,
      customerInfo,
      items: verifiedItems,
      subtotal: trustedSubtotal,
      deliveryFee,
      total: trustedTotal,
      totalAmount: trustedTotal,
      currency: settings.currency,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      paymentStatus: 'pending',
      deliveryType: deliveryType || 'delivery',
      status: paymentMethod === 'bank_transfer' ? 'payment_pending' : 'new',
      statusHistory: [
        {
          status: paymentMethod === 'bank_transfer' ? 'payment_pending' : 'new',
          timestamp: new Date().toISOString(),
          note: `Order placed via ${paymentMethod === 'bank_transfer' ? 'Bank Transfer / CliQ' : 'Cash on Delivery'}`
        }
      ],
      createdAt: new Date().toISOString(),
      reservationExpiresAt
    };

    const savedOrder = await dbInstance.saveOrder(newOrder);

    return res.status(201).json({
      success: true,
      order: savedOrder
    });
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return res.status(500).json({ error: 'Failed to place order' });
  }
});

apiRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let orders = await dbInstance.getOrders();
    if (user.role === 'customer') {
      orders = orders.filter(o => o.customerId === user.id || o.customerInfo.phone === user.phone || o.customerInfo.email === user.email);
    }

    return res.json({ orders });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

apiRouter.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    const order = await dbInstance.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (user && user.role === 'customer') {
      if (order.customerId !== user.id && order.customerInfo.email !== user.email && order.customerInfo.phone !== user.phone) {
        return res.status(403).json({ error: 'Access denied to this order' });
      }
    }

    return res.json({ order });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

apiRouter.put('/admin/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const { status, note } = req.body;
    const order = await dbInstance.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    if (status === 'payment_confirmed') {
      order.paymentStatus = 'paid';
    }
    
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status updated to ${status}`
    });

    const saved = await dbInstance.saveOrder(order);
    return res.json({ success: true, order: saved });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// -------------------------------------------------------------
// 6. DESIGNER PORTAL & WITHDRAWALS
// -------------------------------------------------------------
apiRouter.get('/designer/profile', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'designer' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Designer authorization required' });
    }

    const profiles = await dbInstance.getDesignerProfiles();
    const profile = profiles.find(d => d.id === user.designerProfileId || d.email === user.email) 
      || profiles[0];

    return res.json({ profile });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch designer profile' });
  }
});

apiRouter.post('/designer/withdraw', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'designer' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Designer authorization required' });
    }

    const { amount, method, cliqAlias, iban } = req.body;
    const settings = await dbInstance.getSettings();
    const minWithdrawal = settings.minimumWithdrawalAmount || 10;

    const profiles = await dbInstance.getDesignerProfiles();
    const profile = profiles.find(d => d.id === user.designerProfileId || d.email === user.email)
      || profiles[0];

    if (!profile) {
      return res.status(404).json({ error: 'Designer profile not found' });
    }

    if (amount < minWithdrawal) {
      return res.status(400).json({ error: `Minimum withdrawal amount is ${minWithdrawal} ${settings.currency}` });
    }

    if (amount > profile.withdrawableBalance) {
      return res.status(400).json({ error: `Insufficient withdrawable balance. Available: ${profile.withdrawableBalance} ${settings.currency}` });
    }

    profile.withdrawableBalance -= amount;
    profile.balance = profile.withdrawableBalance;
    profile.pendingWithdrawals = (profile.pendingWithdrawals || 0) + amount;

    await dbInstance.saveDesignerProfile(profile);

    const withdrawal: WithdrawalRequest = {
      id: `wth_${Date.now()}`,
      designerId: profile.id,
      designerName: profile.name,
      amount,
      currency: settings.currency,
      payoutMethod: method || 'cliq',
      payoutDetailsSummary: cliqAlias ? `CliQ: ${cliqAlias}` : (iban ? `IBAN: ${iban}` : 'Bank Transfer'),
      status: 'pending',
      requestDate: new Date().toISOString()
    };

    await dbInstance.saveWithdrawal(withdrawal);

    return res.json({ success: true, withdrawal, newBalance: profile.withdrawableBalance });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ error: 'Failed to process withdrawal request' });
  }
});

// -------------------------------------------------------------
// 7. BUSINESS SETTINGS
// -------------------------------------------------------------
apiRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await dbInstance.getSettings();
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

apiRouter.put('/admin/settings', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const updated = await dbInstance.saveSettings(req.body);
    return res.json({ settings: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// -------------------------------------------------------------
// 9. AUDIT & DATABASE EXPORT FOR HUMAN & THIRD-PARTY AI VERIFICATION
// -------------------------------------------------------------
apiRouter.get('/db/export', async (req: Request, res: Response) => {
  try {
    const products = await dbInstance.getProducts();
    const designs = await dbInstance.getDesigns();
    const orders = await dbInstance.getOrders();
    const designerProfiles = await dbInstance.getDesignerProfiles();
    const settings = await dbInstance.getSettings();
    const withdrawals = await dbInstance.getWithdrawals();
    const users = await dbInstance.getUsers();

    return res.json({
      timestamp: new Date().toISOString(),
      platform: 'DTF Studio Jordan',
      environment: 'Cloud Run Container (Full-Stack Express + React)',
      databaseOverview: {
        totalProducts: products.length,
        totalDesigns: designs.length,
        totalOrders: orders.length,
        totalDesigners: designerProfiles.length,
        totalUsers: users.length,
        totalWithdrawals: withdrawals.length
      },
      settings,
      products,
      designs,
      orders,
      designerProfiles,
      withdrawals,
      sanitizedUsers: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, city: u.city }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to export database state' });
  }
});

apiRouter.get('/reports/verification.pdf', (req: Request, res: Response) => {
  try {
    return generatePdfReport(res);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate PDF verification report' });
  }
});

apiRouter.get('/reports/verification.docx', async (req: Request, res: Response) => {
  try {
    return await generateWordReport(res);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate Word verification report' });
  }
});

apiRouter.get('/admin/overview', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const orders = await dbInstance.getOrders();
    const products = await dbInstance.getProducts();
    const designers = await dbInstance.getDesignerProfiles();
    const customers = await dbInstance.getCustomers();
    const withdrawals = await dbInstance.getWithdrawals();
    const settings = await dbInstance.getSettings();

    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingPaymentsCount = orders.filter(o => o.status === 'payment_pending').length;
    const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;
    const productionQueueCount = orders.filter(o => o.status === 'under_preparation' || o.status === 'payment_confirmed').length;

    return res.json({
      totalOrders: orders.length,
      totalRevenue,
      totalCustomers: customers.length,
      activeDesigners: designers.length,
      pendingPaymentsCount,
      pendingWithdrawalsCount,
      productionQueueCount,
      lowStockCount: products.filter(p => p.stock < 20).length,
      currency: settings.currency
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to generate overview' });
  }
});
