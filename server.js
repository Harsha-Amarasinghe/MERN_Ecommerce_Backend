require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const multer = require("multer");
const path = require("path");

const helmet = require("helmet");
app.use(helmet());
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow required methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow required headers
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Product Schema
const productSchema = new mongoose.Schema({
  sku: String,
  name: String,
  quantity: Number,
  description: String,
  images: [String],
  featuredImage: String,
  isFavorite: Boolean,
});

const Product = mongoose.model("Product", productSchema);

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    res.status(200).json({
      message: "File uploaded successfully!",
      file: req.file,
    });
  } catch (error) {
    res.status(500).json({ message: "File upload failed", error });
  }
});

// Routes
app.post("/api/products", upload.array("images", 5), async (req, res) => {
  try {
    const product = new Product({
      sku: req.body.sku,
      name: req.body.name,
      quantity: req.body.quantity,
      description: req.body.description,
      images: req.files.map((file) => file.path),
      featuredImage: req.body.featuredImage || req.files[0]?.path,
    });

    await product.save();
    res.status(201).json({ message: "Product successfully added", product });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Error adding product", error });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).send({ message: "Error fetching product", error });
  }
});

app.put("/api/products/:id", upload.array("images", 5), async (req, res) => {
  try {
    const updatedData = {
      sku: req.body.sku,
      name: req.body.name,
      quantity: req.body.quantity,
      description: req.body.description,
      featuredImage: req.body.featuredImage || req.files[0]?.path,
    };

    // If new images are uploaded, replace the old images
    if (req.files && req.files.length > 0) {
      updatedData.images = req.files.map((file) => file.path);
    } else {
      const product = await Product.findById(req.params.id);
      updatedData.images = product.images;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ message: "Error updating product", error });
  }
});

app.put("/api/products/:id/favorite", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    product.isFavorite = !product.isFavorite;

    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    res.status(500).send({ message: "Error toggling favorite status", error });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
