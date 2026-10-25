import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Product, ProductFormData } from "../types.js";
import type { Request, Response } from "express";
import pool from "../db.js";
import { randomUUID } from "node:crypto";

type ProductRow = Product & RowDataPacket;
type ProductParams = { 
    productId: string
}
type ProductIdRow = RowDataPacket & {
  id: string
}

function getProductValidationError(
  productData: ProductFormData,
): string | null {
  const { name, price, category, stock } = productData;

  if (typeof name !== "string" || name.trim() === "") {
    return "Product name is required";
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return "Product price must be a non-negative number";
  }

  if (typeof category !== "string" || category.trim() === "") {
    return "Product category is required";
  }

  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
    return "Product stock must be a non-negative integer";
  }

  return null;
}

export async function getProducts(request: Request, response: Response) {

  if (!request.userId) {
    return response.status(401).json({
      message: "Authentication required",
    })
  }

  try {
    const [products] = await pool.query<ProductRow[]>(
      "SELECT id, name, price, category, stock FROM products WHERE user_id=?",[request.userId]
    );

    return response.status(200).json(products);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get products";

    console.log(`Failed to get products: ${message}`);

    return response.status(500).json({
      message: "Failed to get products",
    });
  }
}

export async function getProductById(request: Request<ProductParams>, response: Response) {
  
  if(!request.userId){
    return response.status(401).json({
      message: "Authentication required"
    })
  }

  try {
    const { productId } = request.params;

    const [products] = await pool.query<ProductRow[]>(
      `SELECT id, name, price, category, stock FROM products WHERE id=? AND user_id=? LIMIT 1`,
      [productId, request.userId],
    );

    if (products.length === 0) {
      return response.status(404).json({
        message: "Product Not Found",
      });
    }

    return response.status(200).json(products[0]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get product";

    console.log(`Failed to get product, ${message}`);

    return response.status(500).json({
      message: "Failed to get product",
    });
  }
}

export async function createProduct(request: Request, response: Response) {
  
  if (!request.userId) {
  return response.status(401).json({
    message: "Authentication required",
  })
}

  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const productData: ProductFormData = request.body;
  const validationError = getProductValidationError(productData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const { name, price, category, stock } = productData;

  try {
    const id = randomUUID();
    const cleanName = name.trim();
    const cleanCategory = category.trim();

    await pool.execute(
      `INSERT INTO products ( id, user_id, name, price, category, stock) VALUES (?,?, ?, ?, ?, ?)`,
      [id, request.userId, cleanName, price, cleanCategory, stock],
    );

    const newProduct: Product = {
      id,
      name: cleanName,
      price,
      category: cleanCategory,
      stock,
    };

    return response.status(201).json(newProduct);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create product";

    console.log(`Failed to create product, ${message}`);

    return response.status(500).json({
      message: "Failed to create product",
    });
  }
}

export async function updateProduct(request: Request<ProductParams>, response: Response) {
  
   if (!request.userId) {
    return response.status(401).json({
      message: "Authentication required",
    })
  }
  
  const { productId } = request.params;

  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const productData: ProductFormData = request.body;
  const validationError = getProductValidationError(productData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const {name, price, category, stock} = productData
  const cleanName = name.trim()
  const cleanCategory = category.trim()

  try{

    const [existingProducts] = await pool.query<ProductIdRow[]>(
        `SELECT id from products WHERE id=? AND user_id=? LIMIT 1`,[productId, request.userId]
    )

   if(existingProducts.length===0){
    return response.status(404).json({
        message: "Product Not Found"
    })
   }

   await pool.execute(
    `UPDATE products
     SET name=?, price=?, category=?, stock=? 
     WHERE id=? AND user_id=? `,
     [cleanName, price, cleanCategory, stock, productId, request.userId]
   )

   const updatedProduct : Product = {
    id: productId,
    name: cleanName,
    price,
    category: cleanCategory,
    stock
   }

   return response.status(200).json(updatedProduct)

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    console.log(`Failed to update product, ${message}`);

    return response.status(500).json({
      message: "Failed to update product",
    });
  }
}


export async function deleteProduct(
    request: Request<ProductParams>,
    response: Response
) {

  if (!request.userId) {
    return response.status(401).json({
      message: "Authentication required",
    })
  }

    try{
        const {productId} = request.params

        const [results] = await pool.execute<ResultSetHeader>(
            `DELETE FROM products WHERE id=? AND user_id=?`,
            [productId, request.userId]
        )

        if(results.affectedRows===0){
            return response.status(404).json({
                message: "Product Not Found"
            })
        }

        return response.status(200).json({
            message: "Product deleted successfully"
        })

    } catch (error) {
        const message =
      error instanceof Error ? error.message : "Failed to delete product";

    console.log(`Failed to delete product, ${message}`);

    return response.status(500).json({
      message: "Failed to delete product",
    });
    }
    
}