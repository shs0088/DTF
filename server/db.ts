import fs from 'fs';
import path from 'path';
import { db, pool } from '../src/db/index.ts';
import * as schema from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { 
  Product, 
  Design, 
  DesignerProfile, 
  Order, 
  BusinessSettings, 
  AppNotification, 
  CategoryItem, 
  CustomerRecord, 
  CouponCode,
  WithdrawalRequest,
  OrderStatus,
  OrderCustomerInfo
} from '../src/types';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'designer' | 'admin';
  phone?: string;
  city?: string;
  address?: string;
  createdAt: string;
  designerProfileId?: string;
}

export interface StockReservation {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  customerId: string;
  expiresAt: string;
  createdAt: string;
}

class RelationalDatabase {
  private initialMigrationCompleted = false;

  constructor() {
    this.ensureInitializedAndCleanExpired();
    setInterval(() => {
      this.cleanupExpiredReservations().catch(err => {
        console.error('[SQL DB] Expired reservations cleanup error:', err);
      });
    }, 30000);
  }

  private async ensureInitializedAndCleanExpired() {
    try {
      await this.migrateFromJsonIfNeeded();
      await this.cleanupExpiredReservations();
    } catch (err) {
      console.error('[SQL DB] Init migration/cleanup check failed:', err);
    }
  }

