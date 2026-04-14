import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { MenuCategory, MenuItem } from "../../types";
import { formatCurrency, cn } from "../../lib/utils";
import { Plus, Trash2, Edit2, Image as ImageIcon, Check, X, GripVertical } from "lucide-react";

export default function MenuManagement({ restaurantId }: { restaurantId?: string }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    image: "",
    isAvailable: true
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setNewItem({ ...newItem, image: base64 });
      } catch (error) {
        console.error("Error converting image:", error);
      }
    }
  };

  const fetchData = async () => {
    if (!restaurantId) return;
    try {
      const cats = await api.get(`/api/restaurants/${restaurantId}/categories`);
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id);

      const itemsData = await api.get(`/api/restaurants/${restaurantId}/items`);
      setItems(itemsData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !newCatName) return;
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, { name: newCatName });
      } else {
        await api.post(`/api/restaurants/${restaurantId}/categories`, { name: newCatName });
      }
      setNewCatName("");
      setEditingCategory(null);
      setShowAddCategory(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ القسم");
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.delete(`/api/categories/${id}`);
      setCategoryToDelete(null);
      if (activeCategory === id) setActiveCategory(categories.find(c => c.id !== id)?.id || null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف القسم");
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !activeCategory || !newItem.name || !newItem.price) return;
    try {
      if (editingItem) {
        await api.put(`/api/items/${editingItem.id}`, {
          ...newItem,
          price: Number(newItem.price),
          discountPrice: newItem.discountPrice ? Number(newItem.discountPrice) : null,
          categoryId: activeCategory
        });
      } else {
        await api.post(`/api/restaurants/${restaurantId}/items`, {
          ...newItem,
          price: Number(newItem.price),
          discountPrice: newItem.discountPrice ? Number(newItem.discountPrice) : null,
          categoryId: activeCategory
        });
      }
      setNewItem({ name: "", description: "", price: "", discountPrice: "", image: "", isAvailable: true });
      setEditingItem(null);
      setShowAddItem(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ الوجبة");
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!restaurantId) return;
    try {
      await api.patch(`/api/items/${item.id}/toggle`, {});
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteItem = async (id: string) => {
    if (!restaurantId) return;
    try {
      await api.delete(`/api/items/${id}`);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المنيو</h1>
          <p className="text-gray-500">نظم وجباتك وأصنافك بطريقة احترافية</p>
        </div>
        <div className="flex gap-2">
          {activeCategory && (
            <>
              <button 
                onClick={() => {
                  const cat = categories.find(c => c.id === activeCategory);
                  if (cat) {
                    setEditingCategory(cat);
                    setNewCatName(cat.name);
                    setShowAddCategory(true);
                  }
                }}
                className="bg-white border border-gray-200 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-50 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                تعديل القسم
              </button>
              <button 
                onClick={() => setCategoryToDelete(activeCategory)}
                className="bg-white border border-gray-200 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                حذف القسم
              </button>
            </>
          )}
          <button 
            onClick={() => setShowAddCategory(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <Plus className="w-4 h-4" />
            إضافة قسم
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {categories.map(cat => (
          <div key={cat.id} className="relative group/cat">
            <button
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                activeCategory === cat.id ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-white text-gray-600 border border-gray-100"
              )}
            >
              {cat.name}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <button 
          onClick={() => setShowAddItem(true)}
          className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-500 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-red-50 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold">إضافة وجبة جديدة</span>
        </button>

        {items.filter(i => i.categoryId === activeCategory).map(item => (
          <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="relative h-48 bg-gray-100">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => toggleAvailability(item)}
                  className={cn(
                    "p-2 rounded-xl shadow-lg transition-all",
                    item.isAvailable ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  )}
                >
                  {item.isAvailable ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => {
                    setEditingItem(item);
                    setNewItem({
                      name: item.name,
                      description: item.description || "",
                      price: item.price.toString(),
                      discountPrice: item.discountPrice?.toString() || "",
                      image: item.image || "",
                      isAvailable: item.isAvailable
                    });
                    setShowAddItem(true);
                  }}
                  className="p-2 bg-white text-blue-600 rounded-xl shadow-lg hover:bg-blue-50 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setItemToDelete(item.id)}
                  className="p-2 bg-white text-gray-400 rounded-xl shadow-lg hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <div className="text-left">
                  {item.discountPrice ? (
                    <>
                      <span className="text-xs text-gray-400 line-through block">{formatCurrency(item.price)}</span>
                      <span className="font-bold text-green-600">{formatCurrency(item.discountPrice)}</span>
                    </>
                  ) : (
                    <span className="font-bold text-red-600">{formatCurrency(item.price)}</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
            <form onSubmit={addCategory} className="space-y-4">
              <input 
                type="text" 
                placeholder="اسم القسم (مثلاً: مشاوي، مقبلات...)" 
                className="w-full bg-gray-50 border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-red-500"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all">{editingCategory ? "تحديث" : "إضافة"}</button>
                <button type="button" onClick={() => {
                  setShowAddCategory(false);
                  setEditingCategory(null);
                  setNewCatName("");
                }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">حذف الوجبة؟</h2>
            <p className="text-gray-500 mb-6">هل أنت متأكد من حذف هذه الوجبة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button onClick={() => deleteItem(itemToDelete)} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all">حذف</button>
              <button onClick={() => setItemToDelete(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">حذف القسم؟</h2>
            <p className="text-gray-500 mb-6">سيتم حذف القسم وجميع الوجبات التابعة له. هل أنت متأكد؟</p>
            <div className="flex gap-3">
              <button onClick={() => deleteCategory(categoryToDelete)} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all">حذف</button>
              <button onClick={() => setCategoryToDelete(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingItem ? "تعديل الوجبة" : "إضافة وجبة جديدة"}</h2>
            <form onSubmit={addItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوجبة</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر (د.ع)</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر بعد الخصم</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                    value={newItem.discountPrice}
                    onChange={(e) => setNewItem({...newItem, discountPrice: e.target.value})}
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 h-24 focus:ring-2 focus:ring-red-500"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة الوجبة</label>
                <div className="flex gap-4 items-center">
                  {newItem.image && (
                    <img src={newItem.image} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-4 px-4 text-center text-gray-500 hover:border-red-300 hover:text-red-500 transition-all">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-xs font-bold">اختر صورة من الهاتف</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all">{editingItem ? "تحديث الوجبة" : "حفظ الوجبة"}</button>
                <button type="button" onClick={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
                  setNewItem({ name: "", description: "", price: "", discountPrice: "", image: "", isAvailable: true });
                }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}