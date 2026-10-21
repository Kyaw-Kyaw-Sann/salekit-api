import { Router } from "express";
import { createProduct, deleteProduct, getProductById, getProducts, updateProduct } from "../controllers/productControllers.js";

const productRouter = Router()

productRouter.get('/', getProducts)
productRouter.get('/:productId', getProductById)
productRouter.post('/', createProduct)
productRouter.put('/:productId', updateProduct)
productRouter.delete('/:productId', deleteProduct)

export default productRouter