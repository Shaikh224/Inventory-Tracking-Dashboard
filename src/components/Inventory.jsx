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
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-4xl mx-auto mt-10">
      <h2 className="text-3xl font-semibold mb-6 text-center text-blue-600">
        Inventory Management
      </h2>
      
      <form onSubmit={handleAddOrUpdateProduct} className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            className="border p-2 rounded w-full md:w-1/3"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            className="border p-2 rounded w-full md:w-1/4"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <input
            type="number"
            className="border p-2 rounded w-full md:w-1/4"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <button
            type="submit"
            className={`p-2 rounded text-white flex items-center justify-center transition ${
              editingProduct ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {editingProduct ? <FaEdit className="mr-1" /> : <FaPlus className="mr-1" />}
            {editingProduct ? "Update" : "Add"}
          </button>
        </div>
      </form>
      
      <ul className="space-y-4">
        {products.map((product) => (
          <li
            key={product.id}
            className="p-4 bg-gray-50 border rounded-lg shadow-md hover:shadow-lg transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-gray-600">Quantity: {product.quantity}</p>
                <p className="text-gray-600">Price: ₹{product.price.toFixed(2)}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  className="flex items-center px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                  onClick={() => handleEditProduct(product)}
                >
                  <FaEdit className="mr-1" /> Edit
                </button>
                <button
                  className="flex items-center px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  onClick={() => {
                    setProductToDelete(product.id); // Set the product ID to delete
                    setConfirmDelete(true); // Show the confirmation modal
                  }}
                >
                  <FaTrash className="mr-1" /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p>Are you sure you want to delete this product?</p>
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setConfirmDelete(false)} 
                className="bg-gray-300 text-black p-2 rounded mr-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProduct} 
                className="bg-red-500 text-white p-2 rounded"
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
