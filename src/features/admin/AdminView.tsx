import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import CatalogOrdersManager from './pedidos/CatalogOrders';
import { CustomOrdersManager } from './pedidos/OrderManagers';
import ProductManager from './produtos/ProductManager';
import CategoryManager from './categorias/CategoryManager';
import SiteSettings from './site/SiteSettings';
import AuraManager from './auras/AuraManager';
import TeamManager from './equipe/TeamManager';
import ErrorsManager from './erros/ErrorsManager';
import { fetchSchemaVersion } from '../../services/team';
import { schemaMessage, schemaStatus } from '../../lib/schema';
import type { SchemaStatus } from '../../lib/schema';
import { statusInfo } from '../../lib/format';
import type { AuraLib } from '../../lib/auras';
import type { Settings } from '../../lib/settings';
import type { useAdminActions } from '../../hooks/useAdminActions';
import type { AuthUser } from '../../services/auth';
import type { CatalogOrder, Category, CustomOrder, OrderStatusId, OrderTable, Product } from '../../types';

type AdminActions = ReturnType<typeof useAdminActions>;
type Tab = 'orders' | 'custom_orders' | 'products' | 'categories' | 'auras' | 'site' | 'team' | 'errors';

interface AdminViewProps {
  products: Product[];
  categories: Category[];
  customOrders: CustomOrder[];
  catalogOrders: CatalogOrder[];
  onSaveProduct: AdminActions['saveProduct'];
  onDeleteProduct: AdminActions['deleteProduct'];
  onReorderProducts: AdminActions['reorderProducts'];
  onSaveCategory: AdminActions['saveCategory'];
  onDeleteCategory: AdminActions['deleteCategory'];
  onReorderCategories: AdminActions['reorderCategories'];
  onDeleteCustomOrder: (id: string) => unknown;
  onDeleteCatalogOrder: (id: string) => unknown;
  onSelectCustomOrder: (id: string) => void;
  onSelectCatalogOrder: (id: string) => void;
  onUpdateOrderStatus: (table: OrderTable, id: string, status: OrderStatusId) => unknown;
  settings: Settings;
  onSaveSettings: AdminActions['saveSettings'];
  onUndoSettings: AdminActions['undoSettings'];
  user: AuthUser | null;
}

export default function AdminView({
  products, categories, customOrders, catalogOrders,
  onSaveProduct, onDeleteProduct, onReorderProducts, onSaveCategory, onDeleteCategory, onReorderCategories,
  onDeleteCustomOrder, onDeleteCatalogOrder,
  onSelectCustomOrder, onSelectCatalogOrder, onUpdateOrderStatus,
  settings, onSaveSettings, onUndoSettings, user
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [schema, setSchema] = useState<SchemaStatus | null>(null);
  useEffect(() => {
    let alive = true;
    fetchSchemaVersion().then(({ data, error }) => { if (alive) setSchema(schemaStatus(data, error)); });
    return () => { alive = false; };
  }, []);

  const newCount = (list: { status?: unknown }[]) => list.filter(o => statusInfo(o.status).id === 'novo').length;
  const newOrders = newCount(catalogOrders);
  const newCustom = newCount(customOrders);

  const tab = (id: Tab, label: string, count: number | null, badge = 0) => (
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
    <>
    {schema && !schema.ok && (
      <div role="alert" className="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{schemaMessage(schema)}</span>
      </div>
    )}
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200 px-6 bg-gray-50/50 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab('orders', 'Pedidos', catalogOrders.length, newOrders)}
        {tab('custom_orders', 'Pedidos Custom', customOrders.length, newCustom)}
        {tab('products', 'Produtos', products.length, 0)}
        {tab('categories', 'Categorias', categories.length, 0)}
        {settings.aurasEnabled && tab('auras', 'Auras', null)}
        {tab('site', 'Site', null)}
        {tab('team', 'Equipe', null)}
        {tab('errors', 'Erros', null)}
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
        {activeTab === 'products' && <ProductManager products={products} categories={categories} onSave={onSaveProduct} onDelete={onDeleteProduct} onReorder={onReorderProducts} />}
        {activeTab === 'categories' && <CategoryManager categories={categories} onSave={onSaveCategory} onDelete={onDeleteCategory} onReorder={onReorderCategories} />}
        {activeTab === 'auras' && settings.aurasEnabled && (
          <AuraManager
            lib={settings.auraLib} products={products} categories={categories}
            onSave={({ custom, overrides }: AuraLib) => onSaveSettings({
              customAuras: custom.length ? JSON.stringify(custom) : null,
              auraOverrides: Object.keys(overrides).length ? JSON.stringify(overrides) : null
            }, 'Auras atualizadas.')}
          />
        )}
        {activeTab === 'site' && <SiteSettings settings={settings} onSave={onSaveSettings} onUndo={onUndoSettings} />}
        {activeTab === 'team' && <TeamManager currentEmail={user?.email} />}
        {activeTab === 'errors' && <ErrorsManager />}
      </div>
    </div>
    </>
  );
}
