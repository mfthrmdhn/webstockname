/*
  Warnings:

  - Added the required column `cost` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selling_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cost" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "selling_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "store_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warehouse_qty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "salesperson_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "item_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_cashier_id_idx" ON "sales"("cashier_id");

-- CreateIndex
CREATE INDEX "sales_salesperson_id_idx" ON "sales"("salesperson_id");

-- CreateIndex
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