  // --- AUTOMATIC ONE-TIME MIGRATION FROM JSON TO POSTGRESQL ---
  public async migrateFromJsonIfNeeded() {
    if (this.initialMigrationCompleted) return;

    try {
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
      const existingCount = Number(userCount[0]?.count || 0);

      if (existingCount === 0) {
        console.log('[SQL DB] PostgreSQL database is empty. Seeding/migrating data from JSON file...');
        const jsonPath = path.join(process.cwd(), 'data', 'dtf_studio_db.json');
        if (fs.existsSync(jsonPath)) {
          const raw = fs.readFileSync(jsonPath, 'utf-8');
          const data = JSON.parse(raw);

          // 1. Migrate Users
          if (Array.isArray(data.users) && data.users.length > 0) {
            for (const u of data.users) {
              await db.insert(schema.users).values({
                id: u.id,
                name: u.name,
                email: u.email,
                passwordHash: u.passwordHash,
                role: u.role,
                phone: u.phone || null,
                city: u.city || null,
                address: u.address || null,
                designerProfileId: u.designerProfileId || null,
                createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              }).onConflictDoNothing();
            }
          }

          // 2. Migrate Designer Profiles
          if (Array.isArray(data.designerProfiles) && data.designerProfiles.length > 0) {
            for (const dp of data.designerProfiles) {
              await db.insert(schema.designerProfiles).values({
                id: dp.id,
                userId: dp.id === 'designer_1' ? 'user_designer_1' : null,
                name: dp.name,
                email: dp.email,
                phone: dp.phone || null,
                avatar: dp.avatar || null,
                bio: dp.bio || null,
                bioAr: dp.bioAr || null,
                country: dp.country || 'Jordan',
                status: dp.status || 'approved',
                applicationDate: dp.applicationDate ? new Date(dp.applicationDate) : new Date(),
                sampleDesigns: dp.sampleDesigns || [],
                totalDesignsCount: dp.totalDesignsCount || 0,
                totalSoldOrUsed: dp.totalSoldOrUsed || dp.salesCount || 0,
                totalEarnings: dp.totalEarnings || dp.totalEarned || 0,
                withdrawableBalance: dp.withdrawableBalance || dp.balance || 0,
                pendingEarnings: dp.pendingEarnings || 0,
                pendingWithdrawals: dp.pendingWithdrawals || 0,
                completedWithdrawals: dp.completedWithdrawals || 0,
                payoutDetails: dp.payoutDetails || {},
              }).onConflictDoNothing();
            }
          }

          // 3. Migrate Categories
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            for (const c of data.categories) {
              await db.insert(schema.categories).values({
                id: c.id,
                name: c.name,
                nameAr: c.nameAr,
                slug: c.slug,
                description: c.description || null,
                status: c.status || 'enabled',
                sortOrder: c.sortOrder || 0,
              }).onConflictDoNothing();
            }
          }

          // 4. Migrate Products
          if (Array.isArray(data.products) && data.products.length > 0) {
            for (const p of data.products) {
              await db.insert(schema.products).values({
                id: p.id,
                name: p.name,
                nameAr: p.nameAr,
                description: p.description || null,
                descriptionAr: p.descriptionAr || null,
                type: p.type || 'ready_to_sell',
                basePrice: Number(p.basePrice) || 0,
                rating: Number(p.rating) || 5,
                reviewsCount: Number(p.reviewsCount) || 0,
                isBestSeller: Boolean(p.isBestSeller),
                category: p.category,
                tags: p.tags || [],
                images: p.images || { primary: '' },
                colors: p.colors || [],
                sizes: p.sizes || [],
                stock: Number(p.stock) || 0,
                printableAreas: p.printableAreas || [],
                defaultDesignId: p.defaultDesignId || null,
                variants: p.variants || [],
              }).onConflictDoNothing();
            }
          }

          // 5. Migrate Designs
          if (Array.isArray(data.designs) && data.designs.length > 0) {
            for (const d of data.designs) {
              await db.insert(schema.designs).values({
                id: d.id,
                title: d.title,
                titleAr: d.titleAr,
                designerId: d.designerId || 'designer_1',
                designerName: d.designerName,
                designerAvatar: d.designerAvatar || null,
                imageUrl: d.imageUrl,
                fileFormat: d.fileFormat || 'png',
                category: d.category || 'popular',
                tags: d.tags || [],
                soldCount: Number(d.soldCount) || 0,
                usedCount: Number(d.usedCount) || 0,
                royaltyRate: Number(d.royaltyRate) || 1.5,
                royaltyType: d.royaltyType || 'fixed',
                status: d.status || 'published',
                hasTransparency: d.hasTransparency !== false,
                resolutionDpi: Number(d.resolutionDpi) || 300,
                aspectRatio: Number(d.aspectRatio) || 1,
              }).onConflictDoNothing();
            }
          }

          // 6. Migrate Customers
          if (Array.isArray(data.customers) && data.customers.length > 0) {
            for (const cust of data.customers) {
              await db.insert(schema.customers).values({
                id: cust.id,
                userId: 'user_customer_1',
                name: cust.name,
                email: cust.email,
                phone: cust.phone || null,
                city: cust.city || null,
                address: cust.address || null,
                customerGroup: cust.customerGroup || 'retail',
                ordersCount: Number(cust.ordersCount) || 0,
                totalSpent: Number(cust.totalSpent) || 0,
                status: cust.status || 'active',
              }).onConflictDoNothing();
            }
          }

          // 7. Migrate Coupons
          if (Array.isArray(data.coupons) && data.coupons.length > 0) {
            for (const cpn of data.coupons) {
              await db.insert(schema.coupons).values({
                id: cpn.id,
                code: cpn.code,
                type: cpn.type || 'percentage',
                discount: Number(cpn.discount) || 10,
                minSpend: Number(cpn.minSpend) || 0,
                maxUses: Number(cpn.maxUses) || 100,
                usedCount: Number(cpn.usedCount) || 0,
                expiryDate: cpn.expiryDate || null,
                status: cpn.status || 'enabled',
              }).onConflictDoNothing();
            }
          }

          // 8. Migrate Orders
          if (Array.isArray(data.orders) && data.orders.length > 0) {
            for (const ord of data.orders) {
              await db.insert(schema.orders).values({
                id: ord.id,
                orderNumber: ord.orderNumber,
                customerId: ord.customerId || null,
                customerInfo: {
                  name: ord.customerInfo?.name || '',
                  phone: ord.customerInfo?.phone || '',
                  email: ord.customerInfo?.email || '',
                  city: ord.customerInfo?.city || '',
                  address: ord.customerInfo?.address || '',
                  notes: ord.customerInfo?.notes || '',
                },
                items: ord.items || [],
                subtotal: Number(ord.subtotal) || 0,
                deliveryFee: Number(ord.deliveryFee) || 0,
                discountAmount: 0,
                total: Number(ord.total) || Number(ord.totalAmount) || 0,
                currency: ord.currency || 'JOD',
                paymentMethod: ord.paymentMethod || 'bank_transfer',
                paymentStatus: ord.paymentStatus || 'unpaid',
                deliveryType: ord.deliveryType || 'delivery',
                status: ord.status || 'new',
                statusHistory: ord.statusHistory || [],
                createdAt: ord.createdAt ? new Date(ord.createdAt) : new Date(),
              }).onConflictDoNothing();
            }
          }

          // 9. Migrate Notifications
          if (Array.isArray(data.notifications) && data.notifications.length > 0) {
            for (const notif of data.notifications) {
              await db.insert(schema.notifications).values({
                id: notif.id,
                targetRole: notif.targetRole || 'customer',
                targetUserId: notif.targetUserId || null,
                title: notif.title,
                titleAr: notif.titleAr,
                message: notif.message,
                messageAr: notif.messageAr,
                type: notif.type || 'system',
                isRead: Boolean(notif.isRead),
              }).onConflictDoNothing();
            }
          }

          // 10. Migrate Settings
          if (data.settings) {
            const s = data.settings;
            await db.insert(schema.businessSettings).values({
              id: 'current_settings',
              currency: s.currency || 'JOD',
              currencySymbol: s.currencySymbol || 'JD',
              bankTransferReservationMinutes: Number(s.bankTransferReservationMinutes) || 15,
              podConfirmationPeriodHours: Number(s.podConfirmationPeriodHours) || 4,
              customerCancellationWindowMinutes: Number(s.customerCancellationWindowMinutes) || 30,
              minimumWithdrawalAmount: Number(s.minimumWithdrawalAmount) || 10,
              defaultDesignerCommissionRate: Number(s.defaultDesignerCommissionRate) || 15,
              defaultDesignerFlatRoyalty: Number(s.defaultDesignerFlatRoyalty) || 1.5,
              standardDeliveryFee: Number(s.standardDeliveryFee) || 3,
              freeDeliveryThreshold: Number(s.freeDeliveryThreshold) || 45,
              storePickupEnabled: s.storePickupEnabled !== false,
              storePickupAddress: s.storePickupAddress || null,
              storePickupAddressAr: s.storePickupAddressAr || null,
              bankDetails: {
                bankName: s.bankDetails?.bankName || 'Arab Bank',
                accountName: s.bankDetails?.accountName || 'DTF STUDIO PRINTING LLC',
                iban: s.bankDetails?.iban || 'JO92BOJO0001000012345678901234',
                cliqAlias: s.bankDetails?.cliqAlias || 'DTFSTUDIO',
                notes: s.bankDetails?.notes || 'Please quote order number',
                notesAr: s.bankDetails?.notesAr,
              },
              artworkValidationRules: s.artworkValidationRules || {},
              termsAndConditions: s.termsAndConditions || null,
              termsAndConditionsAr: s.termsAndConditionsAr || null,
              privacyPolicy: s.privacyPolicy || null,
              privacyPolicyAr: s.privacyPolicyAr || null,
              noReturnPolicy: s.noReturnPolicy || null,
              noReturnPolicyAr: s.noReturnPolicyAr || null,
            }).onConflictDoNothing();
          }

          console.log('[SQL DB] Migration from JSON to PostgreSQL completed successfully!');
        }
      }
      this.initialMigrationCompleted = true;
    } catch (e) {
      console.error('[SQL DB] Error migrating JSON data to PostgreSQL:', e);
    }
  }

  // -------------------------------------------------------------
  // USERS & AUTH
  // -------------------------------------------------------------
  public async getUsers(): Promise<UserAccount[]> {
    const records = await db.select().from(schema.users);
    return records.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.passwordHash,
      role: r.role as any,
      phone: r.phone || undefined,
      city: r.city || undefined,
      address: r.address || undefined,
      createdAt: r.createdAt.toISOString(),
      designerProfileId: r.designerProfileId || undefined,
    }));
  }

  public async getUserById(id: string): Promise<UserAccount | null> {
    const res = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!res.length) return null;
    const r = res[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.passwordHash,
      role: r.role as any,
      phone: r.phone || undefined,
      city: r.city || undefined,
      address: r.address || undefined,
      createdAt: r.createdAt.toISOString(),
      designerProfileId: r.designerProfileId || undefined,
    };
  }

  public async getUserByEmail(email: string): Promise<UserAccount | null> {
    const res = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (!res.length) return null;
    const r = res[0];
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      passwordHash: r.passwordHash,
      role: r.role as any,
      phone: r.phone || undefined,
      city: r.city || undefined,
      address: r.address || undefined,
      createdAt: r.createdAt.toISOString(),
      designerProfileId: r.designerProfileId || undefined,
    };
  }

  public async createUser(user: UserAccount): Promise<UserAccount> {
    await db.insert(schema.users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      phone: user.phone || null,
      city: user.city || null,
      address: user.address || null,
      designerProfileId: user.designerProfileId || null,
      createdAt: new Date(user.createdAt || Date.now()),
    });
    return user;
  }

  public async updateUser(id: string, updates: Partial<UserAccount>): Promise<void> {
    await db.update(schema.users).set({
      ...(updates.name && { name: updates.name }),
      ...(updates.phone !== undefined && { phone: updates.phone }),
      ...(updates.city !== undefined && { city: updates.city }),
      ...(updates.address !== undefined && { address: updates.address }),
      ...(updates.designerProfileId !== undefined && { designerProfileId: updates.designerProfileId }),
    }).where(eq(schema.users.id, id));
  }

  // -------------------------------------------------------------
  // PRODUCTS & VARIANTS
  // -------------------------------------------------------------
  public async getProducts(): Promise<Product[]> {
    const records = await db.select().from(schema.products);
    return records.map(r => ({
      id: r.id,
      name: r.name,
      nameAr: r.nameAr,
      description: r.description || '',
      descriptionAr: r.descriptionAr || '',
      type: r.type as any,
      basePrice: r.basePrice,
      rating: r.rating,
      reviewsCount: r.reviewsCount,
      isBestSeller: r.isBestSeller,
      category: r.category as any,
      tags: r.tags,
      images: r.images,
      colors: r.colors,
      sizes: r.sizes,
      stock: r.stock,
      printableAreas: r.printableAreas,
      defaultDesignId: r.defaultDesignId || undefined,
      variants: r.variants,
    }));
  }

  public async getProductById(id: string): Promise<Product | null> {
    const res = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
    if (!res.length) return null;
    const r = res[0];
    return {
      id: r.id,
      name: r.name,
      nameAr: r.nameAr,
      description: r.description || '',
      descriptionAr: r.descriptionAr || '',
      type: r.type as any,
      basePrice: r.basePrice,
      rating: r.rating,
      reviewsCount: r.reviewsCount,
      isBestSeller: r.isBestSeller,
      category: r.category as any,
      tags: r.tags,
      images: r.images,
      colors: r.colors,
      sizes: r.sizes,
      stock: r.stock,
      printableAreas: r.printableAreas,
      defaultDesignId: r.defaultDesignId || undefined,
      variants: r.variants,
    };
  }

  public async saveProduct(prod: Product): Promise<Product> {
    await db.insert(schema.products).values({
      id: prod.id,
      name: prod.name,
      nameAr: prod.nameAr || prod.name,
      description: prod.description || null,
      descriptionAr: prod.descriptionAr || null,
      type: prod.type || 'ready_to_sell',
      basePrice: Number(prod.basePrice),
      rating: Number(prod.rating) || 5,
      reviewsCount: Number(prod.reviewsCount) || 0,
      isBestSeller: Boolean(prod.isBestSeller),
      category: prod.category,
      tags: prod.tags || [],
      images: prod.images,
      colors: prod.colors || [],
      sizes: prod.sizes || [],
      stock: Number(prod.stock) || 0,
      printableAreas: prod.printableAreas || [],
      defaultDesignId: prod.defaultDesignId || null,
      variants: prod.variants || [],
    }).onConflictDoUpdate({
      target: schema.products.id,
      set: {
        name: prod.name,
        nameAr: prod.nameAr || prod.name,
        description: prod.description || null,
        descriptionAr: prod.descriptionAr || null,
        type: prod.type || 'ready_to_sell',
        basePrice: Number(prod.basePrice),
        rating: Number(prod.rating) || 5,
        reviewsCount: Number(prod.reviewsCount) || 0,
        isBestSeller: Boolean(prod.isBestSeller),
        category: prod.category,
        tags: prod.tags || [],
        images: prod.images,
        colors: prod.colors || [],
        sizes: prod.sizes || [],
        stock: Number(prod.stock) || 0,
        printableAreas: prod.printableAreas || [],
        defaultDesignId: prod.defaultDesignId || null,
        variants: prod.variants || [],
        updatedAt: new Date(),
      }
    });
    return prod;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    await db.delete(schema.products).where(eq(schema.products.id, id));
    return true;
  }

  // -------------------------------------------------------------
  // DESIGNS & MARKETPLACE
  // -------------------------------------------------------------
  public async getDesigns(): Promise<Design[]> {
    const records = await db.select().from(schema.designs);
    return records.map(d => ({
      id: d.id,
      title: d.title,
      titleAr: d.titleAr,
      designerId: d.designerId || '',
      designerName: d.designerName,
      designerAvatar: d.designerAvatar || '',
      imageUrl: d.imageUrl,
      fileFormat: d.fileFormat as any,
      category: d.category as any,
      tags: d.tags,
      soldCount: d.soldCount,
      usedCount: d.usedCount,
      royaltyRate: d.royaltyRate,
      royaltyType: d.royaltyType as any,
      status: d.status as any,
      createdAt: d.createdAt.toISOString(),
      hasTransparency: d.hasTransparency,
      resolutionDpi: d.resolutionDpi,
      aspectRatio: d.aspectRatio,
    }));
  }

  public async getDesignById(id: string): Promise<Design | null> {
    const res = await db.select().from(schema.designs).where(eq(schema.designs.id, id)).limit(1);
    if (!res.length) return null;
    const d = res[0];
    return {
      id: d.id,
      title: d.title,
      titleAr: d.titleAr,
      designerId: d.designerId || '',
      designerName: d.designerName,
      designerAvatar: d.designerAvatar || '',
      imageUrl: d.imageUrl,
      fileFormat: d.fileFormat as any,
      category: d.category as any,
      tags: d.tags,
      soldCount: d.soldCount,
      usedCount: d.usedCount,
      royaltyRate: d.royaltyRate,
      royaltyType: d.royaltyType as any,
      status: d.status as any,
      createdAt: d.createdAt.toISOString(),
      hasTransparency: d.hasTransparency,
      resolutionDpi: d.resolutionDpi,
      aspectRatio: d.aspectRatio,
    };
  }

  public async saveDesign(design: Design): Promise<Design> {
    await db.insert(schema.designs).values({
      id: design.id,
      title: design.title,
      titleAr: design.titleAr || design.title,
      designerId: design.designerId || null,
      designerName: design.designerName,
      designerAvatar: design.designerAvatar || null,
      imageUrl: design.imageUrl,
      fileFormat: design.fileFormat || 'png',
      category: design.category || 'popular',
      tags: design.tags || [],
      soldCount: Number(design.soldCount) || 0,
      usedCount: Number(design.usedCount) || 0,
      royaltyRate: Number(design.royaltyRate) || 1.5,
      royaltyType: design.royaltyType || 'fixed',
      status: design.status || 'published',
      hasTransparency: design.hasTransparency !== false,
      resolutionDpi: Number(design.resolutionDpi) || 300,
      aspectRatio: Number(design.aspectRatio) || 1,
    }).onConflictDoUpdate({
      target: schema.designs.id,
      set: {
        title: design.title,
        titleAr: design.titleAr || design.title,
        designerName: design.designerName,
        designerAvatar: design.designerAvatar || null,
        imageUrl: design.imageUrl,
        category: design.category || 'popular',
        tags: design.tags || [],
        soldCount: Number(design.soldCount) || 0,
        usedCount: Number(design.usedCount) || 0,
        royaltyRate: Number(design.royaltyRate) || 1.5,
        status: design.status || 'published',
        updatedAt: new Date(),
      }
    });
    return design;
  }

  // -------------------------------------------------------------
  // DESIGNER PROFILES & EARNINGS
  // -------------------------------------------------------------
  public async getDesignerProfiles(): Promise<DesignerProfile[]> {
    const records = await db.select().from(schema.designerProfiles);
    return records.map(dp => {
      const payout = (dp.payoutDetails || {}) as any;
      return {
        id: dp.id,
        name: dp.name,
        email: dp.email,
        phone: dp.phone || '',
        avatar: dp.avatar || '',
        bio: dp.bio || undefined,
        bioAr: dp.bioAr || undefined,
        country: dp.country || 'Jordan',
        status: dp.status as any,
        applicationDate: dp.applicationDate.toISOString(),
        sampleDesigns: dp.sampleDesigns || [],
        totalDesignsCount: dp.totalDesignsCount,
        totalSoldOrUsed: dp.totalSoldOrUsed,
        totalEarnings: dp.totalEarnings,
        withdrawableBalance: dp.withdrawableBalance,
        pendingEarnings: dp.pendingEarnings,
        pendingWithdrawals: dp.pendingWithdrawals,
        completedWithdrawals: dp.completedWithdrawals,
        balance: dp.withdrawableBalance,
        totalEarned: dp.totalEarnings,
        salesCount: dp.totalSoldOrUsed,
        commissionType: 'fixed' as const,
        commissionRate: 0.50,
        payoutDetails: {
          method: (payout.method === 'bank_transfer' || payout.method === 'paypal') ? payout.method : 'cliq',
          cliqAlias: payout.cliqAlias,
          bankName: payout.bankName,
          iban: payout.iban,
          accountHolder: payout.accountHolder,
          paypalEmail: payout.paypalEmail,
        },
      };
    });
  }

  public async getDesignerProfileById(id: string): Promise<DesignerProfile | null> {
    const res = await db.select().from(schema.designerProfiles).where(eq(schema.designerProfiles.id, id)).limit(1);
    if (!res.length) return null;
    const dp = res[0];
    const payout = (dp.payoutDetails || {}) as any;
    return {
      id: dp.id,
      name: dp.name,
      email: dp.email,
      phone: dp.phone || '',
      avatar: dp.avatar || '',
      bio: dp.bio || undefined,
      bioAr: dp.bioAr || undefined,
      country: dp.country || 'Jordan',
      status: dp.status as any,
      applicationDate: dp.applicationDate.toISOString(),
      sampleDesigns: dp.sampleDesigns || [],
      totalDesignsCount: dp.totalDesignsCount,
      totalSoldOrUsed: dp.totalSoldOrUsed,
      totalEarnings: dp.totalEarnings,
      withdrawableBalance: dp.withdrawableBalance,
      pendingEarnings: dp.pendingEarnings,
      pendingWithdrawals: dp.pendingWithdrawals,
      completedWithdrawals: dp.completedWithdrawals,
      balance: dp.withdrawableBalance,
      totalEarned: dp.totalEarnings,
      salesCount: dp.totalSoldOrUsed,
      commissionType: 'fixed' as const,
      commissionRate: 0.50,
      payoutDetails: {
        method: (payout.method === 'bank_transfer' || payout.method === 'paypal') ? payout.method : 'cliq',
        cliqAlias: payout.cliqAlias,
        bankName: payout.bankName,
        iban: payout.iban,
        accountHolder: payout.accountHolder,
        paypalEmail: payout.paypalEmail,
      },
    };
  }

  public async saveDesignerProfile(dp: DesignerProfile): Promise<DesignerProfile> {
    await db.insert(schema.designerProfiles).values({
      id: dp.id,
      name: dp.name,
      email: dp.email,
      phone: dp.phone || null,
      avatar: dp.avatar || null,
      bio: dp.bio || null,
      bioAr: dp.bioAr || null,
      country: dp.country || 'Jordan',
      status: dp.status || 'pending',
      sampleDesigns: dp.sampleDesigns || [],
      totalDesignsCount: dp.totalDesignsCount || 0,
      totalSoldOrUsed: dp.totalSoldOrUsed || dp.salesCount || 0,
      totalEarnings: dp.totalEarnings || dp.totalEarned || 0,
      withdrawableBalance: dp.withdrawableBalance || dp.balance || 0,
      pendingEarnings: dp.pendingEarnings || 0,
      pendingWithdrawals: dp.pendingWithdrawals || 0,
      completedWithdrawals: dp.completedWithdrawals || 0,
      payoutDetails: dp.payoutDetails || {},
    }).onConflictDoUpdate({
      target: schema.designerProfiles.id,
      set: {
        name: dp.name,
        email: dp.email,
        phone: dp.phone || null,
        avatar: dp.avatar || null,
        bio: dp.bio || null,
        bioAr: dp.bioAr || null,
        status: dp.status,
        sampleDesigns: dp.sampleDesigns || [],
        totalDesignsCount: dp.totalDesignsCount,
        totalSoldOrUsed: dp.totalSoldOrUsed,
        totalEarnings: dp.totalEarnings,
        withdrawableBalance: dp.withdrawableBalance,
        pendingEarnings: dp.pendingEarnings,
        pendingWithdrawals: dp.pendingWithdrawals,
        completedWithdrawals: dp.completedWithdrawals,
        payoutDetails: dp.payoutDetails || {},
        updatedAt: new Date(),
      }
    });
    return dp;
  }

  // -------------------------------------------------------------
  // ORDERS & ATOMIC SQL CHECKOUT
  // -------------------------------------------------------------
  public async getOrders(): Promise<Order[]> {
    const records = await db.select().from(schema.orders);
    return records.map(r => {
      const history = (r.statusHistory || []).map((h: any) => ({
        status: h.status as OrderStatus,
        timestamp: h.timestamp,
        note: h.note,
      }));

      return {
        id: r.id,
        orderNumber: r.orderNumber,
        customerId: r.customerId || 'guest',
        customerInfo: r.customerInfo,
        items: r.items,
        subtotal: r.subtotal,
        deliveryFee: r.deliveryFee,
        total: r.total,
        totalAmount: r.total,
        currency: r.currency,
        paymentMethod: r.paymentMethod as any,
        paymentStatus: r.paymentStatus as any,
        deliveryType: r.deliveryType as any,
        status: r.status as OrderStatus,
        statusHistory: history,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  public async getOrderById(id: string): Promise<Order | null> {
    const res = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
    if (!res.length) return null;
    const r = res[0];
    const history = (r.statusHistory || []).map((h: any) => ({
      status: h.status as OrderStatus,
      timestamp: h.timestamp,
      note: h.note,
    }));

    return {
      id: r.id,
      orderNumber: r.orderNumber,
      customerId: r.customerId || 'guest',
      customerInfo: r.customerInfo,
      items: r.items,
      subtotal: r.subtotal,
      deliveryFee: r.deliveryFee,
      total: r.total,
      totalAmount: r.total,
      currency: r.currency,
      paymentMethod: r.paymentMethod as any,
      paymentStatus: r.paymentStatus as any,
      deliveryType: r.deliveryType as any,
      status: r.status as OrderStatus,
      statusHistory: history,
      createdAt: r.createdAt.toISOString(),
    };
  }

  public async saveOrder(ord: Order): Promise<Order> {
    const custInfo = {
      name: ord.customerInfo.name,
      phone: ord.customerInfo.phone,
      email: ord.customerInfo.email || '',
      city: ord.customerInfo.city,
      address: ord.customerInfo.address,
      notes: ord.customerInfo.notes,
    };

    await db.insert(schema.orders).values({
      id: ord.id,
      orderNumber: ord.orderNumber,
      customerId: ord.customerId || null,
      customerInfo: custInfo,
      items: ord.items,
      subtotal: ord.subtotal,
      deliveryFee: ord.deliveryFee,
      discountAmount: 0,
      total: ord.total || ord.totalAmount || 0,
      currency: ord.currency || 'JOD',
      paymentMethod: ord.paymentMethod,
      paymentStatus: ord.paymentStatus || 'unpaid',
      deliveryType: ord.deliveryType || 'delivery',
      status: ord.status || 'new',
      statusHistory: ord.statusHistory || [],
      createdAt: ord.createdAt ? new Date(ord.createdAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.orders.id,
      set: {
        customerInfo: custInfo,
        items: ord.items,
        paymentStatus: ord.paymentStatus,
        status: ord.status,
        statusHistory: ord.statusHistory,
        updatedAt: new Date(),
      }
    });
    return ord;
  }

  // -------------------------------------------------------------
  // ATOMIC TRANSACTIONS (Stock Reservation, Checkout, Expiry)
  // -------------------------------------------------------------
  public async createAtomicReservation(
    productId: string,
    variantId: string | undefined,
    quantity: number,
    customerId: string,
    durationMinutes: number = 15
  ): Promise<{ success: boolean; reservation?: StockReservation; error?: string }> {
    return await db.transaction(async (tx) => {
      // 1. Check & Lock Product
      const prodRes = await tx.select().from(schema.products).where(eq(schema.products.id, productId)).for('update');
      if (!prodRes.length) {
        return { success: false, error: 'Product not found' };
      }
      const prod = prodRes[0];

      // 2. Check available inventory
      if (variantId && prod.variants && Array.isArray(prod.variants)) {
        const vIdx = prod.variants.findIndex((v: any) => v.id === variantId);
        if (vIdx === -1) return { success: false, error: 'Variant not found' };
        if (prod.variants[vIdx].stock < quantity) {
          return { success: false, error: 'Insufficient variant stock' };
        }
        // Deduct from variant
        prod.variants[vIdx].stock -= quantity;
        prod.stock -= quantity;
      } else {
        if (prod.stock < quantity) {
          return { success: false, error: 'Insufficient stock' };
        }
        prod.stock -= quantity;
      }

      // Update product in DB
      await tx.update(schema.products).set({
        stock: prod.stock,
        variants: prod.variants,
        updatedAt: new Date(),
      }).where(eq(schema.products.id, productId));

      // 3. Create Reservation entry
      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      await tx.insert(schema.stockReservations).values({
        id: reservationId,
        productId,
        variantId: variantId || null,
        quantity,
        customerId,
        expiresAt,
        createdAt: new Date(),
      });

      const resObj: StockReservation = {
        id: reservationId,
        productId,
        variantId,
        quantity,
        customerId,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      };

      return { success: true, reservation: resObj };
    });
  }

  public async cleanupExpiredReservations(): Promise<void> {
    await db.transaction(async (tx) => {
      const now = new Date();
      const expired = await tx.select().from(schema.stockReservations).where(sql`${schema.stockReservations.expiresAt} < ${now}`);

      if (expired.length > 0) {
        for (const res of expired) {
          const prodRes = await tx.select().from(schema.products).where(eq(schema.products.id, res.productId)).for('update');
          if (prodRes.length > 0) {
            const prod = prodRes[0];
            if (res.variantId && prod.variants && Array.isArray(prod.variants)) {
              const v = prod.variants.find((item: any) => item.id === res.variantId);
              if (v) v.stock += res.quantity;
              prod.stock += res.quantity;
            } else {
              prod.stock += res.quantity;
            }

            await tx.update(schema.products).set({
              stock: prod.stock,
              variants: prod.variants,
              updatedAt: new Date(),
            }).where(eq(schema.products.id, res.productId));
          }

          await tx.delete(schema.stockReservations).where(eq(schema.stockReservations.id, res.id));
        }
        console.log(`[SQL DB] Released ${expired.length} expired stock reservations back to inventory atomically.`);
      }
    });
  }

  // -------------------------------------------------------------
  // CATEGORIES, CUSTOMERS, COUPONS, WITHDRAWALS, SETTINGS
  // -------------------------------------------------------------
  public async getCategories(): Promise<CategoryItem[]> {
    const res = await db.select().from(schema.categories);
    return res.map(c => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      slug: c.slug,
      description: c.description || '',
      status: c.status as any,
      sortOrder: c.sortOrder,
    }));
  }

  public async getCustomers(): Promise<CustomerRecord[]> {
    const res = await db.select().from(schema.customers);
    return res.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      city: c.city || '',
      address: c.address || '',
      customerGroup: (c.customerGroup === 'vip' || c.customerGroup === 'wholesale') ? c.customerGroup : 'retail',
      ordersCount: c.ordersCount,
      totalSpent: c.totalSpent,
      dateAdded: c.dateAdded.toISOString(),
      status: c.status as any,
    }));
  }

  public async getCoupons(): Promise<CouponCode[]> {
    const res = await db.select().from(schema.coupons);
    return res.map(c => ({
      id: c.id,
      code: c.code,
      type: c.type as any,
      discount: c.discount,
      minSpend: c.minSpend,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      expiryDate: c.expiryDate || undefined,
      status: c.status as any,
    }));
  }

  public async getWithdrawals(): Promise<WithdrawalRequest[]> {
    const res = await db.select().from(schema.withdrawals);
    const profiles = await this.getDesignerProfiles();

    return res.map(w => {
      const designer = profiles.find(p => p.id === w.designerId);
      return {
        id: w.id,
        designerId: w.designerId,
        designerName: designer ? designer.name : 'Designer',
        amount: w.amount,
        currency: w.currency,
        payoutMethod: w.method,
        payoutDetailsSummary: w.notes || `${w.method.toUpperCase()} transfer`,
        status: (w.status === 'completed' || w.status === 'paid') ? 'paid' : (w.status === 'rejected' ? 'rejected' : 'pending'),
        requestDate: w.requestedAt.toISOString(),
        paidDate: w.processedAt ? w.processedAt.toISOString() : undefined,
        adminNote: w.notes || undefined,
      };
    });
  }

  public async saveWithdrawal(w: WithdrawalRequest): Promise<WithdrawalRequest> {
    await db.insert(schema.withdrawals).values({
      id: w.id,
      designerId: w.designerId,
      amount: w.amount,
      currency: w.currency || 'JOD',
      method: w.payoutMethod || 'cliq',
      status: w.status || 'pending',
      requestedAt: new Date(w.requestDate || Date.now()),
      processedAt: w.paidDate ? new Date(w.paidDate) : null,
      notes: w.adminNote || w.payoutDetailsSummary || null,
    }).onConflictDoUpdate({
      target: schema.withdrawals.id,
      set: {
        status: w.status,
        processedAt: w.paidDate ? new Date(w.paidDate) : null,
        notes: w.adminNote || w.payoutDetailsSummary || null,
      }
    });
    return w;
  }

  public async getNotifications(): Promise<AppNotification[]> {
    const res = await db.select().from(schema.notifications);
    return res.map(n => ({
      id: n.id,
      targetRole: n.targetRole as any,
      targetUserId: n.targetUserId || undefined,
      title: n.title,
      titleAr: n.titleAr,
      message: n.message,
      messageAr: n.messageAr,
      type: n.type as any,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  public async getSettings(): Promise<BusinessSettings> {
    const res = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 'current_settings')).limit(1);
    if (!res.length) {
      return {
        currency: 'JOD',
        currencySymbol: 'JD',
        bankTransferReservationMinutes: 15,
        podConfirmationPeriodHours: 4,
        customerCancellationWindowMinutes: 30,
        minimumWithdrawalAmount: 10,
        defaultDesignerCommissionRate: 15,
        defaultDesignerFlatRoyalty: 1.5,
        standardDeliveryFee: 3.0,
        freeDeliveryThreshold: 45.0,
        storePickupEnabled: true,
        storePickupAddress: 'DTF Studio Flagship Store, Mecca St, Amman',
        storePickupAddressAr: 'مقر DTF Studio الرئيسي، شارع مكة، عمّان',
        bankDetails: {
          bankName: 'Arab Bank',
          accountName: 'DTF STUDIO PRINTING LLC',
          iban: 'JO92BOJO0001000012345678901234',
          cliqAlias: 'DTFSTUDIO',
          notes: 'Please quote Order Number in transfer note',
          notesAr: 'يرجى كتابة رقم الطلب في خانة الملاحظات',
        },
        artworkValidationRules: {
          maxFileSizeBytes: 50 * 1024 * 1024,
          allowedFormats: ['png', 'svg', 'ai', 'psd', 'pdf'],
          minDpi: 300,
          requireTransparencyWarning: true,
        },
        termsAndConditions: 'DTF on-demand printing terms',
        termsAndConditionsAr: 'شروط وأحكام الطباعة المخصصة',
        privacyPolicy: 'Your graphics and files are encrypted and safe',
        privacyPolicyAr: 'خصوصية ملفاتك وبياناتك محمية بالكامل',
        noReturnPolicy: 'Personalized items are non-refundable',
        noReturnPolicyAr: 'المنتجات المطبوعة حسب الطلب غير قابلة للإرجاع',
      };
    }
    const s = res[0];
    const bd = s.bankDetails || {} as any;
    return {
      currency: s.currency,
      currencySymbol: s.currencySymbol,
      bankTransferReservationMinutes: s.bankTransferReservationMinutes,
      podConfirmationPeriodHours: s.podConfirmationPeriodHours,
      customerCancellationWindowMinutes: s.customerCancellationWindowMinutes,
      minimumWithdrawalAmount: s.minimumWithdrawalAmount,
      defaultDesignerCommissionRate: s.defaultDesignerCommissionRate,
      defaultDesignerFlatRoyalty: s.defaultDesignerFlatRoyalty,
      standardDeliveryFee: s.standardDeliveryFee,
      freeDeliveryThreshold: s.freeDeliveryThreshold,
      storePickupEnabled: s.storePickupEnabled,
      storePickupAddress: s.storePickupAddress || '',
      storePickupAddressAr: s.storePickupAddressAr || undefined,
      bankDetails: {
        bankName: bd.bankName || 'Arab Bank',
        accountName: bd.accountName || 'DTF STUDIO PRINTING LLC',
        iban: bd.iban || 'JO92BOJO0001000012345678901234',
        cliqAlias: bd.cliqAlias || 'DTFSTUDIO',
        notes: bd.notes || 'Please quote Order Number in transfer note',
        notesAr: bd.notesAr,
      },
      artworkValidationRules: s.artworkValidationRules,
      termsAndConditions: s.termsAndConditions || '',
      termsAndConditionsAr: s.termsAndConditionsAr || '',
      privacyPolicy: s.privacyPolicy || '',
      privacyPolicyAr: s.privacyPolicyAr || '',
      noReturnPolicy: s.noReturnPolicy || '',
      noReturnPolicyAr: s.noReturnPolicyAr || '',
    };
  }

  public async saveSettings(s: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const current = await this.getSettings();
    const merged: BusinessSettings = {
      ...current,
      ...s,
    };

    await db.insert(schema.businessSettings).values({
      id: 'current_settings',
      currency: merged.currency || 'JOD',
      currencySymbol: merged.currencySymbol || 'JD',
      bankTransferReservationMinutes: Number(merged.bankTransferReservationMinutes) || 15,
      podConfirmationPeriodHours: Number(merged.podConfirmationPeriodHours) || 4,
      customerCancellationWindowMinutes: Number(merged.customerCancellationWindowMinutes) || 30,
      minimumWithdrawalAmount: Number(merged.minimumWithdrawalAmount) || 10,
      defaultDesignerCommissionRate: Number(merged.defaultDesignerCommissionRate) || 15,
      defaultDesignerFlatRoyalty: Number(merged.defaultDesignerFlatRoyalty) || 1.5,
      standardDeliveryFee: Number(merged.standardDeliveryFee) || 3,
      freeDeliveryThreshold: Number(merged.freeDeliveryThreshold) || 45,
      storePickupEnabled: merged.storePickupEnabled !== false,
      storePickupAddress: merged.storePickupAddress || null,
      storePickupAddressAr: merged.storePickupAddressAr || null,
      bankDetails: merged.bankDetails,
      artworkValidationRules: merged.artworkValidationRules,
      termsAndConditions: merged.termsAndConditions || null,
      termsAndConditionsAr: merged.termsAndConditionsAr || null,
      privacyPolicy: merged.privacyPolicy || null,
      privacyPolicyAr: merged.privacyPolicyAr || null,
      noReturnPolicy: merged.noReturnPolicy || null,
      noReturnPolicyAr: merged.noReturnPolicyAr || null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: schema.businessSettings.id,
      set: {
        currency: merged.currency,
        currencySymbol: merged.currencySymbol,
        bankTransferReservationMinutes: Number(merged.bankTransferReservationMinutes),
        podConfirmationPeriodHours: Number(merged.podConfirmationPeriodHours),
        customerCancellationWindowMinutes: Number(merged.customerCancellationWindowMinutes),
        minimumWithdrawalAmount: Number(merged.minimumWithdrawalAmount),
        defaultDesignerCommissionRate: Number(merged.defaultDesignerCommissionRate),
        defaultDesignerFlatRoyalty: Number(merged.defaultDesignerFlatRoyalty),
        standardDeliveryFee: Number(merged.standardDeliveryFee),
        freeDeliveryThreshold: Number(merged.freeDeliveryThreshold),
        storePickupEnabled: merged.storePickupEnabled,
        storePickupAddress: merged.storePickupAddress || null,
        storePickupAddressAr: merged.storePickupAddressAr || null,
        bankDetails: merged.bankDetails,
        artworkValidationRules: merged.artworkValidationRules,
        termsAndConditions: merged.termsAndConditions || null,
        termsAndConditionsAr: merged.termsAndConditionsAr || null,
        privacyPolicy: merged.privacyPolicy || null,
        privacyPolicyAr: merged.privacyPolicyAr || null,
        noReturnPolicy: merged.noReturnPolicy || null,
        noReturnPolicyAr: merged.noReturnPolicyAr || null,
        updatedAt: new Date(),
      }
    });

    return merged;
  }
}

export const dbInstance = new RelationalDatabase();
