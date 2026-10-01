import { useState } from 'react';
import { CatalogOrdersManager, CustomOrdersManager } from './OrderManagers';
import ProductManager from './ProductManager';
import CategoryManager from './CategoryManager';
import SiteSettings from './SiteSettings';
import AuraManager from './AuraManager';
import { statusInfo } from '../lib/format';

export default function AdminView({
  products, categories, customOrders, catalogOrders,
  onSaveProduct, onDeleteProduct, onSaveCategory, onDeleteCategory,
  onDeleteCustomOrder, onDeleteCatalogOrder,
  onSelectCustomOrder, onSelectCatalogOrder, onUpdateOrderStatus,
  settings, onSaveSettings
}) {
  const [activeTab, setActiveTab] = useState('orders'); // orders, custom_orders, products, categories, site

  const newCount = (list) => list.filter(o => statusInfo(o.status).id === 'novo').length;
  const newOrders = newCount(catalogOrders);
  const newCustom = newCount(customOrders);

  const tab = (id, label, count, badge = 0) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
    >
      <span>{label}</span>
      {count !== null && <span className="text-xs">({count})</span>}
      {badge > 0 && (
        <span title={`${badge} novo(s)`} className="min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{badge}</span>
      )}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200 px-6 bg-gray-50/50 overflow-x-auto">
        {tab('orders', 'Pedidos', catalogOrders.length, newOrders)}
        {tab('custom_orders', 'Pedidos Custom', customOrders.length, newCustom)}
        {tab('products', 'Produtos', products.length, 0)}
        {tab('categories', 'Categorias', categories.length, 0)}
        {tab('auras', 'Auras', null)}
        {tab('site', 'Site', null)}
      </div>
      <div className="p-6">
        {activeTab === 'orders' && (
          <CatalogOrdersManager
            orders={catalogOrders}
            onDelete={onDeleteCatalogOrder}
            onSelectOrder={onSelectCatalogOrder}
            onUpdateStatus={(id, status) => onUpdateOrderStatus('orders', id, status)}
          />
        )}
        {activeTab === 'custom_orders' && (
          <CustomOrdersManager
            customOrders={customOrders}
            onDelete={onDeleteCustomOrder}
            onSelectOrder={onSelectCustomOrder}
            onUpdateStatus={(id, status) => onUpdateOrderStatus('custom_orders', id, status)}
          />
        )}
        {activeTab === 'products' && <ProductManager products={products} categories={categories} onSave={onSaveProduct} onDelete={onDeleteProduct} />}
        {activeTab === 'categories' && <CategoryManager categories={categories} onSave={onSaveCategory} onDelete={onDeleteCategory} />}
        {activeTab === 'auras' && (
          <AuraManager
            lib={settings.auraLib} products={products} categories={categories}
            onSave={({ custom, overrides }) => onSaveSettings({
              customAuras: custom.length ? JSON.stringify(custom) : null,
              auraOverrides: Object.keys(overrides).length ? JSON.stringify(overrides) : null
            }, 'Auras atualizadas.')}
          />
        )}
        {activeTab === 'site' && <SiteSettings settings={settings} onSave={onSaveSettings} />}
      </div>
    </div>
  );
}
