import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting RestoPOS database seeding...");

  // 1. Create 4 Branches
  console.log("Creating branches...");
  const branch1 = await prisma.branch.upsert({
    where: { code: "B1" },
    update: {},
    create: {
      name: "RestoPOS Downtown Main Branch",
      code: "B1",
      address: "Shop 101-104, City Center Mall, MG Road",
      phone: "+91 98765 43210",
      fssaiNo: "10020030040050",
      gstin: "27AAAAA0000A1Z5",
      receiptHeader: "RestoPOS - Fine Dining & Bar\nDowntown MG Road Branch",
      receiptFooter: "Thank you for dining with us! Please visit again.",
      printerType: "lan",
      printerAddress: "192.168.1.200",
      printerWidth: 80,
      gstEnabled: true,
      gstMode: "exclusive",
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: "B2" },
    update: {},
    create: {
      name: "RestoPOS Express Food Court",
      code: "B2",
      address: "Kiosk 12, Level 3 Food Court, Phoenix Mall",
      phone: "+91 98765 43211",
      fssaiNo: "10020030040051",
      gstin: "27AAAAA0000A1Z5",
      receiptHeader: "RestoPOS Express\nPhoenix Mall Food Court",
      receiptFooter: "Quick Bites, Great Taste! See you soon.",
      printerType: "usb",
      printerAddress: "USB001",
      printerWidth: 80,
      gstEnabled: true,
      gstMode: "inclusive",
      isActive: true,
    },
  });

  const branch3 = await prisma.branch.upsert({
    where: { code: "B3" },
    update: {},
    create: {
      name: "RestoPOS Westside Bistro",
      code: "B3",
      address: "Plot 45, Sector 18, West Highway Road",
      phone: "+91 98765 43212",
      fssaiNo: "10020030040052",
      gstin: "27AAAAA0000A1Z5",
      receiptHeader: "RestoPOS Westside Bistro\nSector 18",
      receiptFooter: "Thank you! Have a delicious day.",
      printerType: "lan",
      printerAddress: "192.168.2.200",
      printerWidth: 80,
      gstEnabled: true,
      gstMode: "exclusive",
      isActive: true,
    },
  });

  const branch4 = await prisma.branch.upsert({
    where: { code: "B4" },
    update: {},
    create: {
      name: "RestoPOS Cloud Kitchen Hub",
      code: "B4",
      address: "Unit 8, Industrial Estate, Phase 2",
      phone: "+91 98765 43213",
      fssaiNo: "10020030040053",
      gstin: "27AAAAA0000A1Z5",
      receiptHeader: "RestoPOS Delivery & Takeaway Hub",
      receiptFooter: "Order online via Zomato & Swiggy!",
      printerType: "usb",
      printerAddress: "USB002",
      printerWidth: 58,
      gstEnabled: true,
      gstMode: "inclusive",
      isActive: true,
    },
  });

  // 2, 3, 4. Create Users (Super Admin, Branch Manager, Cashier)
  console.log("Creating users...");
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Super Administrator",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      branchId: null,
      isActive: true,
    },
  });

  const managerPasswordHash = bcrypt.hashSync("manager123", 10);
  await prisma.user.upsert({
    where: { username: "manager1" },
    update: {},
    create: {
      username: "manager1",
      fullName: "Branch 1 Manager",
      passwordHash: managerPasswordHash,
      role: "BRANCH_MANAGER",
      branchId: branch1.id,
      isActive: true,
    },
  });

  const cashierPasswordHash = bcrypt.hashSync("cashier123", 10);
  await prisma.user.upsert({
    where: { username: "cashier1" },
    update: {},
    create: {
      username: "cashier1",
      fullName: "Cashier B1 Counter 1",
      passwordHash: cashierPasswordHash,
      role: "CASHIER",
      branchId: branch1.id,
      isActive: true,
    },
  });

  // 5. Create Expense Categories
  console.log("Creating expense categories...");
  const expenseCategories = [
    "Raw Materials",
    "Staff Salary",
    "Electricity/Water",
    "Rent",
    "Maintenance",
    "Packaging",
    "Transport",
    "Miscellaneous",
  ];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  // 6. Create Payment Modes
  console.log("Creating payment modes...");
  const paymentModes = [
    { name: "CASH", sortOrder: 1 },
    { name: "UPI", sortOrder: 2 },
    { name: "CARD", sortOrder: 3 },
    { name: "ZOMATO", sortOrder: 4 },
    { name: "SWIGGY", sortOrder: 5 },
    { name: "PAYTM", sortOrder: 6 },
    { name: "CREDIT", sortOrder: 7 },
  ];
  for (const mode of paymentModes) {
    await prisma.paymentMode.upsert({
      where: { name: mode.name },
      update: { sortOrder: mode.sortOrder },
      create: { name: mode.name, sortOrder: mode.sortOrder, isActive: true },
    });
  }

  // 7. Create Menu Categories
  console.log("Creating menu categories...");
  const categoryData = [
    { name: "Starters", sortOrder: 1 },
    { name: "Main Course", sortOrder: 2 },
    { name: "Breads", sortOrder: 3 },
    { name: "Rice & Biryani", sortOrder: 4 },
    { name: "Chinese", sortOrder: 5 },
    { name: "Beverages", sortOrder: 6 },
    { name: "Desserts", sortOrder: 7 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoryData) {
    let category = await prisma.category.findFirst({
      where: { name: cat.name },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, sortOrder: cat.sortOrder, isActive: true },
      });
    }
    categoryMap.set(cat.name, category.id);
  }

  // 8. Create 25+ Sample Menu Items across categories
  console.log("Creating menu items...");
  const menuItems = [
    // Starters
    { name: "Paneer Tikka", shortCode: "101", category: "Starters", basePrice: 24000, gstRate: 5.0, isVeg: true, sortOrder: 1 },
    { name: "Veg Crispy", shortCode: "102", category: "Starters", basePrice: 19000, gstRate: 5.0, isVeg: true, sortOrder: 2 },
    { name: "Chicken Tikka", shortCode: "103", category: "Starters", basePrice: 29000, gstRate: 5.0, isVeg: false, sortOrder: 3 },
    { name: "Chicken 65", shortCode: "104", category: "Starters", basePrice: 27000, gstRate: 5.0, isVeg: false, sortOrder: 4 },
    { name: "Hara Bhara Kabab", shortCode: "105", category: "Starters", basePrice: 18000, gstRate: 5.0, isVeg: true, sortOrder: 5 },
    
    // Main Course
    { name: "Paneer Butter Masala", shortCode: "106", category: "Main Course", basePrice: 26000, gstRate: 5.0, isVeg: true, sortOrder: 6 },
    { name: "Dal Makhani", shortCode: "107", category: "Main Course", basePrice: 22000, gstRate: 5.0, isVeg: true, sortOrder: 7 },
    { name: "Kadai Paneer", shortCode: "108", category: "Main Course", basePrice: 25000, gstRate: 5.0, isVeg: true, sortOrder: 8 },
    { name: "Butter Chicken", shortCode: "109", category: "Main Course", basePrice: 34000, gstRate: 5.0, isVeg: false, sortOrder: 9 },
    { name: "Chicken Curry Home Style", shortCode: "110", category: "Main Course", basePrice: 31000, gstRate: 5.0, isVeg: false, sortOrder: 10 },
    { name: "Mutton Rogan Josh", shortCode: "111", category: "Main Course", basePrice: 42000, gstRate: 5.0, isVeg: false, sortOrder: 11 },
    { name: "Yellow Dal Tadka", shortCode: "112", category: "Main Course", basePrice: 18000, gstRate: 5.0, isVeg: true, sortOrder: 12 },

    // Breads
    { name: "Tandoori Roti", shortCode: "113", category: "Breads", basePrice: 2500, gstRate: 5.0, isVeg: true, sortOrder: 13 },
    { name: "Butter Naan", shortCode: "114", category: "Breads", basePrice: 4500, gstRate: 5.0, isVeg: true, sortOrder: 14 },
    { name: "Garlic Naan", shortCode: "115", category: "Breads", basePrice: 6000, gstRate: 5.0, isVeg: true, sortOrder: 15 },
    { name: "Lachha Paratha", shortCode: "116", category: "Breads", basePrice: 5000, gstRate: 5.0, isVeg: true, sortOrder: 16 },

    // Rice & Biryani
    { name: "Jeera Rice", shortCode: "117", category: "Rice & Biryani", basePrice: 15000, gstRate: 5.0, isVeg: true, sortOrder: 17 },
    { name: "Veg Dum Biryani", shortCode: "118", category: "Rice & Biryani", basePrice: 24000, gstRate: 5.0, isVeg: true, sortOrder: 18 },
    { name: "Chicken Dum Biryani", shortCode: "119", category: "Rice & Biryani", basePrice: 32000, gstRate: 5.0, isVeg: false, sortOrder: 19 },
    { name: "Mutton Biryani Special", shortCode: "120", category: "Rice & Biryani", basePrice: 42000, gstRate: 5.0, isVeg: false, sortOrder: 20 },
    { name: "Steamed Basmati Rice", shortCode: "121", category: "Rice & Biryani", basePrice: 12000, gstRate: 5.0, isVeg: true, sortOrder: 21 },

    // Chinese
    { name: "Veg Hakka Noodles", shortCode: "122", category: "Chinese", basePrice: 18000, gstRate: 5.0, isVeg: true, sortOrder: 22 },
    { name: "Veg Manchurian Dry", shortCode: "123", category: "Chinese", basePrice: 21000, gstRate: 5.0, isVeg: true, sortOrder: 23 },
    { name: "Chicken Fried Rice", shortCode: "124", category: "Chinese", basePrice: 24000, gstRate: 5.0, isVeg: false, sortOrder: 24 },
    { name: "Chilli Chicken Gravy", shortCode: "125", category: "Chinese", basePrice: 28000, gstRate: 5.0, isVeg: false, sortOrder: 25 },

    // Beverages
    { name: "Masala Chai", shortCode: "126", category: "Beverages", basePrice: 4000, gstRate: 5.0, isVeg: true, sortOrder: 26 },
    { name: "Fresh Lime Soda", shortCode: "127", category: "Beverages", basePrice: 7000, gstRate: 5.0, isVeg: true, sortOrder: 27 },
    { name: "Sweet Punjabi Lassi", shortCode: "128", category: "Beverages", basePrice: 8000, gstRate: 5.0, isVeg: true, sortOrder: 28 },
    { name: "Cold Coffee with Ice Cream", shortCode: "129", category: "Beverages", basePrice: 12000, gstRate: 5.0, isVeg: true, sortOrder: 29 },
    { name: "Packaged Drinking Water 1L", shortCode: "130", category: "Beverages", basePrice: 3000, gstRate: 18.0, isVeg: true, sortOrder: 30 },

    // Desserts
    { name: "Gulab Jamun (2 pcs)", shortCode: "131", category: "Desserts", basePrice: 9000, gstRate: 5.0, isVeg: true, sortOrder: 31 },
    { name: "Kesar Rasmalai (2 pcs)", shortCode: "132", category: "Desserts", basePrice: 12000, gstRate: 5.0, isVeg: true, sortOrder: 32 },
    { name: "Vanilla Ice Cream", shortCode: "133", category: "Desserts", basePrice: 8000, gstRate: 5.0, isVeg: true, sortOrder: 33 },
  ];

  for (const item of menuItems) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) continue;

    await prisma.menuItem.upsert({
      where: { shortCode: item.shortCode },
      update: {
        name: item.name,
        basePrice: item.basePrice,
        gstRate: item.gstRate,
        isVeg: item.isVeg,
        sortOrder: item.sortOrder,
        categoryId: categoryId,
      },
      create: {
        name: item.name,
        shortCode: item.shortCode,
        categoryId: categoryId,
        basePrice: item.basePrice,
        gstRate: item.gstRate,
        isVeg: item.isVeg,
        isAvailable: true,
        sortOrder: item.sortOrder,
      },
    });
  }

  // 9. Create 5 Tables for Branch 1
  console.log("Creating tables for Branch 1...");
  const tableData = [
    { number: 1, name: "Table 1", capacity: 2 },
    { number: 2, name: "Table 2", capacity: 4 },
    { number: 3, name: "Table 3", capacity: 4 },
    { number: 4, name: "Table 4", capacity: 6 },
    { number: 5, name: "VIP Table 1", capacity: 8 },
  ];

  for (const tbl of tableData) {
    await prisma.table.upsert({
      where: {
        branchId_number: {
          branchId: branch1.id,
          number: tbl.number,
        },
      },
      update: {
        name: tbl.name,
        capacity: tbl.capacity,
      },
      create: {
        branchId: branch1.id,
        number: tbl.number,
        name: tbl.name,
        capacity: tbl.capacity,
        isActive: true,
      },
    });
  }

  // 10. Create Sample Inventory Items for Branch 1
  console.log("Creating inventory items for Branch 1...");
  const inventoryData = [
    { name: "Basmati Rice", unit: "kg", currentStock: 60.0, minStock: 15.0, costPerUnit: 8500, trackingMode: "direct" },
    { name: "Refined Sunflower Oil", unit: "litre", currentStock: 45.0, minStock: 10.0, costPerUnit: 14000, trackingMode: "direct" },
    { name: "Fresh Raw Chicken", unit: "kg", currentStock: 30.0, minStock: 8.0, costPerUnit: 22000, trackingMode: "direct" },
    { name: "Fresh Malai Paneer", unit: "kg", currentStock: 18.0, minStock: 5.0, costPerUnit: 34000, trackingMode: "direct" },
    { name: "Commercial LPG Cylinder", unit: "cylinder", currentStock: 5.0, minStock: 2.0, costPerUnit: 185000, trackingMode: "direct" },
    { name: "Dairy Butter", unit: "kg", currentStock: 12.0, minStock: 3.0, costPerUnit: 52000, trackingMode: "direct" },
    { name: "Fresh Dairy Milk / Cream", unit: "litre", currentStock: 20.0, minStock: 5.0, costPerUnit: 6000, trackingMode: "direct" },
    { name: "Premium Atta / Flour", unit: "kg", currentStock: 80.0, minStock: 20.0, costPerUnit: 4200, trackingMode: "direct" },
  ];

  for (const inv of inventoryData) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { branchId: branch1.id, name: inv.name },
    });

    if (existing) {
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: inv,
      });
    } else {
      await prisma.inventoryItem.create({
        data: {
          ...inv,
          branchId: branch1.id,
          isActive: true,
        },
      });
    }
  }

  // 11. Create Global Settings
  console.log("Creating global settings...");
  const settings = [
    { key: "app_name", value: "RestoPOS Restaurant Management" },
    { key: "currency_symbol", value: "₹" },
    { key: "default_gst_rate", value: "5.0" },
    { key: "low_stock_notification", value: "true" },
    { key: "auto_print_kot", value: "true" },
    { key: "default_printer_width", value: "80" },
    { key: "allow_credit_sales", value: "true" },
    { key: "round_off_bills", value: "true" },
  ];

  for (const s of settings) {
    await prisma.globalSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
