import React, { useEffect, useState } from "react";
import { db, collection, addDoc, deleteDoc, doc, updateDoc } from "../firebase";
import { getDocs } from "firebase/firestore";
import { FaPlus, FaTrash, FaEdit, FaTimes } from "react-icons/fa";
import { formatINR, formatNumber } from "../lib/format";
import { PageContainer, PageHeading, Card, SectionCard, StatTile, EmptyState, Skeleton } from "./ui";
import { DEMO_MODE } from "../lib/demoData";

const LOW_STOCK_THRESHOLD = 10;

const demoProducts = [
  { id: "d1", name: "Mustard Oil 1L", quantity: 240, price: 185 },
  { id: "d2", name: "Mustard Oil 5L", quantity: 64, price: 880 },
  { id: "d3", name: "Refined Oil 1L", quantity: 8, price: 160 },
  { id: "d4", name: "Sunflower Oil 1L", quantity: 0, price: 175 },
  { id: "d5", name: "Groundnut Oil 2L", quantity: 120, price: 420 },
];

const StockBadge = ({ quantity }) => {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-caption font-medium">
        Out of stock
      </span>
    );
  }
  if (quantity < LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tangerine/10 text-tangerine text-caption font-medium">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mint text-mint-fg text-caption font-medium">
      In stock
    </span>
  );
};

function Inventory() {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch products from Firestore when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      if (DEMO_MODE) {
        setProducts(demoProducts);
        setLoading(false);
        return;
      }
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
      } finally {
        setLoading(false);
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

  const totalUnits = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const stockValue = products.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0), 0);
  const lowStockCount = products.filter((p) => Number(p.quantity) < LOW_STOCK_THRESHOLD).length;

  const inputClass =
    "border border-ink rounded-md px-3 py-2 text-body text-charcoal focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="bg-paper min-h-screen">
      <PageContainer>
        <PageHeading title="Inventory" subtitle={`${products.length} products tracked`} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatTile label="Products" value={formatNumber(products.length)} loading={loading} />
          <StatTile label="Units in stock" value={formatNumber(totalUnits)} loading={loading} />
          <StatTile label="Stock value" value={formatINR(stockValue)} loading={loading} />
        </div>

        <div className="mb-6">
          <SectionCard title={editingProduct ? "Edit product" : "Add product"}>
            <form onSubmit={handleAddOrUpdateProduct} className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-caption font-medium text-steel">Product name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Mustard Oil 1L"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-caption font-medium text-steel">Quantity</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-caption font-medium text-steel">Price (₹)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-medium text-body flex items-center justify-center gap-2 bg-ink text-white hover:bg-charcoal transition-colors"
                >
                  {editingProduct ? <FaEdit /> : <FaPlus />}
                  {editingProduct ? "Update" : "Add product"}
                </button>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 rounded-lg font-medium text-body flex items-center gap-2 bg-canvas text-charcoal border border-ash hover:bg-paper transition-colors"
                  >
                    <FaTimes /> Cancel
                  </button>
                )}
              </div>
            </form>
          </SectionCard>
        </div>

        <SectionCard
          title="Products"
          bodyClassName=""
          actions={
            lowStockCount > 0 && !loading ? (
              <span className="text-caption font-medium text-tangerine">
                {lowStockCount} need restocking
              </span>
            ) : null
          }
        >
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState title="No products yet" hint="Add your first product using the form above." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-body text-left">
                <thead className="text-caption text-fog uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 border-b border-ash font-medium">Product</th>
                    <th className="px-4 py-2 border-b border-ash font-medium text-right">Quantity</th>
                    <th className="px-4 py-2 border-b border-ash font-medium text-right">Unit price</th>
                    <th className="px-4 py-2 border-b border-ash font-medium text-right">Stock value</th>
                    <th className="px-4 py-2 border-b border-ash font-medium">Status</th>
                    <th className="px-4 py-2 border-b border-ash font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-ash last:border-b-0 hover:bg-paper transition-colors">
                      <td className="px-4 py-3 text-charcoal font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-charcoal text-right tabular-nums">{formatNumber(product.quantity)}</td>
                      <td className="px-4 py-3 text-steel text-right tabular-nums">{formatINR(product.price)}</td>
                      <td className="px-4 py-3 text-charcoal text-right tabular-nums">
                        {formatINR((Number(product.quantity) || 0) * (Number(product.price) || 0))}
                      </td>
                      <td className="px-4 py-3"><StockBadge quantity={Number(product.quantity)} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="p-1.5 rounded-md bg-canvas text-charcoal border border-ash hover:bg-paper transition-colors"
                            onClick={() => handleEditProduct(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            className="p-1.5 rounded-md bg-canvas text-red-600 border border-ash hover:bg-red-50 transition-colors"
                            onClick={() => {
                              setProductToDelete(product.id);
                              setConfirmDelete(true);
                            }}
                            aria-label={`Delete ${product.name}`}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </PageContainer>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4">
          <Card className="p-5 max-w-sm w-full shadow-card">
            <h2 className="text-body-lg font-semibold mb-2 text-charcoal">Delete product?</h2>
            <p className="text-body text-steel">This removes the product from your inventory permanently.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-ash text-charcoal hover:bg-paper transition-colors text-body"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-body"
              >
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Inventory;
