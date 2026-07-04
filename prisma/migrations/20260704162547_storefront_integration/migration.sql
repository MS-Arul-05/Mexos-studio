-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'COD');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "shippingAddress" JSONB,
ADD COLUMN     "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fit" TEXT,
ADD COLUMN     "gsm" TEXT,
ADD COLUMN     "originalPrice" DECIMAL(10,2),
ADD COLUMN     "rating" DECIMAL(2,1),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tag" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "colorHex" TEXT;
