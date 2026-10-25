import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pool from './db.js'
import productRouter from './routes/productRoutes.js'
import authRouter from './routes/authRoutes.js'
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3000

async function testDatabaseConnection(){
    try{
        await pool.query('SELECT 1')
        console.log("Database connected successfully.")
    }catch(error){
        const message = 
            error instanceof Error ? error.message : 'Unknown Database Error'
        console.log(`Database connection error: ${message}`)
    }
}

app.use(cors({
    origin: "http://localhost:5173"
}))

app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/products', productRouter)

app.get('/api/health',(_request, response)=>{
    response.status(200).json({
        "message": `SaleKit API is running at ${PORT}`
    })
})

testDatabaseConnection()

app.listen(PORT, ()=>{
    console.log(`Server is running at http://localhost:${PORT}`)
})