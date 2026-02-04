import {
  shopProducts,
  shopProductOptions,
  shopProductVariants,
} from "@thrico/database";
import { AppDatabase } from "@thrico/database";

export async function seedShopProducts(db: AppDatabase, entityId: string) {
  // Product templates with diverse categories
  const productTemplates = [
    // Apparel (30 products)
    {
      category: "Apparel",
      prefix: "Classic T-Shirt",
      basePrice: 29.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Premium Hoodie",
      basePrice: 59.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Denim Jeans",
      basePrice: 79.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Cotton Polo",
      basePrice: 39.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Casual Shorts",
      basePrice: 34.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Winter Jacket",
      basePrice: 129.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Sports Jersey",
      basePrice: 49.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Yoga Pants",
      basePrice: 44.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Running Shorts",
      basePrice: 29.99,
      hasVariants: true,
    },
    {
      category: "Apparel",
      prefix: "Sweatpants",
      basePrice: 39.99,
      hasVariants: true,
    },

    // Electronics (25 products)
    {
      category: "Electronics",
      prefix: "Wireless Earbuds",
      basePrice: 89.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Smart Watch",
      basePrice: 249.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Phone Case",
      basePrice: 19.99,
      hasVariants: true,
    },
    {
      category: "Electronics",
      prefix: "Laptop Stand",
      basePrice: 49.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "USB-C Cable",
      basePrice: 14.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Power Bank",
      basePrice: 39.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Bluetooth Speaker",
      basePrice: 79.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Webcam HD",
      basePrice: 69.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Keyboard Mechanical",
      basePrice: 129.99,
      hasVariants: false,
    },
    {
      category: "Electronics",
      prefix: "Gaming Mouse",
      basePrice: 59.99,
      hasVariants: false,
    },

    // Home & Living (20 products)
    {
      category: "Home & Living",
      prefix: "Coffee Mug",
      basePrice: 12.99,
      hasVariants: true,
    },
    {
      category: "Home & Living",
      prefix: "Throw Pillow",
      basePrice: 24.99,
      hasVariants: true,
    },
    {
      category: "Home & Living",
      prefix: "Wall Art Print",
      basePrice: 34.99,
      hasVariants: false,
    },
    {
      category: "Home & Living",
      prefix: "Desk Lamp",
      basePrice: 44.99,
      hasVariants: false,
    },
    {
      category: "Home & Living",
      prefix: "Storage Box",
      basePrice: 19.99,
      hasVariants: false,
    },
    {
      category: "Home & Living",
      prefix: "Plant Pot",
      basePrice: 16.99,
      hasVariants: true,
    },
    {
      category: "Home & Living",
      prefix: "Candle Set",
      basePrice: 29.99,
      hasVariants: false,
    },
    {
      category: "Home & Living",
      prefix: "Photo Frame",
      basePrice: 18.99,
      hasVariants: false,
    },
    {
      category: "Home & Living",
      prefix: "Area Rug",
      basePrice: 89.99,
      hasVariants: true,
    },
    {
      category: "Home & Living",
      prefix: "Curtains",
      basePrice: 54.99,
      hasVariants: true,
    },

    // Sports & Fitness (15 products)
    {
      category: "Sports & Fitness",
      prefix: "Yoga Mat",
      basePrice: 34.99,
      hasVariants: true,
    },
    {
      category: "Sports & Fitness",
      prefix: "Dumbbell Set",
      basePrice: 79.99,
      hasVariants: false,
    },
    {
      category: "Sports & Fitness",
      prefix: "Resistance Bands",
      basePrice: 24.99,
      hasVariants: false,
    },
    {
      category: "Sports & Fitness",
      prefix: "Water Bottle",
      basePrice: 19.99,
      hasVariants: true,
    },
    {
      category: "Sports & Fitness",
      prefix: "Gym Bag",
      basePrice: 44.99,
      hasVariants: false,
    },
    {
      category: "Sports & Fitness",
      prefix: "Jump Rope",
      basePrice: 14.99,
      hasVariants: false,
    },
    {
      category: "Sports & Fitness",
      prefix: "Foam Roller",
      basePrice: 29.99,
      hasVariants: false,
    },
    {
      category: "Sports & Fitness",
      prefix: "Exercise Ball",
      basePrice: 24.99,
      hasVariants: false,
    },

    // Books & Stationery (10 products)
    {
      category: "Books & Stationery",
      prefix: "Notebook Set",
      basePrice: 16.99,
      hasVariants: false,
    },
    {
      category: "Books & Stationery",
      prefix: "Pen Collection",
      basePrice: 12.99,
      hasVariants: false,
    },
    {
      category: "Books & Stationery",
      prefix: "Planner 2026",
      basePrice: 24.99,
      hasVariants: false,
    },
    {
      category: "Books & Stationery",
      prefix: "Sticky Notes",
      basePrice: 8.99,
      hasVariants: false,
    },
    {
      category: "Books & Stationery",
      prefix: "Desk Organizer",
      basePrice: 19.99,
      hasVariants: false,
    },
  ];

  const colors = [
    "Black",
    "White",
    "Red",
    "Blue",
    "Green",
    "Gray",
    "Navy",
    "Pink",
  ];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const statuses: ("ACTIVE" | "DRAFT" | "ARCHIVED" | "OUT_OF_STOCK")[] = [
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "DRAFT",
  ]; // 75% active, 25% draft

  const allProducts = [];

  // Generate 100 products
  for (let i = 0; i < 100; i++) {
    const template = productTemplates[i % productTemplates.length];
    const variation = Math.floor(i / productTemplates.length) + 1;

    const title = `${template.prefix} ${variation}`;
    const slug = `${entityId}-${title.toLowerCase().replace(/\s+/g, "-")}-${i}`;
    const price = (template.basePrice + (Math.random() * 20 - 10)).toFixed(2);
    const status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "OUT_OF_STOCK" =
      statuses[Math.floor(Math.random() * statuses.length)];

    allProducts.push({
      entity: entityId,
      title,
      slug,
      description: `High-quality ${template.prefix.toLowerCase()} perfect for everyday use. Durable, stylish, and affordable.`,
      price,
      currency: "USD",
      status,
      category: template.category,
      hasVariants: template.hasVariants,
      numberOfVariants: template.hasVariants ? 6 : 0,
      tags: [template.category, template.prefix.split(" ")[0]],
    });
  }

  // Insert all products
  const insertedProducts = await db
    .insert(shopProducts)
    .values(allProducts)
    .returning();

  console.log(`✅ Inserted ${insertedProducts.length} products`);

  // Create variants for products that have them
  const allVariants = [];
  const allOptions = [];

  for (const product of insertedProducts) {
    if (product.hasVariants) {
      const productColors = colors.slice(0, 2 + Math.floor(Math.random() * 2)); // 2-3 colors
      const productSizes = sizes.slice(0, 3 + Math.floor(Math.random() * 2)); // 3-4 sizes

      // Create options
      allOptions.push({
        productId: product.id,
        entity: entityId,
        name: "Size",
        values: productSizes.map((s) => ({ value: s, label: s })),
      });

      allOptions.push({
        productId: product.id,
        entity: entityId,
        name: "Color",
        values: productColors.map((c) => ({ value: c, label: c })),
      });

      // Create variants
      for (const size of productSizes) {
        for (const color of productColors) {
          const variantPrice = (
            parseFloat(product.price) +
            Math.random() * 5
          ).toFixed(2);

          allVariants.push({
            productId: product.id,
            entity: entityId,
            title: `${size} / ${color}`,
            sku: `${product.slug.substring(0, 10).toUpperCase()}-${size}-${color.substring(0, 3).toUpperCase()}`,
            options: { Size: size, Color: color },
            price: variantPrice,
            currency: "USD",
            inventory: Math.floor(Math.random() * 50) + 10,
            isOutOfStock: Math.random() > 0.9, // 10% out of stock
          });
        }
      }
    }
  }

  // Insert all options and variants
  if (allOptions.length > 0) {
    await db.insert(shopProductOptions).values(allOptions);
    console.log(`✅ Inserted ${allOptions.length} product options`);
  }

  if (allVariants.length > 0) {
    await db.insert(shopProductVariants).values(allVariants);
    console.log(`✅ Inserted ${allVariants.length} product variants`);
  }

  console.log("🎉 Shop products seeded successfully!");
}
