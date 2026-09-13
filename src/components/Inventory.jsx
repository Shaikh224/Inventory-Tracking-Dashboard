import React, { useEffect, useState } from "react";
import { db, collection, addDoc, deleteDoc, doc, updateDoc } from "../firebase";
import { getDocs } from "firebase/firestore";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Fetch products from Firestore when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, "inventory");
        const productsSnapshot = await getDocs(productsCollection);
        const productsList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  const handleAddOrUpdateProduct = async (e) => {
    e.preventDefault();

    if (editingProduct) {
      // Update existing product
      const productDoc = doc(db, "inventory", editingProduct);
      const updatedProduct = { name, quantity: parseInt(quantity, 10), price: parseFloat(price) };
      try {
        await updateDoc(productDoc, updatedProduct);
        setProducts(products.map((prod) => (prod.id === editingProduct ? { id: editingProduct, ...updatedProduct } : prod)));
        resetForm();
      } catch (error) {
        console.error("Error updating product:", error);
      }
    } else {
      // Add new product
      try {
        const newProduct = { name, quantity: parseInt(quantity, 10), price: parseFloat(price) };
        const docRef = await addDoc(collection(db, "inventory"), newProduct);
        setProducts([...products, { id: docRef.id, ...newProduct }]);
        resetForm();
      } catch (error) {
        console.error("Error adding product:", error);
      }
    }
  };

  const resetForm = () => {
    setName("");
    setQuantity("");
    setPrice("");
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setName(product.name);
    setQuantity(product.quantity);
    setPrice(product.price);
    setEditingProduct(product.id);
  };

  const handleDeleteProduct = async () => {
    try {
      await deleteDoc(doc(db, "inventory", productToDelete));
      setProducts(products.filter((product) => product.id !== productToDelete));
      setConfirmDelete(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-canvas rounded-xl border border-ash max-w-4xl mx-auto mt-10">
      <h2 className="text-heading-sm font-medium mb-6 text-center text-charcoal tracking-tight">
        Inventory Management
      </h2>

      <form onSubmit={handleAddOrUpdateProduct} className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            className="border border-ink rounded-md p-2 text-body w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            className="border border-ink rounded-md p-2 text-body w-full md:w-1/4 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <input
            type="number"
            className="border border-ink rounded-md p-2 text-body w-full md:w-1/4 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg font-medium text-body flex items-center justify-center gap-1 transition-colors ${
              editingProduct ? "bg-tangerine text-white hover:opacity-90" : "bg-ink text-white hover:bg-charcoal"
            }`}
          >
            {editingProduct ? <FaEdit /> : <FaPlus />}
            {editingProduct ? "Update" : "Add"}
          </button>
        </div>
      </form>

      <ul className="space-y-3">
        {products.map((product) => (
          <li
            key={product.id}
            className="p-4 bg-paper border border-ash rounded-xl hover:border-smoke transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-body-lg text-charcoal">{product.name}</h3>
                <p className="text-steel text-body">Quantity: {product.quantity}</p>
                <p className="text-steel text-body">Price: ₹{product.price.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-1.5 bg-canvas text-charcoal border border-ash rounded-lg hover:bg-paper transition-colors text-body"
                  onClick={() => handleEditProduct(product)}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 bg-canvas text-red-600 border border-ash rounded-lg hover:bg-red-50 transition-colors text-body"
                  onClick={() => {
                    setProductToDelete(product.id); // Set the product ID to delete
                    setConfirmDelete(true); // Show the confirmation modal
                  }}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-canvas p-6 rounded-xl border border-ash shadow-card">
            <h2 className="text-body-lg font-semibold mb-4 text-charcoal">Confirm Delete</h2>
            <p className="text-body text-steel">Are you sure you want to delete this product?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-ash text-charcoal hover:bg-paper transition-colors text-body"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-lg bg-ink text-white hover:bg-charcoal transition-colors text-body"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
